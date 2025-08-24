/**
 * 视频服务模块单元测试
 * 
 * 测试覆盖范围：
 * 1. 视频上传和处理
 * 2. 视频转码和压缩
 * 3. 视频播放和流媒体
 * 4. 视频元数据管理
 * 5. 视频安全和权限
 * 6. 视频分析和统计
 * 7. 错误处理和监控
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { testUtils } from '../setup';
import { supabase } from '@/utils/supabase';
import { errorHandler } from '@/utils/errorHandler';
import { monitoringService } from '@/services/monitoringService';
import { cloudStorageService } from '@/services/cloudStorageService';
import { aiService } from '@/services/aiService';
import fluentFfmpeg from 'fluent-ffmpeg';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// 模拟依赖
jest.mock('@/utils/supabase');
jest.mock('@/utils/errorHandler');
jest.mock('@/services/monitoringService');
jest.mock('@/services/cloudStorageService');
jest.mock('@/services/aiService');
jest.mock('ffmpeg-static');
jest.mock('fluent-ffmpeg');
jest.mock('node:fs/promises');
jest.mock('node:path');
jest.mock('node:crypto');

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn()
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
      getPublicUrl: jest.fn(),
      createSignedUrl: jest.fn()
    }))
  },
  rpc: jest.fn()
};

const mockMonitoringService = {
  recordMetric: jest.fn(),
  recordError: jest.fn(),
  recordLatency: jest.fn(),
  trackUserActivity: jest.fn()
};

const mockErrorHandler = {
  createError: jest.fn(),
  logError: jest.fn()
};

const mockCloudStorageService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileUrl: jest.fn(),
  generateSignedUrl: jest.fn(),
  copyFile: jest.fn()
};

const mockAiService = {
  analyzeVideo: jest.fn(),
  generateThumbnail: jest.fn(),
  extractKeyframes: jest.fn(),
  generateSubtitles: jest.fn(),
  moderateContent: jest.fn()
};

const mockFfmpeg = {
  input: jest.fn().mockReturnThis(),
  output: jest.fn().mockReturnThis(),
  videoCodec: jest.fn().mockReturnThis(),
  audioCodec: jest.fn().mockReturnThis(),
  size: jest.fn().mockReturnThis(),
  fps: jest.fn().mockReturnThis(),
  videoBitrate: jest.fn().mockReturnThis(),
  audioBitrate: jest.fn().mockReturnThis(),
  format: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  run: jest.fn(),
  screenshots: jest.fn().mockReturnThis(),
  ffprobe: jest.fn()
};

const mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  mkdir: jest.fn(),
  stat: jest.fn(),
  createReadStream: jest.fn(),
  createWriteStream: jest.fn()
};

const mockPath = {
  join: jest.fn(),
  extname: jest.fn(),
  basename: jest.fn(),
  dirname: jest.fn()
};

const mockCrypto = {
  randomUUID: jest.fn(),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn()
  }))
};

// 导入被测试的模块
import {
  VideoService,
  Video,
  VideoMetadata,
  VideoProcessingJob,
  VideoQuality,
  VideoFormat,
  VideoAnalytics,
  VideoPlaybackSession,
  VideoThumbnail,
  VideoSubtitle,
  VideoChapter,
  uploadVideo,
  processVideo,
  getVideoById,
  deleteVideo,
  generateVideoThumbnail,
  getVideoPlaybackUrl
} from '@/services/videoService';

describe('视频服务模块', () => {
  let videoService: VideoService;

  beforeEach(async () => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 设置模拟返回值
    jest.mocked(supabase).mockReturnValue(mockSupabase);
    jest.mocked(errorHandler).mockReturnValue(mockErrorHandler);
    jest.mocked(monitoringService).mockReturnValue(mockMonitoringService);
    jest.mocked(cloudStorageService).mockReturnValue(mockCloudStorageService);
    jest.mocked(aiService).mockReturnValue(mockAiService);
    jest.mocked(fluentFfmpeg).mockImplementation(() => mockFfmpeg);
    jest.mocked(fs).mockReturnValue(mockFs);
    jest.mocked(path).mockReturnValue(mockPath);
    jest.mocked(crypto).mockReturnValue(mockCrypto);
    
    // 创建视频服务实例
    videoService = new VideoService();
    await videoService.initialize();
  });

  afterEach(async () => {
    if (videoService) {
      await videoService.destroy();
    }
  });

  describe('服务初始化', () => {
    it('应该正确初始化视频服务', () => {
      expect(videoService).toBeDefined();
      expect(videoService.isInitialized).toBe(true);
    });

    it('应该设置默认配置', () => {
      expect(videoService.config.maxFileSize).toBe(2 * 1024 * 1024 * 1024); // 2GB
      expect(videoService.config.supportedFormats).toContain('mp4');
      expect(videoService.config.supportedFormats).toContain('avi');
      expect(videoService.config.supportedFormats).toContain('mov');
      expect(videoService.config.defaultQuality).toBe('720p');
    });

    it('应该初始化FFmpeg', () => {
      expect(videoService.ffmpegPath).toBeDefined();
      expect(videoService.ffprobePath).toBeDefined();
    });

    it('应该创建临时目录', async () => {
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('temp'),
        { recursive: true }
      );
    });
  });

  describe('视频上传和处理', () => {
    it('应该上传视频文件', async () => {
      const videoFile = new File(['video data'], 'test.mp4', {
        type: 'video/mp4'
      });
      
      const mockMetadata = {
        duration: 120.5,
        width: 1920,
        height: 1080,
        bitrate: 5000000,
        fps: 30,
        codec: 'h264',
        size: 50 * 1024 * 1024 // 50MB
      };
      
      mockCrypto.randomUUID.mockReturnValueOnce('video-123');
      mockPath.extname.mockReturnValueOnce('.mp4');
      
      // 模拟文件上传
      mockCloudStorageService.uploadFile.mockResolvedValueOnce({
        success: true,
        url: 'https://storage.example.com/videos/video-123.mp4',
        key: 'videos/video-123.mp4'
      });
      
      // 模拟视频元数据提取
      mockFfmpeg.ffprobe.mockImplementationOnce((path, callback) => {
        callback(null, {
          format: {
            duration: mockMetadata.duration,
            size: mockMetadata.size,
            bit_rate: mockMetadata.bitrate
          },
          streams: [{
            codec_type: 'video',
            codec_name: mockMetadata.codec,
            width: mockMetadata.width,
            height: mockMetadata.height,
            r_frame_rate: `${mockMetadata.fps}/1`
          }]
        });
      });
      
      // 模拟数据库插入
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: {
          id: 'video-123',
          title: 'test.mp4',
          file_url: 'https://storage.example.com/videos/video-123.mp4',
          duration: mockMetadata.duration,
          width: mockMetadata.width,
          height: mockMetadata.height,
          status: 'uploaded'
        },
        error: null
      });
      
      const result = await videoService.uploadVideo(videoFile, {
        title: 'Test Video',
        description: 'A test video',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.video.id).toBe('video-123');
      expect(result.video.title).toBe('test.mp4');
      expect(result.video.metadata.duration).toBe(120.5);
      expect(result.video.metadata.resolution).toBe('1920x1080');
      
      expect(mockMonitoringService.recordMetric)
        .toHaveBeenCalledWith('video_upload', 1, {
          fileSize: mockMetadata.size,
          duration: mockMetadata.duration
        });
    });

    it('应该验证视频文件格式', async () => {
      const invalidFile = new File(['data'], 'test.txt', {
        type: 'text/plain'
      });
      
      await expect(videoService.uploadVideo(invalidFile, {
        title: 'Invalid File',
        userId: 'user-123'
      })).rejects.toThrow('Unsupported file format');
    });

    it('应该验证文件大小限制', async () => {
      const largeFile = new File(['x'.repeat(3 * 1024 * 1024 * 1024)], 'large.mp4', {
        type: 'video/mp4'
      });
      
      Object.defineProperty(largeFile, 'size', {
        value: 3 * 1024 * 1024 * 1024, // 3GB
        writable: false
      });
      
      await expect(videoService.uploadVideo(largeFile, {
        title: 'Large File',
        userId: 'user-123'
      })).rejects.toThrow('File size exceeds limit');
    });

    it('应该处理上传进度', async () => {
      const videoFile = new File(['video data'], 'test.mp4', {
        type: 'video/mp4'
      });
      
      const progressCallback = jest.fn();
      
      mockCloudStorageService.uploadFile.mockImplementationOnce(
        async (file, options) => {
          // 模拟上传进度
          if (options.onProgress) {
            options.onProgress({ loaded: 25, total: 100 });
            options.onProgress({ loaded: 50, total: 100 });
            options.onProgress({ loaded: 75, total: 100 });
            options.onProgress({ loaded: 100, total: 100 });
          }
          
          return {
            success: true,
            url: 'https://storage.example.com/videos/test.mp4',
            key: 'videos/test.mp4'
          };
        }
      );
      
      await videoService.uploadVideo(videoFile, {
        title: 'Test Video',
        userId: 'user-123',
        onProgress: progressCallback
      });
      
      expect(progressCallback).toHaveBeenCalledWith({
        stage: 'uploading',
        progress: 25
      });
      expect(progressCallback).toHaveBeenCalledWith({
        stage: 'uploading',
        progress: 100
      });
    });

    it('应该支持分片上传', async () => {
      const largeFile = new File(['x'.repeat(500 * 1024 * 1024)], 'large.mp4', {
        type: 'video/mp4'
      });
      
      Object.defineProperty(largeFile, 'size', {
        value: 500 * 1024 * 1024, // 500MB
        writable: false
      });
      
      mockCloudStorageService.uploadFile.mockResolvedValueOnce({
        success: true,
        url: 'https://storage.example.com/videos/large.mp4',
        key: 'videos/large.mp4',
        uploadMethod: 'multipart'
      });
      
      const result = await videoService.uploadVideo(largeFile, {
        title: 'Large Video',
        userId: 'user-123',
        enableMultipartUpload: true
      });
      
      expect(result.success).toBe(true);
      expect(mockCloudStorageService.uploadFile)
        .toHaveBeenCalledWith(largeFile, expect.objectContaining({
          multipart: true,
          chunkSize: 10 * 1024 * 1024 // 10MB chunks
        }));
    });
  });

  describe('视频转码和压缩', () => {
    it('应该转码视频到不同质量', async () => {
      const videoId = 'video-123';
      const inputPath = '/tmp/input.mp4';
      const outputPath = '/tmp/output-720p.mp4';
      
      mockPath.join.mockReturnValueOnce(outputPath);
      
      // 模拟FFmpeg转码
      mockFfmpeg.on.mockImplementation((event, callback) => {
        if (event === 'end') {
          setTimeout(() => callback(), 100);
        } else if (event === 'progress') {
          setTimeout(() => callback({ percent: 50 }), 50);
          setTimeout(() => callback({ percent: 100 }), 90);
        }
        return mockFfmpeg;
      });
      
      mockFfmpeg.run.mockImplementationOnce(() => {
        // 触发进度和完成事件
        const progressCallback = mockFfmpeg.on.mock.calls
          .find(call => call[0] === 'progress')?.[1];
        const endCallback = mockFfmpeg.on.mock.calls
          .find(call => call[0] === 'end')?.[1];
        
        if (progressCallback) {
          progressCallback({ percent: 50 });
          progressCallback({ percent: 100 });
        }
        if (endCallback) {
          endCallback();
        }
      });
      
      // 模拟文件上传
      mockCloudStorageService.uploadFile.mockResolvedValueOnce({
        success: true,
        url: 'https://storage.example.com/videos/video-123-720p.mp4',
        key: 'videos/video-123-720p.mp4'
      });
      
      // 模拟数据库更新
      mockSupabase.from().insert().mockResolvedValueOnce({
        data: [{
          id: 'quality-123',
          video_id: videoId,
          quality: '720p',
          file_url: 'https://storage.example.com/videos/video-123-720p.mp4',
          bitrate: 2500000,
          file_size: 25 * 1024 * 1024
        }],
        error: null
      });
      
      const progressCallback = jest.fn();
      
      const result = await videoService.transcodeVideo(videoId, {
        quality: '720p',
        inputPath,
        onProgress: progressCallback
      });
      
      expect(result.success).toBe(true);
      expect(result.quality).toBe('720p');
      expect(result.fileUrl).toBe('https://storage.example.com/videos/video-123-720p.mp4');
      
      expect(progressCallback).toHaveBeenCalledWith({
        stage: 'transcoding',
        progress: 50
      });
      expect(progressCallback).toHaveBeenCalledWith({
        stage: 'transcoding',
        progress: 100
      });
      
      expect(mockFfmpeg.videoCodec).toHaveBeenCalledWith('libx264');
      expect(mockFfmpeg.size).toHaveBeenCalledWith('1280x720');
      expect(mockFfmpeg.videoBitrate).toHaveBeenCalledWith('2500k');
    });

    it('应该批量转码多种质量', async () => {
      const videoId = 'video-123';
      const qualities: VideoQuality[] = ['480p', '720p', '1080p'];
      
      // 为每个质量设置模拟
      qualities.forEach((quality, index) => {
        mockCloudStorageService.uploadFile.mockResolvedValueOnce({
          success: true,
          url: `https://storage.example.com/videos/video-123-${quality}.mp4`,
          key: `videos/video-123-${quality}.mp4`
        });
        
        mockSupabase.from().insert().mockResolvedValueOnce({
          data: [{
            id: `quality-${index}`,
            video_id: videoId,
            quality,
            file_url: `https://storage.example.com/videos/video-123-${quality}.mp4`
          }],
          error: null
        });
      });
      
      const result = await videoService.batchTranscode(videoId, {
        qualities,
        inputPath: '/tmp/input.mp4'
      });
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results.every(r => r.success)).toBe(true);
      
      expect(mockMonitoringService.recordMetric)
        .toHaveBeenCalledWith('video_transcode_batch', 1, {
          videoId,
          qualityCount: 3
        });
    });

    it('应该压缩视频文件', async () => {
      const videoId = 'video-123';
      const inputPath = '/tmp/input.mp4';
      
      mockFfmpeg.on.mockImplementation((event, callback) => {
        if (event === 'end') {
          setTimeout(() => callback(), 100);
        }
        return mockFfmpeg;
      });
      
      mockFfmpeg.run.mockImplementationOnce(() => {
        const endCallback = mockFfmpeg.on.mock.calls
          .find(call => call[0] === 'end')?.[1];
        if (endCallback) endCallback();
      });
      
      mockFs.stat.mockResolvedValueOnce({ size: 100 * 1024 * 1024 }); // 原始大小
      mockFs.stat.mockResolvedValueOnce({ size: 60 * 1024 * 1024 });  // 压缩后大小
      
      const result = await videoService.compressVideo(videoId, {
        inputPath,
        compressionLevel: 'medium',
        targetSize: 50 * 1024 * 1024 // 50MB
      });
      
      expect(result.success).toBe(true);
      expect(result.originalSize).toBe(100 * 1024 * 1024);
      expect(result.compressedSize).toBe(60 * 1024 * 1024);
      expect(result.compressionRatio).toBe(0.4); // 40% 压缩
      
      expect(mockFfmpeg.videoBitrate).toHaveBeenCalled();
      expect(mockFfmpeg.audioBitrate).toHaveBeenCalled();
    });

    it('应该处理转码错误', async () => {
      const videoId = 'video-123';
      
      mockFfmpeg.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('FFmpeg encoding failed')), 100);
        }
        return mockFfmpeg;
      });
      
      mockFfmpeg.run.mockImplementationOnce(() => {
        const errorCallback = mockFfmpeg.on.mock.calls
          .find(call => call[0] === 'error')?.[1];
        if (errorCallback) {
          errorCallback(new Error('FFmpeg encoding failed'));
        }
      });
      
      await expect(videoService.transcodeVideo(videoId, {
        quality: '720p',
        inputPath: '/tmp/input.mp4'
      })).rejects.toThrow('FFmpeg encoding failed');
      
      expect(mockMonitoringService.recordError)
        .toHaveBeenCalledWith(expect.objectContaining({
          type: 'transcode_error',
          videoId
        }));
    });
  });

  describe('视频播放和流媒体', () => {
    it('应该生成播放URL', async () => {
      const videoId = 'video-123';
      
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [
          {
            id: 'quality-1',
            quality: '480p',
            file_url: 'https://storage.example.com/videos/video-123-480p.mp4'
          },
          {
            id: 'quality-2',
            quality: '720p',
            file_url: 'https://storage.example.com/videos/video-123-720p.mp4'
          }
        ],
        error: null
      });
      
      mockCloudStorageService.generateSignedUrl.mockResolvedValueOnce({
        success: true,
        url: 'https://storage.example.com/videos/video-123-720p.mp4?signature=abc123',
        expiresAt: new Date(Date.now() + 3600000)
      });
      
      const result = await videoService.getPlaybackUrl(videoId, {
        quality: '720p',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.url).toBe('https://storage.example.com/videos/video-123-720p.mp4?signature=abc123');
      expect(result.availableQualities).toEqual(['480p', '720p']);
      expect(result.expiresAt).toBeDefined();
    });

    it('应该支持自适应流媒体', async () => {
      const videoId = 'video-123';
      
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [
          {
            quality: '480p',
            file_url: 'https://storage.example.com/videos/video-123-480p.mp4',
            bitrate: 1000000
          },
          {
            quality: '720p',
            file_url: 'https://storage.example.com/videos/video-123-720p.mp4',
            bitrate: 2500000
          },
          {
            quality: '1080p',
            file_url: 'https://storage.example.com/videos/video-123-1080p.mp4',
            bitrate: 5000000
          }
        ],
        error: null
      });
      
      const result = await videoService.generateAdaptivePlaylist(videoId);
      
      expect(result.success).toBe(true);
      expect(result.playlistUrl).toBeDefined();
      expect(result.qualities).toHaveLength(3);
      expect(result.format).toBe('hls'); // HTTP Live Streaming
    });

    it('应该记录播放会话', async () => {
      const sessionData = {
        videoId: 'video-123',
        userId: 'user-123',
        quality: '720p',
        startTime: new Date(),
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1'
      };
      
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: {
          id: 'session-123',
          ...sessionData,
          status: 'started'
        },
        error: null
      });
      
      const result = await videoService.startPlaybackSession(sessionData);
      
      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('session-123');
      
      expect(mockMonitoringService.trackUserActivity)
        .toHaveBeenCalledWith('user-123', 'video_play_start', {
          videoId: 'video-123',
          quality: '720p'
        });
    });

    it('应该更新播放进度', async () => {
      const sessionId = 'session-123';
      const progressData = {
        currentTime: 120.5,
        duration: 300,
        bufferedRanges: [{ start: 0, end: 150 }],
        playbackRate: 1.0,
        volume: 0.8
      };
      
      mockSupabase.from().update().eq().mockResolvedValueOnce({
        data: null,
        error: null
      });
      
      const result = await videoService.updatePlaybackProgress(sessionId, progressData);
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from().update)
        .toHaveBeenCalledWith({
          current_time: 120.5,
          progress_percentage: 40.17, // 120.5 / 300 * 100
          last_updated: expect.any(String)
        });
    });

    it('应该结束播放会话', async () => {
      const sessionId = 'session-123';
      const endData = {
        endTime: new Date(),
        totalWatchTime: 180, // 3分钟
        completionRate: 60, // 60%
        averageQuality: '720p'
      };
      
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: {
          id: sessionId,
          video_id: 'video-123',
          user_id: 'user-123',
          total_watch_time: 180,
          completion_rate: 60,
          status: 'completed'
        },
        error: null
      });
      
      const result = await videoService.endPlaybackSession(sessionId, endData);
      
      expect(result.success).toBe(true);
      expect(result.session.totalWatchTime).toBe(180);
      expect(result.session.completionRate).toBe(60);
      
      expect(mockMonitoringService.recordMetric)
        .toHaveBeenCalledWith('video_watch_time', 180, {
          videoId: 'video-123',
          completionRate: 60
        });
    });

    it('应该支持视频预览', async () => {
      const videoId = 'video-123';
      
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: videoId,
          preview_url: 'https://storage.example.com/previews/video-123-preview.mp4',
          preview_duration: 30
        },
        error: null
      });
      
      const result = await videoService.getVideoPreview(videoId);
      
      expect(result.success).toBe(true);
      expect(result.previewUrl).toBe('https://storage.example.com/previews/video-123-preview.mp4');
      expect(result.duration).toBe(30);
    });
  });

  describe('视频元数据管理', () => {
    it('应该提取视频元数据', async () => {
      const filePath = '/tmp/video.mp4';
      
      mockFfmpeg.ffprobe.mockImplementationOnce((path, callback) => {
        callback(null, {
          format: {
            duration: 300.5,
            size: 100 * 1024 * 1024,
            bit_rate: 2500000,
            format_name: 'mov,mp4,m4a,3gp,3g2,mj2'
          },
          streams: [
            {
              codec_type: 'video',
              codec_name: 'h264',
              width: 1920,
              height: 1080,
              r_frame_rate: '30/1',
              bit_rate: 2000000
            },
            {
              codec_type: 'audio',
              codec_name: 'aac',
              sample_rate: 44100,
              channels: 2,
              bit_rate: 128000
            }
          ]
        });
      });
      
      const metadata = await videoService.extractMetadata(filePath);
      
      expect(metadata.duration).toBe(300.5);
      expect(metadata.fileSize).toBe(100 * 1024 * 1024);
      expect(metadata.video.codec).toBe('h264');
      expect(metadata.video.resolution).toBe('1920x1080');
      expect(metadata.video.fps).toBe(30);
      expect(metadata.audio.codec).toBe('aac');
      expect(metadata.audio.sampleRate).toBe(44100);
      expect(metadata.audio.channels).toBe(2);
    });

    it('应该生成视频缩略图', async () => {
      const videoId = 'video-123';
      const inputPath = '/tmp/video.mp4';
      
      mockPath.join.mockReturnValueOnce('/tmp/thumbnails/thumb-1.jpg');
      mockPath.join.mockReturnValueOnce('/tmp/thumbnails/thumb-2.jpg');
      mockPath.join.mockReturnValueOnce('/tmp/thumbnails/thumb-3.jpg');
      
      // 模拟FFmpeg截图
      mockFfmpeg.screenshots.mockImplementationOnce((options) => {
        const { count, folder, filename } = options;
        
        // 模拟生成截图文件
        for (let i = 1; i <= count; i++) {
          mockFs.stat.mockResolvedValueOnce({ size: 50 * 1024 }); // 50KB
        }
        
        return mockFfmpeg;
      });
      
      mockFfmpeg.on.mockImplementation((event, callback) => {
        if (event === 'end') {
          setTimeout(() => callback(), 100);
        }
        return mockFfmpeg;
      });
      
      // 模拟上传缩略图
      mockCloudStorageService.uploadFile.mockResolvedValue({
        success: true,
        url: 'https://storage.example.com/thumbnails/video-123-thumb.jpg',
        key: 'thumbnails/video-123-thumb.jpg'
      });
      
      // 模拟数据库插入
      mockSupabase.from().insert().mockResolvedValueOnce({
        data: [
          {
            id: 'thumb-1',
            video_id: videoId,
            url: 'https://storage.example.com/thumbnails/video-123-thumb-1.jpg',
            timestamp: 60
          },
          {
            id: 'thumb-2',
            video_id: videoId,
            url: 'https://storage.example.com/thumbnails/video-123-thumb-2.jpg',
            timestamp: 120
          },
          {
            id: 'thumb-3',
            video_id: videoId,
            url: 'https://storage.example.com/thumbnails/video-123-thumb-3.jpg',
            timestamp: 180
          }
        ],
        error: null
      });
      
      const result = await videoService.generateThumbnails(videoId, {
        inputPath,
        count: 3,
        timestamps: [60, 120, 180]
      });
      
      expect(result.success).toBe(true);
      expect(result.thumbnails).toHaveLength(3);
      expect(result.thumbnails[0].timestamp).toBe(60);
      expect(result.thumbnails[1].timestamp).toBe(120);
      expect(result.thumbnails[2].timestamp).toBe(180);
    });

    it('应该生成视频章节', async () => {
      const videoId = 'video-123';
      const chapters = [
        {
          title: '介绍',
          startTime: 0,
          endTime: 60,
          description: '课程介绍'
        },
        {
          title: '基础概念',
          startTime: 60,
          endTime: 180,
          description: '基础概念讲解'
        },
        {
          title: '实践演示',
          startTime: 180,
          endTime: 300,
          description: '实际操作演示'
        }
      ];
      
      mockSupabase.from().insert().mockResolvedValueOnce({
        data: chapters.map((chapter, index) => ({
          id: `chapter-${index + 1}`,
          video_id: videoId,
          ...chapter
        })),
        error: null
      });
      
      const result = await videoService.createChapters(videoId, chapters);
      
      expect(result.success).toBe(true);
      expect(result.chapters).toHaveLength(3);
      expect(result.chapters[0].title).toBe('介绍');
    });

    it('应该生成字幕文件', async () => {
      const videoId = 'video-123';
      const audioPath = '/tmp/audio.wav';
      
      // 模拟AI字幕生成
      mockAiService.generateSubtitles.mockResolvedValueOnce({
        success: true,
        subtitles: [
          {
            start: 0,
            end: 3.5,
            text: '欢迎来到这个课程'
          },
          {
            start: 3.5,
            end: 7.2,
            text: '今天我们将学习JavaScript基础'
          }
        ],
        language: 'zh-CN',
        confidence: 0.95
      });
      
      // 模拟字幕文件上传
      mockCloudStorageService.uploadFile.mockResolvedValueOnce({
        success: true,
        url: 'https://storage.example.com/subtitles/video-123-zh.vtt',
        key: 'subtitles/video-123-zh.vtt'
      });
      
      // 模拟数据库插入
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: {
          id: 'subtitle-123',
          video_id: videoId,
          language: 'zh-CN',
          file_url: 'https://storage.example.com/subtitles/video-123-zh.vtt',
          format: 'vtt'
        },
        error: null
      });
      
      const result = await videoService.generateSubtitles(videoId, {
        audioPath,
        language: 'zh-CN'
      });
      
      expect(result.success).toBe(true);
      expect(result.subtitle.language).toBe('zh-CN');
      expect(result.subtitle.fileUrl).toBe('https://storage.example.com/subtitles/video-123-zh.vtt');
      expect(result.confidence).toBe(0.95);
    });
  });

  describe('视频安全和权限', () => {
    it('应该验证用户访问权限', async () => {
      const videoId = 'video-123';
      const userId = 'user-123';
      
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: videoId,
          visibility: 'private',
          owner_id: 'user-456',
          course_id: 'course-789'
        },
        error: null
      });
      
      // 检查课程访问权限
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: {
          user_id: userId,
          course_id: 'course-789',
          status: 'enrolled'
        },
        error: null
      });
      
      const hasAccess = await videoService.checkAccess(videoId, userId);
      
      expect(hasAccess).toBe(true);
    });

    it('应该拒绝未授权访问', async () => {
      const videoId = 'video-123';
      const userId = 'user-123';
      
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: videoId,
          visibility: 'private',
          owner_id: 'user-456',
          course_id: 'course-789'
        },
        error: null
      });
      
      // 用户未注册课程
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });
      
      const hasAccess = await videoService.checkAccess(videoId, userId);
      
      expect(hasAccess).toBe(false);
    });

    it('应该支持内容审核', async () => {
      const videoId = 'video-123';
      const filePath = '/tmp/video.mp4';
      
      // 模拟AI内容审核
      mockAiService.moderateContent.mockResolvedValueOnce({
        success: true,
        result: {
          safe: true,
          categories: {
            violence: 0.1,
            adult: 0.05,
            hate: 0.02,
            spam: 0.01
          },
          confidence: 0.98
        }
      });
      
      // 模拟数据库更新
      mockSupabase.from().update().eq().mockResolvedValueOnce({
        data: null,
        error: null
      });
      
      const result = await videoService.moderateVideo(videoId, {
        filePath,
        checkTypes: ['violence', 'adult', 'hate', 'spam']
      });
      
      expect(result.success).toBe(true);
      expect(result.safe).toBe(true);
      expect(result.confidence).toBe(0.98);
      
      expect(mockSupabase.from().update)
        .toHaveBeenCalledWith({
          moderation_status: 'approved',
          moderation_result: expect.any(Object),
          moderated_at: expect.any(String)
        });
    });

    it('应该处理不安全内容', async () => {
      const videoId = 'video-123';
      
      mockAiService.moderateContent.mockResolvedValueOnce({
        success: true,
        result: {
          safe: false,
          categories: {
            violence: 0.8,
            adult: 0.3,
            hate: 0.1,
            spam: 0.05
          },
          confidence: 0.95,
          flaggedReasons: ['violence']
        }
      });
      
      mockSupabase.from().update().eq().mockResolvedValueOnce({
        data: null,
        error: null
      });
      
      const result = await videoService.moderateVideo(videoId, {
        filePath: '/tmp/video.mp4'
      });
      
      expect(result.success).toBe(true);
      expect(result.safe).toBe(false);
      expect(result.flaggedReasons).toContain('violence');
      
      expect(mockSupabase.from().update)
        .toHaveBeenCalledWith({
          moderation_status: 'rejected',
          moderation_result: expect.any(Object),
          moderated_at: expect.any(String)
        });
    });

    it('应该支持数字水印', async () => {
      const videoId = 'video-123';
      const userId = 'user-123';
      const inputPath = '/tmp/input.mp4';
      const outputPath = '/tmp/output-watermarked.mp4';
      
      mockPath.join.mockReturnValueOnce(outputPath);
      
      // 模拟添加水印
      mockFfmpeg.on.mockImplementation((event, callback) => {
        if (event === 'end') {
          setTimeout(() => callback(), 100);
        }
        return mockFfmpeg;
      });
      
      const result = await videoService.addWatermark(videoId, {
        inputPath,
        userId,
        watermarkText: `User: ${userId} - Video: ${videoId}`,
        position: 'bottom-right',
        opacity: 0.7
      });
      
      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
      
      expect(mockFfmpeg.output).toHaveBeenCalledWith(outputPath);
    });
  });

  describe('视频分析和统计', () => {
    it('应该获取视频播放统计', async () => {
      const videoId = 'video-123';
      
      const mockStats = {
        totalViews: 1500,
        uniqueViewers: 800,
        totalWatchTime: 45000, // 秒
        averageWatchTime: 180,
        completionRate: 65.5,
        popularSegments: [
          { start: 60, end: 120, views: 1200 },
          { start: 180, end: 240, views: 1000 }
        ],
        qualityDistribution: {
          '480p': 300,
          '720p': 800,
          '1080p': 400
        },
        deviceDistribution: {
          desktop: 900,
          mobile: 500,
          tablet: 100
        }
      };
      
      jest.spyOn(videoService, 'getVideoAnalytics')
        .mockResolvedValueOnce(mockStats);
      
      const analytics = await videoService.getVideoAnalytics(videoId, {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });
      
      expect(analytics.totalViews).toBe(1500);
      expect(analytics.completionRate).toBe(65.5);
      expect(analytics.popularSegments).toHaveLength(2);
      expect(analytics.qualityDistribution['720p']).toBe(800);
    });

    it('应该分析观看行为', async () => {
      const videoId = 'video-123';
      
      const mockBehaviorData = {
        dropOffPoints: [
          { timestamp: 30, dropOffRate: 0.15 },
          { timestamp: 120, dropOffRate: 0.25 },
          { timestamp: 240, dropOffRate: 0.35 }
        ],
        engagementScore: 7.8,
        replaySegments: [
          { start: 90, end: 110, replayCount: 45 },
          { start: 200, end: 220, replayCount: 32 }
        ],
        skipPatterns: [
          { from: 150, to: 180, skipCount: 120 }
        ],
        averageAttentionSpan: 145 // 秒
      };
      
      jest.spyOn(videoService, 'analyzeViewingBehavior')
        .mockResolvedValueOnce(mockBehaviorData);
      
      const behavior = await videoService.analyzeViewingBehavior(videoId);
      
      expect(behavior.engagementScore).toBe(7.8);
      expect(behavior.dropOffPoints).toHaveLength(3);
      expect(behavior.replaySegments).toHaveLength(2);
      expect(behavior.averageAttentionSpan).toBe(145);
    });

    it('应该生成视频报告', async () => {
      const videoId = 'video-123';
      
      const mockReport = {
        videoId,
        reportPeriod: {
          start: '2024-01-01',
          end: '2024-01-31'
        },
        summary: {
          totalViews: 1500,
          uniqueViewers: 800,
          totalWatchTime: 45000,
          averageRating: 4.6,
          completionRate: 65.5
        },
        trends: {
          viewsGrowth: 15.2, // %
          engagementGrowth: 8.7,
          qualityPreference: '720p'
        },
        recommendations: [
          '考虑在2分钟处添加更吸引人的内容',
          '优化视频开头以减少早期流失',
          '增加互动元素提高参与度'
        ]
      };
      
      jest.spyOn(videoService, 'generateVideoReport')
        .mockResolvedValueOnce(mockReport);
      
      const report = await videoService.generateVideoReport(videoId, {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });
      
      expect(report.summary.totalViews).toBe(1500);
      expect(report.trends.viewsGrowth).toBe(15.2);
      expect(report.recommendations).toHaveLength(3);
    });
  });

  describe('便捷函数', () => {
    it('uploadVideo 函数应该正常工作', async () => {
      const videoFile = new File(['video data'], 'test.mp4', {
        type: 'video/mp4'
      });
      
      mockCloudStorageService.uploadFile.mockResolvedValueOnce({
        success: true,
        url: 'https://storage.example.com/videos/test.mp4',
        key: 'videos/test.mp4'
      });
      
      const result = await uploadVideo(videoFile, {
        title: 'Test Video',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
    });

    it('getVideoById 函数应该正常工作', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'video-123',
          title: 'Test Video',
          duration: 300
        },
        error: null
      });
      
      const video = await getVideoById('video-123');
      
      expect(video.id).toBe('video-123');
      expect(video.title).toBe('Test Video');
    });

    it('generateVideoThumbnail 函数应该正常工作', async () => {
      mockCloudStorageService.uploadFile.mockResolvedValueOnce({
        success: true,
        url: 'https://storage.example.com/thumbnails/thumb.jpg',
        key: 'thumbnails/thumb.jpg'
      });
      
      const result = await generateVideoThumbnail('video-123', {
        timestamp: 60
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该处理文件上传错误', async () => {
      const videoFile = new File(['video data'], 'test.mp4', {
        type: 'video/mp4'
      });
      
      mockCloudStorageService.uploadFile.mockResolvedValueOnce({
        success: false,
        error: 'Upload failed'
      });
      
      await expect(videoService.uploadVideo(videoFile, {
        title: 'Test Video',
        userId: 'user-123'
      })).rejects.toThrow('Upload failed');
      
      expect(mockMonitoringService.recordError)
        .toHaveBeenCalledWith(expect.objectContaining({
          type: 'upload_error'
        }));
    });

    it('应该处理转码错误', async () => {
      mockFfmpeg.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Transcode failed')), 100);
        }
        return mockFfmpeg;
      });
      
      await expect(videoService.transcodeVideo('video-123', {
        quality: '720p',
        inputPath: '/tmp/input.mp4'
      })).rejects.toThrow('Transcode failed');
    });

    it('应该处理数据库错误', async () => {
      mockSupabase.from().select().eq().single.mockRejectedValueOnce(
        new Error('Database connection failed')
      );
      
      await expect(videoService.getVideoById('video-123'))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('性能测试', () => {
    it('应该高效处理视频上传', async () => {
      const videoFile = new File(['video data'], 'test.mp4', {
        type: 'video/mp4'
      });
      
      mockCloudStorageService.uploadFile.mockResolvedValueOnce({
        success: true,
        url: 'https://storage.example.com/videos/test.mp4',
        key: 'videos/test.mp4'
      });
      
      const { duration } = await testUtils.performanceUtils.measureTime(() => {
        return videoService.uploadVideo(videoFile, {
          title: 'Test Video',
          userId: 'user-123'
        });
      });
      
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该高效处理批量转码', async () => {
      const qualities: VideoQuality[] = ['480p', '720p', '1080p'];
      
      qualities.forEach(() => {
        mockCloudStorageService.uploadFile.mockResolvedValueOnce({
          success: true,
          url: 'https://storage.example.com/videos/test.mp4',
          key: 'videos/test.mp4'
        });
      });
      
      const { duration } = await testUtils.performanceUtils.measureTime(() => {
        return videoService.batchTranscode('video-123', {
          qualities,
          inputPath: '/tmp/input.mp4'
        });
      });
      
      expect(duration).toBeLessThan(30000); // 应该在30秒内完成
    });

    it('应该高效生成缩略图', async () => {
      mockCloudStorageService.uploadFile.mockResolvedValue({
        success: true,
        url: 'https://storage.example.com/thumbnails/thumb.jpg',
        key: 'thumbnails/thumb.jpg'
      });
      
      const { duration } = await testUtils.performanceUtils.measureTime(() => {
        return videoService.generateThumbnails('video-123', {
          inputPath: '/tmp/input.mp4',
          count: 5
        });
      });
      
      expect(duration).toBeLessThan(10000); // 应该在10秒内完成
    });
  });
});