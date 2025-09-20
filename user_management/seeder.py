# seeder.py

import sqlite3
import json
import time
from database_setup import hash_password
from db_manager import db_manager, get_db_cursor, get_db_transaction
from exceptions import DatabaseException, ValidationException
from logger import log_info, log_warning, log_error
from error_handler import handle_exceptions, handle_database_errors
from config import config

# 从配置获取超级管理员信息
SUPER_ADMIN_PHONE = config.SUPER_ADMIN_PHONE
SUPER_ADMIN_PASSWORD = config.SUPER_ADMIN_PASSWORD

@handle_database_errors
def seed_super_admin():
    """创建超级管理员账户
    
    Raises:
        DatabaseException: 数据库操作失败
        ValidationException: 配置验证失败
    """
    
    if not config.SUPER_ADMIN_PHONE:
        raise ValidationException("超级管理员手机号未配置")
    
    log_info("开始创建超级管理员", phone=config.SUPER_ADMIN_PHONE)
    
    # 检查是否已存在超级管理员
    check_query = "SELECT COUNT(*) as count FROM users WHERE role = 'SuperAdmin'"
    result = db_manager.execute_query(check_query, fetch_one=True)
    
    if result and result['count'] > 0:
        log_info("超级管理员已存在，跳过创建")
        return
    
    # 创建超级管理员
    try:
        # 生成密码哈希
        password_hash = hash_password(config.SUPER_ADMIN_PASSWORD or "admin123")
        
        with get_db_transaction() as cursor:
            # 插入超级管理员用户
            cursor.execute(
                "INSERT INTO users (phone_number, name, role, password_hash, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (config.SUPER_ADMIN_PHONE, "超级管理员", "SuperAdmin", password_hash, "Active", int(time.time()), int(time.time()))
            )
            
        log_info("超级管理员创建成功", phone=config.SUPER_ADMIN_PHONE)
        
    except Exception as e:
        log_error("创建超级管理员失败", error=str(e), phone=config.SUPER_ADMIN_PHONE)
        raise DatabaseException(f"创建超级管理员失败: {str(e)}")


@handle_database_errors
def seed_attribute_definitions():
    """插入基础的动态属性定义
    
    Raises:
        DatabaseException: 数据库操作失败
    """
    
    log_info("开始插入属性定义")
    
    definitions = [
        # name, display_name, attribute_type, description, is_required, is_unique, default_value, validation_rules, options, sort_order, is_active, created_by, updated_by
        ('gender', '性别', 'enum', '用户性别', False, False, None, None, json.dumps({"1": "男", "2": "女"}), 1, True, 1, 1),
        ('work_location', '工作地点', 'string', '用户工作地点', False, False, None, None, None, 2, True, 1, 1),
    ]

    insert_sql = """
    INSERT OR IGNORE INTO attribute_definitions 
    (name, display_name, attribute_type, description, is_required, is_unique, default_value, validation_rules, options, sort_order, is_active, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """
    
    try:
        with get_db_transaction() as cursor:
            cursor.executemany(insert_sql, definitions)
            
        log_info("属性定义插入成功", definitions_count=len(definitions))
        
    except Exception as e:
        log_error("属性定义插入失败", error=str(e))
        raise DatabaseException(f"属性定义插入失败: {str(e)}")


def run_seeder():
    """运行初始化脚本"""
    try:
        log_info("开始数据库初始化")
        seed_super_admin()
        seed_attribute_definitions()
        log_info("数据库初始化完成")
    except Exception as e:
        log_error("数据库初始化失败", error=str(e))
        raise

if __name__ == '__main__':
    run_seeder()

# --- seeder.py 文件新增内容（函数定义） ---

@handle_database_errors
def seed_permissions():
    """插入系统的所有基础权限定义
    
    Raises:
        DatabaseException: 数据库操作失败
    """
    
    log_info("开始插入权限定义")
    
    permissions = [
        # (key_name, description)
        ('user:create', '允许管理员创建新账户'),
        ('user:read_all', '允许管理员查看所有用户列表'),
        ('enroll:submit', '允许学员提交报名表单'),
        ('course:view_all', '允许学员查看所有课程列表'),
        ('exam:create', '允许教师创建和发布考试'),
    ]
    
    try:
        with get_db_transaction() as cursor:
            insert_sql = "INSERT OR IGNORE INTO permissions (key_name, description) VALUES (?, ?);"
            cursor.executemany(insert_sql, permissions)
            
        log_info("权限定义插入成功", permissions_count=len(permissions))
        
    except Exception as e:
        log_error("权限定义插入失败", error=str(e))
        raise DatabaseException(f"权限定义插入失败: {str(e)}")

# ... (在 run_seeder 函数中调用)

# --- seeder.py 文件新增内容（函数定义） ---

@handle_database_errors
def seed_role_permissions():
    """将权限分配给角色
    
    Raises:
        DatabaseException: 数据库操作失败
    """
    
    log_info("开始建立角色权限关联")
    
    # 获取权限ID
    perms_result = db_manager.execute_query("SELECT id, key_name FROM permissions")
    perms_map = {row['key_name']: row['id'] for row in perms_result}

    # 定义角色和权限的映射
    role_permissions_data = []

    # 1. Admin 权限
    admin_perms = ['user:create', 'user:read_all', 'course:view_all']
    for perm_key in admin_perms:
        if perm_key in perms_map:
            role_permissions_data.append(('Admin', perms_map[perm_key]))
            
    # 2. Student 权限
    student_perms = ['enroll:submit', 'course:view_all']
    for perm_key in student_perms:
        if perm_key in perms_map:
            role_permissions_data.append(('Student', perms_map[perm_key]))
            
    # 3. SuperAdmin 权限：不需要在这里分配，因为代码中会直接豁免
    
    try:
        with get_db_transaction() as cursor:
            insert_sql = "INSERT OR IGNORE INTO role_permissions (role, permission_id) VALUES (?, ?);"
            cursor.executemany(insert_sql, role_permissions_data)
            
        log_info("角色权限关联插入成功", associations_count=len(role_permissions_data))
        
    except Exception as e:
        log_error("角色权限关联插入失败", error=str(e))
        raise DatabaseException(f"角色权限关联插入失败: {str(e)}")
        
# --- seeder.py 更新 run_seeder 函数 ---