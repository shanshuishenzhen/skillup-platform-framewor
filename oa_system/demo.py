#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OA系统演示脚本
展示一键启动功能的使用方法
"""

import os
import sys
import time
import subprocess
from pathlib import Path

class OADemo:
    def __init__(self):
        self.project_root = Path(__file__).parent
        
    def print_header(self, title):
        """打印标题"""
        print("\n" + "=" * 60)
        print(f"🎯 {title}")
        print("=" * 60)
    
    def print_step(self, step_num, title, description=""):
        """打印步骤"""
        print(f"\n📋 步骤 {step_num}: {title}")
        if description:
            print(f"   {description}")
    
    def print_command(self, command, description=""):
        """打印命令"""
        print(f"\n💻 执行命令: {command}")
        if description:
            print(f"   说明: {description}")
    
    def wait_for_user(self, message="按Enter键继续..."):
        """等待用户输入"""
        input(f"\n⏸️  {message}")
    
    def run_demo(self):
        """运行演示"""
        self.print_header("OA办公系统一键启动演示")
        
        print("欢迎使用OA办公系统！")
        print("本演示将指导您完成系统的快速启动过程。")
        
        self.wait_for_user("准备开始演示")
        
        # 步骤1：环境检查
        self.print_step(1, "环境检查", "检查系统环境是否满足要求")
        self.print_command("python test_startup.py --quick", "快速检查关键环境")
        
        try:
            result = subprocess.run([sys.executable, "test_startup.py", "--quick"], 
                                  capture_output=False, text=True)
            if result.returncode == 0:
                print("✅ 环境检查通过")
            else:
                print("⚠️ 环境检查发现问题，但可以继续演示")
        except Exception as e:
            print(f"⚠️ 环境检查脚本运行失败: {e}")
        
        self.wait_for_user()
        
        # 步骤2：环境初始化（如果需要）
        self.print_step(2, "环境初始化", "初始化项目环境和配置文件")
        
        if not (self.project_root / "package.json").exists():
            self.print_command("python setup_environment.py", "创建必要的配置文件和目录")
            print("🔄 正在初始化环境...")
            
            try:
                result = subprocess.run([sys.executable, "setup_environment.py"], 
                                      capture_output=False, text=True, timeout=60)
                if result.returncode == 0:
                    print("✅ 环境初始化完成")
                else:
                    print("⚠️ 环境初始化可能有问题")
            except subprocess.TimeoutExpired:
                print("⚠️ 环境初始化超时")
            except Exception as e:
                print(f"⚠️ 环境初始化失败: {e}")
        else:
            print("✅ 环境已初始化，跳过此步骤")
        
        self.wait_for_user()
        
        # 步骤3：一键启动演示
        self.print_step(3, "一键启动演示", "展示不同的启动方式")
        
        print("\n🚀 OA系统提供多种启动方式：")
        print("\n1️⃣ Python脚本启动 (推荐)")
        self.print_command("python start_oa_system.py")
        
        print("\n2️⃣ Windows批处理文件")
        self.print_command("start_oa.bat", "双击运行或命令行执行")
        
        print("\n3️⃣ Linux/Mac Shell脚本")
        self.print_command("./start_oa.sh", "需要先添加执行权限")
        
        self.wait_for_user("了解启动方式后继续")
        
        # 步骤4：功能特性介绍
        self.print_step(4, "功能特性", "一键启动程序的主要功能")
        
        features = [
            "🔍 自动检查Node.js、npm、MongoDB等环境",
            "📦 自动安装后端和前端依赖包",
            "🗄️ 自动启动MongoDB数据库服务",
            "🔧 自动启动后端API服务 (端口5000)",
            "📱 自动启动前端React应用 (端口3000)",
            "🌐 自动打开默认浏览器访问系统",
            "❌ 完善的错误检测和提示机制",
            "🔄 优雅的服务停止和清理功能"
        ]
        
        print("\n✨ 主要功能特性：")
        for feature in features:
            print(f"   {feature}")
            time.sleep(0.5)
        
        self.wait_for_user()
        
        # 步骤5：实际启动演示
        self.print_step(5, "实际启动演示", "现在让我们实际启动系统")
        
        print("⚠️ 注意：实际启动会占用端口并启动服务")
        print("如果您不想现在启动，可以跳过此步骤")
        
        choice = input("\n是否要实际启动系统？(y/N): ").lower().strip()
        
        if choice in ['y', 'yes']:
            print("\n🚀 正在启动OA系统...")
            print("💡 提示：启动后按 Ctrl+C 可以停止所有服务")
            
            self.wait_for_user("准备启动")
            
            try:
                # 实际启动系统
                subprocess.run([sys.executable, "start_oa_system.py"])
            except KeyboardInterrupt:
                print("\n⏹️ 用户中断启动")
            except Exception as e:
                print(f"\n❌ 启动失败: {e}")
        else:
            print("⏭️ 跳过实际启动")
        
        # 步骤6：总结
        self.print_step(6, "演示总结", "回顾演示内容")
        
        print("\n📚 演示内容回顾：")
        print("   1. 环境检查 - 确保系统满足运行要求")
        print("   2. 环境初始化 - 创建必要的配置文件")
        print("   3. 启动方式 - 了解多种启动选项")
        print("   4. 功能特性 - 掌握一键启动的优势")
        print("   5. 实际演示 - 体验完整启动流程")
        
        print("\n🎯 下一步操作：")
        print("   • 运行 'python start_oa_system.py' 启动系统")
        print("   • 访问 http://localhost:3000 使用系统")
        print("   • 查看 docs/ 目录了解更多功能")
        
        print("\n📞 获取帮助：")
        print("   • 查看 'docs/一键启动使用说明.md'")
        print("   • 运行 'python test_startup.py' 进行完整测试")
        print("   • 遇到问题可查看错误提示信息")
        
        self.print_header("演示完成")
        print("感谢您观看OA系统一键启动演示！")
        print("祝您使用愉快！ 🎉")

def main():
    """主函数"""
    demo = OADemo()
    
    try:
        demo.run_demo()
    except KeyboardInterrupt:
        print("\n\n⏹️ 演示被用户中断")
    except Exception as e:
        print(f"\n\n❌ 演示过程中发生错误: {e}")

if __name__ == "__main__":
    main()
