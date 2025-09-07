'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue } from 'framer-motion';

/**
 * 动画类型枚举
 */
type AnimationType = 
  | 'fadeIn' 
  | 'slideIn' 
  | 'scaleIn' 
  | 'bounceIn' 
  | 'flipIn' 
  | 'rotateIn'
  | 'zoomIn'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight';

/**
 * 动画配置接口
 */
interface AnimationConfig {
  type: AnimationType;
  duration: number;
  delay: number;
  easing: string;
  stagger: number;
  repeat: boolean;
  repeatDelay: number;
}

/**
 * 部门节点动画属性
 */
interface DepartmentNodeAnimationProps {
  id: string;
  children: React.ReactNode;
  animationType?: AnimationType;
  duration?: number;
  delay?: number;
  isVisible?: boolean;
  onAnimationComplete?: () => void;
  className?: string;
}

/**
 * 连接线动画属性
 */
interface ConnectionLineAnimationProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  duration?: number;
  delay?: number;
  strokeWidth?: number;
  strokeColor?: string;
  animationType?: 'draw' | 'fade' | 'pulse';
}

/**
 * 组织架构动画容器属性
 */
interface OrganizationAnimationsProps {
  children: React.ReactNode;
  animationConfig?: Partial<AnimationConfig>;
  enableAnimations?: boolean;
  className?: string;
}

/**
 * 动画变体定义
 */
const animationVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  slideIn: {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 100, opacity: 0 }
  },
  scaleIn: {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0, opacity: 0 }
  },
  bounceIn: {
    initial: { scale: 0, opacity: 0 },
    animate: { 
      scale: [0, 1.2, 1], 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    },
    exit: { scale: 0, opacity: 0 }
  },
  flipIn: {
    initial: { rotateY: -90, opacity: 0 },
    animate: { rotateY: 0, opacity: 1 },
    exit: { rotateY: 90, opacity: 0 }
  },
  rotateIn: {
    initial: { rotate: -180, scale: 0, opacity: 0 },
    animate: { rotate: 0, scale: 1, opacity: 1 },
    exit: { rotate: 180, scale: 0, opacity: 0 }
  },
  zoomIn: {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.5, opacity: 0 }
  },
  slideUp: {
    initial: { y: 100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -100, opacity: 0 }
  },
  slideDown: {
    initial: { y: -100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 100, opacity: 0 }
  },
  slideLeft: {
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -100, opacity: 0 }
  },
  slideRight: {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 100, opacity: 0 }
  }
};

/**
 * 缓动函数定义
 */
const easingFunctions = {
  linear: [0, 0, 1, 1],
  easeIn: [0.4, 0, 1, 1],
  easeOut: [0, 0, 0.2, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  elastic: [0.175, 0.885, 0.32, 1.275]
};

/**
 * 部门节点动画组件
 * 
 * 为单个部门节点提供进入、退出和状态变更动画
 * 
 * @param id - 节点唯一标识
 * @param children - 子组件内容
 * @param animationType - 动画类型
 * @param duration - 动画持续时间
 * @param delay - 动画延迟时间
 * @param isVisible - 是否可见
 * @param onAnimationComplete - 动画完成回调
 * @param className - 自定义样式类名
 */
export function DepartmentNodeAnimation({
  id,
  children,
  animationType = 'fadeIn',
  duration = 0.5,
  delay = 0,
  isVisible = true,
  onAnimationComplete,
  className = ''
}: DepartmentNodeAnimationProps) {
  const variants = animationVariants[animationType];
  
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key={id}
          className={className}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            duration,
            delay,
            ease: "easeInOut"
          }}
          onAnimationComplete={onAnimationComplete}
          layout
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 连接线动画组件
 * 
 * 为部门之间的连接线提供绘制动画效果
 * 
 * @param from - 起始坐标
 * @param to - 结束坐标
 * @param duration - 动画持续时间
 * @param delay - 动画延迟时间
 * @param strokeWidth - 线条宽度
 * @param strokeColor - 线条颜色
 * @param animationType - 动画类型
 */
export function ConnectionLineAnimation({
  from,
  to,
  duration = 1,
  delay = 0,
  strokeWidth = 2,
  strokeColor = '#e5e7eb',
  animationType = 'draw'
}: ConnectionLineAnimationProps) {
  const pathLength = useMotionValue(0);
  const opacity = useMotionValue(0);
  
  // 计算路径
  const pathData = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  
  const animationProps = {
    draw: {
      initial: { pathLength: 0, opacity: 1 },
      animate: { pathLength: 1, opacity: 1 }
    },
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 }
    },
    pulse: {
      initial: { opacity: 0.3 },
      animate: { 
        opacity: [0.3, 1, 0.3],
        transition: {
          repeat: Infinity,
          duration: 2
        }
      }
    }
  };
  
  const variants = animationProps[animationType];
  
  return (
    <motion.path
      d={pathData}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      fill="none"
      variants={variants}
      initial="initial"
      animate="animate"
      transition={{
        duration,
        delay,
        ease: "easeInOut"
      }}
    />
  );
}

/**
 * 层级展开动画组件
 * 
 * 为部门层级的展开和收起提供动画效果
 */
