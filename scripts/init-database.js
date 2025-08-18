#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// 检查sqlite3模块是否可用
let sqlite3;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (error) {
  console.error('❌ sqlite3模块未安装，请运行: npm install sqlite3');
  process.exit(1);
}

// 配置
const DB_PATH = path.join(process.cwd(), 'data', 'skillup.db');
const DATA_DIR = path.join(process.cwd(), 'data');

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 创建数据目录
function createDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    log('✅ 创建数据目录', 'green');
  }
}

// 数据库表结构
const tables = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'student',
      full_name VARCHAR(100),
      department VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active BOOLEAN DEFAULT 1
    )
  `,
  
  courses: `
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      industry VARCHAR(50),
      difficulty VARCHAR(20),
      instructor_id INTEGER,
      image_url VARCHAR(500),
      duration_hours INTEGER,
      price DECIMAL(10,2) DEFAULT 0,
      is_published BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instructor_id) REFERENCES users(id)
    )
  `,
  
  enrollments: `
    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      progress DECIMAL(5,2) DEFAULT 0,
      completed_at DATETIME,
      grade DECIMAL(5,2),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (course_id) REFERENCES courses(id),
      UNIQUE(user_id, course_id)
    )
  `,
  
  exams: `
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      duration_minutes INTEGER DEFAULT 60,
      total_questions INTEGER DEFAULT 0,
      passing_score DECIMAL(5,2) DEFAULT 60,
      is_published BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id)
    )
  `,
  
  questions: `
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type VARCHAR(20) DEFAULT 'multiple_choice',
      options JSON,
      correct_answer TEXT,
      points DECIMAL(5,2) DEFAULT 1,
      explanation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES exams(id)
    )
  `,
  
  exam_attempts: `
    CREATE TABLE IF NOT EXISTS exam_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      exam_id INTEGER NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      submitted_at DATETIME,
      score DECIMAL(5,2),
      answers JSON,
      is_completed BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (exam_id) REFERENCES exams(id)
    )
  `
};

// 初始化数据库
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    log('\n📊 初始化数据库...', 'blue');
    
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        log('❌ 数据库连接失败: ' + err.message, 'red');
        reject(err);
        return;
      }
      
      log('✅ 数据库连接成功', 'green');
      
      // 创建表
      const tableNames = Object.keys(tables);
      let completed = 0;
      
      tableNames.forEach((tableName) => {
        db.run(tables[tableName], (err) => {
          if (err) {
            log(`❌ 创建表 ${tableName} 失败: ${err.message}`, 'red');
            reject(err);
            return;
          }
          
          log(`✅ 创建表: ${tableName}`, 'green');
          completed++;
          
          if (completed === tableNames.length) {
            db.close((err) => {
              if (err) {
                log('❌ 关闭数据库连接失败: ' + err.message, 'red');
                reject(err);
              } else {
                log('✅ 数据库初始化完成', 'green');
                resolve();
              }
            });
          }
        });
      });
    });
  });
}

// 插入示例数据
function seedDatabase() {
  return new Promise((resolve, reject) => {
    log('\n🌱 插入示例数据...', 'blue');
    
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // 检查是否已有数据
      db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row.count > 0) {
          log('⚠️ 数据库已有数据，跳过种子数据插入', 'yellow');
          db.close();
          resolve();
          return;
        }
        
        // 插入示例用户
        const users = [
          ['admin', 'admin@skillup.com', 'admin123', 'admin', '系统管理员', 'IT部门'],
          ['teacher1', 'teacher1@skillup.com', 'teacher123', 'teacher', '张伟', '金融学院'],
          ['teacher2', 'teacher2@skillup.com', 'teacher123', 'teacher', '李娜', '医学院'],
          ['student1', 'student1@skillup.com', 'student123', 'student', '王小明', '计算机系'],
          ['student2', 'student2@skillup.com', 'student123', 'student', '李小红', '金融系']
        ];
        
        const userStmt = db.prepare(`
          INSERT INTO users (username, email, password_hash, role, full_name, department)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        users.forEach(user => {
          userStmt.run(user, (err) => {
            if (err) log(`⚠️ 插入用户失败: ${err.message}`, 'yellow');
          });
        });
        
        userStmt.finalize();
        
        // 插入示例课程
        const courses = [
          ['金融科技（FinTech）实战', '深入探讨区块链、量化交易和监管科技等核心金融科技领域', '金融', '中级', 2, 'https://placehold.co/400x225/165DFF/FFFFFF?text=FinTech', 40, 299.00, 1],
          ['AI驱动的医疗诊断', '探索如何运用深度学习和计算机视觉技术来辅助医疗诊断', '医疗', '高级', 3, 'https://placehold.co/400x225/36D399/FFFFFF?text=Medical', 60, 499.00, 1],
          ['K-12在线教育产品设计', '学习如何设计符合下一代学习习惯的互动式在线课程', '教育', '初级', 2, 'https://placehold.co/400x225/6B7280/FFFFFF?text=Education', 30, 199.00, 1]
        ];
        
        const courseStmt = db.prepare(`
          INSERT INTO courses (title, description, industry, difficulty, instructor_id, image_url, duration_hours, price, is_published)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        courses.forEach(course => {
          courseStmt.run(course, (err) => {
            if (err) log(`⚠️ 插入课程失败: ${err.message}`, 'yellow');
          });
        });
        
        courseStmt.finalize();
        
        log('✅ 示例数据插入完成', 'green');
        
        db.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  });
}

// 主函数
async function main() {
  try {
    createDataDirectory();
    await initializeDatabase();
    await seedDatabase();
    log('\n🎉 数据库初始化完成!', 'green');
  } catch (error) {
    log('\n❌ 数据库初始化失败', 'red');
    log('错误信息: ' + error.message, 'red');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { initializeDatabase, seedDatabase };
