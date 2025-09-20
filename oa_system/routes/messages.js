const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const File = require('../models/File');

// @route   GET api/messages/rooms
// @desc    Get user's chat rooms
// @access  Private
router.get('/rooms', auth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            type,
            includeArchived = false
        } = req.query;
        
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            includeArchived: includeArchived === 'true'
        };
        
        if (type) {
            options.type = type;
        }
        
        const rooms = await ChatRoom.getUserRooms(req.user.id, options);
        
        // 获取每个房间的未读消息数量
        const roomsWithUnread = await Promise.all(
            rooms.map(async (room) => {
                const unreadCount = await Message.getUnreadCount(req.user.id, room._id);
                return {
                    ...room.toObject(),
                    unreadCount
                };
            })
        );
        
        res.json({
            success: true,
            rooms: roomsWithUnread
        });
        
    } catch (error) {
        console.error('获取聊天室列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// @route   POST api/messages/rooms
// @desc    Create a new chat room
// @access  Private
router.post('/rooms', auth, async (req, res) => {
    try {
        const {
            name,
            description = '',
            type = 'group',
            members = [],
            projectId = null
        } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                message: '房间名称不能为空'
            });
        }
        
        // 创建房间
        const roomData = {
            name,
            description,
            type,
            createdBy: req.user.id,
            members: [
                { user: req.user.id, role: 'owner' }
            ]
        };
        
        if (projectId) {
            roomData.project = projectId;
        }
        
        // 添加其他成员
        if (members.length > 0) {
            members.forEach(memberId => {
                if (memberId !== req.user.id) {
                    roomData.members.push({
                        user: memberId,
                        role: 'member'
                    });
                }
            });
        }
        
        const room = new ChatRoom(roomData);
        await room.save();
        
        await room.populate('members.user', 'name email avatar');
        await room.populate('project', 'name');
        
        res.json({
            success: true,
            message: '聊天室创建成功',
            room
        });
        
    } catch (error) {
        console.error('创建聊天室错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// @route   POST api/messages/rooms/private
// @desc    Create or get private chat room
// @access  Private
router.post('/rooms/private', auth, async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '用户ID不能为空'
            });
        }
        
        if (userId === req.user.id) {
            return res.status(400).json({
                success: false,
                message: '不能与自己创建私聊'
            });
        }
        
        const room = await ChatRoom.createPrivateRoom(req.user.id, userId);
        
        await room.populate('members.user', 'name email avatar');
        
        res.json({
            success: true,
            room
        });
        
    } catch (error) {
        console.error('创建私聊错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// @route   GET api/messages/rooms/:roomId
// @desc    Get chat room details
// @access  Private
router.get('/rooms/:roomId', auth, async (req, res) => {
    try {
        const room = await ChatRoom.findById(req.params.roomId)
            .populate('members.user', 'name email avatar')
            .populate('project', 'name')
            .populate('lastMessage', 'content messageType createdAt sender');
        
        if (!room) {
            return res.status(404).json({
                success: false,
                message: '聊天室不存在'
            });
        }
        
        // 检查用户是否是房间成员
        if (!room.hasPermission(req.user.id, 'read')) {
            return res.status(403).json({
                success: false,
                message: '没有访问权限'
            });
        }
        
        // 更新用户最后在线时间
        await room.updateMemberLastSeen(req.user.id);
        
        res.json({
            success: true,
            room
        });
        
    } catch (error) {
        console.error('获取聊天室详情错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// @route   GET api/messages/rooms/:roomId/messages
// @desc    Get messages in a chat room
// @access  Private
router.get('/rooms/:roomId/messages', auth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            before = null,
            after = null
        } = req.query;
        
        // 检查房间权限
        const room = await ChatRoom.findById(req.params.roomId);
        if (!room || !room.hasPermission(req.user.id, 'read')) {
            return res.status(403).json({
                success: false,
                message: '没有访问权限'
            });
        }
        
        const options = {
            page: parseInt(page),
            limit: parseInt(limit)
        };
        
        if (before) {
            options.before = new Date(before);
        }
        
        if (after) {
            options.after = new Date(after);
        }
        
        const messages = await Message.getRoomMessages(req.params.roomId, options);
        
        res.json({
            success: true,
            messages: messages.reverse() // 按时间正序返回
        });
        
    } catch (error) {
        console.error('获取消息列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// @route   POST api/messages
// @desc    Send a message
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const {
            roomId,
            content,
            messageType = 'text',
            fileId = null,
            replyTo = null
        } = req.body;
        
        if (!roomId) {
            return res.status(400).json({
                success: false,
                message: '房间ID不能为空'
            });
        }
        
        // 检查房间权限
        const room = await ChatRoom.findById(roomId);
        if (!room || !room.hasPermission(req.user.id, 'write')) {
            return res.status(403).json({
                success: false,
                message: '没有发送消息权限'
            });
        }
        
        // 验证消息内容
        if (messageType === 'text' && !content) {
            return res.status(400).json({
                success: false,
                message: '消息内容不能为空'
            });
        }
        
        const messageData = {
            sender: req.user.id,
            room: roomId,
            messageType
        };
        
        if (messageType === 'text') {
            messageData.content = content;
        }
        
        if (fileId) {
            const file = await File.findById(fileId);
            if (!file) {
                return res.status(404).json({
                    success: false,
                    message: '文件不存在'
                });
            }
            
            messageData.file = fileId;
            messageData.fileUrl = file.url;
            messageData.fileName = file.originalName;
            messageData.fileSize = file.size;
        }
        
        if (replyTo) {
            const replyMessage = await Message.findById(replyTo);
            if (replyMessage && replyMessage.room.toString() === roomId) {
                messageData.replyTo = replyTo;
            }
        }
        
        const message = new Message(messageData);
        await message.save();
        
        // 更新房间最后活动时间
        await room.updateLastActivity(message._id);
        
        // 填充关联数据
        await message.populate('sender', 'name email avatar');
        await message.populate('file', 'filename originalName size mimetype');
        await message.populate('replyTo', 'content sender messageType');
        
        res.json({
            success: true,
            message
        });
        
    } catch (error) {
        console.error('发送消息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// @route   PUT api/messages/:messageId/read
// @desc    Mark message as read
// @access  Private
router.put('/:messageId/read', auth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);
        
        if (!message) {
            return res.status(404).json({
                success: false,
                message: '消息不存在'
            });
        }
        
        // 检查房间权限
        const room = await ChatRoom.findById(message.room);
        if (!room || !room.hasPermission(req.user.id, 'read')) {
            return res.status(403).json({
                success: false,
                message: '没有访问权限'
            });
        }
        
        await message.markAsRead(req.user.id);
        
        res.json({
            success: true,
            message: '消息已标记为已读'
        });
        
    } catch (error) {
        console.error('标记消息已读错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// @route   PUT api/messages/rooms/:roomId/read-all
// @desc    Mark all messages in room as read
// @access  Private
router.put('/rooms/:roomId/read-all', auth, async (req, res) => {
    try {
        // 检查房间权限
        const room = await ChatRoom.findById(req.params.roomId);
        if (!room || !room.hasPermission(req.user.id, 'read')) {
            return res.status(403).json({
                success: false,
                message: '没有访问权限'
            });
        }
        
        await Message.markRoomAsRead(req.params.roomId, req.user.id);
        
        res.json({
            success: true,
            message: '所有消息已标记为已读'
        });
        
    } catch (error) {
        console.error('标记房间消息已读错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// @route   PUT api/messages/:messageId
// @desc    Edit message
// @access  Private
router.put('/:messageId', auth, async (req, res) => {
    try {
        const { content } = req.body;
        
        const message = await Message.findById(req.params.messageId);
        
        if (!message) {
            return res.status(404).json({
                success: false,
                message: '消息不存在'
            });
        }
        
        // 只有发送者可以编辑消息
        if (message.sender.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: '只能编辑自己的消息'
            });
        }
        
        // 只能编辑文本消息
        if (message.messageType !== 'text') {
            return res.status(400).json({
                success: false,
                message: '只能编辑文本消息'
            });
        }
        
        await message.editContent(content);
        
        await message.populate('sender', 'name email avatar');
        
        res.json({
            success: true,
            message
        });
        
    } catch (error) {
        console.error('编辑消息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// @route   DELETE api/messages/:messageId
// @desc    Delete message
// @access  Private
router.delete('/:messageId', auth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);
        
        if (!message) {
            return res.status(404).json({
                success: false,
                message: '消息不存在'
            });
        }
        
        // 只有发送者可以删除消息
        if (message.sender.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: '只能删除自己的消息'
            });
        }
        
        await message.softDelete();
        
        res.json({
            success: true,
            message: '消息删除成功'
        });
        
    } catch (error) {
        console.error('删除消息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// @route   GET api/messages/search
// @desc    Search messages
// @access  Private
router.get('/search', auth, async (req, res) => {
    try {
        const {
            q: query,
            roomId,
            messageType,
            page = 1,
            limit = 20
        } = req.query;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                message: '搜索关键词不能为空'
            });
        }
        
        const options = {
            page: parseInt(page),
            limit: parseInt(limit)
        };
        
        if (roomId) {
            // 检查房间权限
            const room = await ChatRoom.findById(roomId);
            if (!room || !room.hasPermission(req.user.id, 'read')) {
                return res.status(403).json({
                    success: false,
                    message: '没有访问权限'
                });
            }
            options.roomId = roomId;
        }
        
        if (messageType) {
            options.messageType = messageType;
        }
        
        const messages = await Message.searchMessages(query, req.user.id, options);
        
        res.json({
            success: true,
            messages
        });
        
    } catch (error) {
        console.error('搜索消息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

module.exports = router;
