import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminAccess } from '@/middleware/rbac';

/**
 * 创建或获取私聊
 * POST /api/chat-rooms/private
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await verifyAdminAccess(request, ['user', 'admin', 'expert', 'student']);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.message || '用户未经授权' },
        { status: 403 }
      );
    }

    const { user } = authResult;
    const body = await request.json();
    const { userId: targetUserId } = body;

    // 验证目标用户ID
    if (!targetUserId) {
      return NextResponse.json(
        { error: '目标用户ID不能为空' },
        { status: 400 }
      );
    }

    if (targetUserId === user.userId) {
      return NextResponse.json(
        { error: '不能与自己创建私聊' },
        { status: 400 }
      );
    }

    // 验证目标用户是否存在
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, avatar_url, status')
      .eq('id', targetUserId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: '目标用户不存在' },
        { status: 404 }
      );
    }

    if (targetUser.status !== 'active') {
      return NextResponse.json(
        { error: '目标用户账户未激活' },
        { status: 400 }
      );
    }

    // 检查是否已存在私聊
    const { data: existingRooms, error: searchError } = await supabaseAdmin
      .from('chat_rooms')
      .select(`
        *,
        members:chat_room_members(user_id)
      `)
      .eq('type', 'private');

    if (searchError) {
      console.error('搜索现有私聊错误:', searchError);
      return NextResponse.json(
        { error: '搜索私聊失败' },
        { status: 500 }
      );
    }

    // 查找包含当前用户和目标用户的私聊
    let existingRoom = null;
    for (const room of existingRooms) {
      const memberIds = room.members.map((m: any) => m.user_id);
      if (memberIds.includes(user.userId) && memberIds.includes(targetUserId) && memberIds.length === 2) {
        existingRoom = room;
        break;
      }
    }

    if (existingRoom) {
      // 获取完整的聊天室信息
      const { data: fullChatRoom } = await supabaseAdmin
        .from('chat_rooms')
        .select(`
          *,
          members:chat_room_members(
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
          )
        `)
        .eq('id', existingRoom.id)
        .single();

      return NextResponse.json({
        success: true,
        data: { 
          chatRoom: fullChatRoom,
          isNew: false
        }
      });
    }

    // 获取当前用户信息
    const { data: currentUser, error: currentUserError } = await supabaseAdmin
      .from('users')
      .select('name, email')
      .eq('id', user.userId)
      .single();

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: '无法获取当前用户信息' }, { status: 404 });
    }

    // 创建新的私聊
    const chatRoomName = `${currentUser.name || currentUser.email} & ${targetUser.name || targetUser.email}`;
    
    const { data: newChatRoom, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .insert({
        name: chatRoomName,
        description: '私人聊天',
        type: 'private',
        created_by: user.userId,
        settings: {
          isPublic: false,
          allowFileSharing: true,
          allowMemberInvite: false,
          maxMembers: 2
        }
      })
      .select('*')
      .single();

    if (roomError) {
      console.error('创建私聊错误:', roomError);
      return NextResponse.json(
        { error: '创建私聊失败' },
        { status: 500 }
      );
    }

    // 添加两个成员
    const members = [
      {
        room_id: newChatRoom.id,
        user_id: user.userId,
        role: 'owner'
      },
      {
        room_id: newChatRoom.id,
        user_id: targetUserId,
        role: 'member'
      }
    ];

    const { error: memberError } = await supabaseAdmin
      .from('chat_room_members')
      .insert(members);

    if (memberError) {
      console.error('添加私聊成员错误:', memberError);
      // 如果添加成员失败，删除已创建的聊天室
      await supabaseAdmin
        .from('chat_rooms')
        .delete()
        .eq('id', newChatRoom.id);

      return NextResponse.json(
        { error: '添加私聊成员失败' },
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
          last_seen,
          is_active,
          user:users(id, name, email, avatar_url)
        )
      `)
      .eq('id', newChatRoom.id)
      .single();

    // 通过WebSocket通知目标用户
    try {
      const { websocketService } = await import('@/services/websocketService');
      websocketService.sendToUser(targetUserId, 'chat_room_created', {
        chatRoom: fullChatRoom
      });
    } catch (wsError) {
      console.warn('WebSocket通知失败:', wsError);
    }

    return NextResponse.json({
      success: true,
      data: { 
        chatRoom: fullChatRoom,
        isNew: true
      }
    });

  } catch (error) {
    console.error('创建私聊错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
