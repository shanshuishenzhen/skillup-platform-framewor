import React, { useState, useEffect } from 'react';
import { Search, Filter, X, ChevronDown, Calendar, User } from 'lucide-react';
import { QuestionType, QuestionDifficulty, QuestionStatus } from '@/types/question';
import { questionService } from '@/services/questionService';

/**
 * 搜索条件接口
 * 定义题目搜索的所有可用筛选条件
 */
interface SearchFilters {
  query?: string;           // 搜索关键词
  type?: QuestionType;      // 题目类型
  difficulty?: QuestionDifficulty; // 难度等级
  status?: QuestionStatus;  // 题目状态
  category?: string;        // 分类
  tags?: string[];          // 标签列表
  createdBy?: string;       // 创建者
  dateRange?: {             // 创建时间范围
    start: string;
    end: string;
  };
  examId?: string;          // 所属考试ID
}

/**
 * 搜索结果接口
 */
interface SearchResult {
  questions: any[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 组件属性接口
 */
interface QuestionSearchProps {
  onSearchResults: (results: SearchResult) => void;
  onFiltersChange?: (filters: SearchFilters) => void;
  initialFilters?: SearchFilters;
  showAdvanced?: boolean;
}

/**
 * 题目搜索组件
 * 提供基础搜索和高级筛选功能，支持多种搜索条件组合
 * 
 * @param onSearchResults - 搜索结果回调函数
 * @param onFiltersChange - 筛选条件变化回调
 * @param initialFilters - 初始筛选条件
 * @param showAdvanced - 是否显示高级搜索选项
 */
export const QuestionSearch: React.FC<QuestionSearchProps> = ({
  onSearchResults,
  onFiltersChange,
  initialFilters = {},
  showAdvanced = true
}) => {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableCreators, setAvailableCreators] = useState<string[]>([]);

  /**
   * 组件初始化时加载可用的筛选选项
   */
  useEffect(() => {
    loadFilterOptions();
  }, []);

  /**
   * 加载筛选选项数据
   * 获取所有可用的分类、标签和创建者列表
   */
  const loadFilterOptions = async () => {
    try {
      // 这里应该调用API获取实际数据，暂时使用模拟数据
      setAvailableCategories(['数学', '编程', '逻辑', '语言', '科学']);
      setAvailableTags(['基础', '进阶', '算法', '数据结构', '面试']);
      setAvailableCreators(['管理员', '教师A', '教师B']);
    } catch (error) {
      console.error('加载筛选选项失败:', error);
    }
  };

  /**
   * 更新筛选条件
   * @param key - 筛选条件键名
   * @param value - 筛选条件值
   */
  const updateFilter = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  /**
   * 清除单个筛选条件
   * @param key - 要清除的筛选条件键名
   */
  const clearFilter = (key: keyof SearchFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  /**
   * 清除所有筛选条件
   */
  const clearAllFilters = () => {
    setFilters({});
    onFiltersChange?.({});
  };

  /**
   * 执行搜索
   * 根据当前筛选条件调用搜索API
   */
  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const searchParams = {
        ...filters,
        page: 1,
        pageSize: 20
      };
      
      const results = await questionService.searchQuestions(searchParams);
      onSearchResults(results);
    } catch (error) {
      console.error('搜索失败:', error);
      onSearchResults({ questions: [], total: 0, page: 1, pageSize: 20 });
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * 处理标签选择
   * @param tag - 选中或取消的标签
   */
  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    updateFilter('tags', newTags.length > 0 ? newTags : undefined);
  };

  /**
   * 获取活跃筛选条件数量
   */
  const getActiveFiltersCount = () => {
    return Object.keys(filters).filter(key => {
      const value = filters[key as keyof SearchFilters];
      return value !== undefined && value !== '' && 
             (Array.isArray(value) ? value.length > 0 : true);
    }).length;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* 基础搜索 */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="搜索题目标题、内容或标签..."
            value={filters.query || ''}
            onChange={(e) => updateFilter('query', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          {isSearching ? '搜索中...' : '搜索'}
        </button>
        
        {showAdvanced && (
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            高级筛选
            {getActiveFiltersCount() > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1">
                {getActiveFiltersCount()}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* 活跃筛选条件显示 */}
      {getActiveFiltersCount() > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(filters).map(([key, value]) => {
            if (!value || (Array.isArray(value) && value.length === 0)) return null;
            
            const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
            const label = {
              query: '关键词',
              type: '类型',
              difficulty: '难度',
              status: '状态',
              category: '分类',
              tags: '标签',
              createdBy: '创建者',
              examId: '考试'
            }[key] || key;

            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {label}: {displayValue}
                <button
                  onClick={() => clearFilter(key as keyof SearchFilters)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            清除所有
          </button>
        </div>
      )}

      {/* 高级筛选面板 */}
      {isAdvancedOpen && (
        <div className="border-t pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 题目类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                题目类型
              </label>
              <select
                value={filters.type || ''}
                onChange={(e) => updateFilter('type', e.target.value || undefined)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部类型</option>
                <option value="single_choice">单选题</option>
                <option value="multiple_choice">多选题</option>
                <option value="true_false">判断题</option>
                <option value="fill_blank">填空题</option>
                <option value="short_answer">简答题</option>
                <option value="coding">编程题</option>
              </select>
            </div>

            {/* 难度等级 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                难度等级
              </label>
              <select
                value={filters.difficulty || ''}
                onChange={(e) => updateFilter('difficulty', e.target.value || undefined)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部难度</option>
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
            </div>

            {/* 题目状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                题目状态
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => updateFilter('status', e.target.value || undefined)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部状态</option>
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
                <option value="archived">已归档</option>
              </select>
            </div>

            {/* 分类 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                题目分类
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => updateFilter('category', e.target.value || undefined)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部分类</option>
                {availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* 创建者 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                创建者
              </label>
              <select
                value={filters.createdBy || ''}
                onChange={(e) => updateFilter('createdBy', e.target.value || undefined)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部创建者</option>
                {availableCreators.map(creator => (
                  <option key={creator} value={creator}>{creator}</option>
                ))}
              </select>
            </div>

            {/* 考试ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                所属考试
              </label>
              <input
                type="text"
                placeholder="输入考试ID"
                value={filters.examId || ''}
                onChange={(e) => updateFilter('examId', e.target.value || undefined)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 标签选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标签
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => {
                const isSelected = filters.tags?.includes(tag) || false;
                return (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 创建时间范围 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              创建时间
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => updateFilter('dateRange', {
                    ...filters.dateRange,
                    start: e.target.value
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => updateFilter('dateRange', {
                    ...filters.dateRange,
                    end: e.target.value
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionSearch;