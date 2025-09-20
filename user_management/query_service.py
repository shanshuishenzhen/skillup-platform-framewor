# query_service.py
# 用户查询筛选和分页服务模块

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
import sqlite3

from db_manager import get_db_connection
from exceptions import UserManagementException, ValidationException
from logger import log_info, log_warning, log_error
from validation_models import validate_id, sanitize_input
from user_crud_service import UserResponse, UserStatus, UserRole

# --- 查询参数模型 ---

class UserSortField(str, Enum):
    """用户排序字段枚举"""
    ID = "id"
    NAME = "name"
    PHONE_NUMBER = "phone_number"
    EMAIL = "email"
    ROLE = "role"
    STATUS = "status"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    LAST_LOGIN_AT = "last_login_at"

class SortOrder(str, Enum):
    """排序方向枚举"""
    ASC = "asc"
    DESC = "desc"

class UserQueryRequest(BaseModel):
    """用户查询请求模型"""
    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=20, ge=1, le=100, description="每页数量")
    
    # 筛选条件
    search: Optional[str] = Field(None, description="搜索关键词（姓名、手机号、邮箱）")
    role: Optional[UserRole] = Field(None, description="用户角色")
    status: Optional[UserStatus] = Field(None, description="用户状态")
    
    # 时间范围筛选
    created_start: Optional[datetime] = Field(None, description="创建时间开始")
    created_end: Optional[datetime] = Field(None, description="创建时间结束")
    last_login_start: Optional[datetime] = Field(None, description="最后登录时间开始")
    last_login_end: Optional[datetime] = Field(None, description="最后登录时间结束")
    
    # 排序
    sort_field: UserSortField = Field(default=UserSortField.CREATED_AT, description="排序字段")
    sort_order: SortOrder = Field(default=SortOrder.DESC, description="排序方向")
    
    # 高级筛选
    has_email: Optional[bool] = Field(None, description="是否有邮箱")
    has_attributes: Optional[bool] = Field(None, description="是否有自定义属性")
    attribute_filters: Optional[Dict[str, Any]] = Field(None, description="属性值筛选")

