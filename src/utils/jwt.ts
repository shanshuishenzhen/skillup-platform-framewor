/**
 * JWT Token 工具函数
 * 提供JWT token的解析、验证和过期检查功能
 */

/**
 * JWT Token载荷接口
 */
export interface JWTPayload {
  /** 用户ID */
  userId: string;
  /** 用户手机号 */
  phone: string;
  /** 用户邮箱 */
  email?: string;
  /** 用户角色 */
  role: string;
  /** 用户权限 */
  permissions?: string[];
  /** 用户类型 */
  type?: string;
  /** 签发时间 (Unix时间戳) */
  iat?: number;
  /** 过期时间 (Unix时间戳) */
  exp?: number;
}

/**
 * 解析JWT token（增强调试版本）
 * @param token - JWT token字符串
 * @returns 解析后的payload对象，解析失败返回null
 * @example
 * const payload = parseJWTToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
 * if (payload) {
 *   console.log('用户ID:', payload.userId);
 * }
 */
export function parseJWTToken(token: string): JWTPayload | null {
  console.log('🔍 parseJWTToken函数开始执行');
  console.log('📊 输入参数分析:', {
    tokenProvided: !!token,
    tokenType: typeof token,
    tokenLength: token?.length || 0,
    tokenPreview: token ? `${token.substring(0, 30)}...` : 'null'
  });
  
  try {
    // 步骤1: 基础验证
    console.log('🔍 步骤1: 进行基础验证...');
    if (!token || typeof token !== 'string') {
      console.log('❌ 基础验证失败:', {
        tokenExists: !!token,
        tokenType: typeof token,
        isString: typeof token === 'string'
      });
      return null;
    }
    console.log('✅ 基础验证通过');

    // 步骤2: 清理token格式
    console.log('🔍 步骤2: 清理token格式...');
    const originalToken = token;
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    console.log('📊 Token清理结果:', {
      originalLength: originalToken.length,
      cleanedLength: cleanToken.length,
      hadBearerPrefix: originalToken !== cleanToken,
      cleanedPreview: `${cleanToken.substring(0, 30)}...`
    });
    
    // 步骤3: 分割token
    console.log('🔍 步骤3: 分割JWT token...');
    const parts = cleanToken.split('.');
    console.log('📊 Token分割结果:', {
      totalParts: parts.length,
      expectedParts: 3,
      isValidStructure: parts.length === 3,
      partLengths: parts.map(part => part.length),
      headerPreview: parts[0] ? `${parts[0].substring(0, 20)}...` : 'missing',
      payloadPreview: parts[1] ? `${parts[1].substring(0, 20)}...` : 'missing',
      signaturePreview: parts[2] ? `${parts[2].substring(0, 20)}...` : 'missing'
    });
    
    if (parts.length !== 3) {
      console.warn('❌ JWT token格式无效 - 应该有3个部分，实际有', parts.length);
      console.log('📊 分割详情:', {
        tokenContent: cleanToken,
        parts: parts,
        separatorCount: (cleanToken.match(/\./g) || []).length
      });
      return null;
    }
    console.log('✅ Token结构验证通过');

    // 步骤4: 提取payload
    console.log('🔍 步骤4: 提取payload部分...');
    const payloadPart = parts[1];
    console.log('📊 Payload部分信息:', {
      payloadLength: payloadPart.length,
      payloadContent: payloadPart,
      containsSpecialChars: {
        hasDash: payloadPart.includes('-'),
        hasUnderscore: payloadPart.includes('_'),
        hasPlus: payloadPart.includes('+'),
        hasSlash: payloadPart.includes('/')
      }
    });
    
    // 步骤5: Base64URL解码
    console.log('🔍 步骤5: 进行Base64URL解码...');
    const base64Payload = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    console.log('📊 Base64转换:', {
      originalPayload: payloadPart,
      base64Payload: base64Payload,
      replacements: {
        dashesToPlus: (payloadPart.match(/-/g) || []).length,
        underscoresToSlash: (payloadPart.match(/_/g) || []).length
      }
    });
    
    let decodedPayload: string;
    try {
      decodedPayload = atob(base64Payload);
      console.log('✅ Base64解码成功');
      console.log('📊 解码结果:', {
        decodedLength: decodedPayload.length,
        decodedPreview: decodedPayload.substring(0, 100),
        looksLikeJSON: decodedPayload.trim().startsWith('{') && decodedPayload.trim().endsWith('}')
      });
    } catch (decodeError) {
      console.error('❌ Base64解码失败:', decodeError);
      console.log('📊 解码错误详情:', {
        base64Input: base64Payload,
        errorMessage: decodeError instanceof Error ? decodeError.message : String(decodeError)
      });
      return null;
    }
    
    // 步骤6: JSON解析
    console.log('🔍 步骤6: 解析JSON...');
    let parsedPayload: JWTPayload;
    try {
      parsedPayload = JSON.parse(decodedPayload);
      console.log('✅ JSON解析成功');
      console.log('📊 解析后的payload:', {
        payloadType: typeof parsedPayload,
        isObject: typeof parsedPayload === 'object' && parsedPayload !== null,
        keys: Object.keys(parsedPayload || {}),
        payloadContent: parsedPayload
      });
    } catch (parseError) {
      console.error('❌ JSON解析失败:', parseError);
      console.log('📊 JSON解析错误详情:', {
        jsonInput: decodedPayload,
        errorMessage: parseError instanceof Error ? parseError.message : String(parseError)
      });
      return null;
    }
    
    console.log('✅ parseJWTToken函数执行成功，返回payload');
    return parsedPayload;
    
  } catch (error) {
    console.error('❌ parseJWTToken函数执行异常:', error);
    console.log('📊 异常详情:', {
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : null,
      inputToken: token ? `${token.substring(0, 30)}...` : 'null'
    });
    return null;
  }
}

/**
 * 检查JWT token是否过期
 * @param token - JWT token字符串
 * @param bufferSeconds - 提前多少秒认为token过期（默认60秒）
 * @returns true表示已过期，false表示未过期
 * @example
 * const isExpired = isJWTTokenExpired(token, 120); // 提前2分钟认为过期
 * if (isExpired) {
 *   console.log('Token已过期，需要重新登录');
 * }
 */
export function isJWTTokenExpired(token: string, bufferSeconds: number = 60): boolean {
  try {
    const payload = parseJWTToken(token);
    if (!payload || !payload.exp) {
      // 无法解析或没有过期时间，认为已过期
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000); // 当前时间（秒）
    const expirationTime = payload.exp - bufferSeconds; // 考虑缓冲时间
    
    return currentTime >= expirationTime;
  } catch (error) {
    console.error('检查JWT token过期状态失败:', error);
    return true; // 出错时认为已过期
  }
}

/**
 * 获取JWT token的剩余有效时间（秒）
 * @param token - JWT token字符串
 * @returns 剩余秒数，如果token无效或已过期返回0
 * @example
 * const remainingTime = getJWTTokenRemainingTime(token);
 * console.log(`Token还有${remainingTime}秒过期`);
 */
export function getJWTTokenRemainingTime(token: string): number {
  try {
    const payload = parseJWTToken(token);
    if (!payload || !payload.exp) {
      return 0;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTime = payload.exp - currentTime;
    
    return Math.max(0, remainingTime);
  } catch (error) {
    console.error('获取JWT token剩余时间失败:', error);
    return 0;
  }
}

/**
 * 验证JWT token是否有效（格式正确且未过期）
 * @param token - JWT token字符串
 * @param bufferSeconds - 提前多少秒认为token过期（默认60秒）
 * @returns true表示有效，false表示无效
 * @example
 * const isValid = isJWTTokenValid(token);
 * if (!isValid) {
 *   // 重新登录或刷新token
 * }
 */
export function isJWTTokenValid(token: string, bufferSeconds: number = 60): boolean {
  if (!token) {
    return false;
  }
  
  const payload = parseJWTToken(token);
  if (!payload) {
    return false;
  }
  
  return !isJWTTokenExpired(token, bufferSeconds);
}

/**
 * 检查JWT token是否具有管理员权限（增强调试版本）
 * @param token - JWT token字符串
 * @returns true表示具有管理员权限，false表示没有
 * @example
 * const hasAdminAccess = hasAdminPermission(token);
 * if (hasAdminAccess) {
 *   // 允许访问管理员功能
 * }
 */
export function hasAdminPermission(token: string): boolean {
  console.log('🔍 hasAdminPermission函数开始执行');
  console.log('📊 函数输入参数:', {
    tokenProvided: !!token,
    tokenType: typeof token,
    tokenLength: token?.length || 0,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'null'
  });
  
  try {
    // 步骤1: 检查token是否存在
    if (!token) {
      console.log('❌ hasAdminPermission: Token不存在');
      console.log('📊 返回结果: false (原因: token为空)');
      return false;
    }
    
    // 步骤2: 解析token
    console.log('🔍 hasAdminPermission: 开始解析token...');
    const payload = parseJWTToken(token);
    console.log('📊 Token解析结果:', {
      payloadExists: !!payload,
      payloadType: typeof payload,
      payloadContent: payload
    });
    
    if (!payload) {
      console.log('❌ hasAdminPermission: Token解析失败');
      console.log('📊 返回结果: false (原因: token解析失败)');
      return false;
    }

    // 步骤3: 检查role字段
    console.log('🔍 hasAdminPermission: 检查用户角色...');
    console.log('📊 角色字段分析:', {
      roleExists: 'role' in payload,
      roleValue: payload.role,
      roleType: typeof payload.role,
      roleIsString: typeof payload.role === 'string',
      roleLength: payload.role?.length || 0
    });
    
    // 步骤4: 角色转换和比较（支持RBAC枚举和小写格式）
    const originalRole = payload.role;
    const role = payload.role?.toLowerCase();
    
    console.log('🔄 角色转换过程:', {
      originalRole,
      convertedRole: role,
      originalType: typeof originalRole,
      convertedType: typeof role
    });
    
    // 步骤5: 权限判断（支持多种角色格式：RBAC枚举和小写格式）
    const isAdmin = role === 'admin' || originalRole === 'ADMIN';
    const isSuperAdmin = role === 'super_admin' || originalRole === 'SUPER_ADMIN';
    const isAdminRole = isAdmin || isSuperAdmin;
    
    console.log('🎯 权限判断结果:', {
      role,
      originalRole,
      isAdmin,
      isSuperAdmin,
      isAdminRole,
      matchesAdmin: role === 'admin',
      matchesSuperAdmin: role === 'super_admin',
      matchesRBACAdmin: originalRole === 'ADMIN',
      matchesRBACSuperAdmin: originalRole === 'SUPER_ADMIN',
      finalResult: isAdminRole
    });
    
    const hasPermission = isAdminRole;
    
    console.log('📊 权限检查详细过程:', {
      originalRole: originalRole,
      processedRole: role,
      isAdmin: isAdmin,
      isSuperAdmin: isSuperAdmin,
      hasPermission: hasPermission,
      adminComparison: {
        roleValue: role,
        expectedAdmin: 'admin',
        exactMatch: role === 'admin',
        comparison: `'${role}' === 'admin' -> ${role === 'admin'}`
      },
      superAdminComparison: {
        roleValue: role,
        expectedSuperAdmin: 'super_admin',
        exactMatch: role === 'super_admin',
        comparison: `'${role}' === 'super_admin' -> ${role === 'super_admin'}`
      }
    });
    
    // 步骤6: 返回结果
    if (hasPermission) {
      console.log('✅ hasAdminPermission: 权限检查通过');
      console.log('📊 成功详情:', {
        userRole: originalRole,
        processedRole: role,
        matchedAs: isAdmin ? 'admin' : 'super_admin',
        result: true
      });
    } else {
      console.log('❌ hasAdminPermission: 权限检查失败');
      console.log('📊 失败详情:', {
        userRole: originalRole,
        processedRole: role,
        expectedRoles: ['admin', 'super_admin'],
        result: false,
        failureReason: !role ? 'role字段为空' : `role值'${role}'不匹配预期值`
      });
    }
    
    console.log('📊 hasAdminPermission函数执行完成，返回结果:', hasPermission);
    return hasPermission;
    
  } catch (error) {
    console.error('❌ hasAdminPermission函数执行异常:', error);
    console.log('📊 异常详情:', {
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : null,
      inputToken: token ? `${token.substring(0, 20)}...` : 'null',
      result: false
    });
    return false;
  }
}

/**
 * 格式化JWT token信息为可读字符串
 * @param token - JWT token字符串
 * @returns 格式化的token信息字符串
 */
export function formatJWTTokenInfo(token: string): string {
  try {
    const payload = parseJWTToken(token);
    if (!payload) return 'Invalid token';
    
    const issuedAt = new Date((payload.iat || 0) * 1000).toLocaleString();
    const expiresAt = new Date((payload.exp || 0) * 1000).toLocaleString();
    const remainingTime = getJWTTokenRemainingTime(token);
    
    return `Token Info:
- User ID: ${payload.userId}
- Role: ${payload.role}
- Issued At: ${issuedAt}
- Expires At: ${expiresAt}
- Remaining Time: ${remainingTime} minutes
- Is Valid: ${isJWTTokenValid(token)}`;
  } catch {
     return 'Error parsing token';
   }
}

/**
 * 检查token是否即将过期（剩余时间少于指定分钟数）
 * @param token - JWT token字符串
 * @param thresholdMinutes - 阈值分钟数，默认为5分钟
 * @returns 如果token即将过期返回true，否则返回false
 */
export function isJWTTokenExpiringSoon(token: string, thresholdMinutes: number = 5): boolean {
  try {
    const remainingTime = getJWTTokenRemainingTime(token);
    return remainingTime > 0 && remainingTime <= thresholdMinutes;
  } catch {
    return false;
  }
}

/**
 * 尝试刷新token
 * @param currentToken - 当前的JWT token
 * @returns Promise<string | null> - 新的token或null（如果刷新失败）
 */
export async function refreshJWTToken(currentToken: string): Promise<string | null> {
  try {
    if (!isJWTTokenValid(currentToken)) {
      console.error('当前token无效，无法刷新');
      return null;
    }
    
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.token || null;
    } else {
      console.error('Token刷新失败:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Token刷新过程中发生错误:', error);
    return null;
  }
}

/**
 * 自动检查并刷新token（如果需要）
 * @param currentToken - 当前的JWT token
 * @param thresholdMinutes - 刷新阈值分钟数，默认为5分钟
 * @returns Promise<string | null> - 新的token（如果刷新了）或当前token（如果不需要刷新）或null（如果刷新失败）
 */
export async function autoRefreshToken(currentToken: string, thresholdMinutes: number = 5): Promise<string | null> {
  try {
    if (!isJWTTokenValid(currentToken)) {
      return null;
    }
    
    if (isJWTTokenExpiringSoon(currentToken, thresholdMinutes)) {
      console.log('Token即将过期，尝试自动刷新...');
      const newToken = await refreshJWTToken(currentToken);
      
      if (newToken) {
        console.log('Token刷新成功');
        // 更新localStorage中的token
        localStorage.setItem('token', newToken);
        return newToken;
      } else {
        console.error('Token刷新失败');
        return null;
      }
    }
    
    // Token还没有即将过期，返回当前token
    return currentToken;
  } catch (error) {
    console.error('自动刷新token过程中发生错误:', error);
    return null;
  }
}

/**
 * 获取JWT token的详细信息
 * @param token - JWT token字符串
 * @returns 包含token详细信息的对象
 */
export function getJWTTokenInfo(token: string) {
  try {
    if (!token) {
      return {
        valid: false,
        error: 'Token不存在',
        payload: null,
        isExpired: true,
        remainingTime: 0,
        hasAdminPermission: false
      };
    }

    const payload = parseJWTToken(token);
    if (!payload) {
      return {
        valid: false,
        error: 'Token解析失败',
        payload: null,
        isExpired: true,
        remainingTime: 0,
        hasAdminPermission: false
      };
    }

    const isExpired = isJWTTokenExpired(token);
    const remainingTime = getJWTTokenRemainingTime(token);
    const isValid = isJWTTokenValid(token);
    const hasAdmin = hasAdminPermission(token);

    return {
      valid: isValid,
      error: null,
      payload,
      isExpired,
      remainingTime,
      hasAdminPermission: hasAdmin,
      issuedAt: payload.iat ? new Date(payload.iat * 1000) : null,
      expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...'
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : '未知错误',
      payload: null,
      isExpired: true,
      remainingTime: 0,
      hasAdminPermission: false
    };
  }
}