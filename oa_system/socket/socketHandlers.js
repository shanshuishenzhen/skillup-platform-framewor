const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const File = require('../models/File');

// JWT密钥 (应该从环境变量获取)
const JWT_SECRET = 'your_jwt_secret_key';

// 在线用户管理
const onlineUsers = new Map(); // userId -> { socketId, lastSeen, rooms: Set }
const userSockets = new Map(); // socketId -> userId

// Socket.io 认证中间件
const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        
        if (!token) {
            return next(new Error('认证失败：缺少token'));
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.user.id).select('-password');
        
        if (!user) {
            return next(new Error('认证失败：用户不存在'));
        }
        
        socket.userId = user._id.toString();
        socket.user = user;
        next();
        
    } catch (error) {
        console.error('Socket认证错误:', error);
        next(new Error('认证失败'));
    }
};

// 初始化Socket.io处理器
const initializeSocketHandlers = (io) => {
    // 使用认证中间件
    io.use(authenticateSocket);
    
    io.on('connection', (socket) => {
        console.log(`用户 ${socket.user.name} 已连接 (${socket.id})`);
        
        // 用户上线处理
        handleUserOnline(socket);
        
        // 加入房间
        socket.on('join_room', (data) => handleJoinRoom(socket, data));
        
        // 离开房间
        socket.on('leave_room', (data) => handleLeaveRoom(socket, data));
        
        // 发送消息
        socket.on('send_message', (data) => handleSendMessage(socket, io, data));
        
        // 正在输入
        socket.on('typing', (data) => handleTyping(socket, data));
        
        // 停止输入
        socket.on('stop_typing', (data) => handleStopTyping(socket, data));
        
        // 标记消息已读
        socket.on('mark_read', (data) => handleMarkRead(socket, io, data));
        
        // 消息反应
        socket.on('add_reaction', (data) => handleAddReaction(socket, io, data));
        
        // 文件上传通知
        socket.on('file_uploaded', (data) => handleFileUploaded(socket, io, data));
        
        // 用户断开连接
        socket.on('disconnect', () => handleUserOffline(socket, io));
        
        // 错误处理
        socket.on('error', (error) => {
            console.error('Socket错误:', error);
        });
    });
};

// 用户上线处理
const handleUserOnline = (socket) => {
    const userId = socket.userId;
    
    // 更新在线用户信息
    onlineUsers.set(userId, {
        socketId: socket.id,
        lastSeen: new Date(),
        rooms: new Set()
    });
    
    userSockets.set(socket.id, userId);
    
    // 通知用户的朋友其上线状态
    socket.broadcast.emit('user_online', {
        userId: userId,
        user: {
            id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar
        }
    });
};

// 用户下线处理
const handleUserOffline = (socket, io) => {
    const userId = socket.userId;
    
    if (userId) {
        // 通知用户离开的所有房间
        const userInfo = onlineUsers.get(userId);
        if (userInfo && userInfo.rooms) {
            userInfo.rooms.forEach(roomId => {
                socket.to(roomId).emit('user_left_room', {
                    userId: userId,
                    user: socket.user,
                    roomId: roomId
                });
            });
        }
        
        // 清理在线用户信息
        onlineUsers.delete(userId);
        userSockets.delete(socket.id);
        
        // 通知用户下线
        socket.broadcast.emit('user_offline', {
            userId: userId,
            user: {
                id: socket.user._id,
                name: socket.user.name,
                avatar: socket.user.avatar
            }
        });
    }
    
    console.log(`用户 ${socket.user?.name || 'Unknown'} 已断开连接 (${socket.id})`);
};

// 加入房间
const handleJoinRoom = async (socket, data) => {
    try {
        const { roomId } = data;
        
        if (!roomId) {
            return socket.emit('error', { message: '房间ID不能为空' });
        }
        
        // 检查房间权限
        const room = await ChatRoom.findById(roomId);
        if (!room || !room.hasPermission(socket.userId, 'read')) {
            return socket.emit('error', { message: '没有访问权限' });
        }
        
        // 加入Socket.io房间
        socket.join(roomId);
        
        // 更新用户房间信息
        const userInfo = onlineUsers.get(socket.userId);
        if (userInfo) {
            userInfo.rooms.add(roomId);
        }
        
        // 更新用户在房间的最后在线时间
        await room.updateMemberLastSeen(socket.userId);
        
        // 通知房间其他成员
        socket.to(roomId).emit('user_joined_room', {
            userId: socket.userId,
            user: socket.user,
            roomId: roomId
        });
        
        // 获取房间在线成员
        const onlineMembers = getOnlineRoomMembers(roomId);
        
        socket.emit('room_joined', {
            roomId: roomId,
            onlineMembers: onlineMembers
        });
        
    } catch (error) {
        console.error('加入房间错误:', error);
        socket.emit('error', { message: '加入房间失败' });
    }
};

// 离开房间
const handleLeaveRoom = (socket, data) => {
    const { roomId } = data;
    
    if (!roomId) {
        return socket.emit('error', { message: '房间ID不能为空' });
    }
    
    // 离开Socket.io房间
    socket.leave(roomId);
    
    // 更新用户房间信息
    const userInfo = onlineUsers.get(socket.userId);
    if (userInfo) {
        userInfo.rooms.delete(roomId);
    }
    
    // 通知房间其他成员
    socket.to(roomId).emit('user_left_room', {
        userId: socket.userId,
        user: socket.user,
        roomId: roomId
    });
};

// 发送消息
const handleSendMessage = async (socket, io, data) => {
    try {
        const {
            roomId,
            content,
            messageType = 'text',
            fileId = null,
            replyTo = null
        } = data;
        
        if (!roomId) {
            return socket.emit('error', { message: '房间ID不能为空' });
        }
        
        // 检查房间权限
        const room = await ChatRoom.findById(roomId);
        if (!room || !room.hasPermission(socket.userId, 'write')) {
            return socket.emit('error', { message: '没有发送消息权限' });
        }
        
        // 创建消息
        const messageData = {
            sender: socket.userId,
            room: roomId,
            messageType,
            content: messageType === 'text' ? content : undefined
        };
        
        if (fileId) {
            const file = await File.findById(fileId);
            if (file) {
                messageData.file = fileId;
                messageData.fileUrl = file.url;
                messageData.fileName = file.originalName;
                messageData.fileSize = file.size;
            }
        }
        
        if (replyTo) {
            messageData.replyTo = replyTo;
        }
        
        const message = new Message(messageData);
        await message.save();
        
        // 更新房间最后活动时间
        await room.updateLastActivity(message._id);
        
        // 填充关联数据
        await message.populate('sender', 'name email avatar');
        await message.populate('file', 'filename originalName size mimetype');
        await message.populate('replyTo', 'content sender messageType');
        
        // 发送给房间所有成员
        io.to(roomId).emit('new_message', {
            message: message,
            roomId: roomId
        });
        
        // 发送推送通知给离线用户
        await sendPushNotification(room, message, socket.userId);
        
    } catch (error) {
        console.error('发送消息错误:', error);
        socket.emit('error', { message: '发送消息失败' });
    }
};

// 正在输入处理
const handleTyping = (socket, data) => {
    const { roomId } = data;
    
    if (!roomId) {
        return socket.emit('error', { message: '房间ID不能为空' });
    }
    
    socket.to(roomId).emit('user_typing', {
        userId: socket.userId,
        user: socket.user,
        roomId: roomId
    });
};

// 停止输入处理
const handleStopTyping = (socket, data) => {
    const { roomId } = data;
    
    if (!roomId) {
        return socket.emit('error', { message: '房间ID不能为空' });
    }
    
    socket.to(roomId).emit('user_stop_typing', {
        userId: socket.userId,
        user: socket.user,
        roomId: roomId
    });
};

// 标记消息已读
const handleMarkRead = async (socket, io, data) => {
    try {
        const { messageId, roomId } = data;
        
        if (messageId) {
            // 标记单个消息已读
            const message = await Message.findById(messageId);
            if (message) {
                await message.markAsRead(socket.userId);
                
                io.to(roomId).emit('message_read', {
                    messageId: messageId,
                    userId: socket.userId,
                    roomId: roomId
                });
            }
        } else if (roomId) {
            // 标记房间所有消息已读
            await Message.markRoomAsRead(roomId, socket.userId);
            
            io.to(roomId).emit('room_read', {
                userId: socket.userId,
                roomId: roomId
            });
        }
        
    } catch (error) {
        console.error('标记已读错误:', error);
        socket.emit('error', { message: '标记已读失败' });
    }
};

// 添加消息反应
const handleAddReaction = async (socket, io, data) => {
    try {
        const { messageId, emoji, roomId } = data;
        
        const message = await Message.findById(messageId);
        if (!message) {
            return socket.emit('error', { message: '消息不存在' });
        }
        
        await message.addReaction(socket.userId, emoji);
        
        io.to(roomId).emit('reaction_added', {
            messageId: messageId,
            userId: socket.userId,
            emoji: emoji,
            roomId: roomId
        });
        
    } catch (error) {
        console.error('添加反应错误:', error);
        socket.emit('error', { message: '添加反应失败' });
    }
};

// 文件上传通知
const handleFileUploaded = async (socket, io, data) => {
    try {
        const { fileId, roomId } = data;
        
        const file = await File.findById(fileId)
            .populate('uploadedBy', 'name email avatar');
        
        if (!file) {
            return socket.emit('error', { message: '文件不存在' });
        }
        
        // 通知房间成员有新文件上传
        io.to(roomId).emit('file_uploaded', {
            file: file,
            roomId: roomId
        });
        
    } catch (error) {
        console.error('文件上传通知错误:', error);
        socket.emit('error', { message: '文件上传通知失败' });
    }
};

// 获取房间在线成员
const getOnlineRoomMembers = (roomId) => {
    const onlineMembers = [];
    
    for (const [userId, userInfo] of onlineUsers.entries()) {
        if (userInfo.rooms.has(roomId)) {
            onlineMembers.push({
                userId: userId,
                socketId: userInfo.socketId,
                lastSeen: userInfo.lastSeen
            });
        }
    }
    
    return onlineMembers;
};

// 发送推送通知 (简化版本)
const sendPushNotification = async (room, message, senderId) => {
    try {
        // 获取房间成员中的离线用户
        const offlineMembers = room.members.filter(member => 
            member.isActive && 
            member.user.toString() !== senderId &&
            !onlineUsers.has(member.user.toString())
        );
        
        // 这里可以集成推送服务，如Firebase、极光推送等
        // 暂时只记录日志
        if (offlineMembers.length > 0) {
            console.log(`需要推送通知给 ${offlineMembers.length} 个离线用户`);
        }
        
    } catch (error) {
        console.error('发送推送通知错误:', error);
    }
};

// 获取在线用户列表
const getOnlineUsers = () => {
    return Array.from(onlineUsers.keys());
};

// 检查用户是否在线
const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
};

module.exports = {
    initializeSocketHandlers,
    getOnlineUsers,
    isUserOnline,
    onlineUsers,
    userSockets
};
