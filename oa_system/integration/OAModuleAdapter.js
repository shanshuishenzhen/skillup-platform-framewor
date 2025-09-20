/**
 * OA模块适配器 - 用于集成到其他系统
 * 提供标准化的接口和配置管理
 */

class OAModuleAdapter {
    constructor(config = {}) {
        this.config = this.mergeConfig(this.getDefaultConfig(), config);
        this.authAdapter = null;
        this.userSyncAdapter = null;
        this.initialized = false;
    }

    /**
     * 获取默认配置
     */
    getDefaultConfig() {
        return {
            // 模块基础配置
            module: {
                name: 'OA-System',
                version: '1.0.0',
                prefix: '/api/oa',
                namespace: '/oa'
            },
            
            // 认证配置
            auth: {
                provider: 'external',           // 认证提供者: external|internal
                tokenHeader: 'Authorization',   // Token头部字段
                tokenPrefix: 'Bearer',          // Token前缀
                validateUrl: '/auth/validate',  // Token验证URL
                userInfoUrl: '/auth/me',        // 用户信息URL
                refreshUrl: '/auth/refresh'     // Token刷新URL
            },
            
            // 数据库配置
            database: {
                type: 'mongodb',
                host: 'localhost',
                port: 27017,
                name: 'oa_system',
                options: {
                    useNewUrlParser: true,
                    useUnifiedTopology: true
                }
            },
            
            // 文件配置
            file: {
                storage: 'local',               // 存储类型: local|oss|s3
                uploadPath: './uploads',        // 上传路径
                maxSize: 10 * 1024 * 1024,     // 最大文件大小 (10MB)
                allowedTypes: [                 // 允许的文件类型
                    'image/jpeg', 'image/png', 'image/gif',
                    'application/pdf', 'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'text/plain', 'application/zip'
                ],
                enablePreview: true,            // 启用文件预览
                enableVersionControl: false    // 启用版本控制
            },
            
            // Socket.io配置
            socket: {
                enabled: true,
                namespace: '/oa',
                cors: {
                    origin: '*',
                    methods: ['GET', 'POST']
                },
                transports: ['websocket', 'polling']
            },
            
            // 消息配置
            message: {
                maxLength: 5000,                // 最大消息长度
                enableFileTransfer: true,      // 启用文件传输
                retentionDays: 365,            // 消息保留天数
                enableReactions: true,         // 启用消息反应
                enableSearch: true             // 启用消息搜索
            },
            
            // 项目配置
            project: {
                maxMembers: 50,                // 最大成员数
                enableTimeTracking: false,    // 启用时间跟踪
                defaultStatus: 'planning',     // 默认状态
                enableGantt: false,           // 启用甘特图
                enableKanban: true            // 启用看板
            },
            
            // 用户同步配置
            userSync: {
                enabled: false,                // 启用用户同步
                syncUrl: '/api/users/sync',    // 同步接口URL
                syncInterval: 3600000,         // 同步间隔 (1小时)
                batchSize: 100,               // 批量同步大小
                autoCreateUsers: true         // 自动创建用户
            },
            
            // 权限配置
            permission: {
                enableRBAC: true,             // 启用基于角色的访问控制
                defaultRole: 'employee',      // 默认角色
                adminRoles: ['admin', 'super_admin'], // 管理员角色
                guestAccess: false            // 允许访客访问
            },
            
            // 集成配置
            integration: {
                apiPrefix: '/api',            // 主系统API前缀
                webhookUrl: null,             // Webhook回调URL
                enableWebhooks: false,        // 启用Webhook
                enableSSO: false,             // 启用单点登录
                customHeaders: {}             // 自定义请求头
            }
        };
    }

    /**
     * 初始化模块
     */
    async initialize() {
        try {
            console.log('正在初始化OA模块...');
            
            // 验证配置
            this.validateConfig();
            
            // 初始化数据库连接
            await this.initializeDatabase();
            
            // 初始化认证适配器
            this.initializeAuthAdapter();
            
            // 初始化用户同步适配器
            if (this.config.userSync.enabled) {
                this.initializeUserSyncAdapter();
            }
            
            // 初始化文件存储
            this.initializeFileStorage();
            
            // 初始化Socket.io
            if (this.config.socket.enabled) {
                this.initializeSocket();
            }
            
            this.initialized = true;
            console.log('OA模块初始化完成');
            
            return {
                success: true,
                message: 'OA模块初始化成功',
                config: this.getPublicConfig()
            };
            
        } catch (error) {
            console.error('OA模块初始化失败:', error);
            throw new Error(`OA模块初始化失败: ${error.message}`);
        }
    }

    /**
     * 验证配置
     */
    validateConfig() {
        const required = [
            'module.name',
            'module.prefix',
            'database.type',
            'database.host',
            'database.name'
        ];
        
        for (const path of required) {
            if (!this.getConfigValue(path)) {
                throw new Error(`缺少必需的配置项: ${path}`);
            }
        }
        
        // 验证文件大小限制
        if (this.config.file.maxSize > 100 * 1024 * 1024) {
            console.warn('文件大小限制超过100MB，可能影响性能');
        }
        
        // 验证数据库类型
        const supportedDatabases = ['mongodb', 'mysql', 'postgresql'];
        if (!supportedDatabases.includes(this.config.database.type)) {
            throw new Error(`不支持的数据库类型: ${this.config.database.type}`);
        }
    }

