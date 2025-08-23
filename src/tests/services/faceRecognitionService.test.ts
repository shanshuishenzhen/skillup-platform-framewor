/**
 * 人脸识别服务模块单元测试
 * 
 * 测试覆盖范围：
 * 1. 人脸检测和特征提取
 * 2. 人脸识别和匹配
 * 3. 人脸数据库管理
 * 4. 多种识别算法支持
 * 5. 性能优化和缓存
 * 6. 错误处理和监控
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { testUtils } from '../setup';

// 模拟人脸识别库
const mockFaceAPI = {
  nets: {
    ssdMobilenetv1: {
      loadFromUri: jest.fn(),
      load: jest.fn()
    },
    faceLandmark68Net: {
      loadFromUri: jest.fn(),
      load: jest.fn()
    },
    faceRecognitionNet: {
      loadFromUri: jest.fn(),
      load: jest.fn()
    },
    faceExpressionNet: {
      loadFromUri: jest.fn(),
      load: jest.fn()
    },
    ageGenderNet: {
      loadFromUri: jest.fn(),
      load: jest.fn()
    }
  },
  detectAllFaces: jest.fn(),
  detectSingleFace: jest.fn(),
  computeFaceDescriptor: jest.fn(),
  euclideanDistance: jest.fn(),
  FaceMatcher: jest.fn(),
  resizeResults: jest.fn(),
  matchDimensions: jest.fn()
};

const mockTensorFlow = {
  loadLayersModel: jest.fn(),
  tensor: jest.fn(),
  dispose: jest.fn(),
  memory: jest.fn().mockReturnValue({ numTensors: 0, numBytes: 0 })
};

// 模拟依赖
jest.mock('face-api.js', () => mockFaceAPI);
jest.mock('@tensorflow/tfjs-node');
jest.mock('@/utils/supabase');
jest.mock('@/services/monitoringService');
jest.mock('@/utils/errorHandler');
jest.mock('@/services/cloudStorageService');
jest.mock('canvas');
jest.mock('sharp');

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
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
  downloadFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileUrl: jest.fn()
};

const mockCanvas = {
  createCanvas: jest.fn(),
  loadImage: jest.fn()
};

const mockSharp = jest.fn(() => ({
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(),
  metadata: jest.fn()
}));

// 导入被测试的模块
import {
  FaceRecognitionService,
  FaceDetectionOptions,
  FaceRecognitionResult,
  FaceDescriptor,
  FaceMatch,
  RecognitionModel,
  FaceDatabase,
  FaceCluster,
  detectFaces,
  recognizeFace,
  extractFeatures,
  compareFaces,
  searchFace,
  addFaceToDatabase,
  removeFaceFromDatabase,
  trainModel,
  clusterFaces
} from '@/services/faceRecognitionService';

describe('人脸识别服务模块', () => {
  let faceRecognitionService: FaceRecognitionService;

  beforeEach(async () => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 设置模拟返回值
    require('@/utils/supabase').getSupabaseClient = jest.fn().mockReturnValue(mockSupabase);
    require('@/services/monitoringService').monitoringService = mockMonitoringService;
    require('@/services/cloudStorageService').cloudStorageService = mockCloudStorageService;
    require('canvas').createCanvas = mockCanvas.createCanvas;
    require('canvas').loadImage = mockCanvas.loadImage;
    require('sharp').default = mockSharp;
    require('@tensorflow/tfjs-node').loadLayersModel = mockTensorFlow.loadLayersModel;
    require('@tensorflow/tfjs-node').tensor = mockTensorFlow.tensor;
    require('@tensorflow/tfjs-node').dispose = mockTensorFlow.dispose;
    require('@tensorflow/tfjs-node').memory = mockTensorFlow.memory;
    
    // 模拟模型加载
    mockFaceAPI.nets.ssdMobilenetv1.loadFromUri.mockResolvedValue(true);
    mockFaceAPI.nets.faceLandmark68Net.loadFromUri.mockResolvedValue(true);
    mockFaceAPI.nets.faceRecognitionNet.loadFromUri.mockResolvedValue(true);
    mockFaceAPI.nets.faceExpressionNet.loadFromUri.mockResolvedValue(true);
    mockFaceAPI.nets.ageGenderNet.loadFromUri.mockResolvedValue(true);
    
    // 创建人脸识别服务实例
    faceRecognitionService = new FaceRecognitionService({
      modelPath: './models',
      confidenceThreshold: 0.5,
      maxFaces: 10,
      enableLandmarks: true,
      enableExpressions: true,
      enableAgeGender: true,
      cacheSize: 1000,
      batchSize: 32,
      useGPU: false
    });
    
    // 等待模型加载完成
    await faceRecognitionService.initialize();
  });

  describe('服务初始化', () => {
    it('应该正确初始化人脸识别服务', () => {
      expect(faceRecognitionService).toBeDefined();
      expect(faceRecognitionService.isInitialized).toBe(true);
    });

    it('应该加载所有必需的模型', () => {
      expect(mockFaceAPI.nets.ssdMobilenetv1.loadFromUri).toHaveBeenCalled();
      expect(mockFaceAPI.nets.faceLandmark68Net.loadFromUri).toHaveBeenCalled();
      expect(mockFaceAPI.nets.faceRecognitionNet.loadFromUri).toHaveBeenCalled();
      expect(mockFaceAPI.nets.faceExpressionNet.loadFromUri).toHaveBeenCalled();
      expect(mockFaceAPI.nets.ageGenderNet.loadFromUri).toHaveBeenCalled();
    });

    it('应该验证配置参数', () => {
      expect(() => new FaceRecognitionService({
        confidenceThreshold: 1.5 // 无效值
      })).toThrow('Invalid confidence threshold');
      
      expect(() => new FaceRecognitionService({
        maxFaces: -1 // 无效值
      })).toThrow('Invalid max faces count');
    });

    it('应该支持自定义模型路径', async () => {
      const customService = new FaceRecognitionService({
        modelPath: './custom-models'
      });
      
      await customService.initialize();
      
      expect(mockFaceAPI.nets.ssdMobilenetv1.loadFromUri)
        .toHaveBeenCalledWith('./custom-models');
    });
  });

  describe('人脸检测功能', () => {
    it('应该正确检测单个人脸', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data');
      const mockDetection = {
        detection: {
          box: { x: 100, y: 150, width: 200, height: 250 },
          score: 0.95
        },
        landmarks: {
          positions: [
            { x: 150, y: 200 }, // 左眼
            { x: 200, y: 200 }, // 右眼
            { x: 175, y: 225 }, // 鼻子
            { x: 160, y: 250 }, // 左嘴角
            { x: 190, y: 250 }  // 右嘴角
          ]
        },
        expressions: {
          neutral: 0.8,
          happy: 0.15,
          sad: 0.03,
          angry: 0.01,
          fearful: 0.005,
          disgusted: 0.003,
          surprised: 0.002
        },
        ageAndGender: {
          age: 25,
          gender: 'male',
          genderProbability: 0.92
        }
      };
      
      mockFaceAPI.detectSingleFace.mockResolvedValueOnce(mockDetection);
      
      const result = await faceRecognitionService.detectFaces(mockImageBuffer, {
        withLandmarks: true,
        withExpressions: true,
        withAgeAndGender: true
      });
      
      expect(result.faces).toHaveLength(1);
      expect(result.faces[0].confidence).toBe(0.95);
      expect(result.faces[0].boundingBox.width).toBe(200);
      expect(result.faces[0].landmarks).toBeDefined();
      expect(result.faces[0].expressions.neutral).toBe(0.8);
      expect(result.faces[0].ageAndGender.age).toBe(25);
    });

    it('应该检测多个人脸', async () => {
      const mockImageBuffer = Buffer.from('multi-face-image');
      const mockDetections = [
        {
          detection: { box: { x: 50, y: 50, width: 100, height: 120 }, score: 0.9 },
          landmarks: { positions: [] },
          expressions: { neutral: 0.7 },
          ageAndGender: { age: 30, gender: 'female' }
        },
        {
          detection: { box: { x: 200, y: 80, width: 110, height: 130 }, score: 0.85 },
          landmarks: { positions: [] },
          expressions: { happy: 0.8 },
          ageAndGender: { age: 35, gender: 'male' }
        }
      ];
      
      mockFaceAPI.detectAllFaces.mockResolvedValueOnce(mockDetections);
      
      const result = await faceRecognitionService.detectFaces(mockImageBuffer, {
        maxFaces: 5
      });
      
      expect(result.faces).toHaveLength(2);
      expect(result.faces[0].confidence).toBe(0.9);
      expect(result.faces[1].confidence).toBe(0.85);
    });

    it('应该处理无人脸图像', async () => {
      const mockImageBuffer = Buffer.from('no-face-image');
      
      mockFaceAPI.detectAllFaces.mockResolvedValueOnce([]);
      
      const result = await faceRecognitionService.detectFaces(mockImageBuffer);
      
      expect(result.faces).toHaveLength(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('应该支持置信度过滤', async () => {
      const mockImageBuffer = Buffer.from('low-confidence-faces');
      const mockDetections = [
        { detection: { box: { x: 0, y: 0, width: 100, height: 100 }, score: 0.8 } },
        { detection: { box: { x: 100, y: 0, width: 100, height: 100 }, score: 0.3 } }, // 低置信度
        { detection: { box: { x: 200, y: 0, width: 100, height: 100 }, score: 0.9 } }
      ];
      
      mockFaceAPI.detectAllFaces.mockResolvedValueOnce(mockDetections);
      
      const result = await faceRecognitionService.detectFaces(mockImageBuffer, {
        confidenceThreshold: 0.5
      });
      
      expect(result.faces).toHaveLength(2); // 只有2个高置信度人脸
      expect(result.faces.every(face => face.confidence >= 0.5)).toBe(true);
    });
  });

  describe('特征提取功能', () => {
    it('应该正确提取人脸特征', async () => {
      const mockImageBuffer = Buffer.from('face-image');
      const mockDescriptor = new Float32Array([
        0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
        -0.1, -0.2, -0.3, -0.4, -0.5, -0.6, -0.7, -0.8, -0.9, -1.0
      ]);
      
      const mockDetection = {
        detection: { box: { x: 100, y: 100, width: 200, height: 200 }, score: 0.95 },
        landmarks: { positions: [] }
      };
      
      mockFaceAPI.detectSingleFace.mockResolvedValueOnce(mockDetection);
      mockFaceAPI.computeFaceDescriptor.mockResolvedValueOnce(mockDescriptor);
      
      const result = await faceRecognitionService.extractFeatures(mockImageBuffer);
      
      expect(result.descriptor).toEqual(mockDescriptor);
      expect(result.confidence).toBe(0.95);
      expect(result.boundingBox).toEqual(mockDetection.detection.box);
    });

    it('应该批量提取特征', async () => {
      const mockImages = [
        Buffer.from('face1'),
        Buffer.from('face2'),
        Buffer.from('face3')
      ];
      
      const mockDescriptors = [
        new Float32Array([0.1, 0.2, 0.3]),
        new Float32Array([0.4, 0.5, 0.6]),
        new Float32Array([0.7, 0.8, 0.9])
      ];
      
      mockFaceAPI.detectSingleFace
        .mockResolvedValueOnce({ detection: { score: 0.9 } })
        .mockResolvedValueOnce({ detection: { score: 0.85 } })
        .mockResolvedValueOnce({ detection: { score: 0.92 } });
      
      mockFaceAPI.computeFaceDescriptor
        .mockResolvedValueOnce(mockDescriptors[0])
        .mockResolvedValueOnce(mockDescriptors[1])
        .mockResolvedValueOnce(mockDescriptors[2]);
      
      const results = await faceRecognitionService.batchExtractFeatures(mockImages);
      
      expect(results).toHaveLength(3);
      expect(results[0].descriptor).toEqual(mockDescriptors[0]);
      expect(results[1].descriptor).toEqual(mockDescriptors[1]);
      expect(results[2].descriptor).toEqual(mockDescriptors[2]);
    });

    it('应该处理特征提取失败', async () => {
      const mockImageBuffer = Buffer.from('invalid-face');
      
      mockFaceAPI.detectSingleFace.mockResolvedValueOnce(null);
      
      await expect(faceRecognitionService.extractFeatures(mockImageBuffer))
        .rejects.toThrow('No face detected in image');
    });

    it('应该缓存特征提取结果', async () => {
      const mockImageBuffer = Buffer.from('cached-face');
      const mockDescriptor = new Float32Array([0.1, 0.2, 0.3]);
      
      mockFaceAPI.detectSingleFace.mockResolvedValue({
        detection: { score: 0.9 }
      });
      mockFaceAPI.computeFaceDescriptor.mockResolvedValue(mockDescriptor);
      
      // 第一次调用
      await faceRecognitionService.extractFeatures(mockImageBuffer);
      
      // 第二次调用（应该使用缓存）
      await faceRecognitionService.extractFeatures(mockImageBuffer);
      
      expect(mockFaceAPI.computeFaceDescriptor).toHaveBeenCalledTimes(1);
    });
  });

  describe('人脸比对功能', () => {
    it('应该正确比对两个人脸特征', () => {
      const descriptor1 = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
      const descriptor2 = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
      
      mockFaceAPI.euclideanDistance.mockReturnValueOnce(0.1);
      
      const result = faceRecognitionService.compareDescriptors(descriptor1, descriptor2);
      
      expect(mockFaceAPI.euclideanDistance).toHaveBeenCalledWith(descriptor1, descriptor2);
      expect(result.distance).toBe(0.1);
      expect(result.similarity).toBeCloseTo(0.9, 1);
      expect(result.isMatch).toBe(true);
    });

    it('应该识别不匹配的人脸', () => {
      const descriptor1 = new Float32Array([0.1, 0.2, 0.3]);
      const descriptor2 = new Float32Array([0.8, 0.9, 1.0]);
      
      mockFaceAPI.euclideanDistance.mockReturnValueOnce(0.8);
      
      const result = faceRecognitionService.compareDescriptors(descriptor1, descriptor2, 0.6);
      
      expect(result.distance).toBe(0.8);
      expect(result.isMatch).toBe(false);
    });

    it('应该比对人脸图像', async () => {
      const image1 = Buffer.from('face1');
      const image2 = Buffer.from('face2');
      
      const descriptor1 = new Float32Array([0.1, 0.2, 0.3]);
      const descriptor2 = new Float32Array([0.1, 0.2, 0.3]);
      
      mockFaceAPI.detectSingleFace.mockResolvedValue({
        detection: { score: 0.9 }
      });
      
      mockFaceAPI.computeFaceDescriptor
        .mockResolvedValueOnce(descriptor1)
        .mockResolvedValueOnce(descriptor2);
      
      mockFaceAPI.euclideanDistance.mockReturnValueOnce(0.1);
      
      const result = await faceRecognitionService.compareFaces(image1, image2);
      
      expect(result.isMatch).toBe(true);
      expect(result.similarity).toBeGreaterThan(0.8);
    });
  });

  describe('人脸搜索功能', () => {
    it('应该在数据库中搜索相似人脸', async () => {
      const queryImage = Buffer.from('query-face');
      const queryDescriptor = new Float32Array([0.1, 0.2, 0.3]);
      
      // 模拟数据库中的人脸数据
      const mockFaceData = [
        {
          id: 'face-001',
          userId: 'user-001',
          descriptor: [0.1, 0.2, 0.3],
          metadata: { name: '张三' }
        },
        {
          id: 'face-002',
          userId: 'user-002',
          descriptor: [0.8, 0.9, 1.0],
          metadata: { name: '李四' }
        }
      ];
      
      mockSupabase.from().select().mockResolvedValueOnce({
        data: mockFaceData,
        error: null
      });
      
      mockFaceAPI.detectSingleFace.mockResolvedValueOnce({
        detection: { score: 0.9 }
      });
      mockFaceAPI.computeFaceDescriptor.mockResolvedValueOnce(queryDescriptor);
      
      mockFaceAPI.euclideanDistance
        .mockReturnValueOnce(0.1)  // 与第一个人脸相似
        .mockReturnValueOnce(0.8); // 与第二个人脸不相似
      
      const results = await faceRecognitionService.searchFace(queryImage, {
        limit: 5,
        threshold: 0.6
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].faceId).toBe('face-001');
      expect(results[0].userId).toBe('user-001');
      expect(results[0].similarity).toBeGreaterThan(0.8);
    });

    it('应该支持分页搜索', async () => {
      const queryImage = Buffer.from('query-face');
      
      mockSupabase.from().select().limit().mockResolvedValueOnce({
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `face-${i.toString().padStart(3, '0')}`,
          userId: `user-${i.toString().padStart(3, '0')}`,
          descriptor: [0.1 + i * 0.1, 0.2, 0.3]
        })),
        error: null
      });
      
      mockFaceAPI.detectSingleFace.mockResolvedValueOnce({
        detection: { score: 0.9 }
      });
      mockFaceAPI.computeFaceDescriptor.mockResolvedValueOnce(
        new Float32Array([0.1, 0.2, 0.3])
      );
      
      // 模拟距离计算
      for (let i = 0; i < 10; i++) {
        mockFaceAPI.euclideanDistance.mockReturnValueOnce(0.1 + i * 0.1);
      }
      
      const results = await faceRecognitionService.searchFace(queryImage, {
        limit: 10,
        offset: 0
      });
      
      expect(results).toHaveLength(10);
      expect(mockSupabase.from().limit).toHaveBeenCalledWith(10);
    });

    it('应该按相似度排序结果', async () => {
      const queryImage = Buffer.from('query-face');
      
      const mockFaceData = [
        { id: 'face-001', descriptor: [0.5, 0.5, 0.5] },
        { id: 'face-002', descriptor: [0.1, 0.2, 0.3] },
        { id: 'face-003', descriptor: [0.8, 0.9, 1.0] }
      ];
      
      mockSupabase.from().select().mockResolvedValueOnce({
        data: mockFaceData,
        error: null
      });
      
      mockFaceAPI.detectSingleFace.mockResolvedValueOnce({
        detection: { score: 0.9 }
      });
      mockFaceAPI.computeFaceDescriptor.mockResolvedValueOnce(
        new Float32Array([0.1, 0.2, 0.3])
      );
      
      mockFaceAPI.euclideanDistance
        .mockReturnValueOnce(0.4)  // face-001
        .mockReturnValueOnce(0.1)  // face-002 (最相似)
        .mockReturnValueOnce(0.8); // face-003
      
      const results = await faceRecognitionService.searchFace(queryImage);
      
      expect(results[0].faceId).toBe('face-002'); // 最相似的排在第一位
      expect(results[1].faceId).toBe('face-001');
      expect(results[2].faceId).toBe('face-003');
    });
  });

  describe('人脸数据库管理', () => {
    it('应该添加人脸到数据库', async () => {
      const userId = 'user-123';
      const faceImage = Buffer.from('face-image');
      const metadata = { name: '张三', department: '技术部' };
      
      const mockDescriptor = new Float32Array([0.1, 0.2, 0.3]);
      
      mockFaceAPI.detectSingleFace.mockResolvedValueOnce({
        detection: { score: 0.95, box: { x: 100, y: 100, width: 200, height: 200 } }
      });
      mockFaceAPI.computeFaceDescriptor.mockResolvedValueOnce(mockDescriptor);
      
      mockSupabase.from().insert().mockResolvedValueOnce({
        data: [{
          id: 'face-456',
          userId,
          descriptor: Array.from(mockDescriptor),
          metadata,
          confidence: 0.95
        }],
        error: null
      });
      
      mockCloudStorageService.uploadFile.mockResolvedValueOnce({
        url: 'https://storage.example.com/faces/face-456.jpg',
        key: 'faces/face-456.jpg'
      });
      
      const result = await faceRecognitionService.addFaceToDatabase(
        userId,
        faceImage,
        metadata
      );
      
      expect(result.faceId).toBe('face-456');
      expect(result.confidence).toBe(0.95);
      expect(mockSupabase.from).toHaveBeenCalledWith('face_database');
      expect(mockCloudStorageService.uploadFile).toHaveBeenCalled();
    });

    it('应该更新人脸数据', async () => {
      const faceId = 'face-456';
      const newImage = Buffer.from('new-face-image');
      const newMetadata = { name: '张三', department: '产品部' };
      
      const mockDescriptor = new Float32Array([0.2, 0.3, 0.4]);
      
      mockFaceAPI.detectSingleFace.mockResolvedValueOnce({
        detection: { score: 0.92 }
      });
      mockFaceAPI.computeFaceDescriptor.mockResolvedValueOnce(mockDescriptor);
      
      mockSupabase.from().update().eq().mockResolvedValueOnce({
        data: [{
          id: faceId,
          descriptor: Array.from(mockDescriptor),
          metadata: newMetadata,
          confidence: 0.92
        }],
        error: null
      });
      
      const result = await faceRecognitionService.updateFaceInDatabase(
        faceId,
        newImage,
        newMetadata
      );
      
      expect(result.confidence).toBe(0.92);
      expect(mockSupabase.from().update).toHaveBeenCalled();
    });

    it('应该从数据库删除人脸', async () => {
      const faceId = 'face-456';
      
      // 模拟获取人脸信息
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: faceId,
          imageUrl: 'https://storage.example.com/faces/face-456.jpg'
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
      
      const result = await faceRecognitionService.removeFaceFromDatabase(faceId);
      
      expect(result).toBe(true);
      expect(mockSupabase.from().delete).toHaveBeenCalled();
      expect(mockCloudStorageService.deleteFile).toHaveBeenCalled();
    });

    it('应该批量导入人脸数据', async () => {
      const faceDataList = [
        {
          userId: 'user-001',
          image: Buffer.from('face1'),
          metadata: { name: '用户1' }
        },
        {
          userId: 'user-002',
          image: Buffer.from('face2'),
          metadata: { name: '用户2' }
        }
      ];
      
      mockFaceAPI.detectSingleFace.mockResolvedValue({
        detection: { score: 0.9 }
      });
      
      mockFaceAPI.computeFaceDescriptor
        .mockResolvedValueOnce(new Float32Array([0.1, 0.2, 0.3]))
        .mockResolvedValueOnce(new Float32Array([0.4, 0.5, 0.6]));
      
      mockSupabase.from().insert().mockResolvedValue({
        data: [
          { id: 'face-001', userId: 'user-001' },
          { id: 'face-002', userId: 'user-002' }
        ],
        error: null
      });
      
      mockCloudStorageService.uploadFile.mockResolvedValue({
        url: 'https://storage.example.com/faces/test.jpg',
        key: 'faces/test.jpg'
      });
      
      const results = await faceRecognitionService.batchImportFaces(faceDataList);
      
      expect(results.successful).toBe(2);
      expect(results.failed).toBe(0);
      expect(results.results).toHaveLength(2);
    });
  });

  describe('人脸聚类功能', () => {
    it('应该对人脸进行聚类分析', async () => {
      const faceDescriptors = [
        new Float32Array([0.1, 0.2, 0.3]),
        new Float32Array([0.1, 0.2, 0.4]), // 与第一个相似
        new Float32Array([0.8, 0.9, 1.0]),
        new Float32Array([0.8, 0.9, 0.9])  // 与第三个相似
      ];
      
      const faceIds = ['face-001', 'face-002', 'face-003', 'face-004'];
      
      // 模拟距离计算
      mockFaceAPI.euclideanDistance
        .mockReturnValueOnce(0.1)  // face-001 vs face-002
        .mockReturnValueOnce(0.8)  // face-001 vs face-003
        .mockReturnValueOnce(0.9)  // face-001 vs face-004
        .mockReturnValueOnce(0.9)  // face-002 vs face-003
        .mockReturnValueOnce(0.8)  // face-002 vs face-004
        .mockReturnValueOnce(0.1); // face-003 vs face-004
      
      const clusters = await faceRecognitionService.clusterFaces(
        faceDescriptors,
        faceIds,
        { threshold: 0.5 }
      );
      
      expect(clusters).toHaveLength(2); // 应该分成2个聚类
      expect(clusters[0].faceIds).toContain('face-001');
      expect(clusters[0].faceIds).toContain('face-002');
      expect(clusters[1].faceIds).toContain('face-003');
      expect(clusters[1].faceIds).toContain('face-004');
    });

    it('应该识别重复人脸', async () => {
      const mockFaceData = [
        { id: 'face-001', descriptor: [0.1, 0.2, 0.3] },
        { id: 'face-002', descriptor: [0.1, 0.2, 0.3] }, // 重复
        { id: 'face-003', descriptor: [0.8, 0.9, 1.0] }
      ];
      
      mockSupabase.from().select().mockResolvedValueOnce({
        data: mockFaceData,
        error: null
      });
      
      mockFaceAPI.euclideanDistance
        .mockReturnValueOnce(0.05) // face-001 vs face-002 (重复)
        .mockReturnValueOnce(0.8)  // face-001 vs face-003
        .mockReturnValueOnce(0.8); // face-002 vs face-003
      
      const duplicates = await faceRecognitionService.findDuplicateFaces({
        threshold: 0.1
      });
      
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].faceIds).toContain('face-001');
      expect(duplicates[0].faceIds).toContain('face-002');
    });
  });

  describe('模型训练功能', () => {
    it('应该训练自定义识别模型', async () => {
      const trainingData = [
        {
          userId: 'user-001',
          images: [Buffer.from('img1'), Buffer.from('img2')],
          label: '张三'
        },
        {
          userId: 'user-002',
          images: [Buffer.from('img3'), Buffer.from('img4')],
          label: '李四'
        }
      ];
      
      // 模拟特征提取
      mockFaceAPI.detectSingleFace.mockResolvedValue({
        detection: { score: 0.9 }
      });
      
      mockFaceAPI.computeFaceDescriptor
        .mockResolvedValueOnce(new Float32Array([0.1, 0.2, 0.3]))
        .mockResolvedValueOnce(new Float32Array([0.1, 0.2, 0.4]))
        .mockResolvedValueOnce(new Float32Array([0.8, 0.9, 1.0]))
        .mockResolvedValueOnce(new Float32Array([0.8, 0.9, 0.9]));
      
      // 模拟模型训练
      const mockModel = {
        save: jest.fn().mockResolvedValue(true),
        predict: jest.fn()
      };
      
      mockTensorFlow.loadLayersModel.mockResolvedValueOnce(mockModel);
      
      const result = await faceRecognitionService.trainCustomModel(trainingData, {
        epochs: 10,
        batchSize: 32,
        validationSplit: 0.2
      });
      
      expect(result.modelId).toBeDefined();
      expect(result.accuracy).toBeGreaterThan(0);
      expect(result.trainingTime).toBeGreaterThan(0);
    });

    it('应该评估模型性能', async () => {
      const testData = [
        {
          image: Buffer.from('test1'),
          expectedUserId: 'user-001'
        },
        {
          image: Buffer.from('test2'),
          expectedUserId: 'user-002'
        }
      ];
      
      // 模拟模型预测
      jest.spyOn(faceRecognitionService, 'recognizeFace')
        .mockResolvedValueOnce({
          userId: 'user-001',
          confidence: 0.95,
          similarity: 0.92
        })
        .mockResolvedValueOnce({
          userId: 'user-002',
          confidence: 0.88,
          similarity: 0.85
        });
      
      const evaluation = await faceRecognitionService.evaluateModel(
        'model-123',
        testData
      );
      
      expect(evaluation.accuracy).toBe(1.0); // 100% 准确率
      expect(evaluation.precision).toBe(1.0);
      expect(evaluation.recall).toBe(1.0);
      expect(evaluation.f1Score).toBe(1.0);
    });
  });

  describe('错误处理和监控', () => {
    it('应该处理模型加载错误', async () => {
      const errorService = new FaceRecognitionService();
      
      mockFaceAPI.nets.ssdMobilenetv1.loadFromUri.mockRejectedValueOnce(
        new Error('Model loading failed')
      );
      
      await expect(errorService.initialize())
        .rejects.toThrow('Model loading failed');
      
      expect(mockMonitoringService.recordError).toHaveBeenCalledWith(
        'model_loading_error',
        expect.objectContaining({
          error: 'Model loading failed'
        })
      );
    });

    it('应该处理图像处理错误', async () => {
      const invalidImage = Buffer.from('invalid-image-data');
      
      mockFaceAPI.detectSingleFace.mockRejectedValueOnce(
        new Error('Invalid image format')
      );
      
      await expect(faceRecognitionService.detectFaces(invalidImage))
        .rejects.toThrow('Invalid image format');
      
      expect(mockMonitoringService.recordError).toHaveBeenCalledWith(
        'face_detection_error',
        expect.objectContaining({
          error: 'Invalid image format'
        })
      );
    });

    it('应该记录性能指标', async () => {
      const mockImageBuffer = Buffer.from('image-data');
      
      mockFaceAPI.detectSingleFace.mockImplementationOnce(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              detection: { score: 0.9 }
            });
          }, 1000);
        });
      });
      
      await faceRecognitionService.detectFaces(mockImageBuffer);
      
      expect(mockMonitoringService.recordLatency).toHaveBeenCalledWith(
        'face_detection_latency',
        expect.any(Number),
        expect.objectContaining({
          imageSize: mockImageBuffer.length
        })
      );
    });

    it('应该监控内存使用', async () => {
      const mockImageBuffer = Buffer.from('large-image-data');
      
      mockTensorFlow.memory.mockReturnValue({
        numTensors: 100,
        numBytes: 1024 * 1024 * 50 // 50MB
      });
      
      mockFaceAPI.detectSingleFace.mockResolvedValueOnce({
        detection: { score: 0.9 }
      });
      
      await faceRecognitionService.detectFaces(mockImageBuffer);
      
      expect(mockMonitoringService.recordMetric).toHaveBeenCalledWith(
        'memory_usage',
        expect.objectContaining({
          numTensors: 100,
          numBytes: expect.any(Number)
        })
      );
    });
  });

  describe('便捷函数', () => {
    it('detectFaces 函数应该正常工作', async () => {
      const mockImageBuffer = Buffer.from('image-data');
      
      mockFaceAPI.detectAllFaces.mockResolvedValueOnce([
        { detection: { score: 0.9 } }
      ]);
      
      const result = await detectFaces(mockImageBuffer);
      
      expect(result.faces).toHaveLength(1);
    });

    it('extractFeatures 函数应该正常工作', async () => {
      const mockImageBuffer = Buffer.from('face-image');
      const mockDescriptor = new Float32Array([0.1, 0.2, 0.3]);
      
      mockFaceAPI.detectSingleFace.mockResolvedValueOnce({
        detection: { score: 0.9 }
      });
      mockFaceAPI.computeFaceDescriptor.mockResolvedValueOnce(mockDescriptor);
      
      const result = await extractFeatures(mockImageBuffer);
      
      expect(result.descriptor).toEqual(mockDescriptor);
    });

    it('compareFaces 函数应该正常工作', async () => {
      const face1 = Buffer.from('face1');
      const face2 = Buffer.from('face2');
      
      mockFaceAPI.detectSingleFace.mockResolvedValue({
        detection: { score: 0.9 }
      });
      
      mockFaceAPI.computeFaceDescriptor
        .mockResolvedValueOnce(new Float32Array([0.1, 0.2, 0.3]))
        .mockResolvedValueOnce(new Float32Array([0.1, 0.2, 0.3]));
      
      mockFaceAPI.euclideanDistance.mockReturnValueOnce(0.1);
      
      const result = await compareFaces(face1, face2);
      
      expect(result.isMatch).toBe(true);
    });
  });

  describe('性能测试', () => {
    it('人脸检测应该在合理时间内完成', async () => {
      const mockImageBuffer = Buffer.from('image-data');
      
      mockFaceAPI.detectAllFaces.mockResolvedValueOnce([
        { detection: { score: 0.9 } }
      ]);
      
      const { duration } = await testUtils.performanceUtils.measureTime(() => {
        return faceRecognitionService.detectFaces(mockImageBuffer);
      });
      
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('批量特征提取应该高效处理', async () => {
      const mockImages = Array.from({ length: 20 }, (_, i) => 
        Buffer.from(`face-${i}`)
      );
      
      mockFaceAPI.detectSingleFace.mockResolvedValue({
        detection: { score: 0.9 }
      });
      
      mockFaceAPI.computeFaceDescriptor.mockResolvedValue(
        new Float32Array([0.1, 0.2, 0.3])
      );
      
      const { duration } = await testUtils.performanceUtils.measureTime(() => {
        return faceRecognitionService.batchExtractFeatures(mockImages);
      });
      
      expect(duration).toBeLessThan(20000); // 应该在20秒内完成
    });

    it('人脸搜索应该快速响应', async () => {
      const queryImage = Buffer.from('query-face');
      
      // 模拟大量人脸数据
      const mockFaceData = Array.from({ length: 1000 }, (_, i) => ({
        id: `face-${i.toString().padStart(4, '0')}`,
        descriptor: [Math.random(), Math.random(), Math.random()]
      }));
      
      mockSupabase.from().select().mockResolvedValueOnce({
        data: mockFaceData,
        error: null
      });
      
      mockFaceAPI.detectSingleFace.mockResolvedValueOnce({
        detection: { score: 0.9 }
      });
      mockFaceAPI.computeFaceDescriptor.mockResolvedValueOnce(
        new Float32Array([0.1, 0.2, 0.3])
      );
      
      // 模拟距离计算
      for (let i = 0; i < 1000; i++) {
        mockFaceAPI.euclideanDistance.mockReturnValueOnce(Math.random());
      }
      
      const { duration } = await testUtils.performanceUtils.measureTime(() => {
        return faceRecognitionService.searchFace(queryImage, { limit: 10 });
      });
      
      expect(duration).toBeLessThan(10000); // 应该在10秒内完成
    });
  });
});