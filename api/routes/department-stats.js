/**
 * 部门统计和报表API路由
 * 提供部门人员统计、绩效分析、成本管理等功能
 */

const express = require('express');
const router = express.Router();

// 模拟数据库查询函数
const mockDepartmentData = {
  departments: [
    { id: '1', name: '技术部', code: 'TECH', level: 1, parent_id: null },
    { id: '2', name: '前端组', code: 'FE', level: 2, parent_id: '1' },
    { id: '3', name: '后端组', code: 'BE', level: 2, parent_id: '1' },
    { id: '4', name: '人事部', code: 'HR', level: 1, parent_id: null },
    { id: '5', name: '财务部', code: 'FIN', level: 1, parent_id: null }
  ],
  users: [
    { id: '1', name: '张三', department_id: '2', position: '前端工程师', status: 'active', role: 'developer' },
    { id: '2', name: '李四', department_id: '2', position: '高级前端工程师', status: 'active', role: 'senior_developer' },
    { id: '3', name: '王五', department_id: '3', position: '后端工程师', status: 'active', role: 'developer' },
    { id: '4', name: '赵六', department_id: '3', position: '架构师', status: 'active', role: 'architect' },
    { id: '5', name: '钱七', department_id: '4', position: 'HR专员', status: 'active', role: 'hr_specialist' },
    { id: '6', name: '孙八', department_id: '5', position: '会计', status: 'active', role: 'accountant' }
  ],
  performance: [
    { user_id: '1', department_id: '2', score: 85, month: '2024-01' },
    { user_id: '2', department_id: '2', score: 92, month: '2024-01' },
    { user_id: '3', department_id: '3', score: 88, month: '2024-01' },
    { user_id: '4', department_id: '3', score: 95, month: '2024-01' },
    { user_id: '5', department_id: '4', score: 87, month: '2024-01' },
    { user_id: '6', department_id: '5', score: 90, month: '2024-01' }
  ],
  costs: [
    { department_id: '1', month: '2024-01', salary_cost: 50000, training_cost: 5000, equipment_cost: 8000 },
    { department_id: '2', month: '2024-01', salary_cost: 25000, training_cost: 2000, equipment_cost: 3000 },
    { department_id: '3', month: '2024-01', salary_cost: 25000, training_cost: 3000, equipment_cost: 5000 },
    { department_id: '4', month: '2024-01', salary_cost: 15000, training_cost: 1000, equipment_cost: 1000 },
    { department_id: '5', month: '2024-01', salary_cost: 20000, training_cost: 500, equipment_cost: 2000 }
  ]
};

/**
 * 获取部门人员统计报表
 * @route GET /api/department-stats/personnel
 * @param {string} department_id - 部门ID（可选）
 * @param {string} start_date - 开始日期（可选）
 * @param {string} end_date - 结束日期（可选）
 * @returns {Object} 部门人员统计数据
 */
router.get('/personnel', async (req, res) => {
  try {
    const { department_id, start_date, end_date } = req.query;
    
    // 模拟数据库查询
    let departments = mockDepartmentData.departments;
    let users = mockDepartmentData.users;
    
    if (department_id) {
      departments = departments.filter(d => d.id === department_id);
      users = users.filter(u => u.department_id === department_id);
    }
    
    const stats = departments.map(dept => {
      const deptUsers = users.filter(u => u.department_id === dept.id);
      const roleDistribution = {};
      const statusDistribution = {};
      
      deptUsers.forEach(user => {
        roleDistribution[user.role] = (roleDistribution[user.role] || 0) + 1;
        statusDistribution[user.status] = (statusDistribution[user.status] || 0) + 1;
      });
      
      return {
        department_id: dept.id,
        department_name: dept.name,
        department_code: dept.code,
        total_count: deptUsers.length,
        role_distribution: roleDistribution,
        status_distribution: statusDistribution,
        positions: deptUsers.map(u => ({ name: u.name, position: u.position }))
      };
    });
    
    res.json({
      success: true,
      data: {
        summary: {
          total_departments: stats.length,
          total_personnel: users.length,
          active_personnel: users.filter(u => u.status === 'active').length
        },
        departments: stats
      }
    });
  } catch (error) {
    console.error('获取部门人员统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取部门人员统计失败',
      error: error.message
    });
  }
});

