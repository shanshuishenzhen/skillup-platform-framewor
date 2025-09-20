#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""测试序列化问题"""

import json
from user_crud_service import BatchUserCreateRequest, UserCreateRequest, BatchOperationResult

def test_batch_create_request_serialization():
    """测试BatchUserCreateRequest序列化"""
    print("测试BatchUserCreateRequest序列化...")
    
    # 创建测试数据
    user_data = UserCreateRequest(
        username="test_user",
        password="test123456",
        email="test@example.com",
        real_name="测试用户",
        phone="13900000001",
        role="Student",
        attributes={"skill": "Python"}
    )
    
    batch_request = BatchUserCreateRequest(
        users=[user_data],
        skip_duplicates=True,
        send_notifications=False
    )
    
    try:
        # 测试model_dump
        data = batch_request.model_dump()
        print(f"✅ BatchUserCreateRequest.model_dump() 成功: {type(data)}")
        
        # 测试JSON序列化
        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        print(f"✅ JSON序列化成功，长度: {len(json_str)}")
        
    except Exception as e:
        print(f"❌ BatchUserCreateRequest序列化失败: {e}")
        import traceback
        traceback.print_exc()

def test_batch_operation_result_serialization():
    """测试BatchOperationResult序列化"""
    print("\n测试BatchOperationResult序列化...")
    
    # 创建测试结果
    result = BatchOperationResult(
        success_count=1,
        error_count=0,
        total_count=1,
        success_ids=[1],
        errors=[],
        warnings=[]
    )
    
    try:
        # 测试model_dump
        data = result.model_dump()
        print(f"✅ BatchOperationResult.model_dump() 成功: {type(data)}")
        
        # 测试JSON序列化
        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        print(f"✅ JSON序列化成功，长度: {len(json_str)}")
        
    except Exception as e:
        print(f"❌ BatchOperationResult序列化失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_batch_create_request_serialization()
    test_batch_operation_result_serialization()
    print("\n序列化测试完成")