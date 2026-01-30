"""
Chat Session Lambda - Session CRUD Operations

Handles chat session management including creation, retrieval, updates,
KB grounding, sharing, and favorites.

Routes - Workspace Scoped:
- GET /ws/{wsId}/chats - List workspace chats
- POST /ws/{wsId}/chats - Create workspace chat
- GET /ws/{wsId}/chats/{sessionId} - Get chat details
- PATCH /ws/{wsId}/chats/{sessionId} - Update chat (title, sharing)
- DELETE /ws/{wsId}/chats/{sessionId} - Delete chat

Routes - User Level:
- GET /users/me/chats - List user's personal chats
- POST /users/me/chats - Create personal chat
- GET /chats/{sessionId} - Get chat details (any accessible chat)
- PATCH /chats/{sessionId} - Update chat
- DELETE /chats/{sessionId} - Delete chat

Routes - KB Grounding:
- GET /chats/{sessionId}/kbs - List grounded KBs
- POST /chats/{sessionId}/kbs - Add KB grounding
- DELETE /chats/{sessionId}/kbs/{kbId} - Remove KB grounding

Routes - Sharing:
- GET /chats/{sessionId}/shares - List shares
- POST /chats/{sessionId}/shares - Share chat
- DELETE /chats/{sessionId}/shares/{shareId} - Remove share

Routes - Favorites:
- POST /chats/{sessionId}/favorite - Toggle favorite

Routes - Sys Admin (Platform Management):
- GET /admin/sys/chat/config - Get platform chat settings
- PUT /admin/sys/chat/config - Update platform chat settings
- GET /admin/sys/chat/analytics - Get platform-wide chat analytics
- GET /admin/sys/chat/analytics/usage - Get detailed usage statistics
- GET /admin/sys/chat/analytics/tokens - Get token usage statistics
- GET /admin/sys/chat/sessions - List all chat sessions (all orgs)
- GET /admin/sys/chat/sessions/{id} - Get chat session details
- DELETE /admin/sys/chat/sessions/{id} - Force delete chat session

Routes - Org Admin (Organization Management):
- GET /admin/org/chat/config - Get organization chat settings
- PUT /admin/org/chat/config - Update organization chat settings
- GET /admin/org/chat/sessions - List all organization chat sessions
- GET /admin/org/chat/sessions/{id} - Get chat session details
- DELETE /admin/org/chat/sessions/{id} - Delete organization chat session
- POST /admin/org/chat/sessions/{id}/restore - Restore soft-deleted chat
- GET /admin/org/chat/analytics - Get organization chat analytics
- GET /admin/org/chat/analytics/users - Get user activity statistics
- GET /admin/org/chat/analytics/workspaces - Get workspace activity statistics
"""

import json
from typing import Any, Dict, List, Optional
import org_common as common


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for chat session operations.
    
    Routes requests to appropriate handlers based on HTTP method and path.
    """
    # Log incoming request
    print(json.dumps(event, default=str))
    
    try:
        # Extract JWT from Authorization header for RPC calls
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization') or headers.get('authorization', '')
        jwt_token = auth_header.replace('Bearer ', '').strip()
        
        # Extract user info from authorizer
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        
        # Convert Okta UID to Supabase UUID for database operations
        supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
        
        # Extract HTTP method
        http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod')
        if not http_method:
            return common.bad_request_response('HTTP method not found in request')
        
        # Extract path and path parameters
        path = event.get('rawPath', '') or event.get('path', '')
        path_params = event.get('pathParameters', {}) or {}
        
        # CENTRALIZED AUTH: Query user profile ONCE for admin routes
        if '/admin/' in path:
            org_id = user_info.get('org_id')  # Extract org_id for context
            
            # Log org context for audit trail
            if org_id:
                print(f"Request from org_id: {org_id}")
            
            profile = common.find_one(
                table='user_profiles',
                filters={'user_id': supabase_user_id}
            )
            
            if not profile:
                print(f"User profile not found for {supabase_user_id}")
                return common.forbidden_response('User profile not found')
            
            # Compute sys admin flag from user_profiles.sys_role (ADR-019)
            is_sys_admin = profile.get('sys_role') in common.SYS_ADMIN_ROLES
            
            # Compute org admin flag from org_members.org_role (NOT user_profiles!) (ADR-019)
            if org_id:
                org_membership = common.find_one(
                    table='org_members',
                    filters={
                        'user_id': supabase_user_id,
                        'org_id': org_id
                    }
                )
                is_org_admin = org_membership and org_membership.get('org_role') in common.ORG_ADMIN_ROLES
            else:
                is_org_admin = False
            
            # Route-level authorization check
            if path.startswith('/admin/sys/'):
                if not is_sys_admin:
                    print(f"Access denied for user {supabase_user_id} - sys admin required")
                    return common.forbidden_response('System admin role required')
                print(f"System admin access granted for user {supabase_user_id}")
            
            elif path.startswith('/admin/org/'):
                if not is_org_admin:
                    print(f"Access denied for user {supabase_user_id} - org admin required")
                    return common.forbidden_response('Organization admin role required')
                if not org_id:
                    print(f"Org admin missing org_id for {supabase_user_id}")
                    return common.forbidden_response('Organization context required')
                print(f"Organization admin access granted for user {supabase_user_id}, org: {org_id}")
        
        # Route based on path patterns
        if http_method == 'OPTIONS':
            return common.success_response({})
        
        # Workspace-scoped routes: /ws/{wsId}/chats...
        if '/ws/' in path and '/chats' in path:
            ws_id = path_params.get('wsId')
            session_id = path_params.get('sessionId')
            
            if http_method == 'GET':
                if session_id:
                    return handle_get_chat(supabase_user_id, session_id)
                else:
                    return handle_list_workspace_chats(event, supabase_user_id, ws_id)
            elif http_method == 'POST':
                return handle_create_workspace_chat(event, supabase_user_id, ws_id)
            elif http_method == 'PATCH':
                return handle_update_chat(event, supabase_user_id, session_id)
            elif http_method == 'DELETE':
                return handle_delete_chat(supabase_user_id, session_id)
        
        # User-level routes: /users/me/chats
        elif '/users/me/chats' in path:
            if http_method == 'GET':
                return handle_list_user_chats(event, supabase_user_id)
            elif http_method == 'POST':
                return handle_create_user_chat(event, supabase_user_id)
        
        # KB grounding routes: /chats/{sessionId}/kbs...
        elif '/kbs' in path:
            session_id = path_params.get('sessionId')
            kb_id = path_params.get('kbId')
            
            if http_method == 'GET':
                return handle_list_grounded_kbs(supabase_user_id, session_id)
            elif http_method == 'POST':
                return handle_add_kb_grounding(event, supabase_user_id, session_id)
            elif http_method == 'DELETE':
                return handle_remove_kb_grounding(supabase_user_id, session_id, kb_id)
        
        # Sharing routes: /chats/{sessionId}/shares...
        elif '/shares' in path:
            session_id = path_params.get('sessionId')
            share_id = path_params.get('shareId')
            
            if http_method == 'GET':
                return handle_list_shares(supabase_user_id, session_id)
            elif http_method == 'POST':
                return handle_create_share(event, supabase_user_id, session_id)
            elif http_method == 'DELETE':
                return handle_delete_share(supabase_user_id, session_id, share_id)
        
        # Favorite route: /chats/{sessionId}/favorite
        elif '/favorite' in path:
            session_id = path_params.get('sessionId')
            if http_method == 'POST':
                return handle_toggle_favorite(supabase_user_id, session_id)
        
        # Sys Admin routes: /admin/sys/chat/*
        elif '/admin/sys/chat' in path:
            if '/config' in path:
                if http_method == 'GET':
                    return handle_sys_get_config(supabase_user_id)
                elif http_method == 'PUT':
                    return handle_sys_update_config(event, supabase_user_id)
            elif '/analytics' in path:
                if '/usage' in path:
                    return handle_sys_get_usage_stats(event, supabase_user_id)
                elif '/tokens' in path:
                    return handle_sys_get_token_stats(event, supabase_user_id)
                else:
                    return handle_sys_get_analytics(event, supabase_user_id)
            elif '/sessions' in path:
                session_id = path_params.get('sessionId')
                if session_id:
                    if http_method == 'GET':
                        return handle_sys_get_session(supabase_user_id, session_id)
                    elif http_method == 'DELETE':
                        return handle_sys_delete_session(supabase_user_id, session_id)
                else:
                    if http_method == 'GET':
                        return handle_sys_list_sessions(event, supabase_user_id)
        
        # Org Admin routes: /admin/org/chat/*
        elif '/admin/org/chat' in path:
            if '/config' in path:
                if http_method == 'GET':
                    return handle_org_get_config(supabase_user_id, user_info)
                elif http_method == 'PUT':
                    return handle_org_update_config(event, supabase_user_id, user_info)
            elif '/analytics' in path:
                if '/users' in path:
                    return handle_org_get_user_stats(event, user_info)
                elif '/workspaces' in path:
                    return handle_org_get_workspace_stats(event, user_info)
                else:
                    return handle_org_get_analytics(event, user_info)
            elif '/sessions' in path:
                session_id = path_params.get('sessionId')
                if session_id:
                    if '/restore' in path:
                        return handle_org_restore_session(user_info, session_id)
                    elif http_method == 'GET':
                        return handle_org_get_session(user_info, session_id)
                    elif http_method == 'DELETE':
                        return handle_org_delete_session(user_info, session_id)
                else:
                    if http_method == 'GET':
                        return handle_org_list_sessions(event, user_info)
        
        # Generic chat routes: /chats/{sessionId}
        elif '/chats/' in path:
            session_id = path_params.get('sessionId')
            
            if http_method == 'GET':
                return handle_get_chat(supabase_user_id, session_id)
            elif http_method == 'PATCH':
                return handle_update_chat(event, supabase_user_id, session_id)
            elif http_method == 'DELETE':
                return handle_delete_chat(supabase_user_id, session_id)
        
        return common.not_found_response('Route not found')
        
    except KeyError as e:
        print(f'KeyError: {str(e)}')
        return common.unauthorized_response(f'Missing user information: {str(e)}')
    except common.NotFoundError as e:
        return common.not_found_response(str(e))
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response('Internal server error')


# =============================================================================
# SESSION CRUD HANDLERS
# =============================================================================

def handle_list_workspace_chats(
    event: Dict[str, Any],
    user_id: str,
    ws_id: str
) -> Dict[str, Any]:
    """
    List chat sessions for a workspace.
    
    Query parameters:
    - limit: Number of results (default: 50, max: 100)
    - offset: Pagination offset (default: 0)
    - filter: 'all' | 'mine' | 'shared' (default: 'all')
    """
    ws_id = common.validate_uuid(ws_id, 'wsId')
    
    query_params = event.get('queryStringParameters', {}) or {}
    
    limit = common.validate_integer(
        query_params.get('limit', 50),
        'limit',
        min_value=1,
        max_value=100
    )
    offset = common.validate_integer(
        query_params.get('offset', 0),
        'offset',
        min_value=0
    )
    filter_type = query_params.get('filter', 'all')
    
    # Verify user has access to workspace
    ws_membership = common.find_one(
        table='ws_members',
        filters={
            'ws_id': ws_id,
            'user_id': user_id
        }
    )
    
    if not ws_membership or ws_membership.get('deleted_at'):
        raise common.ForbiddenError('You do not have access to this workspace')
    
    # Get workspace to find org_id
    workspace = common.find_one(
        table='workspaces',
        filters={'id': ws_id}
    )
    
    if not workspace:
        raise common.NotFoundError('Workspace not found')
    
    org_id = workspace['org_id']
    
    # Build query based on filter
    if filter_type == 'mine':
        # Only user's own chats in this workspace
        chats = common.find_many(
            table='chat_sessions',
            filters={
                'ws_id': ws_id,
                'created_by': user_id,
                'is_deleted': False
            },
            order='updated_at.desc',
            limit=limit,
            offset=offset
        )
    elif filter_type == 'shared':
        # Chats shared with user (not their own)
        chats = common.rpc(
            
'get_accessible_chats',
            
{
                'p_user_id': user_id,
                'p_org_id': org_id,
                'p_workspace_id': ws_id
            }
        )
        # Filter to only shared chats
        chats = [c for c in chats if c['access_type'] != 'owner']
        chats = chats[offset:offset + limit]
    else:
        # All accessible chats (owned, shared, workspace-shared)
        chats = common.rpc(
            
'get_accessible_chats',
            
{
                'p_user_id': user_id,
                'p_org_id': org_id,
                'p_workspace_id': ws_id
            }
        )
        chats = chats[offset:offset + limit]
    
    # Enrich with metadata
    result = _enrich_chat_list(chats, user_id)
    
    return common.success_response(result)


def handle_list_user_chats(
    event: Dict[str, Any],
    user_id: str
) -> Dict[str, Any]:
    """
    List user's personal chats (not associated with any workspace).
    
    Query parameters:
    - limit: Number of results (default: 50, max: 100)
    - offset: Pagination offset (default: 0)
    - orgId: Filter by organization (required)
    """
    query_params = event.get('queryStringParameters', {}) or {}
    
    org_id = query_params.get('orgId')
    if not org_id:
        raise common.ValidationError('orgId query parameter is required')
    
    org_id = common.validate_uuid(org_id, 'orgId')
    
    limit = common.validate_integer(
        query_params.get('limit', 50),
        'limit',
        min_value=1,
        max_value=100
    )
    offset = common.validate_integer(
        query_params.get('offset', 0),
        'offset',
        min_value=0
    )
    
    # Verify user is org member
    org_membership = common.find_one(
        table='org_members',
        filters={
            'org_id': org_id,
            'user_id': user_id
        }
    )
    
    if not org_membership:
        raise common.ForbiddenError('You do not have access to this organization')
    
    # Get user's personal chats (no workspace_id)
    chats = common.find_many(
        table='chat_sessions',
        filters={
            'org_id': org_id,
            'created_by': user_id,
            'ws_id': None,
            'is_deleted': False
        },
        order='updated_at.desc',
        limit=limit,
        offset=offset
    )
    
    result = _enrich_chat_list(chats, user_id)
    
    return common.success_response(result)


def handle_create_workspace_chat(
    event: Dict[str, Any],
    user_id: str,
    ws_id: str
) -> Dict[str, Any]:
    """
    Create a new chat session in a workspace.
    
    Request body:
    {
        "title": "Chat Title",  // Optional, default: "New Chat"
        "kbIds": ["uuid1", "uuid2"],  // Optional: KBs to ground
        "isSharedWithWorkspace": false  // Optional, default: false
    }
    """
    ws_id = common.validate_uuid(ws_id, 'wsId')
    
    # Verify user has access to workspace
    ws_membership = common.find_one(
        table='ws_members',
        filters={
            'ws_id': ws_id,
            'user_id': user_id
        }
    )
    
    if not ws_membership or ws_membership.get('deleted_at'):
        raise common.ForbiddenError('You do not have access to this workspace')
    
    # Get workspace to find org_id
    workspace = common.find_one(
        table='workspaces',
        filters={'id': ws_id}
    )
    
    if not workspace:
        raise common.NotFoundError('Workspace not found')
    
    body = json.loads(event.get('body', '{}'))
    
    title = body.get('title', 'New Chat')
    if title:
        title = common.validate_string_length(title, 'title', max_length=255)
    
    is_shared_with_workspace = body.get('isSharedWithWorkspace', False)
    kb_ids = body.get('kbIds', [])
    
    # Create the chat session
    chat_data = {
        'title': title,
        'ws_id': ws_id,
        'org_id': workspace['org_id'],
        'created_by': user_id,
        'is_shared_with_workspace': is_shared_with_workspace,
        'metadata': json.dumps({'messageCount': 0}),
        'updated_by': user_id
    }
    
    chat = common.insert_one(
        table='chat_sessions',
        data=chat_data
    )
    
    # Add KB groundings if provided
    if kb_ids:
        for kb_id in kb_ids:
            kb_id = common.validate_uuid(kb_id, 'kbId')
            _add_kb_grounding_internal(chat['id'], kb_id, user_id)
    
    result = _format_chat_response(chat, user_id)
    
    return common.created_response(result)


def handle_create_user_chat(
    event: Dict[str, Any],
    user_id: str
) -> Dict[str, Any]:
    """
    Create a new personal chat (not associated with workspace).
    
    Request body:
    {
        "orgId": "uuid",  // Required
        "title": "Chat Title",  // Optional
        "kbIds": ["uuid1", "uuid2"]  // Optional
    }
    """
    body = json.loads(event.get('body', '{}'))
    
    org_id = body.get('orgId')
    if not org_id:
        raise common.ValidationError('orgId is required')
    
    org_id = common.validate_uuid(org_id, 'orgId')
    
    # Verify user is org member
    org_membership = common.find_one(
        table='org_members',
        filters={
            'org_id': org_id,
            'user_id': user_id
        }
    )
    
    if not org_membership:
        raise common.ForbiddenError('You do not have access to this organization')
    
    title = body.get('title', 'New Chat')
    if title:
        title = common.validate_string_length(title, 'title', max_length=255)
    
    kb_ids = body.get('kbIds', [])
    
    # Create the chat session (no workspace_id = user-level chat)
    chat_data = {
        'title': title,
        'ws_id': None,
        'org_id': org_id,
        'created_by': user_id,
        'is_shared_with_workspace': False,
        'metadata': json.dumps({'messageCount': 0}),
        'updated_by': user_id
    }
    
    chat = common.insert_one(
        table='chat_sessions',
        data=chat_data
    )
    
    # Add KB groundings if provided
    if kb_ids:
        for kb_id in kb_ids:
            kb_id = common.validate_uuid(kb_id, 'kbId')
            _add_kb_grounding_internal(chat['id'], kb_id, user_id)
    
    result = _format_chat_response(chat, user_id)
    
    return common.created_response(result)


def handle_get_chat(user_id: str, session_id: str) -> Dict[str, Any]:
    """
    Get chat session details.
    
    Returns chat with metadata, grounded KBs, and message count.
    """
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    # Check permission using RPC
    can_view = common.rpc(
        
'can_view_chat',
        
{
            'p_user_id': user_id,
            'p_session_id': session_id
        }
    )
    
    if not can_view:
        raise common.ForbiddenError('You do not have access to this chat')
    
    chat = common.find_one(
        table='chat_sessions',
        filters={'id': session_id, 'is_deleted': False}
    )
    
    if not chat:
        raise common.NotFoundError('Chat session not found')
    
    result = _format_chat_response(chat, user_id)
    
    # Add grounded KBs
    grounded_kbs = common.rpc(
        
'get_grounded_kbs_for_chat',
        
{'p_session_id': session_id}
    )
    result['groundedKbs'] = [_format_kb_grounding(kb) for kb in grounded_kbs]
    
    # Add message count
    messages = common.find_many(
        table='chat_messages',
        filters={'session_id': session_id},
        select='id'
    )
    result['messageCount'] = len(messages)
    
    return common.success_response(result)


def handle_update_chat(
    event: Dict[str, Any],
    user_id: str,
    session_id: str
) -> Dict[str, Any]:
    """
    Update chat session.
    
    Request body:
    {
        "title": "New Title",
        "isSharedWithWorkspace": true
    }
    
    Only chat owner can update.
    """
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    # Check ownership
    is_owner = common.rpc(
        
'is_chat_owner',
        
{
            'p_user_id': user_id,
            'p_session_id': session_id
        }
    )
    
    if not is_owner:
        raise common.ForbiddenError('Only the chat owner can update this chat')
    
    body = json.loads(event.get('body', '{}'))
    
    update_data = {}
    
    if 'title' in body:
        title = body['title']
        if title:
            update_data['title'] = common.validate_string_length(title, 'title', max_length=255)
    
    if 'isSharedWithWorkspace' in body:
        update_data['is_shared_with_workspace'] = bool(body['isSharedWithWorkspace'])
    
    if not update_data:
        raise common.ValidationError('No valid fields to update')
    
    update_data['updated_by'] = user_id
    
    updated_chat = common.update_one(
        table='chat_sessions',
        filters={'id': session_id},
        data=update_data
    )
    
    result = _format_chat_response(updated_chat, user_id)
    
    return common.success_response(result)


def handle_delete_chat(user_id: str, session_id: str) -> Dict[str, Any]:
    """
    Delete chat session (soft delete).
    
    Only chat owner can delete.
    """
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    # Check ownership
    is_owner = common.rpc(
        
'is_chat_owner',
        
{
            'p_user_id': user_id,
            'p_session_id': session_id
        }
    )
    
    if not is_owner:
        raise common.ForbiddenError('Only the chat owner can delete this chat')
    
    # Soft delete
    common.update_one(
        table='chat_sessions',
        filters={'id': session_id},
        data={
            'is_deleted': True,
            'deleted_at': 'now()',
            'deleted_by': user_id
        }
    )
    
    return common.success_response({
        'message': 'Chat deleted successfully',
        'id': session_id
    })


# =============================================================================
# KB GROUNDING HANDLERS
# =============================================================================

def handle_list_grounded_kbs(user_id: str, session_id: str) -> Dict[str, Any]:
    """
    List knowledge bases grounded to a chat session.
    """
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    # Check permission
    can_view = common.rpc(
        
'can_view_chat',
        
{
            'p_user_id': user_id,
            'p_session_id': session_id
        }
    )
    
    if not can_view:
        raise common.ForbiddenError('You do not have access to this chat')
    
    grounded_kbs = common.rpc(
        
'get_grounded_kbs_for_chat',
        
{'p_session_id': session_id}
    )
    
    result = [_format_kb_grounding(kb) for kb in grounded_kbs]
    
    return common.success_response(result)


def handle_add_kb_grounding(
    event: Dict[str, Any],
    user_id: str,
    session_id: str
) -> Dict[str, Any]:
    """
    Add a knowledge base to a chat session.
    
    Request body:
    {
        "kbId": "uuid"
    }
    
    Only chat owner can add KB grounding.
    """
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    # Check ownership
    is_owner = common.rpc(
        
'is_chat_owner',
        
{
            'p_user_id': user_id,
            'p_session_id': session_id
        }
    )
    
    if not is_owner:
        raise common.ForbiddenError('Only the chat owner can add KB grounding')
    
    body = json.loads(event.get('body', '{}'))
    
    kb_id = body.get('kbId')
    if not kb_id:
        raise common.ValidationError('kbId is required')
    
    kb_id = common.validate_uuid(kb_id, 'kbId')
    
    # Verify user has access to this KB
    available_kbs = common.rpc(
        
'get_available_kbs_for_chat',
        
{
            'p_user_id': user_id,
            'p_session_id': session_id
        }
    )
    
    kb_available = any(kb['kb_id'] == kb_id for kb in available_kbs)
    if not kb_available:
        raise common.ForbiddenError('You do not have access to this knowledge base')
    
    # Check if already grounded
    existing = common.find_one(
        table='chat_session_kbs',
        filters={
            'session_id': session_id,
            'kb_id': kb_id
        }
    )
    
    if existing:
        raise common.ValidationError('This knowledge base is already grounded to the chat')
    
    grounding = _add_kb_grounding_internal(session_id, kb_id, user_id)
    
    return common.created_response({
        'message': 'Knowledge base grounded successfully',
        'id': grounding['id'],
        'kbId': kb_id,
        'sessionId': session_id
    })


def handle_remove_kb_grounding(
    user_id: str,
    session_id: str,
    kb_id: str
) -> Dict[str, Any]:
    """
    Remove a knowledge base from a chat session.
    
    Only chat owner can remove KB grounding.
    """
    session_id = common.validate_uuid(session_id, 'sessionId')
    kb_id = common.validate_uuid(kb_id, 'kbId')
    
    # Check ownership
    is_owner = common.rpc(
        
'is_chat_owner',
        
{
            'p_user_id': user_id,
            'p_session_id': session_id
        }
    )
    
    if not is_owner:
        raise common.ForbiddenError('Only the chat owner can remove KB grounding')
    
    # Find and delete the grounding
    grounding = common.find_one(
        table='chat_session_kbs',
        filters={
            'session_id': session_id,
            'kb_id': kb_id
        }
    )
    
    if not grounding:
        raise common.NotFoundError('KB grounding not found')
    
    common.delete_one(
        table='chat_session_kbs',
        filters={'id': grounding['id']}
    )
    
    return common.success_response({
        'message': 'Knowledge base removed from chat',
        'kbId': kb_id,
        'sessionId': session_id
    })


# =============================================================================
# SHARING HANDLERS
# =============================================================================

def handle_list_shares(user_id: str, session_id: str) -> Dict[str, Any]:
    """
    List shares for a chat session.
    
    Only chat owner or shared users can view shares.
    """
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    # Check permission
    can_view = common.rpc(
        
'can_view_chat',
        
{
            'p_user_id': user_id,
            'p_session_id': session_id
        }
    )
    
    if not can_view:
        raise common.ForbiddenError('You do not have access to this chat')
    
    shares = common.find_many(
        table='chat_shares',
        filters={'session_id': session_id},
        order='created_at.asc'
    )
    
    # Enrich with user info
    result = []
    for share in shares:
        # Get user profile
        profile = common.find_one(
            table='user_profiles',
            filters={'user_id': share['shared_with_user_id']}
        )
        
        result.append({
            'id': share['id'],
            'sessionId': share['session_id'],
            'sharedWithUserId': share['shared_with_user_id'],
            'sharedWithUserEmail': profile.get('email') if profile else None,
            'sharedWithUserName': profile.get('display_name') if profile else None,
            'permissionLevel': share['permission_level'],
            'createdBy': share['created_by'],
            'createdAt': share['created_at']
        })
    
    return common.success_response(result)


def handle_create_share(
    event: Dict[str, Any],
    user_id: str,
    session_id: str
) -> Dict[str, Any]:
    """
    Share a chat session with another user.
    
    Request body:
    {
        "userId": "uuid",
        "permissionLevel": "view" | "edit"  // default: "view"
    }
    
    Only chat owner can share.
    """
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    # Check ownership
    is_owner = common.rpc(
        
'is_chat_owner',
        
{
            'p_user_id': user_id,
            'p_session_id': session_id
        }
    )
    
    if not is_owner:
        raise common.ForbiddenError('Only the chat owner can share this chat')
    
    body = json.loads(event.get('body', '{}'))
    
    share_user_id = body.get('userId')
    if not share_user_id:
        raise common.ValidationError('userId is required')
    
    share_user_id = common.validate_uuid(share_user_id, 'userId')
    
    permission_level = body.get('permissionLevel', 'view')
    if permission_level not in ['view', 'edit']:
        raise common.ValidationError('permissionLevel must be "view" or "edit"')
    
    # Cannot share with yourself
    if share_user_id == user_id:
        raise common.ValidationError('Cannot share with yourself')
    
    # Verify target user exists and is in the same org
    chat = common.find_one(
        table='chat_sessions',
        filters={'id': session_id, 'is_deleted': False}
    )
    
    if not chat:
        raise common.NotFoundError('Chat session not found')
    
    target_membership = common.find_one(
        table='org_members',
        filters={
            'org_id': chat['org_id'],
            'user_id': share_user_id
        }
    )
    
    if not target_membership:
        raise common.ValidationError('User is not a member of this organization')
    
    # Check if already shared
    existing = common.find_one(
        table='chat_shares',
        filters={
            'session_id': session_id,
            'shared_with_user_id': share_user_id
        }
    )
    
    if existing:
        # Update permission level
        updated = common.update_one(
            table='chat_shares',
            filters={'id': existing['id']},
            data={'permission_level': permission_level}
        )
        
        return common.success_response({
            'message': 'Share updated',
            'id': existing['id'],
            'permissionLevel': permission_level
        })
    
    # Create share
    share_data = {
        'session_id': session_id,
        'shared_with_user_id': share_user_id,
        'permission_level': permission_level,
        'created_by': user_id
    }
    
    share = common.insert_one(
        table='chat_shares',
        data=share_data
    )
    
    return common.created_response({
        'message': 'Chat shared successfully',
        'id': share['id'],
        'sessionId': session_id,
        'sharedWithUserId': share_user_id,
        'permissionLevel': permission_level
    })


def handle_delete_share(
    user_id: str,
    session_id: str,
    share_id: str
) -> Dict[str, Any]:
    """
    Remove a share from a chat session.
    
    Chat owner can remove any share.
    Shared users can remove their own share (leave).
    """
    session_id = common.validate_uuid(session_id, 'sessionId')
    share_id = common.validate_uuid(share_id, 'shareId')
    
    # Get the share
    share = common.find_one(
        table='chat_shares',
        filters={
            'id': share_id,
            'session_id': session_id
        }
    )
    
    if not share:
        raise common.NotFoundError('Share not found')
    
    # Check permissions: owner can delete any, user can delete their own
    is_owner = common.rpc(
        
'is_chat_owner',
        
{
            'p_user_id': user_id,
            'p_session_id': session_id
        }
    )
    
    is_self_share = share['shared_with_user_id'] == user_id
    
    if not is_owner and not is_self_share:
        raise common.ForbiddenError('You do not have permission to remove this share')
    
    common.delete_one(
        table='chat_shares',
        filters={'id': share_id}
    )
    
    return common.success_response({
        'message': 'Share removed successfully',
        'id': share_id
    })


# =============================================================================
# FAVORITES HANDLER
# =============================================================================

def handle_toggle_favorite(user_id: str, session_id: str) -> Dict[str, Any]:
    """
    Toggle favorite status for a chat session.
    
    User must have view access to the chat.
    """
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    # Check permission
    can_view = common.rpc(
        
'can_view_chat',
        
{
            'p_user_id': user_id,
            'p_session_id': session_id
        }
    )
    
    if not can_view:
        raise common.ForbiddenError('You do not have access to this chat')
    
    # Check if already favorited
    existing = common.find_one(
        table='chat_favorites',
        filters={
            'session_id': session_id,
            'user_id': user_id
        }
    )
    
    if existing:
        # Remove favorite
        common.delete_one(
            table='chat_favorites',
            filters={'id': existing['id']}
        )
        return common.success_response({
            'message': 'Removed from favorites',
            'isFavorited': False
        })
    else:
        # Add favorite
        favorite = common.insert_one(
            table='chat_favorites',
            data={
                'session_id': session_id,
                'user_id': user_id
            }
        )
        return common.success_response({
            'message': 'Added to favorites',
            'isFavorited': True,
            'id': favorite['id']
        })


# =============================================================================
# SYS ADMIN HANDLERS
# =============================================================================

def handle_sys_get_config(user_id: str) -> Dict[str, Any]:
    """Get platform chat configuration settings."""
    # Auth check done at router level
    config = common.find_one(
        table='chat_cfg_sys_settings',
        filters={'config_key': 'default'}
    )
    
    if not config:
        raise common.NotFoundError('Platform configuration not found')
    
    return common.success_response({
        'defaultTitleFormat': config['default_title_format'],
        'messageRetentionDays': config['message_retention_days'],
        'sessionTimeoutMinutes': config['session_timeout_minutes'],
        'maxMessageLength': config['max_message_length'],
        'maxKbGroundings': config['max_kb_groundings'],
        'defaultAiProvider': config.get('default_ai_provider'),
        'defaultAiModel': config.get('default_ai_model'),
        'streamingConfig': config.get('streaming_config', {}),
        'citationDisplayConfig': config.get('citation_display_config', {})
    })


def handle_sys_update_config(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Update platform chat configuration."""
    # Auth check done at router level
    body = json.loads(event.get('body', '{}'))
    
    update_data = {}
    if 'messageRetentionDays' in body:
        update_data['message_retention_days'] = body['messageRetentionDays']
    if 'sessionTimeoutMinutes' in body:
        update_data['session_timeout_minutes'] = body['sessionTimeoutMinutes']
    if 'maxMessageLength' in body:
        update_data['max_message_length'] = body['maxMessageLength']
    if 'maxKbGroundings' in body:
        update_data['max_kb_groundings'] = body['maxKbGroundings']
    if 'defaultAiProvider' in body:
        update_data['default_ai_provider'] = body['defaultAiProvider']
    if 'defaultAiModel' in body:
        update_data['default_ai_model'] = body['defaultAiModel']
    
    if not update_data:
        raise common.ValidationError('No valid fields to update')
    
    common.update_one(
        table='chat_cfg_sys_settings',
        filters={'config_key': 'default'},
        data=update_data
    )
    
    return common.success_response({'message': 'Configuration updated successfully'})


