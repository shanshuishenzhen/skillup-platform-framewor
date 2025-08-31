'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Table 组件接口定义
 */
interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  className?: string;
}

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  className?: string;
}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  className?: string;
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  className?: string;
}

/**
 * Table 表格主组件
 * @param props - 组件属性
 * @returns React 组件
 * @example
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>姓名</TableHead>
 *       <TableHead>年龄</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>张三</TableCell>
 *       <TableCell>25</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 */
export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn(
          "w-full caption-bottom text-sm border-collapse",
          className
        )}
        {...props}
      />
    </div>
  )
);
Table.displayName = "Table";

/**
 * TableHeader 表格头部组件
 * @param props - 组件属性
 * @returns React 组件
 */
const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn(
        "border-b bg-gray-50/50",
        className
      )}
      {...props}
    />
  )
);
TableHeader.displayName = "TableHeader";

/**
 * TableBody 表格主体组件
 * @param props - 组件属性
 * @returns React 组件
 */
const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn(
        "[&_tr:last-child]:border-0",
        className
      )}
      {...props}
    />
  )
);
TableBody.displayName = "TableBody";

/**
 * TableRow 表格行组件
 * @param props - 组件属性
 * @returns React 组件
 */
const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-gray-50",
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

/**
 * TableHead 表格头单元格组件
 * @param props - 组件属性
 * @returns React 组件
 */
const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
);
TableHead.displayName = "TableHead";

/**
 * TableCell 表格数据单元格组件
 * @param props - 组件属性
 * @returns React 组件
 */
const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "p-4 align-middle [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
);
TableCell.displayName = "TableCell";

/**
 * TableCaption 表格标题组件
 * @param props - 组件属性
 * @returns React 组件
 */
const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      "mt-4 text-sm text-gray-500",
      className
    )}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption
};

export default Table;