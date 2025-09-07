/**
 * 题目管理主界面组件
 * 提供题目的完整管理功能，包括列表、创建、编辑、删除、搜索、筛选等
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  Copy, 
  Eye,
  BarChart3,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { 
  Question, 
  QuestionType, 
  QuestionDifficulty, 
  QuestionQueryParams,
  QuestionStats,
  CreateQuestionRequest,
  QuestionStatus
} from '@/types/question';
import { questionService } from '@/services/questionService';
import { QuestionTypeEditor } from './QuestionTypeEditor';
import { QuestionPreview } from './QuestionPreview';
import { QuestionImport } from './QuestionImport';
import QuestionList from './QuestionList';
import QuestionTagManager from './QuestionTagManager';
import QuestionStats from './QuestionStats';
import { toast } from 'sonner';

/**
 * 题目管理器组件
 */
export const QuestionManager: React.FC = () => {
  // 状态管理
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  
  // 界面状态
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'import' | 'stats' | 'settings' | 'tags'>('list');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  // 统计数据
  const [stats, setStats] = useState({
    total: 0,
    byType: {} as Record<QuestionType, number>,
    byDifficulty: {} as Record<QuestionDifficulty, number>,
    byStatus: {} as Record<QuestionStatus, number>,
    byCategory: {} as Record<string, number>
  });

  /**
   * 题目类型选项
   */
  const questionTypes: { value: QuestionType | 'all'; label: string }[] = [
    { value: 'all', label: '全部类型' },
    { value: 'single_choice', label: '单选题' },
    { value: 'multiple_choice', label: '多选题' },
    { value: 'true_false', label: '判断题' },
    { value: 'fill_blank', label: '填空题' },
    { value: 'short_answer', label: '简答题' },
    { value: 'coding', label: '编程题' }
  ];

  /**
   * 题目难度选项
   */
  const difficultyOptions: { value: QuestionDifficulty | 'all'; label: string; color?: string }[] = [
    { value: 'all', label: '全部难度' },
    { value: 'beginner', label: '初级', color: 'bg-green-100 text-green-800' },
    { value: 'intermediate', label: '中级', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'advanced', label: '高级', color: 'bg-orange-100 text-orange-800' },
    { value: 'expert', label: '专家', color: 'bg-red-100 text-red-800' }
  ];

  /**
   * 组件初始化时加载统计数据
   */
  useEffect(() => {
    loadStats();
  }, []);

  /**
   * 加载统计信息
   */
  const loadStats = useCallback(async () => {
    try {
      const statsData = await questionService.getQuestionStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  }, []);

  /**
   * 加载分类列表
   */
  const loadCategories = useCallback(async () => {
    try {
      // 从现有题目中提取分类
      const allQuestions = await questionService.getQuestions({ limit: 1000 });
      const uniqueCategories = Array.from(
        new Set(
          allQuestions.questions
            .map(q => q.category)
            .filter(Boolean)
        )
      );
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('加载分类列表失败:', error);
    }
  }, []);

  /**
   * 处理题目编辑
   * @param question - 要编辑的题目
   */
  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setActiveTab('create');
  };

  /**
   * 处理题目删除
   * @param questionId - 题目ID
   */
  const handleDeleteQuestion = async (questionId: string) => {
    await loadStats();
  };

  /**
   * 处理题目复制
   * @param question - 要复制的题目
   */
  const handleDuplicateQuestion = async (question: Question) => {
    await loadStats();
  };

  /**
   * 处理题目创建/更新成功
   */
  const handleQuestionSaved = async () => {
    setEditingQuestion(null);
    setActiveTab('list');
    await loadStats();
  };

  /**
   * 处理批量删除
   */
  const handleBatchDelete = async () => {
    if (selectedQuestions.length === 0) {
      alert('请先选择要删除的题目');
      return;
    }
    
    if (!confirm(`确定要删除选中的 ${selectedQuestions.length} 道题目吗？此操作不可撤销。`)) {
      return;
    }
    
    try {
      await questionService.batchDeleteQuestions(selectedQuestions);
      setSelectedQuestions([]);
      await loadStats();
    } catch (err) {
      console.error('批量删除失败:', err);
      alert('批量删除失败，请重试');
    }
  };

  /**
   * 获取题目类型标签颜色
   */
  const getTypeColor = (type: QuestionType) => {
    const colors = {
      single_choice: 'bg-blue-100 text-blue-800',
      multiple_choice: 'bg-purple-100 text-purple-800',
      true_false: 'bg-green-100 text-green-800',
      fill_blank: 'bg-yellow-100 text-yellow-800',
      short_answer: 'bg-orange-100 text-orange-800',
      coding: 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  /**
   * 获取难度标签颜色
   */
  const getDifficultyColor = (difficulty: QuestionDifficulty) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-orange-100 text-orange-800',
      expert: 'bg-red-100 text-red-800'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800';
  };

  /**
   * 渲染题目列表
   */
  const renderQuestionList = () => (
    <div className="space-y-4">
      {questions.map((question) => (
        <Card key={question.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold">{question.title}</h3>
                  <Badge className={getTypeColor(question.type)}>
                    {questionTypes.find(t => t.value === question.type)?.label}
                  </Badge>
                  <Badge className={getDifficultyColor(question.difficulty)}>
                    {difficultyOptions.find(d => d.value === question.difficulty)?.label}
                  </Badge>
                  {question.category && (
                    <Badge variant="outline">{question.category}</Badge>
                  )}
                </div>
                
                <p className="text-gray-600 line-clamp-2">{question.content}</p>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>创建时间: {new Date(question.createdAt).toLocaleDateString()}</span>
                  {question.tags && question.tags.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <span>标签:</span>
                      {question.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {question.tags.length > 3 && (
                        <span className="text-xs">+{question.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewQuestion(question)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingQuestion(question);
                    setIsCreateMode(false);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicateQuestion(question)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteQuestion(question.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {questions.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无题目</h3>
          <p className="text-gray-500 mb-4">开始创建您的第一个题目</p>
          <Button onClick={() => {
            setEditingQuestion({});
            setIsCreateMode(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            创建题目
          </Button>
        </div>
      )}
    </div>
  );

  /**
   * 渲染分页
   */
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          共 {totalCount} 个题目，第 {currentPage} / {totalPages} 页
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            上一页
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            下一页
          </Button>
        </div>
      </div>
    );
  };

  /**
   * 渲染统计信息
   */
  const renderStats = () => {
    if (!stats) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">总题目数</p>
                <p className="text-2xl font-bold">{stats.totalQuestions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">已发布</p>
                <p className="text-2xl font-bold">{stats.publishedQuestions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">草稿</p>
                <p className="text-2xl font-bold">{stats.draftQuestions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">分类数</p>
                <p className="text-2xl font-bold">{stats.categoriesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };



  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">题目管理</h1>
          <p className="mt-2 text-gray-600">创建、编辑和管理考试题目</p>
        </div>

        {/* 导航标签 */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              题目列表
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'create'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Plus className="w-4 h-4" />
              创建题目
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'import'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Upload className="w-4 h-4" />
              批量导入
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'stats'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              统计分析
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'tags'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              标签管理
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              设置
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'list' && (
            <QuestionList
              selectedQuestions={selectedQuestions}
              onSelectionChange={setSelectedQuestions}
              onEdit={handleEditQuestion}
              onDelete={handleDeleteQuestion}
              onDuplicate={handleDuplicateQuestion}
              onBatchDelete={handleBatchDelete}
            />
          )}
          
          {activeTab === 'create' && (
            <div className="p-6">
              <QuestionTypeEditor
                question={editingQuestion}
                onChange={setEditingQuestion}
                onSave={handleQuestionSaved}
                showValidation={true}
              />
            </div>
          )}
          
          {activeTab === 'import' && (
            <div className="p-6">
              <QuestionImport onImportComplete={() => setActiveTab('list')} />
            </div>
          )}
          
          {activeTab === 'stats' && (
             <div className="p-6">
               <QuestionStats />
             </div>
           )}
          
          {activeTab === 'tags' && (
            <div className="p-6">
              <QuestionTagManager />
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="p-6">
              <div className="text-center py-12">
                <Settings className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">系统设置</h3>
                <p className="text-gray-500">设置功能开发中...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionManager;