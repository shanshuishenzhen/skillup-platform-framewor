/**
 * WebSocket服务 - 实现即时通信功能
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase';
import { getEnvConfig } from '@/utils/envConfig';

interface AuthenticatedSocket extends Socket {
  userId: string;
  user: any;
}

interface OnlineUser {
  userId: string;
  socketId: string;
  user: any;
  joinedAt: Date;
  lastSeen: Date;
}

interface TypingUser {
  userId: string;
  user: any;
  timestamp: Date;
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private onlineUsers: Map<string, OnlineUser> = new Map();
  private roomTypingUsers: Map<string, Map<string, TypingUser>> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 初始化WebSocket服务
   */
  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // 身份验证中间件
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const config = getEnvConfig();
        const decoded = jwt.verify(token, config.security.jwtSecret) as any;
        
        // 获取用户信息
        const { data: user, error } = await supabaseAdmin
          .from('users')
          .select('id, name, email, avatar_url, role, status')
          .eq('id', decoded.userId)
          .single();

        if (error || !user) {
          return next(new Error('User not found'));
        }

        if (user.status !== 'active') {
          return next(new Error('User account is not active'));
        }

        socket.userId = user.id;
        socket.user = user;
        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // 连接处理
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`用户 ${socket.user.name} 连接到WebSocket`);
      this.handleConnection(socket);
    });

    console.log('WebSocket服务已初始化');
  }

  /**
   * 处理用户连接
   */
  private async handleConnection(socket: AuthenticatedSocket) {
    // 添加到在线用户列表
    this.onlineUsers.set(socket.userId, {
      userId: socket.userId,
      socketId: socket.id,
      user: socket.user,
      joinedAt: new Date(),
      lastSeen: new Date()
    });

    // 更新数据库中的在线状态
    await this.updateUserOnlineStatus(socket.userId, 'online', socket.id);

    // 注册事件处理器
    this.registerEventHandlers(socket);

    // 处理断开连接
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  /**
   * 注册事件处理器
   */
  private registerEventHandlers(socket: AuthenticatedSocket) {
    // 加入聊天室
    socket.on('join_room', (data) => this.handleJoinRoom(socket, data));
    
    // 离开聊天室
    socket.on('leave_room', (data) => this.handleLeaveRoom(socket, data));
    
    // 发送消息
    socket.on('send_message', (data) => this.handleSendMessage(socket, data));
    
    // 标记消息已读
    socket.on('mark_message_read', (data) => this.handleMarkMessageRead(socket, data));
    
    // 正在输入
    socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
    socket.on('typing_stop', (data) => this.handleTypingStop(socket, data));
    
    // 消息反应
    socket.on('add_reaction', (data) => this.handleAddReaction(socket, data));
    socket.on('remove_reaction', (data) => this.handleRemoveReaction(socket, data));
    
    // 编辑消息
    socket.on('edit_message', (data) => this.handleEditMessage(socket, data));
    
    // 删除消息
    socket.on('delete_message', (data) => this.handleDeleteMessage(socket, data));
    
    // 获取在线用户
    socket.on('get_online_users', (data) => this.handleGetOnlineUsers(socket, data));
  }

  /**
   * 处理加入聊天室
   */
  private async handleJoinRoom(socket: AuthenticatedSocket, data: { roomId: string }) {
    try {
      const { roomId } = data;

      // 验证用户是否有权限访问该聊天室
      const { data: membership, error } = await supabaseAdmin
        .from('chat_room_members')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', socket.userId)
        .eq('is_active', true)
        .single();

      if (error || !membership) {
        socket.emit('error', { message: '没有权限访问该聊天室' });
        return;
      }

      // 加入Socket.IO房间
      socket.join(roomId);

      // 更新最后查看时间
      await supabaseAdmin
        .from('chat_room_members')
        .update({ last_seen: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', socket.userId);

      // 获取房间在线用户
      const onlineMembers = this.getRoomOnlineUsers(roomId);

      // 通知用户成功加入
      socket.emit('room_joined', {
        roomId,
        onlineMembers
      });

      // 通知其他用户有新用户加入
      socket.to(roomId).emit('user_joined_room', {
        roomId,
        user: socket.user
      });

      console.log(`用户 ${socket.user.name} 加入聊天室 ${roomId}`);
    } catch (error) {
      console.error('加入聊天室错误:', error);
      socket.emit('error', { message: '加入聊天室失败' });
    }
  }

  /**
   * 处理离开聊天室
   */
  private handleLeaveRoom(socket: AuthenticatedSocket, data: { roomId: string }) {
    const { roomId } = data;
    
    socket.leave(roomId);
    
    // 通知其他用户有用户离开
    socket.to(roomId).emit('user_left_room', {
      roomId,
      user: socket.user
    });

    console.log(`用户 ${socket.user.name} 离开聊天室 ${roomId}`);
  }

  /**
   * 处理发送消息
   */
  private async handleSendMessage(socket: AuthenticatedSocket, data: any) {
    try {
      const {
        roomId,
        content,
        messageType = 'text',
        fileUrl = null,
        fileName = null,
        fileSize = null,
        fileType = null,
        replyToId = null
      } = data;

      // 验证权限
      const { data: membership, error: memberError } = await supabaseAdmin
        .from('chat_room_members')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', socket.userId)
        .eq('is_active', true)
        .single();

      if (memberError || !membership) {
        socket.emit('error', { message: '没有发送消息权限' });
        return;
      }

      // 创建消息
      const { data: message, error: messageError } = await supabaseAdmin
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: socket.userId,
          content,
          message_type: messageType,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          file_type: fileType,
          reply_to_id: replyToId
        })
        .select(`
          *,
          sender:users!sender_id(id, name, email, avatar_url),
          reply_to:messages!reply_to_id(id, content, sender_id, message_type)
        `)
        .single();

      if (messageError) {
        console.error('创建消息错误:', messageError);
        socket.emit('error', { message: '发送消息失败' });
        return;
      }

      // 更新聊天室最后活动时间和最后消息
      await supabaseAdmin
        .from('chat_rooms')
        .update({
          last_message_id: message.id,
          last_activity: new Date().toISOString()
        })
        .eq('id', roomId);

      // 发送给房间所有成员
      this.io!.to(roomId).emit('new_message', {
        message,
        roomId
      });

      console.log(`用户 ${socket.user.name} 在聊天室 ${roomId} 发送了消息`);
    } catch (error) {
      console.error('发送消息错误:', error);
      socket.emit('error', { message: '发送消息失败' });
    }
  }

  /**
   * 处理标记消息已读
   */
  private async handleMarkMessageRead(socket: AuthenticatedSocket, data: { messageId: string, roomId: string }) {
    try {
      const { messageId, roomId } = data;

      // 插入或更新已读状态
      await supabaseAdmin
        .from('message_read_status')
        .upsert({
          message_id: messageId,
          user_id: socket.userId,
          read_at: new Date().toISOString()
        });

      // 通知房间其他用户
      socket.to(roomId).emit('message_read', {
        messageId,
        userId: socket.userId,
        readAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('标记消息已读错误:', error);
    }
  }

  /**
   * 处理开始输入
   */
  private handleTypingStart(socket: AuthenticatedSocket, data: { roomId: string }) {
    const { roomId } = data;
    
    if (!this.roomTypingUsers.has(roomId)) {
      this.roomTypingUsers.set(roomId, new Map());
    }
    
    const roomTyping = this.roomTypingUsers.get(roomId)!;
    roomTyping.set(socket.userId, {
      userId: socket.userId,
      user: socket.user,
      timestamp: new Date()
    });

    // 清除之前的超时
    const timeoutKey = `${roomId}-${socket.userId}`;
    if (this.typingTimeouts.has(timeoutKey)) {
      clearTimeout(this.typingTimeouts.get(timeoutKey)!);
    }

    // 设置新的超时（3秒后自动停止输入状态）
    const timeout = setTimeout(() => {
      this.handleTypingStop(socket, { roomId });
    }, 3000);
    
    this.typingTimeouts.set(timeoutKey, timeout);

    // 通知房间其他用户
    socket.to(roomId).emit('user_typing', {
      roomId,
      user: socket.user,
      isTyping: true
    });
  }

  /**
   * 处理停止输入
   */
  private handleTypingStop(socket: AuthenticatedSocket, data: { roomId: string }) {
    const { roomId } = data;
    
    const roomTyping = this.roomTypingUsers.get(roomId);
    if (roomTyping) {
      roomTyping.delete(socket.userId);
    }

    // 清除超时
    const timeoutKey = `${roomId}-${socket.userId}`;
    if (this.typingTimeouts.has(timeoutKey)) {
      clearTimeout(this.typingTimeouts.get(timeoutKey)!);
      this.typingTimeouts.delete(timeoutKey);
    }

    // 通知房间其他用户
    socket.to(roomId).emit('user_typing', {
      roomId,
      user: socket.user,
      isTyping: false
    });
  }

  /**
   * 处理添加反应
   */
  private async handleAddReaction(socket: AuthenticatedSocket, data: { messageId: string, emoji: string, roomId: string }) {
    try {
      const { messageId, emoji, roomId } = data;

      // 添加反应
      const { data: reaction, error } = await supabaseAdmin
        .from('message_reactions')
        .upsert({
          message_id: messageId,
          user_id: socket.userId,
          emoji
        })
        .select('*')
        .single();

      if (error) {
        console.error('添加反应错误:', error);
        return;
      }

      // 通知房间所有用户
      this.io!.to(roomId).emit('reaction_added', {
        messageId,
        reaction: {
          ...reaction,
          user: socket.user
        }
      });
    } catch (error) {
      console.error('添加反应错误:', error);
    }
  }

  /**
   * 处理移除反应
   */
  private async handleRemoveReaction(socket: AuthenticatedSocket, data: { messageId: string, emoji: string, roomId: string }) {
    try {
      const { messageId, emoji, roomId } = data;

      // 移除反应
      await supabaseAdmin
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', socket.userId)
        .eq('emoji', emoji);

      // 通知房间所有用户
      this.io!.to(roomId).emit('reaction_removed', {
        messageId,
        userId: socket.userId,
        emoji
      });
    } catch (error) {
      console.error('移除反应错误:', error);
    }
  }

  /**
   * 处理编辑消息
   */
  private async handleEditMessage(socket: AuthenticatedSocket, data: { messageId: string, content: string, roomId: string }) {
    try {
      const { messageId, content, roomId } = data;

      // 更新消息
      const { data: message, error } = await supabaseAdmin
        .from('messages')
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', socket.userId) // 只能编辑自己的消息
        .select('*')
        .single();

      if (error || !message) {
        socket.emit('error', { message: '编辑消息失败' });
        return;
      }

      // 通知房间所有用户
      this.io!.to(roomId).emit('message_edited', {
        messageId,
        content,
        editedAt: message.edited_at
      });
    } catch (error) {
      console.error('编辑消息错误:', error);
    }
  }

  /**
   * 处理删除消息
   */
  private async handleDeleteMessage(socket: AuthenticatedSocket, data: { messageId: string, roomId: string }) {
    try {
      const { messageId, roomId } = data;

      // 软删除消息
      const { data: message, error } = await supabaseAdmin
        .from('messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', socket.userId) // 只能删除自己的消息
        .select('*')
        .single();

      if (error || !message) {
        socket.emit('error', { message: '删除消息失败' });
        return;
      }

      // 通知房间所有用户
      this.io!.to(roomId).emit('message_deleted', {
        messageId,
        deletedAt: message.deleted_at
      });
    } catch (error) {
      console.error('删除消息错误:', error);
    }
  }

  /**
   * 处理获取在线用户
   */
  private handleGetOnlineUsers(socket: AuthenticatedSocket, data: { roomId: string }) {
    const { roomId } = data;
    const onlineUsers = this.getRoomOnlineUsers(roomId);
    
    socket.emit('online_users', {
      roomId,
      users: onlineUsers
    });
  }

  /**
   * 处理用户断开连接
   */
  private async handleDisconnection(socket: AuthenticatedSocket) {
    console.log(`用户 ${socket.user.name} 断开WebSocket连接`);
    
    // 从在线用户列表移除
    this.onlineUsers.delete(socket.userId);
    
    // 更新数据库中的在线状态
    await this.updateUserOnlineStatus(socket.userId, 'offline');
    
    // 清除输入状态
    this.roomTypingUsers.forEach((roomTyping, roomId) => {
      if (roomTyping.has(socket.userId)) {
        roomTyping.delete(socket.userId);
        socket.to(roomId).emit('user_typing', {
          roomId,
          user: socket.user,
          isTyping: false
        });
      }
    });
  }

  /**
   * 获取房间在线用户
   */
  private getRoomOnlineUsers(roomId: string): OnlineUser[] {
    const roomSockets = this.io!.sockets.adapter.rooms.get(roomId);
    if (!roomSockets) return [];

    const onlineUsers: OnlineUser[] = [];
    roomSockets.forEach(socketId => {
      const socket = this.io!.sockets.sockets.get(socketId) as AuthenticatedSocket;
      if (socket && socket.userId) {
        const onlineUser = this.onlineUsers.get(socket.userId);
        if (onlineUser) {
          onlineUsers.push(onlineUser);
        }
      }
    });

    return onlineUsers;
  }

  /**
   * 更新用户在线状态
   */
  private async updateUserOnlineStatus(userId: string, status: string, socketId?: string) {
    try {
      await supabaseAdmin
        .from('user_online_status')
        .upsert({
          user_id: userId,
          status,
          last_seen: new Date().toISOString(),
          socket_id: socketId || null
        });
    } catch (error) {
      console.error('更新在线状态错误:', error);
    }
  }

  /**
   * 获取WebSocket服务实例
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * 发送消息到指定房间
   */
  sendToRoom(roomId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(roomId).emit(event, data);
    }
  }

  /**
   * 发送消息到指定用户
   */
  sendToUser(userId: string, event: string, data: any) {
    const onlineUser = this.onlineUsers.get(userId);
    if (onlineUser && this.io) {
      this.io.to(onlineUser.socketId).emit(event, data);
    }
  }
}

export const websocketService = new WebSocketService();
export default websocketService;
