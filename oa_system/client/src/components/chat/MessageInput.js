import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './MessageInput.css';

const MessageInput = ({ onSendMessage, onTyping, onStopTyping }) => {
    const [message, setMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        // 自动调整文本框高度
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [message]);

    const handleInputChange = (e) => {
        setMessage(e.target.value);
        
        // 处理正在输入状态
        if (onTyping) {
            onTyping();
        }
        
        // 清除之前的定时器
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        
        // 设置新的定时器，2秒后停止输入状态
        typingTimeoutRef.current = setTimeout(() => {
            if (onStopTyping) {
                onStopTyping();
            }
        }, 2000);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSendMessage = () => {
        const trimmedMessage = message.trim();
        if (!trimmedMessage) return;

        const messageData = {
            content: trimmedMessage,
            messageType: 'text'
        };

        if (replyTo) {
            messageData.replyTo = replyTo._id;
        }

        onSendMessage(messageData);
        setMessage('');
        setReplyTo(null);
        
        // 停止输入状态
        if (onStopTyping) {
            onStopTyping();
        }
        
        // 清除定时器
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 检查文件大小 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('文件大小不能超过10MB');
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('description', `聊天文件: ${file.name}`);

            const response = await axios.post('/api/files/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                const uploadedFile = response.data.file;
                
                const messageData = {
                    messageType: uploadedFile.category === 'image' ? 'image' : 'file',
                    fileId: uploadedFile._id
                };

                if (replyTo) {
                    messageData.replyTo = replyTo._id;
                }

                onSendMessage(messageData);
                setReplyTo(null);
            }
        } catch (error) {
            console.error('文件上传失败:', error);
            alert('文件上传失败，请重试');
        } finally {
            setIsUploading(false);
            // 清空文件输入
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const insertEmoji = (emoji) => {
        setMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
        textareaRef.current?.focus();
    };

    const commonEmojis = [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
        '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
        '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
        '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
        '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
        '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
        '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
        '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
        '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️',
        '🖖', '👋', '🤝', '👏', '🙌', '👐', '🤲', '🤜'
    ];

    return (
        <div className="message-input-container">
            {/* 回复预览 */}
            {replyTo && (
                <div className="reply-preview">
                    <div className="reply-content">
                        <span className="reply-label">回复 {replyTo.sender.name}:</span>
                        <span className="reply-text">
                            {replyTo.content || '文件消息'}
                        </span>
                    </div>
                    <button
                        className="reply-cancel"
                        onClick={() => setReplyTo(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            <div className="message-input">
                {/* 工具栏 */}
                <div className="input-toolbar">
                    {/* 文件上传 */}
                    <button
                        className="toolbar-button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        title="上传文件"
                    >
                        {isUploading ? '⏳' : '📎'}
                    </button>

                    {/* 表情选择器 */}
                    <div className="emoji-picker-container">
                        <button
                            className="toolbar-button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            title="插入表情"
                        >
                            😀
                        </button>
                        
                        {showEmojiPicker && (
                            <div className="emoji-picker">
                                <div className="emoji-grid">
                                    {commonEmojis.map((emoji, index) => (
                                        <button
                                            key={index}
                                            className="emoji-button"
                                            onClick={() => insertEmoji(emoji)}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 文本输入区域 */}
                <div className="input-area">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        placeholder="输入消息... (Enter发送，Shift+Enter换行)"
                        className="message-textarea"
                        rows="1"
                        disabled={isUploading}
                    />
                    
                    <button
                        className="send-button"
                        onClick={handleSendMessage}
                        disabled={!message.trim() || isUploading}
                        title="发送消息"
                    >
                        {isUploading ? '⏳' : '➤'}
                    </button>
                </div>

                {/* 隐藏的文件输入 */}
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                />
            </div>

            {/* 上传进度提示 */}
            {isUploading && (
                <div className="upload-progress">
                    <span>正在上传文件...</span>
                </div>
            )}
        </div>
    );
};

export default MessageInput;
