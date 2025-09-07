/**
 * 测试数据设置脚本
 * 用于创建端到端测试所需的测试用户和数据
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import path from 'path';

// 加载环境变量
config({ path: path.resolve(process.cwd(), '.env.local') });

// 从环境变量获取Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的环境变量:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

// 创建Supabase客户端（使用service role key以获得管理员权限）
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 测试用户数据
const TEST_USERS = [
  {
    phone: '13800000001',
    password: 'password123',
    name: '测试管理员',
    role: 'admin',
    user_type: 'registered'
  },
  {
    phone: '13800000002', 
    password: 'student123',
    name: '测试学生',
    role: 'student',
    user_type: 'registered'
  },
  {
    phone: '13800000003',
    password: 'password123', 
    name: '测试教师',
    role: 'teacher',
    user_type: 'registered'
  }
];

/**
 * 创建测试用户
 * @param userData 用户数据
 * @returns Promise<boolean> 是否创建成功
 */
async function createTestUser(userData: typeof TEST_USERS[0]): Promise<boolean> {
  try {
    // 生成密码哈希
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    // 插入用户数据
    const { data, error } = await supabase
      .from('users')
      .upsert({
        phone: userData.phone,
        password_hash: passwordHash,
        name: userData.name,
        role: userData.role,
        user_type: userData.user_type,
        is_verified: true,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'phone'
      });
    
    if (error) {
      console.error(`创建用户 ${userData.phone} 失败:`, error);
      return false;
    }
    
    console.log(`✅ 成功创建/更新用户: ${userData.name} (${userData.phone})`);
    
    // 如果是管理员，同时创建admin_users记录
    if (userData.role === 'admin') {
      const { error: adminError } = await supabase
        .from('admin_users')
        .upsert({
          username: `admin${userData.phone.slice(-3)}`,
          email: `admin${userData.phone.slice(-3)}@test.com`,
          password_hash: passwordHash,
          real_name: userData.name,
          role: 'admin',
          status: 'active',
          phone: userData.phone,
          department: '技术部',
          position: '系统管理员',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'username'
        });
      
      if (adminError) {
        console.error(`创建管理员用户 ${userData.phone} 失败:`, adminError);
        return false;
      }
      
      console.log(`✅ 成功创建/更新管理员用户: ${userData.name}`);
    }
    
    return true;
  } catch (error) {
    console.error(`创建用户 ${userData.phone} 时发生异常:`, error);
    return false;
  }
}

/**
 * 设置所有测试数据
 * @returns Promise<boolean> 是否全部设置成功
 */
export async function setupTestData(): Promise<boolean> {
  console.log('🚀 开始设置测试数据...');
  
  let allSuccess = true;
  
  // 创建所有测试用户
  for (const userData of TEST_USERS) {
    const success = await createTestUser(userData);
    if (!success) {
      allSuccess = false;
    }
  }
  
  if (allSuccess) {
    console.log('✅ 所有测试数据设置完成！');
  } else {
    console.log('❌ 部分测试数据设置失败！');
  }
  
  return allSuccess;
}

/**
 * 清理测试数据
 * @returns Promise<boolean> 是否清理成功
 */
export async function cleanupTestData(): Promise<boolean> {
  console.log('🧹 开始清理测试数据...');
  
  try {
    // 删除测试用户
    const testPhones = TEST_USERS.map(user => user.phone);
    
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .in('phone', testPhones);
    
    if (usersError) {
      console.error('清理users表失败:', usersError);
      return false;
    }
    
    const { error: adminError } = await supabase
      .from('admin_users')
      .delete()
      .in('phone', testPhones);
    
    if (adminError) {
      console.error('清理admin_users表失败:', adminError);
      return false;
    }
    
    console.log('✅ 测试数据清理完成！');
    return true;
  } catch (error) {
    console.error('清理测试数据时发生异常:', error);
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  setupTestData()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('设置测试数据失败:', error);
      process.exit(1);
    });
}