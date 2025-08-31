declare module 'ali-oss' {
  interface OSSConfig {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    endpoint?: string;
    secure?: boolean;
    timeout?: number;
  }

  interface PutObjectOptions {
    headers?: Record<string, string>;
    meta?: Record<string, string>;
    mime?: string;
    callback?: {
      url: string;
      body: string;
    };
  }

  interface PutObjectResult {
    name: string;
    url: string;
    res: {
      status: number;
      headers: Record<string, string>;
    };
  }

  interface DeleteObjectResult {
    res: {
      status: number;
      headers: Record<string, string>;
    };
  }

  interface ListObjectsOptions {
    prefix?: string;
    marker?: string;
    delimiter?: string;
    'max-keys'?: number;
  }

  interface ListObjectsResult {
    objects: Array<{
      name: string;
      url: string;
      lastModified: string;
      etag: string;
      type: string;
      size: number;
    }>;
    prefixes: string[];
    isTruncated: boolean;
    nextMarker?: string;
  }

  declare class OSS {
    constructor(config: OSSConfig);
    
    put(name: string, file: Buffer | string | File, options?: PutObjectOptions): Promise<PutObjectResult>;
    delete(name: string): Promise<DeleteObjectResult>;
    list(query?: ListObjectsOptions): Promise<ListObjectsResult>;
    signatureUrl(name: string, options?: { expires?: number }): string;
    head(name: string): Promise<{ meta: Record<string, string>; res: { status: number; headers: Record<string, string> } }>;
    get(name: string): Promise<{ content: Buffer; res: { status: number; headers: Record<string, string> } }>;
    putACL(name: string, acl: string): Promise<{ res: { status: number; headers: Record<string, string> } }>;
  }

  export default OSS;
}