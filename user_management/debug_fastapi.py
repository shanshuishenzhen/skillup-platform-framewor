from main import app, login_with_password
from pydantic import BaseModel
import asyncio
import traceback

class LoginRequest(BaseModel):
    phone: str
    password: str

def test_fastapi_login():
    """直接测试FastAPI的login_with_password函数"""
    print("Testing FastAPI login_with_password function...")
    
    request = LoginRequest(phone='13800000000', password='admin123456')
    
    try:
        result = login_with_password(request)
        print(f"✅ FastAPI login successful: {result}")
        return result
    except Exception as e:
        print(f"❌ FastAPI login failed: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise

if __name__ == "__main__":
    test_fastapi_login()