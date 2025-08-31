/**
 * 用户批量导入 - 导入配置步骤组件
 * 提供导入选项设置和重复处理策略配置
 */

'use client';

import { useState } from 'react';
import { Settings, Users, Shield, Mail, AlertTriangle, Info, CheckCircle } from 'lucide-react';

/**
 * 导入配置接口
 */
export interface ImportConfig {
  duplicateStrategy: 'skip' | 'update' | 'error';
  defaultPassword?: string;
  defaultRole: 'user' | 'admin' | 'super_admin';
  sendNotification: boolean;
  validateOnly: boolean;
  batchSize: number;
  autoActivate: boolean;
}

/**
 * 导入配置步骤组件属性
 */
interface ConfigStepProps {
  onComplete: (config: ImportConfig) => void;
  onNext: () => void;
  onPrevious: () => void;
  totalRows: number;
}

/**
 * 导入配置步骤组件
 */
export default function ConfigStep({ onComplete, onNext, onPrevious, totalRows }: ConfigStepProps) {
  const [config, setConfig] = useState<ImportConfig>({
    duplicateStrategy: 'skip',
    defaultRole: 'user',
    sendNotification: false,
    validateOnly: false,
    batchSize: Math.min(totalRows, 100),
    autoActivate: true
  });

  /**
   * 重复处理策略选项
   */
  const duplicateStrategies = [
    {
      value: 'skip' as const,
      label: '跳过重复',
      description: '跳过已存在的用户，不进行任何操作',
      icon: '⏭️',
      recommended: true
    },
    {
      value: 'update' as const,
      label: '更新信息',
      description: '更新已存在用户的信息（除手机号外）',
      icon: '🔄',
      recommended: false
    },
    {
      value: 'error' as const,
      label: '报告错误',
      description: '遇到重复用户时停止导入并报告错误',
      icon: '❌',
      recommended: false
    }
  ];

  /**
   * 角色选项
   */
  const roleOptions = [
    {
      value: 'user' as const,
      label: '普通用户',
      description: '基础权限，可访问个人功能',
      icon: Users
    },
    {
      value: 'admin' as const,
      label: '管理员',
      description: '管理权限，可管理用户和内容',
      icon: Shield
    },
    {
      value: 'super_admin' as const,
      label: '超级管理员',
      description: '最高权限，可管理系统设置',
      icon: Shield
    }
  ];

  /**
   * 批量大小选项
   */
  const batchSizeOptions = [
    { value: 50, label: '50条/批', description: '适合小量数据，处理速度快' },
    { value: 100, label: '100条/批', description: '推荐设置，平衡速度和稳定性' },
    { value: 200, label: '200条/批', description: '适合大量数据，但可能较慢' },
    { value: 500, label: '500条/批', description: '仅适合服务器性能良好时使用' }
  ];

  /**
   * 更新配置
   */
  const updateConfig = <K extends keyof ImportConfig>(key: K, value: ImportConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  /**
   * 处理下一步
   */
  const handleNext = () => {
    onComplete(config);
    onNext();
  };

  /**
   * 计算预估批次数
   */
  const estimatedBatches = Math.ceil(totalRows / config.batchSize);

  /**
   * 计算预估时间（秒）
   */
  const estimatedTime = estimatedBatches * 2; // 假设每批次2秒

  return (
    <div className="space-y-6">
      {/* 配置概览 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <Info className="h-6 w-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">导入配置说明</h3>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>• 请根据实际需求配置导入选项</li>
              <li>• 重复处理策略将影响已存在用户的处理方式</li>
              <li>• 建议先进行验证模式测试，确认无误后再正式导入</li>
              <li>• 批量大小影响导入速度和系统稳定性</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 重复处理策略 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          重复用户处理策略
        </h3>
        
        <div className="space-y-3">
          {duplicateStrategies.map((strategy) => (
            <label key={strategy.value} className="flex items-start cursor-pointer">
              <input
                type="radio"
                name="duplicateStrategy"
                value={strategy.value}
                checked={config.duplicateStrategy === strategy.value}
                onChange={(e) => updateConfig('duplicateStrategy', e.target.value as any)}
                className="mt-1 mr-3"
              />
              <div className="flex-1">
                <div className="flex items-center">
                  <span className="text-lg mr-2">{strategy.icon}</span>
                  <span className="font-medium text-gray-900">{strategy.label}</span>
                  {strategy.recommended && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                      推荐
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{strategy.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 默认设置 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          默认设置
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 默认角色 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              默认角色（当文件中角色为空时使用）
            </label>
            <select
              value={config.defaultRole}
              onChange={(e) => updateConfig('defaultRole', e.target.value as any)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label} - {role.description}
                </option>
              ))}
            </select>
          </div>

          {/* 默认密码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              默认密码（当文件中密码为空时使用）
            </label>
            <input
              type="text"
              value={config.defaultPassword || ''}
              onChange={(e) => updateConfig('defaultPassword', e.target.value || undefined)}
              placeholder="留空则使用文件中的密码"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              建议设置统一的初始密码，用户首次登录后可修改
            </p>
          </div>
        </div>
      </div>

      {/* 导入选项 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          导入选项
        </h3>
        
        <div className="space-y-4">
          {/* 验证模式 */}
          <label className="flex items-start cursor-pointer">
            <input
              type="checkbox"
              checked={config.validateOnly}
              onChange={(e) => updateConfig('validateOnly', e.target.checked)}
              className="mt-1 mr-3"
            />
            <div>
              <span className="font-medium text-gray-900">仅验证模式</span>
              <p className="text-sm text-gray-600 mt-1">
                只验证数据格式和重复性，不实际导入到数据库
              </p>
            </div>
          </label>

          {/* 自动激活 */}
          <label className="flex items-start cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoActivate}
              onChange={(e) => updateConfig('autoActivate', e.target.checked)}
              className="mt-1 mr-3"
            />
            <div>
              <span className="font-medium text-gray-900">自动激活账户</span>
              <p className="text-sm text-gray-600 mt-1">
                导入后自动激活用户账户，用户可立即登录
              </p>
            </div>
          </label>

          {/* 发送通知 */}
          <label className="flex items-start cursor-pointer">
            <input
              type="checkbox"
              checked={config.sendNotification}
              onChange={(e) => updateConfig('sendNotification', e.target.checked)}
              className="mt-1 mr-3"
            />
            <div className="flex items-center">
              <Mail className="h-4 w-4 mr-1" />
              <span className="font-medium text-gray-900">发送邮件通知</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              向有邮箱的用户发送账户创建通知（需要配置邮件服务）
            </p>
          </label>
        </div>
      </div>

      {/* 性能设置 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">性能设置</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            批量处理大小
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {batchSizeOptions.map((option) => (
              <label key={option.value} className="flex items-start cursor-pointer">
                <input
                  type="radio"
                  name="batchSize"
                  value={option.value}
                  checked={config.batchSize === option.value}
                  onChange={(e) => updateConfig('batchSize', parseInt(e.target.value))}
                  className="mt-1 mr-2"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">{option.label}</span>
                  <p className="text-xs text-gray-600">{option.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 导入预估 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">导入预估</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{totalRows}</div>
            <div className="text-sm text-gray-600">总记录数</div>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{estimatedBatches}</div>
            <div className="text-sm text-gray-600">预估批次</div>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">
              {Math.floor(estimatedTime / 60)}:{(estimatedTime % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-gray-600">预估时间</div>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {config.validateOnly ? '验证' : '导入'}
            </div>
            <div className="text-sm text-gray-600">执行模式</div>
          </div>
        </div>
      </div>

      {/* 重要提醒 */}
      {!config.validateOnly && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">重要提醒</h3>
              <ul className="text-yellow-800 space-y-1 text-sm">
                <li>• 正式导入将直接写入数据库，请确认配置无误</li>
                <li>• 建议先使用"仅验证模式"进行测试</li>
                <li>• 导入过程中请勿关闭页面或刷新浏览器</li>
                <li>• 大量数据导入可能需要较长时间，请耐心等待</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          上一步
        </button>
        
        <button
          onClick={handleNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {config.validateOnly ? '开始验证' : '开始导入'}
        </button>
      </div>
    </div>
  );
}