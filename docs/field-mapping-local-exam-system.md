# 本地考试系统与云端平台字段映射表

## 用户分类和权限映射

### 用户角色映射
| 云端平台角色 | 本地考试系统角色 | 权限描述 | 映射字段 |
|-------------|-----------------|----------|----------|
| admin | system_admin | 系统管理员，全部权限 | role: 'admin' |
| teacher | exam_admin | 考试管理员，题库管理 | role: 'teacher' |
| examiner | exam_supervisor | 考试监督员，监考权限 | role: 'examiner' |
| student | candidate | 考生，参加考试 | role: 'student' |
| internal_supervisor | internal_auditor | 内部审核员 | role: 'internal_supervisor' |

### 用户状态映射
| 云端状态 | 本地状态 | 描述 | 映射值 |
|---------|---------|------|--------|
| active | enabled | 激活状态 | status: 'active' |
| inactive | disabled | 停用状态 | status: 'inactive' |
| suspended | locked | 锁定状态 | status: 'suspended' |

### 认证等级映射
| 云端等级 | 本地等级 | 技能描述 | 映射字段 |
|---------|---------|----------|----------|
| beginner | level_1 | 初级技能 | skill_level: 'beginner' |
| intermediate | level_2 | 中级技能 | skill_level: 'intermediate' |
| advanced | level_3 | 高级技能 | skill_level: 'advanced' |
| expert | level_4 | 专家级技能 | skill_level: 'expert' |

## 考试数据映射

### 考试类型映射
| 云端类型 | 本地类型 | 描述 | 映射字段 |
|---------|---------|------|----------|
| skill_assessment | skill_test | 技能评估考试 | exam_type: 'skill_assessment' |
| certification | cert_exam | 认证考试 | exam_type: 'certification' |
| practice | practice_test | 练习考试 | exam_type: 'practice' |
| mock | simulation | 模拟考试 | exam_type: 'mock' |

### 题目类型映射
| 云端题型 | 本地题型 | 描述 | 映射字段 |
|---------|---------|------|----------|
| single | single_choice | 单选题 | question_type: 'single' |
| multiple | multiple_choice | 多选题 | question_type: 'multiple' |
| judge | true_false | 判断题 | question_type: 'judge' |
| fill | fill_blank | 填空题 | question_type: 'fill' |
| essay | subjective | 主观题 | question_type: 'essay' |
| practical | hands_on | 实操题 | question_type: 'practical' |

### 难度等级映射
| 云端难度 | 本地难度 | 分值权重 | 映射字段 |
|---------|---------|----------|----------|
| easy | level_1 | 1.0 | difficulty: 'easy' |
| medium | level_2 | 1.5 | difficulty: 'medium' |
| hard | level_3 | 2.0 | difficulty: 'hard' |
| expert | level_4 | 2.5 | difficulty: 'expert' |

## 数据交换格式

### Excel导入格式规范

#### 用户信息表 (users_import.xlsx)
| 列名 | 本地字段 | 云端字段 | 数据类型 | 必填 | 示例 |
|------|---------|---------|----------|------|------|
| 姓名 | full_name | name | string | ✓ | 张三 |
| 工号 | employee_id | employee_id | string | ✓ | EMP001 |
| 邮箱 | email | email | string | ✓ | zhang@company.com |
| 手机号 | phone | phone | string | ✗ | 13800138000 |
| 部门 | department | department | string | ✗ | 技术部 |
| 职位 | position | position | string | ✗ | 软件工程师 |
| 角色 | user_role | role | enum | ✓ | candidate |
| 技能等级 | skill_level | learning_level | enum | ✗ | intermediate |
| 状态 | status | status | enum | ✓ | enabled |

#### 试卷信息表 (exam_papers.xlsx)
| 列名 | 本地字段 | 云端字段 | 数据类型 | 必填 | 示例 |
|------|---------|---------|----------|------|------|
| 试卷ID | paper_id | id | string | ✓ | PAPER_001 |
| 试卷名称 | paper_name | title | string | ✓ | JavaScript基础测试 |
| 考试类型 | exam_type | category | enum | ✓ | skill_test |
| 难度等级 | difficulty | difficulty | enum | ✓ | intermediate |
| 考试时长 | duration | duration | number | ✓ | 120 |
| 总分 | total_score | totalScore | number | ✓ | 100 |
| 及格分 | pass_score | passingScore | number | ✓ | 60 |
| 题目数量 | question_count | totalQuestions | number | ✓ | 50 |

