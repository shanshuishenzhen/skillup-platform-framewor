'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Sheet 组件接口定义
 */
interface SheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

interface SheetTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
  onClick?: () => void;
}

interface SheetContentProps {
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  onClose?: () => void;
}

interface SheetHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface SheetTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface SheetDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Sheet 上下文
 */
interface SheetContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextType | null>(null);

/**
 * Sheet 主组件
 * 
 * 用于创建侧边抽屉或模态面板
 * 
 * @example
 * <Sheet open={isOpen} onOpenChange={setIsOpen}>
 *   <SheetTrigger>打开抽屉</SheetTrigger>
 *   <SheetContent>
 *     <SheetHeader>
 *       <SheetTitle>标题</SheetTitle>
 *       <SheetDescription>描述</SheetDescription>
 *     </SheetHeader>
 *     内容
 *   </SheetContent>
 * </Sheet>
 */
export function Sheet({ children, open = false, onOpenChange, className = '' }: SheetProps) {
  const [isOpen, setIsOpen] = React.useState(open);

  React.useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  }, [onOpenChange]);

  const contextValue: SheetContextType = {
    open: isOpen,
    onOpenChange: handleOpenChange,
  };

  return (
    <SheetContext.Provider value={contextValue}>
      <div className={className}>
        {children}
      </div>
    </SheetContext.Provider>
  );
}

/**
 * SheetTrigger 触发器组件
 * 
 * 用于触发 Sheet 的打开
 */
export function SheetTrigger({
  children,
  asChild = false,
  className = '',
  onClick
}: SheetTriggerProps) {
  const context = React.useContext(SheetContext);
  
  if (!context) {
    throw new Error('SheetTrigger must be used within Sheet');
  }

  const handleClick = () => {
    context.onOpenChange(true);
    onClick?.();
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...children.props,
      onClick: handleClick,
      className: cn(children.props.className, className)
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        'h-10 px-4 py-2',
        className
      )}
    >
      {children}
    </button>
  );
}

/**
 * SheetContent 内容组件
 * 
 * Sheet 的主要内容区域
 */
export function SheetContent({
  children,
  side = 'right',
  className = '',
  onClose
}: SheetContentProps) {
  const context = React.useContext(SheetContext);
  
  if (!context) {
    throw new Error('SheetContent must be used within Sheet');
  }

  const { open, onOpenChange } = context;

  const handleClose = () => {
    onOpenChange(false);
    onClose?.();
  };

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  const sideClasses = {
    top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
    bottom: 'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
    left: 'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
    right: 'inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm'
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Content */}
      <div
        className={cn(
          'fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:duration-300 data-[state=open]:duration-500',
          sideClasses[side],
          className
        )}
        data-state={open ? 'open' : 'closed'}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
          >
            <path
              d="m11.7816 4.03157c.0824-.08241.0824-.21569 0-.2981-.0824-.08241-.2157-.08241-.2981 0L7.50002 7.70792 3.51852 3.73307c-.08241-.08241-.21569-.08241-.2981 0-.08241.08241-.08241.21569 0 .2981L7.20192 7.99997 3.22002 11.9819c-.08241.0824-.08241.2157 0 .2981.08241.0824.21569.0824.2981 0L7.50002 8.29202l3.98152 3.98148c.0824.0824.2157.0824.2981 0 .0824-.0824.0824-.2157 0-.2981L7.79812 7.99997l3.98148-3.9784z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
          <span className="sr-only">关闭</span>
        </button>
        
        {children}
      </div>
    </>
  );
}

/**
 * SheetHeader 头部组件
 * 
 * 用于 Sheet 的头部区域
 */
export function SheetHeader({ children, className = '' }: SheetHeaderProps) {
  return (
    <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)}>
      {children}
    </div>
  );
}

/**
 * SheetTitle 标题组件
 * 
 * Sheet 的标题
 */
export function SheetTitle({ children, className = '' }: SheetTitleProps) {
  return (
    <h2 className={cn('text-lg font-semibold text-foreground', className)}>
      {children}
    </h2>
  );
}

/**
 * SheetDescription 描述组件
 * 
 * Sheet 的描述文本
 */
export function SheetDescription({ children, className = '' }: SheetDescriptionProps) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  );
}

export default Sheet;