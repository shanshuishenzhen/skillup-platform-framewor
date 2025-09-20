# batch_import_service.py
# 批量数据导入服务模块

import pandas as pd
import io
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field, validator
from datetime import datetime
import hashlib
import secrets
import re
import sqlite3
from pathlib import Path

from db_manager import get_db_connection
from exceptions import UserManagementException, ValidationException
from logger import log_info, log_warning, log_error
from validation_models import validate_phone, validate_email, sanitize_input
from auth_service import hash_password

# --- 请求/响应模型 ---

class BatchImportRequest(BaseModel):
    """批量导入请求模型"""
    file_content: bytes = Field(..., description="文件内容")
    file_name: str = Field(..., description="文件名")
    file_type: str = Field(..., description="文件类型 (excel/csv)")
    column_mapping: Dict[str, str] = Field(..., description="列映射配置")
    update_strategy: str = Field(default="skip", description="更新策略")
    update_existing: bool = Field(default=False, description="是否更新已存在的用户")
    default_password: Optional[str] = Field(default=None, description="默认密码")
    default_role: str = Field(default="Student", description="默认角色")
    
    @validator('file_type')
    def validate_file_type(cls, v):
        if v.lower() not in ['excel', 'csv', 'xlsx', 'xls']:
            raise ValueError("文件类型必须是 excel 或 csv")
        return v.lower()
    
    @validator('default_role')
    def validate_role(cls, v):
        valid_roles = ['SuperAdmin', 'Admin', 'Student', 'Teacher']
        if v not in valid_roles:
            raise ValueError(f"角色必须是 {valid_roles} 中的一个")
        return v

class ImportResult(BaseModel):
    """导入结果模型"""
    success: bool
    total_rows: int
    success_count: int
    error_count: int
    skip_count: int
    errors: List[Dict[str, Any]]
    warnings: List[Dict[str, Any]]
    message: str

class ImportPreviewRequest(BaseModel):
    """导入预览请求模型"""
    file_content: bytes = Field(..., description="文件内容")
    file_name: str = Field(..., description="文件名")
    file_type: str = Field(..., description="文件类型")
    preview_rows: int = Field(default=10, description="预览行数")
    
    @validator('file_type')
    def validate_file_type(cls, v):
        if v.lower() not in ['excel', 'csv', 'xlsx', 'xls']:
            raise ValueError("文件类型必须是 excel 或 csv")
        return v.lower()

class ImportPreviewResponse(BaseModel):
    """导入预览响应模型"""
    success: bool
    columns: List[str]
    preview_data: List[Dict[str, Any]]
    total_rows: int
    suggested_mapping: Dict[str, str]
    message: str

# --- 核心功能函数 ---

def preview_import_file(request: ImportPreviewRequest) -> ImportPreviewResponse:
    """预览导入文件
    
    Args:
        request: 预览请求
        
    Returns:
        预览结果
        
    Raises:
        UserManagementException: 预览失败
        ValidationException: 参数验证失败
    """
    try:
        # 读取文件内容
        df = _read_file_content(request.file_content, request.file_type, request.file_name)
        
        if df.empty:
            raise ValidationException("文件内容为空")
        
        # 获取列名
        columns = df.columns.tolist()
        
        # 获取预览数据
        preview_rows = min(request.preview_rows, len(df))
        preview_data = df.head(preview_rows).fillna('').to_dict('records')
        
        # 建议字段映射
        suggested_mapping = _suggest_column_mapping(columns)
        
        log_info("文件预览成功", 
                file_name=request.file_name,
                total_rows=len(df),
                columns_count=len(columns))
        
        return ImportPreviewResponse(
            success=True,
            columns=columns,
            preview_data=preview_data,
            total_rows=len(df),
            suggested_mapping=suggested_mapping,
            message=f"文件预览成功，共 {len(df)} 行数据"
        )
        
    except ValidationException:
        raise
    except Exception as e:
        log_error("文件预览失败", 
                 file_name=request.file_name,
                 error=str(e))
        raise UserManagementException(f"文件预览失败: {str(e)}")

