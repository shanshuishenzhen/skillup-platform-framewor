# user_crud_service.py
# 用户CRUD操作服务模块

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, validator, EmailStr
from datetime import datetime
from enum import Enum
import hashlib
import secrets
import time

from db_manager import get_db_connection
from exceptions import UserManagementException, ValidationException
from logger import log_info, log_warning, log_error
from auth_service import hash_password
from validation_models import (
    UserCreateValidation, UserUpdateValidation, validate_id, 
    validate_email, validate_phone, sanitize_input
)

# --- 枚举定义 ---

class UserStatus(str, Enum):
    """用户状态枚举"""
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    SUSPENDED = "Suspended"
    DELETED = "Deleted"

class UserRole(str, Enum):
    """用户角色枚举"""
    SUPER_ADMIN = "SuperAdmin"
    ADMIN = "Admin"
    TEACHER = "Teacher"
    STUDENT = "Student"
    GUEST = "Guest"

# --- 数据模型 ---

class UserCreateRequest(UserCreateValidation):
    """用户创建请求模型（继承验证模型）"""
    pass

class UserUpdateRequest(UserUpdateValidation):
    """用户更新请求模型（继承验证模型）"""
    pass

class UserResponse(BaseModel):
    """用户响应模型"""
    id: int
    name: str
    phone_number: str
    email: Optional[str] = None
    role: str
    status: str
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    
    # 扩展信息
    attributes: Optional[Dict[str, Any]] = None

class BatchUserCreateRequest(BaseModel):
    """批量用户创建请求模型"""
    users: List[UserCreateRequest] = Field(..., min_items=1, max_items=100, description="用户列表")
    skip_duplicates: bool = Field(default=True, description="跳过重复用户")
    send_notifications: bool = Field(default=False, description="发送通知")

class BatchOperationResult(BaseModel):
    """批量操作结果模型"""
    success_count: int
    error_count: int
    total_count: int
    success_ids: List[int]
    errors: List[Dict[str, Any]]
    warnings: List[str]

# --- 核心CRUD函数 ---

