import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from 'next/link';
import Image from 'next/image';

// More detailed placeholder data with image URLs
const fakeCourses = [
  {
    id: 1,
    title: "金融科技（FinTech）实战",
    industry: "金融",
    difficulty: "中级",
    description: "本课程深入探讨区块链、量化交易和监管科技等核心金融科技领域。通过真实案例，您将学习构建创新的金融解决方案。",
    instructor: "AI讲师 · 张伟",
    imageUrl: "https://placehold.co/400x225/165DFF/FFFFFF?text=FinTech"
  },
  {
    id: 2,
    title: "AI驱动的医疗诊断",
    industry: "医疗",
    difficulty: "高级",
    description: "探索如何运用深度学习和计算机视觉技术来辅助医疗诊断。课程内容包括医学影像分析、病理识别等前沿技术。",
    instructor: "AI讲师 · 李娜",
    imageUrl: "https://placehold.co/400x225/36D399/FFFFFF?text=Medical"
  },
  {
    id: 3,
    title: "K-12在线教育产品设计",
    industry: "教育",
    difficulty: "初级",
    description: "学习如何设计符合下一代学习习惯的互动式在线课程。本课程将带您从用户研究到产品上线的全过程。",
    instructor: "AI讲师 · 王芳",
    imageUrl: "https://placehold.co/400x225/6B7280/FFFFFF?text=Education"
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-primary">
          SkillUp: 重塑你的职业未来
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          在AI时代，用最前沿的技能武装自己。我们提供各行业顶尖的在线课程，助您成为行业领导者。
        </p>
        <div className="mt-8">
          <Link href="/register">
            <Button size="lg">立即开始学习</Button>
          </Link>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section>
        <h2 className="text-3xl font-bold text-center">精选课程</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {fakeCourses.map((course) => (
            <Card key={course.id} className="flex flex-col hover:shadow-lg transition-shadow overflow-hidden">
              <div className="relative w-full h-48">
                <Image
                  src={course.imageUrl}
                  alt={course.title}
                  layout="fill"
                  objectFit="cover"
                />
              </div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{course.title}</CardTitle>
                  <span className="text-xs font-semibold text-white bg-secondary py-1 px-2 rounded-full whitespace-nowrap">{course.industry}</span>
                </div>
                <CardDescription>{course.instructor}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-gray-700 text-sm">{course.description}</p>
              </CardContent>
              <CardFooter className="flex justify-between items-center mt-auto">
                <span className="text-sm font-semibold text-primary">{course.difficulty}</span>
                <Link href={`/courses/${course.id}`}>
                  <Button variant="outline">查看详情</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
