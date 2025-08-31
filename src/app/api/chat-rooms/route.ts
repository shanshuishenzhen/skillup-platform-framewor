import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminAccess } from '@/middleware/rbac';

/**
 * 获取用户的聊天室列表
 * GET /api/chat-rooms
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

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // private, group, project, public
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    // 构建查询
    let query = supabaseAdmin
      .from('chat_rooms')
      .select(`
        *,
        members:chat_room_members!inner(
          user_id,
          role,
          joined_at,
          last_seen,
          is_active,
          user:users(id, name, email, avatar_url)
        ),
        last_message:messages!last_message_id(
          id,
          content,
          message_type,
          created_at,
          sender:users!sender_id(id, name)
        ),
        unread_count:messages(count)
      `)
      .eq('members.user_id', user.userId)
      .eq('members.is_active', true)
      .eq('is_archived', false)
      .order('last_activity', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // 如果指定了类型，添加类型过滤
    if (type) {
      query = query.eq('type', type);
    }

    const { data: chatRooms, error } = await query;

    if (error) {
      console.error('获取聊天室列表失败:', error);
      return NextResponse.json(
        { error: '获取聊天室列表失败' },
        { status: 500 }
      );
    }

    // 计算每个聊天室的未读消息数
    const roomsWithUnreadCount = await Promise.all(
      chatRooms.map(async (room) => {
        // 获取用户在该房间的最后查看时间
        const { data: membership } = await supabaseAdmin
          .from('chat_room_members')
          .select('last_seen')
          .eq('room_id', room.id)
          .eq('user_id', user.userId)
          .single();

        // 计算未读消息数
        const { count: unreadCount } = await supabaseAdmin
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .eq('is_deleted', false)
          .gt('created_at', membership?.last_seen || '1970-01-01');

        return {
          ...room,
          unread_count: unreadCount || 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        chatRooms: roomsWithUnreadCount,
        pagination: {
          page,
          limit,
          hasMore: chatRooms.length === limit
        }
      }
    });

  } catch (error) {
    console.error('获取聊天室列表错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * 创建聊天室
 * POST /api/chat-rooms
 */
export async function POST(request: NextRequest) {
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
    const {
      name,
      description = '',
      type = 'group',
      memberIds = [],
      projectId = null,
      avatarUrl = null,
      settings = {}
    } = body;

    // 验证必填字段
    if (!name) {
      return NextResponse.json(
        { error: '聊天室名称不能为空' },
        { status: 400 }
      );
    }

    // 验证聊天室类型
    const validTypes = ['private', 'group', 'project', 'public'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: '无效的聊天室类型' },
        { status: 400 }
      );
    }

    // 私聊验证
    if (type === 'private') {
      if (memberIds.length !== 1) {
        return NextResponse.json(
          { error: '私聊只能有两个成员' },
          { status: 400 }
        );
      }

      // 检查是否已存在私聊
      const { data: existingRoom } = await supabaseAdmin
        .from('chat_rooms')
        .select('id')
        .eq('type', 'private')
        .in('id', [
          supabaseAdmin
            .from('chat_room_members')
            .select('room_id')
            .eq('user_id', user.userId),
          supabaseAdmin
            .from('chat_room_members')
            .select('room_id')
            .eq('user_id', memberIds[0])
        ]);

      if (existingRoom && existingRoom.length > 0) {
        return NextResponse.json(
          { error: '私聊已存在' },
          { status: 400 }
        );
      }
    }

    // 创建聊天室
    const { data: chatRoom, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .insert({
        name,
        description,
        type,
        created_by: user.userId,
        project_id: projectId,
        avatar_url: avatarUrl,
        settings
      })
      .select('*')
      .single();

    if (roomError) {
      console.error('创建聊天室错误:', roomError);
      return NextResponse.json(
        { error: '创建聊天室失败' },
        { status: 500 }
      );
    }

    // 添加创建者为房间所有者
    const members = [
      {
        room_id: chatRoom.id,
        user_id: user.userId,
        role: 'owner'
      }
    ];

    // 添加其他成员
    memberIds.forEach((memberId: string) => {
      if (memberId !== user.userId) {
        members.push({
          room_id: chatRoom.id,
          user_id: memberId,
          role: 'member'
        });
      }
    });

    const { error: memberError } = await supabaseAdmin
      .from('chat_room_members')
      .insert(members);

    if (memberError) {
      console.error('添加聊天室成员错误:', memberError);
      // 如果添加成员失败，删除已创建的聊天室
      await supabaseAdmin
        .from('chat_rooms')
        .delete()
        .eq('id', chatRoom.id);

      return NextResponse.json(
        { error: '添加聊天室成员失败' },
        { status: 500 }
      );
    }

    // 获取完整的聊天室信息
    const { data: fullChatRoom } = await supabaseAdmin
      .from('chat_rooms')
      .select(`
        *,
        members:chat_room_members(
          user_id,
          role,
          joined_at,
          user:users(id, name, email, avatar_url)
        )
      `)
      .eq('id', chatRoom.id)
      .single();

    // 通过WebSocket通知相关用户
    try {
      const { websocketService } = await import('@/services/websocketService');
      memberIds.forEach((memberId: string) => {
        websocketService.sendToUser(memberId, 'chat_room_created', {
          chatRoom: fullChatRoom
        });
      });
    } catch (wsError) {
      console.warn('WebSocket通知失败:', wsError);
    }

    return NextResponse.json({
      success: true,
      data: { chatRoom: fullChatRoom }
    });

  } catch (error) {
    console.error('创建聊天室错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
