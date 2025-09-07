import React, { useState, useEffect } from 'react';
import { Eye, Edit, Copy, Trash2, MoreVertical, Clock, User, Tag, BookOpen } from 'lucide-react';
import { Question, QuestionType, QuestionDifficulty, QuestionStatus } from '@/types/question';
import { questionService } from '@/services/questionService';
import QuestionSearch from './QuestionSearch';
import QuestionFilter from './QuestionFilter';
import QuestionPreview from './QuestionPreview';

/**
 * 视图模式类型
 */
type ViewMode = 'grid' | 'list';

/**
 * 排序选项接口
 */
interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
  label: string;
}

/**
 * 组件属性接口
 */
interface QuestionListProps {
  onEdit?: (question: Question) => void;
  onDelete?: (questionId: string) => void;
  onDuplicate?: (question: Question) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  selectable?: boolean;
  initialFilters?: any;
}

/**
 * 题目列表组件
 * 提供题目的展示、搜索、筛选、排序等功能
 * 支持网格和列表两种视图模式
 * 
 * @param onEdit - 编辑题目回调
 * @param onDelete - 删除题目回调
 * @param onDuplicate - 复制题目回调
 * @param onSelectionChange - 选择变化回调
 * @param selectable - 是否支持多选
 * @param initialFilters - 初始筛选条件
 */
