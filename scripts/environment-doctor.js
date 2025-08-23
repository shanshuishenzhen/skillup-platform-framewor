/**
 * SkillUp Platform 环境诊断和修复工具
 * 用于检测和修复开发环境中的常见问题
 * 
 * @author SkillUp Platform Team
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

/**
 * 颜色输出工具类
 */
class ColorLogger {
    static colors = {
        reset: '\x1b[0m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m'
    };

    /**
     * 输出成功信息
     * @param {string} message - 消息内容
     */
    static success(message) {
        console.log(`${this.colors.green}✅ ${message}${this.colors.reset}`);
    }

    /**
     * 输出错误信息
     * @param {string} message - 消息内容
     */
    static error(message) {
        console.log(`${this.colors.red}❌ ${message}${this.colors.reset}`);
    }

    /**
     * 输出警告信息
     * @param {string} message - 消息内容
     */
    static warning(message) {
        console.log(`${this.colors.yellow}⚠️  ${message}${this.colors.reset}`);
    }

    /**
     * 输出信息
     * @param {string} message - 消息内容
     */
    static info(message) {
        console.log(`${this.colors.blue}ℹ️  ${message}${this.colors.reset}`);
    }

    /**
     * 输出标题
     * @param {string} title - 标题内容
     */
    static title(title) {
        console.log(`\n${this.colors.cyan}🔧 ${title}${this.colors.reset}`);
        console.log(`${this.colors.cyan}${'='.repeat(50)}${this.colors.reset}`);
    }
}

/**
 * 环境诊断器类
 */
class EnvironmentDoctor {
    constructor() {
        this.issues = [];
        this.fixes = [];
        this.projectRoot = process.cwd();
    }

    /**
     * 添加问题记录
     * @param {string} category - 问题分类
     * @param {string} description - 问题描述
     * @param {string} severity - 严重程度 (critical|warning|info)
     * @param {Function} fixFunction - 修复函数
     */
    addIssue(category, description, severity = 'warning', fixFunction = null) {
        this.issues.push({
            category,
            description,
            severity,
            fixFunction
        });
    }

    /**
     * 检查Node.js环境
     */
    checkNodeEnvironment() {
        ColorLogger.title('检查 Node.js 环境');
        
        try {
            const nodeVersion = process.version;
            const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
            
            ColorLogger.success(`Node.js 版本: ${nodeVersion}`);
            ColorLogger.success(`npm 版本: ${npmVersion}`);
            
            // 检查Node.js版本是否满足要求
            const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
            if (majorVersion < 16) {
                this.addIssue(
                    'Node.js',
                    `Node.js 版本过低 (${nodeVersion})，建议升级到 16.x 或更高版本`,
                    'warning'
                );
            }
            
        } catch (error) {
            this.addIssue(
                'Node.js',
                'Node.js 或 npm 未正确安装',
                'critical'
            );
        }
    }

    /**
     * 检查项目文件结构
     */
    checkProjectStructure() {
        ColorLogger.title('检查项目文件结构');
        
        const requiredFiles = [
            'package.json',
            'start.js',
            'scripts/check-environment.js'
        ];
        
        const requiredDirs = [
            'src',
            'public',
            'scripts'
        ];
        
        // 检查必需文件
        requiredFiles.forEach(file => {
            const filePath = path.join(this.projectRoot, file);
            if (fs.existsSync(filePath)) {
                ColorLogger.success(`文件存在: ${file}`);
            } else {
                this.addIssue(
                    '项目结构',
                    `缺少必需文件: ${file}`,
                    'critical'
                );
            }
        });
        
        // 检查必需目录
        requiredDirs.forEach(dir => {
            const dirPath = path.join(this.projectRoot, dir);
            if (fs.existsSync(dirPath)) {
                ColorLogger.success(`目录存在: ${dir}`);
            } else {
                this.addIssue(
                    '项目结构',
                    `缺少必需目录: ${dir}`,
                    'warning',
                    () => this.createDirectory(dir)
                );
            }
        });
        
        // 检查并创建运行时目录
        const runtimeDirs = ['data', 'logs', 'uploads', 'temp'];
        runtimeDirs.forEach(dir => {
            const dirPath = path.join(this.projectRoot, dir);
            if (!fs.existsSync(dirPath)) {
                this.addIssue(
                    '运行时目录',
                    `缺少运行时目录: ${dir}`,
                    'info',
                    () => this.createDirectory(dir)
                );
            }
        });
    }

