/**
 * Next.js Navigation模拟 (App Router)
 * 
 * 在测试环境中模拟next/navigation的钩子和组件
 * 适用于Next.js 13+ App Router
 */

const mockSearchParams = new URLSearchParams();
const mockPathname = '/';
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn()
};

// useRouter钩子模拟 (App Router)
const useRouter = () => mockRouter;

// usePathname钩子模拟
const usePathname = () => mockPathname;

// useSearchParams钩子模拟
const useSearchParams = () => mockSearchParams;

// useParams钩子模拟
const useParams = () => ({});

// useSelectedLayoutSegment钩子模拟
const useSelectedLayoutSegment = () => null;

// useSelectedLayoutSegments钩子模拟
const useSelectedLayoutSegments = () => [];

// redirect函数模拟
const redirect = jest.fn();

// permanentRedirect函数模拟
const permanentRedirect = jest.fn();

// notFound函数模拟
const notFound = jest.fn();

// Link组件模拟
const Link = ({ children, href, ...props }) => {
  return React.createElement('a', {
    href: typeof href === 'string' ? href : href?.pathname || '/',
    'data-testid': 'next-link',
    ...props
  }, children);
};

// 导出所有模拟
module.exports = {
  useRouter,
  usePathname,
  useSearchParams,
  useParams,
  useSelectedLayoutSegment,
  useSelectedLayoutSegments,
  redirect,
  permanentRedirect,
  notFound,
  Link
};

// 工具函数：重置所有模拟
const resetMocks = () => {
  // 重置router模拟
  Object.values(mockRouter).forEach(fn => {
    if (fn._isMockFunction) {
      fn.mockReset();
    }
  });
  
  // 重置其他函数模拟
  redirect.mockReset();
  permanentRedirect.mockReset();
  notFound.mockReset();
  
  // 重置搜索参数
  mockSearchParams.forEach((value, key) => {
    mockSearchParams.delete(key);
  });
};

// 工具函数：设置路径名
const setMockPathname = (pathname) => {
  // 由于usePathname返回的是常量，我们需要重新模拟
  module.exports.usePathname = () => pathname;
};

// 工具函数：设置搜索参数
const setMockSearchParams = (params) => {
  // 清空现有参数
  mockSearchParams.forEach((value, key) => {
    mockSearchParams.delete(key);
  });
  
  // 设置新参数
  Object.entries(params).forEach(([key, value]) => {
    mockSearchParams.set(key, value);
  });
};

// 工具函数：设置参数
const setMockParams = (params) => {
  module.exports.useParams = () => params;
};

// 工具函数：模拟路由跳转
const mockPush = (url, options) => {
  mockRouter.push.mockImplementation((url, options) => {
    // 可以在这里添加路由跳转的副作用
    console.log(`Mock navigation to: ${url}`);
  });
};

// 工具函数：模拟重定向
const mockRedirect = (url) => {
  redirect.mockImplementation((url) => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  });
};

// 工具函数：模拟404
const mockNotFound = () => {
  notFound.mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  });
};

// 导出工具函数
module.exports.resetMocks = resetMocks;
module.exports.setMockPathname = setMockPathname;
module.exports.setMockSearchParams = setMockSearchParams;
module.exports.setMockParams = setMockParams;
module.exports.mockPush = mockPush;
module.exports.mockRedirect = mockRedirect;
module.exports.mockNotFound = mockNotFound;

// 模拟ReadonlyURLSearchParams类
class MockReadonlyURLSearchParams extends URLSearchParams {
  append() {
    throw new Error('ReadonlyURLSearchParams cannot be modified');
  }
  
  delete() {
    throw new Error('ReadonlyURLSearchParams cannot be modified');
  }
  
  set() {
    throw new Error('ReadonlyURLSearchParams cannot be modified');
  }
  
  sort() {
    throw new Error('ReadonlyURLSearchParams cannot be modified');
  }
}

// 更新useSearchParams以返回只读版本
module.exports.useSearchParams = () => {
  return new MockReadonlyURLSearchParams(mockSearchParams);
};