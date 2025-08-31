/**
 * 短信服务提供商实现
 * 支持阿里云、腾讯云、华为云等主流短信服务
 */

// 短信发送结果接口
export interface SmsResult {
  success: boolean;
  message: string;
  messageId?: string;
  error?: any;
}

// 短信服务提供商接口
export interface SmsProvider {
  sendSms(phone: string, code: string, purpose: string): Promise<SmsResult>;
  validateConfig(): boolean;
}

/**
 * 模拟短信服务提供商（开发环境使用）
 */
export class MockSmsProvider implements SmsProvider {
  async sendSms(phone: string, code: string, purpose: string): Promise<SmsResult> {
    const delay = parseInt(process.env.SMS_MOCK_DELAY_MS || '1000');
    const alwaysSuccess = process.env.SMS_MOCK_ALWAYS_SUCCESS === 'true';
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // 在控制台输出验证码（方便开发测试）
    console.log(`📱 [模拟短信] 发送到 ${phone}`);
    console.log(`🔑 验证码: ${code}`);
    console.log(`📋 用途: ${purpose}`);
    console.log(`⏰ 时间: ${new Date().toLocaleString()}`);
    
    if (alwaysSuccess) {
      return {
        success: true,
        message: '短信发送成功（模拟）',
        messageId: `mock_${Date.now()}`
      };
    }
    
    // 模拟99%的成功率
    const success = Math.random() > 0.01;
    return {
      success,
      message: success ? '短信发送成功（模拟）' : '短信发送失败（模拟）',
      messageId: success ? `mock_${Date.now()}` : undefined
    };
  }
  
  validateConfig(): boolean {
    return true; // 模拟服务不需要配置验证
  }
}

/**
 * 阿里云短信服务提供商
 */
export class AliyunSmsProvider implements SmsProvider {
  private accessKeyId: string;
  private accessKeySecret: string;
  private signName: string;
  private templateCode: string;
  
  constructor() {
    this.accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID || '';
    this.accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET || '';
    this.signName = process.env.ALIYUN_SMS_SIGN_NAME || '';
    this.templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE || '';
  }
  
  async sendSms(phone: string, code: string, purpose: string): Promise<SmsResult> {
    try {
      // 这里应该调用阿里云短信SDK
      // 示例代码（需要安装 @alicloud/sms20170525 包）
      /*
      const Sms20170525 = require('@alicloud/sms20170525');
      const OpenApi = require('@alicloud/openapi-client');
      
      const config = new OpenApi.Config({
        accessKeyId: this.accessKeyId,
        accessKeySecret: this.accessKeySecret,
        endpoint: 'dysmsapi.aliyuncs.com'
      });
      
      const client = new Sms20170525.default(config);
      const sendSmsRequest = new Sms20170525.SendSmsRequest({
        phoneNumbers: phone,
        signName: this.signName,
        templateCode: this.templateCode,
        templateParam: JSON.stringify({ code })
      });
      
      const response = await client.sendSms(sendSmsRequest);
      
      if (response.body.code === 'OK') {
        return {
          success: true,
          message: '短信发送成功',
          messageId: response.body.bizId
        };
      } else {
        return {
          success: false,
          message: response.body.message || '短信发送失败',
          error: response.body
        };
      }
      */
      
      // 临时返回未实现错误
      return {
        success: false,
        message: '阿里云短信服务未配置，请联系管理员'
      };
      
    } catch (error) {
      return {
        success: false,
        message: '阿里云短信发送异常',
        error
      };
    }
  }
  
  validateConfig(): boolean {
    return !!(this.accessKeyId && this.accessKeySecret && this.signName && this.templateCode);
  }
}

/**
 * 腾讯云短信服务提供商
 */
export class TencentSmsProvider implements SmsProvider {
  private secretId: string;
  private secretKey: string;
  private appId: string;
  private sign: string;
  private templateId: string;
  
