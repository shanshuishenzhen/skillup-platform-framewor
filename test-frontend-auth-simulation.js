/**
 * 前端权限验证模拟测试脚本
 * 模拟浏览器环境，测试AdminGuard和useAuth的权限验证逻辑
 */

const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

// 模拟localStorage
class MockLocalStorage {
    constructor() {
        this.store = {};
    }
    
    getItem(key) {
        return this.store[key] || null;
    }
    
    setItem(key, value) {
        this.store[key] = String(value);
    }
    
    removeItem(key) {
        delete this.store[key];
    }
    
    clear() {
        this.store = {};
    }
    
    get length() {
        return Object.keys(this.store).length;
    }
    
    key(index) {
        const keys = Object.keys(this.store);
        return keys[index] || null;
    }
}

// 模拟浏览器环境
const mockBrowser = {
    localStorage: new MockLocalStorage(),
    location: {
        pathname: '/admin',
        href: 'http://localhost:3000/admin',
        replace: (url) => {
            console.log(`🔄 页面重定向到: ${url}`);
            mockBrowser.location.href = url;
            mockBrowser.location.pathname = new URL(url, 'http://localhost:3000').pathname;
        }
    },
    history: {
        push: (url) => {
            console.log(`📍 导航到: ${url}`);
            mockBrowser.location.href = url;
            mockBrowser.location.pathname = url;
        }
    }
};

// 模拟React状态管理
class MockReactState {
    constructor(initialValue) {
        this.value = initialValue;
        this.listeners = [];
    }
    
    setValue(newValue) {
        this.value = newValue;
        this.listeners.forEach(listener => listener(newValue));
    }
    
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
}

// 模拟useAuth hook
function createMockUseAuth() {
    const isLoggedIn = new MockReactState(false);
    const user = new MockReactState(null);
    const loading = new MockReactState(true);
    
    // 模拟检查登录状态
    const checkAuthStatus = () => {
        console.log('🔍 useAuth: 检查登录状态...');
        
        const token = mockBrowser.localStorage.getItem('auth_token');
        if (!token) {
            console.log('❌ useAuth: 未找到token');
            isLoggedIn.setValue(false);
            user.setValue(null);
            loading.setValue(false);
            return;
        }
        
        try {
            // 解析token
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            console.log('✅ useAuth: Token解析成功', {
                userId: payload.userId,
                phone: payload.phone,
                role: payload.role,
                exp: new Date(payload.exp * 1000).toLocaleString()
            });
            
            // 检查token是否过期
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                console.log('❌ useAuth: Token已过期');
                mockBrowser.localStorage.removeItem('auth_token');
                isLoggedIn.setValue(false);
                user.setValue(null);
                loading.setValue(false);
                return;
            }
            
            console.log('✅ useAuth: Token有效');
            isLoggedIn.setValue(true);
            user.setValue({
                id: payload.userId,
                phone: payload.phone,
                role: payload.role,
                permissions: payload.permissions || []
            });
            loading.setValue(false);
            
        } catch (error) {
            console.log('❌ useAuth: Token解析失败', error.message);
            mockBrowser.localStorage.removeItem('auth_token');
            isLoggedIn.setValue(false);
            user.setValue(null);
            loading.setValue(false);
        }
    };
    
    return {
        isLoggedIn,
        user,
        loading,
        checkAuthStatus
    };
}

