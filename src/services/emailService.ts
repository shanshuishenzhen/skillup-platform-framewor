/**
 * 邮件服务模块
 * 提供邮件发送功能，支持HTML邮件、附件、模板等
 */

import { createError, AppError, ErrorType, ErrorSeverity, withRetry } from '@/utils/errorHandler';

/**
 * 邮件配置接口
 */
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  replyTo?: string;
}

/**
 * 邮件附件接口
 */
export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
  cid?: string; // 用于内嵌图片
}

/**
 * 邮件选项接口
 */
export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  priority?: 'high' | 'normal' | 'low';
  headers?: Record<string, string>;
  replyTo?: string;
}

/**
 * 邮件发送结果接口
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  recipients?: string[];
  rejectedRecipients?: string[];
}

/**
 * 邮件模板接口
 */
export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text?: string;
  variables?: string[];
}

/**
 * 邮件服务类
 */
export class EmailService {
  private config: EmailConfig;
  private templates: Map<string, EmailTemplate> = new Map();
  private isInitialized = false;

  constructor(config?: Partial<EmailConfig>) {
    // 直接从环境变量获取邮件配置
    const emailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_SECURE === 'true',
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
      from: process.env.EMAIL_FROM || '',
      replyTo: process.env.EMAIL_REPLY_TO
    };
    
    this.config = {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass
      },
      from: emailConfig.from,
      replyTo: emailConfig.replyTo,
      ...config
    };
    
    this.initializeTemplates();
  }

  /**
   * 初始化邮件服务
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // 验证配置
      this.validateConfig();
      
      this.isInitialized = true;
      console.log('邮件服务已初始化');
    } catch (error) {
      console.error('邮件服务初始化失败:', error);
      throw createError(
        ErrorType.INTERNAL_ERROR,
        '邮件服务初始化失败',
        { originalError: error instanceof Error ? error : new Error(String(error)) }
      );
    }
  }

  /**
   * 发送邮件
   * @param options - 邮件选项
   * @returns 发送结果
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    return withRetry(
      async () => {
        try {
          // 验证邮件选项
          this.validateEmailOptions(options);
          
          // 模拟邮件发送（实际项目中应该使用真实的邮件服务）
          const result = await this.simulateEmailSending(options);
          
          return {
            success: true,
            messageId: result.messageId,
            recipients: Array.isArray(options.to) ? options.to : [options.to]
          };
          
        } catch (error) {
          console.error('发送邮件失败:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : '邮件发送失败'
          };
        }
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        retryableErrors: [ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR]
      }
    );
  }

  /**
   * 使用模板发送邮件
   * @param templateName - 模板名称
   * @param to - 收件人
   * @param variables - 模板变量
   * @param options - 额外选项
   * @returns 发送结果
   */
  async sendTemplateEmail(
    templateName: string,
    to: string | string[],
    variables: Record<string, string> = {},
    options?: Partial<EmailOptions>
  ): Promise<EmailResult> {
    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw createError(
          ErrorType.VALIDATION_ERROR,
          `邮件模板不存在: ${templateName}`
        );
      }
      
      // 替换模板变量
      const subject = this.replaceVariables(template.subject, variables);
      const html = this.replaceVariables(template.html, variables);
      const text = template.text ? this.replaceVariables(template.text, variables) : undefined;
      
      return this.sendEmail({
        to,
        subject,
        html,
        text,
        ...options
      });
      
    } catch (error) {
      console.error('发送模板邮件失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '模板邮件发送失败'
      };
    }
  }

  /**
   * 发送验证邮件
   * @param to - 收件人
   * @param verificationCode - 验证码
   * @param userName - 用户名
   * @returns 发送结果
   */
  async sendVerificationEmail(
    to: string,
    verificationCode: string,
    userName?: string
  ): Promise<EmailResult> {
    return this.sendTemplateEmail(
      'verification',
      to,
      {
        userName: userName || '用户',
        verificationCode,
        validMinutes: '30'
      }
    );
  }

  /**
   * 发送密码重置邮件
   * @param to - 收件人
   * @param resetToken - 重置令牌
   * @param userName - 用户名
   * @returns 发送结果
   */
  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    userName?: string
  ): Promise<EmailResult> {
    return this.sendTemplateEmail(
      'password-reset',
      to,
      {
        userName: userName || '用户',
        resetToken,
        resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`,
        validHours: '24'
      }
    );
  }

  /**
   * 发送欢迎邮件
   * @param to - 收件人
   * @param userName - 用户名
   * @returns 发送结果
   */
  async sendWelcomeEmail(
    to: string,
    userName: string
  ): Promise<EmailResult> {
    return this.sendTemplateEmail(
      'welcome',
      to,
      {
        userName,
        appName: 'SkillUp Platform',
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`
      }
    );
  }

  /**
   * 发送课程通知邮件
   * @param to - 收件人
   * @param courseName - 课程名称
   * @param userName - 用户名
   * @param notificationType - 通知类型
   * @returns 发送结果
   */
  async sendCourseNotificationEmail(
    to: string,
    courseName: string,
    userName: string,
    notificationType: 'enrollment' | 'completion' | 'reminder'
  ): Promise<EmailResult> {
    const templateMap = {
      enrollment: 'course-enrollment',
      completion: 'course-completion',
      reminder: 'course-reminder'
    };
    
    return this.sendTemplateEmail(
      templateMap[notificationType],
      to,
      {
        userName,
        courseName,
        courseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/courses`
      }
    );
  }

  /**
   * 批量发送邮件
   * @param emails - 邮件列表
   * @returns 发送结果列表
   */
  async sendBulkEmails(emails: EmailOptions[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    
    for (const email of emails) {
      try {
        const result = await this.sendEmail(email);
        results.push(result);
        
        // 添加延迟以避免发送过快
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : '批量邮件发送失败'
        });
      }
    }
    
    return results;
  }

  /**
   * 验证邮件地址格式
   * @param email - 邮件地址
   * @returns 是否有效
   */
  validateEmailAddress(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 添加邮件模板
   * @param template - 邮件模板
   */
  addTemplate(template: EmailTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * 获取邮件模板
   * @param name - 模板名称
   * @returns 邮件模板
   */
  getTemplate(name: string): EmailTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * 获取所有模板名称
   * @returns 模板名称列表
   */
  getTemplateNames(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * 检查服务是否可用
   * @returns 服务可用性
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      // 模拟连接检查
      return this.config.auth.user !== '' && this.config.auth.pass !== '';
    } catch (error) {
      console.error('检查邮件服务可用性失败:', error);
      return false;
    }
  }

  /**
   * 获取配置
   * @returns 当前配置（隐藏敏感信息）
   */
  getConfig(): Partial<EmailConfig> {
    return {
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      from: this.config.from,
      replyTo: this.config.replyTo
    };
  }

  /**
   * 验证配置
   * @private
   */
  private validateConfig(): void {
    if (!this.config.host) {
      throw createError(ErrorType.VALIDATION_ERROR, '邮件服务器地址未配置');
    }
    
    if (!this.config.auth.user || !this.config.auth.pass) {
      throw createError(ErrorType.VALIDATION_ERROR, '邮件服务器认证信息未配置');
    }
    
    if (!this.config.from) {
      throw createError(ErrorType.VALIDATION_ERROR, '发件人地址未配置');
    }
  }

  /**
   * 验证邮件选项
   * @private
   * @param options - 邮件选项
   */
  private validateEmailOptions(options: EmailOptions): void {
    if (!options.to) {
      throw createError(ErrorType.VALIDATION_ERROR, '收件人地址不能为空');
    }
    
    if (!options.subject) {
      throw createError(ErrorType.VALIDATION_ERROR, '邮件主题不能为空');
    }
    
    if (!options.text && !options.html) {
      throw createError(ErrorType.VALIDATION_ERROR, '邮件内容不能为空');
    }
    
    // 验证邮件地址格式
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    for (const recipient of recipients) {
      if (!this.validateEmailAddress(recipient)) {
        throw createError(ErrorType.VALIDATION_ERROR, `无效的邮件地址: ${recipient}`);
      }
    }
  }

  /**
   * 替换模板变量
   * @private
   * @param template - 模板字符串
   * @param variables - 变量对象
   * @returns 替换后的字符串
   */
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, value);
    }
    
    return result;
  }

  /**
   * 模拟邮件发送
   * @private
   * @param options - 邮件选项
   * @returns 发送结果
   */
  private async simulateEmailSending(options: EmailOptions): Promise<{ messageId: string }> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // 模拟偶发失败
    if (Math.random() < 0.05) { // 5% 失败率
      throw createError(ErrorType.NETWORK_ERROR, '邮件发送网络错误');
    }
    
    return {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  /**
   * 初始化邮件模板
   * @private
   */
  private initializeTemplates(): void {
    // 验证邮件模板
    this.addTemplate({
      name: 'verification',
      subject: 'SkillUp Platform - 邮箱验证',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>邮箱验证</h2>
          <p>亲爱的 {{ userName }}，</p>
          <p>感谢您注册 SkillUp Platform！请使用以下验证码完成邮箱验证：</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 5px;">{{ verificationCode }}</h1>
          </div>
          <p>此验证码将在 {{ validMinutes }} 分钟后过期。</p>
          <p>如果您没有注册账户，请忽略此邮件。</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
        </div>
      `,
      text: '您的验证码是：{{ verificationCode }}，有效期 {{ validMinutes }} 分钟。',
      variables: ['userName', 'verificationCode', 'validMinutes']
    });

    // 密码重置模板
    this.addTemplate({
      name: 'password-reset',
      subject: 'SkillUp Platform - 密码重置',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>密码重置</h2>
          <p>亲爱的 {{ userName }}，</p>
          <p>我们收到了您的密码重置请求。请点击下面的链接重置您的密码：</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{ resetUrl }}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">重置密码</a>
          </div>
          <p>或者复制以下链接到浏览器地址栏：</p>
          <p style="word-break: break-all; color: #007bff;">{{ resetUrl }}</p>
          <p>此链接将在 {{ validHours }} 小时后过期。</p>
          <p>如果您没有请求重置密码，请忽略此邮件。</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
        </div>
      `,
      text: '请访问以下链接重置密码：{{ resetUrl }}，有效期 {{ validHours }} 小时。',
      variables: ['userName', 'resetToken', 'resetUrl', 'validHours']
    });

    // 欢迎邮件模板
    this.addTemplate({
      name: 'welcome',
      subject: '欢迎加入 SkillUp Platform！',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>欢迎加入 {{ appName }}！</h2>
          <p>亲爱的 {{ userName }}，</p>
          <p>欢迎您加入 SkillUp Platform！我们很高兴您选择我们的学习平台来提升您的技能。</p>
          <p>在这里，您可以：</p>
          <ul>
            <li>浏览丰富的课程内容</li>
            <li>跟踪学习进度</li>
            <li>获得学习证书</li>
            <li>与其他学习者交流</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{ loginUrl }}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">开始学习</a>
          </div>
          <p>祝您学习愉快！</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
        </div>
      `,
      text: '欢迎加入 {{ appName }}！请访问 {{ loginUrl }} 开始您的学习之旅。',
      variables: ['userName', 'appName', 'loginUrl']
    });

    // 课程注册模板
    this.addTemplate({
      name: 'course-enrollment',
      subject: '课程注册成功 - {{ courseName }}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>课程注册成功</h2>
          <p>亲爱的 {{ userName }}，</p>
          <p>恭喜您成功注册了课程：<strong>{{ courseName }}</strong></p>
          <p>您现在可以开始学习这门课程了。请访问课程页面查看详细内容和学习计划。</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{ courseUrl }}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">开始学习</a>
          </div>
          <p>祝您学习顺利！</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
        </div>
      `,
      text: '您已成功注册课程：{{ courseName }}。请访问 {{ courseUrl }} 开始学习。',
      variables: ['userName', 'courseName', 'courseUrl']
    });

    // 课程完成模板
    this.addTemplate({
      name: 'course-completion',
      subject: '恭喜完成课程 - {{ courseName }}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>🎉 恭喜您完成课程！</h2>
          <p>亲爱的 {{ userName }}，</p>
          <p>恭喜您成功完成了课程：<strong>{{ courseName }}</strong></p>
          <p>您的努力和坚持值得赞扬！继续保持这种学习热情，探索更多精彩的课程内容。</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{ courseUrl }}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">查看更多课程</a>
          </div>
          <p>期待您的下一次学习之旅！</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
        </div>
      `,
      text: '恭喜您完成课程：{{ courseName }}！请访问 {{ courseUrl }} 查看更多课程。',
      variables: ['userName', 'courseName', 'courseUrl']
    });

    // 课程提醒模板
    this.addTemplate({
      name: 'course-reminder',
      subject: '学习提醒 - {{ courseName }}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>学习提醒</h2>
          <p>亲爱的 {{ userName }}，</p>
          <p>您已经有一段时间没有学习课程：<strong>{{ courseName }}</strong> 了。</p>
          <p>坚持学习是成功的关键！让我们继续您的学习之旅吧。</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{ courseUrl }}" style="background-color: #ffc107; color: #212529; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">继续学习</a>
          </div>
          <p>每天进步一点点，成就更好的自己！</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
        </div>
      `,
      text: '学习提醒：请继续学习课程 {{ courseName }}。访问 {{ courseUrl }} 继续您的学习。',
      variables: ['userName', 'courseName', 'courseUrl']
    });
  }
}

// 创建默认实例
const emailService = new EmailService();

/**
 * 发送邮件（便捷函数）
 * @param options - 邮件选项
 * @returns 发送结果
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  return emailService.sendEmail(options);
}

/**
 * 发送验证邮件（便捷函数）
 * @param to - 收件人
 * @param verificationCode - 验证码
 * @param userName - 用户名
 * @returns 发送结果
 */
export async function sendVerificationEmail(
  to: string,
  verificationCode: string,
  userName?: string
): Promise<EmailResult> {
  return emailService.sendVerificationEmail(to, verificationCode, userName);
}

/**
 * 发送密码重置邮件（便捷函数）
 * @param to - 收件人
 * @param resetToken - 重置令牌
 * @param userName - 用户名
 * @returns 发送结果
 */
export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
  userName?: string
): Promise<EmailResult> {
  return emailService.sendPasswordResetEmail(to, resetToken, userName);
}

/**
 * 发送欢迎邮件（便捷函数）
 * @param to - 收件人
 * @param userName - 用户名
 * @returns 发送结果
 */
export async function sendWelcomeEmail(
  to: string,
  userName: string
): Promise<EmailResult> {
  return emailService.sendWelcomeEmail(to, userName);
}

/**
 * 初始化邮件服务（便捷函数）
 */
export async function initializeEmailService(): Promise<void> {
  return emailService.initialize();
}

// 默认导出
export default emailService;