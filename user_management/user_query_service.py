# user_query_service.py
# 用户查询服务模块

from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum
import math

from db_manager import get_db_connection
from exceptions import UserManagementException
from logger import log_info, log_warning, log_error

# --- 枚举定义 ---

class SortOrder(str, Enum):
    """排序方向枚举"""
    ASC = "asc"
    DESC = "desc"

class UserSortField(str, Enum):
    """用户排序字段枚举"""
    ID = "id"
    NAME = "name"
    PHONE_NUMBER = "phone_number"
    ROLE = "role"
    STATUS = "status"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"

# --- 查询模型 ---

class UserQueryParams(BaseModel):
    """用户查询参数模型"""
    # 分页参数
    page: int = Field(default=1, ge=1, description="页码，从1开始")
    page_size: int = Field(default=20, ge=1, le=100, description="每页数量，最大100")
    
    # 筛选参数
    name: Optional[str] = Field(None, description="姓名模糊搜索")
    phone_number: Optional[str] = Field(None, description="手机号模糊搜索")
    role: Optional[str] = Field(None, description="用户角色筛选")
    status: Optional[str] = Field(None, description="用户状态筛选")
    email: Optional[str] = Field(None, description="邮箱模糊搜索")
    
    # 时间范围筛选
    created_start: Optional[datetime] = Field(None, description="创建时间开始")
    created_end: Optional[datetime] = Field(None, description="创建时间结束")
    updated_start: Optional[datetime] = Field(None, description="更新时间开始")
    updated_end: Optional[datetime] = Field(None, description="更新时间结束")
    
    # 排序参数
    sort_field: UserSortField = Field(default=UserSortField.CREATED_AT, description="排序字段")
    sort_order: SortOrder = Field(default=SortOrder.DESC, description="排序方向")
    
    # 高级筛选
    include_deleted: bool = Field(default=False, description="是否包含已删除用户")
    ids: Optional[List[int]] = Field(None, description="指定用户ID列表")
    
    @validator('phone_number')
    def validate_phone_search(cls, v):
        """验证手机号搜索格式"""
        if v is not None:
            # 移除非数字字符用于搜索
            return ''.join(filter(str.isdigit, v))
        return v

class UserInfo(BaseModel):
    """用户信息模型"""
    id: int
    name: str
    phone_number: str
    role: str
    status: str
    email: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    
    # 扩展信息
    attributes: Optional[Dict[str, Any]] = None
    permissions: Optional[List[str]] = None

class PaginationInfo(BaseModel):
    """分页信息模型"""
    current_page: int
    page_size: int
    total_records: int
    total_pages: int
    has_previous: bool
    has_next: bool
    previous_page: Optional[int] = None
    next_page: Optional[int] = None

class UserQueryResult(BaseModel):
    """用户查询结果模型"""
    users: List[UserInfo]
    pagination: PaginationInfo
    filters_applied: Dict[str, Any]
    query_time: float
    total_count: int

# --- 查询构建器 ---

