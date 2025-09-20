# password_service.py
# 密码找回/重置服务模块

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime, timedelta
import hashlib
import secrets
import re
import sqlite3

from db_manager import get_db_connection
from exceptions import UserManagementException, ValidationException
from logger import log_info, log_warning, log_error
from validation_models import validate_phone, sanitize_input
from auth_service import hash_password

# --- 请求/响应模型 ---

class PasswordResetRequest(BaseModel):
    """密码重置请求模型"""
    phone_number: str = Field(..., description="手机号")
    
    @validator('phone_number')
    def validate_phone_number(cls, v):
        try:
            return validate_phone(v)
        except ValueError:
            raise ValueError("手机号格式不正确")

class VerifyCodeRequest(BaseModel):
    """验证码验证请求模型"""
    phone_number: str = Field(..., description="手机号")
    verification_code: str = Field(..., min_length=6, max_length=6, description="验证码")
    
    @validator('phone_number')
    def validate_phone(cls, v):
        try:
            return validate_phone(v)
        except ValueError:
            raise ValueError("手机号格式不正确")
    
    @validator('verification_code')
    def validate_code(cls, v):
        if not re.match(r'^\d{6}$', v):
            raise ValueError("验证码必须是6位数字")
        return v

class NewPasswordRequest(BaseModel):
    """新密码设置请求模型"""
    phone_number: str = Field(..., description="手机号")
    verification_code: str = Field(..., min_length=6, max_length=6, description="验证码")
    new_password: str = Field(..., min_length=8, max_length=128, description="新密码")
    confirm_password: str = Field(..., description="确认密码")
    
    @validator('phone_number')
    def validate_phone(cls, v):
        try:
            return validate_phone(v)
        except ValueError:
            raise ValueError("手机号格式不正确")
    
    @validator('verification_code')
    def validate_code(cls, v):
        if not re.match(r'^\d{6}$', v):
            raise ValueError("验证码必须是6位数字")
        return v
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("密码长度至少8位")
        if not re.search(r'[A-Za-z]', v):
            raise ValueError("密码必须包含字母")
        if not re.search(r'\d', v):
            raise ValueError("密码必须包含数字")
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError("两次输入的密码不一致")
        return v

class PasswordResetResponse(BaseModel):
    """密码重置响应模型"""
    success: bool
    message: str
    expires_at: Optional[datetime] = None
    remaining_attempts: Optional[int] = None

class VerificationCodeResponse(BaseModel):
    """验证码响应模型"""
    success: bool
    message: str
    token: Optional[str] = None  # 验证成功后返回的临时令牌
    expires_at: Optional[datetime] = None

# --- 核心功能函数 ---

def send_password_reset_code(request: PasswordResetRequest) -> PasswordResetResponse:
    """发送密码重置验证码
    
    Args:
        request: 密码重置请求
        
    Returns:
        发送结果
        
    Raises:
        UserManagementException: 发送失败
        ValidationException: 参数验证失败
    """
    try:
        phone_number = sanitize_input(request.phone_number, 20)
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 检查用户是否存在
            cursor.execute(
                "SELECT id, name, status FROM users WHERE phone_number = ?",
                (phone_number,)
            )
            user = cursor.fetchone()
            
            if not user:
                log_warning("密码重置请求失败 - 用户不存在", phone_number=phone_number)
                raise ValidationException("该手机号未注册")
            
            user_id, user_name, user_status = user
            
            if user_status == 'Deleted':
                log_warning("密码重置请求失败 - 用户已删除", 
                           phone_number=phone_number, user_id=user_id)
                raise ValidationException("该账户不存在")
            
            if user_status == 'Suspended':
                log_warning("密码重置请求失败 - 用户已暂停", 
                           phone_number=phone_number, user_id=user_id)
                raise ValidationException("该账户已被暂停，请联系管理员")
            
            # 检查发送频率限制
            _check_send_rate_limit(cursor, phone_number)
            
            # 生成验证码
            verification_code = _generate_verification_code()
            expires_at = datetime.now() + timedelta(minutes=10)  # 10分钟有效期
            
            # 保存验证码记录
            cursor.execute("""
                INSERT INTO password_reset_codes 
                (phone_number, user_id, verification_code, expires_at, attempts, created_at)
                VALUES (?, ?, ?, ?, 0, ?)
            """, (
                phone_number,
                user_id,
                _hash_verification_code(verification_code),
                expires_at.isoformat(),
                datetime.now().isoformat()
            ))
            
            conn.commit()
            
            # 模拟发送短信（实际项目中需要集成短信服务）
            success = _send_sms_verification_code(phone_number, verification_code, user_name)
            
            if success:
                log_info("密码重置验证码发送成功", 
                        phone_number=phone_number,
                        user_id=user_id,
                        expires_at=expires_at)
                
                return PasswordResetResponse(
                    success=True,
                    message="验证码已发送，请查收短信",
                    expires_at=expires_at
                )
            else:
                log_error("密码重置验证码发送失败", 
                         phone_number=phone_number,
                         user_id=user_id)
                raise UserManagementException("验证码发送失败，请稍后重试")
            
    except ValidationException:
        raise
    except Exception as e:
        log_error("密码重置验证码发送异常", 
                 phone_number=request.phone_number,
                 error=str(e))
        raise UserManagementException(f"发送验证码失败: {str(e)}")

