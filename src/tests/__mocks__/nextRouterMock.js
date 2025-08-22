/**
 * Next.js Router模拟
 * 
 * 在测试环境中模拟next/router的useRouter钩子
 * 提供路由相关的模拟方法
 */

const mockRouter = {
  // 当前路由信息
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
  basePath: '',
  locale: 'zh-CN',
  locales: ['zh-CN', 'en-US'],
  defaultLocale: 'zh-CN',
  isReady: true,
  isPreview: false,
  isFallback: false,
  
  // 路由方法
  push: jest.fn(() => Promise.resolve(true)),
  replace: jest.fn(() => Promise.resolve(true)),
  reload: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(() => Promise.resolve()),
  beforePopState: jest.fn(),
  
  // 事件监听
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  }
};

// useRouter钩子模拟
const useRouter = () => mockRouter;

// withRouter HOC模拟
const withRouter = (Component) => {
  const WrappedComponent = (props) => {
    return Component({ ...props, router: mockRouter });
  };
  WrappedComponent.displayName = `withRouter(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Router类模拟
const Router = {
  ...mockRouter,
  router: mockRouter
};

// 导出
module.exports = {
  useRouter,
  withRouter,
  Router,
  default: Router
};

// 重置模拟状态的工具函数
mockRouter.mockReset = () => {
  mockRouter.pathname = '/';
  mockRouter.route = '/';
  mockRouter.query = {};
  mockRouter.asPath = '/';
  mockRouter.isReady = true;
  
  // 重置所有模拟函数
  Object.values(mockRouter).forEach(value => {
    if (typeof value === 'function' && value._isMockFunction) {
      value.mockReset();
    }
  });
  
  // 重置事件监听器
  Object.values(mockRouter.events).forEach(fn => {
    if (fn._isMockFunction) {
      fn.mockReset();
    }
  });
};

// 设置路由状态的工具函数
mockRouter.mockImplementation = (routerState) => {
  Object.assign(mockRouter, routerState);
};

// 模拟路由跳转成功
mockRouter.mockPushSuccess = (url) => {
  mockRouter.push.mockResolvedValueOnce(true);
  mockRouter.pathname = url;
  mockRouter.asPath = url;
};

// 模拟路由跳转失败
mockRouter.mockPushError = (error) => {
  mockRouter.push.mockRejectedValueOnce(error);
};

// 模拟查询参数
mockRouter.mockQuery = (query) => {
  mockRouter.query = query;
};

// 模拟路由事件
mockRouter.mockRouteChangeStart = (url) => {
  mockRouter.events.emit('routeChangeStart', url);
};

mockRouter.mockRouteChangeComplete = (url) => {
  mockRouter.events.emit('routeChangeComplete', url);
};

mockRouter.mockRouteChangeError = (error, url) => {
  mockRouter.events.emit('routeChangeError', error, url);
};