class UserQueryResponse(BaseModel):
    """用户查询响应模型"""
    users: List[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool

class UserStatistics(BaseModel):
    """用户统计信息模型"""
    total_users: int
    active_users: int
    inactive_users: int
    suspended_users: int
    deleted_users: int
    
    # 按角色统计
    role_stats: Dict[str, int]
    
    # 时间统计
    new_users_today: int
    new_users_this_week: int
    new_users_this_month: int
    
    # 登录统计
    logged_in_today: int
    logged_in_this_week: int
    never_logged_in: int

# --- 核心查询函数 ---

def query_users(query_params: UserQueryRequest) -> UserQueryResponse:
    """查询用户列表
    
    Args:
        query_params: 查询参数
        
    Returns:
        查询结果
        
    Raises:
        UserManagementException: 查询失败
        ValidationException: 参数验证失败
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 构建查询条件
            conditions, params = _build_query_conditions(query_params)
            
            # 获取总数
            count_query = f"""
                SELECT COUNT(DISTINCT u.id)
                FROM users u
                LEFT JOIN user_attribute_values uav ON u.id = uav.user_id
                LEFT JOIN attribute_definitions ad ON uav.attribute_id = ad.id
                {conditions['where_clause']}
            """
            cursor.execute(count_query, params)
            total = cursor.fetchone()[0]
            
            # 计算分页信息
            total_pages = (total + query_params.page_size - 1) // query_params.page_size
            offset = (query_params.page - 1) * query_params.page_size
            
            # 获取用户数据
            data_query = f"""
                SELECT DISTINCT u.id, u.name, u.phone_number, u.email, u.role, u.status,
                       u.created_at, u.updated_at, u.last_login_at
                FROM users u
                LEFT JOIN user_attribute_values uav ON u.id = uav.user_id
                LEFT JOIN attribute_definitions ad ON uav.attribute_id = ad.id
                {conditions['where_clause']}
                ORDER BY u.{query_params.sort_field.value} {query_params.sort_order.value}
                LIMIT ? OFFSET ?
            """
            cursor.execute(data_query, params + [query_params.page_size, offset])
            
            users = []
            for row in cursor.fetchall():
                # 获取用户属性
                user_id = row[0]
                attributes = _get_user_attributes(cursor, user_id)
                
                user = UserResponse(
                    id=row[0],
                    name=row[1],
                    phone_number=row[2],
                    email=row[3],
                    role=row[4],
                    status=row[5],
                    created_at=datetime.fromisoformat(row[6]) if row[6] else None,
                    updated_at=datetime.fromisoformat(row[7]) if row[7] else None,
                    last_login_at=datetime.fromisoformat(row[8]) if row[8] else None,
                    attributes=attributes if attributes else None
                )
                users.append(user)
            
            result = UserQueryResponse(
                users=users,
                total=total,
                page=query_params.page,
                page_size=query_params.page_size,
                total_pages=total_pages,
                has_next=query_params.page < total_pages,
                has_prev=query_params.page > 1
            )
            
            log_info("用户查询成功", 
                    page=query_params.page,
                    page_size=query_params.page_size,
                    total=total,
                    filters=query_params.dict(exclude_none=True))
            
            return result
            
    except Exception as e:
        log_error("用户查询失败", 
                 query_params=query_params.dict(exclude_none=True),
                 error=str(e))
        raise UserManagementException(f"用户查询失败: {str(e)}")

def get_user_statistics() -> UserStatistics:
    """获取用户统计信息
    
    Returns:
        用户统计信息
        
    Raises:
        UserManagementException: 获取失败
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 基础统计
            cursor.execute("SELECT COUNT(*) FROM users")
            total_users = cursor.fetchone()[0]
            
            # 按状态统计
            cursor.execute("""
                SELECT status, COUNT(*) 
                FROM users 
                GROUP BY status
            """)
            status_stats = dict(cursor.fetchall())
            
            # 按角色统计
            cursor.execute("""
                SELECT role, COUNT(*) 
                FROM users 
                GROUP BY role
            """)
            role_stats = dict(cursor.fetchall())
            
            # 时间统计
            cursor.execute("""
                SELECT 
                    COUNT(CASE WHEN DATE(created_at) = DATE('now') THEN 1 END) as today,
                    COUNT(CASE WHEN DATE(created_at) >= DATE('now', '-7 days') THEN 1 END) as week,
                    COUNT(CASE WHEN DATE(created_at) >= DATE('now', '-30 days') THEN 1 END) as month
                FROM users
            """)
            time_stats = cursor.fetchone()
            
            # 登录统计
            cursor.execute("""
                SELECT 
                    COUNT(CASE WHEN DATE(last_login_at) = DATE('now') THEN 1 END) as today,
                    COUNT(CASE WHEN DATE(last_login_at) >= DATE('now', '-7 days') THEN 1 END) as week,
                    COUNT(CASE WHEN last_login_at IS NULL THEN 1 END) as never
                FROM users
            """)
            login_stats = cursor.fetchone()
            
            statistics = UserStatistics(
                total_users=total_users,
                active_users=status_stats.get('Active', 0),
                inactive_users=status_stats.get('Inactive', 0),
                suspended_users=status_stats.get('Suspended', 0),
                deleted_users=status_stats.get('Deleted', 0),
                role_stats=role_stats,
                new_users_today=time_stats[0] or 0,
                new_users_this_week=time_stats[1] or 0,
                new_users_this_month=time_stats[2] or 0,
                logged_in_today=login_stats[0] or 0,
                logged_in_this_week=login_stats[1] or 0,
                never_logged_in=login_stats[2] or 0
            )
            
            log_info("用户统计信息获取成功", total_users=total_users)
            
            return statistics
            
    except Exception as e:
        log_error("获取用户统计信息失败", error=str(e))
        raise UserManagementException(f"获取用户统计信息失败: {str(e)}")

def search_users_by_keyword(keyword: str, limit: int = 10) -> List[UserResponse]:
    """根据关键词搜索用户
    
    Args:
        keyword: 搜索关键词
        limit: 返回数量限制
        
    Returns:
        匹配的用户列表
        
    Raises:
        UserManagementException: 搜索失败
    """
    try:
        keyword = sanitize_input(keyword, 100)
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            search_pattern = f"%{keyword}%"
            cursor.execute("""
                SELECT id, name, phone_number, email, role, status,
                       created_at, updated_at, last_login_at
                FROM users
                WHERE (name LIKE ? OR phone_number LIKE ? OR email LIKE ?)
                  AND status != 'Deleted'
                ORDER BY 
                    CASE 
                        WHEN name LIKE ? THEN 1
                        WHEN phone_number LIKE ? THEN 2
                        WHEN email LIKE ? THEN 3
                        ELSE 4
                    END,
                    name ASC
                LIMIT ?
            """, [search_pattern] * 6 + [limit])
            
            users = []
            for row in cursor.fetchall():
                user_id = row[0]
                attributes = _get_user_attributes(cursor, user_id)
                
                user = UserResponse(
                    id=row[0],
                    name=row[1],
                    phone_number=row[2],
                    email=row[3],
                    role=row[4],
                    status=row[5],
                    created_at=datetime.fromisoformat(row[6]) if row[6] else None,
                    updated_at=datetime.fromisoformat(row[7]) if row[7] else None,
                    last_login_at=datetime.fromisoformat(row[8]) if row[8] else None,
                    attributes=attributes if attributes else None
                )
                users.append(user)
            
            log_info("用户关键词搜索成功", 
                    keyword=keyword,
                    result_count=len(users))
            
            return users
            
    except Exception as e:
        log_error("用户关键词搜索失败", 
                 keyword=keyword,
                 error=str(e))
        raise UserManagementException(f"用户搜索失败: {str(e)}")

# --- 辅助函数 ---

def _build_query_conditions(query_params: UserQueryRequest) -> Dict[str, Any]:
    """构建查询条件"""
    conditions = []
    params = []
    
    # 搜索关键词
    if query_params.search:
        search_pattern = f"%{query_params.search}%"
        conditions.append("(u.name LIKE ? OR u.phone_number LIKE ? OR u.email LIKE ?)")
        params.extend([search_pattern, search_pattern, search_pattern])
    
    # 角色筛选
    if query_params.role:
        conditions.append("u.role = ?")
        params.append(query_params.role.value)
    
    # 状态筛选
    if query_params.status:
        conditions.append("u.status = ?")
        params.append(query_params.status.value)
    
    # 创建时间范围
    if query_params.created_start:
        conditions.append("u.created_at >= ?")
        params.append(query_params.created_start.isoformat())
    
    if query_params.created_end:
        conditions.append("u.created_at <= ?")
        params.append(query_params.created_end.isoformat())
    
    # 最后登录时间范围
    if query_params.last_login_start:
        conditions.append("u.last_login_at >= ?")
        params.append(query_params.last_login_start.isoformat())
    
    if query_params.last_login_end:
        conditions.append("u.last_login_at <= ?")
        params.append(query_params.last_login_end.isoformat())
    
    # 邮箱筛选
    if query_params.has_email is not None:
        if query_params.has_email:
            conditions.append("u.email IS NOT NULL AND u.email != ''")
        else:
            conditions.append("(u.email IS NULL OR u.email = '')")
    
    # 属性筛选
    if query_params.has_attributes is not None:
        if query_params.has_attributes:
            conditions.append("EXISTS (SELECT 1 FROM user_attribute_values WHERE user_id = u.id)")
        else:
            conditions.append("NOT EXISTS (SELECT 1 FROM user_attribute_values WHERE user_id = u.id)")
    
    # 属性值筛选
    if query_params.attribute_filters:
        for attr_name, attr_value in query_params.attribute_filters.items():
            conditions.append("""
                EXISTS (
                    SELECT 1 FROM user_attribute_values uav2
                    JOIN attribute_definitions ad2 ON uav2.attribute_id = ad2.id
                    WHERE uav2.user_id = u.id AND ad2.name = ? AND uav2.value = ?
                )
            """)
            params.extend([attr_name, str(attr_value)])
    
    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
    
    return {
        "where_clause": where_clause,
        "conditions": conditions,
        "params": params
    }, params

def _get_user_attributes(cursor, user_id: int) -> Dict[str, Any]:
    """获取用户属性"""
    cursor.execute("""
        SELECT ad.name, uav.value
        FROM user_attribute_values uav
        JOIN attribute_definitions ad ON uav.attribute_id = ad.id
        WHERE uav.user_id = ?
    """, (user_id,))
    
    attributes = {}
    for row in cursor.fetchall():
        attributes[row[0]] = row[1]
    
    return attributes