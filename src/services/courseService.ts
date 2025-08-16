// /src/services/courseService.ts

// TODO: Replace with actual database calls

const fakeCourses = [
  { id: 1, title: "金融科技（FinTech）实战", industry: "金融", difficulty: "中级", description: "掌握金融科技核心技术，从区块链到量化交易。", instructor: "AI讲师 · 张伟", preview_video_url: "/videos/preview_fintech.mp4", full_video_url: "/videos/full_fintech_encrypted.m3u8", price: 899 },
  { id: 2, title: "人工智能驱动的医疗诊断", industry: "医疗", difficulty: "高级", description: "学习如何利用深度学习模型辅助临床决策。", instructor: "AI讲师 · 李娜", preview_video_url: "/videos/preview_medical.mp4", full_video_url: "/videos/full_medical_encrypted.m3u8", price: 1299 },
  { id: 3, title: "K-12在线教育产品设计", industry: "教育", difficulty: "初级", description: "设计符合下一代学习习惯的互动式在线课程。", instructor: "AI讲师 · 王芳", preview_video_url: "/videos/preview_k12.mp4", full_video_url: "/videos/full_k12_encrypted.m3u8", price: 499 },
];

/**
 * Fetches a list of all courses.
 */
export async function getAllCourses() {
  console.log("Fetching all courses");
  // In a real app, this would be a SELECT * FROM courses query
  return fakeCourses;
}

/**
 * Fetches a single course by its ID.
 */
export async function getCourseById(id: string) {
  console.log(`Fetching course with id: ${id}`);
  const courseId = parseInt(id, 10);
  // In a real app, this would be a SELECT * FROM courses WHERE id = ? query
  const course = fakeCourses.find(c => c.id === courseId);
  return course || null;
}
