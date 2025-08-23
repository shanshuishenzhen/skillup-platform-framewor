/**
 * 人脸认证服务模块单元测试
 * 
 * 测试覆盖范围：
 * 1. 人脸检测和识别
 * 2. 人脸特征提取和比对
 * 3. 活体检测功能
 * 4. 人脸数据库管理
 * 5. 认证流程和安全控制
 * 6. 错误处理和监控
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { testUtils } from '../setup';

// 模拟人脸识别SDK
const mockFaceSDK = {
  detectFaces: jest.fn(),
  extractFeatures: jest.fn(),
  compareFaces: jest.fn(),
  livenessDetection: jest.fn(),
  faceQualityCheck: jest.fn()
};

// 模拟依赖
jest.mock('@/services/baiduFaceService');
jest.mock('@/services/faceRecognitionService');
jest.mock('@/utils/supabase');
jest.mock('@/services/monitoringService');
jest.mock('@/utils/errorHandler');
jest.mock('@/services/cloudStorageService');
jest.mock('canvas');
jest.mock('face-api.js');

const mockBaiduFaceService = {
  detectFace: jest.fn(),
  compareFaces: jest.fn(),
  livenessDetection: jest.fn(),
  addFaceToGroup: jest.fn(),
  searchFaceInGroup: jest.fn(),
  deleteFaceFromGroup: jest.fn()
};

const mockFaceRecognitionService = {
  detectFaces: jest.fn(),
  extractFeatures: jest.fn(),
  compareFaces: jest.fn(),
  verifyLiveness: jest.fn()
};

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis()
  }))
};

const mockMonitoringService = {
  recordMetric: jest.fn(),
  recordError: jest.fn(),
  recordLatency: jest.fn()
};

const mockCloudStorageService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileUrl: jest.fn()
};

const mockCanvas = {
  createCanvas: jest.fn(),
  loadImage: jest.fn()
};

// 导入被测试的模块
import {
  FaceAuthService,
  FaceDetectionResult,
  FaceComparisonResult,
  LivenessDetectionResult,
  FaceAuthConfig,
  FaceTemplate,
  AuthenticationResult,
  FaceQualityMetrics,
  detectFace,
  compareFaces,
  authenticateUser,
  registerFaceTemplate,
  verifyLiveness,
  getFaceQuality,
  searchSimilarFaces,
  deleteFaceTemplate
} from '@/services/faceAuthService';

describe('人脸认证服务模块', () => {
  let faceAuthService: FaceAuthService;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 设置模拟返回值
    require('@/services/baiduFaceService').baiduFaceService = mockBaiduFaceService;
    require('@/services/faceRecognitionService').faceRecognitionService = mockFaceRecognitionService;
    require('@/utils/supabase').getSupabaseClient = jest.fn().mockReturnValue(mockSupabase);
    require('@/services/monitoringService').monitoringService = mockMonitoringService;
    require('@/services/cloudStorageService').cloudStorageService = mockCloudStorageService;
    require('canvas').createCanvas = mockCanvas.createCanvas;
    require('canvas').loadImage = mockCanvas.loadImage;
    
    // 创建人脸认证服务实例
    faceAuthService = new FaceAuthService({
      provider: 'baidu',
      confidenceThreshold: 0.8,
      livenessThreshold: 0.7,
      qualityThreshold: 0.6,
      maxFaceSize: 2 * 1024 * 1024, // 2MB
      allowedFormats: ['jpg', 'jpeg', 'png'],
      enableLiveness: true,
      enableQualityCheck: true,
      retryAttempts: 3,
      timeout: 10000
    });
  });

  describe('服务初始化', () => {
    it('应该正确初始化人脸认证服务', () => {
      expect(faceAuthService).toBeDefined();
      expect(faceAuthService.config.provider).toBe('baidu');
      expect(faceAuthService.config.confidenceThreshold).toBe(0.8);
    });

    it('应该验证配置参数', () => {
      expect(() => new FaceAuthService({
        provider: 'baidu',
        confidenceThreshold: 1.5 // 无效值
      })).toThrow('Invalid confidence threshold');
      
      expect(() => new FaceAuthService({
        provider: 'invalid' as any
      })).toThrow('Unsupported face recognition provider');
    });

    it('应该初始化人脸识别提供商', () => {
      expect(mockBaiduFaceService).toBeDefined();
    });
  });

  describe('人脸检测功能', () => {
    it('应该正确检测人脸', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data');
      const mockDetectionResult = {
        faces: [
          {
            faceId: 'face-001',
            boundingBox: {
              x: 100,
              y: 150,
              width: 200,
              height: 250
            },
            confidence: 0.95,
            landmarks: {
              leftEye: { x: 150, y: 200 },
              rightEye: { x: 200, y: 200 },
              nose: { x: 175, y: 225 },
              leftMouth: { x: 160, y: 250 },
              rightMouth: { x: 190, y: 250 }
            },
            attributes: {
              age: 25,
              gender: 'male',
              emotion: 'neutral',
              glasses: false,
              mask: false
            }
          }
        ],
        imageQuality: {
          brightness: 0.8,
          clarity: 0.9,
          completeness: 0.95
        }
      };
      
      mockBaiduFaceService.detectFace.mockResolvedValueOnce(mockDetectionResult);
      
      const result = await faceAuthService.detectFace(mockImageBuffer);
      
      expect(mockBaiduFaceService.detectFace).toHaveBeenCalledWith(mockImageBuffer);
      expect(result.faces).toHaveLength(1);
      expect(result.faces[0].confidence).toBe(0.95);
      expect(result.imageQuality.clarity).toBe(0.9);
    });

    it('应该处理无人脸图像', async () => {
      const mockImageBuffer = Buffer.from('no-face-image');
      
      mockBaiduFaceService.detectFace.mockResolvedValueOnce({
        faces: [],
        imageQuality: {
          brightness: 0.7,
          clarity: 0.8,
          completeness: 0.9
        }
      });
      
      const result = await faceAuthService.detectFace(mockImageBuffer);
      
      expect(result.faces).toHaveLength(0);
    });

    it('应该验证图像格式和大小', async () => {
      const oversizedImage = Buffer.alloc(3 * 1024 * 1024); // 3MB
      
      await expect(faceAuthService.detectFace(oversizedImage, 'jpg'))
        .rejects.toThrow('Image size exceeds maximum allowed size');
      
      const validImage = Buffer.from('valid-image');
      
      await expect(faceAuthService.detectFace(validImage, 'gif'))
        .rejects.toThrow('Unsupported image format');
    });

    it('应该检查人脸质量', async () => {
      const mockImageBuffer = Buffer.from('low-quality-image');
      
      mockBaiduFaceService.detectFace.mockResolvedValueOnce({
        faces: [
          {
            faceId: 'face-002',
            boundingBox: { x: 50, y: 50, width: 100, height: 120 },
            confidence: 0.5, // 低置信度
            landmarks: {},
            attributes: {}
          }
        ],
        imageQuality: {
          brightness: 0.3, // 亮度不足
          clarity: 0.4,    // 清晰度不足
          completeness: 0.8
        }
      });
      
      const result = await faceAuthService.detectFace(mockImageBuffer);
      
      expect(result.qualityCheck.passed).toBe(false);
      expect(result.qualityCheck.issues).toContain('Low face confidence');
      expect(result.qualityCheck.issues).toContain('Poor image brightness');
    });
  });

  describe('人脸比对功能', () => {
    it('应该正确比对两张人脸', async () => {
      const face1Buffer = Buffer.from('face1-data');
      const face2Buffer = Buffer.from('face2-data');
      
      const mockComparisonResult = {
        similarity: 0.92,
        confidence: 0.95,
        isMatch: true,
        threshold: 0.8,
        details: {
          faceDistance: 0.08,
          featureMatches: 0.92,
          geometricConsistency: 0.89
        }
      };
      
      mockBaiduFaceService.compareFaces.mockResolvedValueOnce(mockComparisonResult);
      
      const result = await faceAuthService.compareFaces(face1Buffer, face2Buffer);
      
      expect(mockBaiduFaceService.compareFaces).toHaveBeenCalledWith(face1Buffer, face2Buffer);
      expect(result.isMatch).toBe(true);
      expect(result.similarity).toBe(0.92);
      expect(result.confidence).toBe(0.95);
    });

    it('应该处理不匹配的人脸', async () => {
      const face1Buffer = Buffer.from('face1-data');
      const face2Buffer = Buffer.from('different-face-data');
      
      mockBaiduFaceService.compareFaces.mockResolvedValueOnce({
        similarity: 0.45,
        confidence: 0.88,
        isMatch: false,
        threshold: 0.8,
        details: {
          faceDistance: 0.55,
          featureMatches: 0.45,
          geometricConsistency: 0.42
        }
      });
      
      const result = await faceAuthService.compareFaces(face1Buffer, face2Buffer);
      
      expect(result.isMatch).toBe(false);
      expect(result.similarity).toBe(0.45);
    });

    it('应该支持批量人脸比对', async () => {
      const targetFace = Buffer.from('target-face');
      const candidateFaces = [
        Buffer.from('candidate1'),
        Buffer.from('candidate2'),
        Buffer.from('candidate3')
      ];
      
      mockBaiduFaceService.compareFaces
        .mockResolvedValueOnce({ similarity: 0.95, isMatch: true, confidence: 0.92 })
        .mockResolvedValueOnce({ similarity: 0.65, isMatch: false, confidence: 0.85 })
        .mockResolvedValueOnce({ similarity: 0.88, isMatch: true, confidence: 0.90 });
      
      const results = await faceAuthService.batchCompareFaces(targetFace, candidateFaces);
      
      expect(results).toHaveLength(3);
      expect(results[0].isMatch).toBe(true);
      expect(results[1].isMatch).toBe(false);
      expect(results[2].isMatch).toBe(true);
    });
  });

  describe('活体检测功能', () => {
    it('应该正确进行活体检测', async () => {
      const mockVideoFrames = [
        Buffer.from('frame1'),
        Buffer.from('frame2'),
        Buffer.from('frame3')
      ];
      
      const mockLivenessResult = {
        isLive: true,
        confidence: 0.85,
        score: 0.88,
        details: {
          blinkDetected: true,
          headMovement: true,
          lipMovement: false,
          eyeGaze: true,
          textureAnalysis: 0.82,
          depthAnalysis: 0.79
        },
        challenges: [
          { type: 'blink', completed: true, score: 0.9 },
          { type: 'turn_head', completed: true, score: 0.8 }
        ]
      };
      
      mockBaiduFaceService.livenessDetection.mockResolvedValueOnce(mockLivenessResult);
      
      const result = await faceAuthService.verifyLiveness(mockVideoFrames);
      
      expect(mockBaiduFaceService.livenessDetection).toHaveBeenCalledWith(mockVideoFrames);
      expect(result.isLive).toBe(true);
      expect(result.confidence).toBe(0.85);
      expect(result.details.blinkDetected).toBe(true);
    });

    it('应该检测到非活体', async () => {
      const mockVideoFrames = [Buffer.from('static-image')];
      
      mockBaiduFaceService.livenessDetection.mockResolvedValueOnce({
        isLive: false,
        confidence: 0.95,
        score: 0.25,
        details: {
          blinkDetected: false,
          headMovement: false,
          lipMovement: false,
          eyeGaze: false,
          textureAnalysis: 0.3,
          depthAnalysis: 0.2
        },
        challenges: [
          { type: 'blink', completed: false, score: 0.1 },
          { type: 'turn_head', completed: false, score: 0.2 }
        ]
      });
      
      const result = await faceAuthService.verifyLiveness(mockVideoFrames);
      
      expect(result.isLive).toBe(false);
      expect(result.score).toBe(0.25);
    });

    it('应该支持实时活体检测', async () => {
      const mockStream = {
        getVideoTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }])
      };
      
      const mockFrameCallback = jest.fn();
      
      // 模拟实时帧处理
      jest.spyOn(faceAuthService, 'startLivenessDetection').mockImplementationOnce(
        async (stream, callback) => {
          // 模拟几帧数据
          for (let i = 0; i < 3; i++) {
            await callback({
              frameNumber: i + 1,
              timestamp: Date.now(),
              isLive: i > 0, // 第一帧为false，后续为true
              confidence: 0.7 + i * 0.1
            });
          }
          return 'session-123';
        }
      );
      
      const sessionId = await faceAuthService.startLivenessDetection(
        mockStream as any,
        mockFrameCallback
      );
      
      expect(sessionId).toBe('session-123');
      expect(mockFrameCallback).toHaveBeenCalledTimes(3);
    });
  });

  describe('人脸模板管理', () => {
    it('应该注册人脸模板', async () => {
      const userId = 'user-123';
      const faceImage = Buffer.from('face-image-data');
      
      const mockTemplate = {
        templateId: 'template-456',
        userId: 'user-123',
        features: 'encoded-face-features',
        quality: 0.92,
        createdAt: new Date(),
        metadata: {
          imageSize: faceImage.length,
          detectionConfidence: 0.95,
          landmarks: {}
        }
      };
      
      // 模拟人脸检测
      mockBaiduFaceService.detectFace.mockResolvedValueOnce({
        faces: [{
          faceId: 'face-001',
          confidence: 0.95,
          boundingBox: { x: 100, y: 100, width: 200, height: 200 },
          landmarks: {},
          attributes: {}
        }],
        imageQuality: { brightness: 0.8, clarity: 0.9, completeness: 0.95 }
      });
      
      // 模拟特征提取
      mockFaceRecognitionService.extractFeatures.mockResolvedValueOnce('encoded-face-features');
      
      // 模拟数据库插入
      mockSupabase.from().insert().mockResolvedValueOnce({
        data: [mockTemplate],
        error: null
      });
      
      // 模拟云存储上传
      mockCloudStorageService.uploadFile.mockResolvedValueOnce({
        url: 'https://storage.example.com/faces/template-456.jpg',
        key: 'faces/template-456.jpg'
      });
      
      const result = await faceAuthService.registerFaceTemplate(userId, faceImage);
      
      expect(result.templateId).toBe('template-456');
      expect(result.quality).toBe(0.92);
      expect(mockSupabase.from).toHaveBeenCalledWith('face_templates');
      expect(mockCloudStorageService.uploadFile).toHaveBeenCalled();
    });

    it('应该更新人脸模板', async () => {
      const templateId = 'template-456';
      const newFaceImage = Buffer.from('new-face-image');
      
      mockBaiduFaceService.detectFace.mockResolvedValueOnce({
        faces: [{ faceId: 'face-002', confidence: 0.98 }],
        imageQuality: { brightness: 0.9, clarity: 0.95, completeness: 0.98 }
      });
      
      mockFaceRecognitionService.extractFeatures.mockResolvedValueOnce('new-encoded-features');
      
      mockSupabase.from().update().eq().mockResolvedValueOnce({
        data: [{ templateId, features: 'new-encoded-features', quality: 0.98 }],
        error: null
      });
      
      const result = await faceAuthService.updateFaceTemplate(templateId, newFaceImage);
      
      expect(result.quality).toBe(0.98);
      expect(mockSupabase.from().update).toHaveBeenCalled();
    });

    it('应该删除人脸模板', async () => {
      const templateId = 'template-456';
      
      // 模拟获取模板信息
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          templateId,
          userId: 'user-123',
          imageUrl: 'https://storage.example.com/faces/template-456.jpg'
        },
        error: null
      });
      
      // 模拟删除数据库记录
      mockSupabase.from().delete().eq().mockResolvedValueOnce({
        data: null,
        error: null
      });
      
      // 模拟删除云存储文件
      mockCloudStorageService.deleteFile.mockResolvedValueOnce(true);
      
      const result = await faceAuthService.deleteFaceTemplate(templateId);
      
      expect(result).toBe(true);
      expect(mockSupabase.from().delete).toHaveBeenCalled();
      expect(mockCloudStorageService.deleteFile).toHaveBeenCalled();
    });

    it('应该搜索相似人脸', async () => {
      const queryImage = Buffer.from('query-face');
      const limit = 5;
      
      const mockSearchResults = [
        {
          templateId: 'template-001',
          userId: 'user-001',
          similarity: 0.95,
          confidence: 0.92
        },
        {
          templateId: 'template-002',
          userId: 'user-002',
          similarity: 0.88,
          confidence: 0.85
        }
      ];
      
      mockBaiduFaceService.searchFaceInGroup.mockResolvedValueOnce(mockSearchResults);
      
      const results = await faceAuthService.searchSimilarFaces(queryImage, limit);
      
      expect(results).toHaveLength(2);
      expect(results[0].similarity).toBe(0.95);
      expect(results[1].similarity).toBe(0.88);
    });
  });

  describe('用户认证流程', () => {
    it('应该成功认证用户', async () => {
      const userId = 'user-123';
      const authImage = Buffer.from('auth-face-image');
      
      // 模拟获取用户人脸模板
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [
          {
            templateId: 'template-456',
            features: 'stored-features',
            quality: 0.9
          }
        ],
        error: null
      });
      
      // 模拟人脸检测
      mockBaiduFaceService.detectFace.mockResolvedValueOnce({
        faces: [{ faceId: 'face-001', confidence: 0.95 }],
        imageQuality: { brightness: 0.8, clarity: 0.9, completeness: 0.95 }
      });
      
      // 模拟人脸比对
      mockBaiduFaceService.compareFaces.mockResolvedValueOnce({
        similarity: 0.92,
        confidence: 0.95,
        isMatch: true,
        threshold: 0.8
      });
      
      // 模拟活体检测
      mockBaiduFaceService.livenessDetection.mockResolvedValueOnce({
        isLive: true,
        confidence: 0.85,
        score: 0.88
      });
      
      const result = await faceAuthService.authenticateUser(userId, authImage, {
        enableLiveness: true,
        requireHighConfidence: true
      });
      
      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.95);
      expect(result.similarity).toBe(0.92);
      expect(result.livenessCheck.passed).toBe(true);
    });

    it('应该拒绝低置信度认证', async () => {
      const userId = 'user-123';
      const authImage = Buffer.from('low-quality-image');
      
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [{ templateId: 'template-456', features: 'stored-features' }],
        error: null
      });
      
      mockBaiduFaceService.detectFace.mockResolvedValueOnce({
        faces: [{ faceId: 'face-001', confidence: 0.6 }], // 低置信度
        imageQuality: { brightness: 0.5, clarity: 0.6, completeness: 0.7 }
      });
      
      const result = await faceAuthService.authenticateUser(userId, authImage);
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Low detection confidence');
    });

    it('应该拒绝活体检测失败的认证', async () => {
      const userId = 'user-123';
      const authImage = Buffer.from('static-image');
      
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [{ templateId: 'template-456', features: 'stored-features' }],
        error: null
      });
      
      mockBaiduFaceService.detectFace.mockResolvedValueOnce({
        faces: [{ faceId: 'face-001', confidence: 0.95 }],
        imageQuality: { brightness: 0.8, clarity: 0.9, completeness: 0.95 }
      });
      
      mockBaiduFaceService.livenessDetection.mockResolvedValueOnce({
        isLive: false,
        confidence: 0.95,
        score: 0.3
      });
      
      const result = await faceAuthService.authenticateUser(userId, authImage, {
        enableLiveness: true
      });
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Liveness detection failed');
    });

    it('应该处理多模板用户认证', async () => {
      const userId = 'user-123';
      const authImage = Buffer.from('auth-image');
      
      // 模拟用户有多个人脸模板
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [
          { templateId: 'template-001', features: 'features-1', quality: 0.9 },
          { templateId: 'template-002', features: 'features-2', quality: 0.85 },
          { templateId: 'template-003', features: 'features-3', quality: 0.95 }
        ],
        error: null
      });
      
      mockBaiduFaceService.detectFace.mockResolvedValueOnce({
        faces: [{ faceId: 'face-001', confidence: 0.95 }],
        imageQuality: { brightness: 0.8, clarity: 0.9, completeness: 0.95 }
      });
      
      // 模拟与不同模板的比对结果
      mockBaiduFaceService.compareFaces
        .mockResolvedValueOnce({ similarity: 0.75, isMatch: false, confidence: 0.8 })
        .mockResolvedValueOnce({ similarity: 0.92, isMatch: true, confidence: 0.95 })
        .mockResolvedValueOnce({ similarity: 0.88, isMatch: true, confidence: 0.9 });
      
      const result = await faceAuthService.authenticateUser(userId, authImage);
      
      expect(result.success).toBe(true);
      expect(result.similarity).toBe(0.92); // 最高相似度
      expect(result.matchedTemplateId).toBe('template-002');
    });
  });

  describe('错误处理和监控', () => {
    it('应该处理人脸检测API错误', async () => {
      const mockImageBuffer = Buffer.from('image-data');
      const apiError = new Error('Face detection API error');
      
      mockBaiduFaceService.detectFace.mockRejectedValueOnce(apiError);
      
      await expect(faceAuthService.detectFace(mockImageBuffer))
        .rejects.toThrow('Face detection API error');
      
      expect(mockMonitoringService.recordError).toHaveBeenCalledWith(
        'face_detection_error',
        expect.objectContaining({
          error: 'Face detection API error'
        })
      );
    });

    it('应该处理数据库连接错误', async () => {
      const userId = 'user-123';
      const faceImage = Buffer.from('face-data');
      
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      });
      
      await expect(faceAuthService.authenticateUser(userId, faceImage))
        .rejects.toThrow('Database connection failed');
    });

    it('应该记录认证指标', async () => {
      const userId = 'user-123';
      const authImage = Buffer.from('auth-image');
      
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [{ templateId: 'template-456', features: 'features' }],
        error: null
      });
      
      mockBaiduFaceService.detectFace.mockResolvedValueOnce({
        faces: [{ faceId: 'face-001', confidence: 0.95 }],
        imageQuality: { brightness: 0.8, clarity: 0.9, completeness: 0.95 }
      });
      
      mockBaiduFaceService.compareFaces.mockResolvedValueOnce({
        similarity: 0.92,
        confidence: 0.95,
        isMatch: true
      });
      
      await faceAuthService.authenticateUser(userId, authImage);
      
      expect(mockMonitoringService.recordMetric).toHaveBeenCalledWith(
        'face_authentication',
        expect.objectContaining({
          userId,
          success: true,
          confidence: 0.95,
          similarity: 0.92
        })
      );
    });

    it('应该记录性能指标', async () => {
      const mockImageBuffer = Buffer.from('image-data');
      
      mockBaiduFaceService.detectFace.mockImplementationOnce(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              faces: [{ faceId: 'face-001', confidence: 0.95 }],
              imageQuality: { brightness: 0.8, clarity: 0.9, completeness: 0.95 }
            });
          }, 1000);
        });
      });
      
      await faceAuthService.detectFace(mockImageBuffer);
      
      expect(mockMonitoringService.recordLatency).toHaveBeenCalledWith(
        'face_detection_latency',
        expect.any(Number),
        expect.objectContaining({
          provider: 'baidu'
        })
      );
    });
  });

  describe('便捷函数', () => {
    it('detectFace 函数应该正常工作', async () => {
      const mockImageBuffer = Buffer.from('image-data');
      
      mockBaiduFaceService.detectFace.mockResolvedValueOnce({
        faces: [{ faceId: 'face-001', confidence: 0.95 }],
        imageQuality: { brightness: 0.8, clarity: 0.9, completeness: 0.95 }
      });
      
      const result = await detectFace(mockImageBuffer);
      
      expect(result.faces).toHaveLength(1);
      expect(result.faces[0].confidence).toBe(0.95);
    });

    it('compareFaces 函数应该正常工作', async () => {
      const face1 = Buffer.from('face1');
      const face2 = Buffer.from('face2');
      
      mockBaiduFaceService.compareFaces.mockResolvedValueOnce({
        similarity: 0.92,
        confidence: 0.95,
        isMatch: true
      });
      
      const result = await compareFaces(face1, face2);
      
      expect(result.isMatch).toBe(true);
      expect(result.similarity).toBe(0.92);
    });

    it('authenticateUser 函数应该正常工作', async () => {
      const userId = 'user-123';
      const authImage = Buffer.from('auth-image');
      
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [{ templateId: 'template-456', features: 'features' }],
        error: null
      });
      
      mockBaiduFaceService.detectFace.mockResolvedValueOnce({
        faces: [{ faceId: 'face-001', confidence: 0.95 }],
        imageQuality: { brightness: 0.8, clarity: 0.9, completeness: 0.95 }
      });
      
      mockBaiduFaceService.compareFaces.mockResolvedValueOnce({
        similarity: 0.92,
        confidence: 0.95,
        isMatch: true
      });
      
      const result = await authenticateUser(userId, authImage);
      
      expect(result.success).toBe(true);
    });
  });

  describe('性能测试', () => {
    it('人脸检测应该在合理时间内完成', async () => {
      const mockImageBuffer = Buffer.from('image-data');
      
      mockBaiduFaceService.detectFace.mockResolvedValueOnce({
        faces: [{ faceId: 'face-001', confidence: 0.95 }],
        imageQuality: { brightness: 0.8, clarity: 0.9, completeness: 0.95 }
      });
      
      const { duration } = await testUtils.performanceUtils.measureTime(() => {
        return faceAuthService.detectFace(mockImageBuffer);
      });
      
      expect(duration).toBeLessThan(10000); // 应该在10秒内完成
    });

    it('批量人脸比对应该高效处理', async () => {
      const targetFace = Buffer.from('target');
      const candidates = Array.from({ length: 50 }, (_, i) => 
        Buffer.from(`candidate-${i}`)
      );
      
      mockBaiduFaceService.compareFaces.mockResolvedValue({
        similarity: 0.8,
        confidence: 0.9,
        isMatch: true
      });
      
      const { duration } = await testUtils.performanceUtils.measureTime(() => {
        return faceAuthService.batchCompareFaces(targetFace, candidates);
      });
      
      expect(duration).toBeLessThan(30000); // 应该在30秒内完成
    });

    it('用户认证应该快速响应', async () => {
      const userId = 'user-123';
      const authImage = Buffer.from('auth-image');
      
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [{ templateId: 'template-456', features: 'features' }],
        error: null
      });
      
      mockBaiduFaceService.detectFace.mockResolvedValueOnce({
        faces: [{ faceId: 'face-001', confidence: 0.95 }],
        imageQuality: { brightness: 0.8, clarity: 0.9, completeness: 0.95 }
      });
      
      mockBaiduFaceService.compareFaces.mockResolvedValueOnce({
        similarity: 0.92,
        confidence: 0.95,
        isMatch: true
      });
      
      const { duration } = await testUtils.performanceUtils.measureTime(() => {
        return faceAuthService.authenticateUser(userId, authImage);
      });
      
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });
  });
});