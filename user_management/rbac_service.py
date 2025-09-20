# rbac_service.py

from fastapi import Depends, HTTPException, status
from typing import List, Dict, Any, Set
from auth_service import get_current_user_payload # 依赖 JWT 验证
from exceptions import AuthorizationException, DatabaseException
from logger import log_info, log_warning, log_error, log_debug
from error_handler import handle_exceptions, handle_database_errors

# --- 权限缓存 (实际项目中应使用 Redis 或更复杂的缓存机制) ---
# 简单的内存缓存，存储 {role: [permission_key_name, ...]}
ROLE_PERMISSIONS_CACHE: Dict[str, List[str]] = {} 

@handle_database_errors
def load_role_permissions_from_db():
    """从数据库加载角色权限映射
    
    Raises:
        DatabaseException: 数据库操作失败
    """
    from db_manager import db_manager
    
    log_info("开始加载角色权限映射")
    
    # 复杂查询：关联 role_permissions 表和 permissions 表
    sql = """
    SELECT rp.role, p.key_name 
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id;
    """
    
    try:
        results = db_manager.execute_query(sql, fetch_all=True)
        
        # 构建缓存结构
        permissions_map = {}
        for role, key_name in results:
            if role not in permissions_map:
                permissions_map[role] = []
            permissions_map[role].append(key_name)
        
        # 更新全局缓存
        global ROLE_PERMISSIONS_CACHE
        ROLE_PERMISSIONS_CACHE = permissions_map
        
        log_info("角色权限映射加载完成", roles_count=len(permissions_map))
        log_debug("权限映射详情", permissions=permissions_map)
        
        return permissions_map
        
    except Exception as e:
        log_error("加载角色权限映射失败", error=str(e))
        raise DatabaseException(f"加载角色权限映射失败: {str(e)}")

# 在应用启动时加载权限
load_role_permissions_from_db()


def permission_required(required_permission: str):
    """
    FastAPI 依赖函数：检查当前用户是否拥有指定的权限。
    """
    # 这个内部函数才是真正的依赖项
    def permission_checker(current_user: Dict[str, Any] = Depends(get_current_user_payload)):
        user_role = current_user.get("role")
        
        # 1. 超级管理员豁免
        if user_role == 'SuperAdmin':
            return True

        # 2. 获取角色的权限列表 (从缓存中获取)
        user_permissions = ROLE_PERMISSIONS_CACHE.get(user_role, [])
        
        # 3. 检查是否拥有权限
        if required_permission not in user_permissions:
            # 权限不足，返回 403 Forbidden
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"权限不足：需要 '{required_permission}' 权限"
            )
        return True # 检查通过
        
    return permission_checker

# 别名函数，为了兼容性
require_permission = permission_required