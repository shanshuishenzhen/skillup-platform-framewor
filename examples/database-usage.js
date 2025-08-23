
// Supabase 数据库连接示例
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// 查询监控事件示例
async function getMonitoringEvents() {
  const { data, error } = await supabase
    .from('monitoring_events')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('查询失败:', error);
    return null;
  }
  
  return data;
}

// 插入人脸模板示例
async function insertFaceTemplate(userId, templateData) {
  const { data, error } = await supabase
    .from('face_templates')
    .insert({
      user_id: userId,
      template_data: templateData,
      quality_score: 85.5,
      confidence_score: 92.3
    });
    
  if (error) {
    console.error('插入失败:', error);
    return null;
  }
  
  return data;
}

// 记录学习进度示例
async function updateLearningProgress(userId, courseId, lessonId, progress) {
  const { data, error } = await supabase
    .from('learning_progress_details')
    .upsert({
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      progress_percentage: progress,
      last_accessed_at: new Date().toISOString()
    });
    
  if (error) {
    console.error('更新失败:', error);
    return null;
  }
  
  return data;
}
