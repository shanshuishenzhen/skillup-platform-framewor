/**
 * 人脸识别服务单元测试
 * 测试百度AI人脸识别API集成、人脸检测、比对等功能
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  FaceRecognitionService,
  detectFace,
  compareFaces,
  verifyIdentity,
  FaceRecognitionConfig
} from '@/services/faceRecognitionService';
import { testUtils } from '../setup';

// 模拟百度AI客户端
const mockBaiduClient = {
  faceDetect: jest.fn(),
  faceMatch: jest.fn(),
  faceSearch: jest.fn(),
  faceVerify: jest.fn()
};

// 模拟环境配置
const mockEnvConfig = {
  getBaiduAI: jest.fn(() => ({
    client: mockBaiduClient,
    apiKey: 'test-baidu-key',
    secretKey: 'test-baidu-secret'
  }))
};

jest.mock('@/utils/envConfig', () => ({
  getEnvConfig: () => mockEnvConfig
}));

// 模拟错误处理器
const mockErrorHandler = {
  withRetry: jest.fn(),
  createError: jest.fn(),
  logError: jest.fn()
};

jest.mock('@/utils/errorHandler', () => ({
  errorHandler: mockErrorHandler
}));

// 模拟文件处理
const mockFileUtils = {
  convertToBase64: jest.fn(),
  validateImageFormat: jest.fn(),
  compressImage: jest.fn()
};

jest.mock('@/utils/fileUtils', () => mockFileUtils);

describe('FaceRecognitionService', () => {
  let faceService: FaceRecognitionService;

  beforeEach(() => {
    jest.clearAllMocks();
    faceService = new FaceRecognitionService();
    
    // 设置默认的成功响应
    mockErrorHandler.withRetry.mockImplementation(async (fn) => await fn());
    mockFileUtils.validateImageFormat.mockReturnValue(true);
    mockFileUtils.convertToBase64.mockResolvedValue('base64-image-data');
  });

  describe('detectFace', () => {
    it('应该成功检测人脸', async () => {
      const mockResponse = {
        error_code: 0,
        error_msg: 'SUCCESS',
        result: {
          face_num: 1,
          face_list: [
            {
              face_token: 'face-token-123',
              location: {
                left: 100,
                top: 150,
                width: 200,
                height: 250,
                rotation: 5
              },
              face_probability: 0.98,
              angle: {
                yaw: -2.5,
                pitch: 1.2,
                roll: 5.1
              },
              age: 25,
              beauty: 75.5,
              expression: {
                type: 'smile',
                probability: 0.85
              },
              face_shape: {
                type: 'oval',
                probability: 0.92
              },
              gender: {
                type: 'male',
                probability: 0.88
              },
              glasses: {
                type: 'none',
                probability: 0.95
              },
              emotion: {
                type: 'happy',
                probability: 0.87
              },
              face_type: {
                type: 'human',
                probability: 0.99
              },
              mask: {
                type: 0,
                probability: 0.02
              },
              quality: {
                occlusion: {
                  left_eye: 0.1,
                  right_eye: 0.05,
                  nose: 0.02,
                  mouth: 0.03,
                  left_cheek: 0.01,
                  right_cheek: 0.01,
                  chin: 0.02
                },
                blur: 0.15,
                illumination: 85,
                completeness: 1
              }
            }
          ]
        }
      };
      
      mockBaiduClient.faceDetect.mockResolvedValue(mockResponse);
      
      const imageFile = testUtils.createMockFile('test-image.jpg', 'image/jpeg');
      const result = await faceService.detectFace(imageFile);
      
      expect(result.success).toBe(true);
      expect(result.faceCount).toBe(1);
      expect(result.faces).toHaveLength(1);
      expect(result.faces[0].faceToken).toBe('face-token-123');
      expect(result.faces[0].confidence).toBe(0.98);
      expect(result.faces[0].attributes.age).toBe(25);
      expect(result.faces[0].attributes.gender).toBe('male');
      expect(result.faces[0].attributes.emotion).toBe('happy');
      expect(result.faces[0].quality.blur).toBe(0.15);
    });

    it('应该处理无人脸的图片', async () => {
      const mockResponse = {
        error_code: 0,
        error_msg: 'SUCCESS',
        result: {
          face_num: 0,
          face_list: []
        }
      };
      
      mockBaiduClient.faceDetect.mockResolvedValue(mockResponse);
      
      const imageFile = testUtils.createMockFile('no-face.jpg', 'image/jpeg');
      const result = await faceService.detectFace(imageFile);
      
      expect(result.success).toBe(true);
      expect(result.faceCount).toBe(0);
      expect(result.faces).toHaveLength(0);
    });

    it('应该处理多人脸图片', async () => {
      const mockResponse = {
        error_code: 0,
        error_msg: 'SUCCESS',
        result: {
          face_num: 3,
          face_list: [
            {
              face_token: 'face-1',
              face_probability: 0.95,
              location: { left: 50, top: 60, width: 100, height: 120 }
            },
            {
              face_token: 'face-2',
              face_probability: 0.92,
              location: { left: 200, top: 80, width: 110, height: 130 }
            },
            {
              face_token: 'face-3',
              face_probability: 0.88,
              location: { left: 350, top: 100, width: 95, height: 115 }
            }
          ]
        }
      };
      
      mockBaiduClient.faceDetect.mockResolvedValue(mockResponse);
      
      const imageFile = testUtils.createMockFile('multi-face.jpg', 'image/jpeg');
      const result = await faceService.detectFace(imageFile);
      
      expect(result.success).toBe(true);
      expect(result.faceCount).toBe(3);
      expect(result.faces).toHaveLength(3);
      expect(result.faces.map(f => f.faceToken)).toEqual(['face-1', 'face-2', 'face-3']);
    });

    it('应该处理百度AI API错误', async () => {
      const mockResponse = {
        error_code: 216630,
        error_msg: 'recognize error'
      };
      
      mockBaiduClient.faceDetect.mockResolvedValue(mockResponse);
      
      const imageFile = testUtils.createMockFile('error-image.jpg', 'image/jpeg');
      const result = await faceService.detectFace(imageFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('recognize error');
      expect(result.errorCode).toBe(216630);
    });

    it('应该验证图片格式', async () => {
      mockFileUtils.validateImageFormat.mockReturnValue(false);
      
      const invalidFile = testUtils.createMockFile('test.txt', 'text/plain');
      
      await expect(faceService.detectFace(invalidFile)).rejects.toThrow('Invalid image format');
    });

    it('应该处理图片转换错误', async () => {
      mockFileUtils.convertToBase64.mockRejectedValue(new Error('Conversion failed'));
      
      const imageFile = testUtils.createMockFile('test-image.jpg', 'image/jpeg');
      
      await expect(faceService.detectFace(imageFile)).rejects.toThrow('Conversion failed');
    });

    it('应该处理网络错误', async () => {
      const networkError = new Error('Network timeout');
      mockBaiduClient.faceDetect.mockRejectedValue(networkError);
      mockErrorHandler.withRetry.mockRejectedValue(networkError);
      
      const imageFile = testUtils.createMockFile('test-image.jpg', 'image/jpeg');
      
      await expect(faceService.detectFace(imageFile)).rejects.toThrow('Network timeout');
      expect(mockErrorHandler.withRetry).toHaveBeenCalled();
    });
  });

  describe('compareFaces', () => {
    it('应该成功比较两张人脸', async () => {
      const mockResponse = {
        error_code: 0,
        error_msg: 'SUCCESS',
        result: {
          score: 85.67,
          face_list: [
            {
              face_token: 'face-1'
            },
            {
              face_token: 'face-2'
            }
          ]
        }
      };
      
      mockBaiduClient.faceMatch.mockResolvedValue(mockResponse);
      
      const image1 = testUtils.createMockFile('face1.jpg', 'image/jpeg');
      const image2 = testUtils.createMockFile('face2.jpg', 'image/jpeg');
      
      const result = await faceService.compareFaces(image1, image2);
      
      expect(result.success).toBe(true);
      expect(result.similarity).toBe(85.67);
      expect(result.isMatch).toBe(true); // 假设阈值为80
      expect(result.confidence).toBe('high');
    });

    it('应该识别不匹配的人脸', async () => {
      const mockResponse = {
        error_code: 0,
        error_msg: 'SUCCESS',
        result: {
          score: 45.23,
          face_list: [
            {
              face_token: 'face-1'
            },
            {
              face_token: 'face-2'
            }
          ]
        }
      };
      
      mockBaiduClient.faceMatch.mockResolvedValue(mockResponse);
      
      const image1 = testUtils.createMockFile('face1.jpg', 'image/jpeg');
      const image2 = testUtils.createMockFile('face2.jpg', 'image/jpeg');
      
      const result = await faceService.compareFaces(image1, image2);
      
      expect(result.success).toBe(true);
      expect(result.similarity).toBe(45.23);
      expect(result.isMatch).toBe(false);
      expect(result.confidence).toBe('low');
    });

    it('应该处理不同的相似度阈值', async () => {
      const testCases = [
        { score: 95, threshold: 90, expectedMatch: true, expectedConfidence: 'high' },
        { score: 85, threshold: 80, expectedMatch: true, expectedConfidence: 'high' },
        { score: 75, threshold: 80, expectedMatch: false, expectedConfidence: 'medium' },
        { score: 45, threshold: 60, expectedMatch: false, expectedConfidence: 'low' }
      ];
      
      for (const testCase of testCases) {
        const mockResponse = {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: {
            score: testCase.score,
            face_list: [{ face_token: 'face-1' }, { face_token: 'face-2' }]
          }
        };
        
        mockBaiduClient.faceMatch.mockResolvedValue(mockResponse);
        
        const image1 = testUtils.createMockFile('face1.jpg', 'image/jpeg');
        const image2 = testUtils.createMockFile('face2.jpg', 'image/jpeg');
        
        const result = await faceService.compareFaces(image1, image2, {
          threshold: testCase.threshold
        });
        
        expect(result.isMatch).toBe(testCase.expectedMatch);
        expect(result.confidence).toBe(testCase.expectedConfidence);
      }
    });

    it('应该处理比较错误', async () => {
      const mockResponse = {
        error_code: 222202,
        error_msg: 'pic not has face'
      };
      
      mockBaiduClient.faceMatch.mockResolvedValue(mockResponse);
      
      const image1 = testUtils.createMockFile('no-face1.jpg', 'image/jpeg');
      const image2 = testUtils.createMockFile('no-face2.jpg', 'image/jpeg');
      
      const result = await faceService.compareFaces(image1, image2);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('pic not has face');
      expect(result.errorCode).toBe(222202);
    });
  });

  describe('verifyIdentity', () => {
    it('应该成功验证身份', async () => {
      const mockResponse = {
        error_code: 0,
        error_msg: 'SUCCESS',
        result: {
          score: 92.45,
          face_liveness: 0.95,
          thresholds: {
            frr_1e4: 0.05,
            frr_1e3: 0.7,
            frr_1e2: 0.9
          }
        }
      };
      
      mockBaiduClient.faceVerify.mockResolvedValue(mockResponse);
      
      const liveImage = testUtils.createMockFile('live-face.jpg', 'image/jpeg');
      const idImage = testUtils.createMockFile('id-photo.jpg', 'image/jpeg');
      
      const result = await faceService.verifyIdentity({
        liveImage,
        idImage,
        userId: 'user-123',
        idNumber: '123456789012345678'
      });
      
      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.similarity).toBe(92.45);
      expect(result.liveness).toBe(0.95);
      expect(result.confidence).toBe('high');
    });

    it('应该检测活体检测失败', async () => {
      const mockResponse = {
        error_code: 0,
        error_msg: 'SUCCESS',
        result: {
          score: 88.5,
          face_liveness: 0.3, // 低活体分数
          thresholds: {
            frr_1e4: 0.05,
            frr_1e3: 0.7,
            frr_1e2: 0.9
          }
        }
      };
      
      mockBaiduClient.faceVerify.mockResolvedValue(mockResponse);
      
      const liveImage = testUtils.createMockFile('fake-face.jpg', 'image/jpeg');
      const idImage = testUtils.createMockFile('id-photo.jpg', 'image/jpeg');
      
      const result = await faceService.verifyIdentity({
        liveImage,
        idImage,
        userId: 'user-123',
        idNumber: '123456789012345678'
      });
      
      expect(result.success).toBe(true);
      expect(result.verified).toBe(false);
      expect(result.failureReason).toBe('liveness_check_failed');
      expect(result.liveness).toBe(0.3);
    });

    it('应该检测相似度不足', async () => {
      const mockResponse = {
        error_code: 0,
        error_msg: 'SUCCESS',
        result: {
          score: 65.2, // 低相似度
          face_liveness: 0.95,
          thresholds: {
            frr_1e4: 0.05,
            frr_1e3: 0.7,
            frr_1e2: 0.9
          }
        }
      };
      
      mockBaiduClient.faceVerify.mockResolvedValue(mockResponse);
      
      const liveImage = testUtils.createMockFile('different-face.jpg', 'image/jpeg');
      const idImage = testUtils.createMockFile('id-photo.jpg', 'image/jpeg');
      
      const result = await faceService.verifyIdentity({
        liveImage,
        idImage,
        userId: 'user-123',
        idNumber: '123456789012345678'
      });
      
      expect(result.success).toBe(true);
      expect(result.verified).toBe(false);
      expect(result.failureReason).toBe('similarity_too_low');
      expect(result.similarity).toBe(65.2);
    });

    it('应该处理验证错误', async () => {
      const mockResponse = {
        error_code: 216634,
        error_msg: 'face verify error'
      };
      
      mockBaiduClient.faceVerify.mockResolvedValue(mockResponse);
      
      const liveImage = testUtils.createMockFile('error-face.jpg', 'image/jpeg');
      const idImage = testUtils.createMockFile('id-photo.jpg', 'image/jpeg');
      
      const result = await faceService.verifyIdentity({
        liveImage,
        idImage,
        userId: 'user-123',
        idNumber: '123456789012345678'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('face verify error');
      expect(result.errorCode).toBe(216634);
    });

    it('应该验证必需参数', async () => {
      const liveImage = testUtils.createMockFile('live-face.jpg', 'image/jpeg');
      const idImage = testUtils.createMockFile('id-photo.jpg', 'image/jpeg');
      
      // 缺少userId
      await expect(faceService.verifyIdentity({
        liveImage,
        idImage,
        idNumber: '123456789012345678'
      } as { liveImage: File; idImage: File; idNumber: string })).rejects.toThrow('Missing required parameter: userId');
      
      // 缺少idNumber
      await expect(faceService.verifyIdentity({
        liveImage,
        idImage,
        userId: 'user-123'
      } as { liveImage: File; idImage: File; userId: string })).rejects.toThrow('Missing required parameter: idNumber');
      
      // 无效的身份证号
      await expect(faceService.verifyIdentity({
        liveImage,
        idImage,
        userId: 'user-123',
        idNumber: '123' // 太短
      })).rejects.toThrow('Invalid ID number format');
    });
  });

  describe('FaceRecognitionConfig', () => {
    it('应该使用默认配置', () => {
      const config = new FaceRecognitionConfig();
      
      expect(config.similarityThreshold).toBe(80);
      expect(config.livenessThreshold).toBe(0.7);
      expect(config.maxImageSize).toBe(4 * 1024 * 1024); // 4MB
      expect(config.supportedFormats).toEqual(['jpg', 'jpeg', 'png', 'bmp']);
      expect(config.retryAttempts).toBe(3);
      expect(config.timeout).toBe(30000);
    });

    it('应该允许自定义配置', () => {
      const customConfig = new FaceRecognitionConfig({
        similarityThreshold: 85,
        livenessThreshold: 0.8,
        maxImageSize: 2 * 1024 * 1024,
        supportedFormats: ['jpg', 'png'],
        retryAttempts: 5,
        timeout: 60000
      });
      
      expect(customConfig.similarityThreshold).toBe(85);
      expect(customConfig.livenessThreshold).toBe(0.8);
      expect(customConfig.maxImageSize).toBe(2 * 1024 * 1024);
      expect(customConfig.supportedFormats).toEqual(['jpg', 'png']);
      expect(customConfig.retryAttempts).toBe(5);
      expect(customConfig.timeout).toBe(60000);
    });

    it('应该验证配置参数', () => {
      expect(() => {
        new FaceRecognitionConfig({
          similarityThreshold: 150 // 超出范围
        });
      }).toThrow('Similarity threshold must be between 0 and 100');
      
      expect(() => {
        new FaceRecognitionConfig({
          livenessThreshold: 1.5 // 超出范围
        });
      }).toThrow('Liveness threshold must be between 0 and 1');
      
      expect(() => {
        new FaceRecognitionConfig({
          maxImageSize: -1 // 负值
        });
      }).toThrow('Max image size must be positive');
    });
  });

  describe('便捷函数', () => {
    it('detectFace函数应该正常工作', async () => {
      const mockResponse = {
        error_code: 0,
        error_msg: 'SUCCESS',
        result: {
          face_num: 1,
          face_list: [{
            face_token: 'test-token',
            face_probability: 0.95
          }]
        }
      };
      
      mockBaiduClient.faceDetect.mockResolvedValue(mockResponse);
      
      const imageFile = testUtils.createMockFile('test-image.jpg', 'image/jpeg');
      const result = await detectFace(imageFile);
      
      expect(result.success).toBe(true);
      expect(result.faceCount).toBe(1);
    });

    it('compareFaces函数应该正常工作', async () => {
      const mockResponse = {
        error_code: 0,
        error_msg: 'SUCCESS',
        result: {
          score: 90.5,
          face_list: [{ face_token: 'face-1' }, { face_token: 'face-2' }]
        }
      };
      
      mockBaiduClient.faceMatch.mockResolvedValue(mockResponse);
      
      const image1 = testUtils.createMockFile('face1.jpg', 'image/jpeg');
      const image2 = testUtils.createMockFile('face2.jpg', 'image/jpeg');
      
      const result = await compareFaces(image1, image2);
      
      expect(result.success).toBe(true);
      expect(result.similarity).toBe(90.5);
      expect(result.isMatch).toBe(true);
    });

    it('verifyIdentity函数应该正常工作', async () => {
      const mockResponse = {
        error_code: 0,
        error_msg: 'SUCCESS',
        result: {
          score: 95.2,
          face_liveness: 0.92,
          thresholds: { frr_1e4: 0.05, frr_1e3: 0.7, frr_1e2: 0.9 }
        }
      };
      
      mockBaiduClient.faceVerify.mockResolvedValue(mockResponse);
      
      const liveImage = testUtils.createMockFile('live-face.jpg', 'image/jpeg');
      const idImage = testUtils.createMockFile('id-photo.jpg', 'image/jpeg');
      
      const result = await verifyIdentity({
        liveImage,
        idImage,
        userId: 'user-123',
        idNumber: '123456789012345678'
      });
      
      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理超大图片文件', async () => {
      const largeFile = testUtils.createMockFile('large-image.jpg', 'image/jpeg', 10 * 1024 * 1024); // 10MB
      
      await expect(faceService.detectFace(largeFile)).rejects.toThrow('Image file too large');
    });

    it('应该处理损坏的图片文件', async () => {
      mockFileUtils.convertToBase64.mockRejectedValue(new Error('Invalid image data'));
      
      const corruptedFile = testUtils.createMockFile('corrupted.jpg', 'image/jpeg');
      
      await expect(faceService.detectFace(corruptedFile)).rejects.toThrow('Invalid image data');
    });

    it('应该处理API配额耗尽', async () => {
      const quotaError = {
        error_code: 17,
        error_msg: 'Open api daily request limit reached'
      };
      
      mockBaiduClient.faceDetect.mockResolvedValue(quotaError);
      
      const imageFile = testUtils.createMockFile('test-image.jpg', 'image/jpeg');
      const result = await faceService.detectFace(imageFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Open api daily request limit reached');
      expect(result.errorCode).toBe(17);
    });

    it('应该处理并发请求', async () => {
      const mockResponse = {
        error_code: 0,
        error_msg: 'SUCCESS',
        result: {
          face_num: 1,
          face_list: [{ face_token: 'concurrent-token', face_probability: 0.95 }]
        }
      };
      
      mockBaiduClient.faceDetect.mockResolvedValue(mockResponse);
      
      const promises = Array.from({ length: 5 }, (_, i) => {
        const imageFile = testUtils.createMockFile(`image-${i}.jpg`, 'image/jpeg');
        return faceService.detectFace(imageFile);
      });
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('应该处理网络不稳定', async () => {
      let callCount = 0;
      mockBaiduClient.faceDetect.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          error_code: 0,
          error_msg: 'SUCCESS',
          result: { face_num: 1, face_list: [{ face_token: 'retry-token' }] }
        });
      });
      
      mockErrorHandler.withRetry.mockImplementation(async (fn) => {
        let attempts = 0;
        while (attempts < 3) {
          try {
            return await fn();
          } catch (error) {
            attempts++;
            if (attempts >= 3) throw error;
          }
        }
      });
      
      const imageFile = testUtils.createMockFile('test-image.jpg', 'image/jpeg');
      const result = await faceService.detectFace(imageFile);
      
      expect(result.success).toBe(true);
      expect(callCount).toBe(3); // 重试了2次后成功
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成人脸检测', async () => {
      const mockResponse = {
        error_code: 0,
        error_msg: 'SUCCESS',
        result: {
          face_num: 1,
          face_list: [{ face_token: 'performance-token', face_probability: 0.95 }]
        }
      };
      
      mockBaiduClient.faceDetect.mockResolvedValue(mockResponse);
      
      const startTime = Date.now();
      const imageFile = testUtils.createMockFile('test-image.jpg', 'image/jpeg');
      const result = await faceService.detectFace(imageFile);
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(3000); // 应该在3秒内完成
    });

    it('应该高效处理批量人脸比较', async () => {
      const mockResponse = {
        error_code: 0,
        error_msg: 'SUCCESS',
        result: {
          score: 85.5,
          face_list: [{ face_token: 'face-1' }, { face_token: 'face-2' }]
        }
      };
      
      mockBaiduClient.faceMatch.mockResolvedValue(mockResponse);
      
      const startTime = Date.now();
      const promises = Array.from({ length: 10 }, (_, i) => {
        const image1 = testUtils.createMockFile(`face1-${i}.jpg`, 'image/jpeg');
        const image2 = testUtils.createMockFile(`face2-${i}.jpg`, 'image/jpeg');
        return faceService.compareFaces(image1, image2);
      });
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(15000); // 应该在15秒内完成
    });
  });
});