def create_user(user_data: UserCreateRequest, creator_id: Optional[int] = None) -> UserResponse:
    """创建用户
    
    Args:
        user_data: 用户创建数据
        creator_id: 创建者ID
        
    Returns:
        创建的用户信息
        
    Raises:
        UserManagementException: 创建失败
        ValidationException: 数据验证失败
    """
    try:
        # 数据清理和验证
        name = sanitize_input(user_data.real_name, 50) if user_data.real_name else user_data.username
        phone_number = validate_phone(user_data.phone)
        email = validate_email(user_data.email) if user_data.email else None
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 检查手机号是否已存在
            cursor.execute("SELECT id FROM users WHERE phone_number = ?", (phone_number,))
            if cursor.fetchone():
                raise ValidationException(f"手机号 {phone_number} 已存在")
            
            # 检查邮箱是否已存在（如果提供）
            if email:
                cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
                if cursor.fetchone():
                    raise ValidationException(f"邮箱 {email} 已存在")
            
            # 生成密码（如果未提供）
            password = user_data.password
            if not password:
                # 生成随机密码
                password = generate_random_password()
                log_info("为用户生成随机密码", phone_number=phone_number)
            
            # 哈希密码
            password_hash = hash_password(password)
            
            # 插入用户记录
            now = datetime.now().isoformat()
            cursor.execute("""
                INSERT INTO users (name, phone_number, password_hash, email, role, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                name,
                phone_number,
                password_hash,
                email,
                user_data.role,
                user_data.status,
                now,
                now
            ))
            
            user_id = cursor.lastrowid
            
            # 插入用户属性（如果有）
            if user_data.attributes:
                insert_user_attributes(cursor, user_id, user_data.attributes)
            
            conn.commit()
            
            # 查询完整用户信息
            user = get_user_by_id_internal(cursor, user_id)
            
            log_info("用户创建成功", 
                    user_id=user_id,
                    phone_number=phone_number,
                    role=user_data.role,
                    creator_id=creator_id)
            
            return user
            
    except ValidationException:
        raise
    except Exception as e:
        log_error("用户创建失败", 
                 phone_number=user_data.phone,
                 error=str(e),
                 creator_id=creator_id)
        raise UserManagementException(f"用户创建失败: {str(e)}")

def update_user(user_id: int, user_data: UserUpdateRequest, updater_id: Optional[int] = None) -> UserResponse:
    """更新用户信息
    
    Args:
        user_id: 用户ID
        user_data: 更新数据
        updater_id: 更新者ID
        
    Returns:
        更新后的用户信息
        
    Raises:
        UserManagementException: 更新失败
        ValidationException: 数据验证失败
    """
    try:
        # 验证用户ID
        user_id = validate_id(user_id, "用户ID")
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 检查用户是否存在
            cursor.execute("SELECT id, phone_number FROM users WHERE id = ?", (user_id,))
            existing_user = cursor.fetchone()
            if not existing_user:
                raise ValidationException(f"用户ID {user_id} 不存在")
            
            # 构建更新字段
            update_fields = []
            update_values = []
            
            # 检查并添加更新字段
            if user_data.real_name is not None:
                name = sanitize_input(user_data.real_name, 50)
                update_fields.append("name = ?")
                update_values.append(name)
            
            if user_data.phone is not None:
                phone_number = validate_phone(user_data.phone)
                # 检查新手机号是否已被其他用户使用
                cursor.execute("SELECT id FROM users WHERE phone_number = ? AND id != ?", 
                             (phone_number, user_id))
                if cursor.fetchone():
                    raise ValidationException(f"手机号 {phone_number} 已被其他用户使用")
                
                update_fields.append("phone_number = ?")
                update_values.append(phone_number)
            
            if user_data.email is not None:
                email = validate_email(user_data.email) if user_data.email else None
                # 检查新邮箱是否已被其他用户使用
                cursor.execute("SELECT id FROM users WHERE email = ? AND id != ?", 
                             (email, user_id))
                if cursor.fetchone():
                    raise ValidationException(f"邮箱 {email} 已被其他用户使用")
                
                update_fields.append("email = ?")
                update_values.append(email)
            
            if user_data.role is not None:
                update_fields.append("role = ?")
                update_values.append(user_data.role)
            
            # status字段暂时不支持通过API更新，如需要可在管理后台操作
            # if hasattr(user_data, 'status') and user_data.status is not None:
            #     update_fields.append("status = ?")
            #     update_values.append(user_data.status)
            
            if user_data.new_password is not None:
                password_hash = hash_password(user_data.new_password)
                update_fields.append("password_hash = ?")
                update_values.append(password_hash)
            
            # 添加更新时间
            update_fields.append("updated_at = ?")
            update_values.append(datetime.now().isoformat())
            
            # 执行更新
            if update_fields:
                update_sql = f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?"
                update_values.append(user_id)
                cursor.execute(update_sql, update_values)
            
            # 更新用户属性
            if user_data.attributes is not None:
                # 删除现有属性
                cursor.execute("DELETE FROM user_attribute_values WHERE user_id = ?", (user_id,))
                # 插入新属性
                if user_data.attributes:
                    insert_user_attributes(cursor, user_id, user_data.attributes)
            
            conn.commit()
            
            # 查询更新后的用户信息
            user = get_user_by_id_internal(cursor, user_id)
            
            log_info("用户更新成功", 
                    user_id=user_id,
                    updated_fields=list(user_data.model_dump(exclude_none=True).keys()),
                    updater_id=updater_id)
            
            return user
            
    except ValidationException:
        raise
    except Exception as e:
        log_error("用户更新失败", 
                 user_id=user_id,
                 error=str(e),
                 updater_id=updater_id)
        raise UserManagementException(f"用户更新失败: {str(e)}")

def delete_user(user_id: int, soft_delete: bool = True, deleter_id: Optional[int] = None) -> bool:
    """删除用户
    
    Args:
        user_id: 用户ID
        soft_delete: 是否软删除（默认True）
        deleter_id: 删除者ID
        
    Returns:
        删除是否成功
        
    Raises:
        UserManagementException: 删除失败
        ValidationException: 数据验证失败
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 检查用户是否存在
            cursor.execute("SELECT id, name, role FROM users WHERE id = ?", (user_id,))
            user = cursor.fetchone()
            if not user:
                raise ValidationException(f"用户ID {user_id} 不存在")
            
            # 检查是否为超级管理员（不能删除）
            if user[2] == 'SuperAdmin':
                raise ValidationException("不能删除超级管理员账户")
            
            if soft_delete:
                # 软删除：更新状态为已删除
                cursor.execute("""
                    UPDATE users 
                    SET status = 'Deleted', updated_at = ?
                    WHERE id = ?
                """, (datetime.now().isoformat(), user_id))
                
                log_info("用户软删除成功", 
                        user_id=user_id,
                        user_name=user[1],
                        deleter_id=deleter_id)
            else:
                # 硬删除：物理删除记录
                # 先删除相关的属性值
                cursor.execute("DELETE FROM user_attribute_values WHERE user_id = ?", (user_id,))
                # 删除用户记录
                cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
                
                log_warning("用户硬删除成功", 
                           user_id=user_id,
                           user_name=user[1],
                           deleter_id=deleter_id)
            
            conn.commit()
            return True
            
    except ValidationException:
        raise
    except Exception as e:
        log_error("用户删除失败", 
                 user_id=user_id,
                 error=str(e),
                 deleter_id=deleter_id)
        raise UserManagementException(f"用户删除失败: {str(e)}")

def batch_create_users(batch_data: BatchUserCreateRequest, creator_id: Optional[int] = None) -> BatchOperationResult:
    """批量创建用户
    
    Args:
        batch_data: 批量创建数据
        creator_id: 创建者ID
        
    Returns:
        批量操作结果
        
    Raises:
        UserManagementException: 批量创建失败
    """
    success_count = 0
    error_count = 0
    success_ids = []
    errors = []
    warnings = []
    
    try:
        for i, user_data in enumerate(batch_data.users):
            try:
                # 如果跳过重复用户，先检查是否存在
                if batch_data.skip_duplicates:
                    with get_db_connection() as conn:
                        cursor = conn.cursor()
                        # 使用phone字段而不是phone_number
                        phone_to_check = getattr(user_data, 'phone', None)
                        if phone_to_check:
                            cursor.execute("SELECT id FROM users WHERE phone_number = ?", (phone_to_check,))
                            if cursor.fetchone():
                                warnings.append(f"第{i+1}行：手机号 {phone_to_check} 已存在，已跳过")
                                continue
                
                # 创建用户
                user = create_user(user_data, creator_id)
                success_count += 1
                success_ids.append(user.id)
                
            except Exception as e:
                error_count += 1
                errors.append({
                    'row': i + 1,
                    'phone_number': getattr(user_data, 'phone', 'N/A'),
                    'error': str(e)
                })
        
        result = BatchOperationResult(
            success_count=success_count,
            error_count=error_count,
            total_count=len(batch_data.users),
            success_ids=success_ids,
            errors=errors,
            warnings=warnings
        )
        
        log_info("批量用户创建完成", 
                success_count=success_count,
                error_count=error_count,
                total_count=len(batch_data.users),
                creator_id=creator_id)
        
        return result
        
    except Exception as e:
        log_error("批量用户创建失败", error=str(e), creator_id=creator_id)
        raise UserManagementException(f"批量用户创建失败: {str(e)}")

# --- 辅助函数 ---

def get_user_by_id_internal(cursor, user_id: int) -> UserResponse:
    """内部使用的用户查询函数"""
    cursor.execute("""
        SELECT id, name, phone_number, email, role, status, 
               created_at, updated_at
        FROM users 
        WHERE id = ?
    """, (user_id,))
    
    row = cursor.fetchone()
    if not row:
        raise ValidationException(f"用户ID {user_id} 不存在")
    
    # 查询用户属性
    cursor.execute("""
        SELECT ad.name, uav.attr_value
        FROM user_attribute_values uav
        JOIN attribute_definitions ad ON uav.attr_id = ad.id
        WHERE uav.user_id = ?
    """, (user_id,))
    
    attributes = {}
    for attr_row in cursor.fetchall():
        attributes[attr_row[0]] = attr_row[1]
    
    return UserResponse(
        id=row[0],
        name=row[1],
        phone_number=row[2],
        email=row[3],
        role=row[4],
        status=row[5],
        created_at=datetime.fromisoformat(row[6]) if row[6] else None,
        updated_at=datetime.fromisoformat(row[7]) if row[7] else None,
        last_login_at=None,
        attributes=attributes if attributes else None
    )

def insert_user_attributes(cursor, user_id: int, attributes: Dict[str, Any]):
    """插入用户属性"""
    for attr_name, attr_value in attributes.items():
        # 查找或创建属性定义
        cursor.execute("SELECT id FROM attribute_definitions WHERE name = ?", (attr_name,))
        attr_def = cursor.fetchone()
        
        if not attr_def:
            # 创建新的属性定义
            cursor.execute("""
                INSERT INTO attribute_definitions (name, data_type, is_required, created_at)
                VALUES (?, 'string', 0, ?)
            """, (attr_name, datetime.now().isoformat()))
            attr_id = cursor.lastrowid
        else:
            attr_id = attr_def[0]
        
        # 插入属性值
        cursor.execute("""
            INSERT INTO user_attribute_values (user_id, attr_id, attr_value, created_at)
            VALUES (?, ?, ?, ?)
        """, (user_id, attr_id, str(attr_value), int(time.time())))

def generate_random_password(length: int = 8) -> str:
    """生成随机密码"""
    import string
    import random
    
    # 确保包含字母和数字
    chars = string.ascii_letters + string.digits
    password = ''.join(random.choice(chars) for _ in range(length))
    
    # 确保至少包含一个字母和一个数字
    if not any(c.isalpha() for c in password):
        password = password[:-1] + random.choice(string.ascii_letters)
    if not any(c.isdigit() for c in password):
        password = password[:-1] + random.choice(string.digits)
    
    return password

def validate_user_permissions(user_role: str, target_user_role: str, operation: str) -> bool:
    """验证用户操作权限
    
    Args:
        user_role: 操作者角色
        target_user_role: 目标用户角色
        operation: 操作类型 (create, update, delete)
        
    Returns:
        是否有权限
    """
    # 角色权限级别
    role_levels = {
        'SuperAdmin': 5,
        'Admin': 4,
        'Teacher': 3,
        'Student': 2,
        'Guest': 1
    }
    
    user_level = role_levels.get(user_role, 0)
    target_level = role_levels.get(target_user_role, 0)
    
    # 超级管理员可以操作所有用户
    if user_role == 'SuperAdmin':
        return True
    
    # 管理员可以操作除超级管理员外的所有用户
    if user_role == 'Admin' and target_user_role != 'SuperAdmin':
        return True
    
    # 其他角色只能操作级别更低的用户
    if operation in ['create', 'update', 'delete']:
        return user_level > target_level
    
    return False