'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Tabs 组件接口定义
 */
interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Tabs 上下文
 */
interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

const useTabsContext = () => {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
};

/**
 * Tabs 主组件
 * @param props - 组件属性
 * @returns React 组件
 * @example
 * <Tabs defaultValue="tab1">
 *   <TabsList>
 *     <TabsTrigger value="tab1">标签1</TabsTrigger>
 *     <TabsTrigger value="tab2">标签2</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="tab1">内容1</TabsContent>
 *   <TabsContent value="tab2">内容2</TabsContent>
 * </Tabs>
 */
const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ defaultValue, value, onValueChange, className, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || '');
    
    const currentValue = value !== undefined ? value : internalValue;
    const handleValueChange = React.useCallback((newValue: string) => {
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    }, [value, onValueChange]);

    const contextValue = React.useMemo(() => ({
      value: currentValue,
      onValueChange: handleValueChange,
    }), [currentValue, handleValueChange]);

    return (
      <TabsContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn('w-full', className)}
          {...props}
        >
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = 'Tabs';

/**
 * TabsList 标签列表组件
 * @param props - 组件属性
 * @returns React 组件
 */
const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
TabsList.displayName = 'TabsList';

/**
 * TabsTrigger 标签触发器组件
 * @param props - 组件属性
 * @returns React 组件
 */
const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, className, children, disabled, ...props }, ref) => {
    const { value: currentValue, onValueChange } = useTabsContext();
    const isActive = currentValue === value;

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          isActive
            ? 'bg-white text-gray-950 shadow-sm'
            : 'text-gray-600 hover:text-gray-900',
          className
        )}
        onClick={() => onValueChange(value)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

/**
 * TabsContent 标签内容组件
 * @param props - 组件属性
 * @returns React 组件
 */
const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, className, children, ...props }, ref) => {
    const { value: currentValue } = useTabsContext();
    const isActive = currentValue === value;

    if (!isActive) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          'mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsContent.displayName = 'TabsContent';

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
};

export type {
  TabsProps,
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps,
};