from auth_service import authenticate_user, generate_jwt_token
from exceptions import UserManagementException, ValidationException, AuthenticationException
from logger import log_info, log_warning, log_error, log_user_action
import traceback

def test_login_flow(phone, password):
    """模拟main.py中的login_with_password函数逻辑"""
    print(f"Testing login flow for {phone}...")
    
    log_info("用户登录请求", phone=phone)
    
    if not phone or not password:
        log_warning("登录参数不完整", phone=phone)
        raise ValidationException("手机号和密码不能为空")
    
    try:
        print("Step 1: Calling authenticate_user...")
        auth_result = authenticate_user(phone, password)
        print(f"Auth result: {auth_result}")
        
        if auth_result:
            user_id, role = auth_result
            print(f"Step 2: Generating JWT token for user_id={user_id}, role={role}...")
            token = generate_jwt_token(user_id, role)
            print(f"Token generated successfully: {token[:50]}...")
            
            log_user_action("用户登录成功", phone=phone, user_id=user_id)
            print("✅ Login successful!")
            return {"token": token, "user_id": user_id, "role": role}
        else:
            log_warning("用户认证失败", phone=phone)
            raise AuthenticationException("手机号或密码错误")
            
    except UserManagementException as e:
        print(f"UserManagementException caught: {e}")
        # 异常已经被装饰器处理，直接重新抛出
        raise
    except Exception as e:
        print(f"Generic Exception caught: {type(e).__name__}: {e}")
        traceback.print_exc()
        log_error("登录处理异常", error=str(e), phone=phone)
        raise AuthenticationException("登录处理失败")

if __name__ == "__main__":
    try:
        result = test_login_flow('13800000000', 'admin123456')
        print(f"Final result: {result}")
    except Exception as e:
        print(f"Final exception: {type(e).__name__}: {e}")
        traceback.print_exc()