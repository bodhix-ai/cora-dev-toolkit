"""
KB Base Lambda - Knowledge Base CRUD Operations

Routes - Workspace Scoped:
- GET /ws/{wsId}/kb - Get workspace KB
- POST /ws/{wsId}/kb - Create workspace KB (auto)
- PATCH /ws/{wsId}/kb/{kbId} - Update KB settings
- GET /ws/{wsId}/available-kbs - List toggleable KBs
- POST /ws/{wsId}/kbs/{kbId}/toggle - Toggle KB access

Routes - Chat Scoped:
- GET /chats/{chatId}/kb - Get chat KB
- POST /chats/{chatId}/kb - Create chat KB (auto)
- GET /chats/{chatId}/available-kbs - List toggleable KBs
- POST /chats/{chatId}/kbs/{kbId}/toggle - Toggle KB access

Routes - Org Admin:
- GET /admin/org/kb/bases - List org KBs
- POST /admin/org/kb/bases - Create org KB
- GET /admin/org/kb/{kbId} - Get org KB
- PATCH /admin/org/kb/{kbId} - Update org KB
- DELETE /admin/org/kb/{kbId} - Delete org KB

Routes - Platform Admin:
- GET /admin/sys/kb/bases - List system KBs
- POST /admin/sys/kb/bases - Create system KB
- GET /admin/sys/kb/{kbId} - Get system KB
- PATCH /admin/sys/kb/{kbId} - Update system KB
- DELETE /admin/sys/kb/{kbId} - Delete system KB
- POST /admin/sys/kb/{kbId}/orgs - Associate KB with org
- DELETE /admin/sys/kb/{kbId}/orgs/{orgId} - Remove org association
"""
import json
from typing import Dict, Any, List, Optional
import org_common as common
from kb_common.permissions import can_view_kb, can_edit_kb, can_delete_kb


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle KB base operations with multi-scope support
    
    ADR-019 Compliant: Centralized router auth pattern
    - Auth checks happen at router level, not in handlers
    - Single auth check per request
    
    Args:
        event: API Gateway event
        context: Lambda context
        
    Returns:
        API Gateway response
    """
    # Log incoming request
    print(json.dumps(event, default=str))
    
    try:
        # Extract user info from authorizer
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        
        # Convert Okta UID to Supabase UUID
        supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
        
        # Extract HTTP method
        http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod')
        if not http_method:
            return common.bad_request_response('HTTP method not found in request')
        
        # Extract path and path parameters
        path = event.get('requestContext', {}).get('http', {}).get('path') or event.get('path', '')
        path_params = event.get('pathParameters', {}) or {}
        
        # Route to appropriate handler based on path pattern
        if '/ws/' in path:
            return route_workspace_handlers(event, supabase_user_id, http_method, path, path_params)
        elif '/chats/' in path:
            return route_chat_handlers(event, supabase_user_id, http_method, path, path_params)
        elif '/admin/org/kb' in path:
            return route_org_admin_handlers(event, supabase_user_id, http_method, path, path_params)
        elif '/admin/sys/kb' in path:
            return route_sys_admin_handlers(event, supabase_user_id, http_method, path, path_params)
        elif http_method == 'OPTIONS':
            # Handle CORS preflight
            return common.success_response({})
        else:
            return common.not_found_response('Route not found')
            
    except KeyError as e:
        print(f'KeyError: {str(e)}')
        return common.unauthorized_response(f'Missing user information: {str(e)}')
    except common.NotFoundError as e:
        print(f'NotFoundError during user resolution: {str(e)}')
        return common.unauthorized_response(f'User not found: {str(e)}')
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.NotFoundError as e:
        return common.not_found_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response('Internal server error')


def route_workspace_handlers(event: Dict[str, Any], user_id: str, method: str, path: str, path_params: Dict[str, str]) -> Dict[str, Any]:
    """
    Route workspace-scoped requests
    
    ADR-019c: Two-step auth pattern
    - Step 1: Workspace membership check
    - Step 2: Resource permission check (where applicable)
    """
    workspace_id = path_params.get('wsId')
    if not workspace_id:
        return common.bad_request_response('Workspace ID is required')
    
    workspace_id = common.validate_uuid(workspace_id, 'workspace_id')
    
    # ========================================
    # ADR-019c: STEP 1 - Workspace Membership
    # ========================================
    if not _is_ws_member(workspace_id, user_id):
        return common.forbidden_response('Not a workspace member')
    
    # For write operations, require ws_admin
    is_write_operation = method in ['POST', 'PATCH', 'DELETE']
    if is_write_operation and '/toggle' in path:
        if not _is_ws_admin_or_owner(workspace_id, user_id):
            return common.forbidden_response('Only workspace admins can toggle KB access')
    
    # ========================================
    # ROUTE TO HANDLERS (no auth checks in handlers)
    # ========================================
    if '/available-kbs' in path:
        if method == 'GET':
            return handle_list_available_kbs_for_workspace(user_id, workspace_id)
    elif '/kbs/' in path and '/toggle' in path:
        kb_id = path_params.get('kbId')
        if not kb_id:
            return common.bad_request_response('KB ID is required')
        if method == 'POST':
            return handle_toggle_kb_for_workspace(event, user_id, workspace_id, kb_id)
    elif path.endswith(f'/ws/{workspace_id}/kb'):
        if method == 'GET':
            return handle_get_workspace_kb(user_id, workspace_id)
        elif method == 'POST':
            # Require admin for KB creation
            if not _is_ws_admin_or_owner(workspace_id, user_id):
                return common.forbidden_response('Only workspace admins can create workspace KBs')
            return handle_create_workspace_kb(event, user_id, workspace_id)
    elif '/kb/' in path:
        kb_id = path_params.get('kbId')
        if not kb_id:
            return common.bad_request_response('KB ID is required')
        if method == 'PATCH':
            # Require admin for KB update
            if not _is_ws_admin_or_owner(workspace_id, user_id):
                return common.forbidden_response('Only workspace admins can update workspace KBs')
            return handle_update_kb(event, user_id, kb_id)
    
    return common.method_not_allowed_response()


def route_chat_handlers(event: Dict[str, Any], user_id: str, method: str, path: str, path_params: Dict[str, str]) -> Dict[str, Any]:
    """
    Route chat-scoped requests
    
    ADR-019: Centralized auth at router level
    """
    chat_id = path_params.get('chatId')
    if not chat_id:
        return common.bad_request_response('Chat ID is required')
    
    chat_id = common.validate_uuid(chat_id, 'chat_id')
    
    # ========================================
    # CENTRALIZED AUTH CHECK (ADR-019)
    # ========================================
    if not check_chat_access(user_id, chat_id):
        return common.forbidden_response('You do not have access to this chat')
    
    # ========================================
    # ROUTE TO HANDLERS (no auth checks in handlers)
    # ========================================
    if '/available-kbs' in path:
        if method == 'GET':
            return handle_list_available_kbs_for_chat(user_id, chat_id)
    elif '/kbs/' in path and '/toggle' in path:
        kb_id = path_params.get('kbId')
        if not kb_id:
            return common.bad_request_response('KB ID is required')
        if method == 'POST':
            return handle_toggle_kb_for_chat(event, user_id, chat_id, kb_id)
    elif path.endswith(f'/chats/{chat_id}/kb'):
        if method == 'GET':
            return handle_get_chat_kb(user_id, chat_id)
        elif method == 'POST':
            return handle_create_chat_kb(event, user_id, chat_id)
    
    return common.method_not_allowed_response()


def route_org_admin_handlers(event: Dict[str, Any], user_id: str, method: str, path: str, path_params: Dict[str, str]) -> Dict[str, Any]:
    """
    Route org admin requests
    
    ADR-019: Centralized auth at router level
    - Extract org context from event
    - Check org admin access ONCE
    - Handlers do NOT contain auth checks
    """
    kb_id = path_params.get('kbId')
    
    # ========================================
    # CENTRALIZED ORG CONTEXT EXTRACTION (ADR-019)
    # ========================================
    org_id = common.get_org_context_from_event(event)
    if not org_id:
        return common.bad_request_response('Organization context required. Pass orgId in query params or request body.')
    
    # ========================================
    # CENTRALIZED AUTH CHECK (ADR-019)
    # ========================================
    if not common.check_org_admin(user_id, org_id):
        return common.forbidden_response('Organization admin access required')
    
    # ========================================
    # ROUTE TO HANDLERS (no auth checks in handlers)
    # ========================================
    if kb_id:
        kb_id = common.validate_uuid(kb_id, 'kb_id')
        if method == 'GET':
            return handle_get_org_kb(kb_id, org_id)
        elif method == 'PATCH':
            return handle_update_kb(event, user_id, kb_id)
        elif method == 'DELETE':
            return handle_delete_kb(user_id, kb_id, 'org', org_id)
    else:
        if method == 'GET':
            return handle_list_org_kbs(org_id)
        elif method == 'POST':
            return handle_create_org_kb(event, user_id, org_id)
    
    return common.method_not_allowed_response()


def route_sys_admin_handlers(event: Dict[str, Any], user_id: str, method: str, path: str, path_params: Dict[str, str]) -> Dict[str, Any]:
    """
    Route platform admin requests
    
    ADR-019: Centralized auth at router level
    - Check sys admin access ONCE at router level
    - Handlers do NOT contain auth checks
    """
    kb_id = path_params.get('kbId')
    
    # ========================================
    # CENTRALIZED AUTH CHECK (ADR-019)
    # ========================================
    if not common.check_sys_admin(user_id):
        return common.forbidden_response('Platform admin access required')
    
    # ========================================
    # ROUTE TO HANDLERS (no auth checks in handlers)
    # ========================================
    if kb_id and '/orgs' in path:
        kb_id = common.validate_uuid(kb_id, 'kb_id')
        org_id = path_params.get('orgId')
        if org_id:
            org_id = common.validate_uuid(org_id, 'org_id')
            if method == 'DELETE':
                return handle_remove_sys_kb_org(user_id, kb_id, org_id)
        else:
            if method == 'POST':
                return handle_associate_sys_kb_org(event, user_id, kb_id)
    elif kb_id:
        kb_id = common.validate_uuid(kb_id, 'kb_id')
        if method == 'GET':
            return handle_get_sys_kb(kb_id)
        elif method == 'PATCH':
            return handle_update_kb(event, user_id, kb_id)
        elif method == 'DELETE':
            return handle_delete_kb(user_id, kb_id, 'sys')
    else:
        if method == 'GET':
            return handle_list_sys_kbs()
        elif method == 'POST':
            return handle_create_sys_kb(event, user_id)
    
    return common.method_not_allowed_response()


# ============================================================================
# Workspace Scope Handlers
# NOTE: Auth checks are done at router level per ADR-019
# ============================================================================

def handle_get_workspace_kb(user_id: str, workspace_id: str) -> Dict[str, Any]:
    """
    Get workspace KB (auto-create if doesn't exist)
    
    Returns workspace-scoped KB or creates one on first access
    
    Auth: Checked at router level (workspace member access)
    """
    # Get workspace to find org_id
    workspace = common.find_one(
        table='workspaces',
        filters={'id': workspace_id}
    )
    
    if not workspace:
        raise common.NotFoundError('Workspace not found')
    
    # Try to find existing workspace KB
    kb = common.find_one(
        table='kb_bases',
        filters={
            'ws_id': workspace_id,
            'scope': 'workspace',
            'is_deleted': False
        }
    )
    
    if kb:
        # Enrich with stats
        kb_data = format_kb_record(kb)
        kb_data['stats'] = get_kb_stats(kb['id'])
        return common.success_response(kb_data)
    
    # No KB found, return null (will be created on first document upload)
    return common.success_response(None)


def handle_create_workspace_kb(event: Dict[str, Any], user_id: str, workspace_id: str) -> Dict[str, Any]:
    """
    Create workspace KB (called automatically on first document upload)
    
    Request body:
    {
        "name": "Workspace Documents",
        "description": "Auto-created workspace KB"
    }
    
    Auth: Checked at router level (ws_admin access)
    """
    # Get workspace
    workspace = common.find_one(
        table='workspaces',
        filters={'id': workspace_id}
    )
    
    if not workspace:
        raise common.NotFoundError('Workspace not found')
    
    # Check if KB already exists
    existing_kb = common.find_one(
        table='kb_bases',
        filters={
            'ws_id': workspace_id,
            'scope': 'workspace',
            'is_deleted': False
        }
    )
    
    if existing_kb:
        raise common.ValidationError('Workspace KB already exists')
    
    # Parse request body
    body = json.loads(event.get('body', '{}'))
    
    name = body.get('name', f'{workspace.get("name", "Workspace")} Documents')
    description = body.get('description', 'Auto-created workspace knowledge base')
    
    # Create KB
    kb_data = {
        'name': name,
        'description': description,
        'scope': 'workspace',
        'org_id': workspace['org_id'],
        'ws_id': workspace_id,
        'config': {
            'whoCanUpload': 'all_members',
            'autoIndex': True,
            'chunkSize': 1000,
            'chunkOverlap': 200
        },
        'is_enabled': True,
        'created_by': user_id
    }
    
    kb = common.insert_one(
        table='kb_bases',
        data=kb_data
    )
    
    result = format_kb_record(kb)
    result['stats'] = get_kb_stats(kb['id'])
    
    return common.created_response(result)


def handle_list_available_kbs_for_workspace(user_id: str, workspace_id: str) -> Dict[str, Any]:
    """
    List all KBs available for workspace (workspace + org + system KBs with inheritance chain)
    
    Returns KBs grouped by source (workspace, org, sys) with enablement status
    
    Auth: Checked at router level (workspace member access)
    """
    # Use RPC function to get accessible KBs
    result = common.rpc(
        'get_accessible_kbs_for_workspace',
        {'p_user_id': user_id, 'p_ws_id': workspace_id}
    )
    
    # Format response - wrap KB fields in 'kb' object to match AvailableKb type
    kbs = []
    for row in result:
        kb_data = {
            'kb': {
                'id': row['kb_id'],
                'name': row['kb_name'],
                'scope': row['kb_scope'],
                'description': row.get('description'),
                'orgId': row.get('org_id'),
                'workspaceId': row.get('workspace_id'),
                'chatSessionId': row.get('chat_session_id'),
                'config': row.get('config', {}),
                'isEnabled': row.get('kb_is_enabled', True),
                'createdAt': row.get('created_at'),
                'createdBy': row.get('created_by'),
            },
            'isEnabled': row['is_enabled'],
            'source': row['source']
        }
        kbs.append(kb_data)
    
    return common.success_response(kbs)


def handle_toggle_kb_for_workspace(event: Dict[str, Any], user_id: str, workspace_id: str, kb_id: str) -> Dict[str, Any]:
    """
    Toggle KB access for workspace
    
    Request body:
    {
        "isEnabled": true/false
    }
    
    Auth: Checked at router level (ws_admin access)
    """
    kb_id = common.validate_uuid(kb_id, 'kb_id')
    
    # Parse request body
    body = json.loads(event.get('body', '{}'))
    is_enabled = body.get('isEnabled', True)
    
    # Check if KB is org or sys scoped (workspace KB can't be toggled)
    kb = common.find_one(
        table='kb_bases',
        filters={'id': kb_id, 'is_deleted': False}
    )
    
    if not kb:
        raise common.NotFoundError('KB not found')
    
    if kb['scope'] == 'workspace':
        raise common.ValidationError('Cannot toggle workspace-scoped KB')
    
    # Check if toggle already exists
    existing_toggle = common.find_one(
        table='kb_access_ws',
        filters={
            'kb_id': kb_id,
            'ws_id': workspace_id
        }
    )
    
    if existing_toggle:
        # Update existing
        updated = common.update_one(
            table='kb_access_ws',
            filters={'id': existing_toggle['id']},
            data={'is_enabled': is_enabled}
        )
    else:
        # Create new toggle
        updated = common.insert_one(
            table='kb_access_ws',
            data={
                'kb_id': kb_id,
                'ws_id': workspace_id,
                'is_enabled': is_enabled,
                'created_by': user_id
            }
        )
    
    return common.success_response({
        'kbId': kb_id,
        'workspaceId': workspace_id,
        'isEnabled': is_enabled
    })


# ============================================================================
# Chat Scope Handlers
# NOTE: Auth checks are done at router level per ADR-019
# ============================================================================

def handle_get_chat_kb(user_id: str, chat_id: str) -> Dict[str, Any]:
    """
    Get chat KB (auto-create if doesn't exist)
    
    Auth: Checked at router level (chat access)
    """
    # Get chat session to find org_id
    chat = common.find_one(
        table='chat_sessions',
        filters={'id': chat_id}
    )
    
    if not chat:
        raise common.NotFoundError('Chat not found')
    
    # Try to find existing chat KB
    kb = common.find_one(
        table='kb_bases',
        filters={
            'chat_session_id': chat_id,
            'scope': 'chat',
            'is_deleted': False
        }
    )
    
    if kb:
        kb_data = format_kb_record(kb)
        kb_data['stats'] = get_kb_stats(kb['id'])
        return common.success_response(kb_data)
    
    # No KB found, return null
    return common.success_response(None)


def handle_create_chat_kb(event: Dict[str, Any], user_id: str, chat_id: str) -> Dict[str, Any]:
    """
    Create chat KB (called automatically on first document upload)
    
    Auth: Checked at router level (chat access)
    """
    # Get chat session
    chat = common.find_one(
        table='chat_sessions',
        filters={'id': chat_id}
    )
    
    if not chat:
        raise common.NotFoundError('Chat not found')
    
    # Check if KB already exists
    existing_kb = common.find_one(
        table='kb_bases',
        filters={
            'chat_session_id': chat_id,
            'scope': 'chat',
            'is_deleted': False
        }
    )
    
    if existing_kb:
        raise common.ValidationError('Chat KB already exists')
    
    # Parse request body
    body = json.loads(event.get('body', '{}'))
    
    name = body.get('name', f'Chat {chat_id[:8]} Documents')
    description = body.get('description', 'Auto-created chat knowledge base')
    
    # Create KB
    kb_data = {
        'name': name,
        'description': description,
        'scope': 'chat',
        'org_id': chat.get('org_id'),
        'chat_session_id': chat_id,
        'config': {
            'whoCanUpload': 'all_members',
            'autoIndex': True
        },
        'is_enabled': True,
        'created_by': user_id
    }
    
    kb = common.insert_one(
        table='kb_bases',
        data=kb_data
    )
    
    result = format_kb_record(kb)
    result['stats'] = get_kb_stats(kb['id'])
    
    return common.created_response(result)


def handle_list_available_kbs_for_chat(user_id: str, chat_id: str) -> Dict[str, Any]:
    """
    List all KBs available for chat
    
    Auth: Checked at router level (chat access)
    """
    # Get chat's workspace context
    chat = common.find_one(
        table='chat_sessions',
        filters={'id': chat_id}
    )
    
    if not chat or not chat.get('workspace_id'):
        return common.success_response([])
    
    # Use workspace RPC to get available KBs
    result = common.rpc(
        'get_accessible_kbs_for_workspace',
        {'p_user_id': user_id, 'p_ws_id': chat['workspace_id']}
    )
    
    # Add chat-specific toggles - wrap KB fields in 'kb' object to match AvailableKb type
    kbs = []
    for row in result:
        # Check if KB is toggled for this chat
        chat_toggle = common.find_one(
            table='kb_access_chats',
            filters={
                'kb_id': row['kb_id'],
                'chat_session_id': chat_id
            }
        )
        
        kb_data = {
            'kb': {
                'id': row['kb_id'],
                'name': row['kb_name'],
                'scope': row['kb_scope'],
                'description': row.get('description'),
                'orgId': row.get('org_id'),
                'workspaceId': row.get('workspace_id'),
                'chatSessionId': row.get('chat_session_id'),
                'config': row.get('config', {}),
                'isEnabled': row.get('kb_is_enabled', True),
                'createdAt': row.get('created_at'),
                'createdBy': row.get('created_by'),
            },
            'isEnabled': chat_toggle['is_enabled'] if chat_toggle else False,
            'source': row['source']
        }
        kbs.append(kb_data)
    
    return common.success_response(kbs)


def handle_toggle_kb_for_chat(event: Dict[str, Any], user_id: str, chat_id: str, kb_id: str) -> Dict[str, Any]:
    """
    Toggle KB access for chat
    
    Auth: Checked at router level (chat access)
    """
    kb_id = common.validate_uuid(kb_id, 'kb_id')
    
    # Parse request body
    body = json.loads(event.get('body', '{}'))
    is_enabled = body.get('isEnabled', True)
    
    # Check if toggle exists
    existing_toggle = common.find_one(
        table='kb_access_chats',
        filters={
            'kb_id': kb_id,
            'chat_session_id': chat_id
        }
    )
    
    if existing_toggle:
        # Update existing
        updated = common.update_one(
            table='kb_access_chats',
            filters={'id': existing_toggle['id']},
            data={'is_enabled': is_enabled, 'is_override': True}
        )
    else:
        # Create new toggle
        updated = common.insert_one(
            table='kb_access_chats',
            data={
                'kb_id': kb_id,
                'chat_session_id': chat_id,
                'is_enabled': is_enabled,
                'is_override': True
            }
        )
    
    return common.success_response({
        'kbId': kb_id,
        'chatId': chat_id,
        'isEnabled': is_enabled
    })


# ============================================================================
# Org Admin Handlers
# NOTE: Auth checks are done at router level per ADR-019
# ============================================================================

def handle_list_org_kbs(org_id: str) -> Dict[str, Any]:
    """
    List org KBs
    
    Auth: Checked at router level (org_admin access)
    """
    # Get org KBs
    kbs = common.find_many(
        table='kb_bases',
        filters={
            'org_id': org_id,
            'scope': 'org',
            'is_deleted': False
        },
        order='created_at.desc'
    )
    
    # Format with stats
    result = []
    for kb in kbs:
        kb_data = format_kb_record(kb)
        kb_data['stats'] = get_kb_stats(kb['id'])
        result.append(kb_data)
    
    return common.success_response(result)


def handle_create_org_kb(event: Dict[str, Any], user_id: str, org_id: str) -> Dict[str, Any]:
    """
    Create org KB
    
    Request body:
    {
        "name": "KB Name",
        "description": "Optional description",
        "config": {
            "whoCanUpload": "admin" | "all_members"
        }
    }
    
    Auth: Checked at router level (org_admin access)
    """
    body = json.loads(event.get('body', '{}'))
    
    name = common.validate_required(body.get('name'), 'name')
    description = body.get('description', '')
    config = body.get('config', {})
    
    # Create KB
    kb_data = {
        'name': name,
        'description': description,
        'scope': 'org',
        'org_id': org_id,
        'config': {
            'whoCanUpload': config.get('whoCanUpload', 'admin'),
            'autoIndex': config.get('autoIndex', True),
            'chunkSize': config.get('chunkSize', 1000),
            'chunkOverlap': config.get('chunkOverlap', 200)
        },
        'is_enabled': True,
        'created_by': user_id
    }
    
    kb = common.insert_one(
        table='kb_bases',
        data=kb_data
    )
    
    # Create org-level enablement record
    common.insert_one(
        table='kb_access_orgs',
        data={
            'kb_id': kb['id'],
            'org_id': org_id,
            'is_enabled': True,
            'created_by': user_id
        }
    )
    
    result = format_kb_record(kb)
    result['stats'] = get_kb_stats(kb['id'])
    
    return common.created_response(result)


def handle_get_org_kb(kb_id: str, org_id: str) -> Dict[str, Any]:
    """
    Get org KB details
    
    Auth: Checked at router level (org_admin access)
    """
    kb = common.find_one(
        table='kb_bases',
        filters={'id': kb_id, 'scope': 'org', 'is_deleted': False}
    )
    
    if not kb:
        raise common.NotFoundError('KB not found')
    
    # Verify KB belongs to the org
    if kb.get('org_id') != org_id:
        raise common.ForbiddenError('KB does not belong to this organization')
    
    result = format_kb_record(kb)
    result['stats'] = get_kb_stats(kb['id'])
    
    return common.success_response(result)


# ============================================================================
# Platform Admin Handlers
# NOTE: Auth checks are done at router level per ADR-019
# ============================================================================

def handle_list_sys_kbs() -> Dict[str, Any]:
    """
    List system KBs (platform admin only)
    
    Auth: Checked at router level (sys_admin access)
    """
    kbs = common.find_many(
        table='kb_bases',
        filters={'scope': 'sys', 'is_deleted': False},
        order='created_at.desc'
    )
    
    result = []
    for kb in kbs:
        kb_data = format_kb_record(kb)
        kb_data['stats'] = get_kb_stats(kb['id'])
        
        # Add org association count
        org_count = len(common.find_many(
            table='kb_access_sys',
            filters={'kb_id': kb['id'], 'is_enabled': True}
        ))
        kb_data['orgCount'] = org_count
        
        result.append(kb_data)
    
    return common.success_response(result)


def handle_create_sys_kb(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Create system KB (platform admin only)
    
    Auth: Checked at router level (sys_admin access)
    """
    body = json.loads(event.get('body', '{}'))
    
    name = common.validate_required(body.get('name'), 'name')
    description = body.get('description', '')
    config = body.get('config', {})
    
    # Create KB
    kb_data = {
        'name': name,
        'description': description,
        'scope': 'sys',
        'config': {
            'whoCanUpload': 'admin',
            'autoIndex': config.get('autoIndex', True),
            'chunkSize': config.get('chunkSize', 1000),
            'chunkOverlap': config.get('chunkOverlap', 200)
        },
        'is_enabled': True,
        'created_by': user_id
    }
    
    kb = common.insert_one(
        table='kb_bases',
        data=kb_data
    )
    
    result = format_kb_record(kb)
    result['stats'] = get_kb_stats(kb['id'])
    result['orgCount'] = 0
    
    return common.created_response(result)


def handle_get_sys_kb(kb_id: str) -> Dict[str, Any]:
    """
    Get system KB details (platform admin only)
    
    Auth: Checked at router level (sys_admin access)
    """
    kb = common.find_one(
        table='kb_bases',
        filters={'id': kb_id, 'scope': 'sys', 'is_deleted': False}
    )
    
    if not kb:
        raise common.NotFoundError('KB not found')
    
    result = format_kb_record(kb)
    result['stats'] = get_kb_stats(kb['id'])
    
    # Add org associations
    org_associations = common.find_many(
        table='kb_access_sys',
        filters={'kb_id': kb_id}
    )
    
    result['orgAssociations'] = [
        {
            'orgId': assoc['org_id'],
            'isEnabled': assoc['is_enabled'],
            'createdAt': assoc.get('created_at')
        }
        for assoc in org_associations
    ]
    
    return common.success_response(result)


def handle_associate_sys_kb_org(event: Dict[str, Any], user_id: str, kb_id: str) -> Dict[str, Any]:
    """
    Associate system KB with org
    
    Request body:
    {
        "orgId": "uuid"
    }
    
    Auth: Checked at router level (sys_admin access)
    """
    body = json.loads(event.get('body', '{}'))
    org_id = common.validate_required(body.get('orgId'), 'orgId')
    org_id = common.validate_uuid(org_id, 'orgId')
    
    # Check if association exists
    existing = common.find_one(
        table='kb_access_sys',
        filters={'kb_id': kb_id, 'org_id': org_id}
    )
    
    if existing:
        # Update to enabled
        updated = common.update_one(
            table='kb_access_sys',
            filters={'id': existing['id']},
            data={'is_enabled': True}
        )
    else:
        # Create new association
        updated = common.insert_one(
            table='kb_access_sys',
            data={
                'kb_id': kb_id,
                'org_id': org_id,
                'is_enabled': True,
                'created_by': user_id
            }
        )
    
    return common.success_response({
        'kbId': kb_id,
        'orgId': org_id,
        'isEnabled': True
    })


def handle_remove_sys_kb_org(user_id: str, kb_id: str, org_id: str) -> Dict[str, Any]:
    """
    Remove system KB org association
    
    Auth: Checked at router level (sys_admin access)
    """
    # Find association
    association = common.find_one(
        table='kb_access_sys',
        filters={'kb_id': kb_id, 'org_id': org_id}
    )
    
    if not association:
        raise common.NotFoundError('Association not found')
    
    # Disable (don't delete to preserve audit trail)
    common.update_one(
        table='kb_access_sys',
        filters={'id': association['id']},
        data={'is_enabled': False}
    )
    
    return common.success_response({
        'kbId': kb_id,
        'orgId': org_id,
        'isEnabled': False
    })


# ============================================================================
# Common Update/Delete Handlers
# NOTE: Auth checks are done at router level per ADR-019
# ============================================================================

def handle_update_kb(event: Dict[str, Any], user_id: str, kb_id: str) -> Dict[str, Any]:
    """
    Update KB (name, description, config)
    
    Request body:
    {
        "name": "New Name",
        "description": "New description",
        "config": {...}
    }
    
    Auth: Checked at router level
    """
    kb = common.find_one(
        table='kb_bases',
        filters={'id': kb_id, 'is_deleted': False}
    )
    
    if not kb:
        raise common.NotFoundError('KB not found')
    
    # Parse request body
    body = json.loads(event.get('body', '{}'))
    
    update_data = {}
    
    if 'name' in body:
        update_data['name'] = common.validate_required(body['name'], 'name')
    
    if 'description' in body:
        update_data['description'] = body['description']
    
    if 'config' in body:
        # Merge with existing config
        existing_config = kb.get('config', {})
        existing_config.update(body['config'])
        update_data['config'] = existing_config
    
    if update_data:
        update_data['updated_by'] = user_id
        updated_kb = common.update_one(
            table='kb_bases',
            filters={'id': kb_id},
            data=update_data
        )
    else:
        updated_kb = kb
    
    result = format_kb_record(updated_kb)
    result['stats'] = get_kb_stats(kb_id)
    
    return common.success_response(result)


def handle_delete_kb(user_id: str, kb_id: str, expected_scope: str, org_id: str = None) -> Dict[str, Any]:
    """
    Soft delete KB
    
    Auth: Checked at router level
    """
    kb = common.find_one(
        table='kb_bases',
        filters={'id': kb_id, 'is_deleted': False}
    )
    
    if not kb:
        raise common.NotFoundError('KB not found')
    
    if kb['scope'] != expected_scope:
        raise common.ForbiddenError('Invalid scope for this operation')
    
    # For org KBs, verify it belongs to the right org
    if expected_scope == 'org' and org_id and kb.get('org_id') != org_id:
        raise common.ForbiddenError('KB does not belong to this organization')
    
    # Soft delete
    common.update_one(
        table='kb_bases',
        filters={'id': kb_id},
        data={
            'is_deleted': True,
            'deleted_at': 'NOW()',
            'deleted_by': user_id
        }
    )
    
    return common.success_response({
        'message': 'KB deleted successfully',
        'id': kb_id
    })


# ============================================================================
# Helper Functions
# ============================================================================

def format_kb_record(kb: Dict[str, Any]) -> Dict[str, Any]:
    """Format KB record to camelCase for API response"""
    return {
        'id': kb['id'],
        'name': kb['name'],
        'description': kb.get('description'),
        'scope': kb['scope'],
        'orgId': kb.get('org_id'),
        'workspaceId': kb.get('workspace_id'),
        'chatSessionId': kb.get('chat_session_id'),
        'config': kb.get('config', {}),
        'isEnabled': kb.get('is_enabled', True),
        'createdAt': kb.get('created_at'),
        'createdBy': kb.get('created_by'),
        'updatedAt': kb.get('updated_at'),
        'updatedBy': kb.get('updated_by')
    }


def get_kb_stats(kb_id: str) -> Dict[str, Any]:
    """Get KB statistics (document count, chunk count, total size)"""
    # Get document stats
    docs = common.find_many(
        table='kb_docs',
        filters={'kb_id': kb_id, 'is_deleted': False}
    )
    
    doc_count = len(docs)
    total_size = sum(doc.get('file_size', 0) for doc in docs)
    
    # Get chunk count
    chunks = common.find_many(
        table='kb_chunks',
        filters={'kb_id': kb_id},
        select='id'
    )
    
    chunk_count = len(chunks)
    
    return {
        'documentCount': doc_count,
        'chunkCount': chunk_count,
        'totalSize': total_size
    }


def _is_ws_member(workspace_id: str, user_id: str) -> bool:
    """Check if user is a member of the workspace."""
    result = common.rpc(
        function_name='is_ws_member',
        params={'p_user_id': user_id, 'p_ws_id': workspace_id}
    )
    return result is True


def _is_ws_admin_or_owner(workspace_id: str, user_id: str) -> bool:
    """Check if user is admin or owner of the workspace."""
    result = common.rpc(
        function_name='is_ws_admin_or_owner',
        params={'p_user_id': user_id, 'p_ws_id': workspace_id}
    )
    return result is True


def check_chat_access(user_id: str, chat_id: str) -> bool:
    """Check if user has access to chat (owner, workspace member, or shared)"""
    try:
        # Get chat session
        chat = common.find_one(
            table='chat_sessions',
            filters={'id': chat_id, 'is_deleted': False}
        )
        
        if not chat:
            return False
        
        # Check if user is the owner
        if chat.get('created_by') == user_id:
            return True
        
        # Check if chat is shared with workspace and user is workspace member
        if chat.get('is_shared_with_workspace') and chat.get('workspace_id'):
            membership = common.find_one(
                table='ws_members',
                filters={'ws_id': chat['workspace_id'], 'user_id': user_id}
            )
            if membership:
                return True
        
        # Check if user has explicit share access
        share = common.find_one(
            table='chat_shares',
            filters={'session_id': chat_id, 'shared_with_user_id': user_id}
        )
        
        return share is not None
    
    except Exception as e:
        print(f"Error checking chat access: {str(e)}")
        return False
