# SkillUp Platform 客户端配置指南

本指南帮助您在局域网中的其他电脑上配置客户端，以访问 SkillUp Platform 服务器。

## 📋 前置要求

### 客户端电脑要求
- Windows 7/10/11 或 macOS 10.14+ 或 Linux Ubuntu 18.04+
- 现代浏览器（Chrome 90+、Firefox 88+、Safari 14+、Edge 90+）
- 与服务器在同一局域网内
- 网络连接稳定

### 网络要求
- 客户端与服务器能够互相 ping 通
- 防火墙允许访问服务器端口（3000、80、443）
- 网络延迟 < 100ms（推荐）

## 🔧 快速配置

### 1. 获取服务器信息

从服务器管理员处获取以下信息：
- **服务器IP地址**：例如 `192.168.1.100`
- **访问端口**：通常为 `3000`
- **访问协议**：HTTP 或 HTTPS

### 2. 网络连通性测试

#### Windows 客户端
```powershell
# 测试网络连通性
ping 192.168.1.100

# 测试端口连通性
Test-NetConnection -ComputerName 192.168.1.100 -Port 3000
```

#### macOS/Linux 客户端
```bash
# 测试网络连通性
ping 192.168.1.100

# 测试端口连通性
telnet 192.168.1.100 3000
# 或使用 nc
nc -zv 192.168.1.100 3000
```

### 3. 浏览器配置

#### 基本访问
1. 打开浏览器
2. 在地址栏输入：`http://192.168.1.100:3000`
3. 按回车键访问

#### 创建桌面快捷方式

**Windows:**
1. 右键桌面 → 新建 → 快捷方式
2. 输入位置：`"C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://192.168.1.100:3000`
3. 命名为：`SkillUp Platform`
4. 完成创建

**macOS:**
```bash
# 创建应用程序快捷方式
osascript -e 'tell application "Google Chrome" to make new window with properties {URL:"http://192.168.1.100:3000"}'
```

**Linux:**
创建 `.desktop` 文件：
```ini
[Desktop Entry]
Name=SkillUp Platform
Comment=技能提升平台
Exec=google-chrome --app=http://192.168.1.100:3000
Icon=web-browser
Type=Application
Categories=Network;WebBrowser;
```

## 🌐 浏览器优化配置

### Chrome 浏览器

#### 性能优化
1. 地址栏输入：`chrome://settings/`
2. 高级 → 系统 → 启用硬件加速
3. 隐私设置和安全性 → Cookie 和其他网站数据 → 允许所有 Cookie

#### 离线访问支持
1. 安装 PWA（渐进式Web应用）
2. 访问平台后，点击地址栏右侧的安装图标
3. 确认安装到桌面

### Firefox 浏览器

#### 性能优化
1. 地址栏输入：`about:preferences`
2. 常规 → 性能 → 取消勾选"使用推荐的性能设置"
3. 启用硬件加速

### Safari 浏览器（macOS）

#### 开发者选项
1. Safari → 偏好设置 → 高级
2. 勾选"在菜单栏中显示开发菜单"
3. 开发 → 停用跨域限制（仅开发环境）

## 📱 移动设备配置

### iOS 设备
1. 连接到同一WiFi网络
2. 打开Safari浏览器
3. 访问：`http://192.168.1.100:3000`
4. 点击分享按钮 → 添加到主屏幕

### Android 设备
1. 连接到同一WiFi网络
2. 打开Chrome浏览器
3. 访问：`http://192.168.1.100:3000`
4. 菜单 → 添加到主屏幕

## 🔒 安全配置

### HTTPS 访问（如果服务器支持）

如果服务器配置了HTTPS，使用以下地址：
```
https://192.168.1.100:443
```

### 证书信任（自签名证书）

如果使用自签名证书，需要手动信任：

**Chrome:**
1. 访问时点击"高级"
2. 点击"继续前往 192.168.1.100（不安全）"

**Firefox:**
1. 点击"高级"
2. 点击"添加例外"
3. 确认安全例外

## 🎯 用户体验优化

### 书签管理

创建常用功能书签：
- 首页：`http://192.168.1.100:3000/`
- 课程：`http://192.168.1.100:3000/courses`
- 个人中心：`http://192.168.1.100:3000/profile`
- 学习记录：`http://192.168.1.100:3000/learning`

### 浏览器扩展推荐

**生产力扩展：**
- LastPass：密码管理
- Grammarly：语法检查
- AdBlock Plus：广告拦截

**开发调试扩展：**
- React Developer Tools
- Vue.js devtools
- JSON Viewer

## 🔧 故障排除

### 常见问题

#### 1. 无法访问服务器

**症状：** 浏览器显示"无法访问此网站"

**解决方案：**
```powershell
# 检查网络连接
ping 192.168.1.100

# 检查端口
telnet 192.168.1.100 3000

# 检查防火墙
Get-NetFirewallRule -DisplayName "*SkillUp*"
```

#### 2. 页面加载缓慢

**症状：** 页面加载时间超过10秒

**解决方案：**
1. 清除浏览器缓存
2. 检查网络带宽
3. 关闭其他占用网络的应用
4. 联系服务器管理员检查服务器性能

#### 3. 功能异常

**症状：** 某些功能无法正常使用

**解决方案：**
1. 刷新页面（Ctrl+F5 强制刷新）
2. 清除浏览器Cookie和缓存
3. 尝试使用无痕/隐私模式
4. 更换浏览器测试

#### 4. 登录问题

**症状：** 无法登录或登录后立即退出

**解决方案：**
1. 检查用户名和密码
2. 清除浏览器Cookie
3. 确认服务器时间同步
4. 联系管理员重置账户

### 网络诊断工具

#### Windows 网络诊断
```powershell
# 网络配置信息
ipconfig /all

# 路由表
route print

# DNS解析测试
nslookup 192.168.1.100

# 网络连接状态
netstat -an | findstr :3000
```

#### macOS/Linux 网络诊断
```bash
# 网络配置信息
ifconfig

# 路由表
route -n

# 网络连接状态
netstat -an | grep :3000

# 网络质量测试
ping -c 10 192.168.1.100
```

## 📊 性能监控

### 浏览器性能监控

#### Chrome DevTools
1. 按F12打开开发者工具
2. Network标签：监控网络请求
3. Performance标签：分析页面性能
4. Console标签：查看错误信息

#### 性能指标
- **页面加载时间**：< 3秒（推荐）
- **首次内容绘制**：< 1.5秒
- **最大内容绘制**：< 2.5秒
- **累积布局偏移**：< 0.1

### 网络质量监控

```bash
# 持续ping测试
ping -t 192.168.1.100  # Windows
ping 192.168.1.100     # macOS/Linux

# 网络速度测试
speedtest-cli --server 192.168.1.100
```

## 📞 技术支持

### 联系方式
- **服务器管理员**：[管理员联系方式]
- **技术支持邮箱**：support@skillup.local
- **内部技术群**：[内部群组信息]

### 问题反馈

提交问题时请包含以下信息：
1. 客户端操作系统和版本
2. 浏览器类型和版本
3. 服务器IP地址
4. 具体错误信息或截图
5. 重现步骤
6. 网络环境描述

### 远程协助

如需远程协助，可使用以下工具：
- TeamViewer
- 向日葵远程控制
- Windows远程桌面
- Chrome远程桌面

---

**注意：** 本指南适用于局域网环境，请勿在公网环境中使用相同配置。如有安全疑问，请咨询网络管理员。