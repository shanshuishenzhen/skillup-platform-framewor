import React, { useState, useRef } from 'react';
import axios from 'axios';
import './FileUpload.css';

const FileUpload = ({ projectId, taskId, onUploadSuccess, onUploadError }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const fileInputRef = useRef(null);

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
    };

    const handleFiles = async (files) => {
        if (files.length === 0) return;

        // 验证文件
        const validFiles = [];
        const errors = [];

        files.forEach(file => {
            // 检查文件大小 (10MB)
            if (file.size > 10 * 1024 * 1024) {
                errors.push(`${file.name}: 文件大小超过10MB限制`);
                return;
            }

            // 检查文件类型
            const allowedTypes = [
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/plain', 'text/csv',
                'application/zip', 'application/x-rar-compressed',
                'video/mp4', 'video/avi', 'audio/mpeg', 'audio/wav'
            ];

            if (!allowedTypes.includes(file.type)) {
                errors.push(`${file.name}: 不支持的文件类型`);
                return;
            }

            validFiles.push(file);
        });

        if (errors.length > 0) {
            if (onUploadError) {
                onUploadError(errors.join('\n'));
            } else {
                alert(errors.join('\n'));
            }
        }

        if (validFiles.length > 0) {
            await uploadFiles(validFiles);
        }
    };

    const uploadFiles = async (files) => {
        setUploading(true);
        const uploadResults = [];
        const uploadErrors = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            try {
                setUploadProgress(prev => ({
                    ...prev,
                    [file.name]: { status: 'uploading', progress: 0 }
                }));

                const formData = new FormData();
                formData.append('file', file);
                
                if (projectId) {
                    formData.append('projectId', projectId);
                }
                
                if (taskId) {
                    formData.append('taskId', taskId);
                }

                const response = await axios.post('/api/files/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    onUploadProgress: (progressEvent) => {
                        const progress = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        
                        setUploadProgress(prev => ({
                            ...prev,
                            [file.name]: { status: 'uploading', progress }
                        }));
                    }
                });

                if (response.data.success) {
                    setUploadProgress(prev => ({
                        ...prev,
                        [file.name]: { status: 'success', progress: 100 }
                    }));
                    
                    uploadResults.push(response.data.file);
                } else {
                    throw new Error(response.data.message || '上传失败');
                }

            } catch (error) {
                console.error(`上传文件 ${file.name} 失败:`, error);
                
                setUploadProgress(prev => ({
                    ...prev,
                    [file.name]: { status: 'error', progress: 0 }
                }));
                
                uploadErrors.push(`${file.name}: ${error.response?.data?.message || error.message}`);
            }
        }

        setUploading(false);

        // 清空进度信息
        setTimeout(() => {
            setUploadProgress({});
        }, 3000);

        // 回调处理
        if (uploadResults.length > 0 && onUploadSuccess) {
            onUploadSuccess(uploadResults);
        }

        if (uploadErrors.length > 0 && onUploadError) {
            onUploadError(uploadErrors.join('\n'));
        }

        // 清空文件输入
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="file-upload">
            <div
                className={`upload-area ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="upload-content">
                    {uploading ? (
                        <div className="upload-status">
                            <div className="upload-icon">⏳</div>
                            <p>正在上传文件...</p>
                        </div>
                    ) : (
                        <div className="upload-prompt">
                            <div className="upload-icon">📁</div>
                            <p>
                                <strong>点击选择文件</strong> 或拖拽文件到此处
                            </p>
                            <p className="upload-hint">
                                支持图片、文档、音视频等格式，单个文件最大10MB
                            </p>
                        </div>
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                />
            </div>

            {/* 上传进度 */}
            {Object.keys(uploadProgress).length > 0 && (
                <div className="upload-progress-list">
                    {Object.entries(uploadProgress).map(([fileName, progress]) => (
                        <div key={fileName} className="upload-progress-item">
                            <div className="file-info">
                                <span className="file-name">{fileName}</span>
                                <span className={`file-status ${progress.status}`}>
                                    {progress.status === 'uploading' && `${progress.progress}%`}
                                    {progress.status === 'success' && '✓ 完成'}
                                    {progress.status === 'error' && '✗ 失败'}
                                </span>
                            </div>
                            
                            {progress.status === 'uploading' && (
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill"
                                        style={{ width: `${progress.progress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 支持的文件类型说明 */}
            <div className="supported-formats">
                <h4>支持的文件格式：</h4>
                <div className="format-list">
                    <span className="format-category">
                        <strong>图片:</strong> JPG, PNG, GIF, WebP
                    </span>
                    <span className="format-category">
                        <strong>文档:</strong> PDF, Word, Excel, PowerPoint, TXT
                    </span>
                    <span className="format-category">
                        <strong>压缩:</strong> ZIP, RAR
                    </span>
                    <span className="format-category">
                        <strong>媒体:</strong> MP4, AVI, MP3, WAV
                    </span>
                </div>
            </div>
        </div>
    );
};

export default FileUpload;
