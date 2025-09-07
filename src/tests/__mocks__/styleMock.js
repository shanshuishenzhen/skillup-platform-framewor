/**
 * 样式文件模拟配置
 * 
 * 为Jest测试环境提供CSS/SCSS/SASS等样式文件的模拟，包括：
 * 1. CSS文件导入模拟
 * 2. CSS模块模拟
 * 3. SCSS/SASS文件模拟
 * 4. 样式对象和类名模拟
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

/**
 * 默认样式模拟对象
 * 
 * 提供样式文件导入时的模拟返回值
 * 返回空对象，避免样式相关的测试错误
 */
const defaultStyleMock = {};

/**
 * 创建CSS模块模拟对象
 * @param {Object} classNames - 类名映射对象
 * @returns {Object} CSS模块模拟对象
 */
function createCssModuleMock(classNames = {}) {
  const defaultClasses = {
    container: 'container_abc123',
    header: 'header_def456',
    content: 'content_ghi789',
    footer: 'footer_jkl012',
    button: 'button_mno345',
    input: 'input_pqr678',
    form: 'form_stu901',
    card: 'card_vwx234',
    modal: 'modal_yza567',
    sidebar: 'sidebar_bcd890',
    navbar: 'navbar_efg123',
    menu: 'menu_hij456',
    dropdown: 'dropdown_klm789',
    tooltip: 'tooltip_nop012',
    alert: 'alert_qrs345',
    badge: 'badge_tuv678',
    spinner: 'spinner_wxy901',
    loader: 'loader_zab234',
    overlay: 'overlay_cde567',
    backdrop: 'backdrop_fgh890'
  };

  return {
    ...defaultClasses,
    ...classNames,
    
    // 提供动态类名生成
    getClassName: jest.fn((name) => {
      return classNames[name] || defaultClasses[name] || `${name}_mock123`;
    }),
    
    // 模拟CSS模块的toString方法
    toString: () => '[object CSSModule]',
    
    // 模拟CSS模块的Symbol.iterator
    [Symbol.iterator]: function* () {
      for (const [key, value] of Object.entries({ ...defaultClasses, ...classNames })) {
        yield [key, value];
      }
    }
  };
}

/**
 * 模拟样式计算和应用
 */
const mockStyleUtils = {
  /**
   * 模拟getComputedStyle
   * @param {Element} element - DOM元素
   * @param {string} pseudoElement - 伪元素
   * @returns {Object} 计算样式对象
   */
  getComputedStyle: jest.fn((element, pseudoElement) => {
    return {
      getPropertyValue: jest.fn((property) => {
        const defaultStyles = {
          'display': 'block',
          'position': 'static',
          'width': '100px',
          'height': '100px',
          'margin': '0px',
          'padding': '0px',
          'border': '0px none',
          'background': 'transparent',
          'color': 'rgb(0, 0, 0)',
          'font-size': '16px',
          'font-family': 'Arial, sans-serif',
          'line-height': 'normal',
          'text-align': 'left',
          'visibility': 'visible',
          'opacity': '1',
          'z-index': 'auto',
          'overflow': 'visible',
          'box-sizing': 'content-box',
          'float': 'none',
          'clear': 'none'
        };
        return defaultStyles[property] || '';
      }),
      
      setProperty: jest.fn(),
      removeProperty: jest.fn(),
      
      // 常用样式属性
      display: 'block',
      position: 'static',
      width: '100px',
      height: '100px',
      margin: '0px',
      padding: '0px',
      border: '0px none',
      background: 'transparent',
      color: 'rgb(0, 0, 0)',
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      lineHeight: 'normal',
      textAlign: 'left',
      visibility: 'visible',
      opacity: '1',
      zIndex: 'auto',
      overflow: 'visible',
      boxSizing: 'content-box'
    };
  }),

  /**
   * 模拟样式表操作
   */
  createStyleSheet: jest.fn(() => {
    return {
      insertRule: jest.fn(),
      deleteRule: jest.fn(),
      addRule: jest.fn(),
      removeRule: jest.fn(),
      cssRules: [],
      rules: []
    };
  }),

  /**
   * 模拟CSS规则
   */
  createCSSRule: jest.fn((selector, styles) => {
    return {
      selectorText: selector,
      style: styles,
      cssText: `${selector} { ${Object.entries(styles).map(([key, value]) => `${key}: ${value}`).join('; ')} }`,
      type: 1 // STYLE_RULE
    };
  })
};

