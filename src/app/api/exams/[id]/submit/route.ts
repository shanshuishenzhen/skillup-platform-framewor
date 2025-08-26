// /src/app/api/exams/[id]/submit/route.ts
import { submitExam } from '@/services/examService';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const answers = body.answers;

    if (!answers) {
      return NextResponse.json({ message: 'Answers are required' }, { status: 400 });
    }

    // In a real app, you'd get the userId from the session/token
    const result = await submitExam(id, answers);

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to submit exam', error: errorMessage }, { status: 500 });
  }
}
