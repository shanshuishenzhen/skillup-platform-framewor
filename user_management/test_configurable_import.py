#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
定制化配置化用户导入表格功能测试脚本
测试功能：
1. 文件预览功能
2. 智能字段映射
3. 配置化导入
4. 批量用户导入
5. 错误处理和报告
6. 重复数据处理
"""

import os
import sys
import json
import requests
import pandas as pd
import tempfile
from datetime import datetime
from typing import Dict, List, Any

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

class ConfigurableImportTester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        self.temp_files = []
        
    def setup_auth(self):
        """设置认证"""
        try:
            # 使用管理员账号登录
            login_data = {
                "phone": "13800000000",
                "password": "admin123456"
            }
            response = self.session.post(f"{self.base_url}/api/v1/login/password", json=login_data)
            if response.status_code == 200:
                token = response.json().get("token")
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                print("✓ 认证设置成功")
                return True
            else:
                print(f"✗ 认证失败: {response.text}")
                return False
        except Exception as e:
            print(f"✗ 认证异常: {str(e)}")
            return False
    
    def create_test_excel_file(self) -> str:
        """创建测试用Excel文件"""
        try:
            # 创建测试数据
            test_data = {
                '姓名': ['张三', '李四', '王五', '赵六', '钱七'],
                '手机号': ['13800138001', '13800138002', '13800138003', '13800138004', '13800138005'],
                '邮箱': ['zhangsan@test.com', 'lisi@test.com', 'wangwu@test.com', 'zhaoliu@test.com', 'qianqi@test.com'],
                '角色': ['学员', '教师', '学员', '管理员', '学员'],
                '状态': ['激活', '激活', '禁用', '激活', '激活'],
                '部门': ['技术部', '教学部', '技术部', '管理部', '销售部'],
                '入职时间': ['2023-01-15', '2023-02-20', '2023-03-10', '2023-01-01', '2023-04-05'],
                '技能等级': ['高级', '中级', '初级', '专家', '中级'],
                '备注': ['Python开发', 'Java教学', 'Web前端', '系统管理', '市场推广']
            }
            
            df = pd.DataFrame(test_data)
            temp_file = tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False)
            df.to_excel(temp_file.name, index=False)
            self.temp_files.append(temp_file.name)
            print(f"✓ 创建测试Excel文件: {temp_file.name}")
            return temp_file.name
        except Exception as e:
            print(f"✗ 创建Excel文件失败: {str(e)}")
            return None
    
    def create_test_csv_file(self) -> str:
        """创建测试用CSV文件"""
        try:
            # 创建测试数据（包含一些错误数据用于测试错误处理）
            test_data = {
                'name': ['测试用户1', '测试用户2', '测试用户3', '', '测试用户5'],  # 包含空姓名
                'phone': ['13900139001', '13900139002', 'invalid_phone', '13900139004', '13900139005'],  # 包含无效手机号
                'email': ['test1@example.com', 'test2@example.com', 'invalid_email', 'test4@example.com', 'test5@example.com'],  # 包含无效邮箱
                'role': ['student', 'teacher', 'student', 'admin', 'student'],
                'status': ['active', 'active', 'inactive', 'active', 'active'],
                'department': ['IT', 'Education', 'IT', 'Management', 'Sales'],
                'join_date': ['2023-05-01', '2023-05-02', '2023-05-03', '2023-05-04', '2023-05-05'],
                'skill_level': ['intermediate', 'advanced', 'beginner', 'expert', 'intermediate']
            }
            
            df = pd.DataFrame(test_data)
            temp_file = tempfile.NamedTemporaryFile(suffix='.csv', delete=False, mode='w', encoding='utf-8')
            df.to_csv(temp_file.name, index=False)
            self.temp_files.append(temp_file.name)
            print(f"✓ 创建测试CSV文件: {temp_file.name}")
            return temp_file.name
        except Exception as e:
            print(f"✗ 创建CSV文件失败: {str(e)}")
            return None
    
    def test_file_preview(self, file_path: str, file_type: str) -> bool:
        """测试文件预览功能"""
        try:
            print(f"\n=== 测试{file_type}文件预览功能 ===")
            
            with open(file_path, 'rb') as f:
                files = {'file': (os.path.basename(file_path), f, 'application/octet-stream')}
                data = {'file_type': file_type.lower()}
                
                response = self.session.post(
                    f"{self.base_url}/api/v1/users/import/preview",
                    files=files,
                    data=data
                )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✓ 文件预览成功")
                print(f"  - 检测到列数: {len(result.get('columns', []))}")
                print(f"  - 列名: {result.get('columns', [])}")
                print(f"  - 数据行数: {len(result.get('preview_data', []))}")
                print(f"  - 字段映射建议: {len(result.get('suggested_mappings', {}))} 个")
                
                self.test_results.append({
                    'test': f'{file_type}文件预览',
                    'status': 'PASS',
                    'details': f"成功预览{len(result.get('columns', []))}列数据"
                })
                return True
            else:
                print(f"✗ 文件预览失败: {response.status_code} - {response.text}")
                self.test_results.append({
                    'test': f'{file_type}文件预览',
                    'status': 'FAIL',
                    'details': f"HTTP {response.status_code}: {response.text}"
                })
                return False
                
        except Exception as e:
            print(f"✗ 文件预览异常: {str(e)}")
            self.test_results.append({
                'test': f'{file_type}文件预览',
                'status': 'ERROR',
                'details': str(e)
            })
            return False
    
    def test_field_mapping(self, file_path: str, file_type: str) -> Dict[str, Any]:
        """测试智能字段映射功能"""
        try:
            print(f"\n=== 测试{file_type}智能字段映射功能 ===")
            
            with open(file_path, 'rb') as f:
                files = {'file': (os.path.basename(file_path), f, 'application/octet-stream')}
                data = {'file_type': file_type.lower()}
                
                response = self.session.post(
                    f"{self.base_url}/api/v1/users/import/preview",
                    files=files,
                    data=data
                )
            
            if response.status_code == 200:
                result = response.json()
                suggested_mappings = result.get('suggested_mappings', {})
                
                print(f"✓ 智能字段映射成功")
                print(f"  - 建议映射数量: {len(suggested_mappings)}")
                for file_col, sys_field in suggested_mappings.items():
                    print(f"  - {file_col} -> {sys_field}")
                
                self.test_results.append({
                    'test': f'{file_type}智能字段映射',
                    'status': 'PASS',
                    'details': f"成功生成{len(suggested_mappings)}个字段映射建议"
                })
                return suggested_mappings
            else:
                print(f"✗ 智能字段映射失败: {response.status_code} - {response.text}")
                self.test_results.append({
                    'test': f'{file_type}智能字段映射',
                    'status': 'FAIL',
                    'details': f"HTTP {response.status_code}: {response.text}"
                })
                return {}
                
        except Exception as e:
            print(f"✗ 智能字段映射异常: {str(e)}")
            self.test_results.append({
                'test': f'{file_type}智能字段映射',
                'status': 'ERROR',
                'details': str(e)
            })
            return {}
    
    def test_batch_import(self, file_path: str, file_type: str, field_mappings: Dict[str, str]) -> bool:
        """测试批量用户导入功能"""
        try:
            print(f"\n=== 测试{file_type}批量用户导入功能 ===")
            
            with open(file_path, 'rb') as f:
                files = {'file': (os.path.basename(file_path), f, 'application/octet-stream')}
                data = {
                    'file_type': file_type.lower(),
                    'column_mapping': json.dumps(field_mappings),
                    'update_strategy': 'skip',
                    'default_password': 'test123',
                    'default_role': 'Student'
                }
                
                response = self.session.post(
                    f"{self.base_url}/api/v1/users/import/batch",
                    files=files,
                    data=data
                )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✓ 批量导入成功")
                print(f"  - 总数量: {result.get('total', 0)}")
                print(f"  - 成功导入: {result.get('imported', 0)}")
                print(f"  - 失败数量: {result.get('failed', 0)}")
                
                if result.get('errors'):
                    print(f"  - 错误信息: {len(result['errors'])} 条")
                    for i, error in enumerate(result['errors'][:3]):  # 只显示前3条
                        print(f"    {i+1}. {error}")
                
                self.test_results.append({
                    'test': f'{file_type}批量导入',
                    'status': 'PASS',
                    'details': f"成功导入{result.get('imported', 0)}条，失败{result.get('failed', 0)}条"
                })
                return True
            else:
                print(f"✗ 批量导入失败: {response.status_code} - {response.text}")
                self.test_results.append({
                    'test': f'{file_type}批量导入',
                    'status': 'FAIL',
                    'details': f"HTTP {response.status_code}: {response.text}"
                })
                return False
                
        except Exception as e:
            print(f"✗ 批量导入异常: {str(e)}")
            self.test_results.append({
                'test': f'{file_type}批量导入',
                'status': 'ERROR',
                'details': str(e)
            })
            return False
    
    def test_duplicate_handling(self, file_path: str, file_type: str, field_mappings: Dict[str, str]) -> bool:
        """测试重复数据处理功能"""
        try:
            print(f"\n=== 测试{file_type}重复数据处理功能 ===")
            
            with open(file_path, 'rb') as f:
                files = {'file': (os.path.basename(file_path), f, 'application/octet-stream')}
                data = {
                    'file_type': file_type.lower(),
                    'column_mapping': json.dumps(field_mappings),
                    'update_strategy': 'update',
                    'default_password': 'updated123',
                    'default_role': 'Student'
                }
                
                response = self.session.post(
                    f"{self.base_url}/api/v1/users/import/batch",
                    files=files,
                    data=data
                )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✓ 重复数据处理成功")
                print(f"  - 更新策略执行结果:")
                print(f"    总数量: {result.get('total', 0)}")
                print(f"    成功数量: {result.get('imported', 0)}")
                print(f"    失败数量: {result.get('failed', 0)}")
                
                self.test_results.append({
                    'test': f'{file_type}重复数据处理',
                    'status': 'PASS',
                    'details': f"更新策略处理{result.get('total', 0)}条数据"
                })
                return True
            else:
                print(f"✗ 重复数据处理失败: {response.status_code} - {response.text}")
                self.test_results.append({
                    'test': f'{file_type}重复数据处理',
                    'status': 'FAIL',
                    'details': f"HTTP {response.status_code}: {response.text}"
                })
                return False
                
        except Exception as e:
            print(f"✗ 重复数据处理异常: {str(e)}")
            self.test_results.append({
                'test': f'{file_type}重复数据处理',
                'status': 'ERROR',
                'details': str(e)
            })
            return False
    
    def test_error_handling(self, file_path: str, file_type: str) -> bool:
        """测试错误处理和报告功能"""
        try:
            print(f"\n=== 测试{file_type}错误处理和报告功能 ===")
            
            # 使用错误的字段映射来触发错误
            error_mappings = {
                'invalid_field': 'name',
                'another_invalid': 'phone'
            }
            
            with open(file_path, 'rb') as f:
                files = {'file': (os.path.basename(file_path), f, 'application/octet-stream')}
                data = {
                    'file_type': file_type.lower(),
                    'column_mapping': json.dumps(error_mappings),
                    'update_strategy': 'skip',
                    'default_password': 'test123',
                    'default_role': 'Student'
                }
                
                response = self.session.post(
                    f"{self.base_url}/api/v1/users/import/batch",
                    files=files,
                    data=data
                )
            
            # 错误处理测试应该返回详细的错误信息
            if response.status_code in [200, 400, 422]:  # 可能的响应状态
                result = response.json()
                
                if 'error' in result or result.get('failed_count', 0) > 0:
                    print(f"✓ 错误处理功能正常")
                    print(f"  - 检测到错误并提供详细报告")
                    if 'failed_records' in result:
                        print(f"  - 失败记录数: {len(result['failed_records'])}")
                        for i, failed in enumerate(result['failed_records'][:2]):
                            print(f"    {i+1}. {failed.get('error', 'Unknown error')}")
                    
                    self.test_results.append({
                        'test': f'{file_type}错误处理',
                        'status': 'PASS',
                        'details': "成功检测错误并提供详细报告"
                    })
                    return True
                else:
                    print(f"✗ 错误处理功能异常：应该检测到错误但没有")
                    self.test_results.append({
                        'test': f'{file_type}错误处理',
                        'status': 'FAIL',
                        'details': "未能正确检测和报告错误"
                    })
                    return False
            else:
                print(f"✗ 错误处理测试失败: {response.status_code} - {response.text}")
                self.test_results.append({
                    'test': f'{file_type}错误处理',
                    'status': 'FAIL',
                    'details': f"HTTP {response.status_code}: {response.text}"
                })
                return False
                
        except Exception as e:
            print(f"✗ 错误处理测试异常: {str(e)}")
            self.test_results.append({
                'test': f'{file_type}错误处理',
                'status': 'ERROR',
                'details': str(e)
            })
            return False
    
    def cleanup(self):
        """清理临时文件"""
        for temp_file in self.temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
                    print(f"✓ 清理临时文件: {temp_file}")
            except Exception as e:
                print(f"✗ 清理文件失败 {temp_file}: {str(e)}")
    
    def generate_report(self):
        """生成测试报告"""
        print("\n" + "="*60)
        print("定制化配置化用户导入表格功能测试报告")
        print("="*60)
        print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"总测试数: {len(self.test_results)}")
        
        pass_count = sum(1 for r in self.test_results if r['status'] == 'PASS')
        fail_count = sum(1 for r in self.test_results if r['status'] == 'FAIL')
        error_count = sum(1 for r in self.test_results if r['status'] == 'ERROR')
        
        print(f"通过: {pass_count}")
        print(f"失败: {fail_count}")
        print(f"错误: {error_count}")
        print(f"通过率: {pass_count/len(self.test_results)*100:.1f}%")
        
        print("\n详细结果:")
        print("-" * 60)
        for result in self.test_results:
            status_symbol = "✓" if result['status'] == 'PASS' else "✗"
            print(f"{status_symbol} {result['test']}: {result['status']}")
            if result['details']:
                print(f"  详情: {result['details']}")
        
        print("-" * 60)
        
        # 功能覆盖率分析
        tested_features = {
            '文件预览': any('预览' in r['test'] for r in self.test_results),
            '智能字段映射': any('映射' in r['test'] for r in self.test_results),
            '批量导入': any('批量导入' in r['test'] for r in self.test_results),
            '错误处理': any('错误处理' in r['test'] for r in self.test_results),
            '重复数据处理': any('重复数据' in r['test'] for r in self.test_results)
        }
        
        print("\n功能覆盖率:")
        for feature, tested in tested_features.items():
            status = "✓" if tested else "✗"
            print(f"{status} {feature}: {'已测试' if tested else '未测试'}")
        
        coverage = sum(tested_features.values()) / len(tested_features) * 100
        print(f"\n总体功能覆盖率: {coverage:.1f}%")
        
        return {
            'total_tests': len(self.test_results),
            'passed': pass_count,
            'failed': fail_count,
            'errors': error_count,
            'pass_rate': pass_count/len(self.test_results)*100,
            'coverage': coverage
        }
    
    def run_all_tests(self):
        """运行所有测试"""
        print("开始定制化配置化用户导入表格功能测试...")
        
        # 设置认证
        if not self.setup_auth():
            print("认证失败，无法继续测试")
            return False
        
        try:
            # 创建测试文件
            excel_file = self.create_test_excel_file()
            csv_file = self.create_test_csv_file()
            
            if not excel_file or not csv_file:
                print("创建测试文件失败，无法继续测试")
                return False
            
            # 测试Excel文件功能
            print("\n" + "="*50)
            print("Excel文件功能测试")
            print("="*50)
            
            self.test_file_preview(excel_file, 'Excel')
            excel_mappings = self.test_field_mapping(excel_file, 'Excel')
            if excel_mappings:
                self.test_batch_import(excel_file, 'Excel', excel_mappings)
                self.test_duplicate_handling(excel_file, 'Excel', excel_mappings)
            self.test_error_handling(excel_file, 'Excel')
            
            # 测试CSV文件功能
            print("\n" + "="*50)
            print("CSV文件功能测试")
            print("="*50)
            
            self.test_file_preview(csv_file, 'CSV')
            csv_mappings = self.test_field_mapping(csv_file, 'CSV')
            if csv_mappings:
                self.test_batch_import(csv_file, 'CSV', csv_mappings)
                self.test_duplicate_handling(csv_file, 'CSV', csv_mappings)
            self.test_error_handling(csv_file, 'CSV')
            
            # 生成测试报告
            report = self.generate_report()
            
            return report['pass_rate'] > 70  # 70%通过率为成功标准
            
        finally:
            # 清理临时文件
            self.cleanup()

def main():
    """主函数"""
    tester = ConfigurableImportTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 定制化配置化用户导入表格功能测试总体通过！")
        return 0
    else:
        print("\n❌ 定制化配置化用户导入表格功能测试存在问题，请检查失败项目。")
        return 1

if __name__ == "__main__":
    exit(main())