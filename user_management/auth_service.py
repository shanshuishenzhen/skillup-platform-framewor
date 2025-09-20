# auth_service.py

import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database_setup import hash_password, verify_password
from db_manager import DatabaseManager, db_manager, get_db_cursor
from config import config
from security_service import security_service
from exceptions import (
    ValidationException, AuthenticationException, DatabaseException,
    UserNotFoundException, DuplicateUserException, AccountLockedException, 
    TokenBlacklistedException
)
from logger import log_info, log_warning, log_error, log_user_action, log_security_event
from error_handler import handle_exceptions, handle_database_errors, create_success_response, create_error_response
import time

# JWT 配置
JWT_SECRET_KEY = config.JWT_SECRET_KEY
JWT_ALGORITHM = config.JWT_ALGORITHM
JWT_EXPIRATION_HOURS = config.JWT_EXPIRATION_HOURS

# --- 辅助函数：用户查找和创建 ---
@handle_database_errors
def get_user_by_phone(phone_number: str) -> Optional[Dict[str, Any]]:
    """
    根据手机号获取用户信息
    
    Args:
        phone_number: 手机号
        
    Returns:
        用户信息字典或None
        
    Raises:
        ValidationException: 参数验证失败
        DatabaseException: 数据库操作失败
    """
    if not phone_number or not phone_number.strip():
        raise ValidationException("手机号不能为空")
    
    log_info("查询用户信息", phone=phone_number)
    
    query = """
        SELECT id, phone_number, password_hash, role, status, name, 
               created_at, updated_at
        FROM users 
        WHERE phone_number = ? AND status != 'deleted'
    """
    
    result = db_manager.execute_query(query, (phone_number,))
    
    if result:
        user_data = result[0]
        log_info("用户信息查询成功", phone=phone_number, user_id=user_data['id'])
        return user_data
    
    log_info("用户不存在", phone=phone_number)
    return None

@handle_database_errors
def create_new_user(phone_number: str, password: str = None, name: str = None, role: str = 'Student') -> Dict[str, Any]:
    """
    创建新用户
    
    Args:
        phone_number: 手机号
        password: 密码（可选）
        name: 用户姓名（可选）
        role: 用户角色，默认为Student
        
    Returns:
        新创建的用户信息字典
        
    Raises:
        ValidationException: 参数验证失败
        DuplicateUserException: 用户已存在
        DatabaseException: 数据库操作失败
    """
    if not phone_number or not phone_number.strip():
        raise ValidationException("手机号不能为空")
    
    log_info("创建新用户", phone=phone_number, role=role)
    
    # 检查用户是否已存在
    existing_user = get_user_by_phone(phone_number)
    if existing_user:
        log_warning("尝试创建已存在用户", phone=phone_number)
        raise DuplicateUserException("用户已存在")
    
    # 准备用户数据
    user_data = {
        'phone_number': phone_number,
        'role': role,
        'status': 'active',
        'name': name or f"用户{phone_number[-4:]}",
        'created_at': datetime.now(),
        'updated_at': datetime.now()
    }
    
    # 如果提供了密码，进行哈希处理
    if password:
        user_data['password_hash'] = hash_password(password)
    
    # 插入用户数据
    insert_query = """
        INSERT INTO users (phone_number, password_hash, role, status, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """
    
    params = (
        user_data['phone_number'],
        user_data.get('password_hash'),
        user_data['role'],
        user_data['status'],
        user_data['name'],
        user_data['created_at'],
        user_data['updated_at']
    )
    
    result = db_manager.execute_query(insert_query, params)
    
    if result:
        # 获取新创建的用户信息
        new_user = get_user_by_phone(phone_number)
        log_user_action("新用户创建成功", user_id=new_user['id'], phone=phone_number, role=role)
        return new_user
    else:
        log_error("用户创建失败", phone=phone_number)
        raise DatabaseException("用户创建失败")
    
# --- 身份验证和授权 ---
@handle_exceptions(return_dict=False)
def authenticate_user(phone_number: str, password: str) -> tuple:
    """用户认证
    
    Args:
        phone_number: 手机号
        password: 密码
        
    Returns:
        认证结果字典
        
    Raises:
        ValidationException: 参数验证失败
        AuthenticationException: 认证失败
        AccountLockedException: 账户被锁定
        DatabaseException: 数据库操作失败
    """
    
    if not phone_number or not password:
        raise ValidationException("手机号和密码不能为空")
    
    log_info("用户认证请求", phone=phone_number)
    
    try:
        # 检查登录尝试限制
        if security_service.is_account_locked(phone_number):
            log_security_event("账户被锁定的登录尝试", phone=phone_number)
            raise AccountLockedException("账户已被锁定，请稍后再试")
        
        # 获取用户信息
        user = get_user_by_phone(phone_number)
        if not user:
            # 记录失败尝试
            security_service.record_login_attempt(phone_number, False)
            log_warning("用户不存在的登录尝试", phone=phone_number)
            raise AuthenticationException("手机号或密码错误")
        
        # 验证密码
        if not verify_password(password, user["password_hash"]):
            # 记录失败尝试
            security_service.record_login_attempt(phone_number, False)
            log_warning("密码错误的登录尝试", phone=phone_number, user_id=user["id"])
            raise AuthenticationException("手机号或密码错误")
        
        # 认证成功
        security_service.record_login_attempt(phone_number, True)
        log_security_event("用户认证成功", phone=phone_number, user_id=user["id"])
        
        return (user["id"], user["role"])
        
    except (ValidationException, AuthenticationException, AccountLockedException):
        raise
    except Exception as e:
        log_error("用户认证异常", error=str(e), phone=phone_number)
        raise DatabaseException(f"认证过程中发生错误: {str(e)}")


