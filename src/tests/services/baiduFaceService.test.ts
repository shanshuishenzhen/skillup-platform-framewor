/**
 * 百度人脸识别服务单元测试
 * 
 * 测试百度人脸识别服务，包括：
 * - 人脸检测和分析
 * - 人脸识别和验证
 * - 人脸比对和匹配
 * - 人脸库管理
 * - 活体检测
 * - 人脸属性分析
 * - 人脸搜索
 * - 错误处理和重试
 */

import { 
  BaiduFaceService,
  createBaiduFaceService,
  FaceDetectionResult,
  FaceRecognitionResult,
  FaceComparisonResult,
  FaceSearchResult,
  LivenessDetectionResult,
  FaceAttributeResult,
  FaceImage
} from '../../services/baiduFaceService';
import { logger } from '../../utils/logger';
import { cacheService } from '../../services/cacheService';
import { analyticsService } from '../../services/analyticsService';
import { auditService } from '../../services/auditService';
import { envConfig } from '../../config/envConfig';
import axios from 'axios';
import FormData from 'form-data';

// Mock 依赖
jest.mock('../../utils/logger');
jest.mock('../../services/cacheService');
jest.mock('../../services/analyticsService');
jest.mock('../../services/auditService');
jest.mock('../../config/envConfig');
jest.mock('axios');
jest.mock('form-data');

// 移除未使用的类型定义

// Mock 实例
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn()
};

const mockAnalyticsService = {
  track: jest.fn(),
  increment: jest.fn(),
  histogram: jest.fn(),
  gauge: jest.fn(),
  timer: jest.fn()
};

const mockAuditService = {
  log: jest.fn(),
  logUserActivity: jest.fn()
};

const mockEnvConfig = {
  baiduFace: {
    apiKey: 'test-api-key',
    secretKey: 'test-secret-key',
    baseUrl: 'https://aip.baidubce.com',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    enableCache: true,
    cacheExpiry: 3600,
    qualityThreshold: 0.8,
    confidenceThreshold: 0.8,
    maxFaceCount: 10,
    enableLiveness: true,
    enableAttributes: true
  }
};