def batch_import_users(request: BatchImportRequest) -> ImportResult:
    """批量导入用户
    
    Args:
        request: 导入请求
        
    Returns:
        导入结果
        
    Raises:
        UserManagementException: 导入失败
        ValidationException: 参数验证失败
    """
    try:
        # 读取文件内容
        df = _read_file_content(request.file_content, request.file_type, request.file_name)
        
        if df.empty:
            raise ValidationException("文件内容为空")
        
        # 初始化结果统计
        total_rows = len(df)
        success_count = 0
        error_count = 0
        skip_count = 0
        errors = []
        warnings = []
        
        # 生成默认密码
        default_password = request.default_password or _generate_default_password()
        default_password_hash = hash_password(default_password)
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 获取现有用户手机号
            cursor.execute("SELECT phone_number FROM users")
            existing_phones = {row[0] for row in cursor.fetchall()}
            
            # 获取属性定义
            attribute_definitions = _get_attribute_definitions(cursor)
            
            # 逐行处理数据
            for index, row in df.iterrows():
                try:
                    result = _process_import_row(
                        cursor, row, index + 1, existing_phones,
                        attribute_definitions, default_password_hash,
                        request.default_role, request.update_existing,
                        request.column_mapping
                    )
                    
                    if result['status'] == 'success':
                        success_count += 1
                        if result.get('phone_number'):
                            existing_phones.add(result['phone_number'])
                    elif result['status'] == 'skip':
                        skip_count += 1
                        warnings.append({
                            'row': index + 1,
                            'message': result['message']
                        })
                    else:
                        error_count += 1
                        errors.append({
                            'row': index + 1,
                            'message': result['message'],
                            'data': row.fillna('').to_dict()
                        })
                        
                except Exception as e:
                    error_count += 1
                    errors.append({
                        'row': index + 1,
                        'message': f"处理失败: {str(e)}",
                        'data': row.fillna('').to_dict()
                    })
            
            # 提交事务
            conn.commit()
        
        # 记录导入结果
        log_info("批量导入完成",
                file_name=request.file_name,
                total_rows=total_rows,
                success_count=success_count,
                error_count=error_count,
                skip_count=skip_count)
        
        return ImportResult(
            success=error_count == 0,
            total_rows=total_rows,
            success_count=success_count,
            error_count=error_count,
            skip_count=skip_count,
            errors=errors,
            warnings=warnings,
            message=f"导入完成: 成功 {success_count} 条，失败 {error_count} 条，跳过 {skip_count} 条"
        )
        
    except ValidationException:
        raise
    except Exception as e:
        log_error("批量导入失败",
                 file_name=request.file_name,
                 error=str(e))
        raise UserManagementException(f"批量导入失败: {str(e)}")

# --- 辅助函数 ---

def _read_file_content(file_content: bytes, file_type: str, file_name: str) -> pd.DataFrame:
    """读取文件内容"""
    try:
        file_stream = io.BytesIO(file_content)
        
        if file_type in ['excel', 'xlsx', 'xls']:
            df = pd.read_excel(file_stream, engine='openpyxl')
        elif file_type == 'csv':
            # 尝试不同编码
            encodings = ['utf-8', 'gbk', 'gb2312', 'utf-8-sig']
            df = None
            for encoding in encodings:
                try:
                    file_stream.seek(0)
                    df = pd.read_csv(file_stream, encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
            
            if df is None:
                raise ValueError("无法解析CSV文件编码")
        else:
            raise ValueError(f"不支持的文件类型: {file_type}")
        
        # 清理列名
        df.columns = [str(col).strip() for col in df.columns]
        
        return df
        
    except Exception as e:
        raise ValueError(f"文件读取失败: {str(e)}")

def _suggest_column_mapping(columns: List[str]) -> Dict[str, str]:
    """建议列映射"""
    mapping = {}
    
    # 常见字段映射规则
    field_patterns = {
        'phone_number': ['手机', '手机号', '电话', 'phone', 'mobile', '联系方式'],
        'name': ['姓名', '名字', 'name', '用户名', 'username'],
        'role': ['角色', 'role', '身份', '类型'],
        'password': ['密码', 'password', 'pwd'],
        'email': ['邮箱', '邮件', 'email', 'mail'],
        'status': ['状态', 'status', '账户状态']
    }
    
    for col in columns:
        col_lower = col.lower().strip()
        for field, patterns in field_patterns.items():
            if any(pattern in col_lower for pattern in patterns):
                mapping[col] = field
                break
    
    return mapping

def _get_attribute_definitions(cursor) -> Dict[str, Dict[str, Any]]:
    """获取属性定义"""
    cursor.execute("""
        SELECT id, name, display_name, attribute_type, 
               validation_rules, options, is_required
        FROM attribute_definitions
        WHERE is_active = 1
    """)
    
    definitions = {}
    for row in cursor.fetchall():
        id_val, attr_name, display_name, data_type, validation_rule, enum_values, is_required = row
        definitions[attr_name] = {
            'attr_id': id_val,
            'display_name': display_name,
            'data_type': data_type,
            'validation_rule': validation_rule,
            'enum_values': enum_values,
            'is_required': bool(is_required)
        }
    
    return definitions

def _process_import_row(cursor, row: pd.Series, row_num: int, existing_phones: set,
                       attribute_definitions: Dict, default_password_hash: str,
                       default_role: str, update_existing: bool, column_mapping: Dict[str, str] = None) -> Dict[str, Any]:
    """处理单行导入数据"""
    try:
        # 提取核心字段
        phone_number = _extract_phone_number(row, column_mapping)
        if not phone_number:
            return {'status': 'error', 'message': '手机号不能为空'}
        
        name = _extract_name(row, column_mapping)
        if not name:
            return {'status': 'error', 'message': '姓名不能为空'}
        
        role = _extract_role(row, default_role, column_mapping)
        password_hash = _extract_password(row, default_password_hash, column_mapping)
        
        # 检查是否已存在
        if phone_number in existing_phones:
            if not update_existing:
                return {'status': 'skip', 'message': f'用户已存在: {phone_number}'}
            
            # 更新现有用户
            cursor.execute("""
                UPDATE users SET name = ?, role = ?, password_hash = ?, updated_at = ?
                WHERE phone_number = ?
            """, (name, role, password_hash, datetime.now().isoformat(), phone_number))
            
            # 获取用户ID
            cursor.execute("SELECT id FROM users WHERE phone_number = ?", (phone_number,))
            user_id = cursor.fetchone()[0]
        else:
            # 创建新用户
            cursor.execute("""
                INSERT INTO users (phone_number, name, role, password_hash, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'Active', ?, ?)
            """, (phone_number, name, role, password_hash, 
                  datetime.now().isoformat(), datetime.now().isoformat()))
            
            user_id = cursor.lastrowid
        
        # 处理动态属性
        _process_dynamic_attributes(cursor, user_id, row, attribute_definitions)
        
        return {
            'status': 'success',
            'phone_number': phone_number,
            'user_id': user_id
        }
        
    except Exception as e:
        return {'status': 'error', 'message': str(e)}

def _extract_phone_number(row: pd.Series, column_mapping: Dict[str, str] = None) -> Optional[str]:
    """提取手机号"""
    # 优先使用映射配置
    if column_mapping:
        for col_name, field_name in column_mapping.items():
            if field_name == 'phone_number' and col_name in row.index and pd.notna(row[col_name]):
                phone = str(row[col_name]).strip()
                try:
                    return validate_phone(phone)
                except:
                    continue
    
    # 回退到默认字段匹配
    phone_fields = ['手机', '手机号', '电话', 'phone', 'mobile', 'phone_number']
    for field in phone_fields:
        if field in row.index and pd.notna(row[field]):
            phone = str(row[field]).strip()
            try:
                return validate_phone(phone)
            except:
                continue
    
    return None

def _extract_name(row: pd.Series, column_mapping: Dict[str, str] = None) -> Optional[str]:
    """提取姓名"""
    # 优先使用映射配置
    if column_mapping:
        for col_name, field_name in column_mapping.items():
            if field_name == 'name' and col_name in row.index and pd.notna(row[col_name]):
                name = str(row[col_name]).strip()
                if name:
                    return sanitize_input(name, 50)
    
    # 回退到默认字段匹配
    name_fields = ['姓名', '名字', 'name', '用户名', 'username']
    for field in name_fields:
        if field in row.index and pd.notna(row[field]):
            name = str(row[field]).strip()
            if name:
                return sanitize_input(name, 50)
    
    return None

def _extract_role(row: pd.Series, default_role: str, column_mapping: Dict[str, str] = None) -> str:
    """提取角色"""
    # 优先使用映射配置
    if column_mapping:
        for col_name, field_name in column_mapping.items():
            if field_name == 'role' and col_name in row.index and pd.notna(row[col_name]):
                role = str(row[col_name]).strip()
                if role in ['SuperAdmin', 'Admin', 'Student', 'Teacher']:
                    return role
    
    # 回退到默认字段匹配
    role_fields = ['角色', 'role', '身份', '类型']
    for field in role_fields:
        if field in row.index and pd.notna(row[field]):
            role = str(row[field]).strip()
            if role in ['SuperAdmin', 'Admin', 'Student', 'Teacher']:
                return role
    
    return default_role

def _extract_password(row: pd.Series, default_password_hash: str, column_mapping: Dict[str, str] = None) -> str:
    """提取密码"""
    # 优先使用映射配置
    if column_mapping:
        for col_name, field_name in column_mapping.items():
            if field_name == 'password' and col_name in row.index and pd.notna(row[col_name]):
                password = str(row[col_name]).strip()
                if password:
                    return hash_password(password)
    
    # 回退到默认字段匹配
    password_fields = ['密码', 'password', 'pwd']
    for field in password_fields:
        if field in row.index and pd.notna(row[field]):
            password = str(row[field]).strip()
            if password:
                return hash_password(password)
    
    return default_password_hash

def _process_dynamic_attributes(cursor, user_id: int, row: pd.Series, 
                               attribute_definitions: Dict):
    """处理动态属性"""
    for attr_name, attr_def in attribute_definitions.items():
        # 查找对应的列
        value = None
        for col_name in row.index:
            if (col_name == attr_name or 
                col_name == attr_def['display_name'] or
                attr_name.lower() in col_name.lower()):
                if pd.notna(row[col_name]):
                    value = str(row[col_name]).strip()
                    break
        
        if value:
            # 删除旧值
            cursor.execute("""
                DELETE FROM user_attribute_values 
                WHERE user_id = ? AND attr_id = ?
            """, (user_id, attr_def['attr_id']))
            
            # 插入新值
            cursor.execute("""
                INSERT INTO user_attribute_values (user_id, attr_id, attr_value, created_at)
                VALUES (?, ?, ?, ?)
            """, (user_id, attr_def['attr_id'], value, datetime.now().isoformat()))

def _generate_default_password() -> str:
    """生成默认密码"""
    return secrets.token_urlsafe(8)