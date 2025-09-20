from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, validator
from datetime import datetime
import sqlite3
import json
from config import config
from logger import log_info, log_error
from validation_models import (
    AttributeDefinitionValidation, AttributeDefinitionUpdateValidation,
    validate_id, sanitize_input
)

# 属性类型枚举
class AttributeType(str, Enum):
    TEXT = "text"           # 文本
    NUMBER = "number"       # 数字
    DATE = "date"           # 日期
    BOOLEAN = "boolean"     # 布尔值
    SELECT = "select"       # 单选
    MULTISELECT = "multiselect"  # 多选
    EMAIL = "email"         # 邮箱
    PHONE = "phone"         # 电话
    URL = "url"             # 网址
    TEXTAREA = "textarea"   # 长文本

# 属性定义请求模型（继承验证模型）
class AttributeDefinitionRequest(AttributeDefinitionValidation):
    pass

# 属性定义更新模型（继承验证模型）
class AttributeDefinitionUpdate(AttributeDefinitionUpdateValidation):
    pass

# 属性定义响应模型
class AttributeDefinitionResponse(BaseModel):
    id: int
    name: str
    display_name: str
    attribute_type: str
    description: Optional[str]
    is_required: bool
    is_unique: bool
    default_value: Optional[str]
    validation_rules: Optional[Dict[str, Any]]
    options: Optional[Dict[str, Any]]
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: int
    updated_by: Optional[int]

# 属性定义列表响应
class AttributeDefinitionListResponse(BaseModel):
    attributes: List[AttributeDefinitionResponse]
    total: int
    page: int
    page_size: int

# 创建属性定义
def create_attribute_definition(attr_data: AttributeDefinitionRequest, creator_id: int) -> AttributeDefinitionResponse:
    """创建属性定义"""
    try:
        # 数据清理和验证
        name = sanitize_input(attr_data.name, 100)
        display_name = sanitize_input(attr_data.display_name, 200)
        description = sanitize_input(attr_data.description, 500) if attr_data.description else None
        
        conn = sqlite3.connect(config.DATABASE_PATH)
        cursor = conn.cursor()
        
        # 检查属性名是否已存在
        cursor.execute(
            "SELECT id FROM attribute_definitions WHERE name = ? AND is_active = 1",
            (name,)
        )
        if cursor.fetchone():
            raise ValueError(f"属性名 '{name}' 已存在")
        
        # 插入属性定义
        cursor.execute("""
            INSERT INTO attribute_definitions (
                name, display_name, attribute_type, description, is_required, is_unique,
                default_value, validation_rules, options, sort_order, is_active,
                created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """, (
            name,
            display_name,
            attr_data.attribute_type,
            description,
            attr_data.is_required,
            attr_data.is_unique,
            attr_data.default_value,
            json.dumps(attr_data.validation_rules) if attr_data.validation_rules else None,
            json.dumps(attr_data.options) if attr_data.options else None,
            attr_data.sort_order,
            attr_data.is_active,
            creator_id
        ))
        
        attr_id = cursor.lastrowid
        conn.commit()
        
        # 获取创建的属性定义
        result = get_attribute_definition_by_id(attr_id)
        
        log_info("属性定义创建成功", 
                attribute_id=attr_id,
                attribute_name=name,
                creator_id=creator_id)
        
        return result
        
    except Exception as e:
        if conn:
            conn.rollback()
        log_error("属性定义创建失败", 
                 attribute_name=attr_data.name,
                 creator_id=creator_id,
                 error=str(e))
        raise
    finally:
        if conn:
            conn.close()