/**
 * 模拟CSS-in-JS库
 */
const mockStyledComponents = {
  /**
   * 模拟styled-components
   */
  styled: new Proxy({}, {
    get: (target, prop) => {
      return jest.fn((styles) => {
        return jest.fn((props) => {
          return {
            type: prop,
            props: {
              ...props,
              className: `styled-${prop}-${Math.random().toString(36).substr(2, 9)}`,
              'data-testid': `styled-${prop}`
            }
          };
        });
      });
    }
  }),

  /**
   * 模拟emotion
   */
  css: jest.fn((styles) => {
    return `css-${Math.random().toString(36).substr(2, 9)}`;
  }),

  /**
   * 模拟emotion jsx
   */
  jsx: jest.fn((type, props, ...children) => {
    return {
      type,
      props: {
        ...props,
        children
      }
    };
  }),

  /**
   * 模拟theme provider
   */
  ThemeProvider: jest.fn(({ theme, children }) => children),

  /**
   * 模拟useTheme hook
   */
  useTheme: jest.fn(() => ({
    colors: {
      primary: '#007bff',
      secondary: '#6c757d',
      success: '#28a745',
      danger: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8',
      light: '#f8f9fa',
      dark: '#343a40'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '3rem'
    },
    breakpoints: {
      xs: '0px',
      sm: '576px',
      md: '768px',
      lg: '992px',
      xl: '1200px'
    },
    typography: {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      lineHeight: '1.5'
    }
  }))
};

/**
 * 模拟Tailwind CSS
 */
const mockTailwindCSS = {
  /**
   * 模拟Tailwind类名
   */
  classes: {
    // 布局
    'container': 'container',
    'flex': 'flex',
    'grid': 'grid',
    'block': 'block',
    'inline': 'inline',
    'hidden': 'hidden',
    
    // 间距
    'p-4': 'p-4',
    'm-4': 'm-4',
    'px-4': 'px-4',
    'py-4': 'py-4',
    'mx-auto': 'mx-auto',
    
    // 颜色
    'text-blue-500': 'text-blue-500',
    'bg-red-500': 'bg-red-500',
    'border-gray-300': 'border-gray-300',
    
    // 尺寸
    'w-full': 'w-full',
    'h-full': 'h-full',
    'w-64': 'w-64',
    'h-32': 'h-32',
    
    // 字体
    'text-lg': 'text-lg',
    'font-bold': 'font-bold',
    'text-center': 'text-center',
    
    // 边框
    'border': 'border',
    'rounded': 'rounded',
    'shadow': 'shadow',
    
    // 响应式
    'sm:block': 'sm:block',
    'md:flex': 'md:flex',
    'lg:grid': 'lg:grid',
    
    // 状态
    'hover:bg-blue-600': 'hover:bg-blue-600',
    'focus:outline-none': 'focus:outline-none',
    'active:bg-blue-700': 'active:bg-blue-700'
  },

  /**
   * 模拟clsx/classnames库
   */
  clsx: jest.fn((...args) => {
    return args
      .flat()
      .filter(Boolean)
      .map(arg => {
        if (typeof arg === 'string') return arg;
        if (typeof arg === 'object') {
          return Object.entries(arg)
            .filter(([, value]) => Boolean(value))
            .map(([key]) => key)
            .join(' ');
        }
        return '';
      })
      .join(' ')
      .trim();
  }),

  /**
   * 模拟cn函数（常用的类名合并函数）
   */
  cn: jest.fn((...args) => {
    return mockTailwindCSS.clsx(...args);
  })
};