class UserQueryBuilder:
    """用户查询构建器"""
    
    def __init__(self):
        self.base_query = """
            SELECT u.id, u.name, u.phone_number, u.role, u.status, u.email,
                   u.created_at, u.updated_at, u.last_login_at
            FROM users u
        """
        self.count_query = "SELECT COUNT(*) FROM users u"
        self.where_conditions = []
        self.params = []
        self.joins = []
    
    def add_name_filter(self, name: str) -> 'UserQueryBuilder':
        """添加姓名筛选"""
        if name:
            self.where_conditions.append("u.name LIKE ?")
            self.params.append(f"%{name}%")
        return self
    
    def add_phone_filter(self, phone: str) -> 'UserQueryBuilder':
        """添加手机号筛选"""
        if phone:
            self.where_conditions.append("u.phone_number LIKE ?")
            self.params.append(f"%{phone}%")
        return self
    
    def add_role_filter(self, role: str) -> 'UserQueryBuilder':
        """添加角色筛选"""
        if role:
            self.where_conditions.append("u.role = ?")
            self.params.append(role)
        return self
    
    def add_status_filter(self, status: str) -> 'UserQueryBuilder':
        """添加状态筛选"""
        if status:
            self.where_conditions.append("u.status = ?")
            self.params.append(status)
        return self
    
    def add_email_filter(self, email: str) -> 'UserQueryBuilder':
        """添加邮箱筛选"""
        if email:
            self.where_conditions.append("u.email LIKE ?")
            self.params.append(f"%{email}%")
        return self
    
    def add_date_range_filter(self, field: str, start: datetime, end: datetime) -> 'UserQueryBuilder':
        """添加日期范围筛选"""
        if start:
            self.where_conditions.append(f"u.{field} >= ?")
            self.params.append(start.isoformat())
        if end:
            self.where_conditions.append(f"u.{field} <= ?")
            self.params.append(end.isoformat())
        return self
    
    def add_ids_filter(self, ids: List[int]) -> 'UserQueryBuilder':
        """添加ID列表筛选"""
        if ids:
            placeholders = ','.join(['?' for _ in ids])
            self.where_conditions.append(f"u.id IN ({placeholders})")
            self.params.extend(ids)
        return self
    
    def add_deleted_filter(self, include_deleted: bool) -> 'UserQueryBuilder':
        """添加删除状态筛选"""
        if not include_deleted:
            self.where_conditions.append("u.status != 'Deleted'")
        return self
    
    def build_query(self, sort_field: str, sort_order: str, limit: int, offset: int) -> Tuple[str, str, List]:
        """构建最终查询
        
        Returns:
            (数据查询SQL, 计数查询SQL, 参数列表)
        """
        # 构建WHERE子句
        where_clause = ""
        if self.where_conditions:
            where_clause = " WHERE " + " AND ".join(self.where_conditions)
        
        # 构建JOIN子句
        join_clause = " ".join(self.joins)
        
        # 构建ORDER BY子句
        order_clause = f" ORDER BY u.{sort_field} {sort_order.upper()}"
        
        # 构建LIMIT子句
        limit_clause = f" LIMIT {limit} OFFSET {offset}"
        
        # 完整的数据查询
        data_query = self.base_query + join_clause + where_clause + order_clause + limit_clause
        
        # 完整的计数查询
        count_query = self.count_query + join_clause + where_clause
        
        return data_query, count_query, self.params

# --- 核心查询函数 ---

def query_users(params: UserQueryParams) -> UserQueryResult:
    """查询用户列表
    
    Args:
        params: 查询参数
        
    Returns:
        查询结果
        
    Raises:
        UserManagementException: 查询失败
    """
    start_time = datetime.now()
    
    try:
        # 构建查询
        builder = UserQueryBuilder()
        
        # 添加筛选条件
        builder.add_name_filter(params.name)
        builder.add_phone_filter(params.phone_number)
        builder.add_role_filter(params.role)
        builder.add_status_filter(params.status)
        builder.add_email_filter(params.email)
        builder.add_date_range_filter('created_at', params.created_start, params.created_end)
        builder.add_date_range_filter('updated_at', params.updated_start, params.updated_end)
        builder.add_ids_filter(params.ids)
        builder.add_deleted_filter(params.include_deleted)
        
        # 计算分页参数
        offset = (params.page - 1) * params.page_size
        
        # 构建SQL查询
        data_query, count_query, query_params = builder.build_query(
            params.sort_field.value,
            params.sort_order.value,
            params.page_size,
            offset
        )
        
        log_info("执行用户查询", 
                page=params.page,
                page_size=params.page_size,
                filters=params.dict(exclude_none=True))
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 执行计数查询
            cursor.execute(count_query, query_params)
            total_count = cursor.fetchone()[0]
            
            # 执行数据查询
            cursor.execute(data_query, query_params)
            rows = cursor.fetchall()
            
            # 转换为用户信息对象
            users = []
            for row in rows:
                user = UserInfo(
                    id=row[0],
                    name=row[1],
                    phone_number=row[2],
                    role=row[3],
                    status=row[4],
                    email=row[5],
                    created_at=datetime.fromisoformat(row[6]) if row[6] else None,
                    updated_at=datetime.fromisoformat(row[7]) if row[7] else None,
                    last_login_at=datetime.fromisoformat(row[8]) if row[8] else None
                )
                users.append(user)
        
        # 计算分页信息
        total_pages = math.ceil(total_count / params.page_size) if total_count > 0 else 0
        has_previous = params.page > 1
        has_next = params.page < total_pages
        
        pagination = PaginationInfo(
            current_page=params.page,
            page_size=params.page_size,
            total_records=total_count,
            total_pages=total_pages,
            has_previous=has_previous,
            has_next=has_next,
            previous_page=params.page - 1 if has_previous else None,
            next_page=params.page + 1 if has_next else None
        )
        
        # 计算查询时间
        query_time = (datetime.now() - start_time).total_seconds()
        
        # 记录应用的筛选条件
        filters_applied = {k: v for k, v in params.dict().items() 
                          if v is not None and k not in ['page', 'page_size', 'sort_field', 'sort_order']}
        
        result = UserQueryResult(
            users=users,
            pagination=pagination,
            filters_applied=filters_applied,
            query_time=query_time,
            total_count=total_count
        )
        
        log_info("用户查询完成", 
                total_count=total_count,
                returned_count=len(users),
                query_time=query_time,
                page=params.page)
        
        return result
        
    except Exception as e:
        log_error("用户查询失败", error=str(e), params=params.dict())
        raise UserManagementException(f"用户查询失败: {str(e)}")

