# validation_service.py
# 数据校验和清洗服务模块

from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field, validator
import re
from datetime import datetime
from enum import Enum

from db_manager import get_db_connection
from exceptions import ValidationException
from logger import log_info, log_warning, log_error

# --- 枚举定义 ---

class UserRole(str, Enum):
    """用户角色枚举"""
    STUDENT = "Student"
    TEACHER = "Teacher"
    ADMIN = "Admin"
    SUPER_ADMIN = "SuperAdmin"

class UserStatus(str, Enum):
    """用户状态枚举"""
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    SUSPENDED = "Suspended"
    DELETED = "Deleted"

class ValidationLevel(str, Enum):
    """验证级别枚举"""
    STRICT = "strict"      # 严格验证，任何错误都拒绝
    MODERATE = "moderate"  # 中等验证，允许部分可修复的错误
    LOOSE = "loose"       # 宽松验证，尽可能修复数据

# --- 验证模型 ---

class UserValidationModel(BaseModel):
    """用户数据验证模型"""
    name: str = Field(..., min_length=2, max_length=50, description="用户姓名")
    phone_number: str = Field(..., description="手机号码")
    role: UserRole = Field(default=UserRole.STUDENT, description="用户角色")
    status: UserStatus = Field(default=UserStatus.ACTIVE, description="用户状态")
    email: Optional[str] = Field(None, description="邮箱地址")
    id_card: Optional[str] = Field(None, description="身份证号")
    
    @validator('name')
    def validate_name(cls, v):
        """验证姓名"""
        if not v or not v.strip():
            raise ValueError('姓名不能为空')
        
        # 移除多余空格
        v = re.sub(r'\s+', ' ', v.strip())
        
        # 检查是否包含特殊字符
        if re.search(r'[^\u4e00-\u9fa5a-zA-Z\s·]', v):
            raise ValueError('姓名只能包含中文、英文字母、空格和·')
        
        return v
    
    @validator('phone_number')
    def validate_phone(cls, v):
        """验证手机号"""
        # 清理手机号格式
        phone = re.sub(r'[^\d]', '', str(v))
        
        # 处理国际格式
        if phone.startswith('86') and len(phone) == 13:
            phone = phone[2:]
        elif phone.startswith('+86') and len(phone) == 14:
            phone = phone[3:]
        
        # 验证手机号格式
        if not re.match(r'^1[3-9]\d{9}$', phone):
            raise ValueError('手机号格式不正确，请输入有效的11位手机号')
        
        return phone
    
    @validator('email')
    def validate_email(cls, v):
        """验证邮箱"""
        if v is None or v == '':
            return None
        
        v = v.strip().lower()
        
        # 邮箱格式验证
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError('邮箱格式不正确')
        
        return v
    
    @validator('id_card')
    def validate_id_card(cls, v):
        """验证身份证号"""
        if v is None or v == '':
            return None
        
        # 清理身份证号格式
        id_card = re.sub(r'[^\dXx]', '', str(v)).upper()
        
        # 验证身份证号格式
        if not re.match(r'^\d{17}[\dX]$', id_card):
            raise ValueError('身份证号格式不正确')
        
        # 验证校验位
        if not _validate_id_card_checksum(id_card):
            raise ValueError('身份证号校验位不正确')
        
        return id_card

class ValidationResult(BaseModel):
    """验证结果模型"""
    is_valid: bool
    original_data: Dict[str, Any]
    cleaned_data: Optional[Dict[str, Any]]
    errors: List[str]
    warnings: List[str]
    suggestions: List[str]

class DataCleaningReport(BaseModel):
    """数据清洗报告模型"""
    total_records: int
    valid_records: int
    invalid_records: int
    cleaned_records: int
    duplicate_records: int
    validation_results: List[ValidationResult]
    duplicate_groups: List[Dict[str, Any]]
    summary: str

# --- 辅助函数 ---

def _validate_id_card_checksum(id_card: str) -> bool:
    """验证身份证号校验位
    
    Args:
        id_card: 18位身份证号
        
    Returns:
        校验位是否正确
    """
    if len(id_card) != 18:
        return False
    
    # 权重系数
    weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    # 校验码对照表
    check_codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
    
    try:
        # 计算校验位
        sum_val = sum(int(id_card[i]) * weights[i] for i in range(17))
        check_index = sum_val % 11
        expected_check = check_codes[check_index]
        
        return id_card[17] == expected_check
    except (ValueError, IndexError):
        return False

def _normalize_text(text: str) -> str:
    """标准化文本
    
    Args:
        text: 原始文本
        
    Returns:
        标准化后的文本
    """
    if not text:
        return ''
    
    # 转换为字符串并去除首尾空格
    text = str(text).strip()
    
    # 替换全角字符为半角字符
    text = text.replace('（', '(').replace('）', ')')
    text = text.replace('【', '[').replace('】', ']')
    text = text.replace('，', ',').replace('。', '.')
    text = text.replace('：', ':').replace('；', ';')
    
    # 合并多个空格为单个空格
    text = re.sub(r'\s+', ' ', text)
    
    return text

