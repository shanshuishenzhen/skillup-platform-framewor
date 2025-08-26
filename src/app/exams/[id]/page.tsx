// /src/app/exams/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

// Define types for the data structures
type Choice = {
  id: string;
  choice_text: string;
};

type Question = {
  id: string;
  question_text: string;
  choices: Choice[];
};

type ExamDetails = {
  id: string;
  title: string;
  description: string;
  questions: Question[];
};

type ExamResult = {
  id: string;
  score: number;
  status: string;
};

export default function ExamTakingPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [exam, setExam] = useState<ExamDetails | null>(null);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);

  useEffect(() => {
    if (examId) {
      fetch(`/api/exams/${examId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to load exam details.');
          }
          return res.json();
        })
        .then(data => {
          setExam(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [examId]);

  const handleAnswerChange = (questionId: string, choiceId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: choiceId }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== exam?.questions.length) {
      alert('请回答所有问题后再提交！');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/exams/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        throw new Error('Failed to submit answers.');
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-10">加载考试中...</div>;
  if (error) return <div className="text-center py-10 text-red-500">错误: {error}</div>;
  if (!exam) return <div className="text-center py-10">未找到考试。</div>;

  if (result) {
    return (
      <div className="container mx-auto py-12 text-center">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">考试完成！</CardTitle>
            <CardDescription>这是您的考试结果</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold text-primary">{result.score.toFixed(2)}%</p>
            <p className="mt-4 text-gray-600">您已完成对 "{exam.title}" 的测试。</p>
          </CardContent>
        </Card>
        <Button onClick={() => router.push('/exams')} className="mt-8">返回考试列表</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{exam.title}</CardTitle>
          <CardDescription>{exam.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {exam.questions.map((q, index) => (
            <div key={q.id}>
              <p className="font-semibold">{index + 1}. {q.question_text}</p>
              <div className="mt-4 space-y-2 pl-4">
                {q.choices.map(c => (
                  <label key={c.id} className="flex items-center space-x-2 text-gray-700">
                    <input
                      type="radio"
                      name={q.id}
                      value={c.id}
                      onChange={() => handleAnswerChange(q.id, c.id)}
                      className="form-radio h-4 w-4 text-primary focus:ring-primary"
                    />
                    <span>{c.choice_text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="pt-8 flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting} size="lg">
              {submitting ? '提交中...' : '完成并提交'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