# --- 用户详情查询 ---

def get_user_by_id(user_id: int, include_attributes: bool = False, include_permissions: bool = False) -> Optional[UserInfo]:
    """根据ID获取用户详情
    
    Args:
        user_id: 用户ID
        include_attributes: 是否包含用户属性
        include_permissions: 是否包含用户权限
        
    Returns:
        用户信息，如果不存在则返回None
        
    Raises:
        UserManagementException: 查询失败
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 查询基本用户信息
            cursor.execute("""
                SELECT id, name, phone_number, role, status, email,
                       created_at, updated_at, last_login_at
                FROM users 
                WHERE id = ?
            """, (user_id,))
            
            row = cursor.fetchone()
            if not row:
                return None
            
            user = UserInfo(
                id=row[0],
                name=row[1],
                phone_number=row[2],
                role=row[3],
                status=row[4],
                email=row[5],
                created_at=datetime.fromisoformat(row[6]) if row[6] else None,
                updated_at=datetime.fromisoformat(row[7]) if row[7] else None,
                last_login_at=datetime.fromisoformat(row[8]) if row[8] else None
            )
            
            # 查询用户属性
            if include_attributes:
                cursor.execute("""
                    SELECT ad.name, uav.value
                    FROM user_attribute_values uav
                    JOIN attribute_definitions ad ON uav.attribute_id = ad.id
                    WHERE uav.user_id = ?
                """, (user_id,))
                
                attributes = {}
                for attr_row in cursor.fetchall():
                    attributes[attr_row[0]] = attr_row[1]
                user.attributes = attributes
            
            # 查询用户权限
            if include_permissions:
                cursor.execute("""
                    SELECT p.name
                    FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role = ?
                """, (user.role,))
                
                permissions = [perm_row[0] for perm_row in cursor.fetchall()]
                user.permissions = permissions
            
            log_info("获取用户详情成功", user_id=user_id, include_attrs=include_attributes, include_perms=include_permissions)
            return user
            
    except Exception as e:
        log_error("获取用户详情失败", user_id=user_id, error=str(e))
        raise UserManagementException(f"获取用户详情失败: {str(e)}")

# --- 统计查询 ---

def get_user_statistics() -> Dict[str, Any]:
    """获取用户统计信息
    
    Returns:
        统计信息字典
        
    Raises:
        UserManagementException: 查询失败
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # 总用户数
            cursor.execute("SELECT COUNT(*) FROM users WHERE status != 'Deleted'")
            total_users = cursor.fetchone()[0]
            
            # 按角色统计
            cursor.execute("""
                SELECT role, COUNT(*) 
                FROM users 
                WHERE status != 'Deleted'
                GROUP BY role
            """)
            role_stats = {row[0]: row[1] for row in cursor.fetchall()}
            
            # 按状态统计
            cursor.execute("""
                SELECT status, COUNT(*) 
                FROM users 
                GROUP BY status
            """)
            status_stats = {row[0]: row[1] for row in cursor.fetchall()}
            
            # 今日新增用户
            cursor.execute("""
                SELECT COUNT(*) 
                FROM users 
                WHERE DATE(created_at) = DATE('now')
            """)
            today_new_users = cursor.fetchone()[0]
            
            # 本月新增用户
            cursor.execute("""
                SELECT COUNT(*) 
                FROM users 
                WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
            """)
            month_new_users = cursor.fetchone()[0]
            
            statistics = {
                'total_users': total_users,
                'role_distribution': role_stats,
                'status_distribution': status_stats,
                'today_new_users': today_new_users,
                'month_new_users': month_new_users,
                'generated_at': datetime.now().isoformat()
            }
            
            log_info("获取用户统计信息成功", total_users=total_users)
            return statistics
            
    except Exception as e:
        log_error("获取用户统计信息失败", error=str(e))
        raise UserManagementException(f"获取用户统计信息失败: {str(e)}")