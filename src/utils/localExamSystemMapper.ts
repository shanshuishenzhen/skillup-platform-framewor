/**
 * 本地考试系统数据映射工具
 * 处理本地考试系统与云端平台之间的数据格式转换
 */

// 角色映射
export const ROLE_MAPPING = {
  // 本地 -> 云端
  toCloud: {
    'system_admin': 'admin',
    'exam_admin': 'teacher', 
    'exam_supervisor': 'examiner',
    'candidate': 'student',
    'internal_auditor': 'internal_supervisor'
  },
  // 云端 -> 本地
  toLocal: {
    'admin': 'system_admin',
    'teacher': 'exam_admin',
    'examiner': 'exam_supervisor', 
    'student': 'candidate',
    'internal_supervisor': 'internal_auditor'
  }
} as const;

// 状态映射
export const STATUS_MAPPING = {
  toCloud: {
    'enabled': 'active',
    'disabled': 'inactive',
    'locked': 'suspended'
  },
  toLocal: {
    'active': 'enabled',
    'inactive': 'disabled',
    'suspended': 'locked'
  }
} as const;

// 技能等级映射
export const SKILL_LEVEL_MAPPING = {
  toCloud: {
    'level_1': 'beginner',
    'level_2': 'intermediate', 
    'level_3': 'advanced',
    'level_4': 'expert'
  },
  toLocal: {
    'beginner': 'level_1',
    'intermediate': 'level_2',
    'advanced': 'level_3',
    'expert': 'level_4'
  }
} as const;

// 考试类型映射
export const EXAM_TYPE_MAPPING = {
  toCloud: {
    'skill_test': 'skill_assessment',
    'cert_exam': 'certification',
    'practice_test': 'practice',
    'simulation': 'mock'
  },
  toLocal: {
    'skill_assessment': 'skill_test',
    'certification': 'cert_exam', 
    'practice': 'practice_test',
    'mock': 'simulation'
  }
} as const;

// 题目类型映射
export const QUESTION_TYPE_MAPPING = {
  toCloud: {
    'single_choice': 'single',
    'multiple_choice': 'multiple',
    'true_false': 'judge',
    'fill_blank': 'fill',
    'subjective': 'essay',
    'hands_on': 'practical'
  },
  toLocal: {
    'single': 'single_choice',
    'multiple': 'multiple_choice',
    'judge': 'true_false',
    'fill': 'fill_blank',
    'essay': 'subjective',
    'practical': 'hands_on'
  }
} as const;

// 难度等级映射
export const DIFFICULTY_MAPPING = {
  toCloud: {
    'level_1': 'easy',
    'level_2': 'medium',
    'level_3': 'hard', 
    'level_4': 'expert'
  },
  toLocal: {
    'easy': 'level_1',
    'medium': 'level_2',
    'hard': 'level_3',
    'expert': 'level_4'
  }
} as const;

// 本地用户数据接口
export interface LocalUser {
  employee_id: string;
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  user_role: keyof typeof ROLE_MAPPING.toCloud;
  skill_level?: keyof typeof SKILL_LEVEL_MAPPING.toCloud;
  status: keyof typeof STATUS_MAPPING.toCloud;
}

// 云端用户数据接口
export interface CloudUser {
  employee_id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  role: keyof typeof ROLE_MAPPING.toLocal;
  learning_level?: keyof typeof SKILL_LEVEL_MAPPING.toLocal;
  status: keyof typeof STATUS_MAPPING.toLocal;
}

// 本地试卷数据接口
export interface LocalExamPaper {
  paper_id: string;
  paper_name: string;
  exam_type: keyof typeof EXAM_TYPE_MAPPING.toCloud;
  difficulty: keyof typeof DIFFICULTY_MAPPING.toCloud;
  duration: number;
  total_score: number;
  pass_score: number;
  question_count: number;
}