export const QuestionList: React.FC<QuestionListProps> = ({
  onEdit,
  onDelete,
  onDuplicate,
  onSelectionChange,
  selectable = false,
  initialFilters = {}
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  
  // 筛选和排序状态
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState<SortOption>({
    field: 'createdAt',
    direction: 'desc',
    label: '创建时间（新到旧）'
  });
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0
  });

  /**
   * 组件初始化时加载题目列表
   */
  useEffect(() => {
    loadQuestions();
  }, [filters, sort, pagination.page]);

  /**
   * 选择变化时通知父组件
   */
  useEffect(() => {
    onSelectionChange?.(selectedIds);
  }, [selectedIds, onSelectionChange]);

  /**
   * 加载题目列表
   */
  const loadQuestions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        ...filters,
        sortBy: sort.field,
        sortOrder: sort.direction,
        page: pagination.page,
        pageSize: pagination.pageSize
      };
      
      const response = await questionService.getQuestions(params);
      setQuestions(response.questions);
      setPagination(prev => ({
        ...prev,
        total: response.total
      }));
    } catch (err) {
      setError('加载题目列表失败');
      console.error('加载题目失败:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理搜索结果
   * @param results - 搜索结果
   */
  const handleSearchResults = (results: any) => {
    setQuestions(results.questions);
    setPagination({
      page: results.page,
      pageSize: results.pageSize,
      total: results.total
    });
  };

  /**
   * 处理筛选条件变化
   * @param newFilters - 新的筛选条件
   */
  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  /**
   * 处理排序变化
   * @param newSort - 新的排序选项
   */
  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  /**
   * 处理视图模式变化
   * @param mode - 新的视图模式
   */
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  /**
   * 处理题目选择
   * @param questionId - 题目ID
   * @param checked - 是否选中
   */
  const handleQuestionSelect = (questionId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, questionId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== questionId));
    }
  };

  /**
   * 处理全选/取消全选
   * @param checked - 是否全选
   */
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(questions.map(q => q.id));
    } else {
      setSelectedIds([]);
    }
  };

  /**
   * 处理题目预览
   * @param question - 要预览的题目
   */
  const handlePreview = (question: Question) => {
    setPreviewQuestion(question);
  };

  /**
   * 处理题目删除
   * @param questionId - 题目ID
   */
  const handleDelete = async (questionId: string) => {
    if (!confirm('确定要删除这道题目吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      await questionService.deleteQuestion(questionId);
      await loadQuestions();
      onDelete?.(questionId);
    } catch (err) {
      console.error('删除题目失败:', err);
      alert('删除题目失败，请重试');
    }
  };

  /**
   * 处理题目复制
   * @param question - 要复制的题目
   */
  const handleDuplicate = async (question: Question) => {
    try {
      const newTitle = `${question.title} (副本)`;
      await questionService.duplicateQuestion(question.id, { title: newTitle });
      await loadQuestions();
      onDuplicate?.(question);
    } catch (err) {
      console.error('复制题目失败:', err);
      alert('复制题目失败，请重试');
    }
  };

  /**
   * 获取题目类型显示文本
   * @param type - 题目类型
   */
  const getTypeLabel = (type: QuestionType): string => {
    const labels = {
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
   * 获取难度等级显示文本和样式
   * @param difficulty - 难度等级
   */
  const getDifficultyInfo = (difficulty: QuestionDifficulty) => {
    const info = {
      easy: { label: '简单', className: 'bg-green-100 text-green-800' },
      medium: { label: '中等', className: 'bg-yellow-100 text-yellow-800' },
      hard: { label: '困难', className: 'bg-red-100 text-red-800' }
    };
    return info[difficulty] || { label: difficulty, className: 'bg-gray-100 text-gray-800' };
  };

  /**
   * 获取状态显示文本和样式
   * @param status - 题目状态
   */
  const getStatusInfo = (status: QuestionStatus) => {
    const info = {
      draft: { label: '草稿', className: 'bg-gray-100 text-gray-800' },
      published: { label: '已发布', className: 'bg-green-100 text-green-800' },
      archived: { label: '已归档', className: 'bg-orange-100 text-orange-800' }
    };
    return info[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
  };

  /**
   * 渲染题目操作菜单
   * @param question - 题目对象
   */
  const renderActionMenu = (question: Question) => {
    return (
      <div className="relative group">
        <button className="p-1 rounded hover:bg-gray-100">
          <MoreVertical className="w-4 h-4" />
        </button>
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
          <div className="py-1">
            <button
              onClick={() => handlePreview(question)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              预览
            </button>
            <button
              onClick={() => onEdit?.(question)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              编辑
            </button>
            <button
              onClick={() => handleDuplicate(question)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              复制
            </button>
            <button
              onClick={() => handleDelete(question.id)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        </div>
      </div>
    );
  };

  /**
   * 渲染网格视图
   */
  const renderGridView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
        {questions.map((question) => {
          const difficultyInfo = getDifficultyInfo(question.difficulty);
          const statusInfo = getStatusInfo(question.status);
          
          return (
            <div
              key={question.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* 题目头部 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  {selectable && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(question.id)}
                      onChange={(e) => handleQuestionSelect(question.id, e.target.checked)}
                      className="mr-2"
                    />
                  )}
                  <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">
                    {question.title}
                  </h3>
                </div>
                {renderActionMenu(question)}
              </div>

              {/* 题目内容预览 */}
              <div className="text-sm text-gray-600 line-clamp-3 mb-3">
                {question.content}
              </div>

              {/* 标签和分类 */}
              <div className="flex flex-wrap gap-1 mb-3">
                <span className={`px-2 py-1 rounded-full text-xs ${difficultyInfo.className}`}>
                  {difficultyInfo.label}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {getTypeLabel(question.type)}
                </span>
              </div>

              {/* 元信息 */}
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {question.createdBy || '未知'}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(question.createdAt).toLocaleDateString()}
                </div>
                {question.category && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {question.category}
                  </div>
                )}
                {question.tags && question.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {question.tags.slice(0, 2).join(', ')}
                    {question.tags.length > 2 && '...'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /**
   * 渲染列表视图
   */
  const renderListView = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {selectable && (
                <th className="w-12 px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === questions.length && questions.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                题目
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                难度
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                分类
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                创建者
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                创建时间
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {questions.map((question) => {
              const difficultyInfo = getDifficultyInfo(question.difficulty);
              const statusInfo = getStatusInfo(question.status);
              
              return (
                <tr key={question.id} className="hover:bg-gray-50">
                  {selectable && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(question.id)}
                        onChange={(e) => handleQuestionSelect(question.id, e.target.checked)}
                      />
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 line-clamp-1">
                        {question.title}
                      </div>
                      <div className="text-sm text-gray-500 line-clamp-2">
                        {question.content}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {getTypeLabel(question.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${difficultyInfo.className}`}>
                      {difficultyInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {question.category || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {question.createdBy || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(question.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {renderActionMenu(question)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* 搜索组件 */}
      <QuestionSearch
        onSearchResults={handleSearchResults}
        onFiltersChange={handleFiltersChange}
        initialFilters={filters}
      />

      {/* 筛选器 */}
      <QuestionFilter
        onFilterChange={handleFiltersChange}
        onSortChange={handleSortChange}
        onViewModeChange={handleViewModeChange}
        onRefresh={loadQuestions}
        currentFilters={filters}
        currentSort={sort}
        currentViewMode={viewMode}
        totalCount={pagination.total}
        isLoading={loading}
      />

      {/* 内容区域 */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-red-500">{error}</div>
          </div>
        ) : questions.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">暂无题目数据</div>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? renderGridView() : renderListView()}
          </>
        )}
      </div>

      {/* 分页 */}
      {pagination.total > pagination.pageSize && (
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              显示 {(pagination.page - 1) * pagination.pageSize + 1} 到{' '}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} 条，
              共 {pagination.total} 条
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 题目预览弹窗 */}
      {previewQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">题目预览</h2>
                <button
                  onClick={() => setPreviewQuestion(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <QuestionPreview question={previewQuestion} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionList;