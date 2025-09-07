/**
 * 文件模拟配置
 * 
 * 为Jest测试环境提供静态资源文件的模拟，包括：
 * 1. 图片文件模拟
 * 2. CSS文件模拟
 * 3. 字体文件模拟
 * 4. 其他静态资源模拟
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

/**
 * 静态资源文件模拟映射
 * 
 * 将各种静态资源文件扩展名映射到相应的模拟值
 * 这样在测试环境中导入这些文件时会返回模拟值而不是实际文件内容
 */
module.exports = {
  // 图片文件模拟
  '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'identity-obj-proxy',
  
  // CSS和样式文件模拟
  '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  
  // 具体的文件类型模拟配置
  moduleNameMapping: {
    // 图片文件
    '\\.(jpg|jpeg|png|gif|webp|avif)$': '<rootDir>/src/tests/__mocks__/imageMock.js',
    
    // SVG文件（特殊处理，因为可能作为React组件使用）
    '\\.svg$': '<rootDir>/src/tests/__mocks__/svgMock.js',
    
    // CSS模块
    '\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    
    // 普通CSS文件
    '\\.(css|sass|scss)$': '<rootDir>/src/tests/__mocks__/styleMock.js',
    
    // 字体文件
    '\\.(woff|woff2|eot|ttf|otf)$': '<rootDir>/src/tests/__mocks__/fontMock.js',
    
    // 音频文件
    '\\.(mp3|wav|ogg|m4a|aac)$': '<rootDir>/src/tests/__mocks__/audioMock.js',
    
    // 视频文件
    '\\.(mp4|avi|mov|wmv|flv|webm)$': '<rootDir>/src/tests/__mocks__/videoMock.js',
    
    // 文档文件
    '\\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$': '<rootDir>/src/tests/__mocks__/documentMock.js',
    
    // 数据文件
    '\\.(json|xml|csv)$': '<rootDir>/src/tests/__mocks__/dataMock.js',
    
    // 其他文件
    '\\.(txt|md|log)$': '<rootDir>/src/tests/__mocks__/textMock.js'
  }
};

/**
 * 获取文件模拟配置
 * @param {string} fileType - 文件类型
 * @returns {string} 模拟文件路径或模拟值
 */
function getFileMock(fileType) {
  const mocks = {
    image: 'test-file-stub',
    css: {},
    font: 'test-font-stub',
    audio: 'test-audio-stub',
    video: 'test-video-stub',
    document: 'test-document-stub',
    data: '{}',
    text: 'test-text-content'
  };
  
  return mocks[fileType] || 'test-file-stub';
}

/**
 * 创建模拟文件对象
 * @param {string} filename - 文件名
 * @param {string} type - 文件类型
 * @returns {Object} 模拟文件对象
 */
function createMockFile(filename, type = 'image') {
  return {
    src: getFileMock(type),
    height: type === 'image' ? 100 : undefined,
    width: type === 'image' ? 100 : undefined,
    blurDataURL: type === 'image' ? 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Rj5m1leJ4VkuIXjkjkjdXjdGDKykEEEcEEV6tpVvfWkEVzbTJPBPGskUqMGR0YZVlYcEEEEEV+N/U' : undefined,
    toString: () => getFileMock(type),
    default: getFileMock(type)
  };
}

/**
 * 模拟Next.js Image组件
 */
const mockNextImage = {
  __esModule: true,
  default: (props) => {
    return {
      type: 'img',
      props: {
        ...props,
        src: typeof props.src === 'string' ? props.src : 'test-image-stub'
      }
    };
  }
};

/**
 * 模拟动态导入
 * @param {string} path - 导入路径
 * @returns {Promise} 模拟的动态导入Promise
 */
function mockDynamicImport(path) {
  const fileExtension = path.split('.').pop()?.toLowerCase();
  
  const typeMap = {
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image',
    css: 'css', scss: 'css', sass: 'css', less: 'css',
    woff: 'font', woff2: 'font', ttf: 'font', eot: 'font', otf: 'font',
    mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio', aac: 'audio',
    mp4: 'video', avi: 'video', mov: 'video', wmv: 'video', webm: 'video',
    pdf: 'document', doc: 'document', docx: 'document', xls: 'document', xlsx: 'document',
    json: 'data', xml: 'data', csv: 'data',
    txt: 'text', md: 'text', log: 'text'
  };
  
  const fileType = typeMap[fileExtension] || 'image';
  const mockFile = createMockFile(path, fileType);
  
  return Promise.resolve({
    default: mockFile,
    ...mockFile
  });
}

/**
 * 模拟文件读取
 * @param {string} path - 文件路径
 * @returns {string} 模拟的文件内容
 */
function mockFileRead(path) {
  const fileExtension = path.split('.').pop()?.toLowerCase();
  
  switch (fileExtension) {
    case 'json':
      return '{"test": true}';
    case 'css':
    case 'scss':
    case 'sass':
      return '.test { color: red; }';
    case 'txt':
    case 'md':
      return 'Test file content';
    case 'svg':
      return '<svg><rect width="100" height="100" fill="red" /></svg>';
    default:
      return 'test-file-content';
  }
}

/**
 * 模拟文件存在检查
 * @param {string} path - 文件路径
 * @returns {boolean} 始终返回true（模拟文件存在）
 */
function mockFileExists(path) {
  return true;
}

/**
 * 模拟文件大小获取
 * @param {string} path - 文件路径
 * @returns {number} 模拟的文件大小（字节）
 */
function mockFileSize(path) {
  const fileExtension = path.split('.').pop()?.toLowerCase();
  
  const sizeMap = {
    jpg: 50000, jpeg: 50000, png: 30000, gif: 20000, webp: 25000, svg: 5000,
    css: 10000, scss: 12000, sass: 12000, less: 11000,
    woff: 40000, woff2: 30000, ttf: 60000, eot: 45000, otf: 55000,
    mp3: 3000000, wav: 10000000, ogg: 2500000, m4a: 2800000, aac: 2600000,
    mp4: 50000000, avi: 80000000, mov: 60000000, wmv: 70000000, webm: 45000000,
    pdf: 500000, doc: 200000, docx: 150000, xls: 100000, xlsx: 80000,
    json: 5000, xml: 8000, csv: 15000,
    txt: 2000, md: 3000, log: 10000
  };
  
  return sizeMap[fileExtension] || 10000;
}

/**
 * 导出所有模拟功能
 */
module.exports = {
  ...module.exports,
  getFileMock,
  createMockFile,
  mockNextImage,
  mockDynamicImport,
  mockFileRead,
  mockFileExists,
  mockFileSize
};