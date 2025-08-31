const mongoose = require('mongoose');

const ChatRoomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['private', 'group', 'project', 'public'],
        default: 'group'
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['member', 'admin', 'owner'],
            default: 'member'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        lastSeen: {
            type: Date,
            default: Date.now
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    avatar: {
        type: String,
        default: null
    },
    settings: {
        isPublic: {
            type: Boolean,
            default: false
        },
        allowFileSharing: {
            type: Boolean,
            default: true
        },
        allowMemberInvite: {
            type: Boolean,
            default: true
        },
        maxMembers: {
            type: Number,
            default: 100
        },
        messageRetentionDays: {
            type: Number,
            default: 365
        }
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    archivedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// 索引优化
ChatRoomSchema.index({ 'members.user': 1 });
ChatRoomSchema.index({ type: 1 });
ChatRoomSchema.index({ project: 1 });
ChatRoomSchema.index({ createdBy: 1 });
ChatRoomSchema.index({ lastActivity: -1 });
ChatRoomSchema.index({ isArchived: 1 });

// 虚拟字段 - 活跃成员数量
ChatRoomSchema.virtual('activeMemberCount').get(function() {
    return this.members.filter(member => member.isActive).length;
});

// 虚拟字段 - 在线成员数量
ChatRoomSchema.virtual('onlineMemberCount').get(function() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.members.filter(member => 
        member.isActive && member.lastSeen > fiveMinutesAgo
    ).length;
});

// 实例方法 - 添加成员
ChatRoomSchema.methods.addMember = function(userId, role = 'member') {
    const existingMember = this.members.find(member => 
        member.user.toString() === userId.toString()
    );
    
    if (existingMember) {
        if (!existingMember.isActive) {
            existingMember.isActive = true;
            existingMember.joinedAt = new Date();
        }
        return this.save();
    }
    
    // 检查成员数量限制
    if (this.activeMemberCount >= this.settings.maxMembers) {
        throw new Error('Room has reached maximum member limit');
    }
    
    this.members.push({
        user: userId,
        role: role,
        joinedAt: new Date(),
        lastSeen: new Date()
    });
    
    return this.save();
};

// 实例方法 - 移除成员
ChatRoomSchema.methods.removeMember = function(userId) {
    const member = this.members.find(member => 
        member.user.toString() === userId.toString()
    );
    
    if (member) {
        member.isActive = false;
    }
    
    return this.save();
};

// 实例方法 - 更新成员角色
ChatRoomSchema.methods.updateMemberRole = function(userId, newRole) {
    const member = this.members.find(member => 
        member.user.toString() === userId.toString() && member.isActive
    );
    
    if (!member) {
        throw new Error('Member not found in room');
    }
    
    member.role = newRole;
    return this.save();
};

// 实例方法 - 检查用户权限
ChatRoomSchema.methods.hasPermission = function(userId, action) {
    const member = this.members.find(member => 
        member.user.toString() === userId.toString() && member.isActive
    );
    
    if (!member) {
        return false;
    }
    
    const permissions = {
        'read': ['member', 'admin', 'owner'],
        'write': ['member', 'admin', 'owner'],
        'invite': ['admin', 'owner'],
        'remove_member': ['admin', 'owner'],
        'edit_room': ['owner'],
        'delete_room': ['owner']
    };
    
    return permissions[action] && permissions[action].includes(member.role);
};

// 实例方法 - 更新最后活动时间
ChatRoomSchema.methods.updateLastActivity = function(messageId = null) {
    this.lastActivity = new Date();
    if (messageId) {
        this.lastMessage = messageId;
    }
    return this.save();
};

// 实例方法 - 更新成员最后在线时间
ChatRoomSchema.methods.updateMemberLastSeen = function(userId) {
    const member = this.members.find(member => 
        member.user.toString() === userId.toString() && member.isActive
    );
    
    if (member) {
        member.lastSeen = new Date();
        return this.save();
    }
    
    return Promise.resolve(this);
};

// 实例方法 - 归档房间
ChatRoomSchema.methods.archive = function() {
    this.isArchived = true;
    this.archivedAt = new Date();
    return this.save();
};

// 实例方法 - 取消归档
ChatRoomSchema.methods.unarchive = function() {
    this.isArchived = false;
    this.archivedAt = null;
    return this.save();
};

// 静态方法 - 获取用户房间列表
ChatRoomSchema.statics.getUserRooms = function(userId, options = {}) {
    const {
        includeArchived = false,
        type = null,
        limit = 50,
        page = 1
    } = options;
    
    const query = {
        'members.user': userId,
        'members.isActive': true
    };
    
    if (!includeArchived) {
        query.isArchived = false;
    }
    
    if (type) {
        query.type = type;
    }
    
    return this.find(query)
        .populate('members.user', 'name email avatar')
        .populate('lastMessage', 'content messageType createdAt sender')
        .populate('project', 'name')
        .sort({ lastActivity: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
};

// 静态方法 - 创建私聊房间
ChatRoomSchema.statics.createPrivateRoom = function(user1Id, user2Id) {
    // 检查是否已存在私聊房间
    return this.findOne({
        type: 'private',
        'members.user': { $all: [user1Id, user2Id] },
        'members.isActive': true
    }).then(existingRoom => {
        if (existingRoom) {
            return existingRoom;
        }
        
        // 创建新的私聊房间
        const room = new this({
            name: 'Private Chat',
            type: 'private',
            createdBy: user1Id,
            members: [
                { user: user1Id, role: 'member' },
                { user: user2Id, role: 'member' }
            ]
        });
        
        return room.save();
    });
};

// 静态方法 - 创建项目房间
ChatRoomSchema.statics.createProjectRoom = function(projectId, creatorId, projectName) {
    const room = new this({
        name: `${projectName} - 项目讨论`,
        type: 'project',
        project: projectId,
        createdBy: creatorId,
        members: [
            { user: creatorId, role: 'owner' }
        ]
    });
    
    return room.save();
};

// 静态方法 - 搜索房间
ChatRoomSchema.statics.searchRooms = function(query, userId, options = {}) {
    const {
        type = null,
        limit = 20,
        page = 1
    } = options;
    
    const searchQuery = {
        $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } }
        ],
        $and: [
            {
                $or: [
                    { 'settings.isPublic': true },
                    { 'members.user': userId }
                ]
            }
        ],
        isArchived: false
    };
    
    if (type) {
        searchQuery.type = type;
    }
    
    return this.find(searchQuery)
        .populate('members.user', 'name email avatar')
        .populate('project', 'name')
        .sort({ lastActivity: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
};

// 中间件 - 保存前验证
ChatRoomSchema.pre('save', function(next) {
    // 私聊房间只能有2个成员
    if (this.type === 'private') {
        const activeMembers = this.members.filter(member => member.isActive);
        if (activeMembers.length > 2) {
            return next(new Error('Private rooms can only have 2 members'));
        }
    }
    
    // 确保创建者是房间成员
    const creatorIsMember = this.members.some(member => 
        member.user.toString() === this.createdBy.toString() && member.isActive
    );
    
    if (!creatorIsMember) {
        this.members.push({
            user: this.createdBy,
            role: 'owner',
            joinedAt: new Date(),
            lastSeen: new Date()
        });
    }
    
    next();
});

// 确保虚拟字段在JSON中显示
ChatRoomSchema.set('toJSON', { virtuals: true });
ChatRoomSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ChatRoom', ChatRoomSchema);
