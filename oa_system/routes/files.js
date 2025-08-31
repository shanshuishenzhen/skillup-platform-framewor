const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const File = require('../models/File');
const Project = require('../models/Project');
const Task = require('../models/Task');
const {
    uploadSingle,
    uploadMultiple,
    handleUploadError,
    validateFile,
    processImage,
    securityCheck,
    cleanupTempFiles,
    getFileInfo
} = require('../middleware/upload');

// @route   POST api/files/upload
// @desc    Upload a single file
// @access  Private
router.post('/upload', auth, (req, res) => {
    uploadSingle(req, res, async (err) => {
        if (err) {
            return handleUploadError(err, req, res, () => {});
        }
        
        try {
            // 验证文件
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: '请选择要上传的文件'
                });
            }
            
            // 安全检查
            await new Promise((resolve, reject) => {
                securityCheck(req, res, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            // 图片处理
            await new Promise((resolve) => {
                processImage(req, res, () => resolve());
            });
            
            // 获取文件信息
            const fileInfo = getFileInfo(req.file);
            
            // 创建文件记录
            const fileData = {
                ...fileInfo,
                uploadedBy: req.user.id,
                description: req.body.description || '',
                tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : []
            };
            
            // 关联项目或任务
            if (req.body.projectId) {
                const project = await Project.findById(req.body.projectId);
                if (!project) {
                    cleanupTempFiles(req.file);
                    return res.status(404).json({
                        success: false,
                        message: '项目不存在'
                    });
                }
                fileData.project = req.body.projectId;
            }
            
            if (req.body.taskId) {
                const task = await Task.findById(req.body.taskId);
                if (!task) {
                    cleanupTempFiles(req.file);
                    return res.status(404).json({
                        success: false,
                        message: '任务不存在'
                    });
                }
                fileData.task = req.body.taskId;
            }
            
            // 设置权限
            if (req.body.isPublic === 'true') {
                fileData.isPublic = true;
            }
            
            // 保存文件记录
            const file = new File(fileData);
            await file.save();
            
            // 填充关联数据
            await file.populate('uploadedBy', 'name email');
            await file.populate('project', 'name');
            await file.populate('task', 'title');
            
            res.json({
                success: true,
                message: '文件上传成功',
                file: file
            });
            
        } catch (error) {
            console.error('文件上传错误:', error);
            cleanupTempFiles(req.file);
            res.status(500).json({
                success: false,
                message: '服务器错误'
            });
        }
    });
});

// @route   POST api/files/upload-multiple
// @desc    Upload multiple files
// @access  Private
router.post('/upload-multiple', auth, (req, res) => {
    uploadMultiple(req, res, async (err) => {
        if (err) {
            return handleUploadError(err, req, res, () => {});
        }
        
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '请选择要上传的文件'
                });
            }
            
            const uploadedFiles = [];
            const errors = [];
            
            for (const file of req.files) {
                try {
                    const fileInfo = getFileInfo(file);
                    
                    const fileData = {
                        ...fileInfo,
                        uploadedBy: req.user.id,
                        description: req.body.description || '',
                        tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : []
                    };
                    
                    if (req.body.projectId) {
                        fileData.project = req.body.projectId;
                    }
                    
                    if (req.body.taskId) {
                        fileData.task = req.body.taskId;
                    }
                    
                    if (req.body.isPublic === 'true') {
                        fileData.isPublic = true;
                    }
                    
                    const fileRecord = new File(fileData);
                    await fileRecord.save();
                    
                    await fileRecord.populate('uploadedBy', 'name email');
                    await fileRecord.populate('project', 'name');
                    await fileRecord.populate('task', 'title');
                    
                    uploadedFiles.push(fileRecord);
                    
                } catch (error) {
                    console.error('单个文件处理错误:', error);
                    cleanupTempFiles(file);
                    errors.push({
                        filename: file.originalname,
                        error: error.message
                    });
                }
            }
            
            res.json({
                success: true,
                message: `成功上传 ${uploadedFiles.length} 个文件`,
                files: uploadedFiles,
                errors: errors
            });
            
        } catch (error) {
            console.error('批量文件上传错误:', error);
            cleanupTempFiles(req.files);
            res.status(500).json({
                success: false,
                message: '服务器错误'
            });
        }
    });
});

