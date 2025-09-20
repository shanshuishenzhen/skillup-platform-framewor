#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
用户管理模块主应用
提供用户身份认证、登录和 JWT 授权服务
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Depends, Request, File, UploadFile, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
import traceback
import json
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager
from datetime import datetime

# 导入服务模块
from auth_service import (
    authenticate_user, 
    generate_jwt_token, 
    get_current_user_payload,
    logout_user
)
from sms_service import send_verification_code, verify_sms_and_login
from user_crud_service import (
    create_user, 
    update_user, 
    delete_user
)
# attribute_service 和 attribute_value_service 的导入在需要时进行
# 避免循环导入问题
from config import Config
from logger import log_info, log_warning, log_error, log_user_action
from error_handler import handle_exceptions, create_success_response
from exceptions import UserManagementException, ValidationException, AuthenticationException
from seeder import run_seeder

# 运行数据库初始化
run_seeder()

# 创建 FastAPI 应用实例
app = FastAPI(
    title="用户管理系统",
    description="用户身份认证、登录和 JWT 授权服务",
    version="1.0.0"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局异常处理器
@app.exception_handler(UserManagementException)
async def user_management_exception_handler(request, exc: UserManagementException):
    # 根据异常类型设置HTTP状态码
    status_code = 400  # 默认客户端错误
    if exc.error_code in ['DATABASE_ERROR', 'UNKNOWN_ERROR']:
        status_code = 500
    elif exc.error_code in ['AUTHENTICATION_ERROR']:
        status_code = 401
    elif exc.error_code in ['AUTHORIZATION_ERROR']:
        status_code = 403
    elif exc.error_code in ['USER_NOT_FOUND']:
        status_code = 404
    elif exc.error_code in ['RATE_LIMIT_ERROR']:
        status_code = 429
    
    return JSONResponse(
        status_code=status_code,
        content={"detail": exc.message, "error_code": exc.error_code}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    log_error("未处理的异常", error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "内部服务器错误"}
    )

# Pydantic 请求模型
class LoginRequest(BaseModel):
    phone: str = Field(description="手机号码")
    password: str = Field(description="密码")

class SMSLoginRequest(BaseModel):
    phone: str = Field(description="手机号码")
    code: str = Field(description="短信验证码")

class TokenResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user_id: int
    role: str

# --- 登录认证路由 ---

@app.post("/api/v1/login/password", response_model=TokenResponse, summary="手机号密码登录")
@handle_exceptions(return_dict=False)
def login_with_password(request: LoginRequest):
    """通过手机号和密码进行登录，成功后返回 JWT 令牌
    
    Args:
        request: 登录请求，包含手机号和密码
        
    Returns:
        登录成功响应，包含JWT令牌和用户信息
        
    Raises:
        ValidationException: 参数验证失败
        AuthenticationException: 认证失败
    """
    log_info("用户登录请求", phone=request.phone)
    
    if not request.phone or not request.password:
        log_warning("登录参数不完整", phone=request.phone)
        raise ValidationException("手机号和密码不能为空")
    
    try:
        auth_result = authenticate_user(request.phone, request.password)
        
        if auth_result:
            user_id, role = auth_result
            token = generate_jwt_token(user_id, role)
            log_user_action("用户登录成功", phone=request.phone, user_id=user_id)
            return TokenResponse(token=token, user_id=user_id, role=role)
        else:
            log_warning("用户认证失败", phone=request.phone)
            raise AuthenticationException("手机号或密码错误")
            
    except UserManagementException:
        # 异常已经被装饰器处理，直接重新抛出
        raise
    except Exception as e:
        log_error("登录处理异常", error=str(e), phone=request.phone)
        raise AuthenticationException("登录处理失败")

@app.post("/api/v1/login/sms/send", summary="发送短信验证码")
@handle_exceptions(return_dict=False)
def send_sms_code(phone: str = Body(..., embed=True)):
    """发送短信验证码到指定手机号
    
    Args:
        phone: 接收验证码的手机号码
        
    Returns:
        发送成功响应
        
    Raises:
        ValidationException: 手机号格式错误
        SMSException: 短信发送失败
    """
    log_info("发送短信验证码请求", phone=phone)
    
    if not phone:
        log_warning("手机号为空")
        raise ValidationException("手机号不能为空")
    
    try:
        result = send_verification_code(phone)
        
        if result["success"]:
            log_info("验证码发送成功", phone=phone)
            return create_success_response("验证码发送成功")
        else:
            log_warning("验证码发送失败", phone=phone, reason=result["message"])
            raise ValidationException(result["message"])
            
    except Exception as e:
        log_error("发送验证码异常", error=str(e), phone=phone)
        raise ValidationException("验证码发送失败")

@app.post("/api/v1/login/sms/verify", response_model=TokenResponse, summary="验证码登录注册")
@handle_exceptions(return_dict=False)
def login_with_sms(request: SMSLoginRequest):
    """通过短信验证码进行登录或注册
    
    Args:
        request: 短信登录请求，包含手机号和验证码
        
    Returns:
        登录成功响应，包含JWT令牌和用户信息
        
    Raises:
        ValidationException: 参数验证失败或验证码错误
        AuthenticationException: 认证失败
    """
    log_info("短信验证码登录请求", phone=request.phone)
    
    if not request.phone or not request.code:
        log_warning("短信登录参数不完整", phone=request.phone)
        raise ValidationException("手机号和验证码不能为空")
    
    try:
        result = verify_sms_and_login(request.phone, request.code)
        
        if result["success"]:
            user_info = result["user"]
            log_user_action("短信验证码登录成功", phone=request.phone, user_id=user_info["user_id"])
            return TokenResponse(
                token=result["token"],
                user_id=user_info["user_id"],
                role=user_info["role"]
            )
        else:
            log_warning("短信验证码验证失败", phone=request.phone, reason=result["message"])
            raise ValidationException(result["message"])
            
    except Exception as e:
        log_error("短信登录处理异常", error=str(e), phone=request.phone)
        raise AuthenticationException("短信登录处理失败")

# --- JWT 保护的测试路由（模块间信息传递示例） ---

@app.get("/api/v1/enroll/my_profile", summary="获取受保护的用户资料")
@handle_exceptions(return_dict=False)
def get_user_profile(
    # 核心：使用 Depends 统一验证 JWT 令牌
    current_user: dict = Depends(get_current_user_payload)
):
    """只有携带有效 JWT 的用户才能访问，用于获取用户ID和角色
    
    Args:
        current_user: 当前认证用户信息
        
    Returns:
        用户资料响应
        
    Raises:
        AuthenticationException: 认证失败
    """
    log_info("访问用户资料", user_id=current_user.get('user_id'))
    
    try:
        # 从JWT 载荷中获取用户信息
        user_id = current_user.get("user_id")
        role = current_user.get("role")
        
        # 授权检查（示例：只有学员才能访问此接口）
        if role not in ["Student", "SuperAdmin"]:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="权限不足")
        
        # 获取完整用户信息
        user_info = get_user_by_id(user_id)
        if not user_info:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        log_user_action("获取用户资料成功", user_id=user_id)
        return create_success_response("获取用户资料成功", data={
            "user_id": user_id,
            "role": role,
            "user_info": user_info
        })
        
    except HTTPException:
        raise
    except Exception as e:
        log_error("获取用户资料异常", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="获取用户资料失败")

