'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  Printer,
  FileImage,
  FileText,
  Settings,
  Eye,
  Palette,
  Layout,
  Save,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * 导出格式枚举
 */
type ExportFormat = 'png' | 'svg' | 'pdf' | 'jpeg' | 'webp';

/**
 * 导出配置接口
 */
interface ExportConfig {
  format: ExportFormat;
  quality: number;
  width: number;
  height: number;
  dpi: number;
  backgroundColor: string;
  includeMetadata: boolean;
  includeWatermark: boolean;
  watermarkText: string;
  scale: number;
}

/**
 * 打印配置接口
 */
interface PrintConfig {
  orientation: 'portrait' | 'landscape';
  paperSize: 'A4' | 'A3' | 'Letter' | 'Legal';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  includeHeader: boolean;
  includeFooter: boolean;
  headerText: string;
  footerText: string;
  scale: number;
}

/**
 * 组织架构导出工具组件属性
 */
interface OrganizationExportToolsProps {
  svgRef: React.RefObject<SVGSVGElement>;
  departments: any[];
  title?: string;
  onExportStart?: () => void;
  onExportComplete?: (success: boolean, format: string) => void;
  className?: string;
}

/**
 * 组织架构导出和打印工具组件
 * 
 * 功能特性：
 * - 多格式导出（PNG、SVG、PDF、JPEG、WebP）
 * - 高质量图像生成
 * - 自定义导出配置
 * - 打印预览和配置
 * - 批量导出
 * - 水印和元数据支持
 * 
 * @param svgRef - SVG元素引用
 * @param departments - 部门数据
 * @param title - 图表标题
 * @param onExportStart - 导出开始回调
 * @param onExportComplete - 导出完成回调
 * @param className - 自定义样式类名
 */
