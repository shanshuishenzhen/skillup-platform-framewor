-- 查询所有用户数据，按创建时间排序
SELECT 
  id,
  name,
  phone,
  email,
  role,
  id_card,
  employee_id,
  department,
  import_source,
  import_batch_id,
  import_date,
  created_at,
  is_verified
FROM users 
ORDER BY created_at DESC
LIMIT 50;

-- 统计用户总数
SELECT COUNT(*) as total_users FROM users;

-- 查询最近导入的用户（按导入来源分组）
SELECT 
  import_source,
  COUNT(*) as count,
  MAX(import_date) as latest_import
FROM users 
GROUP BY import_source;

-- 查询最近24小时内创建的用户
SELECT 
  id,
  name,
  phone,
  role,
  import_source,
  created_at
FROM users 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;