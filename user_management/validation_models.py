from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator, EmailStr
from datetime import datetime
from enum import Enum
import re

# 验证规则枚举
class ValidationType(str, Enum):
    REQUIRED = "required"
    EMAIL = "email"
    PHONE = "phone"
    URL = "url"
    MIN_LENGTH = "min_length"
    MAX_LENGTH = "max_length"
    MIN_VALUE = "min_value"
    MAX_VALUE = "max_value"
    PATTERN = "pattern"
    UNIQUE = "unique"
    DATE_FORMAT = "date_format"
    NUMERIC = "numeric"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"

# 基础验证模型
class BaseValidationModel(BaseModel):
    """基础验证模型，提供通用验证方法"""
    
    class Config:
        # 忽略额外字段
        extra = "ignore"
        # 使用枚举值而不是枚举名称
        use_enum_values = True
        # 验证赋值
        validate_assignment = True
        # 允许字段重用验证器
        allow_reuse = True

# 用户基础信息验证模型
class UserBaseValidation(BaseValidationModel):
    """用户基础信息验证"""
    username: str = Field(
        ..., 
        min_length=3, 
        max_length=50,
        pattern=r'^[a-zA-Z0-9_]+$',
        description="用户名，3-50个字符，只能包含字母、数字和下划线"
    )
    email: Optional[EmailStr] = Field(None, description="邮箱地址")
    phone: Optional[str] = Field(
        None,
        pattern=r'^1[3-9]\d{9}$',
        description="手机号码，11位数字，以1开头"
    )
    real_name: Optional[str] = Field(
        None,
        min_length=2,
        max_length=20,
        description="真实姓名，2-20个字符"
    )
    
    @validator('username')
    def validate_username(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('用户名不能为空')
        if v.lower() in ['admin', 'root', 'system', 'test']:
            raise ValueError('用户名不能使用系统保留字')
        return v.strip()
    
    @validator('real_name')
    def validate_real_name(cls, v):
        if v and len(v.strip()) == 0:
            return None
        if v:
            # 检查是否包含特殊字符
            if re.search(r'[<>"&\']', v):
                raise ValueError('真实姓名不能包含特殊字符')
        return v.strip() if v else None

# 用户创建验证模型
class UserCreateValidation(UserBaseValidation):
    """用户创建验证"""
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="密码，8-128个字符"
    )
    role: str = Field(
        default="Student",
        description="用户角色"
    )
    status: str = Field(
        default="Active",
        description="用户状态"
    )
    is_active: bool = Field(default=True, description="是否激活")
    attributes: Optional[Dict[str, Any]] = Field(None, description="用户属性")
    
    @validator('password')
    def validate_password(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('密码不能为空')
        
        # 密码强度检查
        if len(v) < 8:
            raise ValueError('密码长度不能少于8位')
        
        # 检查是否包含字母
        if not re.search(r'[a-zA-Z]', v):
            raise ValueError('密码必须包含字母')
        
        # 检查是否包含数字
        if not re.search(r'\d', v):
            raise ValueError('密码必须包含数字')
        
        return v
    
    @validator('role')
    def validate_role(cls, v):
        allowed_roles = ['SuperAdmin', 'Admin', 'Student', 'Teacher']
        if v not in allowed_roles:
            raise ValueError(f'角色必须是以下之一: {", ".join(allowed_roles)}')
        return v

# 用户更新验证模型
class UserUpdateValidation(BaseValidationModel):
    """用户更新验证"""
    username: Optional[str] = Field(
        None,
        min_length=3,
        max_length=50,
        pattern=r'^[a-zA-Z0-9_]+$',
        description="用户名"
    )
    email: Optional[EmailStr] = Field(None, description="邮箱地址")
    phone: Optional[str] = Field(
        None,
        pattern=r'^1[3-9]\d{9}$',
        description="手机号码"
    )
    real_name: Optional[str] = Field(
        None,
        min_length=2,
        max_length=20,
        description="真实姓名"
    )
    role: Optional[str] = Field(None, description="用户角色")
    is_active: Optional[bool] = Field(None, description="是否激活")
    attributes: Optional[Dict[str, Any]] = Field(None, description="用户属性")
    new_password: Optional[str] = Field(None, min_length=8, max_length=128, description="新密码")
    
    @validator('username')
    def validate_username(cls, v):
        if v is not None:
            if not v or len(v.strip()) == 0:
                raise ValueError('用户名不能为空')
            if v.lower() in ['admin', 'root', 'system', 'test']:
                raise ValueError('用户名不能使用系统保留字')
            return v.strip()
        return v
    
    @validator('role')
    def validate_role(cls, v):
        if v is not None:
            allowed_roles = ['SuperAdmin', 'Admin', 'Student', 'Teacher']
            if v not in allowed_roles:
                raise ValueError(f'角色必须是以下之一: {", ".join(allowed_roles)}')
        return v

# 属性定义验证模型
class AttributeDefinitionValidation(BaseValidationModel):
    """属性定义验证模型"""
    name: str = Field(
        ..., 
        min_length=2,
        max_length=50,
        pattern=r'^[a-zA-Z][a-zA-Z0-9_]*$',
        description="属性名称，以字母开头，只能包含字母、数字和下划线"
    )
    display_name: str = Field(..., min_length=1, max_length=100, description="显示名称")
    attribute_type: str = Field(..., description="属性类型")
    is_required: bool = Field(default=False, description="是否必填")
    is_unique: bool = Field(default=False, description="是否唯一")
    default_value: Optional[str] = Field(None, max_length=500, description="默认值")
    validation_rules: Optional[dict] = Field(None, description="验证规则")
    options: Optional[dict] = Field(None, description="选项配置")
    sort_order: int = Field(default=0, description="排序顺序")
    is_active: bool = Field(default=True, description="是否启用")
    description: Optional[str] = Field(None, max_length=500, description="描述")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('属性名称不能为空')
        
        # 检查是否为系统保留字段
        reserved_names = [
            'id', 'user_id', 'created_at', 'updated_at', 'created_by', 'updated_by',
            'username', 'email', 'phone', 'password', 'role', 'is_active'
        ]
        if v.lower() in reserved_names:
            raise ValueError(f'属性名称不能使用系统保留字段: {v}')
        
        return v.strip()
    
    @validator('attribute_type')
    def validate_attribute_type(cls, v):
        allowed_types = ['text', 'number', 'date', 'boolean', 'select', 'multiselect', 'email', 'phone', 'url', 'textarea']
        if v not in allowed_types:
            raise ValueError(f'属性类型必须是以下之一：{allowed_types}')
        return v
    
    @validator('validation_rules')
    def validate_validation_rules(cls, v):
        if v and not isinstance(v, dict):
            raise ValueError('验证规则必须是字典类型')
        return v

# 属性定义更新验证模型
class AttributeDefinitionUpdateValidation(BaseValidationModel):
    """属性定义更新验证模型"""
    display_name: Optional[str] = Field(None, min_length=1, max_length=100, description="显示名称")
    attribute_type: Optional[str] = Field(None, description="属性类型")
    is_required: Optional[bool] = Field(None, description="是否必填")
    is_unique: Optional[bool] = Field(None, description="是否唯一")
    default_value: Optional[str] = Field(None, max_length=500, description="默认值")
    validation_rules: Optional[dict] = Field(None, description="验证规则")
    options: Optional[dict] = Field(None, description="选项配置")
    sort_order: Optional[int] = Field(None, description="排序顺序")
    is_active: Optional[bool] = Field(None, description="是否启用")
    description: Optional[str] = Field(None, max_length=500, description="描述")
    
    @validator('attribute_type')
    def validate_attribute_type(cls, v):
        if v is not None:
            allowed_types = ['text', 'number', 'date', 'boolean', 'select', 'multiselect', 'email', 'phone', 'url', 'textarea']
            if v not in allowed_types:
                raise ValueError(f'属性类型必须是以下之一：{allowed_types}')
        return v
    
    @validator('validation_rules')
    def validate_validation_rules(cls, v):
        if v and not isinstance(v, dict):
            raise ValueError('验证规则必须是字典类型')
        return v

# 属性值验证模型
class AttributeValueValidation(BaseValidationModel):
    """属性值验证"""
    attribute_id: int = Field(..., gt=0, description="属性定义ID")
    value: Union[str, int, float, bool, List[str], None] = Field(
        ..., 
        description="属性值"
    )
    
    @validator('attribute_id')
    def validate_attribute_id(cls, v):
        return validate_id(v, "属性ID")
    
    @validator('value')
    def validate_value(cls, v):
        # 基础验证，具体验证逻辑在服务层实现
        if v is None:
            return v
        
        # 检查值的长度（如果是字符串）
        if isinstance(v, str) and len(v) > 10000:
            raise ValueError('属性值长度不能超过10000个字符')
        
        return v

# 属性值更新验证模型
class AttributeValueUpdateValidation(BaseValidationModel):
    """属性值更新验证模型"""
    value: Union[str, int, float, bool, List[str], None] = Field(..., description="属性值")

# 批量导入验证模型
class ImportDataValidation(BaseValidationModel):
    """批量导入数据验证"""
    file_type: str = Field(..., description="文件类型")
    data: List[Dict[str, Any]] = Field(..., description="导入数据")
    
    @validator('file_type')
    def validate_file_type(cls, v):
        allowed_types = ['csv', 'excel', 'xlsx', 'xls']
        if v.lower() not in allowed_types:
            raise ValueError(f'不支持的文件类型: {v}')
        return v.lower()
    
    @validator('data')
    def validate_data(cls, v):
        if not v or len(v) == 0:
            raise ValueError('导入数据不能为空')
        
        if len(v) > 10000:
            raise ValueError('单次导入数据不能超过10000条')
        
        # 检查必要字段
        required_fields = ['username', 'email']
        for i, row in enumerate(v):
            for field in required_fields:
                if field not in row or not row[field]:
                    raise ValueError(f'第{i+1}行缺少必要字段: {field}')
        
        return v

# 查询参数验证模型
class QueryParamsValidation(BaseValidationModel):
    """查询参数验证"""
    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=20, ge=1, le=1000, description="每页数量")
    search: Optional[str] = Field(
        None,
        max_length=100,
        description="搜索关键词"
    )
    sort_by: Optional[str] = Field(
        None,
        max_length=50,
        description="排序字段"
    )
    sort_order: Optional[str] = Field(
        default="asc",
        pattern=r'^(asc|desc)$',
        description="排序方向"
    )
    
    @validator('search')
    def validate_search(cls, v):
        if v and len(v.strip()) == 0:
            return None
        if v:
            # 防止SQL注入
            dangerous_chars = ['"', "'", ';', '--', '/*', '*/', 'xp_', 'sp_']
            for char in dangerous_chars:
                if char in v.lower():
                    raise ValueError('搜索关键词包含非法字符')
        return v.strip() if v else None
    
    @validator('sort_by')
    def validate_sort_by(cls, v):
        if v:
            # 只允许字母、数字和下划线
            if not re.match(r'^[a-zA-Z0-9_]+$', v):
                raise ValueError('排序字段只能包含字母、数字和下划线')
        return v

# 文件上传验证模型
class FileUploadValidation(BaseValidationModel):
    """文件上传验证模型"""
    file_name: str = Field(..., min_length=1, max_length=255, description="文件名")
    file_size: int = Field(..., gt=0, le=10*1024*1024, description="文件大小，最大10MB")
    file_type: str = Field(..., description="文件类型")
    
    @validator('file_type')
    def validate_file_type(cls, v):
        allowed_types = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv'
        ]
        if v not in allowed_types:
            raise ValueError('不支持的文件类型，仅支持Excel和CSV文件')
        return v

# 批量导入验证模型
class BatchImportValidation(BaseValidationModel):
    """批量导入验证模型"""
    data: List[Dict[str, Any]] = Field(..., min_items=1, max_items=1000, description="导入数据")
    import_mode: str = Field(default="insert", description="导入模式")
    skip_duplicates: bool = Field(default=True, description="是否跳过重复数据")
    validate_data: bool = Field(default=True, description="是否验证数据")
    
    @validator('import_mode')
    def validate_import_mode(cls, v):
        allowed_modes = ['insert', 'update', 'upsert']
        if v not in allowed_modes:
            raise ValueError(f'导入模式必须是以下之一：{allowed_modes}')
        return v

# 通用验证函数
def validate_id(value: Any, field_name: str = "ID") -> int:
    """验证ID字段"""
    try:
        id_value = int(value)
        if id_value <= 0:
            raise ValueError(f'{field_name}必须是正整数')
        return id_value
    except (ValueError, TypeError):
        raise ValueError(f'{field_name}格式不正确')

