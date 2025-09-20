import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/auth/AuthContext';
import ChatRoomList from './ChatRoomList';
import ChatWindow from './ChatWindow';
import './Chat.css';

const Chat = () => {
    const { user } = useContext(AuthContext);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [showRoomList, setShowRoomList] = useState(true);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            
            // 移动端默认显示聊天室列表
            if (mobile && !selectedRoom) {
                setShowRoomList(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [selectedRoom]);

    const handleRoomSelect = (room) => {
        setSelectedRoom(room);
        
        // 移动端选择房间后隐藏房间列表
        if (isMobile) {
            setShowRoomList(false);
        }
    };

    const handleBackToRoomList = () => {
        if (isMobile) {
            setSelectedRoom(null);
            setShowRoomList(true);
        }
    };

    const handleCloseChatWindow = () => {
        setSelectedRoom(null);
        if (isMobile) {
            setShowRoomList(true);
        }
    };

    if (!user) {
        return (
            <div className="chat-container">
                <div className="chat-login-prompt">
                    <h3>请先登录</h3>
                    <p>登录后即可使用聊天功能</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-container">
            {/* 移动端头部导航 */}
            {isMobile && (
                <div className="mobile-chat-header">
                    {selectedRoom ? (
                        <div className="chat-header-content">
                            <button 
                                className="back-btn"
                                onClick={handleBackToRoomList}
                            >
                                ← 返回
                            </button>
                            <span className="room-title">
                                {selectedRoom.type === 'private' 
                                    ? selectedRoom.members.find(m => m.user.id !== user._id)?.user.name || '私聊'
                                    : selectedRoom.name
                                }
                            </span>
                        </div>
                    ) : (
                        <div className="chat-header-content">
                            <h3>聊天</h3>
                        </div>
                    )}
                </div>
            )}

            <div className="chat-content">
                {/* 聊天室列表 */}
                <div className={`chat-sidebar ${isMobile && !showRoomList ? 'hidden' : ''}`}>
                    <ChatRoomList
                        onRoomSelect={handleRoomSelect}
                        selectedRoomId={selectedRoom?.id}
                    />
                </div>

                {/* 聊天窗口 */}
                <div className={`chat-main ${isMobile && showRoomList ? 'hidden' : ''}`}>
                    {selectedRoom ? (
                        <ChatWindow
                            roomId={selectedRoom.id}
                            onClose={handleCloseChatWindow}
                        />
                    ) : (
                        <div className="chat-welcome">
                            <div className="welcome-content">
                                <div className="welcome-icon">💬</div>
                                <h3>欢迎使用聊天功能</h3>
                                <p>选择一个聊天室开始对话，或创建新的群聊</p>
                                
                                <div className="welcome-features">
                                    <div className="feature-item">
                                        <span className="feature-icon">🚀</span>
                                        <span>实时消息</span>
                                    </div>
                                    <div className="feature-item">
                                        <span className="feature-icon">📁</span>
                                        <span>文件分享</span>
                                    </div>
                                    <div className="feature-item">
                                        <span className="feature-icon">👥</span>
                                        <span>群组聊天</span>
                                    </div>
                                    <div className="feature-item">
                                        <span className="feature-icon">🔒</span>
                                        <span>私密对话</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 快捷操作按钮 (移动端) */}
            {isMobile && (
                <div className="mobile-chat-actions">
                    <button 
                        className="action-btn"
                        onClick={() => setShowRoomList(!showRoomList)}
                        title={showRoomList ? "查看聊天" : "查看聊天室列表"}
                    >
                        {showRoomList ? "💬" : "📋"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default Chat;
