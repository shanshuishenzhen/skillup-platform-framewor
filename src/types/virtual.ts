/**
 * 虚拟人才相关类型定义
 */

/**
 * 虚拟人才接口
 * 用于定义AI生成的人才信息结构
 */
export interface VirtualTalent {
  /** 人才唯一标识符 */
  id: string
  
  /** 人才姓名 */
  name: string
  
  /** 职位/职称 */
  title: string
  
  /** 工作经验描述 */
  experience: string
  
  /** 个人简介 */
  bio: string
  
  /** 技能列表 */
  skills: string[]
  
  /** 代表项目列表 */
  projects: string[]
  
  /** 头像图片URL */
  avatar: string
  
  /** 专业领域/分类 */
  category: string
  
  /** 联系方式 */
  contact: {
    email: string
    portfolio: string
  }
  
  /** 评分信息 */
  rating: {
    score: number
    reviews: number
  }
  
  /** 可用状态 */
  available: boolean
  
  /** 创建时间 */
  createdAt: Date
  
  /** 更新时间 */
  updatedAt: Date
}

/**
 * 人才筛选参数接口
 */
export interface TalentFilterParams {
  /** 分类筛选 */
  category?: string
  
  /** 技能筛选 */
  skills?: string[]
  
  /** 经验年限筛选 */
  experienceLevel?: 'junior' | 'mid' | 'senior' | 'expert'
  
  /** 可用状态筛选 */
  available?: boolean
  
  /** 评分筛选 */
  minRating?: number
  
  /** 搜索关键词 */
  search?: string
  
  /** 排序方式 */
  sortBy?: 'name' | 'rating' | 'experience' | 'createdAt'
  
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc'
  
  /** 分页参数 */
  page?: number
  limit?: number
}

/**
 * 人才查询结果接口
 */
export interface TalentQueryResult {
  /** 人才列表 */
  talents: VirtualTalent[]
  
  /** 总数量 */
  total: number
  
  /** 当前页码 */
  page: number
  
  /** 每页数量 */
  limit: number
  
  /** 总页数 */
  totalPages: number
}