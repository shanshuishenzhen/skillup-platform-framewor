from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime
import sqlite3
import json
import time
from config import config
from logger import log_info, log_error
from attribute_service import get_attribute_definition_by_id, AttributeType
from validation_models import (
    AttributeValueValidation, AttributeValueUpdateValidation,
    validate_id, sanitize_input
)

# 属性值请求模型（继承验证模型）
class AttributeValueRequest(AttributeValueValidation):
    pass

# 属性值更新模型（继承验证模型）
class AttributeValueUpdate(AttributeValueUpdateValidation):
    pass

# 属性值响应模型
class AttributeValueResponse(BaseModel):
    id: int
    user_id: int
    attribute_id: int
    attribute_name: str
    attribute_display_name: str
    attribute_type: str
    value: Union[str, int, float, bool, List[str]]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    updated_by: Optional[int]

# 用户属性值列表响应
class UserAttributeValuesResponse(BaseModel):
    user_id: int
    attributes: List[AttributeValueResponse]
    total: int

# 批量属性值请求
class BatchAttributeValueRequest(BaseModel):
    user_id: int
    attributes: List[AttributeValueRequest]
    
    @validator('user_id')
    def validate_user_id(cls, v):
        return validate_id(v, "用户ID")

# 批量操作结果
class BatchAttributeValueResult(BaseModel):
    success_count: int
    error_count: int
    total_count: int
    errors: List[Dict[str, Any]]
    success_items: List[AttributeValueResponse]

# 验证属性值
def validate_attribute_value(attribute_id: int, value: Any) -> tuple[bool, str, Any]:
    """验证属性值是否符合属性定义"""
    try:
        # 获取属性定义
        attr_def = get_attribute_definition_by_id(attribute_id)
        if not attr_def:
            return False, "属性定义不存在", None
        
        if not attr_def.is_active:
            return False, "属性已被禁用", None
        
        # 必填验证
        if attr_def.is_required and (value is None or value == ""):
            return False, f"属性 '{attr_def.display_name}' 为必填项", None
        
        # 如果值为空且非必填，返回默认值或None
        if value is None or value == "":
            return True, "", attr_def.default_value
        
        # 根据属性类型验证值
        attr_type = AttributeType(attr_def.attribute_type)
        validated_value = value
        
        if attr_type == AttributeType.TEXT or attr_type == AttributeType.TEXTAREA:
            validated_value = str(value)
            
        elif attr_type == AttributeType.NUMBER:
            try:
                validated_value = float(value) if '.' in str(value) else int(value)
            except (ValueError, TypeError):
                return False, f"属性 '{attr_def.display_name}' 必须是数字", None
                
        elif attr_type == AttributeType.BOOLEAN:
            if isinstance(value, bool):
                validated_value = value
            elif str(value).lower() in ['true', '1', 'yes', 'on']:
                validated_value = True
            elif str(value).lower() in ['false', '0', 'no', 'off']:
                validated_value = False
            else:
                return False, f"属性 '{attr_def.display_name}' 必须是布尔值", None
                
        elif attr_type == AttributeType.DATE:
            try:
                # 尝试解析日期格式
                if isinstance(value, str):
                    datetime.fromisoformat(value.replace('Z', '+00:00'))
                validated_value = str(value)
            except ValueError:
                return False, f"属性 '{attr_def.display_name}' 日期格式不正确", None
                
        elif attr_type == AttributeType.EMAIL:
            import re
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, str(value)):
                return False, f"属性 '{attr_def.display_name}' 邮箱格式不正确", None
            validated_value = str(value)
            
        elif attr_type == AttributeType.PHONE:
            import re
            phone_pattern = r'^1[3-9]\d{9}$'
            if not re.match(phone_pattern, str(value)):
                return False, f"属性 '{attr_def.display_name}' 手机号格式不正确", None
            validated_value = str(value)
            
        elif attr_type == AttributeType.URL:
            import re
            url_pattern = r'^https?://[^\s/$.?#].[^\s]*$'
            if not re.match(url_pattern, str(value)):
                return False, f"属性 '{attr_def.display_name}' URL格式不正确", None
            validated_value = str(value)
            
        elif attr_type == AttributeType.SELECT:
            if not attr_def.options or str(value) not in attr_def.options:
                return False, f"属性 '{attr_def.display_name}' 值不在可选项中", None
            validated_value = str(value)
            
        elif attr_type == AttributeType.MULTISELECT:
            if isinstance(value, str):
                try:
                    value = json.loads(value)
                except json.JSONDecodeError:
                    value = [value]  # 单个值转为列表
            
            if not isinstance(value, list):
                return False, f"属性 '{attr_def.display_name}' 必须是数组", None
            
            if attr_def.options:
                for v in value:
                    if str(v) not in attr_def.options:
                        return False, f"属性 '{attr_def.display_name}' 包含无效选项: {v}", None
            
            validated_value = value
        
        # 验证规则检查
        if attr_def.validation_rules:
            validation_result = _apply_validation_rules(validated_value, attr_def.validation_rules, attr_def.display_name)
            if not validation_result[0]:
                return validation_result
        
        return True, "", validated_value
        
    except Exception as e:
        log_error("属性值验证失败", attribute_id=attribute_id, value=value, error=str(e))
        return False, f"验证失败: {str(e)}", None

