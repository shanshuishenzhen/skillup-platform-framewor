/**
 * 管理员操作指南组件
 * 提供详细的管理员功能使用说明和帮助信息
 */

'use client';

import React, { useState } from 'react';
import { 
  BookOpen, 
  Users, 
  Upload, 
  Download, 
  FileText, 
  Video, 
  Music, 
  Image, 
  AlertCircle, 
  CheckCircle, 
  ChevronDown, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';

/**
 * 指南章节接口
 */
interface GuideSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

/**
 * 管理员操作指南组件
 */
export default function AdminGuide() {
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview']);

  /**
   * 切换章节展开状态
   */
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  /**
   * 指南章节数据
   */
  const guideSections: GuideSection[] = [
    {
      id: 'overview',
      title: '管理员功能概览',
      icon: BookOpen,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            SkillUp Platform 管理员系统提供了完整的用户管理和学习资源管理功能。
            作为管理员，您可以批量导入用户、上传学习资料、监控系统状态等。
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Users className="h-5 w-5 text-blue-600 mr-2" />
                <h4 className="font-medium text-blue-800">用户管理</h4>
              </div>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 批量导入用户</li>
                <li>• 用户信息管理</li>
                <li>• 角色权限设置</li>
                <li>• 用户状态监控</li>
              </ul>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Upload className="h-5 w-5 text-green-600 mr-2" />
                <h4 className="font-medium text-green-800">资源管理</h4>
              </div>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• 批量上传学习资料</li>
                <li>• 多媒体文件处理</li>
                <li>• 资源分类管理</li>
                <li>• 存储空间监控</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'user-import',
      title: '用户批量导入指南',
      icon: Users,
      content: (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-yellow-800 mb-2">导入前准备</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 确保您具有管理员或超级管理员权限</li>
                  <li>• 准备符合格式要求的Excel或CSV文件</li>
                  <li>• 检查用户邮箱地址的唯一性</li>
                  <li>• 确认网络连接稳定</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">文件格式要求</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-900">字段名</th>
                    <th className="text-left py-2 font-medium text-gray-900">是否必填</th>
                    <th className="text-left py-2 font-medium text-gray-900">说明</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b border-gray-100">
                    <td className="py-2 font-mono">name</td>
                    <td className="py-2"><span className="text-red-600">必填</span></td>
                    <td className="py-2">用户姓名</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 font-mono">email</td>
                    <td className="py-2"><span className="text-red-600">必填</span></td>
                    <td className="py-2">邮箱地址（唯一标识）</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 font-mono">phone</td>
                    <td className="py-2"><span className="text-red-600">必填</span></td>
                    <td className="py-2">手机号码</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 font-mono">department</td>
                    <td className="py-2">可选</td>
                    <td className="py-2">所属部门</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 font-mono">position</td>
                    <td className="py-2">可选</td>
                    <td className="py-2">职位</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 font-mono">employee_id</td>
                    <td className="py-2">可选</td>
                    <td className="py-2">员工编号</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 font-mono">role</td>
                    <td className="py-2">可选</td>
                    <td className="py-2">用户角色（user/admin/super_admin）</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 font-mono">password</td>
                    <td className="py-2">可选</td>
                    <td className="py-2">初始密码（留空则自动生成）</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono">status</td>
                    <td className="py-2">可选</td>
                    <td className="py-2">账户状态（active/inactive）</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">导入步骤</h4>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">1</div>
                <div>
                  <p className="font-medium text-gray-900">下载模板文件</p>
                  <p className="text-sm text-gray-600">点击"下载模板"按钮获取标准格式的CSV模板文件</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">2</div>
                <div>
                  <p className="font-medium text-gray-900">填写用户数据</p>
                  <p className="text-sm text-gray-600">按照模板格式填写用户信息，确保必填字段完整</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">3</div>
                <div>
                  <p className="font-medium text-gray-900">上传文件</p>
                  <p className="text-sm text-gray-600">选择填写好的Excel或CSV文件进行上传</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">4</div>
                <div>
                  <p className="font-medium text-gray-900">开始导入</p>
                  <p className="text-sm text-gray-600">点击"开始导入"按钮，系统将自动处理用户数据</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">5</div>
                <div>
                  <p className="font-medium text-gray-900">查看结果</p>
                  <p className="text-sm text-gray-600">导入完成后查看成功和失败的统计信息</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'resource-upload',
      title: '学习资源上传指南',
      icon: Upload,
      content: (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-green-800 mb-2">支持的文件类型</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center mb-2">
                      <Video className="h-4 w-4 text-purple-600 mr-2" />
                      <span className="font-medium text-green-700">视频文件</span>
                    </div>
                    <p className="text-sm text-green-600 ml-6">
                      .mp4, .avi, .mov, .wmv, .flv, .webm<br />
                      最大 500MB
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <Music className="h-4 w-4 text-green-600 mr-2" />
                      <span className="font-medium text-green-700">音频文件</span>
                    </div>
                    <p className="text-sm text-green-600 ml-6">
                      .mp3, .wav, .aac, .flac, .ogg<br />
                      最大 100MB
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <FileText className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="font-medium text-green-700">文档文件</span>
                    </div>
                    <p className="text-sm text-green-600 ml-6">
                      .pdf, .doc, .docx, .ppt, .pptx, .xls, .xlsx, .txt<br />
                      最大 50MB
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <Image className="h-4 w-4 text-orange-600 mr-2" />
                      <span className="font-medium text-green-700">图片文件</span>
                    </div>
                    <p className="text-sm text-green-600 ml-6">
                      .jpg, .jpeg, .png, .gif, .bmp, .webp, .svg<br />
                      最大 10MB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">上传步骤</h4>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">1</div>
                <div>
                  <p className="font-medium text-gray-900">选择文件</p>
                  <p className="text-sm text-gray-600">点击"选择文件"按钮，可同时选择多个不同类型的文件</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">2</div>
                <div>
                  <p className="font-medium text-gray-900">填写文件信息</p>
                  <p className="text-sm text-gray-600">为每个文件填写标题、分类和描述信息</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">3</div>
                <div>
                  <p className="font-medium text-gray-900">检查文件状态</p>
                  <p className="text-sm text-gray-600">确认所有文件通过验证，没有错误提示</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">4</div>
                <div>
                  <p className="font-medium text-gray-900">开始上传</p>
                  <p className="text-sm text-gray-600">点击"开始上传"按钮，系统将并发处理多个文件</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">5</div>
                <div>
                  <p className="font-medium text-gray-900">监控进度</p>
                  <p className="text-sm text-gray-600">实时查看每个文件的上传进度和状态</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-800 mb-2">上传注意事项</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 标题和分类为必填字段，请确保填写完整</li>
                  <li>• 大文件上传可能需要较长时间，请保持网络稳定</li>
                  <li>• 系统支持断点续传，网络中断后可重新上传</li>
                  <li>• 视频文件上传后会自动进行格式转换和压缩</li>
                  <li>• 建议在网络较好的环境下进行批量上传</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: '常见问题解决',
      icon: AlertCircle,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-4">用户导入问题</h4>
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Q: 导入时提示"权限不足"</h5>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>原因：</strong> 当前用户没有管理员权限
                </p>
                <p className="text-sm text-gray-600">
                  <strong>解决方案：</strong> 请联系超级管理员为您分配admin或super_admin角色
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Q: 部分用户导入失败</h5>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>原因：</strong> 邮箱重复、必填字段缺失或格式错误
                </p>
                <p className="text-sm text-gray-600">
                  <strong>解决方案：</strong> 查看错误详情，修正数据后重新导入失败的用户
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Q: 文件格式不支持</h5>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>原因：</strong> 文件不是Excel或CSV格式
                </p>
                <p className="text-sm text-gray-600">
                  <strong>解决方案：</strong> 使用Excel另存为.xlsx或.csv格式，或下载标准模板
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-4">文件上传问题</h4>
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Q: 文件上传失败</h5>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>原因：</strong> 网络不稳定、文件过大或服务器繁忙
                </p>
                <p className="text-sm text-gray-600">
                  <strong>解决方案：</strong> 检查网络连接，减小文件大小或稍后重试
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Q: 视频文件处理时间过长</h5>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>原因：</strong> 大视频文件需要转码和压缩处理
                </p>
                <p className="text-sm text-gray-600">
                  <strong>解决方案：</strong> 耐心等待处理完成，或使用较小的视频文件
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Q: 存储空间不足</h5>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>原因：</strong> 系统存储空间已满
                </p>
                <p className="text-sm text-gray-600">
                  <strong>解决方案：</strong> 联系系统管理员清理存储空间或扩容
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-yellow-800 mb-2">获取技术支持</h4>
                <p className="text-sm text-yellow-700 mb-2">
                  如果遇到无法解决的问题，请联系技术支持团队：
                </p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 邮箱：support@skillup-platform.com</li>
                  <li>• 电话：400-123-4567</li>
                  <li>• 在线客服：工作日 9:00-18:00</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'api-reference',
      title: 'API 接口参考',
      icon: ExternalLink,
      content: (
        <div className="space-y-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-4">
              以下是管理员功能相关的API接口信息，供开发人员参考：
            </p>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">用户批量导入</h4>
                <div className="bg-white rounded border p-3">
                  <p className="text-sm font-mono text-gray-800 mb-1">POST /api/admin/users/import</p>
                  <p className="text-xs text-gray-600 mb-2">Content-Type: multipart/form-data</p>
                  <p className="text-xs text-gray-600">需要管理员权限认证</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">学习资源上传</h4>
                <div className="bg-white rounded border p-3">
                  <p className="text-sm font-mono text-gray-800 mb-1">POST /api/admin/resources/upload</p>
                  <p className="text-xs text-gray-600 mb-2">Content-Type: multipart/form-data</p>
                  <p className="text-xs text-gray-600">需要管理员权限认证</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">权限检查</h4>
                <div className="bg-white rounded border p-3">
                  <p className="text-sm font-mono text-gray-800 mb-1">GET /api/admin/check-permission</p>
                  <p className="text-xs text-gray-600 mb-2">Content-Type: application/json</p>
                  <p className="text-xs text-gray-600">验证当前用户管理员权限</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-800 mb-2">相关文档</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <a href="/docs/admin-manual.md" className="underline hover:text-blue-800">管理员操作手册</a></li>
                  <li>• <a href="/docs/admin-quick-reference.md" className="underline hover:text-blue-800">快速参考指南</a></li>
                  <li>• <a href="/docs/admin-training-script.md" className="underline hover:text-blue-800">培训脚本</a></li>
                  <li>• <a href="/templates/user-import-template.csv" className="underline hover:text-blue-800">用户导入模板</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <BookOpen className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">管理员操作指南</h2>
        </div>
        <p className="text-gray-600">
          详细的管理员功能使用说明，帮助您快速掌握系统操作方法。
        </p>
      </div>

      {/* 指南章节 */}
      <div className="space-y-4">
        {guideSections.map((section) => {
          const isExpanded = expandedSections.includes(section.id);
          const IconComponent = section.icon;
          
          return (
            <div key={section.id} className="bg-white rounded-lg shadow">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <IconComponent className="h-5 w-5 text-blue-600 mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="pt-4">
                    {section.content}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}