    /**
     * 初始化数据库连接
     */
    async initializeDatabase() {
        const { type, host, port, name, options } = this.config.database;
        
        if (type === 'mongodb') {
            const mongoose = require('mongoose');
            const uri = `mongodb://${host}:${port}/${name}`;
            
            await mongoose.connect(uri, options);
            console.log('MongoDB连接成功');
            
        } else {
            throw new Error(`暂不支持数据库类型: ${type}`);
        }
    }

    /**
     * 初始化认证适配器
     */
    initializeAuthAdapter() {
        const { provider } = this.config.auth;
        
        if (provider === 'external') {
            this.authAdapter = new ExternalAuthAdapter(this.config.auth);
        } else if (provider === 'internal') {
            this.authAdapter = new InternalAuthAdapter(this.config.auth);
        } else {
            throw new Error(`不支持的认证提供者: ${provider}`);
        }
        
        console.log(`认证适配器初始化完成: ${provider}`);
    }

    /**
     * 初始化用户同步适配器
     */
    initializeUserSyncAdapter() {
        this.userSyncAdapter = new UserSyncAdapter(this.config.userSync);
        
        // 启动定时同步
        if (this.config.userSync.syncInterval > 0) {
            setInterval(() => {
                this.syncUsers().catch(console.error);
            }, this.config.userSync.syncInterval);
        }
        
        console.log('用户同步适配器初始化完成');
    }

    /**
     * 初始化文件存储
     */
    initializeFileStorage() {
        const { storage, uploadPath } = this.config.file;
        
        if (storage === 'local') {
            const fs = require('fs');
            const path = require('path');
            
            // 确保上传目录存在
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            
            console.log(`本地文件存储初始化完成: ${uploadPath}`);
            
        } else {
            throw new Error(`暂不支持存储类型: ${storage}`);
        }
    }

    /**
     * 初始化Socket.io
     */
    initializeSocket() {
        // Socket.io初始化逻辑
        console.log('Socket.io初始化完成');
    }

    /**
     * 获取Express路由
     */
    getRoutes() {
        if (!this.initialized) {
            throw new Error('模块未初始化，请先调用initialize()');
        }
        
        const express = require('express');
        const router = express.Router();
        
        // 认证中间件
        router.use(this.createAuthMiddleware());
        
        // 注册路由
        router.use('/auth', require('../routes/auth'));
        router.use('/users', require('../routes/users'));
        router.use('/projects', require('../routes/projects'));
        router.use('/tasks', require('../routes/tasks'));
        router.use('/files', require('../routes/files'));
        router.use('/messages', require('../routes/messages'));
        
        return router;
    }

    /**
     * 创建认证中间件
     */
    createAuthMiddleware() {
        return async (req, res, next) => {
            try {
                const token = this.extractToken(req);
                
                if (!token) {
                    return res.status(401).json({
                        success: false,
                        code: 401,
                        message: '缺少认证令牌'
                    });
                }
                
                const authResult = await this.authAdapter.validateToken(token);
                
                if (!authResult.valid) {
                    return res.status(401).json({
                        success: false,
                        code: 401,
                        message: '认证令牌无效'
                    });
                }
                
                // 获取用户信息
                const userInfo = await this.authAdapter.getUserInfo(token);
                req.user = userInfo;
                req.token = token;
                
                next();
                
            } catch (error) {
                console.error('认证中间件错误:', error);
                res.status(500).json({
                    success: false,
                    code: 500,
                    message: '认证服务错误'
                });
            }
        };
    }

    /**
     * 提取Token
     */
    extractToken(req) {
        const { tokenHeader, tokenPrefix } = this.config.auth;
        const authHeader = req.headers[tokenHeader.toLowerCase()];
        
        if (!authHeader) {
            return null;
        }
        
        if (tokenPrefix && authHeader.startsWith(tokenPrefix + ' ')) {
            return authHeader.substring(tokenPrefix.length + 1);
        }
        
        return authHeader;
    }

    /**
     * 同步用户数据
     */
    async syncUsers() {
        if (!this.userSyncAdapter) {
            throw new Error('用户同步适配器未初始化');
        }
        
        try {
            console.log('开始同步用户数据...');
            const result = await this.userSyncAdapter.syncAllUsers();
            console.log('用户同步完成:', result);
            return result;
            
        } catch (error) {
            console.error('用户同步失败:', error);
            throw error;
        }
    }

    /**
     * 获取模块状态
     */
    getStatus() {
        return {
            initialized: this.initialized,
            version: this.config.module.version,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            config: this.getPublicConfig()
        };
    }

    /**
     * 获取公开配置 (不包含敏感信息)
     */
    getPublicConfig() {
        const publicConfig = { ...this.config };
        
        // 移除敏感信息
        delete publicConfig.database.password;
        delete publicConfig.auth.secret;
        
        return publicConfig;
    }

    /**
     * 获取配置值
     */
    getConfigValue(path, defaultValue = null) {
        return path.split('.').reduce((obj, key) => 
            obj && obj[key] !== undefined ? obj[key] : defaultValue, this.config
        );
    }

    /**
     * 合并配置
     */
    mergeConfig(defaultConfig, userConfig) {
        const merge = (target, source) => {
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    target[key] = target[key] || {};
                    merge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
            return target;
        };
        
        return merge({ ...defaultConfig }, userConfig);
    }

    /**
     * 销毁模块
     */
    async destroy() {
        try {
            console.log('正在销毁OA模块...');
            
            // 关闭数据库连接
            if (this.config.database.type === 'mongodb') {
                const mongoose = require('mongoose');
                await mongoose.connection.close();
            }
            
            this.initialized = false;
            console.log('OA模块销毁完成');
            
        } catch (error) {
            console.error('OA模块销毁失败:', error);
            throw error;
        }
    }
}

module.exports = OAModuleAdapter;
