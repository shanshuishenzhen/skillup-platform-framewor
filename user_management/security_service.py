# security_service.py

import time
import hashlib
from typing import Dict, Set, Optional
from config import config
from db_manager import db_manager
from exceptions import SecurityException, DatabaseException
from logger import log_info, log_warning, log_error, log_security_event
from error_handler import handle_exceptions, handle_database_errors, get_db_cursor

class SecurityService:
    """安全服务类，处理登录限制和JWT黑名单"""
    
    def __init__(self):
        # 内存存储登录失败记录（生产环境应使用Redis）
        self._login_attempts: Dict[str, Dict] = {}
        # JWT黑名单（生产环境应使用Redis）
        self._jwt_blacklist: Set[str] = set()
        
    @handle_database_errors
    def record_login_attempt(self, identifier: str, success: bool) -> None:
        """记录登录尝试
        
        Args:
            identifier: 用户标识（手机号或用户ID）
            success: 登录是否成功
            
        Raises:
            SecurityException: 安全操作失败
        """
        if not identifier or not identifier.strip():
            raise SecurityException("用户标识不能为空")
        
        current_time = time.time()
        
        try:
            if identifier not in self._login_attempts:
                self._login_attempts[identifier] = {
                    'failed_count': 0,
                    'last_attempt': current_time,
                    'locked_until': 0
                }
            
            attempt_data = self._login_attempts[identifier]
            attempt_data['last_attempt'] = current_time
            
            if success:
                # 登录成功，重置失败计数
                attempt_data['failed_count'] = 0
                attempt_data['locked_until'] = 0
                log_security_event("登录成功", phone=identifier)
            else:
                # 登录失败，增加失败计数
                attempt_data['failed_count'] += 1
                
                failed_count = attempt_data['failed_count']
                log_security_event("登录失败", phone=identifier, details={'failed_count': failed_count})
                
                # 如果达到最大失败次数，锁定账户
                if failed_count >= config.MAX_LOGIN_ATTEMPTS:
                    lockout_duration = config.LOGIN_LOCKOUT_MINUTES * 60  # 转换为秒
                    attempt_data['locked_until'] = current_time + lockout_duration
                    log_security_event("账户锁定", phone=identifier, details={'lockout_minutes': config.LOGIN_LOCKOUT_MINUTES})
                    
        except Exception as e:
            log_error("记录登录尝试失败", error=str(e), identifier=identifier, success=success)
            raise SecurityException(f"记录登录尝试失败: {str(e)}")
    
    def is_account_locked(self, identifier: str) -> bool:
        """检查账户是否被锁定
        
        Args:
            identifier: 用户标识
            
        Returns:
            bool: 账户是否被锁定
        """
        if identifier not in self._login_attempts:
            return False
            
        attempt_data = self._login_attempts[identifier]
        current_time = time.time()
        
        # 检查锁定是否已过期
        if attempt_data['locked_until'] > 0 and current_time >= attempt_data['locked_until']:
            # 锁定已过期，重置数据
            attempt_data['failed_count'] = 0
            attempt_data['locked_until'] = 0
            return False
            
        return attempt_data['locked_until'] > current_time
    
    def get_remaining_lockout_time(self, identifier: str) -> int:
        """获取剩余锁定时间（秒）
        
        Args:
            identifier: 用户标识
            
        Returns:
            int: 剩余锁定时间，0表示未锁定
        """
        if identifier not in self._login_attempts:
            return 0
            
        attempt_data = self._login_attempts[identifier]
        current_time = time.time()
        
        if attempt_data['locked_until'] <= current_time:
            return 0
            
        return int(attempt_data['locked_until'] - current_time)
    
    def get_failed_attempts_count(self, identifier: str) -> int:
        """获取失败尝试次数
        
        Args:
            identifier: 用户标识
            
        Returns:
            int: 失败尝试次数
        """
        if identifier not in self._login_attempts:
            return 0
            
        return self._login_attempts[identifier]['failed_count']
    
    def add_token_to_blacklist(self, token: str) -> None:
        """将JWT令牌添加到黑名单
        
        Args:
            token: JWT令牌
        """
        # 生成令牌的哈希值以节省内存
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        self._jwt_blacklist.add(token_hash)
        
        # 可选：将黑名单持久化到数据库
        self._persist_blacklist_token(token_hash)
    
    def is_token_blacklisted(self, token: str) -> bool:
        """检查JWT令牌是否在黑名单中
        
        Args:
            token: JWT令牌
            
        Returns:
            bool: 令牌是否被列入黑名单
        """
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        return token_hash in self._jwt_blacklist
    
    def _persist_blacklist_token(self, token_hash: str) -> None:
        """将黑名单令牌持久化到数据库
        
        Args:
            token_hash: 令牌哈希值
        """
        try:
            # 创建黑名单表（如果不存在）
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS jwt_blacklist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token_hash TEXT UNIQUE NOT NULL,
                created_at INTEGER NOT NULL
            );
            """
            
            insert_sql = """
            INSERT OR IGNORE INTO jwt_blacklist (token_hash, created_at)
            VALUES (?, ?);
            """
            
            current_time = int(time.time())
            
            with get_db_cursor() as cursor:
                cursor.execute(create_table_sql)
                cursor.execute(insert_sql, (token_hash, current_time))
                
        except Exception as e:
            print(f"持久化黑名单令牌失败: {e}")
    
    def load_blacklist_from_db(self) -> None:
        """从数据库加载黑名单令牌"""
        try:
            # 检查表是否存在
            if not db_manager.table_exists('jwt_blacklist'):
                return
                
            query = "SELECT token_hash FROM jwt_blacklist"
            results = db_manager.execute_query(query, fetch_all=True)
            
            for (token_hash,) in results:
                self._jwt_blacklist.add(token_hash)
                
        except Exception as e:
            print(f"从数据库加载黑名单失败: {e}")
    
    def cleanup_expired_blacklist(self, max_age_days: int = 30) -> None:
        """清理过期的黑名单令牌
        
        Args:
            max_age_days: 最大保留天数
        """
        try:
            if not db_manager.table_exists('jwt_blacklist'):
                return
                
            cutoff_time = int(time.time() - (max_age_days * 24 * 3600))
            delete_sql = "DELETE FROM jwt_blacklist WHERE created_at < ?"
            
            deleted_count = db_manager.execute_query(delete_sql, (cutoff_time,))
            if deleted_count > 0:
                print(f"清理了 {deleted_count} 个过期的黑名单令牌")
                
        except Exception as e:
            print(f"清理黑名单失败: {e}")
    
    def reset_login_attempts(self, identifier: str) -> None:
        """重置用户的登录尝试记录
        
        Args:
            identifier: 用户标识
        """
        if identifier in self._login_attempts:
            del self._login_attempts[identifier]

# 全局安全服务实例
security_service = SecurityService()

# 在模块加载时从数据库加载黑名单
security_service.load_blacklist_from_db()