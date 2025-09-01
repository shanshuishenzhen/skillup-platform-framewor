import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminAccess } from '@/middleware/rbac';

/**
 * 标记消息为已读
 * POST /api/messages/read
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await verifyAdminAccess(request, ['user', 'admin', 'expert', 'student']);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { message: authResult.message || '用户未经授权' },
        { status: 403 }
      );
    }

    const { user } = authResult;
    const body = await request.json();
    const { messageIds, roomId } = body;

    // 验证参数
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: '消息ID列表不能为空' },
        { status: 400 }
      );
    }

    if (!roomId) {
      return NextResponse.json(
        { error: '聊天室ID不能为空' },
        { status: 400 }
      );
    }

    // 验证用户是否有权限访问该聊天室
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('chat_room_members')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', user.userId)
      .eq('is_active', true)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: '没有权限访问该聊天室' },
        { status: 403 }
      );
    }

    // 验证消息是否属于该聊天室
    const { data: messages, error: messageError } = await supabaseAdmin
      .from('messages')
      .select('id, room_id')
      .in('id', messageIds)
      .eq('room_id', roomId);

    if (messageError) {
      console.error('验证消息错误:', messageError);
      return NextResponse.json(
        { error: '验证消息失败' },
        { status: 500 }
      );
    }

    if (messages.length !== messageIds.length) {
      return NextResponse.json(
        { error: '部分消息不存在或不属于该聊天室' },
        { status: 400 }
      );
    }

    // 批量插入或更新已读状态
    const readStatusData = messageIds.map((messageId: string) => ({
      message_id: messageId,
      user_id: user.userId,
      read_at: new Date().toISOString()
    }));

    const { error: readError } = await supabaseAdmin
      .from('message_read_status')
      .upsert(readStatusData, {
        onConflict: 'message_id,user_id'
      });

    if (readError) {
      console.error('标记消息已读错误:', readError);
      return NextResponse.json(
        { error: '标记消息已读失败' },
        { status: 500 }
      );
    }

    // 更新聊天室成员的最后查看时间
    await supabaseAdmin
      .from('chat_room_members')
      .update({ last_seen: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', user.userId);

    // 通过WebSocket通知房间其他用户
    try {
      const { websocketService } = await import('@/services/websocketService');
      websocketService.sendToRoom(roomId, 'messages_read', {
        messageIds,
        userId: user.userId,
        readAt: new Date().toISOString()
      });
    } catch (wsError) {
      console.warn('WebSocket通知失败:', wsError);
    }

    return NextResponse.json({
      success: true,
      data: {
        readCount: messageIds.length,
        readAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('标记消息已读错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取消息已读状态
 * GET /api/messages/read?messageIds=xxx,yyy&roomId=zzz
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await verifyAdminAccess(request, ['user', 'admin', 'expert', 'student']);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { message: authResult.message || '用户未经授权' },
        { status: 403 }
      );
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const messageIdsParam = searchParams.get('messageIds');
    const roomId = searchParams.get('roomId');

    if (!messageIdsParam || !roomId) {
      return NextResponse.json(
        { error: '消息ID和聊天室ID不能为空' },
        { status: 400 }
      );
    }

    const messageIds = messageIdsParam.split(',');

    // 验证用户是否有权限访问该聊天室
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('chat_room_members')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', user.userId)
      .eq('is_active', true)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: '没有权限访问该聊天室' },
        { status: 403 }
      );
    }

    // 获取消息已读状态
    const { data: readStatus, error } = await supabaseAdmin
      .from('message_read_status')
      .select(`
        message_id,
        user_id,
        read_at,
        user:users(id, name, avatar_url)
      `)
      .in('message_id', messageIds);

    if (error) {
      console.error('获取消息已读状态错误:', error);
      return NextResponse.json(
        { error: '获取已读状态失败' },
        { status: 500 }
      );
    }

    // 按消息ID分组已读状态
    const readStatusByMessage = messageIds.reduce((acc: any, messageId: string) => {
      acc[messageId] = readStatus.filter(rs => rs.message_id === messageId);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: { readStatus: readStatusByMessage }
    });

  } catch (error) {
    console.error('获取消息已读状态错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
