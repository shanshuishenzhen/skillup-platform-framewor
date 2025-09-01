import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminAccess } from '@/middleware/rbac';

/**
 * 获取消息列表
 * GET /api/messages?roomId=xxx&page=1&limit=50
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
    const roomId = searchParams.get('roomId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const before = searchParams.get('before'); // 用于分页的时间戳

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

    // 构建查询条件
    let query = supabaseAdmin
      .from('messages')
      .select(`
        *,
        sender:users!sender_id(id, name, email, avatar_url),
        reply_to:messages!reply_to_id(id, content, sender_id, message_type),
        reactions:message_reactions(id, emoji, user_id, users!user_id(id, name)),
        read_status:message_read_status(user_id, read_at)
      `)
      .eq('room_id', roomId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    // 如果有before参数，添加时间过滤
    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('获取消息失败:', error);
      return NextResponse.json(
        { error: '获取消息失败' },
        { status: 500 }
      );
    }

    // 反转消息顺序（最新的在最后）
    const reversedMessages = messages.reverse();

    return NextResponse.json({
      success: true,
      data: {
        messages: reversedMessages,
        pagination: {
          page,
          limit,
          hasMore: messages.length === limit
        }
      }
    });

  } catch (error) {
    console.error('获取消息错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * 发送消息
 * POST /api/messages
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
    const {
      roomId,
      content,
      messageType = 'text',
      fileUrl = null,
      fileName = null,
      fileSize = null,
      fileType = null,
      replyToId = null
    } = body;

    // 验证必填字段
    if (!roomId) {
      return NextResponse.json(
        { error: '聊天室ID不能为空' },
        { status: 400 }
      );
    }

    if (messageType === 'text' && !content) {
      return NextResponse.json(
        { error: '文本消息内容不能为空' },
        { status: 400 }
      );
    }

    if ((messageType === 'file' || messageType === 'image') && !fileUrl) {
      return NextResponse.json(
        { error: '文件消息必须包含文件URL' },
        { status: 400 }
      );
    }

    // 验证用户是否有权限发送消息到该聊天室
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('chat_room_members')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', user.userId)
      .eq('is_active', true)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: '没有权限发送消息到该聊天室' },
        { status: 403 }
      );
    }

    // 创建消息
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: user.userId,
        content,
        message_type: messageType,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        reply_to_id: replyToId
      })
      .select(`
        *,
        sender:users!sender_id(id, name, email, avatar_url),
        reply_to:messages!reply_to_id(id, content, sender_id, message_type)
      `)
      .single();

    if (messageError) {
      console.error('创建消息错误:', messageError);
      return NextResponse.json(
        { error: '发送消息失败' },
        { status: 500 }
      );
    }

    // 更新聊天室最后活动时间和最后消息
    await supabaseAdmin
      .from('chat_rooms')
      .update({
        last_message_id: message.id,
        last_activity: new Date().toISOString()
      })
      .eq('id', roomId);

    // 通过WebSocket发送实时消息（如果WebSocket服务可用）
    try {
      const { websocketService } = await import('@/services/websocketService');
      websocketService.sendToRoom(roomId, 'new_message', {
        message,
        roomId
      });
    } catch (wsError) {
      console.warn('WebSocket发送失败:', wsError);
      // WebSocket失败不影响API响应
    }

    return NextResponse.json({
      success: true,
      data: { message }
    });

  } catch (error) {
    console.error('发送消息错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
