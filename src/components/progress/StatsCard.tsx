import React, { memo } from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * 统计卡片组件的属性接口
 */
interface StatsCardProps {
  /** 图标组件 */
  icon: LucideIcon;
  /** 背景颜色类名 */
  bgColor: string;
  /** 图标颜色类名 */
  iconColor: string;
  /** 标签文本 */
  label: string;
  /** 数值 */
  value: string | number;
  /** 可选的描述文本 */
  description?: string;
  /** 可选的趋势指示器 */
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

/**
 * 统计卡片组件（优化版本）
 * 使用React.memo进行性能优化，避免不必要的重新渲染
 * 
 * @param props 组件属性
 * @returns 统计卡片JSX元素
 */
const StatsCard: React.FC<StatsCardProps> = memo(({
  icon: Icon,
  bgColor,
  iconColor,
  label,
  value,
  description,
  trend
}) => {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
      <div className="flex items-center">
        <div className={`p-2 ${bgColor} rounded-lg`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div className="ml-4 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            {trend && (
              <span className={`text-xs font-medium ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
});

// 设置组件显示名称，便于调试
StatsCard.displayName = 'Stats