/**
 * 阿里云CDN加速服务配置
 * 提供CDN域名管理、缓存刷新、预热等功能
 */

import { Core } from '@alicloud/pop-core';

/**
 * CDN配置接口
 */
export interface CDNConfig {
  accessKeyId: string;
  accessKeySecret: string;
  endpoint: string;
  apiVersion: string;
}

/**
 * 域名配置接口
 */
export interface DomainConfig {
  domainName: string;
  cdnType: 'web' | 'download' | 'video';
  sources: string[];
  scope?: 'domestic' | 'overseas' | 'global';
}

/**
 * 刷新任务接口
 */
export interface RefreshTask {
  objectPath: string;
  objectType: 'File' | 'Directory';
}

/**
 * 预热任务接口
 */
export interface PreheatTask {
  objectPath: string;
}

/**
 * CDN统计数据接口
 */
export interface CDNStats {
  domainName: string;
  bandwidth: number;
  traffic: number;
  requests: number;
  hitRate: number;
  timestamp: string;
}

/**
 * 阿里云CDN客户端类
 * 提供CDN域名管理、缓存控制、统计查询等功能
 */
export class AliCloudCDN {
  private client: Core;

  /**
   * 构造函数
   * @param config CDN配置参数
   */
  constructor(config: CDNConfig) {
    this.client = new Core({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: config.endpoint,
      apiVersion: config.apiVersion
    });
  }

  /**
   * 添加CDN域名
   * @param domainConfig 域名配置
   * @returns Promise<any> 添加结果
   */
  async addDomain(domainConfig: DomainConfig): Promise<any> {
    const params = {
      DomainName: domainConfig.domainName,
      CdnType: domainConfig.cdnType,
      Sources: domainConfig.sources.join(','),
      Scope: domainConfig.scope || 'domestic'
    };

    return await this.client.request('AddCdnDomain', params, {
      method: 'POST'
    });
  }

  /**
   * 删除CDN域名
   * @param domainName 域名
   * @returns Promise<any> 删除结果
   */
  async deleteDomain(domainName: string): Promise<any> {
    const params = {
      DomainName: domainName
    };

    return await this.client.request('DeleteCdnDomain', params, {
      method: 'POST'
    });
  }

  /**
   * 启用CDN域名
   * @param domainName 域名
   * @returns Promise<any> 启用结果
   */
  async startDomain(domainName: string): Promise<any> {
    const params = {
      DomainName: domainName
    };

    return await this.client.request('StartCdnDomain', params, {
      method: 'POST'
    });
  }

  /**
   * 停用CDN域名
   * @param domainName 域名
   * @returns Promise<any> 停用结果
   */
  async stopDomain(domainName: string): Promise<any> {
    const params = {
      DomainName: domainName
    };

    return await this.client.request('StopCdnDomain', params, {
      method: 'POST'
    });
  }

  /**
   * 刷新CDN缓存
   * @param tasks 刷新任务列表
   * @returns Promise<any> 刷新结果
   */
  async refreshCache(tasks: RefreshTask[]): Promise<any> {
    const objectPaths = tasks.map(task => task.objectPath).join('\n');
    const objectType = tasks[0]?.objectType || 'File';

    const params = {
      ObjectPath: objectPaths,
      ObjectType: objectType
    };

    return await this.client.request('RefreshObjectCaches', params, {
      method: 'POST'
    });
  }

  /**
   * 预热CDN缓存
   * @param tasks 预热任务列表
   * @returns Promise<any> 预热结果
   */
  async preheatCache(tasks: PreheatTask[]): Promise<any> {
    const objectPaths = tasks.map(task => task.objectPath).join('\n');

    const params = {
      ObjectPath: objectPaths
    };

    return await this.client.request('PushObjectCache', params, {
      method: 'POST'
    });
  }

  /**
   * 获取域名列表
   * @param pageNumber 页码
   * @param pageSize 每页大小
   * @returns Promise<any> 域名列表
   */
  async getDomainList(pageNumber: number = 1, pageSize: number = 20): Promise<any> {
    const params = {
      PageNumber: pageNumber,
      PageSize: pageSize
    };

    return await this.client.request('DescribeUserDomains', params, {
      method: 'POST'
    });
  }

  /**
   * 获取域名配置信息
   * @param domainName 域名
   * @returns Promise<any> 域名配置
   */
  async getDomainConfig(domainName: string): Promise<any> {
    const params = {
      DomainName: domainName
    };

    return await this.client.request('DescribeCdnDomainDetail', params, {
      method: 'POST'
    });
  }

  /**
   * 获取CDN统计数据
   * @param domainName 域名
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns Promise<CDNStats[]> 统计数据
   */
  async getStats(domainName: string, startTime: string, endTime: string): Promise<CDNStats[]> {
    const params = {
      DomainName: domainName,
      StartTime: startTime,
      EndTime: endTime
    };

    const result = await this.client.request('DescribeDomainBpsData', params, {
      method: 'POST'
    });

    // 转换为统计数据格式
    return result.BpsDataPerInterval?.DataModule?.map((item: any) => ({
      domainName,
      bandwidth: item.Value,
      traffic: 0, // 需要单独查询
      requests: 0, // 需要单独查询
      hitRate: 0, // 需要单独查询
      timestamp: item.TimeStamp
    })) || [];
  }

  /**
   * 获取刷新任务状态
   * @param taskId 任务ID
   * @returns Promise<any> 任务状态
   */
  async getRefreshTaskStatus(taskId: string): Promise<any> {
    const params = {
      TaskId: taskId
    };

    return await this.client.request('DescribeRefreshTasks', params, {
      method: 'POST'
    });
  }

  /**
   * 获取预热任务状态
   * @param taskId 任务ID
   * @returns Promise<any> 任务状态
   */
  async getPreheatTaskStatus(taskId: string): Promise<any> {
    const params = {
      TaskId: taskId
    };

    return await this.client.request('DescribeRefreshTasks', params, {
      method: 'POST'
    });
  }
}

/**
 * 从环境变量创建CDN客户端实例
 * @returns AliCloudCDN CDN客户端实例
 */
export function createCDNClient(): AliCloudCDN {
  const config: CDNConfig = {
    accessKeyId: process.env.ALICLOUD_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.ALICLOUD_ACCESS_KEY_SECRET || '',
    endpoint: process.env.ALICLOUD_CDN_ENDPOINT || 'https://cdn.aliyuncs.com',
    apiVersion: process.env.ALICLOUD_CDN_API_VERSION || '2018-05-10'
  };

  return new AliCloudCDN(config);
}

// 导出默认CDN客户端实例
export const aliCloudCDN = createCDNClient();