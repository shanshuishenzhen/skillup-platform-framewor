/**
 * Radio Group 组件
 * 提供单选按钮组功能，支持受控和非受控模式
 * 
 * @param value - 当前选中的值
 * @param onValueChange - 值变化回调函数
 * @param children - 子组件
 * @param className - 自定义样式类名
 * @param disabled - 是否禁用
 */

'use client';

import React, { createContext, useContext, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// Radio Group Context
interface RadioGroupContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
}

const RadioGroupContext = createContext<RadioGroupContextValue>({});

// Radio Group Root Component
export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
}

const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, defaultValue, onValueChange, disabled, name, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || '');
    const currentValue = value !== undefined ? value : internalValue;

    const handleValueChange = (newValue: string) => {
      if (disabled) return;
      
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    return (
      <RadioGroupContext.Provider
        value={{
          value: currentValue,
          onValueChange: handleValueChange,
          disabled,
          name,
        }}
      >
        <div
          className={cn('grid gap-2', className)}
          {...props}
          ref={ref}
          role="radiogroup"
        />
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = 'RadioGroup';

// Radio Group Item Component
export interface RadioGroupItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
  id?: string;
}

const RadioGroupItem = forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, value, disabled: itemDisabled, id, ...props }, ref) => {
    const context = useContext(RadioGroupContext);
    const isChecked = context.value === value;
    const isDisabled = itemDisabled || context.disabled;

    const handleClick = () => {
      if (!isDisabled && context.onValueChange) {
        context.onValueChange(value);
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isChecked}
        data-state={isChecked ? 'checked' : 'unchecked'}
        disabled={isDisabled}
        className={cn(
          'aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          isChecked && 'bg-primary text-primary-foreground',
          className
        )}
        onClick={handleClick}
        id={id}
        {...props}
      >
        <div className="flex items-center justify-center">
          {isChecked && (
            <div className="h-2.5 w-2.5 rounded-full bg-current" />
          )}
        </div>
        {/* Hidden input for form submission */}
        <input
          type="radio"
          name={context.name}
          value={value}
          checked={isChecked}
          disabled={isDisabled}
          className="sr-only"
          readOnly
        />
      </button>
    );
  }
);
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };