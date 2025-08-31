'use client';

import React, { useState } from 'react';
import { User } from 'lucide-react';

/**
 * Avatar 组件接口定义
 */
interface AvatarProps {
  src?: string; // 头像图片地址
  alt?: string; // 图片替代文本
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  fallback?: string; // 备用文本（通常是用户名首字母）
  shape?: 'circle' | 'square';
  status?: 'online' | 'offline' | 'away' | 'busy'; // 在线状态
  showStatus?: boolean; // 是否显示状态指示器
  onClick?: () => void;
}

/**
 * Avatar 头像组件
 * @param props - 组件属性
 * @returns React 组件
 * @example
 * <Avatar src="/avatar.jpg" alt="用户头像" size="md" />
 * <Avatar fallback="张三" size="lg" status="online" showStatus />
 */
export function Avatar({
  src,
  alt = '头像',
  size = 'md',
  className = '',
  fallback,
  shape = 'circle',
  status,
  showStatus = false,
  onClick
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // 尺寸样式
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl'
  };

  // 形状样式
  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-lg'
  };

  // 状态颜色
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500'
  };

  // 状态指示器尺寸
  const statusSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
    '2xl': 'w-5 h-5'
  };

  // 处理图片加载错误
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  // 处理图片加载完成
  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // 生成备用文本（取用户名首字母）
  const getFallbackText = () => {
    if (fallback) {
      return fallback.charAt(0).toUpperCase();
    }
    return alt.charAt(0).toUpperCase() || 'U';
  };

  const baseClasses = `
    relative inline-flex items-center justify-center
    ${sizeClasses[size]}
    ${shapeClasses[shape]}
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
    ${className}
  `;

  return (
    <div className={baseClasses} onClick={onClick}>
      {/* 头像图片 */}
      {src && !imageError ? (
        <>
          <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover ${shapeClasses[shape]}`}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
          {/* 加载状态 */}
          {imageLoading && (
            <div className={`absolute inset-0 bg-gray-200 animate-pulse ${shapeClasses[shape]}`} />
          )}
        </>
      ) : (
        /* 备用显示 */
        <div className={`w-full h-full bg-gray-300 text-gray-600 font-medium flex items-center justify-center ${shapeClasses[shape]}`}>
          {fallback ? (
            <span>{getFallbackText()}</span>
          ) : (
            <User className="w-1/2 h-1/2" />
          )}
        </div>
      )}

      {/* 状态指示器 */}
      {showStatus && status && (
        <div 
          className={`
            absolute -bottom-0.5 -right-0.5 border-2 border-white rounded-full
            ${statusSizes[size]}
            ${statusColors[status]}
          `}
          title={`状态: ${status}`}
        />
      )}
    </div>
  );
}

/**
 * AvatarGroup 头像组组件
 * @param props - 组件属性
 * @returns React 组件
 * @example
 * <AvatarGroup max={3}>
 *   <Avatar src="/user1.jpg" />
 *   <Avatar src="/user2.jpg" />
 *   <Avatar src="/user3.jpg" />
 *   <Avatar src="/user4.jpg" />
 * </AvatarGroup>
 */
/**
 * AvatarFallback 备用显示组件
 * @param props - 组件属性
 * @returns React 组件
 */
export function AvatarFallback({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={`w-full h-full bg-gray-300 text-gray-600 font-medium flex items-center justify-center rounded-full ${className}`}>
      {children}
    </div>
  );
}

/**
 * AvatarImage 头像图片组件
 * @param props - 组件属性
 * @returns React 组件
 */
export function AvatarImage({ 
  src, 
  alt = '头像', 
  className = '' 
}: { 
  src: string; 
  alt?: string; 
  className?: string; 
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  if (imageError) {
    return null;
  }

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover rounded-full ${className}`}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
      {imageLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-full" />
      )}
    </>
  );
}

export function AvatarGroup({
  children,
  max = 5,
  size = 'md',
  className = ''
}: {
  children: React.ReactNode;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}) {
  const childrenArray = React.Children.toArray(children);
  const visibleChildren = childrenArray.slice(0, max);
  const remainingCount = childrenArray.length - max;

  // 间距样式
  const spacingClasses = {
    xs: '-space-x-1',
    sm: '-space-x-1.5',
    md: '-space-x-2',
    lg: '-space-x-2.5',
    xl: '-space-x-3',
    '2xl': '-space-x-4'
  };

  return (
    <div className={`flex items-center ${spacingClasses[size]} ${className}`}>
      {visibleChildren.map((child, index) => (
        <div key={index} className="relative border-2 border-white rounded-full">
          {React.cloneElement(child as React.ReactElement, { size } as any)}
        </div>
      ))}
      
      {/* 显示剩余数量 */}
      {remainingCount > 0 && (
        <Avatar
          size={size}
          fallback={`+${remainingCount}`}
          className="border-2 border-white bg-gray-100 text-gray-600"
        />
      )}
    </div>
  );
}

export default Avatar;