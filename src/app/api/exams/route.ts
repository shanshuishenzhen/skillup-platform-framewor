// /src/app/api/exams/route.ts
import { getExams } from '@/services/examService';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const exams = await getExams();
    return NextResponse.json(exams);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to fetch exams', error: errorMessage }, { status: 500 });
  }
}