// 云端考试数据接口
export interface CloudExam {
  id: string;
  title: string;
  category: keyof typeof EXAM_TYPE_MAPPING.toLocal;
  difficulty: keyof typeof DIFFICULTY_MAPPING.toLocal;
  duration: number;
  totalScore: number;
  passingScore: number;
  totalQuestions: number;
}

// 本地题目数据接口
export interface LocalQuestion {
  question_id: string;
  paper_id: string;
  question_type: keyof typeof QUESTION_TYPE_MAPPING.toCloud;
  content: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer: string;
  score: number;
  difficulty: keyof typeof DIFFICULTY_MAPPING.toCloud;
  explanation?: string;
}

// 云端题目数据接口
export interface CloudQuestion {
  id: string;
  examId: string;
  type: keyof typeof QUESTION_TYPE_MAPPING.toLocal;
  content: string;
  options?: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
  correctAnswer: string;
  score: number;
  difficulty: keyof typeof DIFFICULTY_MAPPING.toLocal;
  explanation?: string;
}

/**
 * 数据映射工具类
 */
export class LocalExamSystemMapper {
  
  /**
   * 将本地用户数据转换为云端格式
   */
  static mapUserToCloud(localUser: LocalUser): CloudUser {
    return {
      employee_id: localUser.employee_id,
      name: localUser.full_name,
      email: localUser.email,
      phone: localUser.phone,
      department: localUser.department,
      position: localUser.position,
      role: ROLE_MAPPING.toCloud[localUser.user_role],
      learning_level: localUser.skill_level ? SKILL_LEVEL_MAPPING.toCloud[localUser.skill_level] : undefined,
      status: STATUS_MAPPING.toCloud[localUser.status]
    };
  }

  /**
   * 将云端用户数据转换为本地格式
   */
  static mapUserToLocal(cloudUser: CloudUser): LocalUser {
    return {
      employee_id: cloudUser.employee_id,
      full_name: cloudUser.name,
      email: cloudUser.email,
      phone: cloudUser.phone,
      department: cloudUser.department,
      position: cloudUser.position,
      user_role: ROLE_MAPPING.toLocal[cloudUser.role],
      skill_level: cloudUser.learning_level ? SKILL_LEVEL_MAPPING.toLocal[cloudUser.learning_level] : undefined,
      status: STATUS_MAPPING.toLocal[cloudUser.status]
    };
  }

  /**
   * 将本地试卷数据转换为云端格式
   */
  static mapExamToCloud(localPaper: LocalExamPaper): CloudExam {
    return {
      id: localPaper.paper_id,
      title: localPaper.paper_name,
      category: EXAM_TYPE_MAPPING.toCloud[localPaper.exam_type],
      difficulty: DIFFICULTY_MAPPING.toCloud[localPaper.difficulty],
      duration: localPaper.duration,
      totalScore: localPaper.total_score,
      passingScore: localPaper.pass_score,
      totalQuestions: localPaper.question_count
    };
  }

  /**
   * 将云端考试数据转换为本地格式
   */
  static mapExamToLocal(cloudExam: CloudExam): LocalExamPaper {
    return {
      paper_id: cloudExam.id,
      paper_name: cloudExam.title,
      exam_type: EXAM_TYPE_MAPPING.toLocal[cloudExam.category],
      difficulty: DIFFICULTY_MAPPING.toLocal[cloudExam.difficulty],
      duration: cloudExam.duration,
      total_score: cloudExam.totalScore,
      pass_score: cloudExam.passingScore,
      question_count: cloudExam.totalQuestions
    };
  }