export function HierarchyExpandAnimation({
  children,
  isExpanded,
  level = 0
}: {
  children: React.ReactNode;
  isExpanded: boolean;
  level?: number;
}) {
  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            duration: 0.3,
            delay: level * 0.1,
            ease: "easeInOut"
          }}
          style={{ overflow: 'hidden' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 拖拽动画组件
 * 
 * 为部门节点的拖拽操作提供视觉反馈
 */
export function DragAnimation({
  children,
  isDragging,
  dragConstraints
}: {
  children: React.ReactNode;
  isDragging: boolean;
  dragConstraints?: any;
}) {
  return (
    <motion.div
      drag
      dragConstraints={dragConstraints}
      dragElastic={0.1}
      whileDrag={{
        scale: 1.05,
        rotate: 2,
        zIndex: 1000,
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
      }}
      dragTransition={{
        bounceStiffness: 300,
        bounceDamping: 20
      }}
      className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
    >
      {children}
    </motion.div>
  );
}

/**
 * 悬停动画组件
 * 
 * 为部门节点的悬停状态提供动画效果
 */
export function HoverAnimation({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{
        scale: 1.02,
        y: -2,
        boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
        transition: { duration: 0.2 }
      }}
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 加载动画组件
 * 
 * 为数据加载状态提供动画效果
 */
export function LoadingAnimation({
  size = 40,
  color = '#3b82f6'
}: {
  size?: number;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-center p-8">
      <motion.div
        className="rounded-full border-4 border-gray-200"
        style={{
          width: size,
          height: size,
          borderTopColor: color
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );
}

/**
 * 脉冲动画组件
 * 
 * 为重要元素提供脉冲提示动画
 */
export function PulseAnimation({
  children,
  isActive = false,
  color = '#ef4444'
}: {
  children: React.ReactNode;
  isActive?: boolean;
  color?: string;
}) {
  return (
    <motion.div
      className="relative"
      animate={isActive ? {
        boxShadow: [
          `0 0 0 0 ${color}40`,
          `0 0 0 10px ${color}00`,
          `0 0 0 0 ${color}00`
        ]
      } : {}}
      transition={{
        duration: 2,
        repeat: isActive ? Infinity : 0,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 数字计数动画组件
 * 
 * 为数字变化提供计数动画效果
 */
export function CountAnimation({
  from = 0,
  to,
  duration = 1,
  className = ''
}: {
  from?: number;
  to: number;
  duration?: number;
  className?: string;
}) {
  const [count, setCount] = useState(from);
  const nodeRef = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    const startTime = Date.now();
    const startValue = from;
    const endValue = to;
    const totalDuration = duration * 1000;
    
    const updateCount = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      
      // 使用缓动函数
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.round(startValue + (endValue - startValue) * easeOutQuart);
      
      setCount(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    };
    
    requestAnimationFrame(updateCount);
  }, [from, to, duration]);
  
  return (
    <motion.span
      ref={nodeRef}
      className={className}
      key={to}
      initial={{ scale: 1.2, color: '#3b82f6' }}
      animate={{ scale: 1, color: 'inherit' }}
      transition={{ duration: 0.3 }}
    >
      {count}
    </motion.span>
  );
}

/**
 * 路径动画组件
 * 
 * 为SVG路径提供绘制动画
 */
export function PathAnimation({
  path,
  duration = 2,
  delay = 0,
  strokeColor = '#3b82f6',
  strokeWidth = 2
}: {
  path: string;
  duration?: number;
  delay?: number;
  strokeColor?: string;
  strokeWidth?: number;
}) {
  return (
    <motion.path
      d={path}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{
        duration,
        delay,
        ease: "easeInOut"
      }}
    />
  );
}

/**
 * 组织架构动画容器组件
 * 
 * 为整个组织架构提供统一的动画管理
 * 
 * @param children - 子组件内容
 * @param animationConfig - 动画配置
 * @param enableAnimations - 是否启用动画
 * @param className - 自定义样式类名
 */
export default function OrganizationAnimations({
  children,
  animationConfig = {},
  enableAnimations = true,
  className = ''
}: OrganizationAnimationsProps) {
  const defaultConfig: AnimationConfig = {
    type: 'fadeIn',
    duration: 0.5,
    delay: 0,
    easing: 'easeInOut',
    stagger: 0.1,
    repeat: false,
    repeatDelay: 0,
    ...animationConfig
  };
  
  if (!enableAnimations) {
    return <div className={className}>{children}</div>;
  }
  
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: defaultConfig.duration,
        delay: defaultConfig.delay
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 动画工具函数
 */
export const animationUtils = {
  /**
   * 创建交错动画配置
   */
  createStaggerConfig: (itemCount: number, baseDelay: number = 0.1) => {
    return Array.from({ length: itemCount }, (_, index) => ({
      delay: index * baseDelay
    }));
  },
  
  /**
   * 创建序列动画配置
   */
  createSequenceConfig: (animations: AnimationType[], duration: number = 0.5) => {
    return animations.map((type, index) => ({
      type,
      delay: index * duration,
      duration
    }));
  },
  
  /**
   * 获取动画变体
   */
  getVariants: (type: AnimationType) => animationVariants[type],
  
  /**
   * 获取缓动函数
   */
  getEasing: (name: keyof typeof easingFunctions) => easingFunctions[name]
};

/**
 * 动画预设配置
 */
export const animationPresets = {
  // 快速动画
  fast: {
    duration: 0.2,
    easing: 'easeOut'
  },
  
  // 标准动画
  standard: {
    duration: 0.5,
    easing: 'easeInOut'
  },
  
  // 慢速动画
  slow: {
    duration: 1,
    easing: 'easeInOut'
  },
  
  // 弹性动画
  bouncy: {
    duration: 0.8,
    easing: 'bounce'
  },
  
  // 优雅动画
  elegant: {
    duration: 0.6,
    easing: 'elastic'
  }
};