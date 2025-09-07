/**
 * SVG文件模拟配置
 * 
 * 为Jest测试环境提供SVG文件的专用模拟，包括：
 * 1. SVG文件导入模拟
 * 2. SVG作为React组件的模拟
 * 3. SVG内容和属性模拟
 * 4. SVG图标库模拟
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import React from 'react';

/**
 * 默认SVG模拟对象
 * 
 * 提供SVG文件导入时的模拟返回值
 * 包含SVG的基本属性和内容
 */
const defaultSvgMock = {
  src: 'test-svg-stub',
  content: '<svg><rect width="100" height="100" fill="currentColor" /></svg>',
  viewBox: '0 0 100 100',
  width: 100,
  height: 100,
  toString: () => 'test-svg-stub',
  default: 'test-svg-stub'
};

/**
 * 创建SVG模拟对象
 * @param {Object} options - SVG选项
 * @param {string} options.content - SVG内容
 * @param {string} options.viewBox - SVG视图框
 * @param {number} options.width - SVG宽度
 * @param {number} options.height - SVG高度
 * @param {string} options.fill - 填充颜色
 * @param {string} options.stroke - 描边颜色
 * @returns {Object} SVG模拟对象
 */
function createSvgMock(options = {}) {
  const {
    content = '<svg><rect width="100" height="100" fill="currentColor" /></svg>',
    viewBox = '0 0 100 100',
    width = 100,
    height = 100,
    fill = 'currentColor',
    stroke = 'none',
    className = '',
    id = ''
  } = options;

  return {
    src: 'test-svg-stub',
    content,
    viewBox,
    width,
    height,
    fill,
    stroke,
    className,
    id,
    toString: () => 'test-svg-stub',
    default: 'test-svg-stub',
    
    // SVG属性
    xmlns: 'http://www.w3.org/2000/svg',
    xmlnsXlink: 'http://www.w3.org/1999/xlink',
    
    // 模拟SVG方法
    getBBox: jest.fn(() => ({ x: 0, y: 0, width, height })),
    getScreenCTM: jest.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
    createSVGPoint: jest.fn(() => ({ x: 0, y: 0 }))
  };
}

/**
 * 模拟SVG作为React组件
 * @param {Object} props - 组件属性
 * @returns {React.Element} 模拟的SVG React组件
 */
const MockSvgComponent = jest.fn((props) => {
  const {
    width = 24,
    height = 24,
    viewBox = '0 0 24 24',
    fill = 'currentColor',
    className = '',
    children,
    ...rest
  } = props;

  return React.createElement('svg', {
    width,
    height,
    viewBox,
    fill,
    className,
    'data-testid': 'mock-svg',
    xmlns: 'http://www.w3.org/2000/svg',
    ...rest
  }, children || React.createElement('rect', {
    width: '100%',
    height: '100%',
    fill: 'currentColor'
  }));
});

/**
 * 模拟常用的SVG图标
 */
const mockSvgIcons = {
  // 基础图标
  home: createSvgMock({
    content: '<svg><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
    viewBox: '0 0 24 24'
  }),
  
  user: createSvgMock({
    content: '<svg><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
    viewBox: '0 0 24 24'
  }),
  
  settings: createSvgMock({
    content: '<svg><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>',
    viewBox: '0 0 24 24'
  }),
  
  search: createSvgMock({
    content: '<svg><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
    viewBox: '0 0 24 24'
  }),
  
  close: createSvgMock({
    content: '<svg><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
    viewBox: '0 0 24 24'
  }),
  
  menu: createSvgMock({
    content: '<svg><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>',
    viewBox: '0 0 24 24'
  }),
  
  arrow: createSvgMock({
    content: '<svg><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>',
    viewBox: '0 0 24 24'
  }),
  
  check: createSvgMock({
    content: '<svg><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
    viewBox: '0 0 24 24'
  }),
  
  edit: createSvgMock({
    content: '<svg><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
    viewBox: '0 0 24 24'
  }),
  
  delete: createSvgMock({
    content: '<svg><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
    viewBox: '0 0 24 24'
  })
};

/**
 * 模拟SVG图标库（如Lucide React）
 */
const mockLucideReact = {
  Home: MockSvgComponent,
  User: MockSvgComponent,
  Settings: MockSvgComponent,
  Search: MockSvgComponent,
  X: MockSvgComponent,
  Menu: MockSvgComponent,
  ChevronDown: MockSvgComponent,
  Check: MockSvgComponent,
  Edit: MockSvgComponent,
  Trash: MockSvgComponent,
  Plus: MockSvgComponent,
  Minus: MockSvgComponent,
  Star: MockSvgComponent,
  Heart: MockSvgComponent,
  Eye: MockSvgComponent,
  EyeOff: MockSvgComponent,
  Download: MockSvgComponent,
  Upload: MockSvgComponent,
  Save: MockSvgComponent,
  Copy: MockSvgComponent,
  Share: MockSvgComponent,
  Mail: MockSvgComponent,
  Phone: MockSvgComponent,
  Calendar: MockSvgComponent,
  Clock: MockSvgComponent,
  MapPin: MockSvgComponent,
  Globe: MockSvgComponent,
  Lock: MockSvgComponent,
  Unlock: MockSvgComponent,
  Shield: MockSvgComponent,
  AlertCircle: MockSvgComponent,
  CheckCircle: MockSvgComponent,
  XCircle: MockSvgComponent,
  Info: MockSvgComponent,
  HelpCircle: MockSvgComponent,
  ArrowLeft: MockSvgComponent,
  ArrowRight: MockSvgComponent,
  ArrowUp: MockSvgComponent,
  ArrowDown: MockSvgComponent,
  ExternalLink: MockSvgComponent,
  Link: MockSvgComponent,
  Unlink: MockSvgComponent,
  Image: MockSvgComponent,
  File: MockSvgComponent,
  Folder: MockSvgComponent,
  FolderOpen: MockSvgComponent,
  Database: MockSvgComponent,
  Server: MockSvgComponent,
  Cloud: MockSvgComponent,
  Wifi: MockSvgComponent,
  WifiOff: MockSvgComponent,
  Bluetooth: MockSvgComponent,
  Battery: MockSvgComponent,
  Volume: MockSvgComponent,
  VolumeOff: MockSvgComponent,
  Play: MockSvgComponent,
  Pause: MockSvgComponent,
  Stop: MockSvgComponent,
  SkipForward: MockSvgComponent,
  SkipBack: MockSvgComponent,
  Repeat: MockSvgComponent,
  Shuffle: MockSvgComponent,
  Maximize: MockSvgComponent,
  Minimize: MockSvgComponent,
  MoreHorizontal: MockSvgComponent,
  MoreVertical: MockSvgComponent,
  Filter: MockSvgComponent,
  Sort: MockSvgComponent,
  Grid: MockSvgComponent,
  List: MockSvgComponent,
  Layout: MockSvgComponent,
  Sidebar: MockSvgComponent,
  PanelLeft: MockSvgComponent,
  PanelRight: MockSvgComponent,
  Layers: MockSvgComponent,
  Move: MockSvgComponent,
  Resize: MockSvgComponent,
  RotateCw: MockSvgComponent,
  RotateCcw: MockSvgComponent,
  FlipHorizontal: MockSvgComponent,
  FlipVertical: MockSvgComponent,
  Crop: MockSvgComponent,
  Scissors: MockSvgComponent,
  Paperclip: MockSvgComponent,
  Tag: MockSvgComponent,
  Bookmark: MockSvgComponent,
  Flag: MockSvgComponent,
  Award: MockSvgComponent,
  Trophy: MockSvgComponent,
  Target: MockSvgComponent,
  Zap: MockSvgComponent,
  Flame: MockSvgComponent,
  Sun: MockSvgComponent,
  Moon: MockSvgComponent,
  CloudRain: MockSvgComponent,
  CloudSnow: MockSvgComponent,
  Umbrella: MockSvgComponent,
  Thermometer: MockSvgComponent,
  Wind: MockSvgComponent,
  Compass: MockSvgComponent,
  Navigation: MockSvgComponent,
  Map: MockSvgComponent,
  Route: MockSvgComponent,
  Car: MockSvgComponent,
  Truck: MockSvgComponent,
  Plane: MockSvgComponent,
  Train: MockSvgComponent,
  Ship: MockSvgComponent,
  Bike: MockSvgComponent,
  Walk: MockSvgComponent,
  Run: MockSvgComponent,
  Gamepad: MockSvgComponent,
  Joystick: MockSvgComponent,
  Dice: MockSvgComponent,
  Puzzle: MockSvgComponent,
  Gift: MockSvgComponent,
  ShoppingCart: MockSvgComponent,
  ShoppingBag: MockSvgComponent,
  CreditCard: MockSvgComponent,
  Wallet: MockSvgComponent,
  Coins: MockSvgComponent,
  DollarSign: MockSvgComponent,
  Percent: MockSvgComponent,
  Calculator: MockSvgComponent,
  BarChart: MockSvgComponent,
  LineChart: MockSvgComponent,
  PieChart: MockSvgComponent,
  TrendingUp: MockSvgComponent,
  TrendingDown: MockSvgComponent,
  Activity: MockSvgComponent,
  Pulse: MockSvgComponent,
  Monitor: MockSvgComponent,
  Smartphone: MockSvgComponent,
  Tablet: MockSvgComponent,
  Laptop: MockSvgComponent,
  Desktop: MockSvgComponent,
  Tv: MockSvgComponent,
  Radio: MockSvgComponent,
  Headphones: MockSvgComponent,
  Mic: MockSvgComponent,
  MicOff: MockSvgComponent,
  Camera: MockSvgComponent,
  CameraOff: MockSvgComponent,
  Video: MockSvgComponent,
  VideoOff: MockSvgComponent,
  Printer: MockSvgComponent,
  Scanner: MockSvgComponent,
  Keyboard: MockSvgComponent,
  Mouse: MockSvgComponent,
  Usb: MockSvgComponent,
  HardDrive: MockSvgComponent,
  Cpu: MockSvgComponent,
  MemoryStick: MockSvgComponent,
  Power: MockSvgComponent,
  PowerOff: MockSvgComponent,
  Refresh: MockSvgComponent,
  RefreshCw: MockSvgComponent,
  RefreshCcw: MockSvgComponent,
  Loader: MockSvgComponent,
  Loader2: MockSvgComponent,
  Spinner: MockSvgComponent
};

