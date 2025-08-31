/**
 * 简化的聊天界面组件 - 演示版本
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Search, 
  Users, 
  User,
  Paperclip,
  Smile,
  Phone,
  Video,
  Settings,
  Circle
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
  message_type: 'text' | 'file' | 'image' | 'system';
  created_at: string;
  is_own?: boolean;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'private' | 'group' | 'project';
  description?: string;
  avatar_url?: string;
  members: User[];
  last_message?: Message;
  unread_count?: number;
  created_at: string;
}

interface SimpleChatInterfaceProps {
  currentUser: User;
}

export default function SimpleChatInterface({ currentUser }: SimpleChatInterfaceProps) {
  // 状态管理
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 模拟数据
  const mockUsers: User[] = [
    { id: '1', name: '张三', email: 'zhangsan@example.com', status: 'online' },
    { id: '2', name: '李四', email: 'lisi@example.com', status: 'away' },
    { id: '3', name: '王五', email: 'wangwu@example.com', status: 'offline' },
    { id: '4', name: '赵六', email: 'zhaoliu@example.com', status: 'online' }
  ];

  const mockChatRooms: ChatRoom[] = [
    {
      id: 'room-1',
      name: '项目讨论组',
      type: 'group',
      description: '技能提升平台项目讨论',
      members: mockUsers,
      unread_count: 3,
      created_at: new Date().toISOString(),
      last_message: {
        id: 'msg-1',
        content: '今天的开发进度如何？',
        sender: mockUsers[0],
        message_type: 'text',
        created_at: new Date(Date.now() - 300000).toISOString()
      }
    },
    {
      id: 'room-2',
      name: '张三',
      type: 'private',
      members: [currentUser, mockUsers[0]],
      unread_count: 1,
      created_at: new Date().toISOString(),
      last_message: {
        id: 'msg-2',
        content: '你好，有时间聊聊吗？',
        sender: mockUsers[0],
        message_type: 'text',
        created_at: new Date(Date.now() - 600000).toISOString()
      }
    },
    {
      id: 'room-3',
      name: '技术交流',
      type: 'group',
      description: '技术问题讨论和分享',
      members: [currentUser, mockUsers[1], mockUsers[2]],
      unread_count: 0,
      created_at: new Date().toISOString(),
      last_message: {
        id: 'msg-3',
        content: '分享一个很有用的开发工具',
        sender: mockUsers[1],
        message_type: 'text',
        created_at: new Date(Date.now() - 1800000).toISOString()
      }
    }
  ];

  const mockMessages: { [key: string]: Message[] } = {
    'room-1': [
      {
        id: 'msg-1-1',
        content: '大家好，今天开始新的冲刺！',
        sender: mockUsers[0],
        message_type: 'text',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        is_own: false
      },
      {
        id: 'msg-1-2',
        content: '好的，我负责前端部分',
        sender: currentUser,
        message_type: 'text',
        created_at: new Date(Date.now() - 3300000).toISOString(),
        is_own: true
      },
      {
        id: 'msg-1-3',
        content: '我来处理后端API',
        sender: mockUsers[1],
        message_type: 'text',
        created_at: new Date(Date.now() - 3000000).toISOString(),
        is_own: false
      },
      {
        id: 'msg-1-4',
        content: '今天的开发进度如何？',
        sender: mockUsers[0],
        message_type: 'text',
        created_at: new Date(Date.now() - 300000).toISOString(),
        is_own: false
      }
    ],
    'room-2': [
      {
        id: 'msg-2-1',
        content: '你好！',
        sender: mockUsers[0],
        message_type: 'text',
        created_at: new Date(Date.now() - 1800000).toISOString(),
        is_own: false
      },
      {
        id: 'msg-2-2',
        content: '你好，有什么事吗？',
        sender: currentUser,
        message_type: 'text',
        created_at: new Date(Date.now() - 1500000).toISOString(),
        is_own: true
      },
      {
        id: 'msg-2-3',
        content: '你好，有时间聊聊吗？',
        sender: mockUsers[0],
        message_type: 'text',
        created_at: new Date(Date.now() - 600000).toISOString(),
        is_own: false
      }
    ],
    'room-3': [
      {
        id: 'msg-3-1',
        content: '有人用过新的React 18特性吗？',
        sender: mockUsers[1],
        message_type: 'text',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        is_own: false
      },
      {
        id: 'msg-3-2',
        content: '用过，Concurrent Features很不错',
        sender: currentUser,
        message_type: 'text',
        created_at: new Date(Date.now() - 6900000).toISOString(),
        is_own: true
      },
      {
        id: 'msg-3-3',
        content: '分享一个很有用的开发工具',
        sender: mockUsers[1],
        message_type: 'text',
        created_at: new Date(Date.now() - 1800000).toISOString(),
        is_own: false
      }
    ]
  };

  // 初始化数据
  useEffect(() => {
    setChatRooms(mockChatRooms);
    if (mockChatRooms.length > 0) {
      setSelectedRoom(mockChatRooms[0]);
      setMessages(mockMessages[mockChatRooms[0].id] || []);
    }
  }, []);

  // 选择聊天室
  const selectRoom = (room: ChatRoom) => {
    setSelectedRoom(room);
    setMessages(mockMessages[room.id] || []);
    
    // 清除未读计数
    setChatRooms(prev => prev.map(r => 
      r.id === room.id ? { ...r, unread_count: 0 } : r
    ));
    
    scrollToBottom();
  };

  // 发送消息
  const sendMessage = () => {
    if (!newMessage.trim() || !selectedRoom) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      content: newMessage.trim(),
      sender: currentUser,
      message_type: 'text',
      created_at: new Date().toISOString(),
      is_own: true
    };

    // 添加到消息列表
    setMessages(prev => [...prev, message]);
    
    // 更新聊天室最后消息
    setChatRooms(prev => prev.map(room => 
      room.id === selectedRoom.id 
        ? { ...room, last_message: message }
        : room
    ));

    setNewMessage('');
    scrollToBottom();
    
    toast.success('消息发送成功');
  };

  // 处理按键
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 滚动到底部
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return '刚刚';
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  // 获取在线状态颜色
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 pt-20">
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
                room.name.toLowerCase().includes(searchQuery.toLowerCase())
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
                          {room.last_message && formatTime(room.last_message.created_at)}
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
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        {selectedRoom.members.slice(0, 3).map((member, index) => (
                          <div key={member.id} className="flex items-center">
                            <Circle className={`w-2 h-2 ${getStatusColor(member.status)}`} />
                            {index < 2 && <span className="ml-1 mr-2">{member.name}</span>}
                          </div>
                        ))}
                      </div>
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
                  <div
                    key={message.id}
                    className={`flex ${message.is_own ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${message.is_own ? 'order-2' : 'order-1'}`}>
                      {!message.is_own && (
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
                        className={`px-4 py-2 rounded-lg ${
                          message.is_own
                            ? 'bg-blue-500 text-white'
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs opacity-75">
                            {formatTime(message.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                </div>
                <Button size="sm" variant="ghost">
                  <Smile className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
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
