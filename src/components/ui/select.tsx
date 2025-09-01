'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Select 组件接口定义
 */
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectContextType {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

function useSelectContext() {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within a Select provider');
  }
  return context;
}

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

/**
 * Select 主组件 - 支持受控和非受控模式
 */
export function Select({ 
  value, 
  onValueChange, 
  defaultValue,
  children,
  disabled = false
}: SelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  
  // 受控模式：使用外部传入的value，非受控模式：使用内部状态
  const currentValue = value !== undefined ? value : internalValue;
  
  // 处理值变化
  const handleValueChange = (newValue: string) => {
    if (disabled) return;
    
    if (value === undefined) {
      // 非受控模式：更新内部状态
      setInternalValue(newValue);
    }
    // 调用外部回调
    onValueChange?.(newValue);
    // 选择后关闭下拉菜单
    setOpen(false);
  };
  
  // 处理打开/关闭状态
  const handleSetOpen = (newOpen: boolean) => {
    if (disabled) return;
    setOpen(newOpen);
  };
  
  // 处理外部点击关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [open]);
  
  const contextValue = {
    value: currentValue,
    onValueChange: handleValueChange,
    open,
    setOpen: handleSetOpen,
    disabled
  };
  
  return (
    <SelectContext.Provider value={contextValue}>
      <div ref={selectRef} className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

/**
 * SelectValue 组件 - 用于显示选中的值
 */
export function SelectValue({ 
  placeholder,
  getDisplayText
}: { 
  placeholder?: string;
  getDisplayText?: (value: string) => string;
}) {
  const { value } = useSelectContext();
  
  const displayText = value ? (getDisplayText ? getDisplayText(value) : value) : placeholder;
  
  if (value) {
    return <span className="text-gray-900">{displayText}</span>;
  }
  
  return <span className="text-gray-500">{displayText}</span>;
}

/**
 * SelectTrigger 组件 - 触发器
 */
export function SelectTrigger({ 
  children, 
  className = '',
  disabled = false
}: { 
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { open, setOpen } = useSelectContext();
  
  return (
    <button
      type="button"
      className={`
        w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
        ${open ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        ${className}
      `}
      onClick={() => !disabled && setOpen(!open)}
      disabled={disabled}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {children}
        </div>
        <ChevronDown 
          className={`h-4 w-4 text-gray-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`} 
        />
      </div>
    </button>
  );
}

/**
 * SelectContent 组件 - 下拉内容
 */
export function SelectContent({ 
  children,
  className = ''
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  const { open } = useSelectContext();
  
  if (!open) {
    return null;
  }
  
  return (
    <div className={`absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto ${className}`}>
      {children}
    </div>
  );
}

/**
 * SelectItem 组件 - 选项项
 */
export function SelectItem({ 
  children, 
  value,
  disabled = false,
  className = ''
}: { 
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
}) {
  const { value: selectedValue, onValueChange } = useSelectContext();
  const isSelected = selectedValue === value;
  
  return (
    <button
      type="button"
      className={`
        w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none
        ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-900 cursor-pointer'}
        ${isSelected ? 'bg-blue-50 text-blue-600' : ''}
        ${className}
      `}
      onClick={() => !disabled && onValueChange?.(value)}
      disabled={disabled}
    >
      <div className="flex items-center justify-between">
        <span>{children}</span>
        {isSelected && (
          <Check className="h-4 w-4 text-blue-600" />
        )}
      </div>
    </button>
  );
}

export default Select;