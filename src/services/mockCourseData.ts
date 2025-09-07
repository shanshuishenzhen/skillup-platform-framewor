/**
 * 模拟课程数据服务
 * 为开发和测试提供模拟的课程、章节和视频数据
 */

import { Course, Chapter, Video } from './courseService';

/**
 * 模拟课程数据
 */
const mockCourses: Course[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000', // free-video-course
    title: '前端开发入门实战',
    description: '从零开始学习前端开发，掌握HTML、CSS、JavaScript基础知识，通过实际项目练习提升编程技能。',
    instructor: {
      id: 'instructor-1',
      name: '李老师',
      avatar: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20teacher%20avatar%20friendly%20smile&image_size=square',
      bio: '资深前端开发工程师，拥有8年开发经验'
    },
    duration: 120, // 总时长120分钟
    level: 'beginner',
    price: 0,
    originalPrice: 199,
    rating: 4.7,
    studentsCount: 2580,
    imageUrl: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=frontend%20development%20course%20HTML%20CSS%20JavaScript%20modern%20design&image_size=landscape_4_3',
    tags: ['前端开发', 'HTML', 'CSS', 'JavaScript'],
    isPopular: true,
    isFree: true,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-16T00:00:00Z',
    chapters: [
      {
        id: '550e8400-e29b-41d4-a716-446655440001', // chapter-1
        courseId: '550e8400-e29b-41d4-a716-446655440000', // free-video-course
        title: '前端开发基础',
        description: '了解前端开发的基本概念和开发环境搭建',
        orderIndex: 1,
        duration: 60,
        videos: [
          {
            id: '550e8400-e29b-41d4-a716-446655440010', // video-1-1
            chapterId: '550e8400-e29b-41d4-a716-446655440001', // chapter-1
            title: '前端开发概述',
            description: '什么是前端开发，前端开发的发展历程和未来趋势',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            duration: 15,
            orderIndex: 1,
            isPreview: true
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440011', // video-1-2
            chapterId: '550e8400-e29b-41d4-a716-446655440001', // chapter-1
            title: '开发环境搭建',
            description: '安装和配置前端开发所需的工具和环境',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            duration: 20,
            orderIndex: 2,
            isPreview: false
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440012', // video-1-3
            chapterId: '550e8400-e29b-41d4-a716-446655440001', // chapter-1
            title: 'HTML基础语法',
            description: '学习HTML的基本标签和文档结构',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            duration: 25,
            orderIndex: 3,
            isPreview: false
          }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002', // chapter-2
        courseId: '550e8400-e29b-41d4-a716-446655440000', // free-video-course
        title: 'CSS样式设计',
        description: '掌握CSS样式的编写和页面美化技巧',
        orderIndex: 2,
        duration: 60,
        videos: [
          {
            id: '550e8400-e29b-41d4-a716-446655440020', // video-2-1
            chapterId: '550e8400-e29b-41d4-a716-446655440002', // chapter-2
            title: 'CSS基础选择器',
            description: '学习CSS的各种选择器和基本样式属性',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            duration: 18,
            orderIndex: 1,
            isPreview: false
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440021', // video-2-2
            chapterId: '550e8400-e29b-41d4-a716-446655440002', // chapter-2
            title: '布局与定位',
            description: '掌握Flexbox和Grid布局，以及元素定位方法',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
            duration: 22,
            orderIndex: 2,
            isPreview: false
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440022', // video-2-3
            chapterId: '550e8400-e29b-41d4-a716-446655440002', // chapter-2
            title: '响应式设计',
            description: '学习媒体查询和响应式布局的实现方法',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
            duration: 20,
            orderIndex: 3,
            isPreview: false
          }
        ]
      }
    ]
  }
];

/**
 * 获取模拟课程数据
 * @param courseId 课程ID
 * @returns 课程数据或null
 */
export function getMockCourse(courseId: string): Course | null {
  return mockCourses.find(course => course.id === courseId) || null;
}

/**
 * 获取模拟课程的章节数据
 * @param courseId 课程ID
 * @returns 章节数组
 */
export function getMockChapters(courseId: string): Chapter[] {
  const course = getMockCourse(courseId);
  return course?.chapters || [];
}

/**
 * 获取模拟视频数据
 * @param videoId 视频ID
 * @returns 视频数据或null
 */
export function getMockVideo(videoId: string): Video | null {
  for (const course of mockCourses) {
    for (const chapter of course.chapters || []) {
      const video = chapter.videos?.find(v => v.id === videoId);
      if (video) {
        return video;
      }
    }
  }
  return null;
}

/**
 * 获取课程的所有视频
 * @param courseId 课程ID
 * @returns 视频数组
 */
export function getMockCourseVideos(courseId: string): Video[] {
  const chapters = getMockChapters(courseId);
  const videos: Video[] = [];
  
  chapters.forEach(chapter => {
    if (chapter.videos) {
      videos.push(...chapter.videos);
    }
  });
  
  return videos.sort((a, b) => {
    // 先按章节排序，再按视频顺序排序
    const chapterA = chapters.find(c => c.id === a.chapterId);
    const chapterB = chapters.find(c => c.id === b.chapterId);
    
    if (chapterA && chapterB && chapterA.orderIndex !== chapterB.orderIndex) {
      return chapterA.orderIndex - chapterB.orderIndex;
    }
    
    return a.orderIndex - b.orderIndex;
  });
}

/**
 * 检查是否为模拟数据课程
 * @param courseId 课程ID
 * @returns 是否为模拟数据
 */
export function isMockCourse(courseId: string): boolean {
  return mockCourses.some(course => course.id === courseId);
}

export default {
  getMockCourse,
  getMockChapters,
  getMockVideo,
  getMockCourseVideos,
  isMockCourse
};