#### 题目信息表 (questions.xlsx)
| 列名 | 本地字段 | 云端字段 | 数据类型 | 必填 | 示例 |
|------|---------|---------|----------|------|------|
| 题目ID | question_id | id | string | ✓ | Q001 |
| 试卷ID | paper_id | examId | string | ✓ | PAPER_001 |
| 题型 | question_type | type | enum | ✓ | single_choice |
| 题目内容 | content | content | text | ✓ | 以下哪个是JavaScript的数据类型？ |
| 选项A | option_a | options[0].text | string | ✗ | string |
| 选项B | option_b | options[1].text | string | ✗ | number |
| 选项C | option_c | options[2].text | string | ✗ | boolean |
| 选项D | option_d | options[3].text | string | ✗ | object |
| 正确答案 | correct_answer | correctAnswer | string | ✓ | A,B,C,D |
| 分值 | score | score | number | ✓ | 2 |
| 难度 | difficulty | difficulty | enum | ✓ | medium |
| 解析 | explanation | explanation | text | ✗ | JavaScript有多种数据类型... |

#### 考试结果表 (exam_results.xlsx)
| 列名 | 本地字段 | 云端字段 | 数据类型 | 必填 | 示例 |
|------|---------|---------|----------|------|------|
| 考生ID | candidate_id | userId | string | ✓ | USER_001 |
| 试卷ID | paper_id | examId | string | ✓ | PAPER_001 |
| 开始时间 | start_time | startTime | datetime | ✓ | 2024-01-15 09:00:00 |
| 结束时间 | end_time | endTime | datetime | ✓ | 2024-01-15 10:30:00 |
| 得分 | score | score | number | ✓ | 85 |
| 总分 | total_score | totalScore | number | ✓ | 100 |
| 是否通过 | is_passed | passed | boolean | ✓ | true |
| 用时(分钟) | duration_minutes | duration | number | ✓ | 90 |
| 答题详情 | answer_details | answers | json | ✗ | {...} |

## 权限控制映射

### 功能权限映射
| 功能模块 | 本地权限 | 云端权限 | 角色要求 |
|---------|---------|---------|----------|
| 题库管理 | question_bank_admin | exam_management | teacher, admin |
| 试卷管理 | paper_admin | exam_management | teacher, admin |
| 考生管理 | candidate_admin | user_management | examiner, teacher, admin |
| 考试监控 | exam_monitor | exam_supervision | examiner, teacher, admin |
| 成绩管理 | score_admin | result_management | teacher, admin |
| 系统配置 | system_config | system_admin | admin |

### 数据访问权限
| 数据类型 | 本地权限级别 | 云端权限级别 | 访问控制 |
|---------|-------------|-------------|----------|
| 题库数据 | 机密 | 受限 | 仅本地存储，不上传云端 |
| 用户信息 | 内部 | 一般 | 脱敏后可同步云端 |
| 考试结果 | 内部 | 一般 | 统计数据可同步云端 |
| 系统配置 | 机密 | 受限 | 仅本地存储 |

## 同步策略

### 数据流向
```
本地考试系统 → Excel导出 → 人工审核 → 云端平台导入
云端平台 → Excel导出 → 人工审核 → 本地系统导入
```

### 同步频率
- **用户数据**: 每日同步
- **考试安排**: 实时同步
- **考试结果**: 考试结束后24小时内同步
- **统计数据**: 每周同步

### 数据校验规则
1. **字段完整性**: 必填字段不能为空
2. **数据格式**: 严格按照映射表格式
3. **业务逻辑**: 考试时间、分数范围等业务规则校验
4. **重复检查**: 防止重复导入相同数据
5. **权限验证**: 确保操作人员有相应权限

## 安全考虑

### 数据脱敏
- 个人身份信息在云端存储时进行脱敏
- 敏感题库内容仅在本地存储
- 传输过程中使用加密

### 访问控制
- 本地系统独立的用户认证
- 云端平台基于角色的权限控制
- 数据导入导出需要双重授权

### 审计日志
- 记录所有数据同步操作
- 保留操作人员、时间、内容等信息
- 定期备份和归档日志数据