# 获取属性定义详情
def get_attribute_definition_by_id(attr_id: int) -> Optional[AttributeDefinitionResponse]:
    """根据ID获取属性定义"""
    try:
        conn = sqlite3.connect(config.DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, display_name, attribute_type, description, is_required, is_unique,
                   default_value, validation_rules, options, sort_order, is_active,
                   created_at, updated_at, created_by, updated_by
            FROM attribute_definitions
            WHERE id = ?
        """, (attr_id,))
        
        row = cursor.fetchone()
        if not row:
            return None
        
        return AttributeDefinitionResponse(
            id=row[0],
            name=row[1],
            display_name=row[2],
            attribute_type=row[3],
            description=row[4],
            is_required=bool(row[5]),
            is_unique=bool(row[6]),
            default_value=row[7],
            validation_rules=json.loads(row[8]) if row[8] else None,
            options=json.loads(row[9]) if row[9] else None,
            sort_order=row[10],
            is_active=bool(row[11]),
            created_at=datetime.fromisoformat(row[12]),
            updated_at=datetime.fromisoformat(row[13]),
            created_by=row[14],
            updated_by=row[15]
        )
        
    except Exception as e:
        log_error("获取属性定义失败", attribute_id=attr_id, error=str(e))
        raise
    finally:
        if conn:
            conn.close()

# 获取属性定义列表
def get_attribute_definitions(
    page: int = 1,
    page_size: int = 20,
    is_active: Optional[bool] = None,
    attribute_type: Optional[str] = None,
    search: Optional[str] = None
) -> AttributeDefinitionListResponse:
    """获取属性定义列表"""
    try:
        conn = sqlite3.connect(config.DATABASE_PATH)
        cursor = conn.cursor()
        
        # 构建查询条件
        conditions = []
        params = []
        
        if is_active is not None:
            conditions.append("is_active = ?")
            params.append(is_active)
        
        if attribute_type:
            conditions.append("attribute_type = ?")
            params.append(attribute_type)
        
        if search:
            conditions.append("(name LIKE ? OR display_name LIKE ? OR description LIKE ?)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])
        
        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
        
        # 获取总数
        count_query = f"SELECT COUNT(*) FROM attribute_definitions{where_clause}"
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]
        
        # 获取分页数据
        offset = (page - 1) * page_size
        data_query = f"""
            SELECT id, name, display_name, attribute_type, description, is_required, is_unique,
                   default_value, validation_rules, options, sort_order, is_active,
                   created_at, updated_at, created_by, updated_by
            FROM attribute_definitions{where_clause}
            ORDER BY sort_order ASC, created_at DESC
            LIMIT ? OFFSET ?
        """
        cursor.execute(data_query, params + [page_size, offset])
        
        attributes = []
        for row in cursor.fetchall():
            attributes.append(AttributeDefinitionResponse(
                id=row[0],
                name=row[1],
                display_name=row[2],
                attribute_type=row[3],
                description=row[4],
                is_required=bool(row[5]),
                is_unique=bool(row[6]),
                default_value=row[7],
                validation_rules=json.loads(row[8]) if row[8] else None,
                options=json.loads(row[9]) if row[9] else None,
                sort_order=row[10],
                is_active=bool(row[11]),
                created_at=datetime.fromisoformat(row[12]),
                updated_at=datetime.fromisoformat(row[13]),
                created_by=row[14],
                updated_by=row[15]
            ))
        
        return AttributeDefinitionListResponse(
            attributes=attributes,
            total=total,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        log_error("获取属性定义列表失败", error=str(e))
        raise
    finally:
        if conn:
            conn.close()

# 更新属性定义
def update_attribute_definition(
    attr_id: int,
    attr_data: AttributeDefinitionUpdate,
    updater_id: int
) -> AttributeDefinitionResponse:
    """更新属性定义"""
    try:
        # 验证属性ID
        attr_id = validate_id(attr_id, "属性ID")
        
        conn = sqlite3.connect(config.DATABASE_PATH)
        cursor = conn.cursor()
        
        # 检查属性是否存在
        existing_attr = get_attribute_definition_by_id(attr_id)
        if not existing_attr:
            raise ValueError("属性定义不存在")
        
        # 构建更新字段
        update_fields = []
        params = []
        
        update_data = attr_data.model_dump(exclude_none=True)
        for field, value in update_data.items():
            if field == 'display_name' and value is not None:
                value = sanitize_input(value, 200)
            elif field == 'description' and value is not None:
                value = sanitize_input(value, 500) if value else None
            elif field in ['validation_rules', 'options'] and value is not None:
                value = json.dumps(value)
            update_fields.append(f"{field} = ?")
            params.append(value)
        
        if not update_fields:
            return existing_attr
        
        # 添加更新时间和更新人
        from datetime import datetime
        current_time = datetime.now().isoformat()
        update_fields.extend(["updated_at = ?", "updated_by = ?"])
        params.extend([current_time, updater_id])
        params.append(attr_id)
        
        # 执行更新
        update_query = f"""
            UPDATE attribute_definitions 
            SET {', '.join(update_fields)}
            WHERE id = ?
        """
        cursor.execute(update_query, params)
        conn.commit()
        
        # 获取更新后的属性定义
        result = get_attribute_definition_by_id(attr_id)
        
        log_info("属性定义更新成功", 
                attribute_id=attr_id,
                updater_id=updater_id,
                updated_fields=list(update_data.keys()))
        
        return result
        
    except Exception as e:
        if conn:
            conn.rollback()
        log_error("属性定义更新失败", 
                 attribute_id=attr_id,
                 updater_id=updater_id,
                 error=str(e))
        raise
    finally:
        if conn:
            conn.close()

# 删除属性定义
def delete_attribute_definition(attr_id: int, deleter_id: int, soft_delete: bool = True) -> bool:
    """删除属性定义"""
    try:
        conn = sqlite3.connect(config.DATABASE_PATH)
        cursor = conn.cursor()
        
        # 检查属性是否存在
        existing_attr = get_attribute_definition_by_id(attr_id)
        if not existing_attr:
            raise ValueError("属性定义不存在")
        
        # 检查是否有用户使用了该属性
        cursor.execute(
            "SELECT COUNT(*) FROM user_attribute_values WHERE attribute_id = ?",
            (attr_id,)
        )
        usage_count = cursor.fetchone()[0]
        
        if usage_count > 0 and not soft_delete:
            raise ValueError(f"该属性被 {usage_count} 个用户使用，无法硬删除")
        
        if soft_delete:
            # 软删除：标记为不活跃
            current_time = datetime.now().isoformat()
            cursor.execute("""
                UPDATE attribute_definitions 
                SET is_active = 0, updated_at = ?, updated_by = ?
                WHERE id = ?
            """, (current_time, deleter_id, attr_id))
        else:
            # 硬删除：删除记录
            cursor.execute("DELETE FROM attribute_definitions WHERE id = ?", (attr_id,))
        
        conn.commit()
        
        log_info("属性定义删除成功", 
                attribute_id=attr_id,
                deleter_id=deleter_id,
                soft_delete=soft_delete,
                usage_count=usage_count)
        
        return True
        
    except Exception as e:
        if conn:
            conn.rollback()
        log_error("属性定义删除失败", 
                 attribute_id=attr_id,
                 deleter_id=deleter_id,
                 error=str(e))
        raise
    finally:
        if conn:
            conn.close()

# 批量更新属性排序
def update_attribute_sort_order(sort_data: List[Dict[str, int]], updater_id: int) -> bool:
    """批量更新属性排序"""
    try:
        conn = sqlite3.connect(config.DATABASE_PATH)
        cursor = conn.cursor()
        
        for item in sort_data:
            attr_id = item.get('id')
            sort_order = item.get('sort_order')
            
            current_time = datetime.now().isoformat()
            cursor.execute("""
                UPDATE attribute_definitions 
                SET sort_order = ?, updated_at = ?, updated_by = ?
                WHERE id = ?
            """, (sort_order, current_time, updater_id, attr_id))
        
        conn.commit()
        
        log_info("属性排序更新成功", 
                updater_id=updater_id,
                updated_count=len(sort_data))
        
        return True
        
    except Exception as e:
        if conn:
            conn.rollback()
        log_error("属性排序更新失败", 
                 updater_id=updater_id,
                 error=str(e))
        raise
    finally:
        if conn:
            conn.close()