def verify_reset_code(request: VerifyCodeRequest) -> VerificationCodeResponse:
    """验证密码重置验证码
    
    Args:
        request: 验证码验证请求
        
    Returns:
        验证结果
        
    Raises:
        UserManagementException: 验证失败
        ValidationException: 参数验证失败
    """
    try:
        phone_number = sanitize_input(request.phone_number, 20)
        verification_code = sanitize_input(request.verification_code, 10)
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 获取最新的验证码记录
            cursor.execute("""
                SELECT id, user_id, verification_code, expires_at, attempts, verified
                FROM password_reset_codes
                WHERE phone_number = ? AND expires_at > ?
                ORDER BY created_at DESC
                LIMIT 1
            """, (phone_number, datetime.now().isoformat()))
            
            code_record = cursor.fetchone()
            
            if not code_record:
                log_warning("验证码验证失败 - 无有效验证码", phone_number=phone_number)
                raise ValidationException("验证码已过期或不存在，请重新获取")
            
            record_id, user_id, stored_code, expires_at, attempts, verified = code_record
            
            if verified:
                log_warning("验证码验证失败 - 验证码已使用", 
                           phone_number=phone_number, record_id=record_id)
                raise ValidationException("验证码已使用，请重新获取")
            
            if attempts >= 3:
                log_warning("验证码验证失败 - 尝试次数过多", 
                           phone_number=phone_number, record_id=record_id)
                raise ValidationException("验证码尝试次数过多，请重新获取")
            
            # 验证验证码
            if not _verify_verification_code(verification_code, stored_code):
                # 增加尝试次数
                cursor.execute(
                    "UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = ?",
                    (record_id,)
                )
                conn.commit()
                
                remaining_attempts = 3 - (attempts + 1)
                log_warning("验证码验证失败 - 验证码错误", 
                           phone_number=phone_number,
                           record_id=record_id,
                           remaining_attempts=remaining_attempts)
                
                return VerificationCodeResponse(
                    success=False,
                    message=f"验证码错误，还可尝试{remaining_attempts}次"
                )
            
            # 验证成功，标记为已验证并生成临时令牌
            reset_token = _generate_reset_token()
            token_expires = datetime.now() + timedelta(minutes=30)  # 30分钟有效期
            
            cursor.execute("""
                UPDATE password_reset_codes 
                SET verified = 1, reset_token = ?, token_expires_at = ?
                WHERE id = ?
            """, (reset_token, token_expires.isoformat(), record_id))
            
            conn.commit()
            
            log_info("验证码验证成功", 
                    phone_number=phone_number,
                    user_id=user_id,
                    record_id=record_id)
            
            return VerificationCodeResponse(
                success=True,
                message="验证码验证成功",
                token=reset_token,
                expires_at=token_expires
            )
            
    except ValidationException:
        raise
    except Exception as e:
        log_error("验证码验证异常", 
                 phone_number=request.phone_number,
                 error=str(e))
        raise UserManagementException(f"验证码验证失败: {str(e)}")

