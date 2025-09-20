// 模拟UserImportSchema验证
const { z } = require('zod');

// 模拟角色转换函数
const ROLE_CHINESE_TO_ENGLISH = {
  '管理员': 'admin',
  '专家': 'expert', 
  '教师': 'teacher',
  '学员': 'student',
  '考生': 'student',
  '考评员': 'grader',
  '内部监督员': 'internal_supervisor',
  '内部督导员': 'internal_supervisor',
  '访客': 'guest'
};

function convertChineseRoleToEnglish(chineseRole) {
  return ROLE_CHINESE_TO_ENGLISH[chineseRole] || chineseRole;
}

// 模拟UserImportSchema
const UserImportSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  phone: z.string().min(1, '手机号不能为空').regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  id_card: z.string().min(1, '身份证号不能为空').regex(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/, '身份证号格式不正确'),
  role: z.enum(['admin', 'expert', 'teacher', 'student', 'grader', 'internal_supervisor', 'guest'], {
    errorMap: () => ({ message: '角色必须为：admin, expert, teacher, student, grader, internal_supervisor, guest 之一' })
  }),
  password: z.string().min(1, '密码不能为空').min(6, '密码至少6位字符'),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  employee_id: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  organization: z.string().optional()
});

// 缺失的4个用户原始数据
const missingUsersRaw = [
  { name: '范向军', phone: '13926588494', id_card: '412828198808083537', role: '考评员', password: '123456' },
  { name: '朱金万', phone: '13142934041', id_card: '440981198201283736', role: '考评员', password: '123456' },
  { name: '刘明鑫', phone: '18719048168', id_card: '41292919761006133X', role: '内部督导员', password: '123456' },
  { name: '崔伟', phone: '13266682756', id_card: '413023198107256015', role: '内部督导员', password: '123456' }
];

console.log('=== 验证缺失用户数据 ===\n');

missingUsersRaw.forEach((user, index) => {
  console.log(`--- 用户 ${index + 1}: ${user.name} ---`);
  console.log('原始数据:', user);
  
  // 模拟角色转换
  const convertedUser = {
    ...user,
    role: convertChineseRoleToEnglish(user.role),
    email: '' // 设置为空字符串
  };
  
  console.log('转换后数据:', convertedUser);
  
  try {
    const validatedUser = UserImportSchema.parse(convertedUser);
    console.log('✅ 验证通过');
    console.log('验证结果:', validatedUser);
  } catch (error) {
    console.log('❌ 验证失败');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.log(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.log('  - 未知错误:', error.message);
    }
  }
  
  console.log('');
});

// 测试一个成功导入的用户作为对比
const successUser = {
  name: '李冠锋',
  phone: '13751115626', 
  id_card: '440982198109193654',
  role: '考生',
  password: '123456'
};

console.log('=== 对比：成功导入的用户 ===');
console.log('原始数据:', successUser);
const convertedSuccessUser = {
  ...successUser,
  role: convertChineseRoleToEnglish(successUser.role),
  email: ''
};
console.log('转换后数据:', convertedSuccessUser);

try {
  const validatedSuccessUser = UserImportSchema.parse(convertedSuccessUser);
  console.log('✅ 验证通过');
  console.log('验证结果:', validatedSuccessUser);
} catch (error) {
  console.log('❌ 验证失败');
  if (error instanceof z.ZodError) {
    error.errors.forEach(err => {
      console.log(`  - ${err.path.join('.')}: ${err.message}`);
    });
  }
}