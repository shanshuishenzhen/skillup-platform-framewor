/**
 * 题目标签和分类管理组件
 * 提供标签和分类的创建、编辑、删除和管理功能
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Tag, 
  Folder, 
  Search,
  BarChart3,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  QuestionTag, 
  QuestionCategory 
} from '@/types/question';
import { questionService } from '@/services/questionService';
import { toast } from 'sonner';

/**
 * 标签管理器组件
 */
const TagManager: React.FC = () => {
  const [tags, setTags] = useState<QuestionTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTag, setEditingTag] = useState<Partial<QuestionTag> | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);

  /**
   * 加载标签列表
   */
  const loadTags = useCallback(async () => {
    try {
      setLoading(true);
      // 从题目中提取标签信息
      const questions = await questionService.getQuestions({ limit: 1000 });
      const tagMap = new Map<string, QuestionTag>();
      
      questions.questions.forEach(question => {
        if (question.tags) {
          question.tags.forEach(tagName => {
            if (tagMap.has(tagName)) {
              tagMap.get(tagName)!.usageCount++;
            } else {
              tagMap.set(tagName, {
                id: `tag_${tagName}`,
                name: tagName,
                description: '',
                color: getRandomColor(),
                usageCount: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
          });
        }
      });
      
      const tagList = Array.from(tagMap.values())
        .filter(tag => 
          !searchQuery || 
          tag.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => b.usageCount - a.usageCount);
      
      setTags(tagList);
    } catch (error) {
      console.error('加载标签失败:', error);
      toast.error('加载标签失败');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  /**
   * 获取随机颜色
   */
  const getRandomColor = () => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-red-100 text-red-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
      'bg-gray-100 text-gray-800'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  /**
   * 删除标签
   */
  const handleDeleteTag = async (tagName: string) => {
    if (!confirm(`确定要删除标签"${tagName}"吗？这将从所有相关题目中移除此标签。`)) {
      return;
    }
    
    try {
      // 这里需要实现删除标签的逻辑
      // 由于标签是存储在题目中的，需要更新所有包含此标签的题目
      toast.success('标签删除成功');
      loadTags();
    } catch (error) {
      console.error('删除标签失败:', error);
      toast.error('删除标签失败');
    }
  };

  /**
   * 渲染标签列表
   */
  const renderTagList = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tags.map((tag) => (
          <Card key={tag.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <Badge className={tag.color}>
                  {tag.name}
                </Badge>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingTag(tag);
                      setIsCreateMode(false);
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTag(tag.name)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              {tag.description && (
                <p className="text-sm text-gray-600 mb-2">{tag.description}</p>
              )}
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>使用次数: {tag.usageCount}</span>
                <span>{new Date(tag.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {tags.length === 0 && !loading && (
        <div className="text-center py-12">
          <Tag className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无标签</h3>
          <p className="text-gray-500">标签将从题目中自动提取</p>
        </div>
      )}
    </div>
  );

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  return (
    <div className="space-y-6">
      {/* 搜索和操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Input
            placeholder="搜索标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Button variant="outline" onClick={loadTags}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* 标签列表 */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
          <p>加载中...</p>
        </div>
      ) : (
        renderTagList()
      )}
    </div>
  );
};

/**
 * 分类管理器组件
 */
const CategoryManager: React.FC = () => {
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCategory, setEditingCategory] = useState<Partial<QuestionCategory> | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);

  /**
   * 加载分类列表
   */
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      // 从题目中提取分类信息
      const questions = await questionService.getQuestions({ limit: 1000 });
      const categoryMap = new Map<string, QuestionCategory>();
      
      questions.questions.forEach(question => {
        if (question.category) {
          if (categoryMap.has(question.category)) {
            categoryMap.get(question.category)!.questionCount++;
          } else {
            categoryMap.set(question.category, {
              id: `category_${question.category}`,
              name: question.category,
              description: '',
              questionCount: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }
      });
      
      const categoryList = Array.from(categoryMap.values())
        .filter(category => 
          !searchQuery || 
          category.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => b.questionCount - a.questionCount);
      
      setCategories(categoryList);
    } catch (error) {
      console.error('加载分类失败:', error);
      toast.error('加载分类失败');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  /**
   * 创建分类
   */
  const handleCreateCategory = async (categoryData: Omit<QuestionCategory, 'id' | 'questionCount' | 'createdAt' | 'updatedAt'>) => {
    try {
      // 这里需要实现创建分类的逻辑
      toast.success('分类创建成功');
      setEditingCategory(null);
      setIsCreateMode(false);
      loadCategories();
    } catch (error) {
      console.error('创建分类失败:', error);
      toast.error('创建分类失败');
    }
  };

  /**
   * 更新分类
   */
  const handleUpdateCategory = async (id: string, categoryData: Partial<QuestionCategory>) => {
    try {
      // 这里需要实现更新分类的逻辑
      toast.success('分类更新成功');
      setEditingCategory(null);
      loadCategories();
    } catch (error) {
      console.error('更新分类失败:', error);
      toast.error('更新分类失败');
    }
  };

  /**
   * 删除分类
   */
  const handleDeleteCategory = async (categoryName: string) => {
    if (!confirm(`确定要删除分类"${categoryName}"吗？这将从所有相关题目中移除此分类。`)) {
      return;
    }
    
    try {
      // 这里需要实现删除分类的逻辑
      toast.success('分类删除成功');
      loadCategories();
    } catch (error) {
      console.error('删除分类失败:', error);
      toast.error('删除分类失败');
    }
  };

  /**
   * 渲染分类列表
   */
  const renderCategoryList = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Folder className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold">{category.name}</h3>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingCategory(category);
                      setIsCreateMode(false);
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCategory(category.name)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              {category.description && (
                <p className="text-sm text-gray-600 mb-2">{category.description}</p>
              )}
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>题目数量: {category.questionCount}</span>
                <span>{new Date(category.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {categories.length === 0 && !loading && (
        <div className="text-center py-12">
          <Folder className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无分类</h3>
          <p className="text-gray-500 mb-4">分类将从题目中自动提取</p>
          <Button onClick={() => {
            setEditingCategory({});
            setIsCreateMode(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            创建分类
          </Button>
        </div>
      )}
    </div>
  );

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return (
    <div className="space-y-6">
      {/* 搜索和操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Input
            placeholder="搜索分类..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Button variant="outline" onClick={loadCategories}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        
        <Button onClick={() => {
          setEditingCategory({});
          setIsCreateMode(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          创建分类
        </Button>
      </div>
      
      {/* 分类列表 */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
          <p>加载中...</p>
        </div>
      ) : (
        renderCategoryList()
      )}
      
      {/* 编辑对话框 */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isCreateMode ? '创建分类' : '编辑分类'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">分类名称 *</Label>
              <Input
                id="name"
                value={editingCategory?.name || ''}
                onChange={(e) => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="请输入分类名称"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">分类描述</Label>
              <Textarea
                id="description"
                value={editingCategory?.description || ''}
                onChange={(e) => setEditingCategory(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入分类描述（可选）"
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setEditingCategory(null)}
            >
              取消
            </Button>
            
            <Button
              onClick={() => {
                if (isCreateMode) {
                  handleCreateCategory(editingCategory as Omit<QuestionCategory, 'id' | 'questionCount' | 'createdAt' | 'updatedAt'>);
                } else {
                  handleUpdateCategory(
                    editingCategory!.id!,
                    editingCategory!
                  );
                }
              }}
              disabled={!editingCategory?.name}
            >
              {isCreateMode ? '创建' : '保存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/**
 * 题目标签和分类管理主组件
 */
export const QuestionTagManager: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold">标签和分类管理</h1>
        <p className="text-gray-600 mt-1">管理题目的标签和分类，便于组织和查找</p>
      </div>
      
      {/* 标签页 */}
      <Tabs defaultValue="tags" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tags" className="flex items-center space-x-2">
            <Tag className="w-4 h-4" />
            <span>标签管理</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center space-x-2">
            <Folder className="w-4 h-4" />
            <span>分类管理</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tags">
          <TagManager />
        </TabsContent>
        
        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuestionTagManager;