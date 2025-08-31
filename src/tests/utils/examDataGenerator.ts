/**
 * 考试系统测试数据生成器
 * 
 * 提供考试系统测试所需的模拟数据，包括：
 * 1. 考试数据
 * 2. 题目数据
 * 3. 用户数据
 * 4. 答题记录数据
 * 5. 证书数据
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { faker } from '@faker-js/faker';

// 考试接口定义
export interface MockExam {
  id: string;
  title: string;
  description: string;
  course_id: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // 分钟
  total_questions: number;
  passing_score: number;
  max_attempts: number;
  is_active: boolean;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

// 题目接口定义
export interface MockQuestion {
  id: string;
  exam_id: string;
  type: 'multiple_choice' | 'single_choice' | 'true_false' | 'essay';
  question: string;
  options?: string[];
  correct_answer: string | string[];
  explanation?: string;
  points: number;
  order: number;
  created_at: string;
}

// 用户接口定义
export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  avatar_url?: string;
  created_at: string;
}

// 考试报名接口定义
export interface MockExamRegistration {
  id: string;
  exam_id: string;
  user_id: string;
  status: 'registered' | 'in_progress' | 'completed' | 'cancelled';
  registered_at: string;
  started_at?: string;
  completed_at?: string;
}

// 答题记录接口定义
export interface MockExamSubmission {
  id: string;
  exam_id: string;
  user_id: string;
  registration_id: string;
  answers: Record<string, unknown>;
  score: number;
  total_score: number;
  passed: boolean;
  time_spent: number; // 秒
  submitted_at: string;
}

// 证书接口定义
export interface MockCertificate {
  id: string;
  exam_id: string;
  user_id: string;
  submission_id: string;
  certificate_url: string;
  issued_at: string;
  expires_at?: string;
}

/**
 * 考试数据生成器类
 */
export class ExamDataGenerator {
  private static instance: ExamDataGenerator;
  private generatedData: {
    exams: MockExam[];
    questions: MockQuestion[];
    users: MockUser[];
    registrations: MockExamRegistration[];
    submissions: MockExamSubmission[];
    certificates: MockCertificate[];
  } = {
    exams: [],
    questions: [],
    users: [],
    registrations: [],
    submissions: [],
    certificates: []
  };

  /**
   * 获取单例实例
   * @returns ExamDataGenerator实例
   */
  public static getInstance(): ExamDataGenerator {
    if (!ExamDataGenerator.instance) {
      ExamDataGenerator.instance = new ExamDataGenerator();
    }
    return ExamDataGenerator.instance;
  }

  /**
   * 生成模拟考试数据
   * @param count 生成数量
   * @param options 生成选项
   * @returns 考试数据数组
   */
  public generateExams(count: number = 5, options: Partial<MockExam> = {}): MockExam[] {
    const exams: MockExam[] = [];
    const difficulties: MockExam['difficulty'][] = ['beginner', 'intermediate', 'advanced'];

    for (let i = 0; i < count; i++) {
      const exam: MockExam = {
        id: faker.string.uuid(),
        title: faker.lorem.words(3),
        description: faker.lorem.paragraph(),
        course_id: faker.string.uuid(),
        difficulty: faker.helpers.arrayElement(difficulties),
        duration: faker.number.int({ min: 30, max: 180 }),
        total_questions: faker.number.int({ min: 10, max: 50 }),
        passing_score: faker.number.int({ min: 60, max: 80 }),
        max_attempts: faker.number.int({ min: 1, max: 3 }),
        is_active: faker.datatype.boolean(),
        start_time: faker.date.future().toISOString(),
        end_time: faker.date.future({ years: 1 }).toISOString(),
        created_at: faker.date.past().toISOString(),
        updated_at: faker.date.recent().toISOString(),
        ...options
      };
      exams.push(exam);
    }

    this.generatedData.exams.push(...exams);
    return exams;
  }

  /**
   * 生成模拟题目数据
   * @param examId 考试ID
   * @param count 生成数量
   * @returns 题目数据数组
   */
  public generateQuestions(examId: string, count: number = 10): MockQuestion[] {
    const questions: MockQuestion[] = [];
    const types: MockQuestion['type'][] = ['multiple_choice', 'single_choice', 'true_false', 'essay'];

    for (let i = 0; i < count; i++) {
      const type = faker.helpers.arrayElement(types);
      const question: MockQuestion = {
        id: faker.string.uuid(),
        exam_id: examId,
        type,
        question: faker.lorem.sentence() + '?',
        points: faker.number.int({ min: 1, max: 5 }),
        order: i + 1,
        created_at: faker.date.past().toISOString(),
        correct_answer: '',
        explanation: faker.lorem.sentence()
      };

      // 根据题目类型生成选项和答案
      switch (type) {
        case 'multiple_choice':
          question.options = Array.from({ length: 4 }, () => faker.lorem.words(2));
          question.correct_answer = faker.helpers.arrayElements(question.options, { min: 1, max: 2 });
          break;
        case 'single_choice':
          question.options = Array.from({ length: 4 }, () => faker.lorem.words(2));
          question.correct_answer = faker.helpers.arrayElement(question.options);
          break;
        case 'true_false':
          question.options = ['True', 'False'];
          question.correct_answer = faker.helpers.arrayElement(question.options);
          break;
        case 'essay':
          question.correct_answer = faker.lorem.paragraph();
          break;
      }

      questions.push(question);
    }

    this.generatedData.questions.push(...questions);
    return questions;
  }

  /**
   * 生成模拟用户数据
   * @param count 生成数量
   * @param role 用户角色
   * @returns 用户数据数组
   */
  public generateUsers(count: number = 10, role: MockUser['role'] = 'student'): MockUser[] {
    const users: MockUser[] = [];

    for (let i = 0; i < count; i++) {
      const user: MockUser = {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        name: faker.person.fullName(),
        role,
        avatar_url: faker.image.avatar(),
        created_at: faker.date.past().toISOString()
      };
      users.push(user);
    }

    this.generatedData.users.push(...users);
    return users;
  }

  /**
   * 生成模拟考试报名数据
   * @param examId 考试ID
   * @param userIds 用户ID数组
   * @returns 报名数据数组
   */
  public generateRegistrations(examId: string, userIds: string[]): MockExamRegistration[] {
    const registrations: MockExamRegistration[] = [];
    const statuses: MockExamRegistration['status'][] = ['registered', 'in_progress', 'completed', 'cancelled'];

    userIds.forEach(userId => {
      const status = faker.helpers.arrayElement(statuses);
      const registration: MockExamRegistration = {
        id: faker.string.uuid(),
        exam_id: examId,
        user_id: userId,
        status,
        registered_at: faker.date.past().toISOString()
      };

      if (status === 'in_progress' || status === 'completed') {
        registration.started_at = faker.date.recent().toISOString();
      }

      if (status === 'completed') {
        registration.completed_at = faker.date.recent().toISOString();
      }

      registrations.push(registration);
    });

    this.generatedData.registrations.push(...registrations);
    return registrations;
  }

  /**
   * 生成模拟答题记录数据
   * @param examId 考试ID
   * @param userId 用户ID
   * @param registrationId 报名ID
   * @param questions 题目数组
   * @returns 答题记录数据
   */
  public generateSubmission(
    examId: string,
    userId: string,
    registrationId: string,
    questions: MockQuestion[]
  ): MockExamSubmission {
    const answers: Record<string, unknown> = {};
    let score = 0;
    let totalScore = 0;

    questions.forEach(question => {
      totalScore += question.points;
      
      // 生成随机答案
      let answer: string | string[];
      switch (question.type) {
        case 'multiple_choice':
          answer = faker.helpers.arrayElements(question.options || [], { min: 1, max: 2 });
          // 随机决定是否答对
          if (faker.datatype.boolean({ probability: 0.7 })) {
            answer = question.correct_answer;
            score += question.points;
          }
          break;
        case 'single_choice':
        case 'true_false':
          answer = faker.helpers.arrayElement(question.options || []);
          if (faker.datatype.boolean({ probability: 0.7 })) {
            answer = question.correct_answer;
            score += question.points;
          }
          break;
        case 'essay':
          answer = faker.lorem.paragraph();
          // 随机评分
          if (faker.datatype.boolean({ probability: 0.6 })) {
            score += Math.floor(question.points * faker.number.float({ min: 0.5, max: 1 }));
          }
          break;
      }

      answers[question.id] = answer;
    });

    const submission: MockExamSubmission = {
      id: faker.string.uuid(),
      exam_id: examId,
      user_id: userId,
      registration_id: registrationId,
      answers,
      score,
      total_score: totalScore,
      passed: score >= (totalScore * 0.6), // 假设60%为及格线
      time_spent: faker.number.int({ min: 300, max: 7200 }), // 5分钟到2小时
      submitted_at: faker.date.recent().toISOString()
    };

    this.generatedData.submissions.push(submission);
    return submission;
  }

  /**
   * 生成模拟证书数据
   * @param examId 考试ID
   * @param userId 用户ID
   * @param submissionId 答题记录ID
   * @returns 证书数据
   */
  public generateCertificate(
    examId: string,
    userId: string,
    submissionId: string
  ): MockCertificate {
    const certificate: MockCertificate = {
      id: faker.string.uuid(),
      exam_id: examId,
      user_id: userId,
      submission_id: submissionId,
      certificate_url: faker.internet.url() + '/certificate.pdf',
      issued_at: faker.date.recent().toISOString(),
      expires_at: faker.date.future({ years: 2 }).toISOString()
    };

    this.generatedData.certificates.push(certificate);
    return certificate;
  }

  /**
   * 生成完整的考试场景数据
   * @param options 生成选项
   * @returns 完整的考试数据
   */
  public generateCompleteExamScenario(options: {
    examCount?: number;
    userCount?: number;
    questionsPerExam?: number;
  } = {}) {
    const {
      examCount = 3,
      userCount = 10,
      questionsPerExam = 15
    } = options;

    // 生成用户
    const users = this.generateUsers(userCount);
    const teachers = this.generateUsers(2, 'teacher');
    const admins = this.generateUsers(1, 'admin');

    // 生成考试
    const exams = this.generateExams(examCount);

    // 为每个考试生成题目、报名和答题记录
    exams.forEach(exam => {
      // 生成题目
      const questions = this.generateQuestions(exam.id, questionsPerExam);

      // 生成报名（随机选择部分用户）
      const participantIds = faker.helpers.arrayElements(
        users.map(u => u.id),
        { min: Math.floor(userCount * 0.3), max: Math.floor(userCount * 0.8) }
      );
      const registrations = this.generateRegistrations(exam.id, participantIds);

      // 为已完成的报名生成答题记录
      registrations
        .filter(reg => reg.status === 'completed')
        .forEach(registration => {
          const submission = this.generateSubmission(
            exam.id,
            registration.user_id,
            registration.id,
            questions
          );

          // 为通过的答题记录生成证书
          if (submission.passed) {
            this.generateCertificate(
              exam.id,
              registration.user_id,
              submission.id
            );
          }
        });
    });

    return {
      exams,
      questions: this.generatedData.questions,
      users: [...users, ...teachers, ...admins],
      registrations: this.generatedData.registrations,
      submissions: this.generatedData.submissions,
      certificates: this.generatedData.certificates
    };
  }

  /**
   * 获取所有生成的数据
   * @returns 所有生成的数据
   */
  public getAllData() {
    return { ...this.generatedData };
  }

  /**
   * 清除所有生成的数据
   */
  public clearData() {
    this.generatedData = {
      exams: [],
      questions: [],
      users: [],
      registrations: [],
      submissions: [],
      certificates: []
    };
  }

  /**
   * 导出数据为JSON格式
   * @returns JSON字符串
   */
  public exportToJSON(): string {
    const data = {
      ...this.generatedData,
      metadata: {
        generated_at: new Date().toISOString(),
        total_records: {
          exams: this.generatedData.exams.length,
          questions: this.generatedData.questions.length,
          users: this.generatedData.users.length,
          registrations: this.generatedData.registrations.length,
          submissions: this.generatedData.submissions.length,
          certificates: this.generatedData.certificates.length
        }
      }
    };

    return JSON.stringify(data, null, 2);
  }
}

// 导出默认实例
export const examDataGenerator = ExamDataGenerator.getInstance();

// 导出便捷函数
export const generateTestData = {
  /**
   * 快速生成基础测试数据
   */
  basic: () => {
    const generator = ExamDataGenerator.getInstance();
    generator.clearData();
    return generator.generateCompleteExamScenario({
      examCount: 2,
      userCount: 5,
      questionsPerExam: 10
    });
  },

  /**
   * 快速生成中等规模测试数据
   */
  medium: () => {
    const generator = ExamDataGenerator.getInstance();
    generator.clearData();
    return generator.generateCompleteExamScenario({
      examCount: 5,
      userCount: 20,
      questionsPerExam: 20
    });
  },

  /**
   * 快速生成大规模测试数据
   */
  large: () => {
    const generator = ExamDataGenerator.getInstance();
    generator.clearData();
    return generator.generateCompleteExamScenario({
      examCount: 10,
      userCount: 100,
      questionsPerExam: 30
    });
  }
};