def reset_password(request: NewPasswordRequest) -> PasswordResetResponse:
    """重置密码
    
    Args:
        request: 新密码设置请求
        
    Returns:
        重置结果
        
    Raises:
        UserManagementException: 重置失败
        ValidationException: 参数验证失败
    """
    try:
        phone_number = sanitize_input(request.phone_number, 20)
        verification_code = sanitize_input(request.verification_code, 10)
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 验证重置令牌
            cursor.execute("""
                SELECT prc.id, prc.user_id, prc.reset_token, prc.token_expires_at,
                       u.name, u.status
                FROM password_reset_codes prc
                JOIN users u ON prc.user_id = u.id
                WHERE prc.phone_number = ? AND prc.verification_code = ? 
                  AND prc.verified = 1 AND prc.token_expires_at > ?
                ORDER BY prc.created_at DESC
                LIMIT 1
            """, (
                phone_number,
                _hash_verification_code(verification_code),
                datetime.now().isoformat()
            ))
            
            reset_record = cursor.fetchone()
            
            if not reset_record:
                log_warning("密码重置失败 - 无效的重置请求", phone_number=phone_number)
                raise ValidationException("重置请求无效或已过期，请重新获取验证码")
            
            record_id, user_id, reset_token, token_expires, user_name, user_status = reset_record
            
            if user_status in ['Deleted', 'Suspended']:
                log_warning("密码重置失败 - 用户状态异常", 
                           phone_number=phone_number, 
                           user_id=user_id,
                           status=user_status)
                raise ValidationException("账户状态异常，无法重置密码")
            
            # 更新用户密码
            new_password_hash = hash_password(request.new_password)
            
            cursor.execute("""
                UPDATE users 
                SET password_hash = ?, updated_at = ?
                WHERE id = ?
            """, (
                new_password_hash,
                datetime.now().isoformat(),
                user_id
            ))
            
            # 标记重置记录为已使用
            cursor.execute("""
                UPDATE password_reset_codes 
                SET used = 1, used_at = ?
                WHERE id = ?
            """, (datetime.now().isoformat(), record_id))
            
            conn.commit()
            
            log_info("密码重置成功", 
                    phone_number=phone_number,
                    user_id=user_id,
                    user_name=user_name)
            
            return PasswordResetResponse(
                success=True,
                message="密码重置成功，请使用新密码登录"
            )
            
    except ValidationException:
        raise
    except Exception as e:
        log_error("密码重置异常", 
                 phone_number=request.phone_number,
                 error=str(e))
        raise UserManagementException(f"密码重置失败: {str(e)}")

def cleanup_expired_codes():
    """清理过期的验证码记录
    
    定期任务，清理过期的验证码记录
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 删除过期的验证码记录（保留7天）
            cutoff_time = datetime.now() - timedelta(days=7)
            
            cursor.execute("""
                DELETE FROM password_reset_codes 
                WHERE expires_at < ?
            """, (cutoff_time.isoformat(),))
            
            deleted_count = cursor.rowcount
            conn.commit()
            
            if deleted_count > 0:
                log_info("清理过期验证码记录", deleted_count=deleted_count)
            
    except Exception as e:
        log_error("清理过期验证码记录失败", error=str(e))

# --- 辅助函数 ---

def _check_send_rate_limit(cursor, phone_number: str):
    """检查发送频率限制"""
    # 检查1分钟内是否已发送
    one_minute_ago = datetime.now() - timedelta(minutes=1)
    cursor.execute("""
        SELECT COUNT(*) FROM password_reset_codes
        WHERE phone_number = ? AND created_at > ?
    """, (phone_number, one_minute_ago.isoformat()))
    
    recent_count = cursor.fetchone()[0]
    if recent_count > 0:
        raise ValidationException("发送过于频繁，请1分钟后再试")
    
    # 检查1小时内发送次数
    one_hour_ago = datetime.now() - timedelta(hours=1)
    cursor.execute("""
        SELECT COUNT(*) FROM password_reset_codes
        WHERE phone_number = ? AND created_at > ?
    """, (phone_number, one_hour_ago.isoformat()))
    
    hourly_count = cursor.fetchone()[0]
    if hourly_count >= 5:
        raise ValidationException("1小时内发送次数过多，请稍后再试")

def _generate_verification_code() -> str:
    """生成6位数字验证码"""
    return f"{secrets.randbelow(1000000):06d}"

def _hash_verification_code(code: str) -> str:
    """哈希验证码"""
    return hashlib.sha256(code.encode()).hexdigest()

def _verify_verification_code(input_code: str, stored_hash: str) -> bool:
    """验证验证码"""
    return _hash_verification_code(input_code) == stored_hash

def _generate_reset_token() -> str:
    """生成重置令牌"""
    return secrets.token_urlsafe(32)

def _send_sms_verification_code(phone_number: str, code: str, user_name: str) -> bool:
    """发送短信验证码
    
    实际项目中需要集成短信服务提供商的API
    这里仅作模拟实现
    """
    try:
        # 模拟短信发送
        message = f"【学习平台】{user_name}，您的密码重置验证码是：{code}，10分钟内有效，请勿泄露。"
        
        # 在实际项目中，这里应该调用短信服务API
        # 例如：阿里云短信、腾讯云短信等
        
        log_info("模拟短信发送", 
                phone_number=phone_number,
                message=message)
        
        # 模拟发送成功
        return True
        
    except Exception as e:
        log_error("短信发送失败", 
                 phone_number=phone_number,
                 error=str(e))
        return False