def handle_sys_get_analytics(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Get platform-wide chat analytics."""
    # Auth check done at router level
    # Call RPC function for analytics
    analytics = common.rpc('get_sys_chat_analytics')

    # Transform snake_case to camelCase for frontend
    return common.success_response({
        'totalSessions': analytics.get('total_sessions', 0),
        'totalMessages': analytics.get('total_messages', 0),
        'activeSessions': {
            'last24Hours': analytics.get('active_sessions', {}).get('last_24_hours', 0),
            'last7Days': analytics.get('active_sessions', {}).get('last_7_days', 0),
            'last30Days': analytics.get('active_sessions', {}).get('last_30_days', 0)
        }
    })


def handle_sys_get_usage_stats(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Get detailed usage statistics."""
    # Auth check done at router level
    # Call RPC function for most active orgs
    active_orgs = common.rpc('get_sys_most_active_orgs', {'p_limit': 10})
    
    return common.success_response({'mostActiveOrgs': active_orgs})


def handle_sys_get_token_stats(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Get token usage statistics."""
    # Auth check done at router level
    # Token usage from metadata
    # This is a placeholder - actual implementation would parse metadata JSONB
    return common.success_response({
        'totalTokensUsed': 0,
        'averageTokensPerMessage': 0,
        'message': 'Token tracking not yet implemented'
    })


def handle_sys_list_sessions(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """List all chat sessions (all orgs)."""
    # Auth check done at router level
    query_params = event.get('queryStringParameters', {}) or {}
    limit = common.validate_integer(query_params.get('limit', 50), 'limit', min_value=1, max_value=100)
    offset = common.validate_integer(query_params.get('offset', 0), 'offset', min_value=0)
    
    sessions = common.find_many(
        table='chat_sessions',
        filters={'is_deleted': False},
        order='updated_at.desc',
        limit=limit,
        offset=offset
    )
    
    return common.success_response([{
        'id': s['id'],
        'title': s['title'],
        'orgId': s['org_id'],
        'workspaceId': s.get('ws_id'),
        'createdBy': s['created_by'],
        'createdAt': s['created_at'],
        'updatedAt': s['updated_at']
    } for s in sessions])


def handle_sys_get_session(user_id: str, session_id: str) -> Dict[str, Any]:
    """Get chat session details (sys admin view)."""
    # Auth check done at router level
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    session = common.find_one(
        table='chat_sessions',
        filters={'id': session_id}
    )
    
    if not session:
        raise common.NotFoundError('Chat session not found')
    
    # Get message count
    messages = common.find_many(
        table='chat_messages',
        filters={'session_id': session_id},
        select='id'
    )
    
    return common.success_response({
        'id': session['id'],
        'title': session['title'],
        'orgId': session['org_id'],
        'workspaceId': session.get('ws_id'),
        'createdBy': session['created_by'],
        'isDeleted': session['is_deleted'],
        'deletedAt': session.get('deleted_at'),
        'messageCount': len(messages),
        'createdAt': session['created_at'],
        'updatedAt': session['updated_at']
    })


def handle_sys_delete_session(user_id: str, session_id: str) -> Dict[str, Any]:
    """Force delete chat session (sys admin)."""
    # Auth check done at router level
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    # Hard delete
    common.delete_one(
        table='chat_sessions',
        filters={'id': session_id}
    )
    
    return common.success_response({
        'message': 'Chat session permanently deleted',
        'id': session_id
    })


# =============================================================================
# ORG ADMIN HANDLERS
# =============================================================================

def handle_org_get_config(user_id: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
    """Get organization chat configuration."""
    # Auth check done at router level
    org_id = user_info.get('org_id')
    if not org_id:
        raise common.ValidationError('User is not associated with an organization')
    
    # Get org-specific config
    org_config = common.find_one(
        table='chat_cfg_org_settings',
        filters={'org_id': org_id}
    )
    
    # Get platform defaults
    platform_config = common.find_one(
        table='chat_cfg_sys_settings',
        filters={'config_key': 'default'}
    )
    
    result = {
        'messageRetentionDays': org_config.get('message_retention_days') if org_config else platform_config['message_retention_days'],
        'maxMessageLength': org_config.get('max_message_length') if org_config else platform_config['max_message_length'],
        'maxKbGroundings': org_config.get('max_kb_groundings') if org_config else platform_config['max_kb_groundings'],
        'sharingPolicy': org_config.get('sharing_policy', {}) if org_config else {},
        'usingPlatformDefaults': org_config is None
    }
    
    return common.success_response(result)


def handle_org_update_config(event: Dict[str, Any], user_id: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
    """Update organization chat configuration."""
    # Auth check done at router level
    org_id = user_info.get('org_id')
    if not org_id:
        raise common.ValidationError('User is not associated with an organization')
    
    body = json.loads(event.get('body', '{}'))
    
    update_data = {'org_id': org_id}
    if 'messageRetentionDays' in body:
        update_data['message_retention_days'] = body['messageRetentionDays']
    if 'maxMessageLength' in body:
        update_data['max_message_length'] = body['maxMessageLength']
    if 'maxKbGroundings' in body:
        update_data['max_kb_groundings'] = body['maxKbGroundings']
    if 'sharingPolicy' in body:
        update_data['sharing_policy'] = json.dumps(body['sharingPolicy'])
    
    # Upsert org config
    existing = common.find_one(
        table='chat_cfg_org_settings',
        filters={'org_id': org_id}
    )
    
    if existing:
        common.update_one(
            table='chat_cfg_org_settings',
            filters={'org_id': org_id},
            data=update_data
        )
    else:
        common.insert_one(
            table='chat_cfg_org_settings',
            data=update_data
        )
    
    return common.success_response({'message': 'Organization configuration updated'})


def handle_org_list_sessions(event: Dict[str, Any], user_info: Dict[str, Any]) -> Dict[str, Any]:
    """List all organization chat sessions."""
    # Auth check done at router level
    org_id = user_info.get('org_id')
    if not org_id:
        raise common.ForbiddenError('Organization context required')
    
    query_params = event.get('queryStringParameters', {}) or {}
    limit = common.validate_integer(query_params.get('limit', 50), 'limit', min_value=1, max_value=100)
    offset = common.validate_integer(query_params.get('offset', 0), 'offset', min_value=0)
    
    sessions = common.find_many(
        table='chat_sessions',
        filters={'org_id': org_id, 'is_deleted': False},
        order='updated_at.desc',
        limit=limit,
        offset=offset
    )
    
    return common.success_response([{
        'id': s['id'],
        'title': s['title'],
        'workspaceId': s.get('ws_id'),
        'createdBy': s['created_by'],
        'createdAt': s['created_at'],
        'updatedAt': s['updated_at']
    } for s in sessions])


def handle_org_get_session(user_info: Dict[str, Any], session_id: str) -> Dict[str, Any]:
    """Get chat session details (org admin view)."""
    # Auth check done at router level
    org_id = user_info.get('org_id')
    if not org_id:
        raise common.ForbiddenError('Organization context required')
    
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    session = common.find_one(
        table='chat_sessions',
        filters={'id': session_id, 'org_id': org_id}
    )
    
    if not session:
        raise common.NotFoundError('Chat session not found in this organization')
    
    # Get message count
    messages = common.find_many(
        table='chat_messages',
        filters={'session_id': session_id},
        select='id'
    )
    
    return common.success_response({
        'id': session['id'],
        'title': session['title'],
        'workspaceId': session.get('ws_id'),
        'createdBy': session['created_by'],
        'isDeleted': session['is_deleted'],
        'deletedAt': session.get('deleted_at'),
        'messageCount': len(messages),
        'createdAt': session['created_at'],
        'updatedAt': session['updated_at']
    })


def handle_org_delete_session(user_info: Dict[str, Any], session_id: str) -> Dict[str, Any]:
    """Delete organization chat session."""
    # Auth check done at router level
    org_id = user_info.get('org_id')
    if not org_id:
        raise common.ForbiddenError('Organization context required')
    
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    session = common.find_one(
        table='chat_sessions',
        filters={'id': session_id, 'org_id': org_id}
    )
    
    if not session:
        raise common.NotFoundError('Chat session not found in this organization')
    
    # Soft delete
    common.update_one(
        table='chat_sessions',
        filters={'id': session_id},
        data={'is_deleted': True, 'deleted_at': 'now()'}
    )
    
    return common.success_response({
        'message': 'Chat session deleted',
        'id': session_id
    })


def handle_org_restore_session(user_info: Dict[str, Any], session_id: str) -> Dict[str, Any]:
    """Restore soft-deleted chat session."""
    # Auth check done at router level
    org_id = user_info.get('org_id')
    if not org_id:
        raise common.ForbiddenError('Organization context required')
    
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    session = common.find_one(
        table='chat_sessions',
        filters={'id': session_id, 'org_id': org_id, 'is_deleted': True}
    )
    
    if not session:
        raise common.NotFoundError('Deleted chat session not found in this organization')
    
    # Restore
    common.update_one(
        table='chat_sessions',
        filters={'id': session_id},
        data={'is_deleted': False, 'deleted_at': None}
    )
    
    return common.success_response({
        'message': 'Chat session restored',
        'id': session_id
    })


def handle_org_get_analytics(event: Dict[str, Any], user_info: Dict[str, Any]) -> Dict[str, Any]:
    """Get organization chat analytics."""
    # Auth check done at router level
    org_id = user_info.get('org_id')
    if not org_id:
        raise common.ForbiddenError('Organization context required')

    # Call RPC function for org analytics
    analytics = common.rpc('get_org_chat_analytics', {'p_org_id': org_id})

    # Transform snake_case to camelCase for frontend
    return common.success_response({
        'totalSessions': analytics.get('total_sessions', 0),
        'totalMessages': analytics.get('total_messages', 0)
    })


def handle_org_get_user_stats(event: Dict[str, Any], user_info: Dict[str, Any]) -> Dict[str, Any]:
    """Get user activity statistics."""
    # Auth check done at router level
    org_id = user_info.get('org_id')
    if not org_id:
        raise common.ForbiddenError('Organization context required')
    
    # Call RPC function for most active users
    active_users = common.rpc('get_org_most_active_users', {'p_org_id': org_id, 'p_limit': 10})
    
    return common.success_response({'mostActiveUsers': active_users})


def handle_org_get_workspace_stats(event: Dict[str, Any], user_info: Dict[str, Any]) -> Dict[str, Any]:
    """Get workspace activity statistics."""
    # Auth check done at router level
    org_id = user_info.get('org_id')
    if not org_id:
        raise common.ForbiddenError('Organization context required')
    
    # Call RPC function for most active workspaces
    active_workspaces = common.rpc('get_org_most_active_workspaces', {'p_org_id': org_id, 'p_limit': 10})
    
    return common.success_response({'mostActiveWorkspaces': active_workspaces})


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _format_chat_response(chat: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Format chat session for API response (camelCase).
    """
    # Determine access type
    if chat['created_by'] == user_id:
        access_type = 'owner'
    else:
        access_type = 'shared'  # Could be refined with workspace check
    
    # Check if favorited
    favorite = common.find_one(
        table='chat_favorites',
        filters={
            'session_id': chat['id'],
            'user_id': user_id
        }
    )
    
    # Parse metadata if string
    metadata = chat.get('metadata', {})
    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except:
            metadata = {}
    
    return {
        'id': chat['id'],
        'title': chat['title'],
        'workspaceId': chat.get('workspace_id'),
        'orgId': chat['org_id'],
        'createdBy': chat['created_by'],
        'isSharedWithWorkspace': chat.get('is_shared_with_workspace', False),
        'metadata': metadata,
        'accessType': access_type,
        'isFavorited': favorite is not None,
        'createdAt': chat.get('created_at'),
        'updatedAt': chat.get('updated_at'),
        'updatedBy': chat.get('updated_by')
    }


def _format_kb_grounding(kb: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format KB grounding for API response (camelCase).
    """
    return {
        'kbId': kb.get('kb_id'),
        'kbName': kb.get('kb_name'),
        'kbScope': kb.get('kb_scope'),
        'isEnabled': kb.get('is_enabled', True),
        'addedAt': kb.get('added_at'),
        'addedBy': kb.get('added_by')
    }


def _enrich_chat_list(chats: List[Dict], user_id: str) -> List[Dict]:
    """
    Enrich list of chats with metadata for list view.
    """
    result = []
    for chat in chats:
        formatted = _format_chat_response(chat, user_id)
        
        # Add message count if not already in metadata
        if 'messageCount' not in formatted['metadata']:
            messages = common.find_many(
                table='chat_messages',
                filters={'session_id': chat['id']},
                select='id'
            )
            formatted['messageCount'] = len(messages)
        else:
            formatted['messageCount'] = formatted['metadata'].get('messageCount', 0)
        
        result.append(formatted)
    
    return result


def _add_kb_grounding_internal(
    session_id: str,
    kb_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    Internal helper to add KB grounding.
    """
    grounding_data = {
        'session_id': session_id,
        'kb_id': kb_id,
        'is_enabled': True,
        'added_by': user_id
    }
    
    return common.insert_one(
        table='chat_session_kbs',
        data=grounding_data
    )


# Note: check_org_admin_access removed - authorization now handled at router level
# Router queries org_members directly and passes org context via user_info