  /**
   * 将本地题目数据转换为云端格式
   */
  static mapQuestionToCloud(localQuestion: LocalQuestion): CloudQuestion {
    const options: Array<{id: string, text: string, isCorrect: boolean}> = [];
    
    // 处理选择题选项
    if (localQuestion.question_type === 'single_choice' || localQuestion.question_type === 'multiple_choice') {
      const correctAnswers = localQuestion.correct_answer.split(',').map(a => a.trim());
      
      if (localQuestion.option_a) {
        options.push({
          id: 'A',
          text: localQuestion.option_a,
          isCorrect: correctAnswers.includes('A')
        });
      }
      if (localQuestion.option_b) {
        options.push({
          id: 'B', 
          text: localQuestion.option_b,
          isCorrect: correctAnswers.includes('B')
        });
      }
      if (localQuestion.option_c) {
        options.push({
          id: 'C',
          text: localQuestion.option_c,
          isCorrect: correctAnswers.includes('C')
        });
      }
      if (localQuestion.option_d) {
        options.push({
          id: 'D',
          text: localQuestion.option_d,
          isCorrect: correctAnswers.includes('D')
        });
      }
    }

    return {
      id: localQuestion.question_id,
      examId: localQuestion.paper_id,
      type: QUESTION_TYPE_MAPPING.toCloud[localQuestion.question_type],
      content: localQuestion.content,
      options: options.length > 0 ? options : undefined,
      correctAnswer: localQuestion.correct_answer,
      score: localQuestion.score,
      difficulty: DIFFICULTY_MAPPING.toCloud[localQuestion.difficulty],
      explanation: localQuestion.explanation
    };
  }

  /**
   * 将云端题目数据转换为本地格式
   */
  static mapQuestionToLocal(cloudQuestion: CloudQuestion): LocalQuestion {
    const localQuestion: LocalQuestion = {
      question_id: cloudQuestion.id,
      paper_id: cloudQuestion.examId,
      question_type: QUESTION_TYPE_MAPPING.toLocal[cloudQuestion.type],
      content: cloudQuestion.content,
      correct_answer: cloudQuestion.correctAnswer,
      score: cloudQuestion.score,
      difficulty: DIFFICULTY_MAPPING.toLocal[cloudQuestion.difficulty],
      explanation: cloudQuestion.explanation
    };

    // 处理选择题选项
    if (cloudQuestion.options) {
      cloudQuestion.options.forEach((option, index) => {
        switch (option.id) {
          case 'A':
            localQuestion.option_a = option.text;
            break;
          case 'B':
            localQuestion.option_b = option.text;
            break;
          case 'C':
            localQuestion.option_c = option.text;
            break;
          case 'D':
            localQuestion.option_d = option.text;
            break;
        }
      });
    }

    return localQuestion;
  }

  /**
   * 批量转换用户数据
   */
  static batchMapUsersToCloud(localUsers: LocalUser[]): CloudUser[] {
    return localUsers.map(user => this.mapUserToCloud(user));
  }

  /**
   * 批量转换用户数据
   */
  static batchMapUsersToLocal(cloudUsers: CloudUser[]): LocalUser[] {
    return cloudUsers.map(user => this.mapUserToLocal(user));
  }

  /**
   * 验证数据完整性
   */
  static validateUserData(user: LocalUser | CloudUser): string[] {
    const errors: string[] = [];
    
    if ('full_name' in user) {
      // 本地用户验证
      if (!user.employee_id) errors.push('工号不能为空');
      if (!user.full_name) errors.push('姓名不能为空');
      if (!user.email) errors.push('邮箱不能为空');
      if (!user.user_role) errors.push('角色不能为空');
      if (!user.status) errors.push('状态不能为空');
    } else {
      // 云端用户验证
      if (!user.employee_id) errors.push('工号不能为空');
      if (!user.name) errors.push('姓名不能为空');
      if (!user.email) errors.push('邮箱不能为空');
      if (!user.role) errors.push('角色不能为空');
      if (!user.status) errors.push('状态不能为空');
    }
    
    return errors;
  }

  /**
   * 生成数据同步报告
   */
  static generateSyncReport(
    successCount: number,
    failCount: number,
    errors: string[]
  ): string {
    return `
数据同步报告
=============
成功: ${successCount} 条
失败: ${failCount} 条
总计: ${successCount + failCount} 条

${errors.length > 0 ? `错误详情:\n${errors.join('\n')}` : ''}

同步时间: ${new Date().toLocaleString('zh-CN')}
    `.trim();
  }
}
