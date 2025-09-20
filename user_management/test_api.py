#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用户管理模块API测试脚本
测试所有新增的核心功能接口
"""

import requests
import json
import os
from typing import Dict, Any

# API基础URL
BASE_URL = "http://localhost:8000"

# 测试用户凭据
TEST_ADMIN = {
    "phone": "13800000000",
    "password": "admin123456"
}

class APITester:
    def __init__(self):
        self.token = None
        self.session = requests.Session()
    
    def login(self) -> bool:
        """登录获取token"""
        try:
            response = self.session.post(
                f"{BASE_URL}/api/v1/login/password",
                json=TEST_ADMIN
            )
            if response.status_code == 200:
                data = response.json()
                # 检查是否有token字段（直接返回格式）
                if "token" in data:
                    self.token = data.get("token")
                    self.session.headers.update({
                        "Authorization": f"Bearer {self.token}"
                    })
                    print("✅ 登录成功")
                    return True
                # 检查是否有包装格式
                elif data.get("success") and "data" in data:
                    self.token = data.get("data", {}).get("access_token")
                    self.session.headers.update({
                        "Authorization": f"Bearer {self.token}"
                    })
                    print("✅ 登录成功")
                    return True
                else:
                    print(f"❌ 登录失败: {data.get('message', '未知错误')}")
                    return False
            else:
                print(f"❌ 登录失败: {response.text}")
                return False
        except Exception as e:
            print(f"❌ 登录异常: {str(e)}")
            return False
    
    def test_user_management(self):
        """测试用户管理功能"""
        print("\n=== 测试用户管理功能 ===")
        
        # 1. 创建用户
        print("\n1. 测试创建用户")
        import time
        timestamp = int(time.time())
        user_data = {
            "username": f"testuser_{timestamp}",
            "phone": f"139{timestamp % 100000000:08d}",
            "email": f"testuser_{timestamp}@example.com",
            "real_name": "测试用户001",
            "role": "Student",
            "password": "Test123456"
        }
        
        response = self.session.post(f"{BASE_URL}/api/v1/users", json=user_data)
        if response.status_code == 200:
            result = response.json()
            user = result.get("data", {})
            user_id = user.get("id")
            print(f"✅ 用户创建成功，ID: {user_id}")
            
            # 2. 获取用户详情
            print("\n2. 测试获取用户详情")
            response = self.session.get(f"{BASE_URL}/api/v1/users/{user_id}")
            if response.status_code == 200:
                print("✅ 获取用户详情成功")
            else:
                print(f"❌ 获取用户详情失败: {response.text}")
            
            # 3. 更新用户信息
            print("\n3. 测试更新用户信息")
            import time
            timestamp = int(time.time())
            update_data = {
                "real_name": "测试用户001-已更新",
                "email": f"updated{timestamp}@example.com"
            }
            response = self.session.put(f"{BASE_URL}/api/v1/users/{user_id}", json=update_data)
            if response.status_code == 200:
                print("✅ 用户信息更新成功")
            else:
                print(f"❌ 用户信息更新失败: {response.text}")
            
            # 4. 获取用户列表
            print("\n4. 测试获取用户列表")
            response = self.session.get(f"{BASE_URL}/api/v1/users?page=1&page_size=10")
            if response.status_code == 200:
                result = response.json()
                users = result.get("data", {})
                total = users.get("total", 0)
                print(f"✅ 获取用户列表成功，共 {total} 个用户")
            else:
                print(f"❌ 获取用户列表失败: {response.text}")
            
            return user_id
        else:
            print(f"❌ 用户创建失败: {response.text}")
            return None
    
    def test_attribute_management(self):
        """测试属性管理功能"""
        print("\n=== 测试属性管理功能 ===")
        
        # 1. 创建属性定义
        print("\n1. 测试创建属性定义")
        import time
        timestamp = int(time.time())
        attr_data = {
            "name": f"test_skill_{timestamp}",
            "display_name": "技能等级",
            "attribute_type": "text",
            "is_required": False,
            "is_unique": False,
            "default_value": None,
            "validation_rules": None,
            "options": None,
            "sort_order": 0,
            "is_active": True,
            "description": "用户技能等级测试属性"
        }
        
        response = self.session.post(f"{BASE_URL}/api/v1/attributes", json=attr_data)
        if response.status_code == 200:
            result = response.json()
            attr = result.get("data", {})
            attr_id = attr.get("id")
            print(f"✅ 属性定义创建成功，ID: {attr_id}")
            
            # 2. 获取属性定义列表
            print("\n2. 测试获取属性定义列表")
            response = self.session.get(f"{BASE_URL}/api/v1/attributes")
            if response.status_code == 200:
                result = response.json()
                attrs = result.get("data", {})
                total = attrs.get("total", 0)
                print(f"✅ 获取属性定义列表成功，共 {total} 个属性")
            else:
                print(f"❌ 获取属性定义列表失败: {response.text}")
            
            # 3. 更新属性定义
            print("\n3. 测试更新属性定义")
            update_data = {
                "display_name": "技能等级-已更新",
                "description": "用户技能等级测试属性-已更新"
            }
            response = self.session.put(f"{BASE_URL}/api/v1/attributes/{attr_id}", json=update_data)
            if response.status_code == 200:
                print("✅ 属性定义更新成功")
            else:
                print(f"❌ 属性定义更新失败: {response.text}")
            
            return attr_id
        else:
            print(f"❌ 属性定义创建失败: {response.text}")
            return None
    
    def test_attribute_values(self, user_id: int, attr_id: int):
        """测试属性值管理功能"""
        print("\n=== 测试属性值管理功能 ===")
        
        if not user_id or not attr_id:
            print("❌ 缺少用户ID或属性ID，跳过属性值测试")
            return
        
        # 1. 设置用户属性值
        print("\n1. 测试设置用户属性值")
        value_data = {
            "attribute_id": attr_id,
            "value": "高级"
        }
        
        response = self.session.post(f"{BASE_URL}/api/v1/users/{user_id}/attributes", json=value_data)
        if response.status_code == 200:
            print("✅ 用户属性值设置成功")
            
            # 2. 获取用户属性值列表
            print("\n2. 测试获取用户属性值列表")
            response = self.session.get(f"{BASE_URL}/api/v1/users/{user_id}/attributes")
            if response.status_code == 200:
                attrs = response.json()
                print(f"✅ 获取用户属性值列表成功，共 {attrs.get('total', 0)} 个属性值")
            else:
                print(f"❌ 获取用户属性值列表失败: {response.text}")
            
            # 3. 批量设置用户属性值
            print("\n3. 测试批量设置用户属性值")
            batch_data = {
                "user_id": user_id,
                "attributes": [
                    {
                        "attribute_id": attr_id,
                        "value": "专家级"
                    }
                ]
            }
            response = self.session.post(f"{BASE_URL}/api/v1/users/{user_id}/attributes/batch", json=batch_data)
            if response.status_code == 200:
                result = response.json()
                print(f"✅ 批量设置属性值成功，成功: {result.get('success_count', 0)}，失败: {result.get('error_count', 0)}")
            else:
                print(f"❌ 批量设置属性值失败: {response.text}")
        else:
            print(f"❌ 用户属性值设置失败: {response.text}")
    
    def test_file_import(self):
        """测试文件导入功能"""
        print("\n=== 测试文件导入功能 ===")
        
        # 创建测试CSV文件
        test_csv_content = """username,phone,email,real_name,role
