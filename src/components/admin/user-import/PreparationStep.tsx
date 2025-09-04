/**
 * 用户批量导入 - 导入准备步骤组件
 * 提供模板下载、字段说明和导入须知
 */

'use client';

import { useState } from 'react';
import { Download, FileText, AlertCircle, CheckCircle, Users, Mail, Phone, IdCard, Shield, Lock, Building, Briefcase, Hash, UserCheck } from 'lucide-react';

/**
 * 字段信息接口
 */
interface FieldInfo {
  name: string;
  label: string;
  required: boolean;
  type: string;
  description: string;
  example: string;
  icon: React.ComponentType<any>;
  validation?: string;
}

/**
 * 导入准备步骤组件属性
 */
interface PreparationStepProps {
  onComplete: () => void;
  onNext: () => void;
}

/**
 * 导入准备步骤组件
 */
export default function PreparationStep({ onComplete, onNext }: PreparationStepProps) {
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'completed'>('idle');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  /**
   * 字段配置信息
   */
  const fields: FieldInfo[] = [
    {
      name: 'name',
      label: '姓名',
      required: true,
      type: 'string',
      description: '用户的真实姓名，用于系统显示和身份识别',
      example: '张三',
      icon: Users,
      validation: '2-20个字符，支持中英文'
    },
    {
      name: 'phone',
      label: '手机号',
      required: true,
      type: 'string',
      description: '用户手机号码，作为主要身份标识和登录凭证',
      example: '13800138000',
      icon: Phone,
      validation: '11位数字，符合中国大陆手机号格式'
    },
    {
      name: 'id_card',
      label: '身份证号码',
      required: true,
      type: 'string',
      description: '用户身份证号码，用于身份验证和唯一性校验',
      example: '110101199001011234',
      icon: IdCard,
      validation: '18位身份证号码，符合国标格式'
    },
    {
      name: 'role',
      label: '角色',
      required: true,
      type: 'enum',
      description: '用户在系统中的角色权限',
      example: 'user',
      icon: Shield,
      validation: 'user（普通用户）、admin（管理员）、super_admin（超级管理员）'
    },
    {
      name: 'password',
      label: '密码',
      required: true,
      type: 'string',
      description: '用户登录密码，建议使用强密码',
      example: 'Password123!',
      icon: Lock,
      validation: '8-20位，包含大小写字母、数字和特殊字符'
    },
    {
      name: 'email',
      label: '邮箱',
      required: false,
      type: 'string',
      description: '用户邮箱地址，用于通知和辅助联系（可选）',
      example: 'zhangsan@example.com',
      icon: Mail,
      validation: '有效的邮箱格式，如：user@domain.com'
    },
    {
      name: 'employee_id',
      label: '员工ID',
      required: false,
      type: 'string',
      description: '企业内部员工编号（可选）',
      example: 'EMP001',
      icon: Hash,
      validation: '企业自定义格式'
    },
    {
      name: 'department',
      label: '部门',
      required: false,
      type: 'string',
      description: '用户所属部门（可选）',
      example: '技术部',
      icon: Building,
      validation: '部门名称'
    },
    {
      name: 'position',
      label: '职位',
      required: false,
      type: 'string',
      description: '用户职位信息（可选）',
      example: '软件工程师',
      icon: Briefcase,
      validation: '职位名称'
    },
    {
      name: 'status',
      label: '状态',
      required: false,
      type: 'enum',
      description: '用户账户状态（可选，默认为active）',
      example: 'active',
      icon: UserCheck,
      validation: 'active（激活）、inactive（未激活）'
    }
  ];

  /**
   * 准备检查项
   */
  const checklistItems = [
    {
      id: 'template',
      title: '下载并查看导入模板',
      description: '确保了解Excel模板的格式和字段要求'
    },
    {
      id: 'fields',
      title: '理解字段要求',
      description: '熟悉必填字段和可选字段的格式要求'
    },
    {
      id: 'data',
      title: '准备用户数据',
      description: '收集并整理需要导入的用户信息'
    },
    {
      id: 'validation',
      title: '数据格式验证',
      description: '确保数据符合系统要求，避免导入失败'
    }
  ];

  /**
   * 下载Excel模板
   */
  const downloadTemplate = async () => {
    setDownloadStatus('downloading');
    
    try {
      // 创建Excel模板数据
      const headers = fields.map(field => field.label);
      const exampleRow = fields.map(field => field.example);
      
      // 创建CSV格式的模板内容
      const csvContent = [
        headers.join(','),
        exampleRow.join(',')
      ].join('\n');
      
      // 创建Blob并下载
      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', '用户批量导入模板.csv');
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setDownloadStatus('completed');
      
      // 自动勾选模板下载项
      setCheckedItems(prev => new Set([...prev, 'template']));
      
    } catch (error) {
      console.error('模板下载失败:', error);
      setDownloadStatus('idle');
    }
  };

  /**
   * 切换检查项状态
   */
  const toggleCheckItem = (itemId: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  /**
   * 检查是否可以继续下一步
   */
  const canProceed = checkedItems.size === checklistItems.length;

  /**
   * 处理下一步
   */
  const handleNext = () => {
    if (canProceed) {
      onComplete();
      onNext();
    }
  };

  return (
    <div className="space-y-8">
      {/* 导入须知 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <AlertCircle className="h-6 w-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">导入须知</h3>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>• 请确保数据格式正确，避免导入失败</li>
              <li>• 手机号和身份证号码为必填项，作为主要身份标识</li>
              <li>• 邮箱字段为可选项，仅用于通知和辅助联系</li>
              <li>• 系统将自动验证身份证号码格式和唯一性</li>
              <li>• 建议分批导入，单次不超过1000条记录</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 模板下载 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-gray-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">下载导入模板</h3>
              <p className="text-sm text-gray-600">获取标准化的Excel导入模板</p>
            </div>
          </div>
          
          <button
            onClick={downloadTemplate}
            disabled={downloadStatus === 'downloading'}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            {downloadStatus === 'downloading' ? '下载中...' : 
             downloadStatus === 'completed' ? '重新下载' : '下载模板'}
          </button>
        </div>
        
        {downloadStatus === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm text-green-800">模板下载成功！请查看下载文件夹。</span>
            </div>
          </div>
        )}
      </div>

      {/* 字段说明 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">字段说明</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {fields.map((field) => {
            const Icon = field.icon;
            return (
              <div key={field.name} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className={`p-2 rounded-lg mr-3 flex-shrink-0 ${
                    field.required ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      field.required ? 'text-red-600' : 'text-gray-600'
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-1">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {field.label}
                      </h4>
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                        field.required 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {field.required ? '必填' : '可选'}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-2">
                      {field.description}
                    </p>
                    
                    <div className="space-y-1">
                      <div className="text-xs">
                        <span className="text-gray-500">示例：</span>
                        <span className="text-gray-900 font-mono">{field.example}</span>
                      </div>
                      
                      {field.validation && (
                        <div className="text-xs">
                          <span className="text-gray-500">格式：</span>
                          <span className="text-gray-700">{field.validation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 准备检查清单 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">准备检查清单</h3>
        
        <div className="space-y-3">
          {checklistItems.map((item) => (
            <div key={item.id} className="flex items-start">
              <button
                onClick={() => toggleCheckItem(item.id)}
                className={`mt-0.5 mr-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  checkedItems.has(item.id)
                    ? 'bg-green-600 border-green-600'
                    : 'border-gray-300 hover:border-green-500'
                }`}
              >
                {checkedItems.has(item.id) && (
                  <CheckCircle className="h-3 w-3 text-white" />
                )}
              </button>
              
              <div className="flex-1">
                <h4 className={`text-sm font-medium ${
                  checkedItems.has(item.id) ? 'text-green-900' : 'text-gray-900'
                }`}>
                  {item.title}
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            canProceed
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          下一步：文件上传
        </button>
      </div>
    </div>
  );
}