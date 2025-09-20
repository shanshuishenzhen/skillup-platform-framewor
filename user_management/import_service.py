# import_service.py
# 批量数据导入服务模块

import pandas as pd
import io
from typing import List, Dict, Any, Tuple
from pydantic import BaseModel, Field, validator
import re
from datetime import datetime

from db_manager import get_db_connection
from auth_service import hash_password, create_new_user
from exceptions import ValidationException, UserManagementException
from logger import log_info, log_warning, log_error
from validation_models import (
    FileUploadValidation, BatchImportValidation,
    validate_email, validate_phone, sanitize_input
)

# --- 数据验证模型 ---

class UserImportRecord(BaseModel):
    """用户导入记录验证模型"""
    name: str = Field(..., min_length=2, max_length=50, description="用户姓名")
    phone_number: str = Field(..., description="手机号码")
    role: str = Field(default="Student", description="用户角色")
    status: str = Field(default="Active", description="用户状态")
    
    @validator('phone_number')
    def validate_phone(cls, v):
        """验证手机号格式"""
        if not re.match(r'^1[3-9]\d{9}$', str(v)):
            raise ValueError('手机号格式不正确')
        return str(v)
    
    @validator('role')
    def validate_role(cls, v):
        """验证角色类型"""
        valid_roles = ['Student', 'Teacher', 'Admin', 'SuperAdmin']
        if v not in valid_roles:
            raise ValueError(f'角色必须是以下之一: {", ".join(valid_roles)}')
        return v
    
    @validator('status')
    def validate_status(cls, v):
        """验证状态类型"""
        valid_statuses = ['Active', 'Inactive']
        if v not in valid_statuses:
            raise ValueError(f'状态必须是以下之一: {", ".join(valid_statuses)}')
        return v

# 文件上传请求模型（继承验证模型）
class FileUploadRequest(FileUploadValidation):
    pass

# 批量导入请求模型（继承验证模型）
class BatchImportRequest(BatchImportValidation):
    pass

class ImportResult(BaseModel):
    """导入结果模型"""
    success: bool
    total_records: int
    success_count: int
    error_count: int
    duplicate_count: int
    errors: List[Dict[str, Any]]
    duplicates: List[Dict[str, Any]]
    message: str

# --- 文件解析函数 ---

def parse_excel_file(file_bytes: bytes) -> pd.DataFrame:
    """解析Excel文件
    
    Args:
        file_bytes: Excel文件的字节数据
        
    Returns:
        解析后的DataFrame
        
    Raises:
        ValidationException: 文件解析失败
    """
    try:
        # 使用BytesIO创建文件对象
        file_obj = io.BytesIO(file_bytes)
        
        # 尝试读取Excel文件
        df = pd.read_excel(file_obj, engine='openpyxl')
        
        log_info("Excel文件解析成功", rows=len(df), columns=list(df.columns))
        return df
        
    except Exception as e:
        log_error("Excel文件解析失败", error=str(e))
        raise ValidationException(f"Excel文件解析失败: {str(e)}")

def parse_csv_file(file_bytes: bytes) -> pd.DataFrame:
    """解析CSV文件
    
    Args:
        file_bytes: CSV文件的字节数据
        
    Returns:
        解析后的DataFrame
        
    Raises:
        ValidationException: 文件解析失败
    """
    try:
        # 使用BytesIO创建文件对象
        file_obj = io.BytesIO(file_bytes)
        
        # 尝试不同的编码格式
        encodings = ['utf-8', 'gbk', 'gb2312', 'utf-8-sig']
        df = None
        
        for encoding in encodings:
            try:
                file_obj.seek(0)  # 重置文件指针
                df = pd.read_csv(file_obj, encoding=encoding)
                log_info("CSV文件解析成功", encoding=encoding, rows=len(df), columns=list(df.columns))
                break
            except UnicodeDecodeError:
                continue
        
        if df is None:
            raise ValidationException("无法解析CSV文件，请检查文件编码")
            
        return df
        
    except ValidationException:
        raise
    except Exception as e:
        log_error("CSV文件解析失败", error=str(e))
        raise ValidationException(f"CSV文件解析失败: {str(e)}")

# --- 数据处理函数 ---

def normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """标准化DataFrame列名和数据
    
    Args:
        df: 原始DataFrame
        
    Returns:
        标准化后的DataFrame
    """
    # 列名映射
    column_mapping = {
        '姓名': 'name',
        '用户名': 'name',
        '名称': 'name',
        '手机号': 'phone_number',
        '手机': 'phone_number',
        '电话': 'phone_number',
        '角色': 'role',
        '用户角色': 'role',
        '状态': 'status',
        '用户状态': 'status'
    }
    
    # 重命名列
    df_normalized = df.rename(columns=column_mapping)
    
    # 确保必需的列存在
    required_columns = ['name', 'phone_number']
    missing_columns = [col for col in required_columns if col not in df_normalized.columns]
    
    if missing_columns:
        raise ValidationException(f"缺少必需的列: {', '.join(missing_columns)}")
    
    # 填充默认值
    if 'role' not in df_normalized.columns:
        df_normalized['role'] = 'Student'
    if 'status' not in df_normalized.columns:
        df_normalized['status'] = 'Active'
    
    # 清理数据
    df_normalized['name'] = df_normalized['name'].astype(str).str.strip()
    df_normalized['phone_number'] = df_normalized['phone_number'].astype(str).str.strip()
    df_normalized['role'] = df_normalized['role'].astype(str).str.strip()
    df_normalized['status'] = df_normalized['status'].astype(str).str.strip()
    
    # 移除空行
    df_normalized = df_normalized.dropna(subset=['name', 'phone_number'])
    
    log_info("数据标准化完成", rows=len(df_normalized))
    return df_normalized

def validate_import_data(df: pd.DataFrame) -> Tuple[List[UserImportRecord], List[Dict[str, Any]]]:
    """验证导入数据
    
    Args:
        df: 待验证的DataFrame
        
    Returns:
        (有效记录列表, 错误记录列表)
    """
    from validation_service import clean_and_validate_data, ValidationLevel
    
    # 转换DataFrame为字典列表
    records = df.to_dict('records')
    
    valid_records = []
    error_records = []
    
    # 数据清理和基础验证
    for i, record in enumerate(records):
        try:
            # 清理和验证每条记录
            cleaned_record = {}
            
            # 验证必填字段
            if 'name' not in record or not record['name']:
                error_records.append({
                    'row': i + 2,
                    'data': record,
                    'error': '姓名不能为空'
                })
                continue
            
            if 'phone_number' not in record or not record['phone_number']:
                error_records.append({
                    'row': i + 2,
                    'data': record,
                    'error': '手机号不能为空'
                })
                continue
            
            # 清理和验证数据
            cleaned_record['name'] = sanitize_input(record['name'], 50)
            cleaned_record['phone_number'] = validate_phone(record['phone_number'])
            
            # 其他字段处理
            cleaned_record['role'] = record.get('role', 'Student')
            cleaned_record['status'] = record.get('status', 'Active')
            
            # 创建验证记录
            user_record = UserImportRecord(
                name=cleaned_record['name'],
                phone_number=cleaned_record['phone_number'],
                role=cleaned_record['role'],
                status=cleaned_record['status']
            )
            valid_records.append(user_record)
            
        except ValueError as ve:
            error_records.append({
                'row': i + 2,
                'data': record,
                'error': str(ve)
            })
        except Exception as e:
            error_records.append({
                'row': i + 2,
                'data': record,
                'error': f'数据处理错误 - {str(e)}'
            })
    
    # 使用validation_service进行进一步验证
    if valid_records:
        try:
            cleaning_report = clean_and_validate_data([r.dict() for r in valid_records], ValidationLevel.MODERATE)
            log_info("数据验证完成", 
                    total=len(records),
                    valid=len(valid_records), 
                    errors=len(error_records),
                    cleaned=cleaning_report.cleaned_records)
        except Exception as e:
            log_warning("验证服务调用失败", error=str(e))
    
    return valid_records, error_records

def check_duplicates(records: List[UserImportRecord]) -> Tuple[List[UserImportRecord], List[Dict[str, Any]]]:
    """检查重复数据
    
    Args:
        records: 待检查的记录列表
        
    Returns:
        (去重后的记录列表, 重复记录列表)
    """
    seen_phones = set()
    unique_records = []
    duplicate_records = []
    
    # 检查文件内重复
    for i, record in enumerate(records):
        if record.phone_number in seen_phones:
            duplicate_records.append({
                'row': i + 2,
                'phone_number': record.phone_number,
                'name': record.name,
                'reason': '文件内重复'
            })
        else:
            seen_phones.add(record.phone_number)
            unique_records.append(record)
    
    # 检查数据库中已存在的用户
    existing_duplicates = []
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            for record in unique_records[:]:
                cursor.execute("SELECT id FROM users WHERE phone_number = ?", (record.phone_number,))
                if cursor.fetchone():
                    existing_duplicates.append(record)
                    duplicate_records.append({
                        'phone_number': record.phone_number,
                        'name': record.name,
                        'reason': '数据库中已存在'
                    })
            
            # 从unique_records中移除已存在的记录
            unique_records = [r for r in unique_records if r not in existing_duplicates]
            
    except Exception as e:
        log_error("检查重复数据时发生错误", error=str(e))
        raise UserManagementException("检查重复数据失败")
    
    log_info("重复检查完成", unique=len(unique_records), duplicates=len(duplicate_records))
    return unique_records, duplicate_records

# --- 批量导入函数 ---

def batch_import_users(records: List[UserImportRecord]) -> Tuple[int, List[Dict[str, Any]]]:
    """批量导入用户
    
    Args:
        records: 待导入的用户记录列表
        
    Returns:
        (成功导入数量, 导入错误列表)
    """
    success_count = 0
    import_errors = []
    
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            for record in records:
                try:
                    # 使用现有的用户创建函数
                    user_id = create_new_user(
                        phone_number=record.phone_number,
                        name=record.name,
                        role=record.role,
                        status=record.status
                    )
                    
                    if user_id:
                        success_count += 1
                        log_info("用户导入成功", user_id=user_id, phone=record.phone_number)
                    else:
                        import_errors.append({
                            'phone_number': record.phone_number,
                            'name': record.name,
                            'error': '用户创建失败'
                        })
                        
                except Exception as e:
                    import_errors.append({
                        'phone_number': record.phone_number,
                        'name': record.name,
                        'error': str(e)
                    })
                    log_error("单个用户导入失败", phone=record.phone_number, error=str(e))
            
    except Exception as e:
        log_error("批量导入用户失败", error=str(e))
        raise UserManagementException(f"批量导入失败: {str(e)}")
    
    log_info("批量导入完成", success=success_count, errors=len(import_errors))
    return success_count, import_errors

# --- 主要导入处理函数 ---

def process_file_import(file_bytes: bytes, filename: str) -> ImportResult:
    """处理文件导入的主要函数
    
    Args:
        file_bytes: 文件字节数据
        filename: 文件名
        
    Returns:
        导入结果
        
    Raises:
        ValidationException: 文件格式不支持或处理失败
        UserManagementException: 导入过程中发生错误
    """
    log_info("开始处理文件导入", filename=filename)
    
    try:
        # 1. 根据文件扩展名选择解析方法
        if filename.lower().endswith(('.xlsx', '.xls')):
            df = parse_excel_file(file_bytes)
        elif filename.lower().endswith('.csv'):
            df = parse_csv_file(file_bytes)
        else:
            raise ValidationException("不支持的文件格式，请上传Excel(.xlsx/.xls)或CSV文件")
        
        # 2. 标准化数据
        df_normalized = normalize_dataframe(df)
        total_records = len(df_normalized)
        
        # 3. 验证数据
        valid_records, validation_errors = validate_import_data(df_normalized)
        
        # 4. 检查重复
        unique_records, duplicates = check_duplicates(valid_records)
        
        # 5. 批量导入
        success_count, import_errors = batch_import_users(unique_records)
        
        # 6. 生成结果报告
        all_errors = validation_errors + import_errors
        error_count = len(all_errors)
        duplicate_count = len(duplicates)
        
        result = ImportResult(
            success=error_count == 0,
            total_records=total_records,
            success_count=success_count,
            error_count=error_count,
            duplicate_count=duplicate_count,
            errors=all_errors,
            duplicates=duplicates,
            message=f"导入完成：成功{success_count}条，错误{error_count}条，重复{duplicate_count}条"
        )
        
        log_info("文件导入处理完成", 
                filename=filename,
                total=total_records,
                success=success_count,
                errors=error_count,
                duplicates=duplicate_count)
        
        return result
        
    except (ValidationException, UserManagementException):
        raise
    except Exception as e:
        log_error("文件导入处理异常", filename=filename, error=str(e))
        raise UserManagementException(f"文件导入处理失败: {str(e)}")