def validate_email(email: str) -> str:
    """验证邮箱格式"""
    if not email or len(email.strip()) == 0:
        raise ValueError('邮箱地址不能为空')
    
    email = email.strip().lower()
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise ValueError('邮箱格式不正确')
    
    return email

def validate_phone(phone: str) -> str:
    """验证手机号格式"""
    if not phone or len(phone.strip()) == 0:
        raise ValueError('手机号不能为空')
    
    phone = phone.strip()
    phone_pattern = r'^1[3-9]\d{9}$'
    if not re.match(phone_pattern, phone):
        raise ValueError('手机号格式不正确')
    
    return phone

def validate_url(url: str) -> str:
    """验证URL格式"""
    if not url or len(url.strip()) == 0:
        raise ValueError('URL不能为空')
    
    url = url.strip()
    url_pattern = r'^https?://[^\s/$.?#].[^\s]*$'
    if not re.match(url_pattern, url):
        raise ValueError('URL格式不正确')
    
    return url

def sanitize_input(value: str, max_length: int = 1000) -> str:
    """清理输入数据"""
    if not value:
        return ""
    
    # 去除首尾空格
    value = value.strip()
    
    # 限制长度
    if len(value) > max_length:
        value = value[:max_length]
    
    # 转义HTML特殊字符
    html_escape_table = {
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#x27;",
        ">": "&gt;",
        "<": "&lt;",
    }
    
    for char, escape in html_escape_table.items():
        value = value.replace(char, escape)
    
    return value

