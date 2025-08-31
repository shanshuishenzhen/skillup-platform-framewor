/**
 * 聊天界面组件 - 支持即时通信
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Search, 
  Users, 
  User,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Settings,
  Circle,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';
import { toast } from 'sonner';

// 类型定义
interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  status?: string;
}

interface Message {
  id: string;
  content: string;
  sender: User;
  message_type: 'text' | 'file' | 'image' | 'system' | 'voice' | 'video';
  created_at: string;
  is_edited?: boolean;
  edited_at?: string;
  is_deleted?: boolean;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  reply_to_id?: string;
  reply_to?: Message;
  reactions?: MessageReaction[];
  read_status?: MessageReadStatus[];
}

interface MessageReaction {
  id: string;
  emoji: string;
  user_id: string;
  user: User;
}

interface MessageReadStatus {
  user_id: string;
  read_at: string;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'private' | 'group' | 'project' | 'public';
  description?: string;
  avatar_url?: string;
  members: ChatRoomMember[];
  last_message?: Message;
  last_activity: string;
  unread_count?: number;
  created_at: string;
  updated_at: string;
}

interface ChatRoomMember {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  last_seen: string;
  is_active: boolean;
  user: User;
}

interface OnlineUser {
  userId: string;
  user: User;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: string;
}

interface TypingUser {
  userId: string;
  user: User;
  isTyping: boolean;
}

interface ChatInterfaceProps {
  currentUser: User;
  token: string;
}

export default function ChatInterface({ currentUser, token }: ChatInterfaceProps) {
  // 状态管理
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket连接
  useEffect(() => {
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // 连接事件
    socket.on('connect', () => {
      console.log('WebSocket连接成功');
      toast.success('连接成功');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket连接断开');
      toast.error('连接断开');
    });

    // 聊天室事件
    socket.on('room_joined', (data) => {
      setOnlineUsers(data.onlineMembers || []);
    });

    socket.on('user_joined_room', (data) => {
      if (data.roomId === selectedRoom?.id) {
        setOnlineUsers(prev => [...prev, {
          userId: data.user.id,
          user: data.user,
          status: 'online',
          lastSeen: new Date().toISOString()
        }]);
      }
    });

    socket.on('user_left_room', (data) => {
      if (data.roomId === selectedRoom?.id) {
        setOnlineUsers(prev => prev.filter(u => u.userId !== data.user.id));
      }
    });

    // 消息事件
    socket.on('new_message', (data) => {
      if (data.roomId === selectedRoom?.id) {
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
      }
      
      // 更新聊天室列表中的最后消息
      setChatRooms(prev => prev.map(room => 
        room.id === data.roomId 
          ? { ...room, last_message: data.message, last_activity: data.message.created_at }
          : room
      ));
    });

    socket.on('message_edited', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, content: data.content, is_edited: true, edited_at: data.editedAt }
          : msg
      ));
    });

    socket.on('message_deleted', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, is_deleted: true, deleted_at: data.deletedAt }
          : msg
      ));
    });

    socket.on('messages_read', (data) => {
      setMessages(prev => prev.map(msg => {
        if (data.messageIds.includes(msg.id)) {
          const newReadStatus = [...(msg.read_status || [])];
          const existingIndex = newReadStatus.findIndex(rs => rs.user_id === data.userId);
          if (existingIndex >= 0) {
            newReadStatus[existingIndex] = { user_id: data.userId, read_at: data.readAt };
          } else {
            newReadStatus.push({ user_id: data.userId, read_at: data.readAt });
          }
          return { ...msg, read_status: newReadStatus };
        }
        return msg;
      }));
    });

    // 输入状态事件
    socket.on('user_typing', (data) => {
      if (data.roomId === selectedRoom?.id) {
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== data.user.id);
          if (data.isTyping) {
            return [...filtered, { userId: data.user.id, user: data.user, isTyping: true }];
          }
          return filtered;
        });
      }
    });

    // 反应事件
    socket.on('reaction_added', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, reactions: [...(msg.reactions || []), data.reaction] }
          : msg
      ));
    });

    socket.on('reaction_removed', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { 
              ...msg, 
              reactions: (msg.reactions || []).filter(r => 
                !(r.user_id === data.userId && r.emoji === data.emoji)
              )
            }
          : msg
      ));
    });

    // 在线状态事件
    socket.on('user_status_changed', (data) => {
      setOnlineUsers(prev => prev.map(u => 
        u.userId === data.userId 
          ? { ...u, status: data.status, lastSeen: data.lastSeen }
          : u
      ));
    });

    socket.on('error', (error) => {
      console.error('WebSocket错误:', error);
      toast.error(error.message || '连接错误');
    });

    return () => {
      socket.disconnect();
    };
  }, [token, selectedRoom?.id]);

  // 加载聊天室列表
  const loadChatRooms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chat-rooms', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取聊天室列表失败');
      }

      const result = await response.json();
      if (result.success) {
        setChatRooms(result.data.chatRooms);
      }
    } catch (error) {
      console.error('加载聊天室列表错误:', error);
      toast.error('加载聊天室列表失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // 加载消息
  const loadMessages = useCallback(async (roomId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/messages?roomId=${roomId}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取消息失败');
      }

      const result = await response.json();
      if (result.success) {
        setMessages(result.data.messages);
        scrollToBottom();
      }
    } catch (error) {
      console.error('加载消息错误:', error);
      toast.error('加载消息失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // 发送消息
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedRoom || sending) return;

    setSending(true);
    try {
      // 通过WebSocket发送消息
      if (socketRef.current) {
        socketRef.current.emit('send_message', {
          roomId: selectedRoom.id,
          content: newMessage.trim(),
          messageType: 'text'
        });
        setNewMessage('');
      } else {
        // 如果WebSocket不可用，使用HTTP API
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            roomId: selectedRoom.id,
            content: newMessage.trim(),
            messageType: 'text'
          })
        });

        if (!response.ok) {
          throw new Error('发送消息失败');
        }

        const result = await response.json();
        if (result.success) {
          setNewMessage('');
          // 重新加载消息
          await loadMessages(selectedRoom.id);
        }
      }
    } catch (error) {
      console.error('发送消息错误:', error);
      toast.error('发送消息失败');
    } finally {
      setSending(false);
    }
  }, [newMessage, selectedRoom, sending, token, loadMessages]);

  // 处理输入
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // 发送输入状态
    if (socketRef.current && selectedRoom) {
      socketRef.current.emit('typing_start', { roomId: selectedRoom.id });

      // 清除之前的超时
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // 设置新的超时
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current && selectedRoom) {
          socketRef.current.emit('typing_stop', { roomId: selectedRoom.id });
        }
      }, 1000);
    }
  }, [selectedRoom]);

  // 处理按键
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // 选择聊天室
  const selectRoom = useCallback(async (room: ChatRoom) => {
    setSelectedRoom(room);
    setMessages([]);
    setOnlineUsers([]);
    setTypingUsers([]);

    // 加入房间
    if (socketRef.current) {
      socketRef.current.emit('join_room', { roomId: room.id });
    }

    // 加载消息
    await loadMessages(room.id);
  }, [loadMessages]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 初始化
  useEffect(() => {
    loadChatRooms();
  }, [loadChatRooms]);

  // 滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧聊天室列表 */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">消息</h2>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="搜索聊天室..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 聊天室列表 */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {chatRooms
              .filter(room => 
                room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                room.members.some(member => 
                  member.user.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
              )
              .map((room) => (
                <div
                  key={room.id}
                  onClick={() => selectRoom(room)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedRoom?.id === room.id 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={room.avatar_url} />
                        <AvatarFallback>
                          {room.type === 'private' ? (
                            <User className="w-5 h-5" />
                          ) : (
                            <Users className="w-5 h-5" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      {room.unread_count && room.unread_count > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 w-5 h-5 text-xs flex items-center justify-center p-0"
                        >
                          {room.unread_count > 99 ? '99+' : room.unread_count}
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm truncate">{room.name}</h3>
                        <span className="text-xs text-gray-500">
                          {new Date(room.last_activity).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      {room.last_message && (
                        <p className="text-sm text-gray-600 truncate">
                          {room.last_message.sender.name}: {room.last_message.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>
      </div>

      {/* 右侧聊天界面 */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* 聊天室头部 */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedRoom.avatar_url} />
                    <AvatarFallback>
                      {selectedRoom.type === 'private' ? (
                        <User className="w-5 h-5" />
                      ) : (
                        <Users className="w-5 h-5" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedRoom.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{selectedRoom.members.length} 成员</span>
                      {onlineUsers.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{onlineUsers.length} 在线</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="ghost">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 消息列表 */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    currentUser={currentUser}
                    onReaction={(messageId, emoji) => {
                      if (socketRef.current) {
                        socketRef.current.emit('add_reaction', {
                          messageId,
                          emoji,
                          roomId: selectedRoom.id
                        });
                      }
                    }}
                  />
                ))}
                
                {/* 输入状态指示器 */}
                {typingUsers.length > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span>
                      {typingUsers.map(u => u.user.name).join(', ')} 正在输入...
                    </span>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* 消息输入框 */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="ghost">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="输入消息..."
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    disabled={sending}
                  />
                </div>
                <Button size="sm" variant="ghost">
                  <Smile className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">选择一个聊天室</h3>
              <p className="text-gray-500">从左侧列表中选择一个聊天室开始对话</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 消息项组件
interface MessageItemProps {
  message: Message;
  currentUser: User;
  onReaction: (messageId: string, emoji: string) => void;
}

function MessageItem({ message, currentUser, onReaction }: MessageItemProps) {
  const isOwn = message.sender.id === currentUser.id;
  const [showReactions, setShowReactions] = useState(false);

  if (message.is_deleted) {
    return (
      <div className="flex items-center justify-center py-2">
        <span className="text-sm text-gray-500 italic">此消息已被删除</span>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
        {!isOwn && (
          <div className="flex items-center space-x-2 mb-1">
            <Avatar className="w-6 h-6">
              <AvatarImage src={message.sender.avatar_url} />
              <AvatarFallback className="text-xs">
                {message.sender.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-gray-900">
              {message.sender.name}
            </span>
          </div>
        )}
        
        <div
          className={`relative px-4 py-2 rounded-lg ${
            isOwn
              ? 'bg-blue-500 text-white'
              : 'bg-white border border-gray-200'
          }`}
          onMouseEnter={() => setShowReactions(true)}
          onMouseLeave={() => setShowReactions(false)}
        >
          {message.reply_to && (
            <div className="mb-2 p-2 bg-gray-100 rounded border-l-2 border-gray-300">
              <p className="text-xs text-gray-600">
                回复 {message.reply_to.sender.id === currentUser.id ? '你' : message.reply_to.sender.name}
              </p>
              <p className="text-sm">{message.reply_to.content}</p>
            </div>
          )}
          
          <p className="text-sm">{message.content}</p>
          
          {message.is_edited && (
            <span className="text-xs opacity-75 ml-2">(已编辑)</span>
          )}
          
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs opacity-75">
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            
            {isOwn && (
              <div className="flex items-center space-x-1">
                {message.read_status && message.read_status.length > 0 ? (
                  <CheckCheck className="w-3 h-3 opacity-75" />
                ) : (
                  <Check className="w-3 h-3 opacity-75" />
                )}
              </div>
            )}
          </div>
          
          {/* 反应 */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.reduce((acc: any[], reaction) => {
                const existing = acc.find(r => r.emoji === reaction.emoji);
                if (existing) {
                  existing.count++;
                  existing.users.push(reaction.user);
                } else {
                  acc.push({
                    emoji: reaction.emoji,
                    count: 1,
                    users: [reaction.user]
                  });
                }
                return acc;
              }, []).map((reaction, index) => (
                <button
                  key={index}
                  onClick={() => onReaction(message.id, reaction.emoji)}
                  className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full text-xs hover:bg-gray-200"
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              ))}
            </div>
          )}
          
          {/* 快速反应按钮 */}
          {showReactions && (
            <div className="absolute -top-8 right-0 flex space-x-1 bg-white border border-gray-200 rounded-lg p-1 shadow-lg">
              {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onReaction(message.id, emoji)}
                  className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