/**
 * 获取部门绩效统计报表
 * @route GET /api/department-stats/performance
 * @param {string} department_id - 部门ID（可选）
 * @param {string} month - 月份（可选，格式：YYYY-MM）
 * @returns {Object} 部门绩效统计数据
 */
router.get('/performance', async (req, res) => {
  try {
    const { department_id, month } = req.query;
    
    let performance = mockDepartmentData.performance;
    let departments = mockDepartmentData.departments;
    
    if (department_id) {
      performance = performance.filter(p => p.department_id === department_id);
      departments = departments.filter(d => d.id === department_id);
    }
    
    if (month) {
      performance = performance.filter(p => p.month === month);
    }
    
    const stats = departments.map(dept => {
      const deptPerformance = performance.filter(p => p.department_id === dept.id);
      const scores = deptPerformance.map(p => p.score);
      
      return {
        department_id: dept.id,
        department_name: dept.name,
        department_code: dept.code,
        performance_data: {
          average_score: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0,
          max_score: scores.length > 0 ? Math.max(...scores) : 0,
          min_score: scores.length > 0 ? Math.min(...scores) : 0,
          total_evaluations: scores.length,
          score_distribution: {
            excellent: scores.filter(s => s >= 90).length,
            good: scores.filter(s => s >= 80 && s < 90).length,
            average: scores.filter(s => s >= 70 && s < 80).length,
            poor: scores.filter(s => s < 70).length
          }
        }
      };
    });
    
    res.json({
      success: true,
      data: {
        summary: {
          total_departments: stats.length,
          overall_average: stats.length > 0 ? 
            (stats.reduce((sum, dept) => sum + parseFloat(dept.performance_data.average_score), 0) / stats.length).toFixed(2) : 0
        },
        departments: stats
      }
    });
  } catch (error) {
    console.error('获取部门绩效统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取部门绩效统计失败',
      error: error.message
    });
  }
});

/**
 * 获取部门成本统计报表
 * @route GET /api/department-stats/costs
 * @param {string} department_id - 部门ID（可选）
 * @param {string} month - 月份（可选，格式：YYYY-MM）
 * @returns {Object} 部门成本统计数据
 */
router.get('/costs', async (req, res) => {
  try {
    const { department_id, month } = req.query;
    
    let costs = mockDepartmentData.costs;
    let departments = mockDepartmentData.departments;
    
    if (department_id) {
      costs = costs.filter(c => c.department_id === department_id);
      departments = departments.filter(d => d.id === department_id);
    }
    
    if (month) {
      costs = costs.filter(c => c.month === month);
    }
    
    const stats = departments.map(dept => {
      const deptCosts = costs.filter(c => c.department_id === dept.id);
      const totalCosts = deptCosts.reduce((sum, cost) => ({
        salary_cost: sum.salary_cost + cost.salary_cost,
        training_cost: sum.training_cost + cost.training_cost,
        equipment_cost: sum.equipment_cost + cost.equipment_cost
      }), { salary_cost: 0, training_cost: 0, equipment_cost: 0 });
      
      const total = totalCosts.salary_cost + totalCosts.training_cost + totalCosts.equipment_cost;
      
      return {
        department_id: dept.id,
        department_name: dept.name,
        department_code: dept.code,
        cost_data: {
          total_cost: total,
          salary_cost: totalCosts.salary_cost,
          training_cost: totalCosts.training_cost,
          equipment_cost: totalCosts.equipment_cost,
          cost_breakdown: {
            salary_percentage: total > 0 ? ((totalCosts.salary_cost / total) * 100).toFixed(2) : 0,
            training_percentage: total > 0 ? ((totalCosts.training_cost / total) * 100).toFixed(2) : 0,
            equipment_percentage: total > 0 ? ((totalCosts.equipment_cost / total) * 100).toFixed(2) : 0
          }
        }
      };
    });
    
    res.json({
      success: true,
      data: {
        summary: {
          total_departments: stats.length,
          total_cost: stats.reduce((sum, dept) => sum + dept.cost_data.total_cost, 0),
          average_cost_per_department: stats.length > 0 ? 
            (stats.reduce((sum, dept) => sum + dept.cost_data.total_cost, 0) / stats.length).toFixed(2) : 0
        },
        departments: stats
      }
    });
  } catch (error) {
    console.error('获取部门成本统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取部门成本统计失败',
      error: error.message
    });
  }
});

