const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = 'uploads';
const createUploadDirs = () => {
    const dirs = [
        uploadDir,
        path.join(uploadDir, 'documents'),
        path.join(uploadDir, 'images'),
        path.join(uploadDir, 'videos'),
        path.join(uploadDir, 'audio'),
        path.join(uploadDir, 'archives'),
        path.join(uploadDir, 'others')
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

createUploadDirs();

// 文件存储配置
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let subfolder = 'others';
        
        // 根据文件类型确定子文件夹
        if (file.mimetype.startsWith('image/')) {
            subfolder = 'images';
        } else if (file.mimetype.startsWith('video/')) {
            subfolder = 'videos';
        } else if (file.mimetype.startsWith('audio/')) {
            subfolder = 'audio';
        } else if (file.mimetype.includes('pdf') || 
                   file.mimetype.includes('document') || 
                   file.mimetype.includes('text') ||
                   file.mimetype.includes('spreadsheet') ||
                   file.mimetype.includes('presentation')) {
            subfolder = 'documents';
        } else if (file.mimetype.includes('zip') || 
                   file.mimetype.includes('rar') || 
                   file.mimetype.includes('tar') ||
                   file.mimetype.includes('7z')) {
            subfolder = 'archives';
        }
        
        const destPath = path.join(uploadDir, subfolder);
        cb(null, destPath);
    },
    filename: (req, file, cb) => {
        // 生成唯一文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        const sanitizedName = name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
        
        cb(null, `${sanitizedName}_${uniqueSuffix}${ext}`);
    }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = [
        // 图片
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // 文档
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'text/csv',
        // 压缩文件
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        'application/x-tar',
        'application/gzip',
        // 音频
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
        // 视频
        'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv',
        // 其他
        'application/json',
        'application/xml'
    ];
    
    // 检查文件类型
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
    }
};

// 文件大小限制 (10MB)
const limits = {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // 最多同时上传5个文件
};

// 创建multer实例
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: limits
});

// 单文件上传中间件
const uploadSingle = upload.single('file');

// 多文件上传中间件
const uploadMultiple = upload.array('files', 5);

// 错误处理中间件
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: '文件大小超过限制 (最大10MB)'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: '文件数量超过限制 (最多5个文件)'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    message: '意外的文件字段'
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: '文件上传错误: ' + error.message
                });
        }
    }
    
    if (error.message.includes('不支持的文件类型')) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    
    next(error);
};

// 文件验证中间件
const validateFile = (req, res, next) => {
    if (!req.file && !req.files) {
        return res.status(400).json({
            success: false,
            message: '请选择要上传的文件'
        });
    }
    
    next();
};

// 图片处理中间件 (可选)
const processImage = async (req, res, next) => {
    if (req.file && req.file.mimetype.startsWith('image/')) {
        try {
            // 这里可以添加图片处理逻辑，如压缩、生成缩略图等
            // 例如使用 sharp 库进行图片处理
            
            // const sharp = require('sharp');
            // const thumbnailPath = req.file.path.replace(/(\.[^.]+)$/, '_thumb$1');
            // await sharp(req.file.path)
            //     .resize(200, 200, { fit: 'inside' })
            //     .toFile(thumbnailPath);
            // req.file.thumbnailPath = thumbnailPath;
            
            next();
        } catch (error) {
            console.error('图片处理错误:', error);
            next(); // 即使处理失败也继续，不影响文件上传
        }
    } else {
        next();
    }
};

// 文件安全检查中间件
const securityCheck = (req, res, next) => {
    if (req.file) {
        const file = req.file;
        
        // 检查文件扩展名与MIME类型是否匹配
        const ext = path.extname(file.originalname).toLowerCase();
        const mimeTypeMap = {
            '.jpg': ['image/jpeg'],
            '.jpeg': ['image/jpeg'],
            '.png': ['image/png'],
            '.gif': ['image/gif'],
            '.pdf': ['application/pdf'],
            '.doc': ['application/msword'],
            '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            '.xls': ['application/vnd.ms-excel'],
            '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            '.zip': ['application/zip'],
            '.txt': ['text/plain']
        };
        
        if (mimeTypeMap[ext] && !mimeTypeMap[ext].includes(file.mimetype)) {
            // 删除已上传的文件
            fs.unlinkSync(file.path);
            return res.status(400).json({
                success: false,
                message: '文件扩展名与文件类型不匹配'
            });
        }
        
        // 检查文件名中的危险字符
        const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
        if (dangerousChars.test(file.originalname)) {
            fs.unlinkSync(file.path);
            return res.status(400).json({
                success: false,
                message: '文件名包含非法字符'
            });
        }
    }
    
    next();
};

// 清理临时文件的工具函数
const cleanupTempFiles = (files) => {
    if (!files) return;
    
    const fileList = Array.isArray(files) ? files : [files];
    fileList.forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
            try {
                fs.unlinkSync(file.path);
            } catch (error) {
                console.error('清理临时文件失败:', error);
            }
        }
    });
};

// 获取文件信息的工具函数
const getFileInfo = (file) => {
    return {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        category: getCategoryFromMimeType(file.mimetype)
    };
};

// 根据MIME类型获取分类
const getCategoryFromMimeType = (mimetype) => {
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

module.exports = {
    uploadSingle,
    uploadMultiple,
    handleUploadError,
    validateFile,
    processImage,
    securityCheck,
    cleanupTempFiles,
    getFileInfo,
    getCategoryFromMimeType
};
