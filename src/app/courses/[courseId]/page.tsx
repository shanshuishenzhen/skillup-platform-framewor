import { Button } from "@/components/ui/button";
import Image from 'next/image';

// This is a placeholder. In a real app, you'd fetch course data based on the courseId.
// The data here should correspond to one of the courses on the homepage.
const fakeCourse = {
  id: 1,
  title: "金融科技（FinTech）实战",
  instructor: "AI讲师 · 张伟",
  description: "这是一个深入探讨金融科技核心技术的综合课程，内容覆盖从区块链、加密货币到量化交易策略、风险管理和监管科技（RegTech）等多个前沿领域。学员将通过真实案例和编程实践，掌握如何构建和应用FinTech解决方案。",
  chapters: [
    { title: "区块链基础与应用", description: "理解分布式账本技术的核心原理。" },
    { title: "量化交易入门", description: "学习使用Python进行基本的算法交易。" },
    { title: "智能投顾算法解析", description: "探索现代财富管理背后的AI技术。" },
    { title: "支付系统与安全", description: "了解全球数字支付网络的工作方式和安全措施。" }
  ],
  price: "¥899",
  imageUrl: "https://placehold.co/1200x400/165DFF/FFFFFF?text=SkillUp+FinTech"
};

/**
 * 课程详情页面组件
 * @param props 页面属性，包含 params
 * @returns 课程详情页面
 */
export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  // In a real app, you would use params.courseId to fetch the correct course data.
  // For now, we just display the fake course data.
  const { courseId } = await params;
  console.log('Course ID:', courseId);
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="relative w-full h-64 md:h-80">
        <Image
          src={fakeCourse.imageUrl}
          alt={fakeCourse.title}
          fill
          style={{ objectFit: 'cover' }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-center text-white p-4">
            <h1 className="text-4xl md:text-5xl font-bold">{fakeCourse.title}</h1>
            <p className="mt-2 text-lg opacity-90">讲师: {fakeCourse.instructor}</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-800">关于本课程</h2>
            <p className="mt-4 text-gray-700 leading-relaxed">{fakeCourse.description}</p>

            <h2 className="text-2xl font-bold text-gray-800 mt-8">课程大纲</h2>
            <div className="mt-4 space-y-4">
              {fakeCourse.chapters.map((chapter, index) => (
                <div key={index} className="bg-light-gray p-4 rounded-lg border">
                  <h3 className="font-bold text-primary">第 {index + 1} 章: {chapter.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{chapter.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white p-6 rounded-lg shadow-md border">
              <h3 className="text-3xl font-bold text-center text-primary">{fakeCourse.price}</h3>
              <p className="text-sm text-gray-500 text-center mt-1">解锁全部课程内容</p>
              <Button className="w-full mt-4" size="lg">立即购买</Button>
              <Button className="w-full mt-2" variant="outline">观看2分钟预览</Button>
              <div className="text-xs text-gray-400 mt-4 text-center space-y-1">
                <p>✓ 支持人脸识别安全登录</p>
                <p>✓ 购买后可永久观看</p>
                <p>✓ 配套学习资料下载</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}