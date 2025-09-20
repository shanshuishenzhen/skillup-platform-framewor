require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// 缺失的4个用户信息
const missingUsers = [
  { name: '范向军', phone: '13926588494', id_card: '412828198808083537', role: '考评员' },
  { name: '朱金万', phone: '13142934041', id_card: '440981198201283736', role: '考评员' },
  { name: '刘明鑫', phone: '18719048168', id_card: '41292919761006133X', role: '内部督导员' },
  { name: '崔伟', phone: '13266682756', id_card: '413023198107256015', role: '内部督导员' }
];

async function checkDuplicates() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  console.log('=== 检查缺失用户是否与现有用户重复 ===\n');
  
  for (const user of missingUsers) {
    console.log(`--- 检查用户: ${user.name} (${user.role}) ---`);
    console.log(`手机号: ${user.phone}`);
    console.log(`身份证: ${user.id_card}`);
    
    // 检查手机号重复
    const { data: phoneData, error: phoneError } = await supabase
      .from('users')
      .select('name, phone, role, import_source')
      .eq('phone', user.phone);
    
    if (phoneError) {
      console.log('手机号查询错误:', phoneError.message);
    } else if (phoneData && phoneData.length > 0) {
      console.log('❌ 手机号重复:');
      phoneData.forEach(existing => {
        console.log(`  - ${existing.name} (${existing.role}) - 来源: ${existing.import_source}`);
      });
    } else {
      console.log('✅ 手机号无重复');
    }
    
    // 检查身份证重复
    const { data: idData, error: idError } = await supabase
      .from('users')
      .select('name, id_card, role, import_source')
      .eq('id_card', user.id_card);
    
    if (idError) {
      console.log('身份证查询错误:', idError.message);
    } else if (idData && idData.length > 0) {
      console.log('❌ 身份证重复:');
      idData.forEach(existing => {
        console.log(`  - ${existing.name} (${existing.role}) - 来源: ${existing.import_source}`);
      });
    } else {
      console.log('✅ 身份证无重复');
    }
    
    console.log('');
  }
  
  // 检查数据库中所有用户的导入来源
  console.log('=== 数据库中所有用户的导入来源分布 ===');
  const { data: allUsers, error: allError } = await supabase
    .from('users')
    .select('name, role, import_source')
    .order('import_source');
  
  if (allError) {
    console.log('查询所有用户错误:', allError.message);
  } else {
    const sourceGroups = {};
    allUsers.forEach(user => {
      const source = user.import_source || 'unknown';
      if (!sourceGroups[source]) {
        sourceGroups[source] = [];
      }
      sourceGroups[source].push(user);
    });
    
    Object.keys(sourceGroups).forEach(source => {
      console.log(`\n${source}: ${sourceGroups[source].length}个用户`);
      sourceGroups[source].forEach(user => {
        console.log(`  - ${user.name} (${user.role})`);
      });
    });
  }
}

checkDuplicates().catch(console.error);