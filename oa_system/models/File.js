const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: null
    },
    category: {
        type: String,
        enum: ['document', 'image', 'video', 'audio', 'archive', 'other'],
        default: 'other'
    },
    description: {
        type: String,
        default: ''
    },
    tags: [{
        type: String
    }],
    permissions: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        permission: {
            type: String,
            enum: ['read', 'write', 'admin'],
            default: 'read'
        }
    }],
    isPublic: {
        type: Boolean,
        default: false
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    version: {
        type: Number,
        default: 1
    },
    parentFile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// 索引优化
FileSchema.index({ uploadedBy: 1, createdAt: -1 });
FileSchema.index({ project: 1, createdAt: -1 });
FileSchema.index({ task: 1, createdAt: -1 });
FileSchema.index({ category: 1 });
FileSchema.index({ tags: 1 });
FileSchema.index({ isDeleted: 1 });

// 虚拟字段 - 文件URL
FileSchema.virtual('url').get(function() {
    return `/api/files/download/${this._id}`;
});

// 虚拟字段 - 格式化文件大小
FileSchema.virtual('formattedSize').get(function() {
    const bytes = this.size;
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// 实例方法 - 检查用户权限
FileSchema.methods.hasPermission = function(userId, requiredPermission = 'read') {
    // 文件上传者拥有所有权限
    if (this.uploadedBy.toString() === userId.toString()) {
        return true;
    }
    
    // 公开文件允许读取
    if (this.isPublic && requiredPermission === 'read') {
        return true;
    }
    
    // 检查明确的权限设置
    const userPermission = this.permissions.find(p => 
        p.user.toString() === userId.toString()
    );
    
    if (!userPermission) {
        return false;
    }
    
    const permissionLevels = {
        'read': 1,
        'write': 2,
        'admin': 3
    };
    
    return permissionLevels[userPermission.permission] >= permissionLevels[requiredPermission];
};

// 实例方法 - 添加权限
FileSchema.methods.addPermission = function(userId, permission = 'read') {
    const existingPermission = this.permissions.find(p => 
        p.user.toString() === userId.toString()
    );
    
    if (existingPermission) {
        existingPermission.permission = permission;
    } else {
        this.permissions.push({ user: userId, permission });
    }
    
    return this.save();
};

// 实例方法 - 移除权限
FileSchema.methods.removePermission = function(userId) {
    this.permissions = this.permissions.filter(p => 
        p.user.toString() !== userId.toString()
    );
    
    return this.save();
};

// 实例方法 - 软删除
FileSchema.methods.softDelete = function() {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
};

// 实例方法 - 恢复文件
FileSchema.methods.restore = function() {
    this.isDeleted = false;
    this.deletedAt = null;
    return this.save();
};

// 静态方法 - 根据MIME类型确定分类
FileSchema.statics.getCategoryFromMimeType = function(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.includes('pdf') || 
        mimetype.includes('document') || 
        mimetype.includes('text') ||
        mimetype.includes('spreadsheet') ||
        mimetype.includes('presentation')) return 'document';
    if (mimetype.includes('zip') || 
        mimetype.includes('rar') || 
        mimetype.includes('tar') ||
        mimetype.includes('7z')) return 'archive';
    
    return 'other';
};

// 静态方法 - 获取用户可访问的文件
FileSchema.statics.getAccessibleFiles = function(userId, options = {}) {
    const query = {
        isDeleted: false,
        $or: [
            { uploadedBy: userId },
            { isPublic: true },
            { 'permissions.user': userId }
        ]
    };
    
    if (options.project) {
        query.project = options.project;
    }
    
    if (options.task) {
        query.task = options.task;
    }
    
    if (options.category) {
        query.category = options.category;
    }
    
    return this.find(query)
        .populate('uploadedBy', 'name email')
        .populate('project', 'name')
        .populate('task', 'title')
        .sort({ createdAt: -1 });
};

// 中间件 - 保存前设置分类
FileSchema.pre('save', function(next) {
    if (this.isNew && !this.category) {
        this.category = this.constructor.getCategoryFromMimeType(this.mimetype);
    }
    next();
});

// 中间件 - 删除时清理文件系统
FileSchema.pre('remove', function(next) {
    const fs = require('fs');
    const path = require('path');
    
    try {
        if (fs.existsSync(this.path)) {
            fs.unlinkSync(this.path);
        }
    } catch (error) {
        console.error('Error deleting file:', error);
    }
    
    next();
});

// 确保虚拟字段在JSON中显示
FileSchema.set('toJSON', { virtuals: true });
FileSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('File', FileSchema);
