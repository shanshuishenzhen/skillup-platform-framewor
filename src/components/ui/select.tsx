'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Select 组件接口定义
 */
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options?: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

/**
 * Select 下拉选择组件
 * @param props - 组件属性
 * @returns React 组件
 */
export function Select({
  options,
  value,
  defaultValue,
  placeholder = '请选择...',
  disabled = false,
  className = '',
  onChange,
  onValueChange,
  children
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || defaultValue || '');
  const selectRef = useRef<HTMLDivElement>(null);

  // 处理点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 同步外部 value 变化
  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const selectedOption = options?.find(option => option.value === selectedValue);

  const handleSelect = (optionValue: string) => {
    setSelectedValue(optionValue);
    setIsOpen(false);
    onChange?.(optionValue);
    onValueChange?.(optionValue);
  };

  // 如果使用 children 模式，直接返回 children
  if (children) {
    return (
      <div ref={selectRef} className={`relative ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      <button
        type="button"
        className={`
          w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {isOpen && options && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`
                w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none
                ${option.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-900 cursor-pointer'}
                ${selectedValue === option.value ? 'bg-blue-50 text-blue-600' : ''}
              `}
              onClick={() => !option.disabled && handleSelect(option.value)}
              disabled={option.disabled}
            >
              <div className="flex items-center justify-between">
                <span>{option.label}</span>
                {selectedValue === option.value && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * SelectValue 组件 - 用于显示选中的值
 */
export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span className="text-gray-500">{placeholder}</span>;
}

/**
 * SelectTrigger 组件 - 触发器
 */
export function SelectTrigger({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {children}
    </div>
  );
}

/**
 * SelectContent 组件 - 下拉内容
 */
export function SelectContent({ 
  children 
}: { 
  children: React.ReactNode;
}) {
  return (
    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
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
  onSelect
}: { 
  children: React.ReactNode;
  value: string;
  onSelect?: (value: string) => void;
}) {
  return (
    <button
      type="button"
      className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900 cursor-pointer"
      onClick={() => onSelect?.(value)}
    >
      {children}
    </button>
  );
}

export default Select;