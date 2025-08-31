import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, createRBACErrorResponse } from '@/middleware/rbac';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';
import { aiService } from '@/services/aiService';

/**
 * 课程数据验证模式
 */
const CourseCreateSchema = z.object({
  title: z.string().min(1, '课程标题不能为空').max(200, '课程标题不能超过200个字符'),
  description: z.string().min(10, '课程描述至少需要10个字符').max(2000, '课程描述不能超过2000个字符'),
  price: z.number().min(0, '课程价格不能为负数').max(99999, '课程价格不能超过99999'),
  category: z.string().min(1, '课程分类不能为空'),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced'], {
    errorMap: () => ({ message: '难度级别必须是 beginner、intermediate 或 advanced' })
  }),
  duration_hours: z.number().min(0.5, '课程时长至少0.5小时').max(1000, '课程时长不能超过1000小时'),
  instructor_name: z.string().min(1, '讲师姓名不能为空').max(100, '讲师姓名不能超过100个字符'),
  tags: z.array(z.string()).optional(),
  is_published: z.boolean().optional().default(false),
  preview_video_url: z.string().url('预览视频URL格式不正确').optional(),
  full_video_url: z.string().url('完整视频URL格式不正确').optional(),
  materials_url: z.string().url('课程资料URL格式不正确').optional(),
  ai_generated: z.boolean().optional().default(false),
  ai_prompt: z.string().optional()
});

/**
 * API Route for creating a new course.
 * Accessible only by users with the 'ADMIN' role.
 *
 * @param req The incoming Next.js request.
 * @returns A Next.js response.
 */
export async function POST(req: NextRequest) {
  try {
    // 验证管理员权限
    const rbacResult = await verifyAdminAccess(req, { checkDBRole: true });
    if (!rbacResult.success) {
      return createRBACErrorResponse(rbacResult.message || '权限验证失败', 403);
    }

    const rawData = await req.json();
    
    // 验证请求数据
    let validatedData;
    try {
      validatedData = CourseCreateSchema.parse(rawData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
        return NextResponse.json({
          success: false,
          message: '数据验证失败',
          errors: errorMessages
        }, { status: 400 });
      }
      throw error;
    }

    // 如果是AI生成的课程，使用AI服务生成内容
    let courseData = validatedData;
    if (validatedData.ai_generated && validatedData.ai_prompt) {
      try {
        console.log('使用AI生成课程内容...');
        const aiGeneratedCourse = await aiService.generateCourse(
          validatedData.ai_prompt,
          validatedData.difficulty_level,
          `分类: ${validatedData.category}, 时长: ${validatedData.duration_hours}小时`
        );
        
        // 合并AI生成的内容和用户提供的数据
        courseData = {
          ...validatedData,
          title: aiGeneratedCourse.title || validatedData.title,
          description: aiGeneratedCourse.description || validatedData.description,
          instructor_name: validatedData.instructor_name, // 保持用户指定的讲师
          tags: aiGeneratedCourse.tags || validatedData.tags
        };
      } catch (aiError) {
        console.warn('AI生成课程失败，使用原始数据:', aiError);
        // 如果AI生成失败，继续使用原始数据
      }
    }

    // 保存课程到数据库
    const { data: newCourse, error: dbError } = await supabase
      .from('courses')
      .insert({
        ...courseData,
        created_by: rbacResult.user?.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('数据库保存失败:', dbError);
      return NextResponse.json({
        success: false,
        message: '课程创建失败',
        error: dbError.message
      }, { status: 500 });
    }

    console.log('课程创建成功:', newCourse.id);
    
    return NextResponse.json({
      success: true,
      message: '课程创建成功',
      course: newCourse
    }, { status: 201 });
    
  } catch (error) {
    console.error('创建课程过程中发生错误:', error);
    const errorMessage = error instanceof Error ? error.message : '创建课程失败';
    return NextResponse.json({
      success: false,
      message: '服务器内部错误',
      error: errorMessage
    }, { status: 500 });
  }
}