const mockAxios = {
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn().mockReturnThis(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

const mockFormData = {
  append: jest.fn(),
  getHeaders: jest.fn().mockReturnValue({
    'content-type': 'multipart/form-data; boundary=test'
  })
};

// 设置 Mock
const mockLoggerTyped = logger as jest.Mocked<typeof logger>;
const mockCacheServiceTyped = cacheService as jest.Mocked<typeof cacheService>;
const mockAnalyticsServiceTyped = analyticsService as jest.Mocked<typeof analyticsService>;
const mockAuditServiceTyped = auditService as jest.Mocked<typeof auditService>;
const mockEnvConfigTyped = envConfig as jest.Mocked<typeof envConfig>;
const mockAxiosTyped = axios as jest.Mocked<typeof axios>;
const mockFormDataTyped = FormData as jest.MockedClass<typeof FormData>;

// 测试数据
const testFaceImage: FaceImage = {
  image: 'base64-encoded-image-data',
  imageType: 'BASE64',
  faceField: 'age,beauty,expression,face_shape,gender,glasses,landmark,landmark150,quality,eye_status,emotion,face_type,mask,spoofing'
};

const testDetectionResult: FaceDetectionResult = {
  faceNum: 1,
  faceList: [
    {
      faceToken: 'face-token-123',
      location: {
        left: 100,
        top: 50,
        width: 200,
        height: 250,
        rotation: 5
      },
      faceProb: 0.99,
      angle: {
        yaw: -2.5,
        pitch: 1.2,
        roll: 5.1
      },
      landmark: [
        { x: 150, y: 100 }, // 左眼
        { x: 200, y: 100 }, // 右眼
        { x: 175, y: 130 }, // 鼻尖
        { x: 160, y: 160 }, // 左嘴角
        { x: 190, y: 160 }  // 右嘴角
      ],
      landmark72: [], // 72个关键点
      landmark150: [], // 150个关键点
      age: 25,
      beauty: 75.5,
      expression: {
        type: 'smile',
        probability: 0.8
      },
      faceShape: {
        type: 'oval',
        probability: 0.7
      },
      gender: {
        type: 'male',
        probability: 0.9
      },
      glasses: {
        type: 'none',
        probability: 0.95
      },
      eyeStatus: {
        leftEye: 0.9,
        rightEye: 0.85
      },
      emotion: {
        type: 'happy',
        probability: 0.8
      },
      faceType: {
        type: 'human',
        probability: 0.99
      },
      mask: {
        type: 0,
        probability: 0.1
      },
      quality: {
        occlusion: {
          leftEye: 0.1,
          rightEye: 0.1,
          nose: 0.05,
          mouth: 0.05,
          leftCheek: 0.1,
          rightCheek: 0.1,
          chin: 0.1
        },
        blur: 0.1,
        illumination: 80,
        completeness: 1
      },
      spoofing: 0.05
    }
  ],
  logId: 'log-123456789'
};

const testRecognitionResult: FaceRecognitionResult = {
  userId: 'user-123',
  userInfo: 'Test User',
  score: 95.5,
  faceToken: 'face-token-123',
  groupId: 'group-123',
  confidence: 0.95,
  threshold: 0.8,
  isMatch: true,
  logId: 'log-123456789'
};

const testComparisonResult: FaceComparisonResult = {
  score: 88.5,
  faceList: [
    {
      faceToken: 'face-token-1'
    },
    {
      faceToken: 'face-token-2'
    }
  ],
  confidence: 0.88,
  threshold: 0.8,
  isMatch: true,
  logId: 'log-123456789'
};

const testSearchResult: FaceSearchResult = {
  faceToken: 'face-token-123',
  userList: [
    {
      groupId: 'group-123',
      userId: 'user-123',
      userInfo: 'Test User',
      score: 95.5
    },
    {
      groupId: 'group-123',
      userId: 'user-456',
      userInfo: 'Another User',
      score: 82.3
    }
  ],
  logId: 'log-123456789'
};

const testLivenessResult: LivenessDetectionResult = {
  faceList: [
    {
      faceToken: 'face-token-123',
      livenessScore: 0.95,
      spoofingScore: 0.05,
      isLive: true
    }
  ],
  thresholds: {
    frr_1e_4: 0.05,
    frr_1e_3: 0.1,
    frr_1e_2: 0.3
  },
  logId: 'log-123456789'
};

const testAttributeResult: FaceAttributeResult = {
  faceNum: 1,
  faceList: [
    {
      faceToken: 'face-token-123',
      age: 25,
      beauty: 75.5,
      expression: {
        type: 'smile',
        probability: 0.8
      },
      gender: {
        type: 'male',
        probability: 0.9
      },
      glasses: {
        type: 'none',
        probability: 0.95
      },
      race: {
        type: 'asian',
        probability: 0.9
      },
      faceShape: {
        type: 'oval',
        probability: 0.7
      },
      faceType: {
        type: 'human',
        probability: 0.99
      }
    }
  ],
  logId: 'log-123456789'
};

describe('Baidu Face Service', () => {
  let baiduFaceService: BaiduFaceService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockAnalyticsService.track.mockResolvedValue(true);
    mockAuditService.log.mockResolvedValue(true);
    
    // 设置axios mock - 获取access token
    mockAxios.post.mockImplementation((url) => {
      if (url.includes('oauth/2.0/token')) {
        return Promise.resolve({
          data: {
            access_token: 'test-access-token',
            expires_in: 2592000
          }
        });
      }
      
      // 默认API响应
      return Promise.resolve({
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          log_id: 'log-123456789',
          timestamp: Date.now(),
          cached: 0,
          result: testDetectionResult
        }
      });
    });
    
    baiduFaceService = createBaiduFaceService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 服务初始化测试
   */
  describe('Service Initialization', () => {
    it('应该创建百度人脸识别服务实例', () => {
      expect(baiduFaceService).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Baidu Face service initialized successfully'
      );
    });

    it('应该获取现有的服务实例', () => {
      const service1 = getBaiduFaceService();
      const service2 = getBaiduFaceService();
      
      expect(service1).toBe(service2);
    });

    it('应该获取访问令牌', async () => {
      const token = await baiduFaceService.getAccessToken();
      
      expect(token).toBe('test-access-token');
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('oauth/2.0/token'),
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );
    });

    it('应该缓存访问令牌', async () => {
      await baiduFaceService.getAccessToken();
      
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'baidu_face_access_token',
        'test-access-token',
        2592000
      );
    });

    it('应该从缓存获取访问令牌', async () => {
      mockCacheService.get.mockResolvedValue('cached-token');
      
      const token = await baiduFaceService.getAccessToken();
      
      expect(token).toBe('cached-token');
      expect(mockAxios.post).not.toHaveBeenCalled();
    });
  });

  /**
   * 人脸检测测试
   */
  describe('Face Detection', () => {
    it('应该检测人脸', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          log_id: 'log-123456789',
          timestamp: Date.now(),
          cached: 0,
          result: testDetectionResult
        }
      });
      
      const result = await baiduFaceService.detectFace(testFaceImage);
      
      expect(result).toEqual(testDetectionResult);
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('face/v3/detect'),
        expect.objectContaining({
          image: testFaceImage.image,
          image_type: testFaceImage.imageType,
          face_field: testFaceImage.faceField
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          params: expect.objectContaining({
            access_token: 'test-access-token'
          })
        })
      );
    });

    it('应该检测多个人脸', async () => {
      const multipleDetectionResult = {
        ...testDetectionResult,
        faceNum: 2,
        faceList: [
          testDetectionResult.faceList[0],
          {
            ...testDetectionResult.faceList[0],
            faceToken: 'face-token-456'
          }
        ]
      };
      
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: multipleDetectionResult
        }
      });
      
      const options: DetectionOptions = {
        maxFaceNum: 5,
        faceField: 'age,gender,beauty'
      };
      
      const result = await baiduFaceService.detectFace(testFaceImage, options);
      
      expect(result.faceNum).toBe(2);
      expect(result.faceList).toHaveLength(2);
    });

    it('应该处理质量控制', async () => {
      const options: DetectionOptions = {
        qualityControl: 'NORMAL',
        livenessControl: 'LOW'
      };
      
      await baiduFaceService.detectFace(testFaceImage, options);
      
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          quality_control: 'NORMAL',
          liveness_control: 'LOW'
        }),
        expect.any(Object)
      );
    });

    it('应该分析人脸质量', async () => {
      const quality = await baiduFaceService.analyzeFaceQuality(testFaceImage);
      
      expect(quality).toEqual(
        expect.objectContaining({
          score: expect.any(Number),
          blur: expect.any(Number),
          illumination: expect.any(Number),
          occlusion: expect.any(Object),
          completeness: expect.any(Number),
          isGoodQuality: expect.any(Boolean)
        })
      );
    });
  });

  /**
   * 人脸识别测试
   */
  describe('Face Recognition', () => {
    it('应该识别人脸', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: testRecognitionResult
        }
      });
      
      const options: RecognitionOptions = {
        groupIdList: ['group-123'],
        userId: 'user-123',
        maxUserNum: 1
      };
      
      const result = await baiduFaceService.recognizeFace(testFaceImage, options);
      
      expect(result).toEqual(testRecognitionResult);
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('face/v3/search'),
        expect.objectContaining({
          image: testFaceImage.image,
          image_type: testFaceImage.imageType,
          group_id_list: 'group-123',
          max_user_num: 1
        }),
        expect.any(Object)
      );
    });

    it('应该验证人脸身份', async () => {
      const verificationResult = {
        score: 95.5,
        faceList: [{
          faceToken: 'face-token-123'
        }],
        thresholds: {
          frr_1e_4: 0.05,
          frr_1e_3: 0.1,
          frr_1e_2: 0.3
        },
        isMatch: true
      };
      
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: verificationResult
        }
      });
      
      const result = await baiduFaceService.verifyFace(
        testFaceImage,
        'user-123',
        'group-123'
      );
      
      expect(result.isMatch).toBe(true);
      expect(result.score).toBe(95.5);
    });

    it('应该搜索相似人脸', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: testSearchResult
        }
      });
      
      const options: SearchOptions = {
        groupIdList: ['group-123'],
        maxUserNum: 5,
        qualityControl: 'NORMAL'
      };
      
      const result = await baiduFaceService.searchFace(testFaceImage, options);
      
      expect(result).toEqual(testSearchResult);
      expect(result.userList).toHaveLength(2);
      expect(result.userList[0].score).toBeGreaterThan(result.userList[1].score);
    });
  });

  /**
   * 人脸比对测试
   */
  describe('Face Comparison', () => {
    it('应该比对两张人脸', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: testComparisonResult
        }
      });
      
      const faceImage2 = {
        ...testFaceImage,
        image: 'another-base64-image'
      };
      
      const result = await baiduFaceService.compareFaces(testFaceImage, faceImage2);
      
      expect(result).toEqual(testComparisonResult);
      expect(result.isMatch).toBe(true);
      expect(result.score).toBe(88.5);
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('face/v3/match'),
        expect.arrayContaining([
          expect.objectContaining({
            image: testFaceImage.image,
            image_type: testFaceImage.imageType
          }),
          expect.objectContaining({
            image: faceImage2.image,
            image_type: faceImage2.imageType
          })
        ]),
        expect.any(Object)
      );
    });

    it('应该批量比对人脸', async () => {
      const faceImages = [
        testFaceImage,
        { ...testFaceImage, image: 'image2' },
        { ...testFaceImage, image: 'image3' }
      ];
      
      const batchResults = await baiduFaceService.batchCompareFaces(faceImages);
      
      expect(batchResults).toHaveLength(3); // 3张图片，3个比对结果
      expect(mockAxios.post).toHaveBeenCalledTimes(4); // 1次获取token + 3次比对
    });

    it('应该设置比对阈值', async () => {
      const options: ComparisonOptions = {
        qualityControl: 'HIGH',
        livenessControl: 'HIGH',
        threshold: 0.9
      };
      
      await baiduFaceService.compareFaces(testFaceImage, testFaceImage, options);
      
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          params: expect.objectContaining({
            quality_control: 'HIGH',
            liveness_control: 'HIGH'
          })
        })
      );
    });
  });

  /**
   * 人脸库管理测试
   */
  describe('Face Library Management', () => {
    it('应该创建用户组', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          log_id: 'log-123456789'
        }
      });
      
      const groupInfo = {
        groupId: 'test-group',
        groupName: 'Test Group',
        groupDescription: 'A test group for face recognition'
      };
      
      const result = await baiduFaceService.createGroup(groupInfo);
      
      expect(result.success).toBe(true);
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('face/v3/faceset/group/add'),
        expect.objectContaining({
          group_id: 'test-group'
        }),
        expect.any(Object)
      );
    });

    it('应该添加用户到人脸库', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: {
            face_token: 'face-token-123',
            location: testDetectionResult.faceList[0].location
          }
        }
      });
      
      const userInfo = {
        groupId: 'test-group',
        userId: 'user-123',
        userInfo: 'Test User',
        actionType: 'APPEND'
      };
      
      const result = await baiduFaceService.addUser(testFaceImage, userInfo);
      
      expect(result.success).toBe(true);
      expect(result.faceToken).toBe('face-token-123');
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('face/v3/faceset/user/add'),
        expect.objectContaining({
          image: testFaceImage.image,
          image_type: testFaceImage.imageType,
          group_id: 'test-group',
          user_id: 'user-123',
          user_info: 'Test User',
          action_type: 'APPEND'
        }),
        expect.any(Object)
      );
    });

    it('应该更新用户人脸', async () => {
      const userInfo = {
        groupId: 'test-group',
        userId: 'user-123',
        userInfo: 'Updated User Info',
        actionType: 'REPLACE'
      };
      
      const result = await baiduFaceService.updateUser(testFaceImage, userInfo);
      
      expect(result.success).toBe(true);
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('face/v3/faceset/user/update'),
        expect.objectContaining({
          action_type: 'REPLACE'
        }),
        expect.any(Object)
      );
    });

    it('应该删除用户', async () => {
      const result = await baiduFaceService.deleteUser('test-group', 'user-123');
      
      expect(result.success).toBe(true);
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('face/v3/faceset/user/delete'),
        expect.objectContaining({
          group_id: 'test-group',
          user_id: 'user-123'
        }),
        expect.any(Object)
      );
    });

    it('应该获取用户列表', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: {
            user_id_list: ['user-123', 'user-456', 'user-789']
          }
        }
      });
      
      const userList = await baiduFaceService.getUserList('test-group');
      
      expect(userList).toEqual(['user-123', 'user-456', 'user-789']);
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('face/v3/faceset/group/getusers'),
        expect.objectContaining({
          group_id: 'test-group'
        }),
        expect.any(Object)
      );
    });

    it('应该获取用户信息', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: {
            user_list: [
              {
                group_id: 'test-group',
                user_id: 'user-123',
                user_info: 'Test User',
                face_list: [
                  {
                    face_token: 'face-token-123',
                    ctime: '2024-01-01 10:00:00'
                  }
                ]
              }
            ]
          }
        }
      });
      
      const userInfo = await baiduFaceService.getUserInfo('user-123', 'test-group');
      
      expect(userInfo).toEqual(
        expect.objectContaining({
          userId: 'user-123',
          userInfo: 'Test User',
          faceList: expect.any(Array)
        })
      );
    });
  });

  /**
   * 活体检测测试
   */
  describe('Liveness Detection', () => {
    it('应该进行活体检测', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: testLivenessResult
        }
      });
      
      const result = await baiduFaceService.detectLiveness(testFaceImage);
      
      expect(result).toEqual(testLivenessResult);
      expect(result.faceList[0].isLive).toBe(true);
      expect(result.faceList[0].livenessScore).toBe(0.95);
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('face/v1/faceliveness'),
        expect.objectContaining({
          image: testFaceImage.image,
          image_type: testFaceImage.imageType
        }),
        expect.any(Object)
      );
    });

    it('应该检测视频活体', async () => {
      const videoFrames = [
        { ...testFaceImage, image: 'frame1' },
        { ...testFaceImage, image: 'frame2' },
        { ...testFaceImage, image: 'frame3' }
      ];
      
      const result = await baiduFaceService.detectVideoLiveness(videoFrames);
      
      expect(result).toEqual(
        expect.objectContaining({
          isLive: expect.any(Boolean),
          confidence: expect.any(Number),
          frameResults: expect.any(Array)
        })
      );
    });

    it('应该设置活体检测阈值', async () => {
      const options = {
        livenessThreshold: 0.8,
        spoofingThreshold: 0.2
      };
      
      await baiduFaceService.detectLiveness(testFaceImage, options);
      
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          option: JSON.stringify(options)
        }),
        expect.any(Object)
      );
    });
  });

  /**
   * 人脸属性分析测试
   */
  describe('Face Attribute Analysis', () => {
    it('应该分析人脸属性', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 0,
          error_msg: 'SUCCESS',
          result: testAttributeResult
        }
      });
      
      const result = await baiduFaceService.analyzeFaceAttributes(testFaceImage);
      
      expect(result).toEqual(testAttributeResult);
      expect(result.faceList[0]).toEqual(
        expect.objectContaining({
          age: 25,
          beauty: 75.5,
          gender: expect.objectContaining({
            type: 'male',
            probability: 0.9
          }),
          expression: expect.objectContaining({
            type: 'smile',
            probability: 0.8
          })
        })
      );
    });

    it('应该分析年龄', async () => {
      const age = await baiduFaceService.estimateAge(testFaceImage);
      
      expect(age).toEqual(
        expect.objectContaining({
          estimatedAge: expect.any(Number),
          confidence: expect.any(Number),
          ageRange: expect.objectContaining({
            min: expect.any(Number),
            max: expect.any(Number)
          })
        })
      );
    });

    it('应该分析性别', async () => {
      const gender = await baiduFaceService.recognizeGender(testFaceImage);
      
      expect(gender).toEqual(
        expect.objectContaining({
          gender: expect.stringMatching(/male|female/),
          confidence: expect.any(Number)
        })
      );
    });

    it('应该分析表情', async () => {
      const expression = await baiduFaceService.analyzeExpression(testFaceImage);
      
      expect(expression).toEqual(
        expect.objectContaining({
          expression: expect.any(String),
          confidence: expect.any(Number),
          emotions: expect.any(Array)
        })
      );
    });

    it('应该分析颜值', async () => {
      const beauty = await baiduFaceService.analyzeBeauty(testFaceImage);
      
      expect(beauty).toEqual(
        expect.objectContaining({
          beautyScore: expect.any(Number),
          maleScore: expect.any(Number),
          femaleScore: expect.any(Number)
        })
      );
    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理API错误', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 216100,
          error_msg: 'invalid param',
          log_id: 'log-123456789'
        }
      });
      
      await expect(baiduFaceService.detectFace(testFaceImage))
        .rejects.toThrow('invalid param');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Baidu Face API error',
        expect.objectContaining({
          errorCode: 216100,
          errorMsg: 'invalid param'
        })
      );
    });

    it('应该处理网络错误', async () => {
      mockAxios.post.mockRejectedValue(new Error('Network error'));
      
      await expect(baiduFaceService.detectFace(testFaceImage))
        .rejects.toThrow('Network error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Baidu Face service network error',
        expect.objectContaining({
          error: 'Network error'
        })
      );
    });

    it('应该处理无效图片', async () => {
      interface InvalidImageData {
        image: string;
        imageType: string;
      }
      
      const invalidImage: InvalidImageData = {
        image: 'invalid-base64',
        imageType: 'BASE64'
      };
      
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 216101,
          error_msg: 'not a valid image',
          log_id: 'log-123456789'
        }
      });
      
      await expect(baiduFaceService.detectFace(invalidImage as FaceImage))
        .rejects.toThrow('not a valid image');
    });

    it('应该处理人脸未检测到', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 222202,
          error_msg: 'pic not has face',
          log_id: 'log-123456789'
        }
      });
      
      await expect(baiduFaceService.detectFace(testFaceImage))
        .rejects.toThrow('pic not has face');
    });

    it('应该重试失败的请求', async () => {
      mockAxios.post
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue({
          data: {
            error_code: 0,
            error_msg: 'SUCCESS',
            result: testDetectionResult
          }
        });
      
      const result = await baiduFaceService.detectFace(testFaceImage);
      
      expect(result).toEqual(testDetectionResult);
      expect(mockAxios.post).toHaveBeenCalledTimes(4); // 1次token + 3次检测（2次失败+1次成功）
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Retrying Baidu Face API request',
        expect.objectContaining({
          attempt: expect.any(Number),
          error: expect.any(String)
        })
      );
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该高效处理批量人脸检测', async () => {
      const images = Array.from({ length: 10 }, (_, i) => ({
        ...testFaceImage,
        image: `image-${i}`
      }));
      
      const startTime = Date.now();
      const results = await baiduFaceService.batchDetectFaces(images);
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(10000); // 10秒内完成10张图片检测
      expect(results).toHaveLength(10);
      expect(mockAnalyticsService.histogram).toHaveBeenCalledWith(
        'baidu_face.batch_detection.duration',
        executionTime
      );
    });

    it('应该有效利用缓存', async () => {
      const cacheKey = 'face_detection_' + Buffer.from(testFaceImage.image).toString('base64').slice(0, 32);
      
      // 第一次调用
      await baiduFaceService.detectFace(testFaceImage);
      
      // 第二次调用应该使用缓存
      mockCacheService.get.mockResolvedValue(testDetectionResult);
      
      await baiduFaceService.detectFace(testFaceImage);
      
      expect(mockAxios.post).toHaveBeenCalledTimes(2); // 1次token + 1次检测（第二次使用缓存）
      expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
    });

    it('应该优化内存使用', async () => {
      const largeImage = {
        ...testFaceImage,
        image: 'x'.repeat(1000000) // 1MB base64图片
      };
      
      const result = await baiduFaceService.detectFace(largeImage);
      
      expect(result).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Processing large image',
        expect.objectContaining({
          imageSize: expect.any(Number),
          format: expect.any(String)
        })
      );
    });
  });

  /**
   * 边界情况测试
   */
  describe('Edge Cases', () => {
    it('应该处理空图片', async () => {
      interface EmptyImageData {
        image: string;
        imageType: string;
      }
      
      const emptyImage: EmptyImageData = {
        image: '',
        imageType: 'BASE64'
      };
      
      await expect(baiduFaceService.detectFace(emptyImage as FaceImage))
        .rejects.toThrow('Image data is required');
    });

    it('应该处理非常小的图片', async () => {
      const tinyImage = {
        image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', // 1x1像素图片
        imageType: 'BASE64'
      };
      
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 222202,
          error_msg: 'pic not has face'
        }
      });
      
      await expect(baiduFaceService.detectFace(tinyImage))
        .rejects.toThrow('pic not has face');
    });

    it('应该处理无效的图片格式', async () => {
      interface InvalidFormatImageData {
        image: string;
        imageType: string;
      }
      
      const invalidFormatImage: InvalidFormatImageData = {
        image: testFaceImage.image,
        imageType: 'INVALID_FORMAT'
      };
      
      await expect(baiduFaceService.detectFace(invalidFormatImage as FaceImage))
        .rejects.toThrow('Invalid image type');
    });

    it('应该处理超大图片', async () => {
      const hugeImage = {
        image: 'x'.repeat(10000000), // 10MB base64图片
        imageType: 'BASE64'
      };
      
      mockAxios.post.mockResolvedValue({
        data: {
          error_code: 216102,
          error_msg: 'image size error'
        }
      });
      
      await expect(baiduFaceService.detectFace(hugeImage))
        .rejects.toThrow('image size error');
    });

    it('应该处理特殊字符', async () => {
      const specialCharImage = {
        image: testFaceImage.image,
        imageType: 'BASE64',
        faceField: 'age,gender,表情,美颜' // 包含中文字符
      };
      
      const result = await baiduFaceService.detectFace(specialCharImage);
      
      expect(result).toBeDefined();
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          face_field: 'age,gender,表情,美颜'
        }),
        expect.objectContaining({
          headers: expect.any(Object)
        })
      );
    });
  });
});