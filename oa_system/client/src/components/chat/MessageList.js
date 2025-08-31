import React, { useState } from 'react';
import './MessageList.css';

const MessageList = ({ messages, currentUser, onAddReaction }) => {
    const [selectedMessage, setSelectedMessage] = useState(null);

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            return date.toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const isImageFile = (mimetype) => {
        return mimetype && mimetype.startsWith('image/');
    };

    const handleMessageClick = (messageId) => {
        setSelectedMessage(selectedMessage === messageId ? null : messageId);
    };

    const handleReaction = (messageId, emoji) => {
        onAddReaction(messageId, emoji);
        setSelectedMessage(null);
    };

    const renderMessage = (message) => {
        const isOwn = message.sender._id === currentUser._id;
        const showReactions = selectedMessage === message._id;

        return (
            <div
                key={message._id}
                className={`message ${isOwn ? 'own' : 'other'}`}
                onClick={() => handleMessageClick(message._id)}
            >
                {/* 发送者头像和信息 */}
                {!isOwn && (
                    <div className="message-avatar">
                        <img
                            src={message.sender.avatar || '/default-avatar.png'}
                            alt={message.sender.name}
                            className="avatar"
                        />
                    </div>
                )}

                <div className="message-content">
                    {/* 发送者姓名 */}
                    {!isOwn && (
                        <div className="message-sender">
                            {message.sender.name}
                        </div>
                    )}

                    {/* 回复消息 */}
                    {message.replyTo && (
                        <div className="message-reply">
                            <div className="reply-indicator">
                                回复: {message.replyTo.content || '文件消息'}
                            </div>
                        </div>
                    )}

                    {/* 消息主体 */}
                    <div className="message-body">
                        {message.messageType === 'text' && (
                            <div className="message-text">
                                {message.content}
                            </div>
                        )}

                        {(message.messageType === 'file' || message.messageType === 'image') && (
                            <div className="message-file">
                                {isImageFile(message.file?.mimetype) ? (
                                    <div className="image-message">
                                        <img
                                            src={message.fileUrl}
                                            alt={message.fileName}
                                            className="message-image"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // 打开图片预览
                                                window.open(message.fileUrl, '_blank');
                                            }}
                                        />
                                        <div className="image-info">
                                            <span className="file-name">{message.fileName}</span>
                                            <span className="file-size">
                                                {formatFileSize(message.fileSize)}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="file-message">
                                        <div className="file-icon">
                                            📄
                                        </div>
                                        <div className="file-info">
                                            <div className="file-name">{message.fileName}</div>
                                            <div className="file-size">
                                                {formatFileSize(message.fileSize)}
                                            </div>
                                        </div>
                                        <a
                                            href={message.fileUrl}
                                            download={message.fileName}
                                            className="file-download"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            下载
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        {message.messageType === 'system' && (
                            <div className="message-system">
                                {message.content}
                            </div>
                        )}
                    </div>

                    {/* 消息反应 */}
                    {message.reactions && message.reactions.length > 0 && (
                        <div className="message-reactions">
                            {message.reactions.reduce((acc, reaction) => {
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
                                <span
                                    key={index}
                                    className="reaction"
                                    title={`${reaction.users.length} 人`}
                                >
                                    {reaction.emoji} {reaction.count}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* 消息时间和状态 */}
                    <div className="message-meta">
                        <span className="message-time">
                            {formatTime(message.createdAt)}
                        </span>
                        {message.edited && (
                            <span className="message-edited">已编辑</span>
                        )}
                        {isOwn && message.readBy && (
                            <span className="message-read-status">
                                {message.readBy.length > 1 ? '已读' : '未读'}
                            </span>
                        )}
                    </div>

                    {/* 反应选择器 */}
                    {showReactions && (
                        <div className="reaction-picker">
                            {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
                                <button
                                    key={emoji}
                                    className="reaction-button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleReaction(message._id, emoji);
                                    }}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const groupMessagesByDate = (messages) => {
        const groups = [];
        let currentDate = null;
        let currentGroup = [];

        messages.forEach(message => {
            const messageDate = new Date(message.createdAt).toDateString();
            
            if (messageDate !== currentDate) {
                if (currentGroup.length > 0) {
                    groups.push({
                        date: currentDate,
                        messages: currentGroup
                    });
                }
                currentDate = messageDate;
                currentGroup = [message];
            } else {
                currentGroup.push(message);
            }
        });

        if (currentGroup.length > 0) {
            groups.push({
                date: currentDate,
                messages: currentGroup
            });
        }

        return groups;
    };

    const formatDateHeader = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return '今天';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return '昨天';
        } else {
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    };

    if (!messages || messages.length === 0) {
        return (
            <div className="message-list empty">
                <div className="empty-state">
                    <p>还没有消息，开始聊天吧！</p>
                </div>
            </div>
        );
    }

    const messageGroups = groupMessagesByDate(messages);

    return (
        <div className="message-list">
            {messageGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="message-group">
                    {/* 日期分隔符 */}
                    <div className="date-separator">
                        <span className="date-text">
                            {formatDateHeader(group.date)}
                        </span>
                    </div>

                    {/* 该日期的消息 */}
                    {group.messages.map(message => renderMessage(message))}
                </div>
            ))}
        </div>
    );
};

export default MessageList;
