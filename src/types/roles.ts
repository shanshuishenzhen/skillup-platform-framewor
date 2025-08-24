/**
 * 用户角色枚举定义
 * 定义系统中所有可用的用户角色类型
 */
export enum UserRole {
  ADMIN = 'admin',
  EXPERT = 'expert', 
  TEACHER = 'teacher',
  STUDENT = 'student',
  GRADER = 'grader',
  INTERNAL_SUPERVISOR = 'internal_supervisor',
  GUEST = 'guest'
}

/**
 * 角色显示名称字典映射表
 * 用于在界面上显示角色的中文名称
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [UserRole.ADMIN]: '管理员',
  [UserRole.EXPERT]: '专家',
  [UserRole.TEACHER]: '教师',
  [UserRole.STUDENT]: '考生',
  [UserRole.GRADER]: '考评员',
  [UserRole.INTERNAL_SUPERVISOR]: '内部督导员',
  [UserRole.GUEST]: '访客'
};

/**
 * 角色权限级别定义
 * 数值越高权限越大
 */
export const ROLE_PERMISSIONS: Record<UserRole, number> = {
  [UserRole.ADMIN]: 100,
  [UserRole.INTERNAL_SUPERVISOR]: 80,
  [UserRole.EXPERT]: 70,
  [UserRole.TEACHER]: 60,
  [UserRole.GRADER]: 50,
  [UserRole.STUDENT]: 30,
  [UserRole.GUEST]: 10
};

/**
 * 获取角色的显示名称
 * @param role 角色枚举值
 * @returns 角色的中文显示名称
 */
export function getRoleDisplayName(role: UserRole): string {
  return ROLE_DISPLAY_NAMES[role] || role;
}

/**
 * 获取所有可用角色列表
 * @returns 角色选项数组，包含值和显示名称
 */
export function getAllRoleOptions(): Array<{ value: UserRole; label: string }> {
  return Object.values(UserRole).map(role => ({
    value: role,
    label: ROLE_DISPLAY_NAMES[role]
  }));
}

/**
 * 检查角色是否有效
 * @param role 要检查的角色字符串
 * @returns 是否为有效角色
 */
export function isValidRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

/**
 * 角色验证函数，用于表单验证
 * @param role 要验证的角色
 * @returns 验证结果
 */
export function validateRole(role: string): { isValid: boolean; error?: string } {
  if (!role) {
    return { isValid: false, error: '角色不能为空' };
  }
  
  if (!isValidRole(role)) {
    return { isValid: false, error: '无效的角色类型' };
  }
  
  return { isValid: true };
}