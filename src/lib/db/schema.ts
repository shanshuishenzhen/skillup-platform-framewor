// /src/lib/db/schema.ts
// This file outlines the database schema as described in the Technical Document.
// It uses TypeScript types to represent the tables.
// This can be used as a reference or later be converted into a Prisma schema or SQL script.

// --- ENUMs for status fields ---
export enum UserRole {
  ADMIN = '管理员',
  REGISTERED_USER = '注册用户',
  PAID_STUDENT = '付费学员',
}

export enum QuestionType {
  SINGLE_CHOICE = 'single_choice', // 单选题
  MULTIPLE_CHOICE = 'multiple_choice', // 多选题
}

export enum ExamAttemptStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum UserStatus {
  ACTIVE = 'active',
  LOCKED = 'locked', // For security lockouts
  DEACTIVATED = 'deactivated',
}

export enum CourseDifficulty {
  BEGINNER = '初级',
  INTERMEDIATE = '中级',
  ADVANCED = '高级',
}

// --- Schemas for JSON fields ---

/**
 * Represents the structure of the JSON object for instructor details.
 */
export interface InstructorInfo {
  name: string;
  bio: string;
  avatar_url?: string;
}

// --- Table Schemas ---

/**
 * 1. users table
 * Stores user authentication and role information.
 */
export interface User {
  id: string; // Typically a UUID or auto-incrementing integer
  phone: string; // Unique identifier for login
  password_hash: string; // Hashed password
  face_embedding: string | null; // Stored feature vector for face recognition, nullable
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

/**
 * 2. courses table
 * Stores all course information.
 */
export interface Course {
  id: string;
  title: string;
  industry: string; // e.g., '金融', '医疗'
  difficulty: CourseDifficulty;
  description: string; // Detailed description
  instructor_info: InstructorInfo; // JSON field for instructor details (name, bio, etc.)
  preview_video_url: string; // Publicly accessible URL for the 2-min preview
  full_video_url: string; // Encrypted or protected URL for the full video (e.g., m3u8)
  materials_url: string | null; // URL for downloadable materials
  price: number; // Price in cents to avoid floating point issues
  created_at: Date;
  updated_at: Date;
}

/**
 * 3. user_courses table (Join Table)
 * Links users to the courses they have purchased. Acts as an order/entitlement record.
 */
export interface UserCourse {
  id: string;
  user_id: string; // Foreign Key to users.id
  course_id: string; // Foreign Key to courses.id
  purchase_time: Date;
  expiry_time: Date | null; // For courses with limited access time, null for permanent
  purchase_price: number; // Price paid at the time of purchase
  transaction_id: string; // From payment gateway
}

/**
 * 4. learning_records table
 * Tracks the learning progress of each user for each course.
 */
export interface LearningRecord {
  id: string;
  user_id: string; // Foreign Key to users.id
  course_id: string; // Foreign Key to courses.id
  progress_percent: number; // e.g., 75 for 75%
  last_watched_timestamp: number; // e.g., 123 (seconds into the video)
  last_learn_time: Date;
  completed_at: Date | null;
}

// --- Exam System Schemas ---

/**
 * 5. exams table
 * Stores information about each exam.
 */
export interface Exam {
  id: string;
  course_id: string; // Foreign key to courses.id to link an exam to a course
  title: string;
  description: string;
  created_at: Date;
}

/**
 * 6. questions table
 * Stores the questions for all exams.
 */
export interface Question {
  id: string;
  exam_id: string; // Foreign key to exams.id
  question_text: string;
  question_type: QuestionType;
  order: number; // To determine the order of questions in an exam
}

/**
 * 7. choices table
 * Stores the answer choices for each question.
 */
export interface Choice {
  id: string;
  question_id: string; // Foreign key to questions.id
  choice_text: string;
  is_correct: boolean; // True if this is a correct answer
}

/**
 * 8. exam_attempts table
 * Records each attempt a user makes on an exam.
 */
export interface ExamAttempt {
  id: string;
  user_id: string; // Foreign key to users.id
  exam_id: string; // Foreign key to exams.id
  status: ExamAttemptStatus;
  score: number | null; // The final score, null if in progress
  started_at: Date;
  completed_at: Date | null;
}

/**
 * 9. user_answers table
 * Stores the specific answer(s) a user selected for a question in an attempt.
 */
export interface UserAnswer {
  id: string;
  exam_attempt_id: string; // Foreign key to exam_attempts.id
  question_id: string; // Foreign key to questions.id
  choice_id: string; // Foreign key to choices.id
}