export default function OrganizationExportTools({
  svgRef,
  departments,
  title = '组织架构图',
  onExportStart,
  onExportComplete,
  className = ''
}: OrganizationExportToolsProps) {
  // 状态管理
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // 配置状态
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'png',
    quality: 0.9,
    width: 1920,
    height: 1080,
    dpi: 300,
    backgroundColor: '#ffffff',
    includeMetadata: true,
    includeWatermark: false,
    watermarkText: '组织架构图',
    scale: 1
  });
  
  const [printConfig, setPrintConfig] = useState<PrintConfig>({
    orientation: 'landscape',
    paperSize: 'A4',
    margins: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20
    },
    includeHeader: true,
    includeFooter: true,
    headerText: title,
    footerText: `生成时间: ${new Date().toLocaleString()}`,
    scale: 0.8
  });
  
  // 引用
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  /**
   * 获取SVG数据
   */
  const getSVGData = useCallback(() => {
    if (!svgRef.current) {
      throw new Error('SVG元素不存在');
    }
    
    const svgElement = svgRef.current.cloneNode(true) as SVGSVGElement;
    
    // 设置SVG尺寸
    svgElement.setAttribute('width', exportConfig.width.toString());
    svgElement.setAttribute('height', exportConfig.height.toString());
    
    // 添加背景
    if (exportConfig.backgroundColor !== 'transparent') {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '100%');
      rect.setAttribute('height', '100%');
      rect.setAttribute('fill', exportConfig.backgroundColor);
      svgElement.insertBefore(rect, svgElement.firstChild);
    }
    
    // 添加水印
    if (exportConfig.includeWatermark && exportConfig.watermarkText) {
      const watermark = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      watermark.setAttribute('x', '50%');
      watermark.setAttribute('y', '95%');
      watermark.setAttribute('text-anchor', 'middle');
      watermark.setAttribute('fill', '#cccccc');
      watermark.setAttribute('font-size', '12');
      watermark.setAttribute('opacity', '0.5');
      watermark.textContent = exportConfig.watermarkText;
      svgElement.appendChild(watermark);
    }
    
    // 添加元数据
    if (exportConfig.includeMetadata) {
      const metadata = document.createElementNS('http://www.w3.org/2000/svg', 'metadata');
      metadata.innerHTML = `
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                 xmlns:dc="http://purl.org/dc/elements/1.1/">
          <rdf:Description>
            <dc:title>${title}</dc:title>
            <dc:creator>技能提升平台</dc:creator>
            <dc:date>${new Date().toISOString()}</dc:date>
            <dc:description>组织架构图，包含${departments.length}个部门</dc:description>
          </rdf:Description>
        </rdf:RDF>
      `;
      svgElement.appendChild(metadata);
    }
    
    return new XMLSerializer().serializeToString(svgElement);
  }, [svgRef, exportConfig, title, departments.length]);
  
  /**
   * 创建Canvas
   */
  const createCanvas = useCallback(async (svgData: string): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // 设置高DPI支持
      const pixelRatio = window.devicePixelRatio || 1;
      const scaleFactor = (exportConfig.dpi / 96) * pixelRatio * exportConfig.scale;
      
      canvas.width = exportConfig.width * scaleFactor;
      canvas.height = exportConfig.height * scaleFactor;
      canvas.style.width = exportConfig.width + 'px';
      canvas.style.height = exportConfig.height + 'px';
      
      ctx.scale(scaleFactor, scaleFactor);
      
      // 设置背景
      if (exportConfig.backgroundColor !== 'transparent') {
        ctx.fillStyle = exportConfig.backgroundColor;
        ctx.fillRect(0, 0, exportConfig.width, exportConfig.height);
      }
      
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, exportConfig.width, exportConfig.height);
        resolve(canvas);
      };
      img.onerror = reject;
      
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.src = url;
    });
  }, [exportConfig]);
  
  /**
   * 导出为图片
   */
  const exportAsImage = useCallback(async (format: ExportFormat) => {
    try {
      setIsExporting(true);
      onExportStart?.();
      
      const svgData = getSVGData();
      
      if (format === 'svg') {
        // 直接导出SVG
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title}.svg`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // 转换为其他格式
        const canvas = await createCanvas(svgData);
        
        const mimeType = {
          png: 'image/png',
          jpeg: 'image/jpeg',
          webp: 'image/webp'
        }[format] || 'image/png';
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${title}.${format}`;
            link.click();
            URL.revokeObjectURL(url);
          }
        }, mimeType, exportConfig.quality);
      }
      
      toast.success(`${format.toUpperCase()} 格式导出成功`);
      onExportComplete?.(true, format);
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败，请重试');
      onExportComplete?.(false, format);
    } finally {
      setIsExporting(false);
    }
  }, [getSVGData, createCanvas, exportConfig.quality, title, onExportStart, onExportComplete]);
  
  /**
   * 导出为PDF
   */
  const exportAsPDF = useCallback(async () => {
    try {
      setIsExporting(true);
      onExportStart?.();
      
      // 动态导入jsPDF
      const { jsPDF } = await import('jspdf');
      
      const svgData = getSVGData();
      const canvas = await createCanvas(svgData);
      
      const pdf = new jsPDF({
        orientation: printConfig.orientation,
        unit: 'mm',
        format: printConfig.paperSize.toLowerCase() as any
      });
      
      // 获取页面尺寸
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // 计算图片尺寸
      const imgWidth = pageWidth - printConfig.margins.left - printConfig.margins.right;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // 添加标题
      if (printConfig.includeHeader) {
        pdf.setFontSize(16);
        pdf.text(printConfig.headerText, pageWidth / 2, printConfig.margins.top, { align: 'center' });
      }
      
      // 添加图片
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const yPosition = printConfig.includeHeader ? printConfig.margins.top + 10 : printConfig.margins.top;
      
      pdf.addImage(
        imgData,
        'JPEG',
        printConfig.margins.left,
        yPosition,
        imgWidth,
        Math.min(imgHeight, pageHeight - yPosition - printConfig.margins.bottom - 10)
      );
      
      // 添加页脚
      if (printConfig.includeFooter) {
        pdf.setFontSize(10);
        pdf.text(
          printConfig.footerText,
          pageWidth / 2,
          pageHeight - printConfig.margins.bottom,
          { align: 'center' }
        );
      }
      
      pdf.save(`${title}.pdf`);
      
      toast.success('PDF 导出成功');
      onExportComplete?.(true, 'pdf');
    } catch (error) {
      console.error('PDF导出失败:', error);
      toast.error('PDF导出失败，请重试');
      onExportComplete?.(false, 'pdf');
    } finally {
      setIsExporting(false);
    }
  }, [getSVGData, createCanvas, printConfig, title, onExportStart, onExportComplete]);
  
  /**
   * 生成预览
   */
  const generatePreview = useCallback(async () => {
    try {
      const svgData = getSVGData();
      const canvas = await createCanvas(svgData);
      const dataUrl = canvas.toDataURL('image/png', 0.8);
      setPreviewUrl(dataUrl);
    } catch (error) {
      console.error('预览生成失败:', error);
      toast.error('预览生成失败');
    }
  }, [getSVGData, createCanvas]);
  
  /**
   * 打印预览
   */
  const handlePrint = useCallback(() => {
    if (!svgRef.current) return;
    
    const svgData = getSVGData();
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      const styles = `
        <style>
          @page {
            size: ${printConfig.paperSize} ${printConfig.orientation};
            margin: ${printConfig.margins.top}mm ${printConfig.margins.right}mm ${printConfig.margins.bottom}mm ${printConfig.margins.left}mm;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }
          .header {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #666;
            margin-top: 20px;
          }
          .chart-container {
            text-align: center;
          }
          svg {
            max-width: 100%;
            height: auto;
            transform: scale(${printConfig.scale});
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      `;
      
      const content = `
        <html>
          <head>
            <title>${title}</title>
            ${styles}
          </head>
          <body>
            ${printConfig.includeHeader ? `<div class="header">${printConfig.headerText}</div>` : ''}
            <div class="chart-container">
              ${svgData}
            </div>
            ${printConfig.includeFooter ? `<div class="footer">${printConfig.footerText}</div>` : ''}
          </body>
        </html>
      `;
      
      printWindow.document.write(content);
      printWindow.document.close();
      
      // 等待内容加载完成后打印
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  }, [getSVGData, printConfig, title]);
  
  /**
   * 批量导出
   */
  const batchExport = useCallback(async (formats: ExportFormat[]) => {
    setIsExporting(true);
    
    for (const format of formats) {
      try {
        if (format === 'pdf') {
          await exportAsPDF();
        } else {
          await exportAsImage(format);
        }
        // 添加延迟避免浏览器阻塞
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`${format} 导出失败:`, error);
      }
    }
    
    setIsExporting(false);
    toast.success('批量导出完成');
  }, [exportAsImage, exportAsPDF]);
  
  return (
    <div className={`organization-export-tools ${className}`}>
      {/* 快速导出按钮 */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportAsImage('png')}
          disabled={isExporting}
        >
          <FileImage className="w-4 h-4 mr-2" />
          PNG
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportAsPDF()}
          disabled={isExporting}
        >
          <FileText className="w-4 h-4 mr-2" />
          PDF
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          disabled={isExporting}
        >
          <Printer className="w-4 h-4 mr-2" />
          打印
        </Button>
        
        {/* 高级导出对话框 */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              高级导出
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>高级导出设置</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="export" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="export">导出设置</TabsTrigger>
                <TabsTrigger value="print">打印设置</TabsTrigger>
                <TabsTrigger value="preview">预览</TabsTrigger>
              </TabsList>
              
              {/* 导出设置 */}
              <TabsContent value="export" className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>导出格式</Label>
                      <Select
                        value={exportConfig.format}
                        onValueChange={(value: ExportFormat) => 
                          setExportConfig(prev => ({ ...prev, format: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="png">PNG</SelectItem>
                          <SelectItem value="jpeg">JPEG</SelectItem>
                          <SelectItem value="webp">WebP</SelectItem>
                          <SelectItem value="svg">SVG</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>宽度 (px)</Label>
                        <Input
                          type="number"
                          value={exportConfig.width}
                          onChange={(e) => setExportConfig(prev => ({
                            ...prev,
                            width: parseInt(e.target.value) || 1920
                          }))}
                        />
                      </div>
                      <div>
                        <Label>高度 (px)</Label>
                        <Input
                          type="number"
                          value={exportConfig.height}
                          onChange={(e) => setExportConfig(prev => ({
                            ...prev,
                            height: parseInt(e.target.value) || 1080
                          }))}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>DPI</Label>
                      <Select
                        value={exportConfig.dpi.toString()}
                        onValueChange={(value) => 
                          setExportConfig(prev => ({ ...prev, dpi: parseInt(value) }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="72">72 DPI (屏幕)</SelectItem>
                          <SelectItem value="150">150 DPI (普通打印)</SelectItem>
                          <SelectItem value="300">300 DPI (高质量打印)</SelectItem>
                          <SelectItem value="600">600 DPI (专业打印)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>图片质量 ({Math.round(exportConfig.quality * 100)}%)</Label>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={exportConfig.quality}
                        onChange={(e) => setExportConfig(prev => ({
                          ...prev,
                          quality: parseFloat(e.target.value)
                        }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>背景颜色</Label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={exportConfig.backgroundColor}
                          onChange={(e) => setExportConfig(prev => ({
                            ...prev,
                            backgroundColor: e.target.value
                          }))}
                          className="w-12 h-8 rounded border"
                        />
                        <Input
                          value={exportConfig.backgroundColor}
                          onChange={(e) => setExportConfig(prev => ({
                            ...prev,
                            backgroundColor: e.target.value
                          }))}
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={exportConfig.includeMetadata}
                          onCheckedChange={(checked) => setExportConfig(prev => ({
                            ...prev,
                            includeMetadata: checked as boolean
                          }))}
                        />
                        <Label>包含元数据</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={exportConfig.includeWatermark}
                          onCheckedChange={(checked) => setExportConfig(prev => ({
                            ...prev,
                            includeWatermark: checked as boolean
                          }))}
                        />
                        <Label>添加水印</Label>
                      </div>
                      
                      {exportConfig.includeWatermark && (
                        <Input
                          placeholder="水印文字"
                          value={exportConfig.watermarkText}
                          onChange={(e) => setExportConfig(prev => ({
                            ...prev,
                            watermarkText: e.target.value
                          }))}
                        />
                      )}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between">
                  <div className="space-x-2">
                    <Button
                      onClick={() => batchExport(['png', 'svg', 'pdf'])}
                      disabled={isExporting}
                    >
                      批量导出
                    </Button>
                  </div>
                  
                  <div className="space-x-2">
                    <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                      取消
                    </Button>
                    <Button
                      onClick={() => {
                        if (exportConfig.format === 'pdf') {
                          exportAsPDF();
                        } else {
                          exportAsImage(exportConfig.format);
                        }
                        setShowExportDialog(false);
                      }}
                      disabled={isExporting}
                    >
                      {isExporting ? '导出中...' : '导出'}
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              {/* 打印设置 */}
              <TabsContent value="print" className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>纸张方向</Label>
                      <Select
                        value={printConfig.orientation}
                        onValueChange={(value: 'portrait' | 'landscape') => 
                          setPrintConfig(prev => ({ ...prev, orientation: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">纵向</SelectItem>
                          <SelectItem value="landscape">横向</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>纸张大小</Label>
                      <Select
                        value={printConfig.paperSize}
                        onValueChange={(value: any) => 
                          setPrintConfig(prev => ({ ...prev, paperSize: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4">A4</SelectItem>
                          <SelectItem value="A3">A3</SelectItem>
                          <SelectItem value="Letter">Letter</SelectItem>
                          <SelectItem value="Legal">Legal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>缩放比例 ({Math.round(printConfig.scale * 100)}%)</Label>
                      <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={printConfig.scale}
                        onChange={(e) => setPrintConfig(prev => ({
                          ...prev,
                          scale: parseFloat(e.target.value)
                        }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>页边距 (mm)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="上"
                          type="number"
                          value={printConfig.margins.top}
                          onChange={(e) => setPrintConfig(prev => ({
                            ...prev,
                            margins: { ...prev.margins, top: parseInt(e.target.value) || 20 }
                          }))}
                        />
                        <Input
                          placeholder="右"
                          type="number"
                          value={printConfig.margins.right}
                          onChange={(e) => setPrintConfig(prev => ({
                            ...prev,
                            margins: { ...prev.margins, right: parseInt(e.target.value) || 20 }
                          }))}
                        />
                        <Input
                          placeholder="下"
                          type="number"
                          value={printConfig.margins.bottom}
                          onChange={(e) => setPrintConfig(prev => ({
                            ...prev,
                            margins: { ...prev.margins, bottom: parseInt(e.target.value) || 20 }
                          }))}
                        />
                        <Input
                          placeholder="左"
                          type="number"
                          value={printConfig.margins.left}
                          onChange={(e) => setPrintConfig(prev => ({
                            ...prev,
                            margins: { ...prev.margins, left: parseInt(e.target.value) || 20 }
                          }))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={printConfig.includeHeader}
                          onCheckedChange={(checked) => setPrintConfig(prev => ({
                            ...prev,
                            includeHeader: checked as boolean
                          }))}
                        />
                        <Label>包含页眉</Label>
                      </div>
                      
                      {printConfig.includeHeader && (
                        <Input
                          placeholder="页眉文字"
                          value={printConfig.headerText}
                          onChange={(e) => setPrintConfig(prev => ({
                            ...prev,
                            headerText: e.target.value
                          }))}
                        />
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={printConfig.includeFooter}
                          onCheckedChange={(checked) => setPrintConfig(prev => ({
                            ...prev,
                            includeFooter: checked as boolean
                          }))}
                        />
                        <Label>包含页脚</Label>
                      </div>
                      
                      {printConfig.includeFooter && (
                        <Input
                          placeholder="页脚文字"
                          value={printConfig.footerText}
                          onChange={(e) => setPrintConfig(prev => ({
                            ...prev,
                            footerText: e.target.value
                          }))}
                        />
                      )}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={handlePrint}>
                    打印预览
                  </Button>
                </div>
              </TabsContent>
              
              {/* 预览 */}
              <TabsContent value="preview" className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>导出预览</Label>
                  <Button onClick={generatePreview} size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    生成预览
                  </Button>
                </div>
                
                {previewUrl ? (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <img
                      src={previewUrl}
                      alt="导出预览"
                      className="max-w-full h-auto mx-auto"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
                    点击"生成预览"查看导出效果
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* 导出状态指示器 */}
      {isExporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>正在导出，请稍候...</span>
          </div>
        </div>
      )}
    </div>
  );
}