/**
 * 模拟SVG动画
 */
const mockSvgAnimation = {
  /**
   * 模拟SVG动画元素
   */
  animate: jest.fn(),
  animateMotion: jest.fn(),
  animateTransform: jest.fn(),
  
  /**
   * 模拟动画控制
   */
  beginElement: jest.fn(),
  endElement: jest.fn(),
  pauseAnimations: jest.fn(),
  unpauseAnimations: jest.fn(),
  
  /**
   * 模拟动画状态
   */
  getCurrentTime: jest.fn(() => 0),
  setCurrentTime: jest.fn(),
  
  /**
   * 模拟SMIL动画
   */
  createSMILElement: jest.fn(() => ({
    beginElement: jest.fn(),
    endElement: jest.fn(),
    getStartTime: jest.fn(() => 0),
    getSimpleDuration: jest.fn(() => 1000)
  }))
};

/**
 * 模拟SVG路径操作
 */
const mockSvgPath = {
  /**
   * 模拟路径长度计算
   */
  getTotalLength: jest.fn(() => 100),
  
  /**
   * 模拟路径点获取
   */
  getPointAtLength: jest.fn((length) => ({ x: length, y: 0 })),
  
  /**
   * 模拟路径段信息
   */
  getPathSegAtLength: jest.fn(() => 0),
  
  /**
   * 模拟路径数据解析
   */
  parsePath: jest.fn((pathData) => ({
    segments: [],
    totalLength: 100,
    bounds: { x: 0, y: 0, width: 100, height: 100 }
  }))
};

// 导出默认模拟对象
module.exports = defaultSvgMock;

// 导出所有模拟功能
module.exports.createSvgMock = createSvgMock;
module.exports.MockSvgComponent = MockSvgComponent;
module.exports.mockSvgIcons = mockSvgIcons;
module.exports.mockLucideReact = mockLucideReact;
module.exports.mockSvgAnimation = mockSvgAnimation;
module.exports.mockSvgPath = mockSvgPath;

// 导出ES模块格式
module.exports.__esModule = true;
module.exports.default = MockSvgComponent;