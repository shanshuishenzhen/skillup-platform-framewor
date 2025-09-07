import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, FileImage, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';

/**
 * 导出格式类型
 */
export type ExportFormat = 'png' | 'svg' | 'pdf' | 'print';

/**
 * 导出选项接口
 */
interface ExportOptions {
  /** 导出文件名 */
  filename?: string;
  /** 图片质量 (0-1) */
  quality?: number;
  /** 图片宽度 */
  width?: number;
  /** 图片高度 */
  height?: number;
  /** 是否包含背景 */
  includeBackground?: boolean;
}

/**
 * 导出工具类
 * 提供组织架构图表的多种格式导出功能
 */
export class ChartExporter {
  /**
   * 导出为PNG格式
   * @param element - 要导出的DOM元素
   * @param options - 导出选项
   */
  static async exportToPNG(element: HTMLElement, options: ExportOptions = {}): Promise<void> {
    try {
      const {
        filename = 'org-chart',
        quality = 1,
        includeBackground = true
      } = options;

      const canvas = await html2canvas(element, {
        backgroundColor: includeBackground ? '#ffffff' : null,
        scale: 2, // 提高分辨率
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      // 创建下载链接
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png', quality);
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('PNG文件导出成功');
    } catch (error) {
      console.error('PNG导出失败:', error);
      toast.error('PNG导出失败，请重试');
    }
  }

  /**
   * 导出为SVG格式
   * @param svgElement - SVG元素
   * @param options - 导出选项
   */
  static async exportToSVG(svgElement: SVGElement, options: ExportOptions = {}): Promise<void> {
    try {
      const { filename = 'org-chart' } = options;

      // 克隆SVG元素
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // 设置SVG属性
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      
      // 获取SVG的边界框
      const bbox = svgElement.getBBox();
      clonedSvg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
      clonedSvg.setAttribute('width', bbox.width.toString());
      clonedSvg.setAttribute('height', bbox.height.toString());

      // 序列化SVG
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);
      
      // 创建Blob和下载链接
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = `${filename}.svg`;
      link.href = url;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理URL
      URL.revokeObjectURL(url);

      toast.success('SVG文件导出成功');
    } catch (error) {
      console.error('SVG导出失败:', error);
      toast.error('SVG导出失败，请重试');
    }
  }

  /**
   * 导出为PDF格式
   * @param element - 要导出的DOM元素
   * @param options - 导出选项
   */
  static async exportToPDF(element: HTMLElement, options: ExportOptions = {}): Promise<void> {
    try {
      const {
        filename = 'org-chart',
        includeBackground = true
      } = options;

      // 生成canvas
      const canvas = await html2canvas(element, {
        backgroundColor: includeBackground ? '#ffffff' : null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      
      // 计算PDF尺寸
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // A4纸张尺寸 (mm)
      const a4Width = 210;
      const a4Height = 297;
      
      // 计算缩放比例
      const ratio = Math.min(a4Width / (imgWidth * 0.264583), a4Height / (imgHeight * 0.264583));
      const scaledWidth = imgWidth * 0.264583 * ratio;
      const scaledHeight = imgHeight * 0.264583 * ratio;
      
      // 创建PDF
      const pdf = new jsPDF({
        orientation: scaledWidth > scaledHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // 居中放置图片
      const x = (pdf.internal.pageSize.getWidth() - scaledWidth) / 2;
      const y = (pdf.internal.pageSize.getHeight() - scaledHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
      
      // 保存PDF
      pdf.save(`${filename}.pdf`);

      toast.success('PDF文件导出成功');
    } catch (error) {
      console.error('PDF导出失败:', error);
      toast.error('PDF导出失败，请重试');
    }
  }

  /**
   * 打印预览
   * @param element - 要打印的DOM元素
   * @param options - 打印选项
   */
  static async printChart(element: HTMLElement, options: ExportOptions = {}): Promise<void> {
    try {
      const { includeBackground = true } = options;

      // 生成canvas
      const canvas = await html2canvas(element, {
        backgroundColor: includeBackground ? '#ffffff' : null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      
      // 创建新窗口进行打印
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('无法打开打印窗口');
      }
      
      printWindow.document.write(`
        <html>
          <head>
            <title>组织架构图</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
              }
              @media print {
                body {
                  padding: 0;
                }
                img {
                  width: 100%;
                  height: auto;
                }
              }
            </style>
          </head>
          <body>
            <img src="${imgData}" alt="组织架构图" />
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // 等待图片加载完成后打印
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };

      toast.success('打印预览已打开');
    } catch (error) {
      console.error('打印失败:', error);
      toast.error('打印失败，请重试');
    }
  }
}

/**
 * 导出按钮组件属性接口
 */
interface ExportButtonsProps {
  /** 要导出的元素引用 */
  elementRef: React.RefObject<HTMLElement>;
  /** SVG元素引用 */
  svgRef?: React.RefObject<SVGElement>;
  /** 导出文件名前缀 */
  filename?: string;
  /** 是否显示为下拉菜单 */
  dropdown?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 导出按钮组件
 * 提供多种格式的导出按钮
 */
export const ExportButtons: React.FC<ExportButtonsProps> = ({
  elementRef,
  svgRef,
  filename = 'org-chart',
  dropdown = true,
  className = ''
}) => {
  const [showDropdown, setShowDropdown] = React.useState(false);

  /**
   * 处理导出操作
   * @param format - 导出格式
   */
  const handleExport = async (format: ExportFormat) => {
    if (!elementRef.current) {
      toast.error('无法获取图表元素');
      return;
    }

    const options: ExportOptions = {
      filename,
      quality: 1,
      includeBackground: true
    };

    switch (format) {
      case 'png':
        await ChartExporter.exportToPNG(elementRef.current, options);
        break;
      case 'svg':
        if (svgRef?.current) {
          await ChartExporter.exportToSVG(svgRef.current, options);
        } else {
          toast.error('SVG元素不可用');
        }
        break;
      case 'pdf':
        await ChartExporter.exportToPDF(elementRef.current, options);
        break;
      case 'print':
        await ChartExporter.printChart(elementRef.current, options);
        break;
    }

    setShowDropdown(false);
  };

  if (dropdown) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
          title="导出选项"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm">导出</span>
        </button>
        
        {showDropdown && (
          <>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
              <div className="p-2">
                <button
                  onClick={() => handleExport('png')}
                  className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 rounded text-sm text-left"
                >
                  <FileImage className="w-4 h-4" />
                  <span>导出为 PNG</span>
                </button>
                <button
                  onClick={() => handleExport('svg')}
                  className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 rounded text-sm text-left"
                >
                  <FileImage className="w-4 h-4" />
                  <span>导出为 SVG</span>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 rounded text-sm text-left"
                >
                  <FileText className="w-4 h-4" />
                  <span>导出为 PDF</span>
                </button>
                <hr className="my-2" />
                <button
                  onClick={() => handleExport('print')}
                  className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 rounded text-sm text-left"
                >
                  <Printer className="w-4 h-4" />
                  <span>打印预览</span>
                </button>
              </div>
            </div>
            
            {/* 点击外部关闭下拉菜单 */}
            <div
              className="fixed inset-0 z-0"
              onClick={() => setShowDropdown(false)}
            />
          </>
        )}
      </div>
    );
  }

  // 非下拉菜单模式，显示独立按钮
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={() => handleExport('png')}
        className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
        title="导出PNG"
      >
        <FileImage className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleExport('svg')}
        className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
        title="导出SVG"
      >
        <FileImage className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleExport('pdf')}
        className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
        title="导出PDF"
      >
        <FileText className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleExport('print')}
        className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
        title="打印预览"
      >
        <Printer className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ExportButtons;