// 模拟useAdminPermission hook
function createMockUseAdminPermission(useAuth) {
    const isAdmin = new MockReactState(false);
    const loading = new MockReactState(true);
    const error = new MockReactState(null);
    
    const checkAdminPermission = async () => {
        console.log('🛡️ useAdminPermission: 开始检查管理员权限...');
        
        // 检查用户是否已登录
        if (!useAuth.isLoggedIn.value) {
            console.log('❌ useAdminPermission: 用户未登录');
            isAdmin.setValue(false);
            loading.setValue(false);
            error.setValue('用户未登录');
            return;
        }
        
        const token = mockBrowser.localStorage.getItem('auth_token');
        if (!token) {
            console.log('❌ useAdminPermission: 未找到token');
            isAdmin.setValue(false);
            loading.setValue(false);
            error.setValue('未找到认证token');
            return;
        }
        
        try {
            console.log('📡 useAdminPermission: 调用权限检查API...');
            
            const response = await fetch('http://localhost:3000/api/admin/check-permission', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`📡 useAdminPermission: API响应状态 ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ useAdminPermission: 权限检查通过', data);
                isAdmin.setValue(true);
                loading.setValue(false);
                error.setValue(null);
            } else {
                const errorData = await response.json();
                console.log('❌ useAdminPermission: 权限检查失败', errorData);
                isAdmin.setValue(false);
                loading.setValue(false);
                error.setValue(errorData.error || '权限不足');
            }
        } catch (err) {
            console.log('💥 useAdminPermission: API调用异常', err.message);
            isAdmin.setValue(false);
            loading.setValue(false);
            error.setValue(`API调用失败: ${err.message}`);
        }
    };
    
    return {
        isAdmin,
        loading,
        error,
        checkAdminPermission
    };
}

// 模拟AdminGuard组件
function createMockAdminGuard(useAuth, useAdminPermission) {
    return {
        async render() {
            console.log('\n🛡️ AdminGuard: 开始渲染...');
            
            // 1. 检查认证状态
            useAuth.checkAuthStatus();
            
            // 等待认证检查完成
            if (useAuth.loading.value) {
                console.log('⏳ AdminGuard: 等待认证检查...');
                return 'loading';
            }
            
            // 2. 检查是否已登录
            if (!useAuth.isLoggedIn.value) {
                console.log('❌ AdminGuard: 用户未登录，重定向到登录页');
                mockBrowser.location.replace('/admin/login');
                return 'redirect-to-login';
            }
            
            console.log('✅ AdminGuard: 用户已登录，检查管理员权限...');
            
            // 3. 检查管理员权限
            await useAdminPermission.checkAdminPermission();
            
            // 等待权限检查完成
            if (useAdminPermission.loading.value) {
                console.log('⏳ AdminGuard: 等待权限检查...');
                return 'loading';
            }
            
            // 4. 检查权限结果
            if (useAdminPermission.error.value) {
                console.log('❌ AdminGuard: 权限检查出错', useAdminPermission.error.value);
                return 'permission-error';
            }
            
            if (!useAdminPermission.isAdmin.value) {
                console.log('❌ AdminGuard: 权限不足，显示权限不足页面');
                return 'permission-denied';
            }
            
            console.log('✅ AdminGuard: 权限验证通过，渲染管理员页面');
            return 'admin-page';
        }
    };
}

// 主测试函数
async function runFrontendAuthTest() {
    console.log('🚀 开始前端权限验证模拟测试\n');
    
    try {
        // 1. 模拟管理员登录
        console.log('=== 步骤1: 模拟管理员登录 ===');
        
        const loginResponse = await fetch('http://localhost:3000/api/admin/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone: '13823738278',
                password: '123456'
            })
        });
        
        if (!loginResponse.ok) {
            const errorData = await loginResponse.json();
            throw new Error(`登录失败: ${errorData.error}`);
        }
        
        const loginData = await loginResponse.json();
        console.log('✅ 登录成功:', {
            user: loginData.user.real_name,
            role: loginData.user.role,
            tokenLength: loginData.token.length
        });
        
        // 2. 存储token到模拟localStorage
        console.log('\n=== 步骤2: 存储Token到localStorage ===');
        mockBrowser.localStorage.setItem('auth_token', loginData.token);
        console.log('✅ Token已存储到localStorage');
        
        // 3. 创建模拟hooks
        console.log('\n=== 步骤3: 初始化模拟Hooks ===');
        const useAuth = createMockUseAuth();
        const useAdminPermission = createMockUseAdminPermission(useAuth);
        const adminGuard = createMockAdminGuard(useAuth, useAdminPermission);
        
        // 4. 模拟AdminGuard渲染
        console.log('\n=== 步骤4: 模拟AdminGuard渲染 ===');
        const renderResult = await adminGuard.render();
        
        console.log('\n=== 测试结果 ===');
        console.log(`🎯 AdminGuard渲染结果: ${renderResult}`);
        console.log(`🔐 用户登录状态: ${useAuth.isLoggedIn.value}`);
        console.log(`👤 用户信息:`, useAuth.user.value);
        console.log(`🛡️ 管理员权限: ${useAdminPermission.isAdmin.value}`);
        console.log(`❌ 权限错误: ${useAdminPermission.error.value}`);
        console.log(`📍 当前页面: ${mockBrowser.location.pathname}`);
        
        // 5. 分析结果
        console.log('\n=== 问题分析 ===');
        if (renderResult === 'admin-page') {
            console.log('✅ 前端权限验证流程正常，用户应该能够访问管理员页面');
            console.log('🔍 如果浏览器中仍显示"权限不足"，可能的原因:');
            console.log('   1. 浏览器缓存问题 - 尝试硬刷新 (Ctrl+F5)');
            console.log('   2. 前端代码热重载问题 - 重启开发服务器');
            console.log('   3. localStorage同步问题 - 检查浏览器开发者工具');
            console.log('   4. 网络请求被拦截 - 检查浏览器网络面板');
            console.log('   5. React状态更新问题 - 检查组件重新渲染');
        } else if (renderResult === 'permission-denied') {
            console.log('❌ 权限验证失败，这解释了"权限不足"错误');
            console.log(`🔍 失败原因: ${useAdminPermission.error.value}`);
        } else if (renderResult === 'redirect-to-login') {
            console.log('❌ 用户未登录，应该重定向到登录页');
        } else {
            console.log(`❓ 未预期的渲染结果: ${renderResult}`);
        }
        
        // 6. 额外的调试信息
        console.log('\n=== 调试建议 ===');
        console.log('1. 访问调试页面: http://localhost:3000/debug-auth.html');
        console.log('2. 检查浏览器开发者工具的Console面板');
        console.log('3. 检查浏览器开发者工具的Network面板');
        console.log('4. 检查浏览器开发者工具的Application > Local Storage');
        console.log('5. 尝试在无痕模式下访问管理员页面');
        
    } catch (error) {
        console.error('💥 测试过程中发生错误:', error.message);
        console.error('📋 错误堆栈:', error.stack);
    }
}

// 运行测试
if (require.main === module) {
    runFrontendAuthTest();
}

module.exports = {
    runFrontendAuthTest,
    MockLocalStorage,
    createMockUseAuth,
    createMockUseAdminPermission,
    createMockAdminGuard
};