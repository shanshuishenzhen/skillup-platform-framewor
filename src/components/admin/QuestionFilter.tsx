import React, { useState } from 'react';
import { Filter, SortAsc, SortDesc, Grid, List, RefreshCw } from 'lucide-react';
import { QuestionType, QuestionDifficulty, QuestionStatus } from '@/types/question';

/**
 * 排序选项接口
 */
interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
  label: string;
}

/**
 * 视图模式类型
 */
type ViewMode = 'grid' | 'list';

/**
 * 筛选器属性接口
 */
interface QuestionFilterProps {
  onFilterChange: (filters: any) => void;
  onSortChange: (sort: SortOption) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onRefresh: () => void;
  currentFilters: any;
  currentSort: SortOption;
  currentViewMode: ViewMode;
  totalCount: number;
  isLoading?: boolean;
}

/**
 * 题目筛选器组件
 * 提供快速筛选、排序、视图切换等功能
 * 
 * @param onFilterChange - 筛选条件变化回调
 * @param onSortChange - 排序变化回调
 * @param onViewModeChange - 视图模式变化回调
 * @param onRefresh - 刷新回调
 * @param currentFilters - 当前筛选条件
 * @param currentSort - 当前排序
 * @param currentViewMode - 当前视图模式
 * @param totalCount - 题目总数
 * @param isLoading - 是否正在加载
 */
export const QuestionFilter: React.FC<QuestionFilterProps> = ({
  onFilterChange,
  onSortChange,
  onViewModeChange,
  onRefresh,
  currentFilters,
  currentSort,
  currentViewMode,
  totalCount,
  isLoading = false
}) => {
  const [showQuickFilters, setShowQuickFilters] = useState(true);

  /**
   * 排序选项配置
   */
  const sortOptions: SortOption[] = [
    { field: 'createdAt', direction: 'desc', label: '创建时间（新到旧）' },
    { field: 'createdAt', direction: 'asc', label: '创建时间（旧到新）' },
    { field: 'updatedAt', direction: 'desc', label: '更新时间（新到旧）' },
    { field: 'updatedAt', direction: 'asc', label: '更新时间（旧到新）' },
    { field: 'title', direction: 'asc', label: '标题（A-Z）' },
    { field: 'title', direction: 'desc', label: '标题（Z-A）' },
    { field: 'difficulty', direction: 'asc', label: '难度（低到高）' },
    { field: 'difficulty', direction: 'desc', label: '难度（高到低）' },
    { field: 'type', direction: 'asc', label: '类型（A-Z）' },
    { field: 'usageCount', direction: 'desc', label: '使用次数（高到低）' }
  ];

  /**
   * 快速筛选选项
   */
  const quickFilters = [
    {
      key: 'type',
      label: '类型',
      options: [
        { value: '', label: '全部' },
        { value: 'single_choice', label: '单选题' },
        { value: 'multiple_choice', label: '多选题' },
        { value: 'true_false', label: '判断题' },
        { value: 'fill_blank', label: '填空题' },
        { value: 'short_answer', label: '简答题' },
        { value: 'coding', label: '编程题' }
      ]
    },
    {
      key: 'difficulty',
      label: '难度',
      options: [
        { value: '', label: '全部' },
        { value: 'easy', label: '简单' },
        { value: 'medium', label: '中等' },
        { value: 'hard', label: '困难' }
      ]
    },
    {
      key: 'status',
      label: '状态',
      options: [
        { value: '', label: '全部' },
        { value: 'draft', label: '草稿' },
        { value: 'published', label: '已发布' },
        { value: 'archived', label: '已归档' }
      ]
    }
  ];

  /**
   * 处理快速筛选变化
   * @param key - 筛选字段
   * @param value - 筛选值
   */
  const handleQuickFilterChange = (key: string, value: string) => {
    const newFilters = {
      ...currentFilters,
      [key]: value || undefined
    };
    
    // 清除空值
    Object.keys(newFilters).forEach(k => {
      if (!newFilters[k]) {
        delete newFilters[k];
      }
    });
    
    onFilterChange(newFilters);
  };

  /**
   * 处理排序变化
   * @param option - 排序选项
   */
  const handleSortChange = (option: SortOption) => {
    onSortChange(option);
  };

  /**
   * 获取当前排序的显示文本
   */
  const getCurrentSortLabel = () => {
    const option = sortOptions.find(
      opt => opt.field === currentSort.field && opt.direction === currentSort.direction
    );
    return option?.label || '自定义排序';
  };

  /**
   * 获取筛选器状态统计
   */
  const getFilterStats = () => {
    const activeFilters = Object.keys(currentFilters).filter(key => {
      const value = currentFilters[key];
      return value !== undefined && value !== '' && 
             (Array.isArray(value) ? value.length > 0 : true);
    }).length;
    
    return {
      activeFilters,
      totalCount
    };
  };

  const { activeFilters } = getFilterStats();

  return (
    <div className="bg-white border-b border-gray-200">
      {/* 主工具栏 */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* 左侧：统计信息和筛选按钮 */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              共 <span className="font-medium text-gray-900">{totalCount}</span> 道题目
              {activeFilters > 0 && (
                <span className="ml-2 text-blue-600">
                  （已应用 {activeFilters} 个筛选条件）
                </span>
              )}
            </div>
            
            <button
              onClick={() => setShowQuickFilters(!showQuickFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showQuickFilters
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              快速筛选
              {activeFilters > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">
                  {activeFilters}
                </span>
              )}
            </button>
          </div>

          {/* 右侧：排序、视图模式、刷新 */}
          <div className="flex items-center gap-3">
            {/* 排序选择 */}
            <div className="relative">
              <select
                value={`${currentSort.field}-${currentSort.direction}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-');
                  const option = sortOptions.find(
                    opt => opt.field === field && opt.direction === direction
                  );
                  if (option) {
                    handleSortChange(option);
                  }
                }}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sortOptions.map((option, index) => (
                  <option
                    key={index}
                    value={`${option.field}-${option.direction}`}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
              {currentSort.direction === 'asc' ? (
                <SortAsc className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              ) : (
                <SortDesc className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              )}
            </div>

            {/* 视图模式切换 */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`p-2 transition-colors ${
                  currentViewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="网格视图"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`p-2 transition-colors ${
                  currentViewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="列表视图"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* 刷新按钮 */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="刷新"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 快速筛选面板 */}
      {showQuickFilters && (
        <div className="px-6 pb-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-4 pt-4">
            {quickFilters.map((filter) => (
              <div key={filter.key} className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  {filter.label}:
                </label>
                <select
                  value={currentFilters[filter.key] || ''}
                  onChange={(e) => handleQuickFilterChange(filter.key, e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[120px]"
                >
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            
            {/* 清除筛选按钮 */}
            {activeFilters > 0 && (
              <button
                onClick={() => onFilterChange({})}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                清除所有筛选
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};