/**
 * 管理员服务模块
 * 处理管理员相关的业务逻辑
 */

import { getSupabaseAdminClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabase = getSupabaseAdminClient();

/**
 * 生成JWT令牌
 * @param user 用户信息
 * @returns JWT令牌和刷新令牌
 */
function generateTokens(user: any) {
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  
  const token = jwt.sign(
    { 
      userId: user.id, 
      phone: user.phone,
      role: user.role,
      userType: 'admin'
    },
    jwtSecret,
    { expiresIn: '24h' }
  );
  
  const refreshToken = jwt.sign(
    { 
      userId: user.id, 
      phone: user.phone,
      type: 'refresh'
    },
    refreshSecret,
    { expiresIn: '7d' }
  );
  
  return { token, refreshToken };
}

/**
 * 管理员登录函数
 * @param phone 手机号
 * @param password 密码
 * @returns 登录结果
 */
export async function loginAdmin(phone: string, password: string) {
  try {
    console.log('尝试管理员登录:', { phone });
    
    // 从admin_users表查询管理员
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('phone', phone)
      .eq('status', 'active')
      .single();

    if (error || !admin) {
      console.log('管理员不存在或已停用:', error?.message);
      return {
        success: false,
        message: '管理员账号不存在或已停用'
      };
    }

    // 验证密码
    console.log('管理员密码验证调试信息:', {
      inputPassword: password,
      inputPasswordLength: password.length,
      storedHash: admin.password_hash,
      storedHashLength: admin.password_hash?.length,
      adminId: admin.id,
      phone: admin.phone
    });
    
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    console.log('bcrypt.compare结果:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('管理员密码验证失败，抛出错误');
      
      // 增加登录失败次数
      await supabase
        .from('admin_users')
        .update({ 
          login_attempts: (admin.login_attempts || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', admin.id);
      
      return {
        success: false,
        message: '密码错误'
      };
    }

    // 更新登录信息
    await supabase
      .from('admin_users')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: '127.0.0.1', // 在实际应用中应该获取真实IP
        login_attempts: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', admin.id);

    // 生成JWT令牌
    const { token, refreshToken } = generateTokens(admin);

    // 构建返回的用户信息
    const userInfo = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      phone: admin.phone,
      realName: admin.real_name,
      role: admin.role,
      permissions: admin.permissions || [],
      status: admin.status,
      avatarUrl: admin.avatar_url,
      department: admin.department,
      position: admin.position,
      userType: 'admin'
    };

    console.log('管理员登录成功:', { id: admin.id, username: admin.username, role: admin.role });
    
    return {
      success: true,
      user: userInfo,
      token,
      refreshToken,
      message: '登录成功'
    };
  } catch (error) {
    console.error('管理员登录错误:', error);
    return {
      success: false,
      message: '登录过程中发生错误'
    };
  }
}

/**
 * 验证管理员权限
 * @param adminId 管理员ID
 * @param permission 权限名称
 * @returns 是否有权限
 */
export async function checkAdminPermission(adminId: string, permission: string): Promise<boolean> {
  try {
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('role, permissions')
      .eq('id', adminId)
      .eq('status', 'active')
      .single();

    if (error || !admin) {
      return false;
    }

    // 超级管理员拥有所有权限
    if (admin.role === 'super_admin') {
      return true;
    }

    // 检查具体权限
    return admin.permissions && admin.permissions.includes(permission);
  } catch (error) {
    console.error('检查管理员权限错误:', error);
    return false;
  }
}

/**
 * 获取管理员信息
 * @param adminId 管理员ID
 * @returns 管理员信息
 */
export async function getAdminInfo(adminId: string) {
  try {
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', adminId)
      .eq('status', 'active')
      .single();

    if (error || !admin) {
      return {
        success: false,
        message: '管理员不存在'
      };
    }

    const userInfo = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      phone: admin.phone,
      realName: admin.real_name,
      role: admin.role,
      permissions: admin.permissions || [],
      status: admin.status,
      avatarUrl: admin.avatar_url,
      department: admin.department,
      position: admin.position,
      createdAt: admin.created_at,
      updatedAt: admin.updated_at
    };

    return {
      success: true,
      user: userInfo
    };
  } catch (error) {
    console.error('获取管理员信息错误:', error);
    return {
      success: false,
      message: '获取管理员信息失败'
    };
  }
}