def _apply_validation_rules(value: Any, rules: Dict[str, Any], attr_name: str) -> tuple[bool, str, Any]:
    """应用验证规则"""
    try:
        # 长度验证
        if 'min_length' in rules and len(str(value)) < rules['min_length']:
            return False, f"属性 '{attr_name}' 长度不能少于 {rules['min_length']} 个字符", None
        
        if 'max_length' in rules and len(str(value)) > rules['max_length']:
            return False, f"属性 '{attr_name}' 长度不能超过 {rules['max_length']} 个字符", None
        
        # 数值范围验证
        if 'min_value' in rules and isinstance(value, (int, float)) and value < rules['min_value']:
            return False, f"属性 '{attr_name}' 值不能小于 {rules['min_value']}", None
        
        if 'max_value' in rules and isinstance(value, (int, float)) and value > rules['max_value']:
            return False, f"属性 '{attr_name}' 值不能大于 {rules['max_value']}", None
        
        # 正则表达式验证
        if 'pattern' in rules:
            import re
            if not re.match(rules['pattern'], str(value)):
                return False, f"属性 '{attr_name}' 格式不正确", None
        
        return True, "", value
        
    except Exception as e:
        return False, f"验证规则应用失败: {str(e)}", None

# 设置用户属性值
def set_user_attribute_value(user_id: int, attr_data: AttributeValueRequest, operator_id: int) -> AttributeValueResponse:
    """设置用户属性值"""
    conn = None
    try:
        # 验证ID
        user_id = validate_id(user_id, "用户ID")
        attribute_id = validate_id(attr_data.attribute_id, "属性ID")
        
        # 清理属性值
        if isinstance(attr_data.value, str):
            value = sanitize_input(attr_data.value, 1000)
        else:
            value = attr_data.value
        
        # 验证属性值
        is_valid, error_msg, validated_value = validate_attribute_value(attribute_id, value)
        if not is_valid:
            raise ValueError(error_msg)
        
        conn = sqlite3.connect(config.DATABASE_PATH)
        cursor = conn.cursor()
        
        # 获取属性定义信息
        attr_def = get_attribute_definition_by_id(attr_data.attribute_id)
        if not attr_def:
            raise ValueError("属性定义不存在")
        
        # 检查唯一性约束
        if attr_def.is_unique and validated_value is not None:
            cursor.execute("""
                SELECT user_id FROM user_attribute_values 
                WHERE attribute_id = ? AND value = ? AND user_id != ?
            """, (attr_data.attribute_id, json.dumps(validated_value), user_id))
            if cursor.fetchone():
                raise ValueError(f"属性 '{attr_def.display_name}' 的值已被其他用户使用")
        
        # 检查是否已存在该属性值
        cursor.execute("""
            SELECT user_id FROM user_attribute_values 
            WHERE user_id = ? AND attr_id = ?
        """, (user_id, attr_data.attribute_id))
        existing_record = cursor.fetchone()
        
        if existing_record:
            # 更新现有记录
            cursor.execute("""
                UPDATE user_attribute_values 
                SET attr_value = ?, created_at = ?
                WHERE user_id = ? AND attr_id = ?
            """, (json.dumps(validated_value), int(time.time()), user_id, attr_data.attribute_id))
            record_id = f"{user_id}_{attr_data.attribute_id}"  # 复合主键标识
        else:
            # 创建新记录
            cursor.execute("""
                INSERT INTO user_attribute_values (
                    user_id, attr_id, attr_value, created_at
                ) VALUES (?, ?, ?, ?)
            """, (user_id, attr_data.attribute_id, json.dumps(validated_value), int(time.time())))
            record_id = f"{user_id}_{attr_data.attribute_id}"  # 复合主键标识
        
        conn.commit()
        
        # 获取完整的属性值信息
        result = get_user_attribute_value_by_id(record_id)
        
        log_info("用户属性值设置成功", 
                user_id=user_id,
                attribute_id=attr_data.attribute_id,
                operator_id=operator_id,
                record_id=record_id)
        
        return result
        
    except Exception as e:
        if conn:
            conn.rollback()
        log_error("用户属性值设置失败", 
                 user_id=user_id,
                 attribute_id=attr_data.attribute_id,
                 operator_id=operator_id,
                 error=str(e))
        raise
    finally:
        if conn:
            conn.close()

# 获取用户属性值详情
def get_user_attribute_value_by_id(record_id: str) -> Optional[AttributeValueResponse]:
    """根据复合记录ID获取用户属性值详情"""
    try:
        # 解析复合主键
        user_id, attr_id = record_id.split('_')
        user_id, attr_id = int(user_id), int(attr_id)
        
        conn = sqlite3.connect(config.DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT uav.user_id, uav.attr_id, uav.attr_value, uav.created_at,
                   uad.name, uad.display_name, uad.attribute_type
            FROM user_attribute_values uav
            JOIN attribute_definitions uad ON uav.attr_id = uad.id
            WHERE uav.user_id = ? AND uav.attr_id = ?
        """, (user_id, attr_id))
        
        row = cursor.fetchone()
        if not row:
            return None
        
        # 解析值
        try:
            parsed_value = json.loads(row[2]) if row[2] else None
        except json.JSONDecodeError:
            parsed_value = row[2]
        
        # 转换时间戳为datetime
        created_at = datetime.fromtimestamp(row[3]) if row[3] else datetime.now()
        
        return AttributeValueResponse(
            id=record_id,
            user_id=row[0],
            attribute_id=row[1],
            value=parsed_value,
            created_at=created_at,
            updated_at=created_at,  # 表中没有updated_at字段，使用created_at
            created_by=None,  # 表中没有created_by字段
            updated_by=None,  # 表中没有updated_by字段
            attribute_name=row[4],
            attribute_display_name=row[5],
            attribute_type=row[6]
        )
        
    except Exception as e:
        log_error("获取用户属性值详情失败", record_id=record_id, error=str(e))
        raise
    finally:
        if conn:
            conn.close()

# 获取用户所有属性值
def get_user_attribute_values(user_id: int, include_inactive: bool = False) -> UserAttributeValuesResponse:
    """获取用户的所有属性值"""
    try:
        conn = sqlite3.connect(config.DATABASE_PATH)
        cursor = conn.cursor()
        
        # 构建查询条件
        active_condition = "" if include_inactive else "AND uad.is_active = 1"
        
        cursor.execute(f"""
            SELECT uav.user_id, uav.attr_id, uav.attr_value, uav.created_at,
                   uad.name, uad.display_name, uad.attribute_type
            FROM user_attribute_values uav
            JOIN attribute_definitions uad ON uav.attr_id = uad.id
            WHERE uav.user_id = ? {active_condition}
            ORDER BY uad.sort_order ASC, uad.created_at ASC
        """, (user_id,))
        
        attributes = []
        for row in cursor.fetchall():
            # 解析值
            try:
                parsed_value = json.loads(row[2]) if row[2] else None
            except json.JSONDecodeError:
                parsed_value = row[2]
            
            # 转换时间戳为datetime
            created_at = datetime.fromtimestamp(row[3]) if row[3] else datetime.now()
            
            attributes.append(AttributeValueResponse(
                id=f"{row[0]}_{row[1]}",  # 复合主键标识
                user_id=row[0],
                attribute_id=row[1],
                value=parsed_value,
                created_at=created_at,
                updated_at=created_at,  # 表中没有updated_at字段，使用created_at
                created_by=None,  # 表中没有created_by字段
                updated_by=None,  # 表中没有updated_by字段
                attribute_name=row[4],
                attribute_display_name=row[5],
                attribute_type=row[6]
            ))
        
        return UserAttributeValuesResponse(
            user_id=user_id,
            attributes=attributes,
            total=len(attributes)
        )
        
    except Exception as e:
        log_error("获取用户属性值列表失败", user_id=user_id, error=str(e))
        raise
    finally:
        if conn:
            conn.close()

# 删除用户属性值
def delete_user_attribute_value(user_id: int, attribute_id: int, operator_id: int) -> bool:
    """删除用户属性值"""
    conn = None
    try:
        conn = sqlite3.connect(config.DATABASE_PATH)
        cursor = conn.cursor()
        
        # 检查记录是否存在
        cursor.execute("""
            SELECT user_id FROM user_attribute_values 
            WHERE user_id = ? AND attr_id = ?
        """, (user_id, attribute_id))
        
        if not cursor.fetchone():
            raise ValueError("属性值记录不存在")
        
        # 删除记录
        cursor.execute("""
            DELETE FROM user_attribute_values 
            WHERE user_id = ? AND attr_id = ?
        """, (user_id, attribute_id))
        
        conn.commit()
        
        log_info("用户属性值删除成功", 
                user_id=user_id,
                attribute_id=attribute_id,
                operator_id=operator_id)
        
        return True
        
    except Exception as e:
        if conn:
            conn.rollback()
        log_error("用户属性值删除失败", 
                 user_id=user_id,
                 attribute_id=attribute_id,
                 operator_id=operator_id,
                 error=str(e))
        raise
    finally:
        if conn:
            conn.close()

# 批量设置用户属性值
def batch_set_user_attribute_values(
    batch_data: BatchAttributeValueRequest,
    operator_id: int
) -> BatchAttributeValueResult:
    """批量设置用户属性值"""
    success_count = 0
    error_count = 0
    errors = []
    success_items = []
    
    for i, attr_data in enumerate(batch_data.attributes):
        try:
            result = set_user_attribute_value(batch_data.user_id, attr_data, operator_id)
            success_items.append(result)
            success_count += 1
            
        except Exception as e:
            error_count += 1
            errors.append({
                "index": i,
                "attribute_id": attr_data.attribute_id,
                "error": str(e)
            })
    
    log_info("批量设置用户属性值完成", 
            user_id=batch_data.user_id,
            operator_id=operator_id,
            success_count=success_count,
            error_count=error_count,
            total_count=len(batch_data.attributes))
    
    return BatchAttributeValueResult(
        success_count=success_count,
        error_count=error_count,
        total_count=len(batch_data.attributes),
        errors=errors,
        success_items=success_items
    )

# 清空用户所有属性值
def clear_user_attribute_values(user_id: int, operator_id: int) -> bool:
    """清空用户的所有属性值"""
    try:
        conn = sqlite3.connect(config.DATABASE_PATH)
        cursor = conn.cursor()
        
        # 获取要删除的记录数
        cursor.execute("SELECT COUNT(*) FROM user_attribute_values WHERE user_id = ?", (user_id,))
        count = cursor.fetchone()[0]
        
        # 删除所有属性值
        cursor.execute("DELETE FROM user_attribute_values WHERE user_id = ?", (user_id,))
        conn.commit()
        
        log_info("用户属性值清空成功", 
                user_id=user_id,
                operator_id=operator_id,
                deleted_count=count)
        
        return True
        
    except Exception as e:
        if conn:
            conn.rollback()
        log_error("用户属性值清空失败", 
                 user_id=user_id,
                 operator_id=operator_id,
                 error=str(e))
        raise
    finally:
        if conn:
            conn.close()