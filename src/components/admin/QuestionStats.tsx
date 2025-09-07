import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Target,
  Award
} from 'lucide-react';
import { questionService } from '@/services/questionService';
import { QuestionType, QuestionDifficulty, QuestionStatus } from '@/types/question';

/**
 * 统计卡片数据接口
 */
interface StatCard {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

/**
 * 题目统计数据接口
 */
interface QuestionStatsData {
  total: number;
  byType: Record<QuestionType, number>;
  byDifficulty: Record<QuestionDifficulty, number>;
  byStatus: Record<QuestionStatus, number>;
  byCategory: Record<string, number>;
  byCreator: Record<string, number>;
  recentActivity: Array<{
    date: string;
    created: number;
    updated: number;
    used: number;
  }>;
  usage: Array<{
    questionId: string;
    title: string;
    usageCount: number;
    lastUsed: string;
  }>;
}

/**
 * 题目统计和分析组件
 * 提供题目使用情况的可视化分析
 */
export const QuestionStats: React.FC = () => {
  const [stats, setStats] = useState<QuestionStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  /**
   * 加载统计数据
   */
  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 获取基础统计数据
      const response = await questionService.getQuestionStats({
        timeRange,
        includeUsage: true
      });
      
      setStats(response);
    } catch (err) {
      console.error('加载统计数据失败:', err);
      setError('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  /**
   * 渲染统计卡片
   */
  const renderStatCards = () => {
    if (!stats) return null;

    const cards: StatCard[] = [
      {
        title: '题目总数',
        value: stats.total,
        icon: <FileText className="w-6 h-6" />,
        color: 'bg-blue-500'
      },
      {
        title: '已发布',
        value: stats.byStatus.published || 0,
        icon: <CheckCircle className="w-6 h-6" />,
        color: 'bg-green-500'
      },
      {
        title: '草稿',
        value: stats.byStatus.draft || 0,
        icon: <Clock className="w-6 h-6" />,
        color: 'bg-yellow-500'
      },
      {
        title: '已归档',
        value: stats.byStatus.archived || 0,
        icon: <XCircle className="w-6 h-6" />,
        color: 'bg-gray-500'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                {card.change && (
                  <div className="flex items-center mt-2">
                    {card.change > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm ${
                      card.change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {Math.abs(card.change)}%
                    </span>
                  </div>
                )}
              </div>
              <div className={`${card.color} p-3 rounded-lg text-white`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  /**
   * 渲染题目类型分布图
   */
  const renderTypeDistribution = () => {
    if (!stats) return null;

    const typeData = Object.entries(stats.byType).map(([type, count]) => ({
      name: getTypeLabel(type as QuestionType),
      value: count,
      type
    }));

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">题目类型分布</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={typeData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {typeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  /**
   * 渲染难度分布图
   */
  const renderDifficultyDistribution = () => {
    if (!stats) return null;

    const difficultyData = Object.entries(stats.byDifficulty).map(([difficulty, count]) => ({
      name: getDifficultyLabel(difficulty as QuestionDifficulty),
      value: count,
      difficulty
    }));

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">难度分布</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={difficultyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  /**
   * 渲染活动趋势图
   */
  const renderActivityTrend = () => {
    if (!stats || !stats.recentActivity) return null;

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">活动趋势</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.recentActivity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="created" stroke="#8884d8" name="创建" />
            <Line type="monotone" dataKey="updated" stroke="#82ca9d" name="更新" />
            <Line type="monotone" dataKey="used" stroke="#ffc658" name="使用" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  /**
   * 渲染热门题目列表
   */
  const renderPopularQuestions = () => {
    if (!stats || !stats.usage) return null;

    const topQuestions = stats.usage
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">热门题目</h3>
        <div className="space-y-3">
          {topQuestions.map((question, index) => (
            <div key={question.questionId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index < 3 ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-700'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900 truncate max-w-xs">
                    {question.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    最后使用: {new Date(question.lastUsed).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-yellow-500" />
                <span className="font-semibold text-gray-900">
                  {question.usageCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * 获取题目类型标签
   */
  const getTypeLabel = (type: QuestionType): string => {
    const labels: Record<QuestionType, string> = {
      single_choice: '单选题',
      multiple_choice: '多选题',
      true_false: '判断题',
      fill_blank: '填空题',
      short_answer: '简答题',
      coding: '编程题'
    };
    return labels[type] || type;
  };

  /**
   * 获取难度标签
   */
  const getDifficultyLabel = (difficulty: QuestionDifficulty): string => {
    const labels: Record<QuestionDifficulty, string> = {
      easy: '简单',
      medium: '中等',
      hard: '困难'
    };
    return labels[difficulty] || difficulty;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载统计数据中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 时间范围选择器 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">题目统计分析</h2>
        <div className="flex space-x-2">
          {[
            { value: '7d', label: '7天' },
            { value: '30d', label: '30天' },
            { value: '90d', label: '90天' },
            { value: '1y', label: '1年' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value as any)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                timeRange === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 统计卡片 */}
      {renderStatCards()}

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderTypeDistribution()}
        {renderDifficultyDistribution()}
      </div>

      {/* 活动趋势 */}
      {renderActivityTrend()}

      {/* 热门题目 */}
      {renderPopularQuestions()}
    </div>
  );
};

export default QuestionStats;