# --- 核心验证函数 ---

def validate_single_record(
    data: Dict[str, Any], 
    validation_level: ValidationLevel = ValidationLevel.MODERATE
) -> ValidationResult:
    """验证单条记录
    
    Args:
        data: 待验证的数据字典
        validation_level: 验证级别
        
    Returns:
        验证结果
    """
    errors = []
    warnings = []
    suggestions = []
    cleaned_data = data.copy()
    
    try:
        # 数据预处理
        for key, value in cleaned_data.items():
            if isinstance(value, str):
                cleaned_data[key] = _normalize_text(value)
        
        # 使用Pydantic模型验证
        validated_user = UserValidationModel(**cleaned_data)
        cleaned_data = validated_user.dict(exclude_none=True)
        
        log_info("单条记录验证成功", phone=cleaned_data.get('phone_number'))
        
        return ValidationResult(
            is_valid=True,
            original_data=data,
            cleaned_data=cleaned_data,
            errors=errors,
            warnings=warnings,
            suggestions=suggestions
        )
        
    except Exception as e:
        error_msg = str(e)
        errors.append(error_msg)
        
        # 根据验证级别决定是否尝试修复
        if validation_level == ValidationLevel.LOOSE:
            # 尝试修复常见问题
            try:
                fixed_data = _attempt_data_repair(cleaned_data, error_msg)
                if fixed_data:
                    validated_user = UserValidationModel(**fixed_data)
                    cleaned_data = validated_user.dict(exclude_none=True)
                    warnings.append(f"数据已自动修复: {error_msg}")
                    
                    return ValidationResult(
                        is_valid=True,
                        original_data=data,
                        cleaned_data=cleaned_data,
                        errors=[],
                        warnings=warnings,
                        suggestions=suggestions
                    )
            except:
                pass
        
        log_warning("单条记录验证失败", data=data, error=error_msg)
        
        return ValidationResult(
            is_valid=False,
            original_data=data,
            cleaned_data=None,
            errors=errors,
            warnings=warnings,
            suggestions=_generate_suggestions(data, error_msg)
        )

def _attempt_data_repair(data: Dict[str, Any], error_msg: str) -> Optional[Dict[str, Any]]:
    """尝试修复数据
    
    Args:
        data: 原始数据
        error_msg: 错误信息
        
    Returns:
        修复后的数据，如果无法修复则返回None
    """
    repaired_data = data.copy()
    
    try:
        # 修复手机号格式问题
        if '手机号' in error_msg and 'phone_number' in repaired_data:
            phone = str(repaired_data['phone_number'])
            # 移除所有非数字字符
            phone = re.sub(r'[^\d]', '', phone)
            # 处理国际格式
            if phone.startswith('86') and len(phone) == 13:
                phone = phone[2:]
            repaired_data['phone_number'] = phone
        
        # 修复角色名称问题
        if '角色' in error_msg and 'role' in repaired_data:
            role_mapping = {
                '学生': 'Student',
                '老师': 'Teacher', 
                '教师': 'Teacher',
                '管理员': 'Admin',
                '超级管理员': 'SuperAdmin'
            }
            role = str(repaired_data['role']).strip()
            if role in role_mapping:
                repaired_data['role'] = role_mapping[role]
        
        # 修复状态名称问题
        if '状态' in error_msg and 'status' in repaired_data:
            status_mapping = {
                '激活': 'Active',
                '活跃': 'Active',
                '正常': 'Active',
                '禁用': 'Inactive',
                '停用': 'Inactive',
                '暂停': 'Suspended',
                '删除': 'Deleted'
            }
            status = str(repaired_data['status']).strip()
            if status in status_mapping:
                repaired_data['status'] = status_mapping[status]
        
        return repaired_data
        
    except Exception:
        return None

def _generate_suggestions(data: Dict[str, Any], error_msg: str) -> List[str]:
    """生成修复建议
    
    Args:
        data: 原始数据
        error_msg: 错误信息
        
    Returns:
        修复建议列表
    """
    suggestions = []
    
    if '手机号' in error_msg:
        suggestions.append("请检查手机号格式，确保为11位数字且以1开头")
    
    if '姓名' in error_msg:
        suggestions.append("请检查姓名格式，只能包含中文、英文字母和·")
    
    if '角色' in error_msg:
        suggestions.append("角色必须是：Student、Teacher、Admin、SuperAdmin之一")
    
    if '状态' in error_msg:
        suggestions.append("状态必须是：Active、Inactive、Suspended、Deleted之一")
    
    if '邮箱' in error_msg:
        suggestions.append("请检查邮箱格式是否正确")
    
    if '身份证' in error_msg:
        suggestions.append("请检查身份证号格式，应为18位数字或17位数字+X")
    
    return suggestions

# --- 重复数据检测 ---

