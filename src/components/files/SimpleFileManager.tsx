/**
 * 简化的文件管理组件 - 演示版本
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  Search, 
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  MoreVertical,
  Grid,
  List,
  Calendar,
  User,
  FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';

// 类型定义
interface FileItem {
  id: string;
  name: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other';
  size: number;
  uploadedBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  uploadedAt: string;
  projectId?: string;
  projectName?: string;
  category: string;
  url: string;
  description?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface SimpleFileManagerProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
}

export default function SimpleFileManager({ currentUser }: SimpleFileManagerProps) {
  // 状态管理
  const [files, setFiles] = useState<FileItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // 模拟数据
  const mockProjects: Project[] = [
    { id: 'project-1', name: '技能提升平台', description: '在线学习平台项目' },
    { id: 'project-2', name: '用户管理系统', description: '企业用户管理系统' },
    { id: 'project-3', name: '数据分析工具', description: '业务数据分析工具' }
  ];

  const mockFiles: FileItem[] = [
    {
      id: 'file-1',
      name: '项目需求文档.docx',
      type: 'document',
      size: 2048576, // 2MB
      uploadedBy: { id: 'user-1', name: '张三' },
      uploadedAt: new Date(Date.now() - 3600000).toISOString(),
      projectId: 'project-1',
      projectName: '技能提升平台',
      category: '文档',
      url: '/files/project-requirements.docx',
      description: '项目详细需求说明文档'
    },
    {
      id: 'file-2',
      name: '系统架构图.png',
      type: 'image',
      size: 1024000, // 1MB
      uploadedBy: { id: 'user-2', name: '李四' },
      uploadedAt: new Date(Date.now() - 7200000).toISOString(),
      projectId: 'project-1',
      projectName: '技能提升平台',
      category: '图片',
      url: '/files/architecture.png',
      description: '系统整体架构设计图'
    },
    {
      id: 'file-3',
      name: '演示视频.mp4',
      type: 'video',
      size: 15728640, // 15MB
      uploadedBy: { id: 'user-3', name: '王五' },
      uploadedAt: new Date(Date.now() - 10800000).toISOString(),
      projectId: 'project-2',
      projectName: '用户管理系统',
      category: '视频',
      url: '/files/demo-video.mp4',
      description: '系统功能演示视频'
    },
    {
      id: 'file-4',
      name: '数据库设计.sql',
      type: 'other',
      size: 512000, // 512KB
      uploadedBy: { id: 'user-1', name: '张三' },
      uploadedAt: new Date(Date.now() - 14400000).toISOString(),
      projectId: 'project-1',
      projectName: '技能提升平台',
      category: '文档',
      url: '/files/database-design.sql',
      description: '数据库表结构设计文件'
    },
    {
      id: 'file-5',
      name: '用户手册.pdf',
      type: 'document',
      size: 3145728, // 3MB
      uploadedBy: { id: 'user-2', name: '李四' },
      uploadedAt: new Date(Date.now() - 18000000).toISOString(),
      projectId: 'project-2',
      projectName: '用户管理系统',
      category: '文档',
      url: '/files/user-manual.pdf',
      description: '系统使用说明手册'
    },
    {
      id: 'file-6',
      name: '测试报告.xlsx',
      type: 'document',
      size: 1536000, // 1.5MB
      uploadedBy: { id: 'user-3', name: '王五' },
      uploadedAt: new Date(Date.now() - 21600000).toISOString(),
      projectId: 'project-3',
      projectName: '数据分析工具',
      category: '文档',
      url: '/files/test-report.xlsx',
      description: '系统测试结果报告'
    }
  ];

  // 初始化数据
  useEffect(() => {
    setProjects(mockProjects);
    setFiles(mockFiles);
  }, []);

  // 获取文件图标
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'image': return <Image className="w-5 h-5 text-green-500" />;
      case 'video': return <Video className="w-5 h-5 text-purple-500" />;
      case 'audio': return <Music className="w-5 h-5 text-orange-500" />;
      case 'archive': return <Archive className="w-5 h-5 text-yellow-500" />;
      default: return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return '刚刚';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}小时前`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // 过滤和排序文件
  const filteredFiles = files
    .filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           file.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProject = !selectedProject || file.projectId === selectedProject;
      const matchesCategory = !selectedCategory || file.category === selectedCategory;
      return matchesSearch && matchesProject && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return b.size - a.size;
        case 'date':
        default:
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
    });

  // 文件操作
  const handleDownload = (file: FileItem) => {
    toast.success(`开始下载 ${file.name}`);
  };

  const handlePreview = (file: FileItem) => {
    toast.info(`预览 ${file.name}`);
  };

  const handleEdit = (file: FileItem) => {
    toast.info(`编辑 ${file.name}`);
  };

  const handleDelete = (file: FileItem) => {
    setFiles(prev => prev.filter(f => f.id !== file.id));
    toast.success(`已删除 ${file.name}`);
  };

  const handleUpload = () => {
    toast.info('上传功能演示 - 请选择文件');
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">文件管理</h1>
          <p className="text-gray-600 mt-1">管理项目和任务相关的文件</p>
        </div>
        
        <Button onClick={handleUpload}>
          <Upload className="w-4 h-4 mr-2" />
          上传文件
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            搜索和筛选
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="搜索文件名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 项目筛选 */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有项目</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            {/* 分类筛选 */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有分类</option>
              <option value="文档">文档</option>
              <option value="图片">图片</option>
              <option value="视频">视频</option>
              <option value="音频">音频</option>
              <option value="压缩包">压缩包</option>
            </select>

            {/* 排序方式 */}
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'size')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">上传时间</option>
                <option value="name">文件名</option>
                <option value="size">文件大小</option>
              </select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              >
                {viewMode === 'list' ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            共找到 {filteredFiles.length} 个文件
          </div>
        </CardContent>
      </Card>

      {/* 文件列表 */}
      <Card>
        <CardContent className="p-0">
          {filteredFiles.length > 0 ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4' : ''}>
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={`${
                    viewMode === 'list' 
                      ? 'flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50' 
                      : 'p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow'
                  }`}
                >
                  <div className={`flex items-center space-x-3 ${viewMode === 'grid' ? 'mb-3' : 'flex-1'}`}>
                    {getFileIcon(file.type)}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 truncate">{file.name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{formatTime(file.uploadedAt)}</span>
                      </div>
                      {file.projectName && (
                        <div className="flex items-center space-x-1 mt-1">
                          <FolderOpen className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{file.projectName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`flex items-center space-x-2 ${viewMode === 'grid' ? 'justify-between' : ''}`}>
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={file.uploadedBy.avatar} />
                        <AvatarFallback className="text-xs">
                          {file.uploadedBy.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-600">{file.uploadedBy.name}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => handlePreview(file)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDownload(file)}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(file)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(file)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <File className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无文件</h3>
              <p>还没有上传任何文件</p>
              <Button className="mt-4" onClick={handleUpload}>
                <Upload className="w-4 h-4 mr-2" />
                上传第一个文件
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