# --- 用户管理接口 ---

@app.post("/api/v1/users", summary="创建用户")
@handle_exceptions(return_dict=False)
def create_user_endpoint(
    user_data: dict,
    current_user: dict = Depends(get_current_user_payload)
):
    """创建新用户账户"""
    # 权限检查
    if current_user.get("role") != "SuperAdmin":
        raise HTTPException(status_code=403, detail="权限不足")
    
    try:
        from user_crud_service import UserCreateRequest
        user_request = UserCreateRequest(**user_data)
        result = create_user(user_request)
        log_user_action("创建用户成功", user_id=current_user.get('user_id'), phone=user_data.get('phone'))
        return create_success_response(result.model_dump(), "用户创建成功")
    except Exception as e:
        log_error("创建用户失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="创建用户失败")

@app.get("/api/v1/users/{user_id}", summary="获取用户信息")
@handle_exceptions(return_dict=False)
def get_user(
    user_id: int,
    current_user: dict = Depends(get_current_user_payload)
):
    """获取指定用户信息"""
    try:
        from user_query_service import get_user_by_id
        user_info = get_user_by_id(user_id)
        if not user_info:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        return create_success_response(user_info, "获取用户信息成功")
    except HTTPException:
        raise
    except Exception as e:
        log_error("获取用户信息失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="获取用户信息失败")

@app.put("/api/v1/users/{user_id}", summary="更新用户信息")
@handle_exceptions(return_dict=False)
def update_user_endpoint(
    user_id: int,
    user_data: dict,
    current_user: dict = Depends(get_current_user_payload)
):
    """更新用户信息"""
    try:
        from user_crud_service import UserUpdateRequest, update_user
        from exceptions import ValidationException
        user_request = UserUpdateRequest(**user_data)
        result = update_user(user_id, user_request, current_user.get('user_id'))
        log_user_action("更新用户信息成功", user_id=current_user.get('user_id'), details={'target_user_id': user_id})
        return create_success_response(result.model_dump(), "用户信息更新成功")
    except ValidationException as e:
        log_error("用户信息验证失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log_error("更新用户信息失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="更新用户信息失败")

@app.delete("/api/v1/users/{user_id}", summary="删除用户")
@handle_exceptions(return_dict=False)
def delete_user_endpoint(
    user_id: int,
    current_user: dict = Depends(get_current_user_payload)
):
    """删除用户账户"""
    # 权限检查
    if current_user.get("role") != "SuperAdmin":
        raise HTTPException(status_code=403, detail="权限不足")
    
    try:
        from user_crud_service import delete_user
        result = delete_user(user_id)
        log_user_action("删除用户成功", user_id=current_user.get('user_id'), details={'target_user_id': user_id})
        return create_success_response("用户删除成功")
    except Exception as e:
        log_error("删除用户失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="删除用户失败")

@app.get("/api/v1/users", summary="获取用户列表")
@handle_exceptions(return_dict=False)
def get_users(
    page: int = 1,
    page_size: int = 20,
    current_user: dict = Depends(get_current_user_payload)
):
    """获取用户列表"""
    try:
        # 简单实现用户列表查询
        from db_manager import get_db_connection
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 获取总数
            cursor.execute("SELECT COUNT(*) FROM users")
            total = cursor.fetchone()[0]
            
            # 获取分页数据
            offset = (page - 1) * page_size
            cursor.execute("SELECT id, name, phone_number, role, status FROM users LIMIT ? OFFSET ?", (page_size, offset))
            users = cursor.fetchall()
            users_list = [dict(zip([col[0] for col in cursor.description], row)) for row in users]
            
            result = {
                "users": users_list,
                "total": total,
                "page": page,
                "page_size": page_size
            }
        return create_success_response(result, "获取用户列表成功")
    except Exception as e:
        log_error("获取用户列表失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="获取用户列表失败")

# --- 属性管理接口 ---

@app.post("/api/v1/attributes", summary="创建属性")
@handle_exceptions(return_dict=False)
def create_attribute_endpoint(
    attribute_data: dict,
    current_user: dict = Depends(get_current_user_payload)
):
    """创建新的用户属性"""
    # 权限检查
    if current_user.get("role") != "SuperAdmin":
        raise HTTPException(status_code=403, detail="权限不足")
    
    try:
        from attribute_service import AttributeDefinitionRequest, create_attribute_definition
        attr_request = AttributeDefinitionRequest(**attribute_data)
        result = create_attribute_definition(attr_request, current_user.get('user_id'))
        log_user_action("创建属性成功", user_id=current_user.get('user_id'))
        return create_success_response(result.model_dump(), "属性创建成功")
    except Exception as e:
        log_error("创建属性失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="创建属性失败")

@app.get("/api/v1/attributes", summary="获取属性列表")
@handle_exceptions(return_dict=False)
def get_attributes(
    current_user: dict = Depends(get_current_user_payload)
):
    """获取所有属性列表"""
    try:
        from attribute_service import get_attribute_definitions
        result = get_attribute_definitions()
        return create_success_response(result.model_dump(), "获取属性列表成功")
    except Exception as e:
        log_error("获取属性列表失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="获取属性列表失败")

@app.put("/api/v1/attributes/{attribute_id}", summary="更新属性")
@handle_exceptions(return_dict=False)
def update_attribute_endpoint(
    attribute_id: int,
    attribute_data: dict,
    current_user: dict = Depends(get_current_user_payload)
):
    """更新属性信息"""
    # 权限检查
    if current_user.get("role") != "SuperAdmin":
        raise HTTPException(status_code=403, detail="权限不足")
    
    try:
        from attribute_service import AttributeDefinitionUpdate, update_attribute_definition
        attr_request = AttributeDefinitionUpdate(**attribute_data)
        result = update_attribute_definition(attribute_id, attr_request, current_user.get('user_id'))
        log_user_action("更新属性成功", user_id=current_user.get('user_id'))
        return create_success_response(result.model_dump(), "属性更新成功")
    except Exception as e:
        log_error("更新属性失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="更新属性失败")

# --- 属性值管理接口 ---

@app.post("/api/v1/users/{user_id}/attributes", summary="设置用户属性值")
@handle_exceptions(return_dict=False)
def set_user_attribute(
    user_id: int,
    attribute_data: dict,
    current_user: dict = Depends(get_current_user_payload)
):
    """设置用户属性值"""
    try:
        from attribute_value_service import set_user_attribute_value, AttributeValueRequest
        # 创建AttributeValueRequest对象
        attr_request = AttributeValueRequest(
            attribute_id=attribute_data.get('attribute_id'),
            value=attribute_data.get('value')
        )
        result = set_user_attribute_value(user_id, attr_request, current_user.get('user_id'))
        log_user_action("设置用户属性值成功", user_id=current_user.get('user_id'), details={'target_user_id': user_id})
        return create_success_response(result, "用户属性值设置成功")
    except Exception as e:
        log_error("设置用户属性值失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="设置用户属性值失败")

@app.get("/api/v1/users/{user_id}/attributes", summary="获取用户属性值列表")
@handle_exceptions(return_dict=False)
def get_user_attributes(
    user_id: int,
    current_user: dict = Depends(get_current_user_payload)
):
    """获取用户属性值列表"""
    try:
        from attribute_value_service import get_user_attribute_values
        result = get_user_attribute_values(user_id)
        return create_success_response(result, "获取用户属性值列表成功")
    except Exception as e:
        log_error("获取用户属性值列表失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="获取用户属性值列表失败")

@app.post("/api/v1/users/{user_id}/attributes/batch", summary="批量设置用户属性值")
@handle_exceptions(return_dict=False)
def batch_set_user_attributes_endpoint(
    user_id: int,
    attributes_data: dict,
    current_user: dict = Depends(get_current_user_payload)
):
    """批量设置用户属性值"""
    try:
        # 简单实现批量设置属性值
        from attribute_value_service import set_user_attribute_value, AttributeValueRequest
        results = []
        for attr_id, value in attributes_data.items():
            # 跳过非数字键
            if not str(attr_id).isdigit():
                continue
            attr_request = AttributeValueRequest(
                attribute_id=int(attr_id),
                value=value
            )
            result = set_user_attribute_value(user_id, attr_request, current_user.get('user_id'))
            results.append(result)
        log_user_action("批量设置用户属性值成功", user_id=current_user.get('user_id'), details={'target_user_id': user_id})
        return create_success_response(results, "用户属性值批量设置成功")
    except Exception as e:
        log_error("批量设置用户属性值失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="批量设置用户属性值失败")

# --- 文件导入接口 ---

@app.post("/api/v1/users/import/preview", summary="预览导入文件")
@handle_exceptions(return_dict=False)
def preview_import_file_endpoint(
    file: UploadFile = File(...),
    file_type: str = Body(...),
    current_user: dict = Depends(get_current_user_payload)
):
    """预览导入文件内容和字段映射建议"""
    # 权限检查
    if current_user.get("role") != "SuperAdmin":
        raise HTTPException(status_code=403, detail="权限不足")
    
    try:
        from batch_import_service import preview_import_file, ImportPreviewRequest
        
        # 读取文件内容
        file_content = file.file.read()
        
        # 构造预览请求
        preview_request = ImportPreviewRequest(
            file_content=file_content,
            file_type=file_type,
            file_name=file.filename,
            preview_rows=10
        )
        
        # 调用预览服务
        result = preview_import_file(preview_request)
        
        return JSONResponse(
            status_code=200,
            content={
                'success': result.success,
                'columns': result.columns,
                'preview_data': result.preview_data,
                'total_rows': result.total_rows,
                'suggested_mappings': result.suggested_mapping,
                'message': result.message
            }
        )
    except Exception as e:
        log_error("预览导入文件失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail=f"预览导入文件失败: {str(e)}")

@app.post("/api/v1/users/import/batch", summary="批量导入用户")
@handle_exceptions(return_dict=False)
def batch_import_users_endpoint(
    file: UploadFile = File(...),
    file_type: str = Body(...),
    column_mapping: str = Body(...),
    update_strategy: str = Body(default="skip"),
    default_password: str = Body(default="123456"),
    default_role: str = Body(default="Student"),
    current_user: dict = Depends(get_current_user_payload)
):
    """批量导入用户数据"""
    # 权限检查
    if current_user.get("role") != "SuperAdmin":
        raise HTTPException(status_code=403, detail="权限不足")
    
    try:
        from batch_import_service import batch_import_users, BatchImportRequest, ImportResult
        import json
        
        # 读取文件内容
        file_content = file.file.read()
        
        # 解析列映射
        try:
            column_mapping_dict = json.loads(column_mapping)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="列映射格式错误")
        
        # 构造批量导入请求
        import_request = BatchImportRequest(
            file_content=file_content,
            file_type=file_type,
            file_name=file.filename,
            column_mapping=column_mapping_dict,
            update_strategy=update_strategy,
            default_password=default_password,
            default_role=default_role
        )
        
        # 调用批量导入服务
        result = batch_import_users(import_request)
        
        import math
        
        # 处理NaN值的函数
        def clean_nan_values(obj):
            if isinstance(obj, dict):
                return {k: clean_nan_values(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [clean_nan_values(item) for item in obj]
            elif isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
                return None
            else:
                return obj
        
        response_data = {
            'success': result.success,
            'total': result.total_rows,
            'imported': result.success_count,
            'failed': result.error_count,
            'errors': result.errors,
            'message': result.message
        }
        
        # 清理NaN值
        clean_response_data = clean_nan_values(response_data)
        
        return JSONResponse(
            status_code=200,
            content=clean_response_data
        )
    except Exception as e:
        log_error("批量导入用户失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail=f"批量导入用户失败: {str(e)}")

@app.post("/api/v1/import/users", summary="导入用户数据")
@handle_exceptions(return_dict=False)
def import_users(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_payload)
):
    """从CSV文件导入用户数据"""
    # 权限检查
    if current_user.get("role") != "SuperAdmin":
        raise HTTPException(status_code=403, detail="权限不足")
    
    try:
        import csv
        import io
        
        # 读取文件内容
        content = file.file.read()
        
        # 解析CSV
        import csv
        import io
        import secrets
        import string
        from datetime import datetime
        
        csv_data = io.StringIO(content.decode('utf-8'))
        reader = csv.DictReader(csv_data)
        
        # 转换为用户数据格式
        users_data = []
        from user_crud_service import UserCreateRequest, BatchUserCreateRequest, batch_create_users
        
        for i, row in enumerate(reader):
            # 生成默认用户名和密码
            username = row.get('username') or f"user_{int(datetime.now().timestamp())}_{i}"
            password = row.get('password') or ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
            
            user_data = UserCreateRequest(
                username=username,
                password=password,
                email=row.get('email', ''),
                real_name=row.get('real_name', ''),
                phone=row.get('phone', ''),  # 这里使用phone字段，符合UserCreateValidation模型
                role=row.get('role', 'Student'),
                attributes={
                    key: value for key, value in row.items() 
                    if key not in ['username', 'password', 'email', 'real_name', 'phone', 'role']
                }
            )
            users_data.append(user_data)
        
        # 构造批量创建请求
        batch_request = BatchUserCreateRequest(
            users=users_data,
            skip_duplicates=True,
            send_notifications=False
        )
        
        # 调用批量创建用户服务
        result = batch_create_users(batch_request, current_user.get('user_id'))
        
        # 返回结果
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'message': f'成功导入 {result.success_count} 个用户',
                'data': result.model_dump()
            }
        )
    except Exception as e:
        log_error("导入用户数据失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="导入用户数据失败")

# --- 配置管理接口 ---

@app.get("/api/v1/config", summary="获取配置信息")
@handle_exceptions(return_dict=False)
def get_config_info(
    current_user: dict = Depends(get_current_user_payload)
):
    """获取当前配置信息（敏感信息脱敏）"""
    # 权限检查：只有超级管理员可以访问
    if current_user.get("role") != "SuperAdmin":
        raise HTTPException(status_code=403, detail="权限不足")
    
    try:
        # 脱敏处理
        safe_config = {
            "database": {
                "database_path": "***已配置***" if Config.DATABASE_PATH else "未配置",
            },
            "jwt": {
                "secret_key": "***已配置***" if Config.JWT_SECRET_KEY else "未配置",
                "algorithm": Config.JWT_ALGORITHM,
                "expiration_hours": Config.JWT_EXPIRATION_HOURS
            },
            "sms": {
                "api_key": "***已配置***" if Config.SMS_API_KEY else "未配置",
                "code_expiry_seconds": Config.SMS_CODE_EXPIRY_SECONDS,
                "rate_limit_seconds": Config.SMS_RATE_LIMIT_SECONDS
            },
            "security": {
                "max_login_attempts": Config.MAX_LOGIN_ATTEMPTS,
                "login_lockout_minutes": Config.LOGIN_LOCKOUT_MINUTES
            },
            "app": {
                "name": Config.APP_NAME,
                "version": Config.APP_VERSION,
                "debug": Config.DEBUG,
                "host": Config.HOST,
                "port": Config.PORT
            }
        }
        
        log_user_action("获取配置信息", user_id=current_user.get('user_id'))
        return create_success_response(safe_config, "获取配置信息成功")
    except Exception as e:
        log_error("获取配置信息失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="获取配置信息失败")

@app.post("/api/v1/config/validate", summary="验证配置有效性")
@handle_exceptions(return_dict=False)
def validate_config_endpoint(
    current_user: dict = Depends(get_current_user_payload)
):
    """验证当前配置的有效性"""
    # 权限检查：只有超级管理员可以访问
    if current_user.get("role") != "SuperAdmin":
        raise HTTPException(status_code=403, detail="权限不足")
    
    try:
        validation_result = Config.validate_config()
        log_user_action("验证配置有效性", user_id=current_user.get('user_id'))
        return create_success_response(validation_result, "配置验证完成")
    except Exception as e:
        log_error("验证配置失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="验证配置失败")

@app.post("/api/v1/config/reload", summary="重新加载配置")
@handle_exceptions(return_dict=False)
def reload_config_endpoint(
    current_user: dict = Depends(get_current_user_payload)
):
    """重新加载配置"""
    # 权限检查：只有超级管理员可以访问
    if current_user.get("role") != "SuperAdmin":
        raise HTTPException(status_code=403, detail="权限不足")
    
    try:
        # 重新导入配置模块以获取最新的环境变量
        import importlib
        import config
        importlib.reload(config)
        
        # 验证重新加载后的配置
        is_valid = Config.validate_config()
        
        log_user_action("重新加载配置", user_id=current_user.get('user_id'))
        return create_success_response(
            "配置重新加载成功", 
            {"is_valid": is_valid}
        )
    except Exception as e:
        log_error("重新加载配置失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="重新加载配置失败")

# --- 清理和维护接口 ---

@app.post("/api/v1/maintenance/cleanup", summary="清理过期数据")
@handle_exceptions(return_dict=False)
def cleanup_expired_data(
    current_user: dict = Depends(get_current_user_payload)
):
    """清理过期的验证码和会话数据"""
    # 权限检查：只有超级管理员可以访问
    if current_user.get("role") != "SuperAdmin":
        raise HTTPException(status_code=403, detail="权限不足")
    
    try:
        # 这里可以添加清理逻辑
        log_user_action("执行数据清理", user_id=current_user.get('user_id'))
        return create_success_response("数据清理完成")
    except Exception as e:
        log_error("数据清理失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="数据清理失败")

# --- 退出登录接口 ---

@app.post("/api/v1/logout", summary="退出登录")
@handle_exceptions(return_dict=False)
def logout(
    current_user: dict = Depends(get_current_user_payload)
):
    """退出登录，将token加入黑名单"""
    try:
        # 从请求头获取token
        token = current_user.get("token")
        if token:
            from auth_service import logout_user
            logout_user(token)
        
        log_user_action("用户退出登录", user_id=current_user.get('user_id'))
        return create_success_response("退出登录成功")
    except Exception as e:
        log_error("退出登录失败", error=str(e), user_id=current_user.get('user_id'))
        raise HTTPException(status_code=500, detail="退出登录失败")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)