/**
 * 模拟CSS动画
 */
const mockCSSAnimation = {
  /**
   * 模拟Web Animations API
   */
  animate: jest.fn((keyframes, options) => {
    return {
      play: jest.fn(),
      pause: jest.fn(),
      cancel: jest.fn(),
      finish: jest.fn(),
      reverse: jest.fn(),
      updatePlaybackRate: jest.fn(),
      
      // 属性
      currentTime: 0,
      playbackRate: 1,
      playState: 'running',
      ready: Promise.resolve(),
      finished: Promise.resolve(),
      
      // 事件
      onfinish: null,
      oncancel: null,
      
      // 监听器
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
  }),

  /**
   * 模拟CSS过渡
   */
  transition: jest.fn((property, duration, easing, delay) => {
    return `${property} ${duration} ${easing} ${delay}`;
  }),

  /**
   * 模拟CSS变换
   */
  transform: {
    translate: jest.fn((x, y) => `translate(${x}, ${y})`),
    scale: jest.fn((x, y) => `scale(${x}, ${y || x})`),
    rotate: jest.fn((angle) => `rotate(${angle})`),
    skew: jest.fn((x, y) => `skew(${x}, ${y})`),
    matrix: jest.fn((a, b, c, d, e, f) => `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`)
  }
};

/**
 * 模拟媒体查询
 */
const mockMediaQuery = {
  /**
   * 模拟matchMedia
   */
  matchMedia: jest.fn((query) => {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    };
  }),

  /**
   * 模拟ResizeObserver
   */
  ResizeObserver: jest.fn().mockImplementation((callback) => {
    return {
      observe: jest.fn((element) => {
        // 模拟尺寸变化
        setTimeout(() => {
          callback([{
            target: element,
            contentRect: {
              width: 100,
              height: 100,
              top: 0,
              left: 0,
              bottom: 100,
              right: 100
            },
            borderBoxSize: [{ inlineSize: 100, blockSize: 100 }],
            contentBoxSize: [{ inlineSize: 100, blockSize: 100 }]
          }]);
        }, 100);
      }),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    };
  })
};

/**
 * 模拟CSS变量
 */
const mockCSSVariables = {
  /**
   * 设置CSS变量
   */
  setProperty: jest.fn((property, value) => {
    document.documentElement.style.setProperty(property, value);
  }),

  /**
   * 获取CSS变量
   */
  getProperty: jest.fn((property) => {
    const defaultVariables = {
      '--primary-color': '#007bff',
      '--secondary-color': '#6c757d',
      '--success-color': '#28a745',
      '--danger-color': '#dc3545',
      '--warning-color': '#ffc107',
      '--info-color': '#17a2b8',
      '--light-color': '#f8f9fa',
      '--dark-color': '#343a40',
      '--font-family': 'Arial, sans-serif',
      '--font-size': '16px',
      '--line-height': '1.5',
      '--border-radius': '4px',
      '--box-shadow': '0 2px 4px rgba(0,0,0,0.1)',
      '--transition': '0.3s ease'
    };
    return defaultVariables[property] || '';
  }),

  /**
   * 移除CSS变量
   */
  removeProperty: jest.fn((property) => {
    document.documentElement.style.removeProperty(property);
  })
};

// 导出默认模拟对象
module.exports = defaultStyleMock;

// 导出所有模拟功能
module.exports.createCssModuleMock = createCssModuleMock;
module.exports.mockStyleUtils = mockStyleUtils;
module.exports.mockStyledComponents = mockStyledComponents;
module.exports.mockTailwindCSS = mockTailwindCSS;
module.exports.mockCSSAnimation = mockCSSAnimation;
module.exports.mockMediaQuery = mockMediaQuery;
module.exports.mockCSSVariables = mockCSSVariables;