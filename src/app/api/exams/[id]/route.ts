// /src/app/api/exams/[id]/route.ts
import { getExamDetails } from '@/services/examService';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const examDetails = await getExamDetails(id);

    if (!examDetails) {
      return NextResponse.json({ message: 'Exam not found' }, { status: 404 });
    }

    return NextResponse.json(examDetails);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to fetch exam details', error: errorMessage }, { status: 500 });
  }
}
