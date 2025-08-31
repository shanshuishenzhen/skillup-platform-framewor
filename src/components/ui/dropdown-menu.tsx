'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * DropdownMenu 组件接口定义
 */
interface DropdownMenuProps {
  children: React.ReactNode;
  className?: string;
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  destructive?: boolean;
}

interface DropdownMenuSeparatorProps {
  className?: string;
}

interface DropdownMenuLabelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * DropdownMenu 上下文
 */
interface DropdownMenuContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | null>(null);

/**
 * DropdownMenu 主组件
 * @param props - 组件属性
 * @returns React 组件
 * @example
 * <DropdownMenu>
 *   <DropdownMenuTrigger>打开菜单</DropdownMenuTrigger>
 *   <DropdownMenuContent>
 *     <DropdownMenuItem>选项1</DropdownMenuItem>
 *     <DropdownMenuItem>选项2</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 */
export function DropdownMenu({ children, className = '' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 处理点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // 处理 ESC 键关闭菜单
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen]);

  const contextValue: DropdownMenuContextType = {
    isOpen,
    setIsOpen,
    triggerRef
  };

  return (
    <DropdownMenuContext.Provider value={contextValue}>
      <div className={`relative ${className}`} ref={menuRef}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

/**
 * DropdownMenuTrigger 触发器组件
 * @param props - 组件属性
 * @returns React 组件
 */
export function DropdownMenuTrigger({ 
  children, 
  className = '',
  asChild = false 
}: DropdownMenuTriggerProps) {
  const context = React.useContext(DropdownMenuContext);
  
  if (!context) {
    throw new Error('DropdownMenuTrigger must be used within DropdownMenu');
  }

  const { isOpen, setIsOpen, triggerRef } = context;

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: triggerRef,
      onClick: handleClick,
      'aria-expanded': isOpen,
      'aria-haspopup': 'menu'
    } as any);
  }

  return (
    <button
      ref={triggerRef as React.RefObject<HTMLButtonElement>}
      type="button"
      className={`
        inline-flex items-center justify-center rounded-md px-3 py-2
        text-sm font-medium transition-colors
        hover:bg-gray-100 focus:bg-gray-100 focus:outline-none
        ${className}
      `}
      onClick={handleClick}
      aria-expanded={isOpen}
      aria-haspopup="menu"
    >
      {children}
    </button>
  );
}

/**
 * DropdownMenuContent 内容组件
 * @param props - 组件属性
 * @returns React 组件
 */
export function DropdownMenuContent({ 
  children, 
  className = '',
  align = 'start',
  side = 'bottom'
}: DropdownMenuContentProps) {
  const context = React.useContext(DropdownMenuContext);
  
  if (!context) {
    throw new Error('DropdownMenuContent must be used within DropdownMenu');
  }

  const { isOpen, setIsOpen } = context;

  if (!isOpen) {
    return null;
  }

  // 对齐样式
  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 transform -translate-x-1/2',
    end: 'right-0'
  };

  // 位置样式
  const sideClasses = {
    top: 'bottom-full mb-1',
    bottom: 'top-full mt-1',
    left: 'right-full mr-1 top-0',
    right: 'left-full ml-1 top-0'
  };

  return (
    <div
      className={`
        absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200
        bg-white p-1 shadow-lg animate-in fade-in-0 zoom-in-95
        ${alignClasses[align]}
        ${sideClasses[side]}
        ${className}
      `}
      role="menu"
      aria-orientation="vertical"
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            onClick: () => {
              (child.props as any).onClick?.();
              setIsOpen(false);
            }
          } as any);
        }
        return child;
      })}
    </div>
  );
}

/**
 * DropdownMenuItem 菜单项组件
 * @param props - 组件属性
 * @returns React 组件
 */
export function DropdownMenuItem({ 
  children, 
  className = '',
  disabled = false,
  onClick,
  destructive = false
}: DropdownMenuItemProps) {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <button
      type="button"
      className={`
        relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5
        text-sm outline-none transition-colors
        ${disabled 
          ? 'pointer-events-none opacity-50' 
          : destructive
            ? 'text-red-600 hover:bg-red-50 focus:bg-red-50'
            : 'hover:bg-gray-100 focus:bg-gray-100'
        }
        ${className}
      `}
      onClick={handleClick}
      disabled={disabled}
      role="menuitem"
    >
      {children}
    </button>
  );
}

/**
 * DropdownMenuSeparator 分隔符组件
 * @param props - 组件属性
 * @returns React 组件
 */
export function DropdownMenuSeparator({ className = '' }: DropdownMenuSeparatorProps) {
  return (
    <div 
      className={`-mx-1 my-1 h-px bg-gray-200 ${className}`}
      role="separator"
    />
  );
}

/**
 * DropdownMenuLabel 标签组件
 * @param props - 组件属性
 * @returns React 组件
 */
export function DropdownMenuLabel({ children, className = '' }: DropdownMenuLabelProps) {
  return (
    <div 
      className={`px-2 py-1.5 text-sm font-semibold text-gray-900 ${className}`}
      role="presentation"
    >
      {children}
    </div>
  );
}

/**
 * DropdownMenuCheckboxItem 复选框菜单项组件
 * @param props - 组件属性
 * @returns React 组件
 */
export function DropdownMenuCheckboxItem({
  children,
  checked = false,
  onCheckedChange,
  className = '',
  disabled = false
}: {
  children: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}) {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  return (
    <button
      type="button"
      className={`
        relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2
        text-sm outline-none transition-colors
        ${disabled 
          ? 'pointer-events-none opacity-50' 
          : 'hover:bg-gray-100 focus:bg-gray-100'
        }
        ${className}
      `}
      onClick={handleClick}
      disabled={disabled}
      role="menuitemcheckbox"
      aria-checked={checked}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && <Check className="h-4 w-4" />}
      </span>
      {children}
    </button>
  );
}

export default DropdownMenu;