import React, { useState } from 'react';
import './UserList.css';

const UserList = ({ users = [], roomMembers = [], onStartPrivateChat }) => {
    const [showAllMembers, setShowAllMembers] = useState(false);

    const formatLastSeen = (lastSeen) => {
        if (!lastSeen) return '从未在线';
        
        const now = new Date();
        const lastSeenDate = new Date(lastSeen);
        const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
        
        if (diffInMinutes < 5) {
            return '在线';
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes}分钟前`;
        } else if (diffInMinutes < 1440) {
            const hours = Math.floor(diffInMinutes / 60);
            return `${hours}小时前`;
        } else {
            const days = Math.floor(diffInMinutes / 1440);
            return `${days}天前`;
        }
    };

    const isUserOnline = (lastSeen) => {
        if (!lastSeen) return false;
        const now = new Date();
        const lastSeenDate = new Date(lastSeen);
        const diffInMinutes = (now - lastSeenDate) / (1000 * 60);
        return diffInMinutes < 5; // 5分钟内算在线
    };

    const getUserStatus = (user) => {
        const onlineUser = users.find(u => u.userId === user.user.id || u.userId === user.user._id);
        if (onlineUser) {
            return {
                isOnline: true,
                lastSeen: onlineUser.lastSeen || new Date()
            };
        }
        
        return {
            isOnline: isUserOnline(user.lastSeen),
            lastSeen: user.lastSeen
        };
    };

    const handleUserClick = (user) => {
        if (onStartPrivateChat) {
            onStartPrivateChat(user.user.id || user.user._id);
        }
    };

    const displayMembers = showAllMembers ? roomMembers : roomMembers.slice(0, 10);

    return (
        <div className="user-list">
            <div className="user-list-header">
                <h4>成员列表</h4>
                <span className="member-count">
                    {roomMembers.length} 人
                </span>
            </div>

            <div className="online-status">
                <div className="status-item">
                    <span className="status-dot online"></span>
                    <span>在线: {users.length}</span>
                </div>
                <div className="status-item">
                    <span className="status-dot offline"></span>
                    <span>离线: {roomMembers.length - users.length}</span>
                </div>
            </div>

            <div className="members-list">
                {displayMembers.map((member) => {
                    const status = getUserStatus(member);
                    const user = member.user;
                    
                    return (
                        <div
                            key={user.id || user._id}
                            className={`member-item ${status.isOnline ? 'online' : 'offline'}`}
                            onClick={() => handleUserClick(member)}
                            title={`点击与 ${user.name} 私聊`}
                        >
                            <div className="member-avatar">
                                <img
                                    src={user.avatar || '/default-avatar.png'}
                                    alt={user.name}
                                    className="avatar"
                                />
                                <span className={`status-indicator ${status.isOnline ? 'online' : 'offline'}`}></span>
                            </div>

                            <div className="member-info">
                                <div className="member-name">
                                    {user.name}
                                    {member.role === 'owner' && (
                                        <span className="role-badge owner">群主</span>
                                    )}
                                    {member.role === 'admin' && (
                                        <span className="role-badge admin">管理员</span>
                                    )}
                                </div>
                                <div className="member-status">
                                    {formatLastSeen(status.lastSeen)}
                                </div>
                            </div>

                            <div className="member-actions">
                                <button
                                    className="action-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUserClick(member);
                                    }}
                                    title="发起私聊"
                                >
                                    💬
                                </button>
                            </div>
                        </div>
                    );
                })}

                {roomMembers.length > 10 && (
                    <button
                        className="show-more-btn"
                        onClick={() => setShowAllMembers(!showAllMembers)}
                    >
                        {showAllMembers ? '收起' : `查看更多 (${roomMembers.length - 10})`}
                    </button>
                )}
            </div>

            {roomMembers.length === 0 && (
                <div className="empty-state">
                    <p>暂无成员</p>
                </div>
            )}
        </div>
    );
};

export default UserList;
