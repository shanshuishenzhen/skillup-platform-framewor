/**
 * 图片文件模拟配置
 * 
 * 为Jest测试环境提供图片文件的专用模拟，包括：
 * 1. 静态图片导入模拟
 * 2. Next.js Image组件模拟
 * 3. 图片加载状态模拟
 * 4. 图片尺寸和属性模拟
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

/**
 * 默认图片模拟对象
 * 
 * 提供图片文件导入时的模拟返回值
 * 包含常用的图片属性和方法
 */
const defaultImageMock = {
  src: 'test-image-stub',
  height: 100,
  width: 100,
  alt: 'Test Image',
  loading: 'lazy',
  blurDataURL: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Rj5m1leJ4VkuIXjkjkjdXjdGDKykEEEcEEV6tpVvfWkEVzbTJPBPGskUqMGR0YZVlYcEEEEEV+N/U',
  toString: () => 'test-image-stub',
  default: 'test-image-stub'
};

/**
 * 创建图片模拟对象
 * @param {Object} options - 图片选项
 * @param {string} options.src - 图片源路径
 * @param {number} options.width - 图片宽度
 * @param {number} options.height - 图片高度
 * @param {string} options.alt - 图片替代文本
 * @param {string} options.format - 图片格式
 * @returns {Object} 图片模拟对象
 */
function createImageMock(options = {}) {
  const {
    src = 'test-image-stub',
    width = 100,
    height = 100,
    alt = 'Test Image',
    format = 'jpeg'
  } = options;

  return {
    src,
    width,
    height,
    alt,
    format,
    loading: 'lazy',
    placeholder: 'blur',
    blurDataURL: generateBlurDataURL(width, height),
    toString: () => src,
    default: src,
    
    // 模拟图片加载事件
    onLoad: jest.fn(),
    onError: jest.fn(),
    onLoadStart: jest.fn(),
    
    // 模拟图片属性
    naturalWidth: width,
    naturalHeight: height,
    complete: true,
    
    // 模拟图片方法
    decode: jest.fn().mockResolvedValue(undefined),
    
    // 模拟响应式图片
    srcSet: `${src} 1x, ${src} 2x`,
    sizes: '(max-width: 768px) 100vw, 50vw'
  };
}

/**
 * 生成模糊数据URL
 * @param {number} width - 图片宽度
 * @param {number} height - 图片高度
 * @returns {string} Base64编码的模糊图片数据
 */
function generateBlurDataURL(width, height) {
  // 简化的1x1像素的JPEG数据URL
  return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Rj5m1leJ4VkuIXjkjkjdXjdGDKykEEEcEEV6tpVvfWkEVzbTJPBPGskUqMGR0YZVlYcEEEEEV+N/U';
}

/**
 * 模拟不同格式的图片
 */
const imageFormats = {
  jpeg: createImageMock({ format: 'jpeg' }),
  jpg: createImageMock({ format: 'jpg' }),
  png: createImageMock({ format: 'png' }),
  gif: createImageMock({ format: 'gif' }),
  webp: createImageMock({ format: 'webp' }),
  avif: createImageMock({ format: 'avif' }),
  svg: {
    src: 'test-svg-stub',
    content: '<svg><rect width="100" height="100" fill="red" /></svg>',
    toString: () => 'test-svg-stub',
    default: 'test-svg-stub'
  }
};

/**
 * 模拟图片加载状态
 */
const imageLoadingStates = {
  loading: {
    complete: false,
    naturalWidth: 0,
    naturalHeight: 0,
    src: ''
  },
  loaded: {
    complete: true,
    naturalWidth: 100,
    naturalHeight: 100,
    src: 'test-image-stub'
  },
  error: {
    complete: false,
    naturalWidth: 0,
    naturalHeight: 0,
    src: '',
    error: new Error('Image load failed')
  }
};

/**
 * 模拟Next.js Image组件
 */
