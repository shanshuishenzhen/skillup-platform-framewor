# database_setup.py

import sqlite3
import bcrypt
import time
from config import config

# --- 配置 ---
DB_NAME = config.DATABASE_PATH
SUPER_ADMIN_PHONE = config.SUPER_ADMIN_PHONE
SUPER_ADMIN_PASSWORD = config.SUPER_ADMIN_PASSWORD 

# --- 辅助函数 ---
def hash_password(password):
    """对密码进行哈希处理"""
    # 使用 bcrypt 算法
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed_password):
    """验证密码"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_connection(db_file):
    """创建并返回一个 SQLite 数据库连接对象"""
    conn = None
    try:
        # 使用 check_same_thread=False 允许 FastAPI 异步访问
        conn = sqlite3.connect(db_file, check_same_thread=False)
        return conn
    except sqlite3.Error as e:
        print(f"数据库连接失败: {e}")
    return conn

def create_tables(conn):
    """创建 users, attribute_definitions, 和 user_attribute_values 表"""
    cursor = conn.cursor()

    # 1. users 表 (SQLite 用 TEXT 代替 ENUM，用 INTEGER 代替 TIMESTAMP)
    users_table = f"""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL CHECK(role IN ('SuperAdmin', 'Admin', 'Student', 'Teacher')),
        status TEXT NOT NULL CHECK(status IN ('Active', 'Inactive')) DEFAULT 'Active',
        created_at INTEGER DEFAULT {int(time.time())},
        updated_at INTEGER DEFAULT {int(time.time())},
        last_login_at INTEGER
    );
    """

    # 2. attribute_definitions 表 (更新为完整的属性定义表结构)
    attr_def_table = """
    CREATE TABLE IF NOT EXISTS attribute_definitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        attribute_type TEXT NOT NULL,
        description TEXT,
        is_required BOOLEAN NOT NULL DEFAULT 0,
        is_unique BOOLEAN NOT NULL DEFAULT 0,
        default_value TEXT,
        validation_rules TEXT,
        options TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        created_by INTEGER,
        updated_by INTEGER
    );
    """
    
    # 3. user_attribute_values 表
    attr_values_table = """
    CREATE TABLE IF NOT EXISTS user_attribute_values (
        user_id INTEGER NOT NULL,
        attr_id INTEGER NOT NULL,
        attr_value TEXT NOT NULL,
        created_at INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, attr_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (attr_id) REFERENCES attribute_definitions(id) ON DELETE CASCADE
    );
    """
    
    # 4. permissions 表：定义所有可控操作
    permissions_table = """
    CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_name TEXT UNIQUE NOT NULL,
        description TEXT
    );
    """

    # 5. role_permissions 表：角色和权限的关联
    role_permissions_table = """
    CREATE TABLE IF NOT EXISTS role_permissions (
        role TEXT NOT NULL CHECK(role IN ('SuperAdmin', 'Admin', 'Student', 'Teacher')),
        permission_id INTEGER NOT NULL,
        PRIMARY KEY (role, permission_id),
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );
    """
    
    # 6. password_reset_codes 表：密码重置验证码
    password_reset_table = """
    CREATE TABLE IF NOT EXISTS password_reset_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        verification_code TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        verified INTEGER DEFAULT 0,
        reset_token TEXT,
        token_expires_at TEXT,
        used INTEGER DEFAULT 0,
        used_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """

    # 执行所有表创建
    try:
        cursor.execute(users_table)
        cursor.execute(attr_def_table)
        cursor.execute(attr_values_table)
        cursor.execute(permissions_table)
        cursor.execute(role_permissions_table)
        cursor.execute(password_reset_table)
        conn.commit()
        print("✅ 数据库表结构创建成功，已包含权限表和密码重置表。")
    except sqlite3.Error as e:
        print(f"创建表失败: {e}")

# --- 数据库连接 ---
from db_manager import db_manager, get_db_connection

# 向后兼容的全局连接对象
CONN = None

try:
    CONN = get_db_connection()
    print(f"✅ 数据库连接成功: {config.DATABASE_PATH}")
except Exception as e:
    print(f"❌ 数据库连接失败: {e}")
    CONN = None

# 初始化数据库
if CONN:
    create_tables(CONN)