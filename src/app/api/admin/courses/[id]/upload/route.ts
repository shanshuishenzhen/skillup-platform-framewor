import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, createRBACErrorResponse } from '@/middleware/rbac';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';
import { uploadFile, FileType, CloudStorageError } from '@/services/cloudStorageService';

// Define the parameter types for the route
interface UploadParams {
  id: string;
}

/**
 * 文件上传验证模式
 */
const FileUploadSchema = z.object({
  type: z.enum(['video', 'material', 'preview'], {
    errorMap: () => ({ message: '文件类型必须是 video、material 或 preview' })
  }),
  description: z.string().optional()
});

/**
 * 文件类型映射
 */
const FILE_TYPE_MAPPING: Record<string, FileType> = {
  video: FileType.VIDEO,
  material: FileType.MATERIAL,
  preview: FileType.PREVIEW
};



/**
 * API Route for uploading a file (video, materials) for a specific course.
 * Accessible only by users with the 'ADMIN' role.
 * Expects a `multipart/form-data` request.
 *
 * @param req The incoming Next.js request.
 * @param context The route context containing params
 * @returns A Next.js response.
 */
export async function POST(req: NextRequest, context: { params: Promise<UploadParams> }) {
  try {
    const params = await context.params;
    const courseId = params.id;
    
    // 验证管理员权限
    const rbacResult = await verifyAdminAccess(req, { checkDBRole: true });
    if (!rbacResult.success) {
      return createRBACErrorResponse(rbacResult.message || '权限验证失败', 403);
    }

    // 验证课程是否存在
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({
        success: false,
        message: '课程不存在'
      }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const fileType = formData.get('type') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({
        success: false,
        message: '请求体中必须包含 "file" 字段'
      }, { status: 400 });
    }

    // 验证文件类型参数
    let validatedData;
    try {
      validatedData = FileUploadSchema.parse({
        type: fileType,
        description: description || undefined
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
        return NextResponse.json({
          success: false,
          message: '参数验证失败',
          errors: errorMessages
        }, { status: 400 });
      }
      throw error;
    }

    console.log(`接收到课程 ${courseId} 的文件上传请求`);
    console.log(`文件名: ${file.name}, 大小: ${file.size}, 类型: ${validatedData.type}`);

    // 上传文件到云存储
     let uploadResult;
     try {
       const fileType = FILE_TYPE_MAPPING[validatedData.type];
       const customPath = `courses/${courseId}`;
       
       uploadResult = await uploadFile(file, fileType, {
         customPath,
         metadata: {
           courseId,
           uploadedBy: rbacResult.user?.userId || 'unknown',
           description: validatedData.description || ''
         }
       });
       
       if (!uploadResult.success) {
         return NextResponse.json({
           success: false,
           message: uploadResult.message || '文件上传失败'
         }, { status: 400 });
       }
     } catch (error) {
       console.error('文件上传过程中发生错误:', error);
       
       if (error instanceof CloudStorageError) {
         return NextResponse.json({
           success: false,
           message: error.message,
           code: error.code
         }, { status: error.statusCode || 500 });
       }
       
       return NextResponse.json({
         success: false,
         message: '文件上传服务异常，请稍后重试'
       }, { status: 500 });
     }

    // 更新数据库中的课程记录
    const updateData: {
      updated_at: string;
      full_video_url?: string;
      preview_video_url?: string;
      materials_url?: string;
    } = {
      updated_at: new Date().toISOString()
    };

    // 根据文件类型更新相应字段
    switch (validatedData.type) {
      case 'video':
        updateData.full_video_url = uploadResult.url;
        break;
      case 'preview':
        updateData.preview_video_url = uploadResult.url;
        break;
      case 'material':
        updateData.materials_url = uploadResult.url;
        break;
    }

    const { error: updateError } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', courseId);

    if (updateError) {
      console.error('数据库更新失败:', updateError);
      return NextResponse.json({
        success: false,
        message: '文件上传成功，但数据库更新失败',
        error: updateError.message
      }, { status: 500 });
    }

    // 记录文件上传日志
     const { error: logError } = await supabase
       .from('file_uploads')
       .insert({
         course_id: courseId,
         file_name: file.name,
         file_size: file.size,
         file_type: validatedData.type,
         file_url: uploadResult.url,
         file_key: uploadResult.key, // 云存储中的文件标识
         content_type: uploadResult.contentType,
         uploaded_by: rbacResult.user?.userId,
         description: validatedData.description,
         created_at: new Date().toISOString()
       });
       
     if (logError) {
       console.warn('文件上传日志记录失败:', logError);
       // 不影响主流程，仅记录警告
     }

    console.log(`文件上传成功: ${uploadResult.url}`);

    return NextResponse.json({
      success: true,
      message: '文件上传成功',
      data: {
         url: uploadResult.url,
         key: uploadResult.key,
         fileType: validatedData.type,
         fileName: file.name,
         fileSize: file.size,
         contentType: uploadResult.contentType,
         courseId: courseId,
         uploadedAt: new Date().toISOString()
       }
    }, { status: 200 });
    
  } catch (error) {
    console.error('文件上传过程中发生错误:', error);
    const errorMessage = error instanceof Error ? error.message : '上传失败';
    return NextResponse.json({
      success: false,
      message: '服务器内部错误',
      error: errorMessage
    }, { status: 500 });
  }
}