/**
 * 获取跨部门对比分析
 * @route GET /api/department-stats/comparison
 * @param {string} metric - 对比指标（personnel|performance|costs）
 * @param {string} month - 月份（可选，格式：YYYY-MM）
 * @returns {Object} 跨部门对比数据
 */
router.get('/comparison', async (req, res) => {
  try {
    const { metric = 'personnel', month } = req.query;
    
    const departments = mockDepartmentData.departments;
    const users = mockDepartmentData.users;
    const performance = mockDepartmentData.performance;
    const costs = mockDepartmentData.costs;
    
    let comparisonData = [];
    
    switch (metric) {
      case 'personnel':
        comparisonData = departments.map(dept => {
          const deptUsers = users.filter(u => u.department_id === dept.id);
          return {
            department_name: dept.name,
            value: deptUsers.length,
            label: '人员数量'
          };
        });
        break;
        
      case 'performance':
        comparisonData = departments.map(dept => {
          const deptPerformance = performance.filter(p => p.department_id === dept.id);
          const scores = deptPerformance.map(p => p.score);
          const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
          return {
            department_name: dept.name,
            value: parseFloat(avgScore.toFixed(2)),
            label: '平均绩效分数'
          };
        });
        break;
        
      case 'costs':
        comparisonData = departments.map(dept => {
          const deptCosts = costs.filter(c => c.department_id === dept.id);
          const totalCost = deptCosts.reduce((sum, cost) => 
            sum + cost.salary_cost + cost.training_cost + cost.equipment_cost, 0);
          return {
            department_name: dept.name,
            value: totalCost,
            label: '总成本'
          };
        });
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: '不支持的对比指标'
        });
    }
    
    // 排序
    comparisonData.sort((a, b) => b.value - a.value);
    
    res.json({
      success: true,
      data: {
        metric,
        comparison_data: comparisonData,
        summary: {
          highest: comparisonData[0],
          lowest: comparisonData[comparisonData.length - 1],
          average: comparisonData.length > 0 ? 
            (comparisonData.reduce((sum, item) => sum + item.value, 0) / comparisonData.length).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    console.error('获取跨部门对比分析失败:', error);
    res.status(500).json({
      success: false,
      message: '获取跨部门对比分析失败',
      error: error.message
    });
  }
});

/**
 * 获取时间维度趋势分析
 * @route GET /api/department-stats/trends
 * @param {string} department_id - 部门ID（可选）
 * @param {string} metric - 趋势指标（performance|costs|personnel）
 * @param {string} period - 时间周期（month|quarter|year）
 * @returns {Object} 趋势分析数据
 */
router.get('/trends', async (req, res) => {
  try {
    const { department_id, metric = 'performance', period = 'month' } = req.query;
    
    // 模拟历史数据
    const mockTrendData = {
      performance: [
        { period: '2023-10', value: 82 },
        { period: '2023-11', value: 85 },
        { period: '2023-12', value: 87 },
        { period: '2024-01', value: 89 }
      ],
      costs: [
        { period: '2023-10', value: 45000 },
        { period: '2023-11', value: 47000 },
        { period: '2023-12', value: 48000 },
        { period: '2024-01', value: 50000 }
      ],
      personnel: [
        { period: '2023-10', value: 5 },
        { period: '2023-11', value: 5 },
        { period: '2023-12', value: 6 },
        { period: '2024-01', value: 6 }
      ]
    };
    
    const trendData = mockTrendData[metric] || [];
    
    // 计算趋势
    const calculateTrend = (data) => {
      if (data.length < 2) return 0;
      const latest = data[data.length - 1].value;
      const previous = data[data.length - 2].value;
      return ((latest - previous) / previous * 100).toFixed(2);
    };
    
    res.json({
      success: true,
      data: {
        metric,
        period,
        department_id,
        trend_data: trendData,
        analysis: {
          trend_percentage: calculateTrend(trendData),
          trend_direction: calculateTrend(trendData) > 0 ? 'up' : calculateTrend(trendData) < 0 ? 'down' : 'stable',
          latest_value: trendData.length > 0 ? trendData[trendData.length - 1].value : 0,
          period_count: trendData.length
        }
      }
    });
  } catch (error) {
    console.error('获取趋势分析失败:', error);
    res.status(500).json({
      success: false,
      message: '获取趋势分析失败',
      error: error.message
    });
  }
});

/**
 * 导出部门报表
 * @route POST /api/department-stats/export
 * @param {string} report_type - 报表类型（personnel|performance|costs|comparison|trends）
 * @param {Object} filters - 筛选条件
 * @param {string} format - 导出格式（excel|pdf|csv）
 * @returns {Object} 导出结果
 */
router.post('/export', async (req, res) => {
  try {
    const { report_type, filters = {}, format = 'excel' } = req.body;
    
    // 模拟导出功能
    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileName = `department_${report_type}_report_${new Date().toISOString().split('T')[0]}.${format}`;
    
    // 这里应该实现真实的导出逻辑
    // 例如生成Excel、PDF或CSV文件
    
    res.json({
      success: true,
      data: {
        export_id: exportId,
        file_name: fileName,
        download_url: `/api/department-stats/download/${exportId}`,
        status: 'completed',
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('导出报表失败:', error);
    res.status(500).json({
      success: false,
      message: '导出报表失败',
      error: error.message
    });
  }
});

/**
 * 获取管理驾驶舱数据
 * @route GET /api/department-stats/dashboard
 * @returns {Object} 驾驶舱数据
 */
router.get('/dashboard', async (req, res) => {
  try {
    const departments = mockDepartmentData.departments;
    const users = mockDepartmentData.users;
    const performance = mockDepartmentData.performance;
    const costs = mockDepartmentData.costs;
    
    // 计算关键指标
    const totalPersonnel = users.length;
    const activePersonnel = users.filter(u => u.status === 'active').length;
    const avgPerformance = performance.reduce((sum, p) => sum + p.score, 0) / performance.length;
    const totalCosts = costs.reduce((sum, c) => sum + c.salary_cost + c.training_cost + c.equipment_cost, 0);
    
    // 部门排名
    const departmentRanking = departments.map(dept => {
      const deptUsers = users.filter(u => u.department_id === dept.id);
      const deptPerformance = performance.filter(p => p.department_id === dept.id);
      const deptCosts = costs.filter(c => c.department_id === dept.id);
      
      const avgScore = deptPerformance.length > 0 ? 
        deptPerformance.reduce((sum, p) => sum + p.score, 0) / deptPerformance.length : 0;
      const totalCost = deptCosts.reduce((sum, c) => sum + c.salary_cost + c.training_cost + c.equipment_cost, 0);
      
      return {
        department_name: dept.name,
        personnel_count: deptUsers.length,
        avg_performance: parseFloat(avgScore.toFixed(2)),
        total_cost: totalCost,
        efficiency_score: totalCost > 0 ? parseFloat((avgScore / (totalCost / 10000)).toFixed(2)) : 0
      };
    }).sort((a, b) => b.efficiency_score - a.efficiency_score);
    
    res.json({
      success: true,
      data: {
        overview: {
          total_departments: departments.length,
          total_personnel: totalPersonnel,
          active_personnel: activePersonnel,
          avg_performance: parseFloat(avgPerformance.toFixed(2)),
          total_costs: totalCosts,
          personnel_utilization: parseFloat((activePersonnel / totalPersonnel * 100).toFixed(2))
        },
        department_ranking: departmentRanking,
        alerts: [
          {
            type: 'warning',
            message: '技术部本月培训成本超出预算15%',
            department: '技术部',
            severity: 'medium'
          },
          {
            type: 'info',
            message: '人事部绩效评分连续3个月上升',
            department: '人事部',
            severity: 'low'
          }
        ],
        quick_stats: {
          highest_performance_dept: departmentRanking.reduce((max, dept) => 
            dept.avg_performance > max.avg_performance ? dept : max, departmentRanking[0]),
          lowest_cost_dept: departmentRanking.reduce((min, dept) => 
            dept.total_cost < min.total_cost ? dept : min, departmentRanking[0]),
          most_efficient_dept: departmentRanking[0]
        }
      }
    });
  } catch (error) {
    console.error('获取管理驾驶舱数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取管理驾驶舱数据失败',
      error: error.message
    });
  }
});

module.exports = router;