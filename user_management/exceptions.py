# exceptions.py

class UserManagementException(Exception):
    """用户管理系统基础异常类"""
    
    def __init__(self, message: str, error_code: str = None, details: dict = None):
        self.message = message
        self.error_code = error_code or 'UNKNOWN_ERROR'
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            'error_code': self.error_code,
            'message': self.message,
            'details': self.details
        }

class DatabaseException(UserManagementException):
    """数据库相关异常"""
    
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, 'DATABASE_ERROR', details)

class AuthenticationException(UserManagementException):
    """身份验证异常"""
    
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, 'AUTHENTICATION_ERROR', details)

class AuthorizationException(UserManagementException):
    """权限验证异常"""
    
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, 'AUTHORIZATION_ERROR', details)

class ValidationException(UserManagementException):
    """数据验证异常"""
    
    def __init__(self, message: str, field: str = None, details: dict = None):
        if field:
            details = details or {}
            details['field'] = field
        super().__init__(message, 'VALIDATION_ERROR', details)

class SecurityException(UserManagementException):
    """安全相关异常"""
    
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, 'SECURITY_ERROR', details)

class SMSException(UserManagementException):
    """短信服务异常"""
    
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, 'SMS_ERROR', details)

class ConfigurationException(UserManagementException):
    """配置异常"""
    
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, 'CONFIGURATION_ERROR', details)

class RateLimitException(UserManagementException):
    """频率限制异常"""
    
    def __init__(self, message: str, retry_after: int = None, details: dict = None):
        if retry_after:
            details = details or {}
            details['retry_after'] = retry_after
        super().__init__(message, 'RATE_LIMIT_ERROR', details)

class UserNotFoundException(UserManagementException):
    """用户未找到异常"""
    
    def __init__(self, identifier: str, details: dict = None):
        message = f"用户未找到: {identifier}"
        details = details or {}
        details['identifier'] = identifier
        super().__init__(message, 'USER_NOT_FOUND', details)

class DuplicateUserException(UserManagementException):
    """用户重复异常"""
    
    def __init__(self, identifier: str, details: dict = None):
        message = f"用户已存在: {identifier}"
        details = details or {}
        details['identifier'] = identifier
        super().__init__(message, 'DUPLICATE_USER', details)

class AccountLockedException(SecurityException):
    """账户锁定异常"""
    
    def __init__(self, identifier: str, remaining_time: int, details: dict = None):
        message = f"账户已被锁定: {identifier}，剩余时间: {remaining_time}秒"
        details = details or {}
        details.update({
            'identifier': identifier,
            'remaining_time': remaining_time
        })
        super().__init__(message, details)

class TokenBlacklistedException(SecurityException):
    """令牌黑名单异常"""
    
    def __init__(self, details: dict = None):
        message = "令牌已被撤销"
        super().__init__(message, details)