import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminAccess } from '@/middleware/rbac';

/**
 * 获取用户在线状态
 * GET /api/users/online-status?userIds=xxx,yyy
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await verifyAdminAccess(request, ['user', 'admin', 'expert', 'student']);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const userIdsParam = searchParams.get('userIds');
    const roomId = searchParams.get('roomId');

    let userIds: string[] = [];

    if (userIdsParam) {
      userIds = userIdsParam.split(',');
    } else if (roomId) {
      // 如果提供了roomId，获取该房间的所有成员
      const { data: members, error: memberError } = await supabaseAdmin
        .from('chat_room_members')
        .select('user_id')
        .eq('room_id', roomId)
        .eq('is_active', true);

      if (memberError) {
        console.error('获取房间成员错误:', memberError);
        return NextResponse.json(
          { error: '获取房间成员失败' },
          { status: 500 }
        );
      }

      userIds = members.map(m => m.user_id);
    } else {
      return NextResponse.json(
        { error: '用户ID列表或房间ID不能为空' },
        { status: 400 }
      );
    }

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { onlineStatus: [] }
      });
    }

    // 获取用户在线状态
    const { data: onlineStatus, error } = await supabaseAdmin
      .from('user_online_status')
      .select(`
        user_id,
        status,
        last_seen,
        user:users(id, name, email, avatar_url)
      `)
      .in('user_id', userIds);

    if (error) {
      console.error('获取在线状态错误:', error);
      return NextResponse.json(
        { error: '获取在线状态失败' },
        { status: 500 }
      );
    }

    // 为没有在线状态记录的用户添加默认状态
    const statusMap = new Map(onlineStatus.map(status => [status.user_id, status]));
    const allStatus = userIds.map(userId => {
      if (statusMap.has(userId)) {
        return statusMap.get(userId);
      } else {
        return {
          user_id: userId,
          status: 'offline',
          last_seen: null,
          user: null // 需要单独查询用户信息
        };
      }
    });

    // 查询缺失的用户信息
    const missingUserIds = allStatus
      .filter(status => !status.user)
      .map(status => status.user_id);

    if (missingUserIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, name, email, avatar_url')
        .in('id', missingUserIds);

      if (users) {
        const userMap = new Map(users.map(user => [user.id, user]));
        allStatus.forEach(status => {
          if (!status.user && userMap.has(status.user_id)) {
            status.user = userMap.get(status.user_id);
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { onlineStatus: allStatus }
    });

  } catch (error) {
    console.error('获取在线状态错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * 更新用户在线状态
 * PUT /api/users/online-status
 */
export async function PUT(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await verifyAdminAccess(request, ['user', 'admin', 'expert', 'student']);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const body = await request.json();
    const { status, deviceInfo = {} } = body;

    // 验证状态值
    const validStatuses = ['online', 'away', 'busy', 'offline'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: '无效的在线状态' },
        { status: 400 }
      );
    }

    // 更新在线状态
    const { data: onlineStatus, error } = await supabaseAdmin
      .from('user_online_status')
      .upsert({
        user_id: user.userId,
        status,
        last_seen: new Date().toISOString(),
        device_info: deviceInfo
      })
      .select('*')
      .single();

    if (error) {
      console.error('更新在线状态错误:', error);
      return NextResponse.json(
        { error: '更新在线状态失败' },
        { status: 500 }
      );
    }

    // 通过WebSocket通知相关用户
    try {
      const { websocketService } = await import('@/services/websocketService');
      
      // 获取用户参与的所有聊天室
      const { data: userRooms } = await supabaseAdmin
        .from('chat_room_members')
        .select('room_id')
        .eq('user_id', user.userId)
        .eq('is_active', true);

      if (userRooms) {
        userRooms.forEach(room => {
          websocketService.sendToRoom(room.room_id, 'user_status_changed', {
            userId: user.userId,
            status,
            lastSeen: onlineStatus.last_seen
          });
        });
      }
    } catch (wsError) {
      console.warn('WebSocket通知失败:', wsError);
    }

    return NextResponse.json({
      success: true,
      data: { onlineStatus }
    });

  } catch (error) {
    console.error('更新在线状态错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
