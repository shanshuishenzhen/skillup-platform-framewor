require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 原始20个用户数据
const originalUsers = [
  { name: 'niemiao', phone: '13410511339', role: '管理员' },
  { name: '范向军', phone: '13926588494', role: '考评员' },
  { name: '朱金万', phone: '13142934041', role: '考评员' },
  { name: '卢德城', phone: '13713656583', role: '专家' },
  { name: '万春城', phone: '15013660543', role: '专家' },
  { name: '刘明鑫', phone: '18719048168', role: '内部督导员' },
  { name: '崔伟', phone: '13266682756', role: '内部督导员' },
  { name: '李冠锋', phone: '13751115626', role: '考生' },
  { name: '莫志球', phone: '13670106875', role: '考生' },
  { name: '吴红卫', phone: '13692962558', role: '考生' },
  { name: '邹远昌', phone: '13670147182', role: '考生' },
  { name: '涂云贵', phone: '13638152562', role: '考生' },
  { name: '冯志锋', phone: '15986832038', role: '考生' },
  { name: '贾冠军', phone: '17727988891', role: '考生' },
  { name: '刘兆繁', phone: '13267249717', role: '考生' },
  { name: '陈春荣', phone: '13682654142', role: '考生' },
  { name: '牛强', phone: '17820651456', role: '考生' },
  { name: '廖海华', phone: '15115199368', role: '考生' },
  { name: '罗明奎', phone: '13528807309', role: '考生' },
  { name: '郑少泽', phone: '18219194667', role: '考生' }
];

async function analyzeMissingUsers() {
  try {
    // 查询数据库中导入的用户
    const { data: importedUsers, error } = await supabase
      .from('users')
      .select('name, phone, role')
      .eq('import_source', 'excel_import');
    
    if (error) {
      console.error('查询错误:', error);
      return;
    }
    
    console.log('=== 分析缺失用户 ===');
    console.log('原始用户数量:', originalUsers.length);
    console.log('导入用户数量:', importedUsers.length);
    console.log('缺失用户数量:', originalUsers.length - importedUsers.length);
    
    // 创建导入用户的手机号集合
    const importedPhones = new Set(importedUsers.map(user => user.phone));
    
    // 找出缺失的用户
    const missingUsers = originalUsers.filter(user => !importedPhones.has(user.phone));
    
    console.log('\n=== 缺失的用户 ===');
    missingUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} - ${user.phone} - ${user.role}`);
    });
    
    console.log('\n=== 成功导入的用户 ===');
    const successfulUsers = originalUsers.filter(user => importedPhones.has(user.phone));
    successfulUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} - ${user.phone} - ${user.role}`);
    });
    
    // 分析缺失用户的特征
    console.log('\n=== 缺失用户特征分析 ===');
    const missingRoles = missingUsers.map(user => user.role);
    const roleCount = {};
    missingRoles.forEach(role => {
      roleCount[role] = (roleCount[role] || 0) + 1;
    });
    
    console.log('缺失用户按角色分布:');
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`- ${role}: ${count}个`);
    });
    
  } catch (error) {
    console.error('执行错误:', error);
  }
}

analyzeMissingUsers();