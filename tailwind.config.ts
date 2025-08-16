import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#165DFF", // 深蓝色
        secondary: "#36D399", // 荧光蓝 (强调色)
        "light-gray": "#F5F7FA", // 浅灰 (背景)
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        'lg': '10px', // 对应卡片式设计
      },
      boxShadow: {
        'DEFAULT': '0 4px 12px 0 rgba(0, 0, 0, 0.05)', // 对应轻微阴影
      },
      transitionDuration: {
        'DEFAULT': '300ms', // 对应页面切换动效
      },
      scale: {
        '103': '1.03', // 对应按钮悬停缩放
      },
    },
  },
  plugins: [],
};
export default config;