testimport001,13900000002,import001@example.com,导入测试用户001,Student
testimport002,13900000003,import002@example.com,导入测试用户002,Student"""
        
        test_file_path = "test_import.csv"
        with open(test_file_path, 'w', encoding='utf-8') as f:
            f.write(test_csv_content)
        
        try:
            # 1. 测试文件上传和导入
            print("\n1. 测试文件导入")
            with open(test_file_path, 'rb') as f:
                files = {'file': ('test_import.csv', f, 'text/csv')}
                response = self.session.post(f"{BASE_URL}/api/v1/import/users", files=files)
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ 文件导入成功，成功: {result.get('success_count', 0)}，失败: {result.get('error_count', 0)}")
            else:
                print(f"❌ 文件导入失败: {response.text}")
        
        finally:
            # 清理测试文件
            if os.path.exists(test_file_path):
                os.remove(test_file_path)
    
    def run_all_tests(self):
        """运行所有测试"""
        print("开始API功能测试...")
        
        # 登录
        if not self.login():
            print("❌ 登录失败，终止测试")
            return
        
        # 测试用户管理
        user_id = self.test_user_management()
        
        # 测试属性管理
        attr_id = self.test_attribute_management()
        
        # 测试属性值管理
        self.test_attribute_values(user_id, attr_id)
        
        # 测试文件导入
        self.test_file_import()
        
        # 测试配置管理
        self.test_config_management()
        
        print("\n=== 测试完成 ===")
    
    def test_config_management(self):
        """测试配置管理功能"""
        print("\n=== 测试配置管理功能 ===")
        
        # 1. 获取配置信息
        print("\n1. 测试获取配置信息")
        response = self.session.get(f"{BASE_URL}/api/v1/config")
        if response.status_code == 200:
            result = response.json()
            config = result.get("data", {})
            print(f"✅ 获取配置信息成功，配置项数量: {len(config)}")
        else:
            print(f"❌ 获取配置信息失败: {response.json()}")
        
        # 2. 验证配置有效性
        print("\n2. 测试验证配置有效性")
        response = self.session.post(f"{BASE_URL}/api/v1/config/validate")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 配置验证成功: {result}")
        else:
            print(f"❌ 配置验证失败: {response.json()}")
        
        # 3. 重新加载配置
        print("\n3. 测试重新加载配置")
        response = self.session.post(f"{BASE_URL}/api/v1/config/reload")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 配置重新加载成功: {result}")
        else:
            print(f"❌ 配置重新加载失败: {response.json()}")

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()