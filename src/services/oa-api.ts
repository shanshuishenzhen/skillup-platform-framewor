/**
 * OA 系统 API 客户端服务
 * 提供与 OA 系统后端 API 的通信接口
 */

import {
  OAUser,
  OAProject,
  OATask,
  OAFile,
  OAChatRoom,
  OAMessage,
  OAApiResponse,
  OAPaginatedResponse,
  OALoginRequest,
  OARegisterRequest,
  OAAuthResponse,
  OAProjectCreateRequest,
  OAProjectUpdateRequest,
  OATaskCreateRequest,
  OATaskUpdateRequest,
  OAFileUploadRequest,
  OAChatRoomCreateRequest,
  OAMessageSendRequest,
  OAProjectQueryParams,
  OATaskQueryParams,
  OAFileQueryParams,
  OAMessageQueryParams,
  OAChatRoomQueryParams
} from '@/types/oa';

/**
 * OA API 客户端类
 * 封装所有与 OA 系统相关的 API 调用
 */
class OAApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_OA_API_URL || 'http://localhost:5000/api') {
    this.baseUrl = baseUrl;
    // 从 localStorage 获取 token
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('oa_token');
    }
  }

  /**
   * 设置认证 token
   * @param token - JWT token
   */
  setToken(token: string | null): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('oa_token', token);
      } else {
        localStorage.removeItem('oa_token');
      }
    }
  }

  /**
   * 获取当前 token
   * @returns 当前的 JWT token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * 发送 HTTP 请求的通用方法
   * @param endpoint - API 端点
   * @param options - 请求选项
   * @returns Promise<T> - 响应数据
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // 添加认证头
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`
        }));
        throw new Error(errorData.message || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  /**
   * 发送带文件的请求
   * @param endpoint - API 端点
   * @param formData - FormData 对象
   * @param options - 请求选项
   * @returns Promise<T> - 响应数据
   */
  private async uploadRequest<T = any>(
    endpoint: string,
    formData: FormData,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      ...options.headers,
    };

    // 添加认证头
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      method: 'POST',
      ...options,
      headers,
      body: formData,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`
        }));
        throw new Error(errorData.message || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Upload Request Error:', error);
      throw error;
    }
  }

  // ==================== 认证相关 API ====================

  /**
   * 用户登录
   * @param credentials - 登录凭据
   * @returns Promise<OAAuthResponse> - 认证响应
   */
  async login(credentials: OALoginRequest): Promise<OAAuthResponse> {
    const response = await this.request<OAAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  /**
   * 用户注册
   * @param userData - 注册数据
   * @returns Promise<OAAuthResponse> - 认证响应
   */
  async register(userData: OARegisterRequest): Promise<OAAuthResponse> {
    return this.request<OAAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * 获取当前用户信息
   * @returns Promise<OAApiResponse<OAUser>> - 用户信息
   */
  async getCurrentUser(): Promise<OAApiResponse<OAUser>> {
    return this.request<OAApiResponse<OAUser>>('/auth/me');
  }

  /**
   * 用户登出
   */
  logout(): void {
    this.setToken(null);
  }

  // ==================== 项目管理 API ====================

  /**
   * 获取项目列表
   * @param params - 查询参数
   * @returns Promise<OAPaginatedResponse<OAProject>> - 项目列表
   */
  async getProjects(params?: OAProjectQueryParams): Promise<OAPaginatedResponse<OAProject>> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request<OAPaginatedResponse<OAProject>>(`/demo/projects?${queryString}`);
  }

  /**
   * 获取单个项目详情
   * @param projectId - 项目 ID
   * @returns Promise<OAApiResponse<OAProject>> - 项目详情
   */
  async getProject(projectId: string): Promise<OAApiResponse<OAProject>> {
    return this.request<OAApiResponse<OAProject>>(`/projects/${projectId}`);
  }

  /**
   * 创建新项目
   * @param projectData - 项目数据
   * @returns Promise<OAApiResponse<OAProject>> - 创建的项目
   */
  async createProject(projectData: OAProjectCreateRequest): Promise<OAApiResponse<OAProject>> {
    return this.request<OAApiResponse<OAProject>>('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  /**
   * 更新项目
   * @param projectId - 项目 ID
   * @param projectData - 更新数据
   * @returns Promise<OAApiResponse<OAProject>> - 更新后的项目
   */
  async updateProject(
    projectId: string,
    projectData: OAProjectUpdateRequest
  ): Promise<OAApiResponse<OAProject>> {
    return this.request<OAApiResponse<OAProject>>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
  }

  /**
   * 删除项目
   * @param projectId - 项目 ID
   * @returns Promise<OAApiResponse> - 删除结果
   */
  async deleteProject(projectId: string): Promise<OAApiResponse> {
    return this.request<OAApiResponse>(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  // ==================== 任务管理 API ====================

  /**
   * 获取任务列表
   * @param params - 查询参数
   * @returns Promise<OAPaginatedResponse<OATask>> - 任务列表
   */
  async getTasks(params?: OATaskQueryParams): Promise<OAPaginatedResponse<OATask>> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request<OAPaginatedResponse<OATask>>(`/demo/tasks?${queryString}`);
  }

  /**
   * 获取项目下的任务
   * @param projectId - 项目 ID
   * @param params - 查询参数
   * @returns Promise<OAPaginatedResponse<OATask>> - 任务列表
   */
  async getProjectTasks(
    projectId: string,
    params?: OATaskQueryParams
  ): Promise<OAPaginatedResponse<OATask>> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request<OAPaginatedResponse<OATask>>(`/projects/${projectId}/tasks?${queryString}`);
  }

  /**
   * 获取单个任务详情
   * @param taskId - 任务 ID
   * @returns Promise<OAApiResponse<OATask>> - 任务详情
   */
  async getTask(taskId: string): Promise<OAApiResponse<OATask>> {
    return this.request<OAApiResponse<OATask>>(`/tasks/${taskId}`);
  }

  /**
   * 创建新任务
   * @param taskData - 任务数据
   * @returns Promise<OAApiResponse<OATask>> - 创建的任务
   */
  async createTask(taskData: OATaskCreateRequest): Promise<OAApiResponse<OATask>> {
    return this.request<OAApiResponse<OATask>>('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  /**
   * 在项目下创建任务
   * @param projectId - 项目 ID
   * @param taskData - 任务数据
   * @returns Promise<OAApiResponse<OATask>> - 创建的任务
   */
  async createProjectTask(
    projectId: string,
    taskData: Omit<OATaskCreateRequest, 'project'>
  ): Promise<OAApiResponse<OATask>> {
    return this.request<OAApiResponse<OATask>>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  /**
   * 更新任务
   * @param taskId - 任务 ID
   * @param taskData - 更新数据
   * @returns Promise<OAApiResponse<OATask>> - 更新后的任务
   */
  async updateTask(
    taskId: string,
    taskData: OATaskUpdateRequest
  ): Promise<OAApiResponse<OATask>> {
    return this.request<OAApiResponse<OATask>>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  /**
   * 删除任务
   * @param taskId - 任务 ID
   * @returns Promise<OAApiResponse> - 删除结果
   */
  async deleteTask(taskId: string): Promise<OAApiResponse> {
    return this.request<OAApiResponse>(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // ==================== 文件管理 API ====================

  /**
   * 获取文件列表
   * @param params - 查询参数
   * @returns Promise<OAPaginatedResponse<OAFile>> - 文件列表
   */
  async getFiles(params?: OAFileQueryParams): Promise<OAPaginatedResponse<OAFile>> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request<OAPaginatedResponse<OAFile>>(`/demo/files?${queryString}`);
  }

  /**
   * 获取单个文件详情
   * @param fileId - 文件 ID
   * @returns Promise<OAApiResponse<OAFile>> - 文件详情
   */
  async getFile(fileId: string): Promise<OAApiResponse<OAFile>> {
    return this.request<OAApiResponse<OAFile>>(`/files/${fileId}`);
  }

  /**
   * 上传单个文件
   * @param uploadData - 上传数据
   * @returns Promise<OAApiResponse<OAFile>> - 上传的文件
   */
  async uploadFile(uploadData: OAFileUploadRequest): Promise<OAApiResponse<OAFile>> {
    const formData = new FormData();
    formData.append('file', uploadData.file);
    
    if (uploadData.description) {
      formData.append('description', uploadData.description);
    }
    if (uploadData.tags) {
      formData.append('tags', uploadData.tags);
    }
    if (uploadData.projectId) {
      formData.append('projectId', uploadData.projectId);
    }
    if (uploadData.taskId) {
      formData.append('taskId', uploadData.taskId);
    }
    if (uploadData.isPublic !== undefined) {
      formData.append('isPublic', uploadData.isPublic.toString());
    }

    return this.uploadRequest<OAApiResponse<OAFile>>('/files/upload', formData);
  }

  /**
   * 上传多个文件
   * @param files - 文件列表
   * @param metadata - 文件元数据
   * @returns Promise<OAApiResponse<OAFile[]>> - 上传的文件列表
   */
  async uploadMultipleFiles(
    files: File[],
    metadata?: Omit<OAFileUploadRequest, 'file'>
  ): Promise<OAApiResponse<OAFile[]>> {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    if (metadata?.description) {
      formData.append('description', metadata.description);
    }
    if (metadata?.tags) {
      formData.append('tags', metadata.tags);
    }
    if (metadata?.projectId) {
      formData.append('projectId', metadata.projectId);
    }
    if (metadata?.taskId) {
      formData.append('taskId', metadata.taskId);
    }
    if (metadata?.isPublic !== undefined) {
      formData.append('isPublic', metadata.isPublic.toString());
    }

    return this.uploadRequest<OAApiResponse<OAFile[]>>('/files/upload-multiple', formData);
  }

  /**
   * 删除文件
   * @param fileId - 文件 ID
   * @returns Promise<OAApiResponse> - 删除结果
   */
  async deleteFile(fileId: string): Promise<OAApiResponse> {
    return this.request<OAApiResponse>(`/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 下载文件
   * @param fileId - 文件 ID
   * @returns Promise<Blob> - 文件数据
   */
  async downloadFile(fileId: string): Promise<Blob> {
    const url = `${this.baseUrl}/files/download/${fileId}`;
    const headers: HeadersInit = {};
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    return response.blob();
  }

  // ==================== 消息通讯 API ====================

  /**
   * 获取聊天室列表
   * @param params - 查询参数
   * @returns Promise<OAApiResponse<OAChatRoom[]>> - 聊天室列表
   */
  async getChatRooms(params?: OAChatRoomQueryParams): Promise<OAApiResponse<OAChatRoom[]>> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request<OAApiResponse<OAChatRoom[]>>(`/demo/messages/rooms?${queryString}`);
  }

  /**
   * 获取聊天室详情
   * @param roomId - 聊天室 ID
   * @returns Promise<OAApiResponse<OAChatRoom>> - 聊天室详情
   */
  async getChatRoom(roomId: string): Promise<OAApiResponse<OAChatRoom>> {
    return this.request<OAApiResponse<OAChatRoom>>(`/messages/rooms/${roomId}`);
  }

  /**
   * 创建聊天室
   * @param roomData - 聊天室数据
   * @returns Promise<OAApiResponse<OAChatRoom>> - 创建的聊天室
   */
  async createChatRoom(roomData: OAChatRoomCreateRequest): Promise<OAApiResponse<OAChatRoom>> {
    return this.request<OAApiResponse<OAChatRoom>>('/messages/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  }

  /**
   * 创建或获取私聊房间
   * @param userId - 对方用户 ID
   * @returns Promise<OAApiResponse<OAChatRoom>> - 私聊房间
   */
  async createPrivateRoom(userId: string): Promise<OAApiResponse<OAChatRoom>> {
    return this.request<OAApiResponse<OAChatRoom>>('/messages/rooms/private', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  /**
   * 获取聊天室消息
   * @param roomId - 聊天室 ID
   * @param params - 查询参数
   * @returns Promise<OAPaginatedResponse<OAMessage>> - 消息列表
   */
  async getRoomMessages(
    roomId: string,
    params?: OAMessageQueryParams
  ): Promise<OAPaginatedResponse<OAMessage>> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request<OAPaginatedResponse<OAMessage>>(`/demo/messages/rooms/${roomId}/messages?${queryString}`);
  }

  /**
   * 发送消息
   * @param roomId - 聊天室 ID
   * @param messageData - 消息数据
   * @returns Promise<OAApiResponse<OAMessage>> - 发送的消息
   */
  async sendMessage(
    roomId: string,
    messageData: OAMessageSendRequest
  ): Promise<OAApiResponse<OAMessage>> {
    return this.request<OAApiResponse<OAMessage>>(`/demo/messages/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  /**
   * 标记消息为已读
   * @param messageId - 消息 ID
   * @returns Promise<OAApiResponse> - 操作结果
   */
  async markMessageAsRead(messageId: string): Promise<OAApiResponse> {
    return this.request<OAApiResponse>(`/messages/${messageId}/read`, {
      method: 'POST',
    });
  }
}

// 创建单例实例
const oaApi = new OAApiClient();

export default oaApi;
export { OAApiClient };