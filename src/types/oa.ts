/**
 * OA 系统的 TypeScript 类型定义
 * 基于 MongoDB 模型结构定义的前端类型
 */

// 基础用户类型
export interface OAUser {
  _id: string;
  username: string;
  name?: string;
  email?: string;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
}

// 项目类型
export interface OAProject {
  _id: string;
  name: string;
  description?: string;
  owner: string | OAUser;
  members?: OAProjectMember[];
  status?: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt?: string;
}

// 项目成员类型
export interface OAProjectMember {
  user: string | OAUser;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

// 任务类型
export interface OATask {
  _id: string;
  title: string;
  description?: string;
  project: string | OAProject;
  status: 'To Do' | 'In Progress' | 'Done';
  assignedTo?: string | OAUser;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  tags?: string[];
  attachments?: string[];
  createdBy?: string | OAUser;
  createdAt: string;
  updatedAt?: string;
}

// 文件类型
export interface OAFile {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  url?: string;
  formattedSize?: string;
  uploadedBy: string | OAUser;
  project?: string | OAProject;
  task?: string | OATask;
  category: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other';
  description?: string;
  tags?: string[];
  permissions?: OAFilePermission[];
  isPublic: boolean;
  downloadCount: number;
  version: number;
  parentFile?: string | OAFile;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// 文件权限类型
export interface OAFilePermission {
  user: string | OAUser;
  permission: 'read' | 'write' | 'admin';
}

// 聊天室类型
export interface OAChatRoom {
  _id: string;
  name: string;
  description?: string;
  type: 'private' | 'group' | 'project' | 'public';
  members: OAChatRoomMember[];
  project?: string | OAProject;
  createdBy: string | OAUser;
  avatar?: string;
  settings: OAChatRoomSettings;
  lastMessage?: string | OAMessage;
  lastActivity: string;
  isArchived: boolean;
  archivedAt?: string;
  activeMemberCount?: number;
  onlineMemberCount?: number;
  unreadCount?: number;
  createdAt: string;
  updatedAt?: string;
}

// 聊天室成员类型
export interface OAChatRoomMember {
  user: string | OAUser;
  role: 'member' | 'admin' | 'owner';
  joinedAt: string;
  lastSeen: string;
  isActive: boolean;
}

// 聊天室设置类型
export interface OAChatRoomSettings {
  isPublic: boolean;
  allowFileSharing: boolean;
  allowMemberInvite: boolean;
  maxMembers: number;
  messageRetentionDays: number;
}

// 消息类型
export interface OAMessage {
  _id: string;
  content?: string;
  sender: string | OAUser;
  room: string | OAChatRoom;
  messageType: 'text' | 'file' | 'image' | 'system';
  file?: string | OAFile;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  readBy: OAMessageRead[];
  replyTo?: string | OAMessage;
  edited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  reactions: OAMessageReaction[];
  unreadCount?: number;
  createdAt: string;
  updatedAt?: string;
}

// 消息已读状态类型
export interface OAMessageRead {
  user: string | OAUser;
  readAt: string;
}

// 消息反应类型
export interface OAMessageReaction {
  user: string | OAUser;
  emoji: string;
  createdAt: string;
}

// API 响应类型
export interface OAApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// 分页响应类型
export interface OAPaginatedResponse<T = any> extends OAApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 认证相关类型
export interface OALoginRequest {
  username: string;
  password: string;
}

export interface OARegisterRequest {
  username: string;
  password: string;
  email?: string;
  name?: string;
}

export interface OAAuthResponse extends OAApiResponse {
  token?: string;
  user?: OAUser;
}

// 项目创建/更新请求类型
export interface OAProjectCreateRequest {
  name: string;
  description?: string;
}

export interface OAProjectUpdateRequest extends Partial<OAProjectCreateRequest> {
  status?: 'active' | 'completed' | 'archived';
}

// 任务创建/更新请求类型
export interface OATaskCreateRequest {
  title: string;
  description?: string;
  project: string;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  tags?: string[];
}

export interface OATaskUpdateRequest extends Partial<OATaskCreateRequest> {
  status?: 'To Do' | 'In Progress' | 'Done';
}

// 文件上传请求类型
export interface OAFileUploadRequest {
  file: File;
  description?: string;
  tags?: string;
  projectId?: string;
  taskId?: string;
  isPublic?: boolean;
}

// 聊天室创建请求类型
export interface OAChatRoomCreateRequest {
  name: string;
  description?: string;
  type?: 'group' | 'project' | 'public';
  members?: string[];
  projectId?: string;
}

// 消息发送请求类型
export interface OAMessageSendRequest {
  content?: string;
  messageType?: 'text' | 'file' | 'image';
  fileId?: string;
  replyTo?: string;
}

// Socket.io 事件类型
export interface OASocketEvents {
  // 客户端发送的事件
  'join-room': string;
  'leave-room': string;
  'send-message': OAMessageSendRequest & { roomId: string };
  'typing-start': { roomId: string };
  'typing-stop': { roomId: string };
  'mark-read': { messageId: string };
  
  // 服务器发送的事件
  'message-received': OAMessage;
  'message-updated': OAMessage;
  'message-deleted': { messageId: string };
  'user-joined': { user: OAUser; roomId: string };
  'user-left': { userId: string; roomId: string };
  'typing': { userId: string; roomId: string; isTyping: boolean };
  'room-updated': OAChatRoom;
  'error': { message: string };
}

// 查询参数类型
export interface OAQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, any>;
}

// 项目查询参数
export interface OAProjectQueryParams extends OAQueryParams {
  status?: 'active' | 'completed' | 'archived';
  owner?: string;
}

// 任务查询参数
export interface OATaskQueryParams extends OAQueryParams {
  project?: string;
  status?: 'To Do' | 'In Progress' | 'Done';
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

// 文件查询参数
export interface OAFileQueryParams extends OAQueryParams {
  category?: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other';
  project?: string;
  task?: string;
  uploadedBy?: string;
}

// 消息查询参数
export interface OAMessageQueryParams extends OAQueryParams {
  room?: string;
  before?: string;
  after?: string;
  messageType?: 'text' | 'file' | 'image' | 'system';
}

// 聊天室查询参数
export interface OAChatRoomQueryParams extends OAQueryParams {
  type?: 'private' | 'group' | 'project' | 'public';
  includeArchived?: boolean;
}