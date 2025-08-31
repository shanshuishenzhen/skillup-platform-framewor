import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../../context/auth/AuthContext';
import './ChatRoomList.css';

const ChatRoomList = ({ onRoomSelect, selectedRoomId }) => {
    const { user } = useContext(AuthContext);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [showCreateForm, setShowCreateForm] = useState(false);

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/messages/rooms');
            if (response.data.success) {
                setRooms(response.data.rooms);
            }
        } catch (error) {
            console.error('获取聊天室列表失败:', error);
            setError('获取聊天室列表失败');
        } finally {
            setLoading(false);
        }
    };

    const createRoom = async (roomData) => {
        try {
            const response = await axios.post('/api/messages/rooms', roomData);
            if (response.data.success) {
                setRooms(prev => [response.data.room, ...prev]);
                setShowCreateForm(false);
                onRoomSelect(response.data.room);
            }
        } catch (error) {
            console.error('创建聊天室失败:', error);
            alert('创建聊天室失败');
        }
    };

    const startPrivateChat = async (userId) => {
        try {
            const response = await axios.post('/api/messages/rooms/private', {
                userId: userId
            });
            if (response.data.success) {
                const existingRoom = rooms.find(room => room.id === response.data.room.id);
                if (!existingRoom) {
                    setRooms(prev => [response.data.room, ...prev]);
                }
                onRoomSelect(response.data.room);
            }
        } catch (error) {
            console.error('创建私聊失败:', error);
            alert('创建私聊失败');
        }
    };

    const formatLastActivity = (timestamp) => {
        if (!timestamp) return '';
        
        const now = new Date();
        const activityTime = new Date(timestamp);
        const diffInHours = (now - activityTime) / (1000 * 60 * 60);
        
        if (diffInHours < 1) {
            const minutes = Math.floor(diffInHours * 60);
            return `${minutes}分钟前`;
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}小时前`;
        } else {
            const days = Math.floor(diffInHours / 24);
            return `${days}天前`;
        }
    };

    const getRoomDisplayName = (room) => {
        if (room.type === 'private') {
            const otherMember = room.members.find(member => 
                member.user.id !== user._id
            );
            return otherMember ? otherMember.user.name : '私聊';
        }
        return room.name;
    };

    const getRoomAvatar = (room) => {
        if (room.type === 'private') {
            const otherMember = room.members.find(member => 
                member.user.id !== user._id
            );
            return otherMember ? otherMember.user.avatar : '/default-avatar.png';
        }
        return room.avatar || '/default-room-avatar.png';
    };

    const filteredRooms = rooms.filter(room => {
        const matchesSearch = getRoomDisplayName(room)
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        
        const matchesFilter = filterType === 'all' || room.type === filterType;
        
        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <div className="chat-room-list loading">
                <div className="loading-spinner">加载中...</div>
            </div>
        );
    }

    return (
        <div className="chat-room-list">
            {/* 头部 */}
            <div className="room-list-header">
                <h3>聊天</h3>
                <button
                    className="create-room-btn"
                    onClick={() => setShowCreateForm(true)}
                    title="创建群聊"
                >
                    ➕
                </button>
            </div>

            {/* 搜索和筛选 */}
            <div className="room-list-controls">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="搜索聊天室..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterType('all')}
                    >
                        全部
                    </button>
                    <button
                        className={`filter-tab ${filterType === 'private' ? 'active' : ''}`}
                        onClick={() => setFilterType('private')}
                    >
                        私聊
                    </button>
                    <button
                        className={`filter-tab ${filterType === 'group' ? 'active' : ''}`}
                        onClick={() => setFilterType('group')}
                    >
                        群聊
                    </button>
                </div>
            </div>

            {/* 聊天室列表 */}
            <div className="room-list">
                {filteredRooms.map(room => (
                    <div
                        key={room.id}
                        className={`room-item ${selectedRoomId === room.id ? 'selected' : ''}`}
                        onClick={() => onRoomSelect(room)}
                    >
                        <div className="room-avatar">
                            <img
                                src={getRoomAvatar(room)}
                                alt={getRoomDisplayName(room)}
                                className="avatar"
                            />
                            {room.onlineMemberCount > 0 && (
                                <span className="online-indicator">
                                    {room.onlineMemberCount}
                                </span>
                            )}
                        </div>

                        <div className="room-info">
                            <div className="room-header">
                                <span className="room-name">
                                    {getRoomDisplayName(room)}
                                </span>
                                <span className="room-time">
                                    {formatLastActivity(room.lastActivity)}
                                </span>
                            </div>

                            <div className="room-preview">
                                {room.lastMessage ? (
                                    <span className="last-message">
                                        {room.lastMessage.messageType === 'text' 
                                            ? room.lastMessage.content 
                                            : '[文件]'
                                        }
                                    </span>
                                ) : (
                                    <span className="no-message">暂无消息</span>
                                )}
                                
                                {room.unreadCount > 0 && (
                                    <span className="unread-badge">
                                        {room.unreadCount > 99 ? '99+' : room.unreadCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredRooms.length === 0 && (
                    <div className="empty-state">
                        {searchTerm ? (
                            <p>没有找到匹配的聊天室</p>
                        ) : (
                            <div>
                                <p>还没有聊天室</p>
                                <button
                                    className="create-first-room-btn"
                                    onClick={() => setShowCreateForm(true)}
                                >
                                    创建第一个群聊
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 创建聊天室表单 */}
            {showCreateForm && (
                <CreateRoomForm
                    onSubmit={createRoom}
                    onCancel={() => setShowCreateForm(false)}
                />
            )}

            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={fetchRooms}>重试</button>
                </div>
            )}
        </div>
    );
};

// 创建聊天室表单组件
const CreateRoomForm = ({ onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'group'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('请输入聊天室名称');
            return;
        }
        onSubmit(formData);
    };

    return (
        <div className="create-room-modal">
            <div className="modal-content">
                <div className="modal-header">
                    <h4>创建聊天室</h4>
                    <button className="close-btn" onClick={onCancel}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="create-room-form">
                    <div className="form-group">
                        <label>聊天室名称</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                name: e.target.value
                            }))}
                            placeholder="输入聊天室名称"
                            maxLength={50}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>描述 (可选)</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                description: e.target.value
                            }))}
                            placeholder="输入聊天室描述"
                            maxLength={200}
                            rows={3}
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onCancel} className="cancel-btn">
                            取消
                        </button>
                        <button type="submit" className="submit-btn">
                            创建
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChatRoomList;
