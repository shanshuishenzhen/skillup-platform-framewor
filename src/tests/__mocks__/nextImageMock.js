/**
 * Next.js Image组件模拟
 * 
 * 在测试环境中模拟next/image组件
 * 返回简单的img标签以便测试
 */

import React from 'react';

const NextImage = (props) => {
  const { src, alt, width, height, priority, placeholder, ...rest } = props;
  
  return React.createElement('img', {
    src: typeof src === 'string' ? src : src?.src || '',
    alt: alt || '',
    width: width || 'auto',
    height: height || 'auto',
    'data-testid': 'next-image',
    'data-priority': priority || false,
    'data-placeholder': placeholder || 'empty',
    ...rest
  });
};