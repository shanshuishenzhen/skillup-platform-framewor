const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    content: {
        type: String,
        required: function() {
            return this.messageType === 'text';
        }
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatRoom',
        required: true
    },
    messageType: {
        type: String,
        enum: ['text', 'file', 'image', 'system'],
        default: 'text'
    },
    file: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
        default: null
    },
    fileUrl: {
        type: String,
        default: null
    },
    fileName: {
        type: String,
        default: null
    },
    fileSize: {
        type: Number,
        default: null
    },
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    edited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date,
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    reactions: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        emoji: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// 索引优化
MessageSchema.index({ room: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, createdAt: -1 });
MessageSchema.index({ isDeleted: 1 });
MessageSchema.index({ 'readBy.user': 1 });

// 虚拟字段 - 未读用户数量
MessageSchema.virtual('unreadCount').get(function() {
    return this.readBy ? this.readBy.length : 0;
});

// 实例方法 - 标记为已读
MessageSchema.methods.markAsRead = function(userId) {
    const existingRead = this.readBy.find(read => 
        read.user.toString() === userId.toString()
    );
    
    if (!existingRead) {
        this.readBy.push({
            user: userId,
            readAt: new Date()
        });
        return this.save();
    }
    
    return Promise.resolve(this);
};

// 实例方法 - 检查是否已读
MessageSchema.methods.isReadBy = function(userId) {
    return this.readBy.some(read => 
        read.user.toString() === userId.toString()
    );
};

// 实例方法 - 编辑消息
MessageSchema.methods.editContent = function(newContent) {
    if (this.messageType !== 'text') {
        throw new Error('Only text messages can be edited');
    }
    
    this.content = newContent;
    this.edited = true;
    this.editedAt = new Date();
    
    return this.save();
};

// 实例方法 - 软删除
MessageSchema.methods.softDelete = function() {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
};

// 实例方法 - 添加反应
MessageSchema.methods.addReaction = function(userId, emoji) {
    const existingReaction = this.reactions.find(reaction => 
        reaction.user.toString() === userId.toString() && 
        reaction.emoji === emoji
    );
    
    if (existingReaction) {
        return Promise.resolve(this);
    }
    
    this.reactions.push({
        user: userId,
        emoji: emoji
    });
    
    return this.save();
};

// 实例方法 - 移除反应
MessageSchema.methods.removeReaction = function(userId, emoji) {
    this.reactions = this.reactions.filter(reaction => 
        !(reaction.user.toString() === userId.toString() && reaction.emoji === emoji)
    );
    
    return this.save();
};

// 静态方法 - 获取房间消息
MessageSchema.statics.getRoomMessages = function(roomId, options = {}) {
    const {
        page = 1,
        limit = 50,
        before = null,
        after = null
    } = options;
    
    const query = {
        room: roomId,
        isDeleted: false
    };
    
    if (before) {
        query.createdAt = { $lt: before };
    }
    
    if (after) {
        query.createdAt = { $gt: after };
    }
    
    return this.find(query)
        .populate('sender', 'name email avatar')
        .populate('file', 'filename originalName size mimetype')
        .populate('replyTo', 'content sender messageType')
        .populate('readBy.user', 'name')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
};

// 静态方法 - 获取未读消息数量
MessageSchema.statics.getUnreadCount = function(userId, roomId = null) {
    const query = {
        isDeleted: false,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId }
    };
    
    if (roomId) {
        query.room = roomId;
    }
    
    return this.countDocuments(query);
};

// 静态方法 - 标记房间所有消息为已读
MessageSchema.statics.markRoomAsRead = function(roomId, userId) {
    return this.updateMany(
        {
            room: roomId,
            isDeleted: false,
            sender: { $ne: userId },
            'readBy.user': { $ne: userId }
        },
        {
            $push: {
                readBy: {
                    user: userId,
                    readAt: new Date()
                }
            }
        }
    );
};

// 静态方法 - 搜索消息
MessageSchema.statics.searchMessages = function(query, userId, options = {}) {
    const {
        roomId = null,
        messageType = null,
        limit = 20,
        page = 1
    } = options;
    
    const searchQuery = {
        isDeleted: false,
        $or: [
            { content: { $regex: query, $options: 'i' } },
            { fileName: { $regex: query, $options: 'i' } }
        ]
    };
    
    if (roomId) {
        searchQuery.room = roomId;
    }
    
    if (messageType) {
        searchQuery.messageType = messageType;
    }
    
    return this.find(searchQuery)
        .populate('sender', 'name email avatar')
        .populate('room', 'name type')
        .populate('file', 'filename originalName')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
};

// 中间件 - 保存前验证
MessageSchema.pre('save', function(next) {
    // 文件消息必须有文件信息
    if (this.messageType === 'file' || this.messageType === 'image') {
        if (!this.file && !this.fileUrl) {
            return next(new Error('File messages must have file reference or URL'));
        }
    }
    
    // 文本消息必须有内容
    if (this.messageType === 'text' && !this.content) {
        return next(new Error('Text messages must have content'));
    }
    
    next();
});

// 确保虚拟字段在JSON中显示
MessageSchema.set('toJSON', { virtuals: true });
MessageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Message', MessageSchema);
