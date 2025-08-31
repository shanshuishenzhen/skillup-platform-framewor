#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OA系统启动测试脚本
用于测试一键启动功能的各个组件
"""

import os
import sys
import subprocess
import time
import requests
import socket
from pathlib import Path

class StartupTester:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.test_results = []
        
    def print_test(self, test_name, status, message=""):
        """打印测试结果"""
        status_icon = "✅" if status else "❌"
        print(f"{status_icon} {test_name}: {message}")
        self.test_results.append((test_name, status, message))
    
    def check_file_exists(self, file_path, description):
        """检查文件是否存在"""
        full_path = self.project_root / file_path
        exists = full_path.exists()
        self.print_test(
            f"文件检查 - {description}",
            exists,
            f"{'存在' if exists else '不存在'}: {file_path}"
        )
        return exists
    
    def check_command_available(self, command, description):
        """检查命令是否可用"""
        try:
            result = subprocess.run(
                f"{command} --version",
                shell=True,
                capture_output=True,
                text=True,
                timeout=10
            )
            available = result.returncode == 0
            version = result.stdout.strip().split('\n')[0] if available else "未安装"
            self.print_test(
                f"命令检查 - {description}",
                available,
                version
            )
            return available
        except Exception as e:
            self.print_test(
                f"命令检查 - {description}",
                False,
                f"检查失败: {e}"
            )
            return False
    
    def check_port_available(self, port, description):
        """检查端口是否可用"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                result = s.connect_ex(('localhost', port))
                available = result != 0  # 端口未被占用
                self.print_test(
                    f"端口检查 - {description}",
                    available,
                    f"端口 {port} {'可用' if available else '被占用'}"
                )
                return available
        except Exception as e:
            self.print_test(
                f"端口检查 - {description}",
                False,
                f"检查失败: {e}"
            )
            return False
    
    def test_http_endpoint(self, url, description, timeout=5):
        """测试HTTP端点"""
        try:
            response = requests.get(url, timeout=timeout)
            success = response.status_code == 200
            self.print_test(
                f"HTTP测试 - {description}",
                success,
                f"状态码: {response.status_code}"
            )
            return success
        except requests.exceptions.RequestException as e:
            self.print_test(
                f"HTTP测试 - {description}",
                False,
                f"请求失败: {e}"
            )
            return False
    
    def run_startup_script_test(self):
        """测试启动脚本的语法"""
        try:
            # 测试Python脚本语法
            result = subprocess.run(
                [sys.executable, "-m", "py_compile", "start_oa_system.py"],
                capture_output=True,
                text=True,
                timeout=10
            )
            syntax_ok = result.returncode == 0
            self.print_test(
                "启动脚本语法检查",
                syntax_ok,
                "语法正确" if syntax_ok else f"语法错误: {result.stderr}"
            )
            return syntax_ok
        except Exception as e:
            self.print_test(
                "启动脚本语法检查",
                False,
                f"检查失败: {e}"
            )
            return False
    
    def test_package_json_validity(self):
        """测试package.json文件有效性"""
        import json
        
        # 测试后端package.json
        backend_pkg = self.project_root / "package.json"
        if backend_pkg.exists():
            try:
                with open(backend_pkg, 'r', encoding='utf-8') as f:
                    json.load(f)
                self.print_test("后端package.json", True, "格式正确")
            except json.JSONDecodeError as e:
                self.print_test("后端package.json", False, f"JSON格式错误: {e}")
                return False
        
        # 测试前端package.json
        frontend_pkg = self.project_root / "client" / "package.json"
        if frontend_pkg.exists():
            try:
                with open(frontend_pkg, 'r', encoding='utf-8') as f:
                    json.load(f)
                self.print_test("前端package.json", True, "格式正确")
            except json.JSONDecodeError as e:
                self.print_test("前端package.json", False, f"JSON格式错误: {e}")
                return False
        
        return True
    
    def run_comprehensive_test(self):
        """运行综合测试"""
        print("🧪 OA系统启动环境测试")
        print("=" * 50)
        
        # 1. 文件存在性测试
        print("\n📁 文件存在性测试:")
        required_files = [
            ("start_oa_system.py", "Python启动脚本"),
            ("start_oa.bat", "Windows批处理文件"),
            ("start_oa.sh", "Shell启动脚本"),
            ("setup_environment.py", "环境配置脚本"),
            ("server.js", "后端服务器文件"),
            (".env", "环境配置文件"),
            ("package.json", "后端依赖配置"),
            ("client/package.json", "前端依赖配置")
        ]
        
        file_tests_passed = 0
        for file_path, description in required_files:
            if self.check_file_exists(file_path, description):
                file_tests_passed += 1
        
        # 2. 命令可用性测试
        print("\n⚙️ 命令可用性测试:")
        required_commands = [
            ("python", "Python解释器"),
            ("node", "Node.js运行时"),
            ("npm", "npm包管理器")
        ]
        
        command_tests_passed = 0
        for command, description in required_commands:
            if self.check_command_available(command, description):
                command_tests_passed += 1
        
        # 3. 端口可用性测试
        print("\n🔌 端口可用性测试:")
        required_ports = [
            (3000, "前端服务端口"),
            (5000, "后端服务端口"),
            (27017, "MongoDB端口")
        ]
        
        port_tests_passed = 0
        for port, description in required_ports:
            if self.check_port_available(port, description):
                port_tests_passed += 1
        
        # 4. 脚本语法测试
        print("\n📝 脚本语法测试:")
        syntax_ok = self.run_startup_script_test()
        
        # 5. 配置文件测试
        print("\n⚙️ 配置文件测试:")
        config_ok = self.test_package_json_validity()
        
        # 6. 可选测试 - MongoDB连接
        print("\n🗄️ 数据库连接测试:")
        mongodb_available = not self.check_port_available(27017, "MongoDB服务")
        if mongodb_available:
            self.print_test("MongoDB服务", True, "已运行")
        else:
            self.print_test("MongoDB服务", False, "未运行 (可使用Docker)")
        
        # 生成测试报告
        print("\n" + "=" * 50)
        print("📊 测试结果汇总:")
        print(f"文件检查: {file_tests_passed}/{len(required_files)} 通过")
        print(f"命令检查: {command_tests_passed}/{len(required_commands)} 通过")
        print(f"端口检查: {port_tests_passed}/{len(required_ports)} 通过")
        print(f"语法检查: {'通过' if syntax_ok else '失败'}")
        print(f"配置检查: {'通过' if config_ok else '失败'}")
        
        # 计算总体评分
        total_tests = len(required_files) + len(required_commands) + len(required_ports) + 2
        passed_tests = file_tests_passed + command_tests_passed + port_tests_passed + (1 if syntax_ok else 0) + (1 if config_ok else 0)
        score = (passed_tests / total_tests) * 100
        
        print(f"\n🎯 总体评分: {score:.1f}% ({passed_tests}/{total_tests})")
        
        if score >= 80:
            print("✅ 系统准备就绪，可以使用一键启动！")
            print("💡 运行命令: python start_oa_system.py")
        elif score >= 60:
            print("⚠️ 系统基本就绪，但有一些问题需要解决")
            print("💡 建议先运行: python setup_environment.py")
        else:
            print("❌ 系统未准备就绪，需要安装必要的环境")
            print("💡 请参考文档安装Node.js、MongoDB等必需软件")
        
        return score >= 80
    
    def quick_test(self):
        """快速测试"""
        print("⚡ 快速环境检查")
        print("-" * 30)
        
        # 检查关键文件和命令
        critical_checks = [
            ("start_oa_system.py", lambda: self.check_file_exists("start_oa_system.py", "启动脚本")),
            ("Python", lambda: self.check_command_available("python", "Python")),
            ("Node.js", lambda: self.check_command_available("node", "Node.js")),
            ("npm", lambda: self.check_command_available("npm", "npm"))
        ]
        
        all_passed = True
        for name, check_func in critical_checks:
            if not check_func():
                all_passed = False
        
        if all_passed:
            print("\n✅ 快速检查通过，可以尝试启动系统")
        else:
            print("\n❌ 快速检查失败，请安装缺失的环境")
        
        return all_passed

def main():
    """主函数"""
    tester = StartupTester()
    
    if len(sys.argv) > 1 and sys.argv[1] == "--quick":
        # 快速测试模式
        tester.quick_test()
    else:
        # 完整测试模式
        tester.run_comprehensive_test()

if __name__ == "__main__":
    main()
