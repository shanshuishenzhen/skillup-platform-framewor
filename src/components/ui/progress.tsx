'use client';

import React from 'react';

/**
 * Progress 组件接口定义
 */
interface ProgressProps {
  value?: number; // 进度值 (0-100)
  max?: number; // 最大值，默认 100
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean; // 是否显示百分比标签
  label?: string; // 自定义标签
  animated?: boolean; // 是否显示动画
}

/**
 * Progress 进度条组件
 * @param props - 组件属性
 * @returns React 组件
 * @example
 * <Progress value={75} showLabel />
 * <Progress value={50} variant="success" size="lg" />
 */
export function Progress({
  value = 0,
  max = 100,
  className = '',
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  animated = false
}: ProgressProps) {
  // 确保进度值在有效范围内
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const percentage = (normalizedValue / max) * 100;

  // 尺寸样式
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  // 变体样式
  const variantClasses = {
    default: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  // 动画样式
  const animationClass = animated ? 'transition-all duration-300 ease-in-out' : '';

  return (
    <div className={`w-full ${className}`}>
      {/* 标签显示 */}
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">
            {label || '进度'}
          </span>
          {showLabel && (
            <span className="text-sm text-gray-500">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      
      {/* 进度条容器 */}
      <div 
        className={`
          w-full bg-gray-200 rounded-full overflow-hidden
          ${sizeClasses[size]}
        `}
        role="progressbar"
        aria-valuenow={normalizedValue}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || `进度: ${Math.round(percentage)}%`}
      >
        {/* 进度条填充 */}
        <div
          className={`
            h-full rounded-full
            ${variantClasses[variant]}
            ${animationClass}
            ${animated ? 'bg-gradient-to-r from-current to-current bg-[length:200%_100%] animate-pulse' : ''}
          `}
          style={{
            width: `${percentage}%`,
            transition: animated ? 'width 0.3s ease-in-out' : undefined
          }}
        />
      </div>
    </div>
  );
}

/**
 * CircularProgress 圆形进度条组件
 * @param props - 组件属性
 * @returns React 组件
 * @example
 * <CircularProgress value={75} size={80} />
 */
export function CircularProgress({
  value = 0,
  max = 100,
  size = 60,
  strokeWidth = 4,
  className = '',
  variant = 'default',
  showLabel = true
}: {
  value?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
}) {
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const percentage = (normalizedValue / max) * 100;
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // 变体颜色
  const variantColors = {
    default: '#3b82f6', // blue-500
    success: '#10b981', // green-500
    warning: '#f59e0b', // yellow-500
    error: '#ef4444'    // red-500
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb" // gray-200
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={variantColors[variant]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      
      {/* 中心标签 */}
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium text-gray-700">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
}

export default Progress;