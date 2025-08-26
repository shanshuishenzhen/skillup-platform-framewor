// /src/app/exams/page.tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";

// Define the type for the exam object we expect from the API
type Exam = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  created_at: string;
};

// This is a Server Component, so we can fetch data directly.
async function getExams(): Promise<Exam[]> {
  // In a real app, you might want to use a more robust way to specify the base URL.
  const res = await fetch('http://localhost:3000/api/exams', { cache: 'no-store' });
  if (!res.ok) {
    // This will be caught by the nearest error.js Error Boundary
    throw new Error('Failed to fetch exams');
  }
  return res.json();
}

export default async function ExamsPage() {
  const exams = await getExams();

  return (
    <div className="container mx-auto py-12">
      <section className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-primary">
          技能等级考试
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          检验您的学习成果，通过考试获得认证。
        </p>
      </section>

      <section>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="flex flex-col hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center">
                  <FileText className="h-8 w-8 mr-4 text-primary" />
                  <div>
                    <CardTitle>{exam.title}</CardTitle>
                    <CardDescription>关联课程ID: {exam.course_id}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-gray-700 text-sm">{exam.description}</p>
              </CardContent>
              <CardFooter>
                <Link href={`/exams/${exam.id}`} className="w-full">
                  <Button className="w-full">
                    开始考试 <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
        {exams.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500">当前没有可用的考试。</p>
          </div>
        )}
      </section>
    </div>
  );
}