const mockNextImage = {
  __esModule: true,
  default: jest.fn((props) => {
    const {
      src,
      alt = 'Test Image',
      width = 100,
      height = 100,
      priority = false,
      loading = 'lazy',
      placeholder,
      blurDataURL,
      ...rest
    } = props;

    return {
      type: 'img',
      props: {
        src: typeof src === 'string' ? src : 'test-image-stub',
        alt,
        width,
        height,
        loading: priority ? 'eager' : loading,
        'data-testid': 'next-image',
        ...rest
      }
    };
  })
};

/**
 * 模拟图片优化服务
 */
const mockImageOptimization = {
  /**
   * 模拟图片尺寸调整
   * @param {string} src - 原始图片路径
   * @param {number} width - 目标宽度
   * @param {number} height - 目标高度
   * @returns {string} 优化后的图片路径
   */
  resize: jest.fn((src, width, height) => {
    return `${src}?w=${width}&h=${height}`;
  }),

  /**
   * 模拟图片格式转换
   * @param {string} src - 原始图片路径
   * @param {string} format - 目标格式
   * @returns {string} 转换后的图片路径
   */
  convert: jest.fn((src, format) => {
    return `${src}?format=${format}`;
  }),

  /**
   * 模拟图片质量调整
   * @param {string} src - 原始图片路径
   * @param {number} quality - 图片质量 (1-100)
   * @returns {string} 调整后的图片路径
   */
  quality: jest.fn((src, quality) => {
    return `${src}?q=${quality}`;
  })
};

/**
 * 模拟图片懒加载
 */
const mockLazyLoading = {
  /**
   * 模拟Intersection Observer
   */
  IntersectionObserver: jest.fn().mockImplementation((callback) => {
    return {
      observe: jest.fn((element) => {
        // 模拟元素进入视口
        setTimeout(() => {
          callback([{
            target: element,
            isIntersecting: true,
            intersectionRatio: 1
          }]);
        }, 100);
      }),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    };
  }),

  /**
   * 模拟图片懒加载钩子
   */
  useLazyImage: jest.fn((src) => {
    return {
      imageSrc: src,
      imageRef: { current: null },
      isLoaded: true,
      isInView: true,
      error: null
    };
  })
};

/**
 * 模拟图片预加载
 */
const mockImagePreloader = {
  /**
   * 预加载单个图片
   * @param {string} src - 图片路径
   * @returns {Promise} 预加载Promise
   */
  preloadImage: jest.fn((src) => {
    return Promise.resolve(createImageMock({ src }));
  }),

  /**
   * 批量预加载图片
   * @param {string[]} srcs - 图片路径数组
   * @returns {Promise} 批量预加载Promise
   */
  preloadImages: jest.fn((srcs) => {
    return Promise.all(srcs.map(src => 
      Promise.resolve(createImageMock({ src }))
    ));
  })
};

/**
 * 模拟图片错误处理
 */
const mockImageErrorHandler = {
  /**
   * 处理图片加载错误
   * @param {Error} error - 错误对象
   * @param {string} src - 图片路径
   * @returns {string} 备用图片路径
   */
  handleImageError: jest.fn((error, src) => {
    console.warn(`Image load failed: ${src}`, error);
    return '/images/placeholder.jpg';
  }),

  /**
   * 获取备用图片
   * @param {number} width - 图片宽度
   * @param {number} height - 图片高度
   * @returns {string} 备用图片路径
   */
  getFallbackImage: jest.fn((width = 100, height = 100) => {
    return `https://via.placeholder.com/${width}x${height}/cccccc/969696?text=No+Image`;
  })
};

// 导出默认模拟对象
module.exports = defaultImageMock;

// 导出所有模拟功能
module.exports.createImageMock = createImageMock;
module.exports.imageFormats = imageFormats;
module.exports.imageLoadingStates = imageLoadingStates;
module.exports.mockNextImage = mockNextImage;
module.exports.mockImageOptimization = mockImageOptimization;
module.exports.mockLazyLoading = mockLazyLoading;
module.exports.mockImagePreloader = mockImagePreloader;
module.exports.mockImageErrorHandler = mockImageErrorHandler;
module.exports.generateBlurDataURL = generateBlurDataURL;