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