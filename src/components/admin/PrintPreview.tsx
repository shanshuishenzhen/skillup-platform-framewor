import React, { useState, useRef, useEffect } from 'react';
import { Printer, X, Settings, Download } from 'lucide-react';
import { toast } from 'sonner';

/**
 * 打印设置接口
 */
interface PrintSettings {
  /** 页面方向 */
  orientation: 'portrait' | 'landscape';
  /** 纸张大小 */
  paperSize: 'A4' | 'A3' | 'Letter' | 'Legal';
  /** 边距设置 */
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** 缩放比例 */
  scale: number;
  /** 是否包含页眉 */
  includeHeader: boolean;
  /** 是否包含页脚 */
  includeFooter: boolean;
  /** 页眉文本 */
  headerText: string;
  /** 页脚文本 */
  footerText: string;
  /** 是否显示页码 */
  showPageNumbers: boolean;
}

/**
 * 打印预览组件属性
 */
interface PrintPreviewProps {
  /** 是否显示预览 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 要打印的内容元素引用 */
  contentRef: React.RefObject<HTMLElement>;
  /** 文档标题 */
  title?: string;
}

/**
 * 纸张尺寸配置（毫米）
 */
const PAPER_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
  Legal: { width: 216, height: 356 }
};

/**
 * 打印预览组件
 * 提供组织架构图表的打印预览和设置功能
 * 
 * @param props - 组件属性
 * @returns 打印预览组件
 */
