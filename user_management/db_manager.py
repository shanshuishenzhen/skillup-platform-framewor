# db_manager.py

import sqlite3
import threading
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Union, Generator
from config import config
from exceptions import DatabaseException
from logger import log_info, log_warning, log_error, log_debug
from error_handler import handle_database_errors

class DatabaseManager:
    """数据库管理器，提供连接池和事务管理"""
    
    def __init__(self, db_path: str = None):
        """初始化数据库管理器"""
        self.db_path = db_path or config.DATABASE_PATH
        self._local = threading.local()
        self._lock = threading.Lock()
        
        try:
            # 测试数据库连接
            test_conn = sqlite3.connect(self.db_path, check_same_thread=False)
            test_conn.close()
            log_info("数据库管理器初始化完成", db_path=self.db_path)
        except Exception as e:
            log_error("数据库管理器初始化失败", error=str(e), db_path=self.db_path)
            raise DatabaseException(f"数据库管理器初始化失败: {str(e)}")
        
    def get_connection(self) -> sqlite3.Connection:
        """获取线程本地的数据库连接"""
        if not hasattr(self._local, 'connection') or self._local.connection is None:
            try:
                self._local.connection = sqlite3.Connection(
                    self.db_path,
                    check_same_thread=False,
                    timeout=30.0
                )
                # 启用外键约束
                self._local.connection.execute("PRAGMA foreign_keys = ON")
                # 设置WAL模式以提高并发性能
                self._local.connection.execute("PRAGMA journal_mode = WAL")
                log_debug("创建新的数据库连接", thread=threading.current_thread().name)
            except sqlite3.Error as e:
                log_error("数据库连接失败", error=str(e))
                raise
                
        return self._local.connection
    
    def close_connection(self):
        """关闭当前线程的数据库连接"""
        if hasattr(self._local, 'connection') and self._local.connection:
            try:
                self._local.connection.close()
                log_debug("关闭数据库连接", thread=threading.current_thread().name)
            except sqlite3.Error as e:
                log_error("关闭数据库连接失败", error=str(e))
            finally:
                self._local.connection = None
    
    @contextmanager
    def get_cursor(self, commit: bool = True) -> Generator[sqlite3.Cursor, None, None]:
        """获取数据库游标的上下文管理器"""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            yield cursor
            if commit:
                conn.commit()
        except Exception as e:
            conn.rollback()
            log_error("数据库操作失败，已回滚", error=str(e))
            raise
        finally:
            cursor.close()
    
    @contextmanager
    def transaction(self) -> Generator[sqlite3.Connection, None, None]:
        """事务管理上下文管理器"""
        conn = self.get_connection()
        try:
            conn.execute("BEGIN")
            yield conn
            conn.commit()
            log_debug("事务提交成功")
        except Exception as e:
            conn.rollback()
            log_error("事务回滚", error=str(e))
            raise
    
    @handle_database_errors
    def execute_query(self, query: str, params: tuple = None, fetch_one: bool = False, fetch_all: bool = True) -> Optional[Union[Dict, List[Dict]]]:
        """执行查询并返回结果
        
        Args:
            query: SQL查询语句
            params: 查询参数
            fetch_one: 是否只获取一条记录
            fetch_all: 是否获取所有记录
            
        Returns:
            查询结果
            
        Raises:
            DatabaseException: 数据库操作失败
        """
        log_debug("执行数据库查询", query=query[:100], params=params)
        
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.row_factory = sqlite3.Row  # 使结果可以通过列名访问
        
        try:
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            if fetch_one:
                result = cursor.fetchone()
                result_data = dict(result) if result else None
                log_debug("查询完成", result_count=1 if result_data else 0)
                return result_data
            elif fetch_all:
                results = cursor.fetchall()
                result_data = [dict(row) for row in results]
                log_debug("查询完成", result_count=len(result_data))
                return result_data
            else:
                conn.commit()
                affected_rows = cursor.rowcount
                log_debug("执行完成", affected_rows=affected_rows)
                return affected_rows
                
        except sqlite3.Error as e:
            conn.rollback()
            log_error("数据库查询错误", error=str(e), query=query[:100], params=params)
            raise DatabaseException(f"数据库查询失败: {str(e)}")
        finally:
            cursor.close()
    
    def execute_many(self, query: str, params_list: list):
        """批量执行查询"""
        with self.get_cursor() as cursor:
            cursor.executemany(query, params_list)
            return cursor.rowcount
    
    def table_exists(self, table_name: str) -> bool:
        """检查表是否存在
        
        Args:
            table_name: 表名
            
        Returns:
            bool: 表是否存在
        """
        try:
            query = "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
            result = self.execute_query(query, (table_name,), fetch_one=True)
            return result is not None
        except Exception as e:
            print(f"检查表存在性失败: {e}")
            return False
    
    def get_table_info(self, table_name: str) -> list:
        """获取表结构信息"""
        query = f"PRAGMA table_info({table_name})"
        return self.execute_query(query, fetch_all=True)
    
    def __del__(self):
        """析构函数，确保连接被正确关闭"""
        self.close_connection()

# 全局数据库管理器实例
db_manager = DatabaseManager()

# 向后兼容的连接获取函数
def get_db_connection() -> sqlite3.Connection:
    """获取数据库连接（向后兼容）"""
    return db_manager.get_connection()

# 便捷的上下文管理器
def get_db_cursor(commit: bool = True):
    """获取数据库游标上下文管理器"""
    return db_manager.get_cursor(commit=commit)

def get_db_transaction():
    """获取事务上下文管理器"""
    return db_manager.transaction()