@handle_exceptions()
def generate_jwt_token(user_id: int, role: str) -> str:
    """生成JWT令牌
    
    Args:
        user_id: 用户ID
        role: 用户角色
        
    Returns:
        JWT令牌字符串
        
    Raises:
        ValidationException: 参数验证失败
        AuthenticationException: 令牌生成失败
    """
    
    if not user_id or not role:
        raise ValidationException("用户ID和角色不能为空")
    
    try:
        payload = {
            "user_id": user_id,
            "role": role,
            "exp": datetime.utcnow() + timedelta(hours=config.JWT_EXPIRATION_HOURS),
            "iat": datetime.utcnow()
        }
        
        token = jwt.encode(payload, config.JWT_SECRET_KEY, algorithm="HS256")
        log_info("JWT令牌生成成功", user_id=user_id, role=role)
        return token
        
    except Exception as e:
        log_error("JWT令牌生成失败", error=str(e), user_id=user_id, role=role)
        raise AuthenticationException(f"令牌生成失败: {str(e)}")


# --- JWT 验证依赖 (用于 FastAPI) ---
credentials_exception = HTTPException(
    status_code=401,
    detail="认证失败或令牌过期",
    headers={"WWW-Authenticate": "Bearer"},
)

def get_current_user_payload(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """从请求头验证 JWT，并返回载荷"""
    if authorization is None:
        raise credentials_exception

    try:
        scheme, token = authorization.split()
    except ValueError:
        raise credentials_exception
        
    if scheme.lower() != "bearer":
        raise credentials_exception

    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.JWT_ALGORITHM])
        user_id: int = payload.get("user_id")
        role: str = payload.get("role")
        
        if user_id is None or role is None:
            raise credentials_exception
            
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, detail="令牌已过期")
    except jwt.InvalidTokenError:
        raise HTTPException(401, detail="无效的令牌签名或格式错误")
    except Exception:
        raise credentials_exception

    return payload


@handle_exceptions()
def verify_jwt_token(token: str) -> Dict[str, Any]:
    """
    验证JWT令牌
    
    Args:
        token: JWT令牌
        
    Returns:
        包含验证结果的字典
        
    Raises:
        ValidationException: 参数验证失败
        TokenBlacklistedException: 令牌已被加入黑名单
        AuthenticationException: 令牌验证失败
        UserNotFoundException: 用户不存在
    """
    if not token or not token.strip():
        raise ValidationException("令牌不能为空", field="token")
    
    log_info("验证JWT令牌")
    
    try:
        # 检查令牌是否在黑名单中
        if security_service.is_token_blacklisted(token):
            log_security_event("黑名单令牌访问尝试", token_hash=hash(token))
            raise TokenBlacklistedException('令牌已失效')
        
        # 验证令牌
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.JWT_ALGORITHM])
        
        # 获取用户信息
        user = get_user_by_phone(payload['phone'])
        if not user:
            log_warning("令牌中的用户不存在", phone=payload.get('phone'))
            raise UserNotFoundException('用户不存在')
        
        log_info("令牌验证成功", user_id=user['id'], phone=user['phone_number'])
        
        return create_success_response(
            message='令牌验证成功',
            data={
                'user': {
                    'user_id': user['id'],
                    'phone': user['phone_number'],
                    'role': user['role'],
                    'status': user['status']
                }
            }
        )
        
    except jwt.ExpiredSignatureError:
        log_security_event("过期令牌访问尝试")
        raise AuthenticationException('令牌已过期', error_code='token_expired')
    except jwt.InvalidTokenError:
        log_security_event("无效令牌访问尝试")
        raise AuthenticationException('无效的令牌', error_code='invalid_token')
    except Exception as e:
        log_error("令牌验证异常", error=str(e))
        raise AuthenticationException(f'令牌验证失败: {str(e)}', error_code='verification_failed')


@handle_exceptions()
def logout_user(token: str) -> Dict[str, Any]:
    """
    用户登出（将令牌加入黑名单）
    
    Args:
        token: JWT令牌
        
    Returns:
        包含登出结果的字典
        
    Raises:
        ValidationException: 参数验证失败
        AuthenticationException: 令牌验证失败
    """
    if not token or not token.strip():
        raise ValidationException("令牌不能为空", field="token")
    
    log_info("用户登出请求")
    
    try:
        # 验证令牌格式并获取用户信息
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.JWT_ALGORITHM])
        phone = payload.get('phone')
        
        # 将令牌加入黑名单
        security_service.add_token_to_blacklist(token)
        
        log_user_action("用户登出", phone=phone)
        log_info("用户登出成功", phone=phone)
        
        return create_success_response(message='登出成功')
        
    except jwt.ExpiredSignatureError:
        # 即使令牌已过期，也要加入黑名单
        security_service.add_token_to_blacklist(token)
        log_info("过期令牌登出")
        return create_success_response(message='登出成功（令牌已过期）')
    except jwt.InvalidTokenError:
        log_warning("无效令牌登出尝试")
        raise AuthenticationException('无效的令牌', error_code='invalid_token')
    except Exception as e:
        log_error("登出异常", error=str(e))
        raise AuthenticationException(f'登出失败: {str(e)}', error_code='logout_failed')