const PrintPreview: React.FC<PrintPreviewProps> = ({
  isOpen,
  onClose,
  contentRef,
  title = '组织架构图'
}) => {
  const [settings, setSettings] = useState<PrintSettings>({
    orientation: 'landscape',
    paperSize: 'A4',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    scale: 1,
    includeHeader: true,
    includeFooter: true,
    headerText: title,
    footerText: `打印时间: ${new Date().toLocaleString()}`,
    showPageNumbers: true
  });

  const [showSettings, setShowSettings] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewContent, setPreviewContent] = useState<string>('');

  /**
   * 生成打印预览内容
   */
  const generatePreviewContent = () => {
    if (!contentRef.current) return;

    const content = contentRef.current.cloneNode(true) as HTMLElement;
    
    // 移除不需要打印的元素
    const toolbars = content.querySelectorAll('.toolbar, .controls, .settings-panel');
    toolbars.forEach(el => el.remove());

    // 应用打印样式
    const printStyles = `
      <style>
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }
          
          .print-container {
            width: 100%;
            height: 100%;
            padding: ${settings.margins.top}mm ${settings.margins.right}mm ${settings.margins.bottom}mm ${settings.margins.left}mm;
            box-sizing: border-box;
          }
          
          .print-header {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          
          .print-footer {
            position: fixed;
            bottom: ${settings.margins.bottom}mm;
            left: ${settings.margins.left}mm;
            right: ${settings.margins.right}mm;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 10px;
          }
          
          .print-content {
            transform: scale(${settings.scale});
            transform-origin: top left;
            width: ${100 / settings.scale}%;
          }
          
          svg {
            max-width: 100%;
            height: auto;
          }
          
          @page {
            size: ${settings.paperSize} ${settings.orientation};
            margin: 0;
          }
        }
      </style>
    `;

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          ${printStyles}
        </head>
        <body>
          <div class="print-container">
            ${settings.includeHeader ? `<div class="print-header">${settings.headerText}</div>` : ''}
            <div class="print-content">
              ${content.outerHTML}
            </div>
            ${settings.includeFooter ? `<div class="print-footer">${settings.footerText}${settings.showPageNumbers ? ' - 第 <span class="page-number"></span> 页' : ''}</div>` : ''}
          </div>
        </body>
      </html>
    `;

    setPreviewContent(printHtml);
  };

  /**
   * 执行打印
   */
  const handlePrint = () => {
    if (!previewContent) {
      toast.error('预览内容为空');
      return;
    }

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('无法打开打印窗口，请检查浏览器设置');
        return;
      }

      printWindow.document.write(previewContent);
      printWindow.document.close();
      
      // 等待内容加载完成后打印
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
      
      toast.success('打印任务已发送');
    } catch (error) {
      console.error('打印失败:', error);
      toast.error('打印失败');
    }
  };

  /**
   * 导出为PDF
   */
  const handleExportPDF = () => {
    if (!previewContent) {
      toast.error('预览内容为空');
      return;
    }

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('无法打开窗口');
        return;
      }

      printWindow.document.write(previewContent);
      printWindow.document.close();
      
      // 提示用户使用浏览器的打印功能保存为PDF
      printWindow.onload = () => {
        toast.info('请在打印对话框中选择"另存为PDF"');
        printWindow.print();
      };
    } catch (error) {
      console.error('导出PDF失败:', error);
      toast.error('导出PDF失败');
    }
  };

  /**
   * 更新设置
   */
  const updateSettings = (key: keyof PrintSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  /**
   * 更新边距设置
   */
  const updateMargins = (side: keyof PrintSettings['margins'], value: number) => {
    setSettings(prev => ({
      ...prev,
      margins: { ...prev.margins, [side]: value }
    }));
  };

  // 当设置或内容变化时重新生成预览
  useEffect(() => {
    if (isOpen && contentRef.current) {
      generatePreviewContent();
    }
  }, [isOpen, settings, contentRef]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">打印预览</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title="打印设置"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleExportPDF}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title="导出PDF"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>打印</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 设置面板 */}
          {showSettings && (
            <div className="w-80 border-r border-gray-200 p-4 overflow-y-auto">
              <h3 className="text-md font-medium text-gray-900 mb-4">打印设置</h3>
              
              {/* 页面设置 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">页面方向</label>
                  <select
                    value={settings.orientation}
                    onChange={(e) => updateSettings('orientation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="portrait">纵向</option>
                    <option value="landscape">横向</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">纸张大小</label>
                  <select
                    value={settings.paperSize}
                    onChange={(e) => updateSettings('paperSize', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="Letter">Letter</option>
                    <option value="Legal">Legal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">缩放比例</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={settings.scale}
                    onChange={(e) => updateSettings('scale', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-600 text-center">{Math.round(settings.scale * 100)}%</div>
                </div>

                {/* 边距设置 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">边距 (mm)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600">上</label>
                      <input
                        type="number"
                        value={settings.margins.top}
                        onChange={(e) => updateMargins('top', parseInt(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">右</label>
                      <input
                        type="number"
                        value={settings.margins.right}
                        onChange={(e) => updateMargins('right', parseInt(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">下</label>
                      <input
                        type="number"
                        value={settings.margins.bottom}
                        onChange={(e) => updateMargins('bottom', parseInt(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">左</label>
                      <input
                        type="number"
                        value={settings.margins.left}
                        onChange={(e) => updateMargins('left', parseInt(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 页眉页脚设置 */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeHeader"
                      checked={settings.includeHeader}
                      onChange={(e) => updateSettings('includeHeader', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="includeHeader" className="text-sm text-gray-700">包含页眉</label>
                  </div>
                  
                  {settings.includeHeader && (
                    <input
                      type="text"
                      value={settings.headerText}
                      onChange={(e) => updateSettings('headerText', e.target.value)}
                      placeholder="页眉文本"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeFooter"
                      checked={settings.includeFooter}
                      onChange={(e) => updateSettings('includeFooter', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="includeFooter" className="text-sm text-gray-700">包含页脚</label>
                  </div>
                  
                  {settings.includeFooter && (
                    <input
                      type="text"
                      value={settings.footerText}
                      onChange={(e) => updateSettings('footerText', e.target.value)}
                      placeholder="页脚文本"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="showPageNumbers"
                      checked={settings.showPageNumbers}
                      onChange={(e) => updateSettings('showPageNumbers', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="showPageNumbers" className="text-sm text-gray-700">显示页码</label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 预览区域 */}
          <div className="flex-1 p-4 overflow-auto bg-gray-100">
            <div className="bg-white shadow-lg mx-auto" style={{
              width: settings.orientation === 'portrait' 
                ? `${PAPER_SIZES[settings.paperSize].width}mm`
                : `${PAPER_SIZES[settings.paperSize].height}mm`,
              minHeight: settings.orientation === 'portrait'
                ? `${PAPER_SIZES[settings.paperSize].height}mm`
                : `${PAPER_SIZES[settings.paperSize].width}mm`
            }}>
              {previewContent && (
                <iframe
                  ref={previewRef}
                  srcDoc={previewContent}
                  className="w-full h-full border-0"
                  style={{ minHeight: '800px' }}
                  title="打印预览"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintPreview;