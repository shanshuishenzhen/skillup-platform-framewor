# config.py

import os
from typing import Optional

class Config:
    """应用配置类，统一管理所有配置项"""
    
    # 数据库配置
    DATABASE_PATH: str = os.getenv('DATABASE_PATH', 'user_management.db')
    
    # JWT 配置
    JWT_SECRET_KEY: str = os.getenv('JWT_SECRET_KEY', 'your-super-secret-jwt-key-change-in-production')
    JWT_ALGORITHM: str = os.getenv('JWT_ALGORITHM', 'HS256')
    JWT_EXPIRATION_HOURS: int = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))
    
    # 超级管理员配置
    SUPER_ADMIN_PHONE: str = os.getenv('SUPER_ADMIN_PHONE', '13800000000')
    SUPER_ADMIN_PASSWORD: str = os.getenv('SUPER_ADMIN_PASSWORD', 'admin123456')
    
    # 短信服务配置
    SMS_CODE_EXPIRY_SECONDS: int = int(os.getenv('SMS_CODE_EXPIRY_SECONDS', '300'))  # 5分钟
    SMS_RATE_LIMIT_SECONDS: int = int(os.getenv('SMS_RATE_LIMIT_SECONDS', '60'))    # 60秒
    
    # 密码重置配置
    PASSWORD_RESET_CODE_EXPIRY_MINUTES: int = int(os.getenv('PASSWORD_RESET_CODE_EXPIRY_MINUTES', '10'))  # 10分钟
    PASSWORD_RESET_RATE_LIMIT_SECONDS: int = int(os.getenv('PASSWORD_RESET_RATE_LIMIT_SECONDS', '60'))    # 60秒
    
    # 安全配置
    MAX_LOGIN_ATTEMPTS = int(os.getenv('MAX_LOGIN_ATTEMPTS', '5'))
    LOGIN_LOCKOUT_MINUTES = int(os.getenv('LOGIN_LOCKOUT_MINUTES', '15'))
    JWT_BLACKLIST_CLEANUP_DAYS = int(os.getenv('JWT_BLACKLIST_CLEANUP_DAYS', '30'))
    
    # 日志配置
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'logs/user_management.log')
    LOG_MAX_SIZE = int(os.getenv('LOG_MAX_SIZE', '10485760'))  # 10MB
    LOG_BACKUP_COUNT = int(os.getenv('LOG_BACKUP_COUNT', '5'))
    
    # 文件上传配置
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv('MAX_UPLOAD_SIZE_MB', '10'))  # 10MB
    ALLOWED_FILE_EXTENSIONS: str = os.getenv('ALLOWED_FILE_EXTENSIONS', '.xlsx,.xls,.csv')
    UPLOAD_TEMP_DIR: str = os.getenv('UPLOAD_TEMP_DIR', 'temp/uploads')
    
    # 数据导入配置
    MAX_IMPORT_BATCH_SIZE: int = int(os.getenv('MAX_IMPORT_BATCH_SIZE', '1000'))
    IMPORT_VALIDATION_STRICT: bool = os.getenv('IMPORT_VALIDATION_STRICT', 'True').lower() == 'true'
    
    # 应用配置
    APP_NAME = os.getenv('APP_NAME', 'SkillUp用户管理系统')
    APP_VERSION = os.getenv('APP_VERSION', '1.0.0')
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    HOST: str = os.getenv('HOST', '0.0.0.0')
    PORT: int = int(os.getenv('PORT', '8000'))
    
    # 外部服务配置 (可选)
    SMS_API_KEY: Optional[str] = os.getenv('SMS_API_KEY')
    SMS_API_URL: Optional[str] = os.getenv('SMS_API_URL')
    EMAIL_SMTP_HOST: Optional[str] = os.getenv('EMAIL_SMTP_HOST')
    EMAIL_SMTP_PORT: Optional[int] = int(os.getenv('EMAIL_SMTP_PORT', '587')) if os.getenv('EMAIL_SMTP_PORT') else None
    EMAIL_USERNAME: Optional[str] = os.getenv('EMAIL_USERNAME')
    EMAIL_PASSWORD: Optional[str] = os.getenv('EMAIL_PASSWORD')
    
    @classmethod
    def validate_config(cls) -> bool:
        """验证关键配置项是否正确设置"""
        errors = []
        warnings = []
        
        # 安全配置检查
        if cls.JWT_SECRET_KEY == 'your-super-secret-jwt-key-change-in-production':
            errors.append("JWT_SECRET_KEY 仍使用默认值，生产环境中必须更改")
            
        if cls.SUPER_ADMIN_PASSWORD == 'admin123456':
            errors.append("SUPER_ADMIN_PASSWORD 仍使用默认值，生产环境中必须更改")
            
        if len(cls.JWT_SECRET_KEY) < 32:
            warnings.append("JWT_SECRET_KEY 长度建议至少32个字符")
            
        # 文件上传配置检查
        if cls.MAX_UPLOAD_SIZE_MB > 50:
            warnings.append("MAX_UPLOAD_SIZE_MB 设置过大，可能影响服务器性能")
            
        # 创建必要的目录
        import os
        os.makedirs(os.path.dirname(cls.LOG_FILE), exist_ok=True)
        os.makedirs(cls.UPLOAD_TEMP_DIR, exist_ok=True)
        
        # 输出验证结果
        if errors:
            print("❌ 配置验证错误:")
            for error in errors:
                print(f"  - {error}")
                
        if warnings:
            print("⚠️ 配置验证警告:")
            for warning in warnings:
                print(f"  - {warning}")
                
        return len(errors) == 0
    
    @classmethod
    def get_allowed_extensions(cls) -> list:
        """获取允许的文件扩展名列表"""
        return [ext.strip() for ext in cls.ALLOWED_FILE_EXTENSIONS.split(',') if ext.strip()]
    
    @classmethod
    def is_production(cls) -> bool:
        """判断是否为生产环境"""
        return not cls.DEBUG and os.getenv('ENVIRONMENT', '').lower() == 'production'

# 全局配置实例
config = Config()

# 在模块加载时验证配置
if __name__ == '__main__':
    config.validate_config()