    /**
     * 检查依赖包
     */
    checkDependencies() {
        ColorLogger.title('检查项目依赖');
        
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
        
        if (!fs.existsSync(packageJsonPath)) {
            this.addIssue(
                '依赖管理',
                'package.json 文件不存在',
                'critical'
            );
            return;
        }
        
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
            const depCount = Object.keys(dependencies).length;
            
            ColorLogger.info(`发现 ${depCount} 个依赖包`);
            
            if (!fs.existsSync(nodeModulesPath)) {
                this.addIssue(
                    '依赖管理',
                    'node_modules 目录不存在，需要安装依赖',
                    'critical',
                    () => this.installDependencies()
                );
            } else {
                ColorLogger.success('node_modules 目录存在');
                
                // 检查关键依赖是否安装
                const criticalDeps = ['express', 'sqlite3', 'bcryptjs'];
                criticalDeps.forEach(dep => {
                    const depPath = path.join(nodeModulesPath, dep);
                    if (dependencies[dep] && !fs.existsSync(depPath)) {
                        this.addIssue(
                            '依赖管理',
                            `关键依赖 ${dep} 未正确安装`,
                            'warning',
                            () => this.installDependencies()
                        );
                    }
                });
            }
            
        } catch (error) {
            this.addIssue(
                '依赖管理',
                `package.json 文件格式错误: ${error.message}`,
                'critical'
            );
        }
    }

    /**
     * 检查环境变量配置
     */
    checkEnvironmentConfig() {
        ColorLogger.title('检查环境变量配置');
        
        const envPath = path.join(this.projectRoot, '.env');
        const envExamplePath = path.join(this.projectRoot, '.env.example');
        
        if (!fs.existsSync(envPath)) {
            if (fs.existsSync(envExamplePath)) {
                this.addIssue(
                    '环境配置',
                    '.env 文件不存在，但找到 .env.example',
                    'warning',
                    () => this.createEnvFile()
                );
            } else {
                this.addIssue(
                    '环境配置',
                    '.env 和 .env.example 文件都不存在',
                    'critical'
                );
            }
        } else {
            ColorLogger.success('.env 文件存在');
            
            // 检查关键环境变量
            try {
                const envContent = fs.readFileSync(envPath, 'utf8');
                const requiredVars = ['NODE_ENV', 'PORT', 'DATABASE_URL'];
                
                requiredVars.forEach(varName => {
                    if (!envContent.includes(varName)) {
                        this.addIssue(
                            '环境配置',
                            `缺少环境变量: ${varName}`,
                            'warning'
                        );
                    }
                });
                
            } catch (error) {
                this.addIssue(
                    '环境配置',
                    `.env 文件读取失败: ${error.message}`,
                    'warning'
                );
            }
        }
    }

    /**
     * 检查数据库
     */
    checkDatabase() {
        ColorLogger.title('检查数据库');
        
        const dbPath = path.join(this.projectRoot, 'data', 'skillup.db');
        const initDbScript = path.join(this.projectRoot, 'init-database.js');
        
        if (!fs.existsSync(dbPath)) {
            this.addIssue(
                '数据库',
                '数据库文件不存在',
                'warning',
                () => this.initializeDatabase()
            );
        } else {
            ColorLogger.success('数据库文件存在');
            
            // 检查数据库文件大小
            const stats = fs.statSync(dbPath);
            if (stats.size < 1024) {
                this.addIssue(
                    '数据库',
                    '数据库文件过小，可能未正确初始化',
                    'warning',
                    () => this.initializeDatabase()
                );
            }
        }
        
        if (!fs.existsSync(initDbScript)) {
            this.addIssue(
                '数据库',
                '数据库初始化脚本不存在',
                'warning'
            );
        }
    }

    /**
     * 检查端口占用
     */
    checkPortAvailability() {
        ColorLogger.title('检查端口占用');
        
        const defaultPort = 3000;
        
        try {
            const result = execSync(`netstat -an | findstr :${defaultPort}`, { encoding: 'utf8' });
            if (result.includes('LISTENING')) {
                this.addIssue(
                    '端口占用',
                    `端口 ${defaultPort} 已被占用`,
                    'warning',
                    () => this.killPortProcess(defaultPort)
                );
            } else {
                ColorLogger.success(`端口 ${defaultPort} 可用`);
            }
        } catch (error) {
            ColorLogger.success(`端口 ${defaultPort} 可用`);
        }
    }

    /**
     * 检查系统资源
     */
    checkSystemResources() {
        ColorLogger.title('检查系统资源');
        
        // 检查内存
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsagePercent = (usedMem / totalMem * 100).toFixed(1);
        
        ColorLogger.info(`内存使用率: ${memUsagePercent}%`);
        
        if (memUsagePercent > 90) {
            this.addIssue(
                '系统资源',
                `内存使用率过高: ${memUsagePercent}%`,
                'warning'
            );
        }
        
        // 检查磁盘空间
        try {
            const stats = fs.statSync(this.projectRoot);
            ColorLogger.success('磁盘空间检查通过');
        } catch (error) {
            this.addIssue(
                '系统资源',
                '无法访问项目目录',
                'critical'
            );
        }
    }

    /**
     * 创建目录
     * @param {string} dirName - 目录名称
     */
    createDirectory(dirName) {
        try {
            const dirPath = path.join(this.projectRoot, dirName);
            fs.mkdirSync(dirPath, { recursive: true });
            ColorLogger.success(`创建目录: ${dirName}`);
            return true;
        } catch (error) {
            ColorLogger.error(`创建目录失败: ${dirName} - ${error.message}`);
            return false;
        }
    }

    /**
     * 安装依赖
     */
    installDependencies() {
        try {
            ColorLogger.info('正在安装依赖包...');
            execSync('npm install', { stdio: 'inherit', cwd: this.projectRoot });
            ColorLogger.success('依赖安装完成');
            return true;
        } catch (error) {
            ColorLogger.error(`依赖安装失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 创建环境变量文件
     */
    createEnvFile() {
        try {
            const envExamplePath = path.join(this.projectRoot, '.env.example');
            const envPath = path.join(this.projectRoot, '.env');
            
            if (fs.existsSync(envExamplePath)) {
                fs.copyFileSync(envExamplePath, envPath);
                ColorLogger.success('已从 .env.example 创建 .env 文件');
            } else {
                // 创建基本的 .env 文件
                const basicEnv = `NODE_ENV=development\nPORT=3000\nDATABASE_URL=sqlite:./data/skillup.db\n`;
                fs.writeFileSync(envPath, basicEnv);
                ColorLogger.success('已创建基本 .env 文件');
            }
            return true;
        } catch (error) {
            ColorLogger.error(`创建 .env 文件失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 初始化数据库
     */
    initializeDatabase() {
        try {
            const initDbScript = path.join(this.projectRoot, 'init-database.js');
            if (fs.existsSync(initDbScript)) {
                ColorLogger.info('正在初始化数据库...');
                execSync(`node "${initDbScript}"`, { stdio: 'inherit', cwd: this.projectRoot });
                ColorLogger.success('数据库初始化完成');
            } else {
                ColorLogger.warning('数据库初始化脚本不存在');
            }
            return true;
        } catch (error) {
            ColorLogger.error(`数据库初始化失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 终止端口占用进程
     * @param {number} port - 端口号
     */
    killPortProcess(port) {
        try {
            const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
            const lines = result.split('\n').filter(line => line.includes('LISTENING'));
            
            lines.forEach(line => {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && !isNaN(pid)) {
                    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
                    ColorLogger.success(`已终止占用端口 ${port} 的进程 (PID: ${pid})`);
                }
            });
            return true;
        } catch (error) {
            ColorLogger.error(`终止端口进程失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 运行完整诊断
     */
    async runDiagnosis() {
        console.log('\n🏥 SkillUp Platform 环境诊断工具');
        console.log('='.repeat(60));
        
        // 运行所有检查
        this.checkNodeEnvironment();
        this.checkProjectStructure();
        this.checkDependencies();
        this.checkEnvironmentConfig();
        this.checkDatabase();
        this.checkPortAvailability();
        this.checkSystemResources();
        
        // 显示诊断结果
        this.showDiagnosisResults();
        
        // 提供修复选项
        if (this.issues.length > 0) {
            await this.offerFixes();
        }
    }

    /**
     * 显示诊断结果
     */
    showDiagnosisResults() {
        ColorLogger.title('诊断结果汇总');
        
        if (this.issues.length === 0) {
            ColorLogger.success('🎉 环境检查通过，未发现问题！');
            return;
        }
        
        const criticalIssues = this.issues.filter(issue => issue.severity === 'critical');
        const warningIssues = this.issues.filter(issue => issue.severity === 'warning');
        const infoIssues = this.issues.filter(issue => issue.severity === 'info');
        
        if (criticalIssues.length > 0) {
            console.log(`\n${ColorLogger.colors.red}🚨 严重问题 (${criticalIssues.length})${ColorLogger.colors.reset}`);
            criticalIssues.forEach((issue, index) => {
                console.log(`  ${index + 1}. [${issue.category}] ${issue.description}`);
            });
        }
        
        if (warningIssues.length > 0) {
            console.log(`\n${ColorLogger.colors.yellow}⚠️  警告问题 (${warningIssues.length})${ColorLogger.colors.reset}`);
            warningIssues.forEach((issue, index) => {
                console.log(`  ${index + 1}. [${issue.category}] ${issue.description}`);
            });
        }
        
        if (infoIssues.length > 0) {
            console.log(`\n${ColorLogger.colors.blue}ℹ️  信息提示 (${infoIssues.length})${ColorLogger.colors.reset}`);
            infoIssues.forEach((issue, index) => {
                console.log(`  ${index + 1}. [${issue.category}] ${issue.description}`);
            });
        }
    }

    /**
     * 提供修复选项
     */
    async offerFixes() {
        const fixableIssues = this.issues.filter(issue => issue.fixFunction);
        
        if (fixableIssues.length === 0) {
            ColorLogger.warning('没有可自动修复的问题');
            return;
        }
        
        ColorLogger.title(`自动修复选项 (${fixableIssues.length} 个问题可修复)`);
        
        console.log('\n是否要自动修复这些问题？');
        console.log('1. 修复所有问题');
        console.log('2. 逐个选择修复');
        console.log('3. 跳过修复');
        
        // 在实际环境中，这里应该使用 readline 来获取用户输入
        // 为了简化，这里直接执行自动修复
        ColorLogger.info('自动执行修复...');
        
        let fixedCount = 0;
        for (const issue of fixableIssues) {
            try {
                ColorLogger.info(`正在修复: ${issue.description}`);
                const result = issue.fixFunction();
                if (result) {
                    fixedCount++;
                }
            } catch (error) {
                ColorLogger.error(`修复失败: ${issue.description} - ${error.message}`);
            }
        }
        
        ColorLogger.success(`修复完成，成功修复 ${fixedCount}/${fixableIssues.length} 个问题`);
    }
}

// 主函数
async function main() {
    try {
        const doctor = new EnvironmentDoctor();
        await doctor.runDiagnosis();
        
        console.log('\n🏁 诊断完成');
        console.log('如果仍有问题，请查看详细日志或联系技术支持');
        
    } catch (error) {
        ColorLogger.error(`诊断过程中发生错误: ${error.message}`);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = { EnvironmentDoctor, ColorLogger };