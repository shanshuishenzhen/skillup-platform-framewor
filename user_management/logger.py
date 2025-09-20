# logger.py

import logging
import os
import sys
from datetime import datetime
from typing import Optional, Dict, Any
from config import config

class UserManagementLogger:
    """用户管理系统日志记录器"""
    
    def __init__(self, name: str = 'user_management'):
        self.logger = logging.getLogger(name)
        self._setup_logger()
    
    def _setup_logger(self):
        """设置日志记录器"""
        # 避免重复设置
        if self.logger.handlers:
            return
            
        # 设置日志级别
        log_level = getattr(logging, config.LOG_LEVEL.upper(), logging.INFO)
        self.logger.setLevel(log_level)
        
        # 创建格式化器
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # 控制台处理器
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)
        
        # 文件处理器（如果配置了日志文件）
        if config.LOG_FILE:
            # 确保日志目录存在
            log_dir = os.path.dirname(config.LOG_FILE)
            if log_dir and not os.path.exists(log_dir):
                os.makedirs(log_dir, exist_ok=True)
            
            file_handler = logging.FileHandler(config.LOG_FILE, encoding='utf-8')
            file_handler.setLevel(log_level)
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)
        
        # 防止日志传播到根记录器
        self.logger.propagate = False
    
    def _format_extra_info(self, **kwargs) -> str:
        """格式化额外信息"""
        if not kwargs:
            return ""
        
        extra_parts = []
        for key, value in kwargs.items():
            if value is not None:
                extra_parts.append(f"{key}={value}")
        
        return f" [{', '.join(extra_parts)}]" if extra_parts else ""
    
    def debug(self, message: str, **kwargs):
        """记录调试信息"""
        extra_info = self._format_extra_info(**kwargs)
        self.logger.debug(f"{message}{extra_info}")
    
    def info(self, message: str, **kwargs):
        """记录一般信息"""
        extra_info = self._format_extra_info(**kwargs)
        self.logger.info(f"{message}{extra_info}")
    
    def warning(self, message: str, **kwargs):
        """记录警告信息"""
        extra_info = self._format_extra_info(**kwargs)
        self.logger.warning(f"{message}{extra_info}")
    
    def error(self, message: str, exception: Exception = None, **kwargs):
        """记录错误信息"""
        extra_info = self._format_extra_info(**kwargs)
        if exception:
            self.logger.error(f"{message}{extra_info}", exc_info=exception)
        else:
            self.logger.error(f"{message}{extra_info}")
    
    def critical(self, message: str, exception: Exception = None, **kwargs):
        """记录严重错误信息"""
        extra_info = self._format_extra_info(**kwargs)
        if exception:
            self.logger.critical(f"{message}{extra_info}", exc_info=exception)
        else:
            self.logger.critical(f"{message}{extra_info}")
    
    def log_user_action(self, action: str, user_id: Optional[str] = None, 
                       phone: Optional[str] = None, success: bool = True, 
                       details: Optional[Dict[str, Any]] = None):
        """记录用户操作"""
        level = "INFO" if success else "WARNING"
        status = "成功" if success else "失败"
        
        log_data = {
            'action': action,
            'status': status,
            'user_id': user_id,
            'phone': phone
        }
        
        if details:
            log_data.update(details)
        
        message = f"用户操作: {action} - {status}"
        
        if success:
            self.info(message, **log_data)
        else:
            self.warning(message, **log_data)
    
    def log_security_event(self, event_type: str, severity: str = "INFO", 
                          user_id: Optional[str] = None, 
                          phone: Optional[str] = None,
                          details: Optional[Dict[str, Any]] = None):
        """记录安全事件"""
        log_data = {
            'event_type': event_type,
            'severity': severity,
            'user_id': user_id,
            'phone': phone
        }
        
        if details:
            log_data.update(details)
        
        message = f"安全事件: {event_type}"
        
        if severity.upper() == "CRITICAL":
            self.critical(message, **log_data)
        elif severity.upper() == "ERROR":
            self.error(message, **log_data)
        elif severity.upper() == "WARNING":
            self.warning(message, **log_data)
        else:
            self.info(message, **log_data)
    
    def log_database_operation(self, operation: str, table: str, 
                              success: bool = True, 
                              affected_rows: Optional[int] = None,
                              execution_time: Optional[float] = None,
                              error: Optional[str] = None):
        """记录数据库操作"""
        log_data = {
            'operation': operation,
            'table': table,
            'success': success,
            'affected_rows': affected_rows,
            'execution_time_ms': round(execution_time * 1000, 2) if execution_time else None
        }
        
        if error:
            log_data['error'] = error
        
        message = f"数据库操作: {operation} on {table}"
        
        if success:
            self.debug(message, **log_data)
        else:
            self.error(message, **log_data)
    
    def log_api_request(self, method: str, endpoint: str, 
                       user_id: Optional[str] = None,
                       status_code: Optional[int] = None,
                       response_time: Optional[float] = None,
                       error: Optional[str] = None):
        """记录API请求"""
        log_data = {
            'method': method,
            'endpoint': endpoint,
            'user_id': user_id,
            'status_code': status_code,
            'response_time_ms': round(response_time * 1000, 2) if response_time else None
        }
        
        if error:
            log_data['error'] = error
        
        message = f"API请求: {method} {endpoint}"
        
        if status_code and status_code >= 400:
            self.warning(message, **log_data)
        else:
            self.info(message, **log_data)

# 全局日志记录器实例
logger = UserManagementLogger()

# 便捷函数
def log_debug(message: str, **kwargs):
    """记录调试信息"""
    logger.debug(message, **kwargs)

def log_info(message: str, **kwargs):
    """记录一般信息"""
    logger.info(message, **kwargs)

def log_warning(message: str, **kwargs):
    """记录警告信息"""
    logger.warning(message, **kwargs)

def log_error(message: str, exception: Exception = None, **kwargs):
    """记录错误信息"""
    logger.error(message, exception, **kwargs)

def log_critical(message: str, exception: Exception = None, **kwargs):
    """记录严重错误信息"""
    logger.critical(message, exception, **kwargs)

def log_user_action(action: str, user_id: Optional[str] = None, 
                   phone: Optional[str] = None, success: bool = True, 
                   details: Optional[Dict[str, Any]] = None):
    """记录用户操作"""
    logger.log_user_action(action, user_id, phone, success, details)

def log_security_event(event_type: str, severity: str = "INFO", 
                      user_id: Optional[str] = None, 
                      phone: Optional[str] = None,
                      details: Optional[Dict[str, Any]] = None):
    """记录安全事件"""
    logger.log_security_event(event_type, severity, user_id, phone, details)