def clean_and_validate_user_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """清理和验证用户数据"""
    cleaned_data = {}
    
    # 清理姓名
    if 'name' in data:
        cleaned_data['name'] = sanitize_input(data['name'], max_length=50)
    
    # 验证和清理手机号
    if 'phone_number' in data:
        cleaned_data['phone_number'] = validate_phone(data['phone_number'])
    
    # 验证和清理邮箱
    if 'email' in data and data['email']:
        cleaned_data['email'] = validate_email(data['email'])
    
    # 清理其他字段
    for field in ['role', 'status', 'department']:
        if field in data and data[field]:
            cleaned_data[field] = sanitize_input(data[field], max_length=50)
    
    return cleaned_data

def validate_request_data(data: Dict[str, Any], validation_rules: Dict[str, Any] = None) -> Dict[str, Any]:
    """验证请求数据
    
    Args:
        data: 待验证的数据
        validation_rules: 验证规则（可选）
        
    Returns:
        验证后的数据
        
    Raises:
        ValueError: 验证失败
    """
    if not isinstance(data, dict):
        raise ValueError("数据必须是字典格式")
    
    # 基础数据清理
    cleaned_data = {}
    
    for key, value in data.items():
        if isinstance(value, str):
            # 清理字符串数据
            cleaned_value = sanitize_input(value)
            if cleaned_value:  # 只保留非空值
                cleaned_data[key] = cleaned_value
        elif value is not None:
            cleaned_data[key] = value
    
    # 应用特定验证规则
    if validation_rules:
        for field, rules in validation_rules.items():
            if field in cleaned_data:
                value = cleaned_data[field]
                
                # 长度验证
                if 'min_length' in rules and len(str(value)) < rules['min_length']:
                    raise ValueError(f"{field}长度不能少于{rules['min_length']}个字符")
                if 'max_length' in rules and len(str(value)) > rules['max_length']:
                    raise ValueError(f"{field}长度不能超过{rules['max_length']}个字符")
                
                # 正则验证
                if 'pattern' in rules:
                    import re
                    if not re.match(rules['pattern'], str(value)):
                        raise ValueError(f"{field}格式不正确")
    
    return cleaned_data