// @route   GET api/files
// @desc    Get user's accessible files
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            category,
            project,
            task,
            search
        } = req.query;
        
        const options = {};
        if (category) options.category = category;
        if (project) options.project = project;
        if (task) options.task = task;
        
        let files = await File.getAccessibleFiles(req.user.id, options);
        
        // 搜索功能
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            files = files.filter(file => 
                searchRegex.test(file.originalName) ||
                searchRegex.test(file.description) ||
                file.tags.some(tag => searchRegex.test(tag))
            );
        }
        
        // 分页
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedFiles = files.slice(startIndex, endIndex);
        
        res.json({
            success: true,
            files: paginatedFiles,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(files.length / limit),
                count: files.length
            }
        });
        
    } catch (error) {
        console.error('获取文件列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// @route   GET api/files/:id
// @desc    Get file details
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const file = await File.findById(req.params.id)
            .populate('uploadedBy', 'name email avatar')
            .populate('project', 'name')
            .populate('task', 'title')
            .populate('permissions.user', 'name email');
        
        if (!file || file.isDeleted) {
            return res.status(404).json({
                success: false,
                message: '文件不存在'
            });
        }
        
        // 检查权限
        if (!file.hasPermission(req.user.id, 'read')) {
            return res.status(403).json({
                success: false,
                message: '没有访问权限'
            });
        }
        
        res.json({
            success: true,
            file: file
        });
        
    } catch (error) {
        console.error('获取文件详情错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// @route   GET api/files/download/:id
// @desc    Download file
// @access  Private
router.get('/download/:id', auth, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        
        if (!file || file.isDeleted) {
            return res.status(404).json({
                success: false,
                message: '文件不存在'
            });
        }
        
        // 检查权限
        if (!file.hasPermission(req.user.id, 'read')) {
            return res.status(403).json({
                success: false,
                message: '没有下载权限'
            });
        }
        
        // 检查文件是否存在
        if (!fs.existsSync(file.path)) {
            return res.status(404).json({
                success: false,
                message: '文件不存在于服务器'
            });
        }
        
        // 增加下载次数
        file.downloadCount += 1;
        await file.save();
        
        // 设置响应头
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
        res.setHeader('Content-Type', file.mimetype);
        
        // 发送文件
        res.sendFile(path.resolve(file.path));
        
    } catch (error) {
        console.error('文件下载错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// @route   PUT api/files/:id
// @desc    Update file information
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        
        if (!file || file.isDeleted) {
            return res.status(404).json({
                success: false,
                message: '文件不存在'
            });
        }
        
        // 检查权限
        if (!file.hasPermission(req.user.id, 'write')) {
            return res.status(403).json({
                success: false,
                message: '没有编辑权限'
            });
        }
        
        // 更新允许的字段
        const allowedUpdates = ['description', 'tags', 'isPublic'];
        const updates = {};
        
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'tags' && typeof req.body[field] === 'string') {
                    updates[field] = req.body[field].split(',').map(tag => tag.trim());
                } else {
                    updates[field] = req.body[field];
                }
            }
        });
        
        Object.assign(file, updates);
        await file.save();
        
        await file.populate('uploadedBy', 'name email');
        await file.populate('project', 'name');
        await file.populate('task', 'title');
        
        res.json({
            success: true,
            message: '文件信息更新成功',
            file: file
        });
        
    } catch (error) {
        console.error('更新文件信息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// @route   DELETE api/files/:id
// @desc    Delete file
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        
        if (!file || file.isDeleted) {
            return res.status(404).json({
                success: false,
                message: '文件不存在'
            });
        }
        
        // 检查权限 (只有上传者或管理员可以删除)
        if (file.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: '没有删除权限'
            });
        }
        
        // 软删除
        await file.softDelete();
        
        res.json({
            success: true,
            message: '文件删除成功'
        });
        
    } catch (error) {
        console.error('删除文件错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// @route   POST api/files/:id/permissions
// @desc    Add file permission
// @access  Private
router.post('/:id/permissions', auth, async (req, res) => {
    try {
        const { userId, permission = 'read' } = req.body;
        
        const file = await File.findById(req.params.id);
        
        if (!file || file.isDeleted) {
            return res.status(404).json({
                success: false,
                message: '文件不存在'
            });
        }
        
        // 检查权限 (只有上传者可以设置权限)
        if (file.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: '没有权限管理权限'
            });
        }
        
        await file.addPermission(userId, permission);
        
        res.json({
            success: true,
            message: '权限设置成功'
        });
        
    } catch (error) {
        console.error('设置文件权限错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

module.exports = router;
