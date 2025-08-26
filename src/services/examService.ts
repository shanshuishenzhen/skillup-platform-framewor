// /src/services/examService.ts
import { Exam, Question, Choice, QuestionType, ExamAttemptStatus } from '@/lib/db/schema';

// --- MOCK DATA ---
// In a real application, this data would come from a database.

const mockExams: Exam[] = [
  {
    id: 'exam-1',
    course_id: 'course-1',
    title: '金融基础知识测试',
    description: '测试您对金融行业基本概念的理解。',
    created_at: new Date(),
  },
  {
    id: 'exam-2',
    course_id: 'course-2',
    title: '医疗器械入门测验',
    description: '检验您对常见医疗器械知识的掌握程度。',
    created_at: new Date(),
  }
];

const mockQuestions: Question[] = [
  // Exam 1 Questions
  { id: 'q-1-1', exam_id: 'exam-1', question_text: '以下哪个不是中央银行的职能？', question_type: QuestionType.SINGLE_CHOICE, order: 1 },
  { id: 'q-1-2', exam_id: 'exam-1', question_text: '什么是市盈率（P/E Ratio）？', question_type: QuestionType.SINGLE_CHOICE, order: 2 },
  // Exam 2 Questions
  { id: 'q-2-1', exam_id: 'exam-2', question_text: '核磁共振（MRI）主要利用什么原理成像？', question_type: QuestionType.SINGLE_CHOICE, order: 1 },
];

const mockChoices: Choice[] = [
  // Choices for Q1
  { id: 'c-1-1-1', question_id: 'q-1-1', choice_text: '发行货币', is_correct: false },
  { id: 'c-1-1-2', question_id: 'q-1-1', choice_text: '制定货币政策', is_correct: false },
  { id: 'c-1-1-3', question_id: 'q-1-1', choice_text: '吸收公众存款', is_correct: true },
  { id: 'c-1-1-4', question_id: 'q-1-1', choice_text: '管理国家外汇储备', is_correct: false },
  // Choices for Q2
  { id: 'c-1-2-1', question_id: 'q-1-2', choice_text: '公司市值 / 公司净利润', is_correct: true },
  { id: 'c-1-2-2', question_id: 'q-1-2', choice_text: '公司股价 / 每股净资产', is_correct: false },
  { id: 'c-1-2-3', question_id: 'q-1-2', choice_text: '公司总资产 / 公司总负债', is_correct: false },
  // Choices for Q3
  { id: 'c-2-1-1', question_id: 'q-2-1', choice_text: 'X射线', is_correct: false },
  { id: 'c-2-1-2', question_id: 'q-2-1', choice_text: '超声波', is_correct: false },
  { id: 'c-2-1-3', question_id: 'q-2-1', choice_text: '磁场和射频脉冲', is_correct: true },
];

// --- SERVICE FUNCTIONS ---

/**
 * Retrieves a list of all available exams.
 */
export async function getExams() {
  console.log("Fetching all exams from mock data.");
  // In a real app, this would be a database query: SELECT * FROM exams;
  return mockExams;
}

/**
 * Retrieves the details for a single exam, including questions and choices.
 * This function intentionally omits the `is_correct` field from choices
 * to prevent cheating.
 * @param examId The ID of the exam to retrieve.
 */
export async function getExamDetails(examId: string) {
  console.log(`Fetching details for exam: ${examId}`);
  const exam = mockExams.find(e => e.id === examId);
  if (!exam) {
    return null;
  }

  const questions = mockQuestions
    .filter(q => q.exam_id === examId)
    .map(question => {
      const choices = mockChoices
        .filter(c => c.question_id === question.id)
        .map(({ is_correct, ...choice }) => choice); // Omit is_correct
      return { ...question, choices };
    });

  return { ...exam, questions };
}

type UserAnswers = {
  [questionId: string]: string; // e.g. { 'q-1-1': 'c-1-1-3' }
};

/**
 * Submits a user's answers for an exam, calculates the score, and returns the result.
 * @param examId The ID of the exam being submitted.
 * @param answers A map of question IDs to selected choice IDs.
 */
export async function submitExam(examId: string, answers: UserAnswers) {
  console.log(`Submitting answers for exam: ${examId}`);
  const questionsForExam = mockQuestions.filter(q => q.exam_id === examId);
  let correctCount = 0;

  for (const question of questionsForExam) {
    const correctChoice = mockChoices.find(c => c.question_id === question.id && c.is_correct);
    const userAnswerChoiceId = answers[question.id];

    if (correctChoice && userAnswerChoiceId === correctChoice.id) {
      correctCount++;
    }
  }

  const totalQuestions = questionsForExam.length;
  const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

  console.log(`Exam ${examId} submitted. Score: ${score.toFixed(2)}%`);

  // In a real app, you would save an ExamAttempt record to the database here.
  const attempt = {
    id: `attempt-${Date.now()}`,
    exam_id: examId,
    user_id: 'user-1', // This would be the actual logged-in user's ID
    status: ExamAttemptStatus.COMPLETED,
    score: score,
    started_at: new Date(),
    completed_at: new Date(),
  };

  return attempt;
}
