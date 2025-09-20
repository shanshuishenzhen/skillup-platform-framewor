# error_handler.py

import functools
import traceback
from typing import Callable, Any, Dict, Optional, Union
from exceptions import (
    UserManagementException, DatabaseException, AuthenticationException,
    AuthorizationException, ValidationException, SecurityException,
    SMSException, ConfigurationException, RateLimitException
)
from logger import logger, log_error, log_security_event

def handle_exceptions(log_errors: bool = True, 
                     return_dict: bool = True,
                     default_error_code: str = 'INTERNAL_ERROR'):
    """统一异常处理装饰器
    
    Args:
        log_errors: 是否记录错误日志
        return_dict: 是否返回字典格式的错误信息
        default_error_code: 默认错误代码
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            try:
                return func(*args, **kwargs)
            except UserManagementException as e:
                if log_errors:
                    log_error(
                        f"业务异常在 {func.__name__}: {e.message}",
                        exception=e,
                        function=func.__name__,
                        error_code=e.error_code,
                        details=e.details
                    )
                
                if return_dict:
                    return {
                        'success': False,
                        'error_code': e.error_code,
                        'message': e.message,
                        'details': e.details
                    }
                else:
                    raise
            
            except Exception as e:
                error_message = f"未预期的错误在 {func.__name__}: {str(e)}"
                
                if log_errors:
                    log_error(
                        error_message,
                        exception=e,
                        function=func.__name__,
                        traceback=traceback.format_exc()
                    )
                
                if return_dict:
                    return {
                        'success': False,
                        'error_code': default_error_code,
                        'message': '系统内部错误，请稍后重试',
                        'details': {'original_error': str(e)} if logger.logger.level <= 10 else {}  # DEBUG级别才显示原始错误
                    }
                else:
                    raise UserManagementException(
                        message='系统内部错误',
                        error_code=default_error_code,
                        details={'original_error': str(e)}
                    )
        
        return wrapper
    return decorator

def handle_database_errors(func: Callable) -> Callable:
    """数据库操作异常处理装饰器"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        try:
            return func(*args, **kwargs)
        except DatabaseException:
            raise  # 重新抛出已知的数据库异常
        except Exception as e:
            error_message = f"数据库操作失败: {str(e)}"
            log_error(
                error_message,
                exception=e,
                function=func.__name__
            )
            raise DatabaseException(
                message=error_message,
                details={'function': func.__name__, 'original_error': str(e)}
            )
    
    return wrapper

def handle_security_errors(func: Callable) -> Callable:
    """安全操作异常处理装饰器"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        try:
            return func(*args, **kwargs)
        except SecurityException as e:
            # 记录安全事件
            log_security_event(
                event_type=e.error_code,
                severity='WARNING',
                details=e.details
            )
            raise
        except Exception as e:
            error_message = f"安全操作失败: {str(e)}"
            log_security_event(
                event_type='SECURITY_OPERATION_FAILED',
                severity='ERROR',
                details={'function': func.__name__, 'error': str(e)}
            )
            raise SecurityException(
                message=error_message,
                details={'function': func.__name__, 'original_error': str(e)}
            )
    
    return wrapper

class ErrorHandler:
    """错误处理工具类"""
    
    @staticmethod
    def format_validation_error(field: str, message: str, value: Any = None) -> ValidationException:
        """格式化验证错误"""
        details = {'field': field}
        if value is not None:
            details['value'] = str(value)
        
        return ValidationException(
            message=f"{field}: {message}",
            field=field,
            details=details
        )
    
    @staticmethod
    def format_authentication_error(reason: str, identifier: str = None) -> AuthenticationException:
        """格式化身份验证错误"""
        details = {'reason': reason}
        if identifier:
            details['identifier'] = identifier
        
        return AuthenticationException(
            message=f"身份验证失败: {reason}",
            details=details
        )
    
    @staticmethod
    def format_authorization_error(resource: str, action: str, user_id: str = None) -> AuthorizationException:
        """格式化权限验证错误"""
        details = {
            'resource': resource,
            'action': action
        }
        if user_id:
            details['user_id'] = user_id
        
        return AuthorizationException(
            message=f"权限不足: 无法对 {resource} 执行 {action} 操作",
            details=details
        )
    
    @staticmethod
    def format_rate_limit_error(operation: str, retry_after: int) -> RateLimitException:
        """格式化频率限制错误"""
        return RateLimitException(
            message=f"操作频率过高: {operation}，请在 {retry_after} 秒后重试",
            retry_after=retry_after,
            details={'operation': operation}
        )
    
    @staticmethod
    def create_response(success: bool = True, 
                       data: Any = None, 
                       message: str = None,
                       error_code: str = None,
                       details: Dict = None) -> Dict[str, Any]:
        """创建标准响应格式"""
        from datetime import datetime
        response = {
            'success': success,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        if success:
            if data is not None:
                response['data'] = data
            if message:
                response['message'] = message
        else:
            response['error_code'] = error_code or 'UNKNOWN_ERROR'
            response['message'] = message or '操作失败'
            if details:
                response['details'] = details
        
        return response
    
    @staticmethod
    def log_and_format_error(error: Exception, 
                           context: str = None,
                           user_id: str = None) -> Dict[str, Any]:
        """记录并格式化错误"""
        if isinstance(error, UserManagementException):
            log_error(
                f"业务异常{f' in {context}' if context else ''}: {error.message}",
                exception=error,
                user_id=user_id,
                error_code=error.error_code
            )
            
            return ErrorHandler.create_response(
                success=False,
                message=error.message,
                error_code=error.error_code,
                details=error.details
            )
        else:
            log_error(
                f"系统异常{f' in {context}' if context else ''}: {str(error)}",
                exception=error,
                user_id=user_id
            )
            
            return ErrorHandler.create_response(
                success=False,
                message='系统内部错误，请稍后重试',
                error_code='INTERNAL_ERROR'
            )

# 全局错误处理器实例
error_handler = ErrorHandler()

# 便捷函数
def create_success_response(data: Any = None, message: str = None) -> Dict[str, Any]:
    """创建成功响应"""
    return error_handler.create_response(success=True, data=data, message=message)

def create_error_response(message: str, error_code: str = None, details: Dict = None) -> Dict[str, Any]:
    """创建错误响应"""
    return error_handler.create_response(
        success=False, 
        message=message, 
        error_code=error_code, 
        details=details
    )

def validate_required_fields(data: Dict[str, Any], required_fields: list) -> None:
    """验证必需字段"""
    missing_fields = []
    for field in required_fields:
        if field not in data or data[field] is None or data[field] == '':
            missing_fields.append(field)
    
    if missing_fields:
        raise ValidationException(
            message=f"缺少必需字段: {', '.join(missing_fields)}",
            details={'missing_fields': missing_fields}
        )

def get_db_cursor():
    """获取数据库游标的上下文管理器"""
    from db_manager import db_manager
    return db_manager.get_cursor()