def detect_duplicates(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """检测重复数据
    
    Args:
        records: 记录列表
        
    Returns:
        重复数据分组列表
    """
    phone_groups = {}
    email_groups = {}
    id_card_groups = {}
    
    # 按不同字段分组
    for i, record in enumerate(records):
        # 按手机号分组
        phone = record.get('phone_number')
        if phone:
            if phone not in phone_groups:
                phone_groups[phone] = []
            phone_groups[phone].append({'index': i, 'record': record})
        
        # 按邮箱分组
        email = record.get('email')
        if email:
            if email not in email_groups:
                email_groups[email] = []
            email_groups[email].append({'index': i, 'record': record})
        
        # 按身份证分组
        id_card = record.get('id_card')
        if id_card:
            if id_card not in id_card_groups:
                id_card_groups[id_card] = []
            id_card_groups[id_card].append({'index': i, 'record': record})
    
    duplicate_groups = []
    
    # 找出重复的手机号
    for phone, group in phone_groups.items():
        if len(group) > 1:
            duplicate_groups.append({
                'type': 'phone_number',
                'value': phone,
                'count': len(group),
                'records': group
            })
    
    # 找出重复的邮箱
    for email, group in email_groups.items():
        if len(group) > 1:
            duplicate_groups.append({
                'type': 'email',
                'value': email,
                'count': len(group),
                'records': group
            })
    
    # 找出重复的身份证
    for id_card, group in id_card_groups.items():
        if len(group) > 1:
            duplicate_groups.append({
                'type': 'id_card',
                'value': id_card,
                'count': len(group),
                'records': group
            })
    
    log_info("重复数据检测完成", duplicate_groups=len(duplicate_groups))
    return duplicate_groups

def check_database_duplicates(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """检查数据库中的重复数据
    
    Args:
        records: 待检查的记录列表
        
    Returns:
        与数据库重复的记录列表
    """
    database_duplicates = []
    
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            for i, record in enumerate(records):
                duplicates = []
                
                # 检查手机号重复
                phone = record.get('phone_number')
                if phone:
                    cursor.execute("SELECT id, name FROM users WHERE phone_number = ?", (phone,))
                    result = cursor.fetchone()
                    if result:
                        duplicates.append({
                            'field': 'phone_number',
                            'value': phone,
                            'existing_user_id': result[0],
                            'existing_user_name': result[1]
                        })
                
                # 检查邮箱重复
                email = record.get('email')
                if email:
                    cursor.execute("SELECT id, name FROM users WHERE email = ?", (email,))
                    result = cursor.fetchone()
                    if result:
                        duplicates.append({
                            'field': 'email',
                            'value': email,
                            'existing_user_id': result[0],
                            'existing_user_name': result[1]
                        })
                
                if duplicates:
                    database_duplicates.append({
                        'index': i,
                        'record': record,
                        'duplicates': duplicates
                    })
    
    except Exception as e:
        log_error("检查数据库重复数据失败", error=str(e))
        raise ValidationException(f"检查数据库重复数据失败: {str(e)}")
    
    log_info("数据库重复检查完成", duplicates=len(database_duplicates))
    return database_duplicates

# --- 主要清洗函数 ---

def clean_and_validate_data(
    records: List[Dict[str, Any]], 
    validation_level: ValidationLevel = ValidationLevel.MODERATE
) -> DataCleaningReport:
    """清洗和验证数据的主要函数
    
    Args:
        records: 待处理的记录列表
        validation_level: 验证级别
        
    Returns:
        数据清洗报告
    """
    log_info("开始数据清洗和验证", total_records=len(records), level=validation_level.value)
    
    validation_results = []
    valid_count = 0
    cleaned_count = 0
    
    # 逐条验证记录
    for record in records:
        result = validate_single_record(record, validation_level)
        validation_results.append(result)
        
        if result.is_valid:
            valid_count += 1
            if result.warnings:  # 有警告说明数据被清洗过
                cleaned_count += 1
    
    # 检测重复数据
    valid_records = [r.cleaned_data for r in validation_results if r.is_valid]
    duplicate_groups = detect_duplicates(valid_records)
    database_duplicates = check_database_duplicates(valid_records)
    
    # 统计重复记录数
    duplicate_count = sum(group['count'] - 1 for group in duplicate_groups)
    duplicate_count += len(database_duplicates)
    
    # 生成报告
    total_records = len(records)
    invalid_count = total_records - valid_count
    
    summary = f"数据清洗完成：总计{total_records}条，有效{valid_count}条，无效{invalid_count}条，" \
              f"清洗{cleaned_count}条，重复{duplicate_count}条"
    
    report = DataCleaningReport(
        total_records=total_records,
        valid_records=valid_count,
        invalid_records=invalid_count,
        cleaned_records=cleaned_count,
        duplicate_records=duplicate_count,
        validation_results=validation_results,
        duplicate_groups=duplicate_groups + [{
            'type': 'database_duplicate',
            'records': database_duplicates
        }] if database_duplicates else duplicate_groups,
        summary=summary
    )
    
    log_info("数据清洗和验证完成", 
            total=total_records,
            valid=valid_count,
            invalid=invalid_count,
            cleaned=cleaned_count,
            duplicates=duplicate_count)
    
    return report