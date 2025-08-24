import OSS from 'ali-oss'

/**
 * 阿里云OSS配置接口
 * @interface OSSConfig
 * @property {string} region - OSS区域
 * @property {string} accessKeyId - 访问密钥ID
 * @property {string} accessKeySecret - 访问密钥Secret
 * @property {string} bucket - 存储桶名称
 * @property {string} endpoint - OSS服务端点
 */
interface OSSConfig {
  region: string
  accessKeyId: string
  accessKeySecret: string
  bucket: string
  endpoint?: string
}

/**
 * 文件上传选项接口
 * @interface UploadOptions
 * @property {string} folder - 上传文件夹路径
 * @property {boolean} isPublic - 是否公开访问
 * @property {Record<string, string>} headers - 自定义请求头
 */
interface UploadOptions {
  folder?: string
  isPublic?: boolean
  headers?: Record<string, string>
}

/**
 * 文件上传结果接口
 * @interface UploadResult
 * @property {string} url - 文件访问URL
 * @property {string} key - 文件在OSS中的键名
 * @property {string} etag - 文件ETag
 * @property {number} size - 文件大小
 */
interface UploadResult {
  url: string
  key: string
  etag: string
  size: number
}

/**
 * 阿里云OSS客户端类
 * 提供文件上传、下载、删除等操作
 */
class AliCloudOSS {
  private client: OSS
  private config: OSSConfig

  /**
   * 构造函数
   * @param {OSSConfig} config - OSS配置
   */
  constructor(config: OSSConfig) {
    this.config = config
    this.client = new OSS({
      region: config.region,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      bucket: config.bucket,
      endpoint: config.endpoint
    })
  }

  /**
   * 上传文件
   * @param {File | Buffer} file - 要上传的文件
   * @param {string} fileName - 文件名
   * @param {UploadOptions} options - 上传选项
   * @returns {Promise<UploadResult>} 上传结果
   * @example
   * const result = await ossClient.uploadFile(file, 'image.jpg', { folder: 'images', isPublic: true })
   */
  async uploadFile(
    file: File | Buffer,
    fileName: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const { folder = '', isPublic = true } = options
      const key = folder ? `${folder}/${fileName}` : fileName
      
      // 生成唯一文件名
      const timestamp = Date.now()
      const uniqueKey = `${key.split('.')[0]}_${timestamp}.${key.split('.').pop()}`
      
      const result = await this.client.put(uniqueKey, file, {
        headers: {
          'Content-Type': this.getContentType(fileName),
          ...options.headers
        }
      })

      // 如果是公开文件，设置ACL
      if (isPublic) {
        await this.client.putACL(uniqueKey, 'public-read')
      }

      return {
        url: result.url,
        key: uniqueKey,
        etag: result.res.headers.etag,
        size: result.res.size || 0
      }
    } catch (error) {
      console.error('OSS文件上传失败:', error)
      throw new Error(`文件上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 删除文件
   * @param {string} key - 文件键名
   * @returns {Promise<boolean>} 删除是否成功
   * @example
   * const success = await ossClient.deleteFile('images/image_123456.jpg')
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      await this.client.delete(key)
      return true
    } catch (error) {
      console.error('OSS文件删除失败:', error)
      return false
    }
  }

  /**
   * 获取文件签名URL
   * @param {string} key - 文件键名
   * @param {number} expires - 过期时间（秒）
   * @returns {Promise<string>} 签名URL
   * @example
   * const signedUrl = await ossClient.getSignedUrl('private/document.pdf', 3600)
   */
  async getSignedUrl(key: string, expires: number = 3600): Promise<string> {
    try {
      return await this.client.signatureUrl(key, { expires })
    } catch (error) {
      console.error('获取签名URL失败:', error)
      throw new Error(`获取签名URL失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 检查文件是否存在
   * @param {string} key - 文件键名
   * @returns {Promise<boolean>} 文件是否存在
   * @example
   * const exists = await ossClient.fileExists('images/image.jpg')
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.client.head(key)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 文件信息类型
   */
  type FileInfo = {
    size: string
    contentType: string
    lastModified: string
    etag: string
  }

  /**
   * 获取文件信息
   * @param {string} key - 文件键名
   * @returns {Promise<FileInfo>} 文件信息
   * @example
   * const fileInfo = await ossClient.getFileInfo('images/image.jpg')
   */
  async getFileInfo(key: string): Promise<FileInfo> {
    try {
      const result = await this.client.head(key)
      return {
        size: result.res.headers['content-length'],
        contentType: result.res.headers['content-type'],
        lastModified: result.res.headers['last-modified'],
        etag: result.res.headers.etag
      }
    } catch (error) {
      console.error('获取文件信息失败:', error)
      throw new Error(`获取文件信息失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 根据文件名获取Content-Type
   * @param {string} fileName - 文件名
   * @returns {string} Content-Type
   * @private
   */
  private getContentType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'txt': 'text/plain',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg'
    }
    return mimeTypes[ext || ''] || 'application/octet-stream'
  }
}

// 从环境变量创建OSS客户端实例
const createOSSClient = (): AliCloudOSS => {
  const config: OSSConfig = {
    region: process.env.ALICLOUD_OSS_REGION || 'oss-cn-shenzhen',
    accessKeyId: process.env.ALICLOUD_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.ALICLOUD_ACCESS_KEY_SECRET || '',
    bucket: process.env.ALICLOUD_OSS_BUCKET || '',
    endpoint: process.env.ALICLOUD_OSS_ENDPOINT
  }

  if (!config.accessKeyId || !config.accessKeySecret || !config.bucket) {
    throw new Error('阿里云OSS配置不完整，请检查环境变量')
  }

  return new AliCloudOSS(config)
}

// 导出OSS客户端实例和类
export { AliCloudOSS, createOSSClient }
export type { OSSConfig, UploadOptions, UploadResult }

// 默认导出OSS客户端实例
export default createOSSClient