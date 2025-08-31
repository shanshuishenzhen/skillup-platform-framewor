import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import AuthContext from '../../context/auth/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';
import './ChatWindow.css';

const ChatWindow = ({ roomId, onClose }) => {
    const { user, token } = useContext(AuthContext);
    const [room, setRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!roomId || !token) return;

        // 初始化Socket连接
        initializeSocket();
        
        // 获取房间信息
        fetchRoomData();
        
        // 获取消息历史
        fetchMessages();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [roomId, token]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const initializeSocket = () => {
        socketRef.current = io('http://localhost:5000', {
            auth: {
                token: token
            }
        });

        // 连接成功
        socketRef.current.on('connect', () => {
            console.log('Socket连接成功');
            // 加入房间
            socketRef.current.emit('join_room', { roomId });
        });

        // 房间加入成功
        socketRef.current.on('room_joined', (data) => {
            setOnlineUsers(data.onlineMembers);
        });

        // 新消息
        socketRef.current.on('new_message', (data) => {
            if (data.roomId === roomId) {
                setMessages(prev => [...prev, data.message]);
                // 如果不是自己发送的消息，标记为已读
                if (data.message.sender._id !== user._id) {
                    markMessageAsRead(data.message._id);
                }
            }
        });

        // 用户加入房间
        socketRef.current.on('user_joined_room', (data) => {
            if (data.roomId === roomId) {
                setOnlineUsers(prev => [...prev, {
                    userId: data.userId,
                    user: data.user
                }]);
            }
        });

        // 用户离开房间
        socketRef.current.on('user_left_room', (data) => {
            if (data.roomId === roomId) {
                setOnlineUsers(prev => 
                    prev.filter(u => u.userId !== data.userId)
                );
            }
        });

        // 用户正在输入
        socketRef.current.on('user_typing', (data) => {
            if (data.roomId === roomId && data.userId !== user._id) {
                setTypingUsers(prev => {
                    if (!prev.find(u => u.userId === data.userId)) {
                        return [...prev, data];
                    }
                    return prev;
                });
            }
        });

        // 用户停止输入
        socketRef.current.on('user_stop_typing', (data) => {
            if (data.roomId === roomId) {
                setTypingUsers(prev => 
                    prev.filter(u => u.userId !== data.userId)
                );
            }
        });

        // 消息已读
        socketRef.current.on('message_read', (data) => {
            if (data.roomId === roomId) {
                setMessages(prev => prev.map(msg => {
                    if (msg._id === data.messageId) {
                        const readBy = msg.readBy || [];
                        if (!readBy.find(r => r.user === data.userId)) {
                            return {
                                ...msg,
                                readBy: [...readBy, {
                                    user: data.userId,
                                    readAt: new Date()
                                }]
                            };
                        }
                    }
                    return msg;
                }));
            }
        });

        // 反应添加
        socketRef.current.on('reaction_added', (data) => {
            if (data.roomId === roomId) {
                setMessages(prev => prev.map(msg => {
                    if (msg._id === data.messageId) {
                        const reactions = msg.reactions || [];
                        return {
                            ...msg,
                            reactions: [...reactions, {
                                user: data.userId,
                                emoji: data.emoji,
                                createdAt: new Date()
                            }]
                        };
                    }
                    return msg;
                }));
            }
        });

        // 错误处理
        socketRef.current.on('error', (error) => {
            console.error('Socket错误:', error);
            setError(error.message);
        });

        // 连接错误
        socketRef.current.on('connect_error', (error) => {
            console.error('Socket连接错误:', error);
            setError('连接失败，请检查网络');
        });
    };

    const fetchRoomData = async () => {
        try {
            const response = await axios.get(`/api/messages/rooms/${roomId}`);
            if (response.data.success) {
                setRoom(response.data.room);
            }
        } catch (error) {
            console.error('获取房间信息失败:', error);
            setError('获取房间信息失败');
        }
    };

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/messages/rooms/${roomId}/messages`);
            if (response.data.success) {
                setMessages(response.data.messages);
            }
        } catch (error) {
            console.error('获取消息失败:', error);
            setError('获取消息失败');
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = (messageData) => {
        if (socketRef.current) {
            socketRef.current.emit('send_message', {
                roomId,
                ...messageData
            });
        }
    };

    const markMessageAsRead = (messageId) => {
        if (socketRef.current) {
            socketRef.current.emit('mark_read', {
                messageId,
                roomId
            });
        }
    };

    const handleTyping = () => {
        if (socketRef.current) {
            socketRef.current.emit('typing', { roomId });
        }
    };

    const handleStopTyping = () => {
        if (socketRef.current) {
            socketRef.current.emit('stop_typing', { roomId });
        }
    };

    const addReaction = (messageId, emoji) => {
        if (socketRef.current) {
            socketRef.current.emit('add_reaction', {
                messageId,
                emoji,
                roomId
            });
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    if (loading) {
        return (
            <div className="chat-window loading">
                <div className="loading-spinner">加载中...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="chat-window error">
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>
                        重新加载
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-window">
            {/* 聊天室头部 */}
            <div className="chat-header">
                <div className="room-info">
                    <h3>{room?.name}</h3>
                    <span className="member-count">
                        {onlineUsers.length} 人在线
                    </span>
                </div>
                <div className="chat-actions">
                    <button 
                        className="btn-close"
                        onClick={onClose}
                        title="关闭聊天"
                    >
                        ×
                    </button>
                </div>
            </div>

            <div className="chat-body">
                {/* 消息列表 */}
                <div className="messages-container">
                    <MessageList 
                        messages={messages}
                        currentUser={user}
                        onAddReaction={addReaction}
                    />
                    
                    {/* 正在输入指示器 */}
                    {typingUsers.length > 0 && (
                        <div className="typing-indicator">
                            {typingUsers.map(u => u.user.name).join(', ')} 正在输入...
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>

                {/* 在线用户列表 */}
                <div className="sidebar">
                    <UserList 
                        users={onlineUsers}
                        roomMembers={room?.members || []}
                    />
                </div>
            </div>

            {/* 消息输入 */}
            <div className="chat-footer">
                <MessageInput 
                    onSendMessage={sendMessage}
                    onTyping={handleTyping}
                    onStopTyping={handleStopTyping}
                />
            </div>
        </div>
    );
};

export default ChatWindow;