  constructor() {
    this.secretId = process.env.TENCENT_SECRET_ID || '';
    this.secretKey = process.env.TENCENT_SECRET_KEY || '';
    this.appId = process.env.TENCENT_SMS_APP_ID || '';
    this.sign = process.env.TENCENT_SMS_SIGN || '';
    this.templateId = process.env.TENCENT_SMS_TEMPLATE_ID || '';
  }
  
  async sendSms(phone: string, code: string, purpose: string): Promise<SmsResult> {
    try {
      // 这里应该调用腾讯云短信SDK
      // 示例代码（需要安装 tencentcloud-sdk-nodejs 包）
      /*
      const tencentcloud = require('tencentcloud-sdk-nodejs');
      const SmsClient = tencentcloud.sms.v20210111.Client;
      
      const clientConfig = {
        credential: {
          secretId: this.secretId,
          secretKey: this.secretKey,
        },
        region: 'ap-beijing',
        profile: {
          httpProfile: {
            endpoint: 'sms.tencentcloudapi.com',
          },
        },
      };
      
      const client = new SmsClient(clientConfig);
      const params = {
        PhoneNumberSet: [`+86${phone}`],
        SmsSdkAppId: this.appId,
        SignName: this.sign,
        TemplateId: this.templateId,
        TemplateParamSet: [code],
      };
      
      const response = await client.SendSms(params);
      
      if (response.SendStatusSet[0].Code === 'Ok') {
        return {
          success: true,
          message: '短信发送成功',
          messageId: response.SendStatusSet[0].SerialNo
        };
      } else {
        return {
          success: false,
          message: response.SendStatusSet[0].Message || '短信发送失败',
          error: response.SendStatusSet[0]
        };
      }
      */
      
      // 临时返回未实现错误
      return {
        success: false,
        message: '腾讯云短信服务未配置，请联系管理员'
      };
      
    } catch (error) {
      return {
        success: false,
        message: '腾讯云短信发送异常',
        error
      };
    }
  }
  
  validateConfig(): boolean {
    return !!(this.secretId && this.secretKey && this.appId && this.sign && this.templateId);
  }
}

/**
 * 华为云短信服务提供商
 */
export class HuaweiSmsProvider implements SmsProvider {
  private appKey: string;
  private appSecret: string;
  private channel: string;
  private signature: string;
  private templateId: string;
  
  constructor() {
    this.appKey = process.env.HUAWEI_APP_KEY || '';
    this.appSecret = process.env.HUAWEI_APP_SECRET || '';
    this.channel = process.env.HUAWEI_SMS_CHANNEL || '';
    this.signature = process.env.HUAWEI_SMS_SIGNATURE || '';
    this.templateId = process.env.HUAWEI_SMS_TEMPLATE_ID || '';
  }
  
  async sendSms(phone: string, code: string, purpose: string): Promise<SmsResult> {
    try {
      // 这里应该调用华为云短信API
      // 华为云短信通常使用HTTP API调用
      
      // 临时返回未实现错误
      return {
        success: false,
        message: '华为云短信服务未配置，请联系管理员'
      };
      
    } catch (error) {
      return {
        success: false,
        message: '华为云短信发送异常',
        error
      };
    }
  }
  
  validateConfig(): boolean {
    return !!(this.appKey && this.appSecret && this.channel && this.signature && this.templateId);
  }
}

/**
 * 短信服务工厂
 */
export class SmsProviderFactory {
  static createProvider(): SmsProvider {
    const provider = process.env.SMS_PROVIDER || 'mock';
    
    switch (provider.toLowerCase()) {
      case 'aliyun':
        return new AliyunSmsProvider();
      case 'tencent':
        return new TencentSmsProvider();
      case 'huawei':
        return new HuaweiSmsProvider();
      case 'mock':
      default:
        return new MockSmsProvider();
    }
  }
  
  static validateProviderConfig(provider: string): boolean {
    const smsProvider = SmsProviderFactory.createProvider();
    return smsProvider.validateConfig();
  }
}
