# sms_service.py

import time
import random
from typing import Dict, Optional
from auth_service import get_user_by_phone, create_new_user, generate_jwt_token
from config import config
from exceptions import ValidationException, SMSException, RateLimitException, AuthenticationException
from logger import log_info, log_warning, log_error, log_security_event
from error_handler import handle_exceptions

# 假设使用一个内存字典模拟 Redis 存储验证码和速率限制
# 实际生产环境应使用 Redis 客户端
TEMP_STORAGE = {} 
SMS_CODE_PREFIX = "sms_code:"
RATE_LIMIT_PREFIX = "rate_limit:"
CODE_EXPIRY_SECONDS = config.SMS_CODE_EXPIRY_SECONDS  # 从配置获取
RATE_LIMIT_SECONDS = config.SMS_RATE_LIMIT_SECONDS    # 从配置获取

# --- API 1: 发送验证码 ---
@handle_exceptions()
def send_verification_code(phone_number: str) -> Dict[str, any]:
    """发送短信验证码
    
    Args:
        phone_number: 接收验证码的手机号
        
    Returns:
        发送结果字典
        
    Raises:
        ValidationException: 手机号格式错误
        RateLimitException: 发送频率限制
        SMSException: 短信发送失败
    """
    
    if not phone_number:
        raise ValidationException("手机号不能为空")
    
    log_info("发送验证码请求", phone=phone_number)
    
    # 1. 速率限制检查 (模拟)
    last_sent_time = TEMP_STORAGE.get(RATE_LIMIT_PREFIX + phone_number, 0)
    current_time = time.time()
    if current_time - last_sent_time < RATE_LIMIT_SECONDS:
        remaining_time = RATE_LIMIT_SECONDS - int(current_time - last_sent_time)
        log_warning("验证码发送频率限制", phone=phone_number, remaining_time=remaining_time)
        raise RateLimitException(f"请等待 {remaining_time} 秒后再发送")

    try:
        # 2. 生成验证码
        code = str(random.randint(100000, 999999))
        
        # 3. 模拟短信 API 调用
        # TODO: 实际调用第三方短信 API (例如 logging.info("...") )
        log_info("模拟发送短信验证码", phone=phone_number, code=code)
        print(f"【短信服务】已向 {phone_number} 发送验证码: {code}")
        
        # 4. 存储验证码和更新速率限制 (模拟)
        TEMP_STORAGE[SMS_CODE_PREFIX + phone_number] = code
        TEMP_STORAGE[RATE_LIMIT_PREFIX + phone_number] = current_time
        
        log_security_event("验证码发送成功", phone=phone_number)

        return {"success": True, "message": "验证码发送成功。"}
        
    except Exception as e:
        log_error("验证码发送失败", error=str(e), phone=phone_number)
        raise SMSException(f"验证码发送失败: {str(e)}")


# --- API 2: 验证并登录 ---
@handle_exceptions()
def verify_sms_and_login(phone_number: str, code: str) -> Dict[str, any]:
    """验证短信验证码并登录
    
    Args:
        phone_number: 手机号
        code: 验证码
        
    Returns:
        登录结果字典
        
    Raises:
        ValidationException: 参数验证失败
        AuthenticationException: 验证码验证失败
        DatabaseException: 数据库操作失败
    """
    
    if not phone_number or not code:
        raise ValidationException("手机号和验证码不能为空")
    
    log_info("验证码登录请求", phone=phone_number)
    
    # 1. 检查验证码是否存在
    stored_code = TEMP_STORAGE.get(SMS_CODE_PREFIX + phone_number)
    if not stored_code:
        log_warning("验证码不存在或已过期", phone=phone_number)
        raise AuthenticationException("验证码不存在或已过期")
    
    # 2. 验证码校验
    if stored_code != code:
        log_warning("验证码错误", phone=phone_number, provided_code=code)
        raise AuthenticationException("验证码错误")
    
    try:
        # 3. 验证成功，清除验证码
        del TEMP_STORAGE[SMS_CODE_PREFIX + phone_number]
        
        # 4. 检查用户是否存在
        user = get_user_by_phone(phone_number)
        
        if user:
            # 用户存在，直接登录
            token = generate_jwt_token(user["id"], user["role"])
            log_security_event("短信验证码登录成功", phone=phone_number, user_id=user["id"])
            return {
                "success": True,
                "message": "登录成功",
                "token": token,
                "user": {
                    "user_id": user["id"],
                    "phone_number": user["phone_number"],
                    "role": user["role"]
                }
            }
        else:
            # 用户不存在，创建新用户
            new_user = create_new_user(phone_number=phone_number)
            token = generate_jwt_token(new_user["id"], new_user["role"])
            log_security_event("短信验证码注册并登录成功", phone=phone_number, user_id=new_user["id"])
            return {
                "success": True,
                "message": "注册并登录成功",
                "token": token,
                "user": {
                    "user_id": new_user["id"],
                    "phone_number": new_user["phone_number"],
                    "role": new_user["role"]
                }
            }
            
    except Exception as e:
        log_error("短信验证码登录失败", error=str(e), phone=phone_number)
        raise