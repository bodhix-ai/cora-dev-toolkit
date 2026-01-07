"""
Workspace Module - Main Handler

This Lambda function provides API endpoints for workspace management including
CRUD operations, member management, and favorites. It follows CORA patterns
with standard auth and role-based authorization.

Routes - Workspaces:
- GET /ws - List user's workspaces
- POST /ws - Create new workspace
- GET /ws/{id} - Get workspace details
- PUT /ws/{id} - Update workspace
- DELETE /ws/{id} - Soft delete workspace
- POST /ws/{id}/restore - Restore deleted workspace

Routes - Members:
- GET /ws/{id}/members - List workspace members
- POST /ws/{id}/members - Add member
- PUT /ws/{wsId}/members/{memberId} - Update member role
- DELETE /ws/{wsId}/members/{memberId} - Remove member

Routes - Favorites:
- POST /ws/{id}/favorite - Toggle favorite
- GET /ws/favorites - List user's favorites
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

import org_common as common

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))


def lambda_handler(event: Dict[str, Any], context: object) -> Dict[str, Any]:
    """
    Main Lambda handler with route dispatcher.
    
    Args:
        event: API Gateway proxy event
        context: Lambda context
    
    Returns:
        API Gateway proxy response
    """
    try:
        # Extract route information
        http_method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method', ''))
        path = event.get('path', event.get('rawPath', ''))
        path_parameters = event.get('pathParameters') or {}
        
        logger.info(f"Request: {http_method} {path}")
        
        # Standard CORA auth extraction
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
        
        # Get org_id from query parameters (required for workspace operations)
        query_params = event.get('queryStringParameters') or {}
        org_id = query_params.get('org_id')

        if not org_id:
            return common.bad_request_response('org_id query parameter is required')
        
        logger.info(f"Request from org_id: {org_id}, user_id: {supabase_user_id}")
        
        # Route dispatcher - Workspaces
        # Note: path is /ws, /ws/{id}, /ws/{id}/members, etc.
        if path == '/ws' and http_method == 'GET':
            return handle_list_workspaces(org_id, supabase_user_id, event)
        
        elif path == '/ws' and http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_create_workspace(org_id, supabase_user_id, body)
        
        elif path.endswith('/restore') and http_method == 'POST':
            workspace_id = path_parameters.get('id')
            return handle_restore_workspace(workspace_id, supabase_user_id)
        
        elif path.endswith('/favorite') and http_method == 'POST':
            workspace_id = path_parameters.get('id')
            return handle_toggle_favorite(workspace_id, supabase_user_id)
        
        elif path.endswith('/members') and http_method == 'GET':
            workspace_id = path_parameters.get('id')
            return handle_list_members(workspace_id, supabase_user_id)
        
        elif path.endswith('/members') and http_method == 'POST':
            workspace_id = path_parameters.get('id')
            body = json.loads(event.get('body', '{}'))
            return handle_add_member(workspace_id, supabase_user_id, body)
        
        elif '/members/' in path and http_method == 'PUT':
            workspace_id = path_parameters.get('wsId')
            member_id = path_parameters.get('memberId')
            body = json.loads(event.get('body', '{}'))
            return handle_update_member(workspace_id, member_id, supabase_user_id, body)
        
        elif '/members/' in path and http_method == 'DELETE':
            workspace_id = path_parameters.get('wsId')
            member_id = path_parameters.get('memberId')
            return handle_remove_member(workspace_id, member_id, supabase_user_id)
        
        elif path == '/ws/favorites' and http_method == 'GET':
            return handle_list_favorites(org_id, supabase_user_id)
        
        elif path.startswith('/ws/') and http_method == 'GET':
            workspace_id = path_parameters.get('id')
            return handle_get_workspace(workspace_id, supabase_user_id)
        
        elif path.startswith('/ws/') and http_method == 'PUT':
            workspace_id = path_parameters.get('id')
            body = json.loads(event.get('body', '{}'))
            return handle_update_workspace(workspace_id, supabase_user_id, body)
        
        elif path.startswith('/ws/') and http_method == 'DELETE':
            workspace_id = path_parameters.get('id')
            return handle_delete_workspace(workspace_id, supabase_user_id)
        
        else:
            return common.not_found_response(f'Route not found: {http_method} {path}')
    
    except KeyError as e:
        logger.exception(f'Missing user information: {str(e)}')
        return common.unauthorized_response(f'Missing user information: {str(e)}')
    
    except common.NotFoundError as e:
        return common.not_found_response(str(e))
    
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    
    except json.JSONDecodeError as e:
        return common.bad_request_response(f'Invalid JSON: {str(e)}')
    
    except Exception as e:
        logger.exception(f'Internal error: {str(e)}')
        return common.internal_error_response('Internal server error')


# =============================================================================
# Helper Functions
# =============================================================================

def _transform_workspace(data: Dict[str, Any]) -> Dict[str, Any]:
    """Transform database workspace record to API response format."""
    return {
        'id': data.get('id'),
        'orgId': data.get('org_id'),
        'name': data.get('name'),
        'description': data.get('description'),
        'color': data.get('color'),
        'icon': data.get('icon'),
        'tags': data.get('tags', []),
        'status': data.get('status'),
        'userRole': data.get('user_role'),
        'isFavorited': data.get('is_favorited', False),
        'favoritedAt': data.get('favorited_at'),
        'memberCount': data.get('member_count'),
        'createdAt': data.get('created_at'),
        'updatedAt': data.get('updated_at'),
        'createdBy': data.get('created_by'),
        'updatedBy': data.get('updated_by'),
    }


def _transform_member(data: Dict[str, Any]) -> Dict[str, Any]:
    """Transform database member record to API response format."""
    return {
        'id': data.get('id'),
        'wsId': data.get('ws_id'),
        'userId': data.get('user_id'),
        'wsRole': data.get('ws_role'),
        'email': data.get('email'),
        'displayName': data.get('display_name'),
        'avatarUrl': data.get('avatar_url'),
        'createdAt': data.get('created_at'),
        'updatedAt': data.get('updated_at'),
        'createdBy': data.get('created_by'),
    }


def _get_user_workspace_role(workspace_id: str, user_id: str) -> Optional[str]:
    """Get user's role in a workspace."""
    result = common.rpc(
        function_name='get_workspace_role',
        params={'p_ws_id': workspace_id, 'p_user_id': user_id}
    )
    return result


def _is_workspace_member(workspace_id: str, user_id: str) -> bool:
    """Check if user is a member of the workspace."""
    result = common.rpc(
        function_name='is_workspace_member',
        params={'p_ws_id': workspace_id, 'p_user_id': user_id}
    )
    return result is True


def _is_workspace_owner(workspace_id: str, user_id: str) -> bool:
    """Check if user is an owner of the workspace."""
    result = common.rpc(
        function_name='is_workspace_owner',
        params={'p_ws_id': workspace_id, 'p_user_id': user_id}
    )
    return result is True


def _is_workspace_admin_or_owner(workspace_id: str, user_id: str) -> bool:
    """Check if user is admin or owner of the workspace."""
    result = common.rpc(
        function_name='is_workspace_admin_or_owner',
        params={'p_ws_id': workspace_id, 'p_user_id': user_id}
    )
    return result is True


# =============================================================================
# Workspace Handlers
# =============================================================================

def handle_list_workspaces(
    org_id: str,
    user_id: str,
    event: Dict[str, Any]
) -> Dict[str, Any]:
    """
    GET /api/ws/workspaces
    
    List all workspaces the user is a member of.
    
    Query Parameters:
        - favorites_only: Only return favorited workspaces
        - favorites_first: Sort favorites first
        - status: Filter by status (active, archived, all)
    
    Returns:
        List of workspaces with member info
    """
    try:
        query_params = event.get('queryStringParameters') or {}
        favorites_only = query_params.get('favorites_only', 'false').lower() == 'true'
        favorites_first = query_params.get('favorites_first', 'true').lower() == 'true'
        status = query_params.get('status', 'active')
        
        # Call RPC function
        workspaces = common.rpc(
            function_name='get_workspaces_with_member_info',
            params={
                'p_org_id': org_id,
                'p_user_id': user_id,
                'p_favorites_only': favorites_only,
                'p_favorites_first': favorites_first,
                'p_status': status
            }
        )
        
        result = {
            'workspaces': [_transform_workspace(w) for w in (workspaces or [])],
            'totalCount': len(workspaces or []),
            'filters': {
                'favoritesOnly': favorites_only,
                'favoritesFirst': favorites_first,
                'status': status,
            }
        }
        
        logger.info(f"Retrieved {len(workspaces or [])} workspaces for user {user_id}")
        return common.success_response(result)
    
    except Exception as e:
        logger.exception(f'Error listing workspaces: {str(e)}')
        raise


def handle_create_workspace(
    org_id: str,
    user_id: str,
    body: Dict[str, Any]
) -> Dict[str, Any]:
    """
    POST /api/ws/workspaces
    
    Create a new workspace. The creator automatically becomes the owner.
    
    Args:
        org_id: Organization ID
        user_id: Supabase user ID (will be the owner)
        body: Request body with workspace details
    
    Returns:
        Created workspace
    """
    # Validate required fields
    name = body.get('name')
    if not name:
        raise common.ValidationError('name is required')
    
    if len(name) > 255:
        raise common.ValidationError('name must be 255 characters or less')
    
    # Validate color format if provided
    color = body.get('color')
    if color and not (color.startswith('#') and len(color) == 7):
        raise common.ValidationError('color must be in #RRGGBB format')
    
    try:
        # Call RPC function to create workspace with owner
        result = common.rpc(
            function_name='create_workspace_with_owner',
            params={
                'p_org_id': org_id,
                'p_name': name,
                'p_description': body.get('description'),
                'p_color': color,
                'p_icon': body.get('icon'),
                'p_tags': body.get('tags', []),
                'p_owner_id': user_id
            }
        )
        
        # Add user role and member count for response
        result['user_role'] = 'ws_owner'
        result['member_count'] = 1
        result['is_favorited'] = False
        
        logger.info(f"Created workspace: {result.get('id')}")
        return common.success_response(
            {'workspace': _transform_workspace(result)},
            status_code=201
        )
    
    except Exception as e:
        logger.exception(f'Error creating workspace: {str(e)}')
        if 'unique' in str(e).lower() and 'name' in str(e).lower():
            raise common.ValidationError('A workspace with this name already exists in your organization')
        raise


def handle_get_workspace(
    workspace_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    GET /api/ws/workspaces/{id}
    
    Get workspace details. User must be a member.
    
    Args:
        workspace_id: Workspace UUID
        user_id: Supabase user ID
    
    Returns:
        Workspace details with member info
    """
    if not workspace_id:
        raise common.ValidationError('Workspace ID is required')
    
    # Verify user is a member
    if not _is_workspace_member(workspace_id, user_id):
        raise common.ForbiddenError('You are not a member of this workspace')
    
    try:
        # Get workspace
        workspace = common.find_one(
            table='workspaces',
            filters={'id': workspace_id, 'deleted_at': None}
        )
        
        if not workspace:
            raise common.NotFoundError('Workspace not found')
        
        # Get user's role
        role = _get_user_workspace_role(workspace_id, user_id)
        workspace['user_role'] = role
        
        # Check if favorited
        favorite = common.find_one(
            table='ws_favorites',
            filters={'ws_id': workspace_id, 'user_id': user_id}
        )
        workspace['is_favorited'] = favorite is not None
        workspace['favorited_at'] = favorite.get('created_at') if favorite else None
        
        # Get member count
        members = common.find_many(
            table='ws_members',
            filters={'ws_id': workspace_id, 'deleted_at': None}
        )
        workspace['member_count'] = len(members)
        
        logger.info(f"Retrieved workspace: {workspace_id}")
        return common.success_response({'workspace': _transform_workspace(workspace)})
    
    except Exception as e:
        logger.exception(f'Error getting workspace {workspace_id}: {str(e)}')
        raise


def handle_update_workspace(
    workspace_id: str,
    user_id: str,
    body: Dict[str, Any]
) -> Dict[str, Any]:
    """
    PUT /api/ws/workspaces/{id}
    
    Update workspace. User must be admin or owner.
    
    Args:
        workspace_id: Workspace UUID
        user_id: Supabase user ID
        body: Request body with fields to update
    
    Returns:
        Updated workspace
    """
    if not workspace_id:
        raise common.ValidationError('Workspace ID is required')
    
    # Verify user is admin or owner
    if not _is_workspace_admin_or_owner(workspace_id, user_id):
        raise common.ForbiddenError('You must be a workspace admin or owner to update it')
    
    # Allowed fields for update
    allowed_fields = ['name', 'description', 'color', 'icon', 'tags', 'status']
    update_data = {k: v for k, v in body.items() if k in allowed_fields and v is not None}
    
    if not update_data:
        raise common.ValidationError('No valid fields to update')
    
    # Validate color format if provided
    if 'color' in update_data:
        color = update_data['color']
        if not (color.startswith('#') and len(color) == 7):
            raise common.ValidationError('color must be in #RRGGBB format')
    
    # Validate status if provided
    if 'status' in update_data:
        if update_data['status'] not in ['active', 'archived']:
            raise common.ValidationError('status must be "active" or "archived"')
    
    update_data['updated_by'] = user_id
    
    try:
        updated_workspace = common.update_one(
            table='workspaces',
            filters={'id': workspace_id, 'deleted_at': None},
            data=update_data
        )
        
        if not updated_workspace:
            raise common.NotFoundError('Workspace not found')
        
        # Add user info for response
        updated_workspace['user_role'] = _get_user_workspace_role(workspace_id, user_id)
        
        favorite = common.find_one(
            table='ws_favorites',
            filters={'ws_id': workspace_id, 'user_id': user_id}
        )
        updated_workspace['is_favorited'] = favorite is not None
        
        members = common.find_many(
            table='ws_members',
            filters={'ws_id': workspace_id, 'deleted_at': None}
        )
        updated_workspace['member_count'] = len(members)
        
        logger.info(f"Updated workspace: {workspace_id}")
        return common.success_response({'workspace': _transform_workspace(updated_workspace)})
    
    except Exception as e:
        logger.exception(f'Error updating workspace {workspace_id}: {str(e)}')
        if 'unique' in str(e).lower() and 'name' in str(e).lower():
            raise common.ValidationError('A workspace with this name already exists in your organization')
        raise


def handle_delete_workspace(
    workspace_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    DELETE /api/ws/workspaces/{id}
    
    Soft delete a workspace. User must be owner.
    
    Args:
        workspace_id: Workspace UUID
        user_id: Supabase user ID
    
    Returns:
        Deletion confirmation with permanent deletion date
    """
    if not workspace_id:
        raise common.ValidationError('Workspace ID is required')
    
    try:
        # Call RPC function (handles authorization check internally)
        result = common.rpc(
            function_name='soft_delete_workspace',
            params={
                'p_workspace_id': workspace_id,
                'p_user_id': user_id
            }
        )
        
        logger.info(f"Soft deleted workspace: {workspace_id}")
        return common.success_response({
            'message': 'Workspace deleted successfully',
            'workspaceId': result.get('id'),
            'deletedAt': result.get('deleted_at'),
            'permanentDeletionDate': result.get('permanent_deletion_date')
        })
    
    except Exception as e:
        error_msg = str(e).lower()
        if 'only workspace owners' in error_msg:
            raise common.ForbiddenError('Only workspace owners can delete workspaces')
        logger.exception(f'Error deleting workspace {workspace_id}: {str(e)}')
        raise


def handle_restore_workspace(
    workspace_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    POST /api/ws/workspaces/{id}/restore
    
    Restore a soft-deleted workspace. User must have been an owner.
    
    Args:
        workspace_id: Workspace UUID
        user_id: Supabase user ID
    
    Returns:
        Restored workspace
    """
    if not workspace_id:
        raise common.ValidationError('Workspace ID is required')
    
    try:
        # Call RPC function (handles authorization check internally)
        result = common.rpc(
            function_name='restore_workspace',
            params={
                'p_workspace_id': workspace_id,
                'p_user_id': user_id
            }
        )
        
        # Add user info for response
        result['user_role'] = 'ws_owner'
        result['is_favorited'] = False
        
        members = common.find_many(
            table='ws_members',
            filters={'ws_id': workspace_id, 'deleted_at': None}
        )
        result['member_count'] = len(members)
        
        logger.info(f"Restored workspace: {workspace_id}")
        return common.success_response({
            'message': 'Workspace restored successfully',
            'workspace': _transform_workspace(result)
        })
    
    except Exception as e:
        error_msg = str(e).lower()
        if 'not found' in error_msg:
            raise common.NotFoundError('Workspace not found')
        if 'not deleted' in error_msg:
            raise common.ValidationError('Workspace is not deleted')
        if 'only previous owners' in error_msg:
            raise common.ForbiddenError('Only previous workspace owners can restore it')
        logger.exception(f'Error restoring workspace {workspace_id}: {str(e)}')
        raise


# =============================================================================
# Member Handlers
# =============================================================================

def handle_list_members(
    workspace_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    GET /api/ws/workspaces/{id}/members
    
    List all members of a workspace. User must be a member.
    
    Args:
        workspace_id: Workspace UUID
        user_id: Supabase user ID
    
    Returns:
        List of members with user details
    """
    if not workspace_id:
        raise common.ValidationError('Workspace ID is required')
    
    # Verify user is a member
    if not _is_workspace_member(workspace_id, user_id):
        raise common.ForbiddenError('You are not a member of this workspace')
    
    try:
        # Get members with user profile info
        # Using a join via RPC or separate queries
        members = common.find_many(
            table='ws_members',
            filters={'ws_id': workspace_id, 'deleted_at': None}
        )
        
        # Enrich with user profile data
        enriched_members = []
        for member in members:
            profile = common.find_one(
                table='user_profiles',
                filters={'user_id': member['user_id']}
            )
            if profile:
                member['email'] = profile.get('email')
                member['display_name'] = profile.get('display_name')
                member['avatar_url'] = profile.get('avatar_url')
            enriched_members.append(member)
        
        result = {
            'members': [_transform_member(m) for m in enriched_members],
            'totalCount': len(enriched_members)
        }
        
        logger.info(f"Retrieved {len(enriched_members)} members for workspace {workspace_id}")
        return common.success_response(result)
    
    except Exception as e:
        logger.exception(f'Error listing members for workspace {workspace_id}: {str(e)}')
        raise


def handle_add_member(
    workspace_id: str,
    user_id: str,
    body: Dict[str, Any]
) -> Dict[str, Any]:
    """
    POST /api/ws/workspaces/{id}/members
    
    Add a member to a workspace. User must be owner.
    
    Args:
        workspace_id: Workspace UUID
        user_id: Supabase user ID (must be owner)
        body: Request body with member_user_id and ws_role
    
    Returns:
        Created member
    """
    if not workspace_id:
        raise common.ValidationError('Workspace ID is required')
    
    # Verify user is owner
    if not _is_workspace_owner(workspace_id, user_id):
        raise common.ForbiddenError('Only workspace owners can add members')
    
    # Validate required fields
    member_user_id = body.get('userId') or body.get('user_id')
    if not member_user_id:
        raise common.ValidationError('userId is required')
    
    ws_role = body.get('wsRole') or body.get('ws_role', 'ws_user')
    if ws_role not in ['ws_owner', 'ws_admin', 'ws_user']:
        raise common.ValidationError('wsRole must be ws_owner, ws_admin, or ws_user')
    
    try:
        # Check if user is already a member
        existing = common.find_one(
            table='ws_members',
            filters={'ws_id': workspace_id, 'user_id': member_user_id, 'deleted_at': None}
        )
        if existing:
            raise common.ValidationError('User is already a member of this workspace')
        
        # Get workspace to verify org membership
        workspace = common.find_one(
            table='workspaces',
            filters={'id': workspace_id, 'deleted_at': None}
        )
        if not workspace:
            raise common.NotFoundError('Workspace not found')
        
        # Verify new member is in the same org
        org_member = common.find_one(
            table='org_members',
            filters={'org_id': workspace['org_id'], 'user_id': member_user_id}
        )
        if not org_member:
            raise common.ValidationError('User must be a member of the organization')
        
        # Create member
        new_member = common.insert_one(
            table='ws_members',
            data={
                'ws_id': workspace_id,
                'user_id': member_user_id,
                'ws_role': ws_role,
                'created_by': user_id
            }
        )
        
        # Enrich with user profile
        profile = common.find_one(
            table='user_profiles',
            filters={'user_id': member_user_id}
        )
        if profile:
            new_member['email'] = profile.get('email')
            new_member['display_name'] = profile.get('display_name')
            new_member['avatar_url'] = profile.get('avatar_url')
        
        logger.info(f"Added member {member_user_id} to workspace {workspace_id}")
        return common.success_response(
            {'member': _transform_member(new_member)},
            status_code=201
        )
    
    except Exception as e:
        logger.exception(f'Error adding member to workspace {workspace_id}: {str(e)}')
        raise


def handle_update_member(
    workspace_id: str,
    member_id: str,
    user_id: str,
    body: Dict[str, Any]
) -> Dict[str, Any]:
    """
    PUT /api/ws/workspaces/{workspaceId}/members/{memberId}
    
    Update a member's role. User must be owner.
    
    Args:
        workspace_id: Workspace UUID
        member_id: Member record UUID
        user_id: Supabase user ID (must be owner)
        body: Request body with ws_role
    
    Returns:
        Updated member
    """
    if not workspace_id or not member_id:
        raise common.ValidationError('Workspace ID and Member ID are required')
    
    # Verify user is owner
    if not _is_workspace_owner(workspace_id, user_id):
        raise common.ForbiddenError('Only workspace owners can update member roles')
    
    # Validate role
    ws_role = body.get('wsRole') or body.get('ws_role')
    if not ws_role:
        raise common.ValidationError('wsRole is required')
    if ws_role not in ['ws_owner', 'ws_admin', 'ws_user']:
        raise common.ValidationError('wsRole must be ws_owner, ws_admin, or ws_user')
    
    try:
        # Get current member
        member = common.find_one(
            table='ws_members',
            filters={'id': member_id, 'ws_id': workspace_id, 'deleted_at': None}
        )
        if not member:
            raise common.NotFoundError('Member not found')
        
        # Prevent demoting the last owner
        if member['ws_role'] == 'ws_owner' and ws_role != 'ws_owner':
            owner_count = common.rpc(
                function_name='count_workspace_owners',
                params={'p_ws_id': workspace_id}
            )
            if owner_count <= 1:
                raise common.ValidationError('Cannot demote the last workspace owner')
        
        # Update member
        updated_member = common.update_one(
            table='ws_members',
            filters={'id': member_id},
            data={'ws_role': ws_role, 'updated_by': user_id}
        )
        
        # Enrich with user profile
        profile = common.find_one(
            table='user_profiles',
            filters={'user_id': updated_member['user_id']}
        )
        if profile:
            updated_member['email'] = profile.get('email')
            updated_member['display_name'] = profile.get('display_name')
            updated_member['avatar_url'] = profile.get('avatar_url')
        
        logger.info(f"Updated member {member_id} role to {ws_role}")
        return common.success_response({'member': _transform_member(updated_member)})
    
    except Exception as e:
        logger.exception(f'Error updating member {member_id}: {str(e)}')
        raise


def handle_remove_member(
    workspace_id: str,
    member_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    DELETE /api/ws/workspaces/{workspaceId}/members/{memberId}
    
    Remove a member from workspace. User must be owner, or removing self.
    
    Args:
        workspace_id: Workspace UUID
        member_id: Member record UUID
        user_id: Supabase user ID
    
    Returns:
        Deletion confirmation
    """
    if not workspace_id or not member_id:
        raise common.ValidationError('Workspace ID and Member ID are required')
    
    try:
        # Get member
        member = common.find_one(
            table='ws_members',
            filters={'id': member_id, 'ws_id': workspace_id, 'deleted_at': None}
        )
        if not member:
            raise common.NotFoundError('Member not found')
        
        # Check authorization: owner or self
        is_owner = _is_workspace_owner(workspace_id, user_id)
        is_self = member['user_id'] == user_id
        
        if not is_owner and not is_self:
            raise common.ForbiddenError('Only workspace owners or the member themselves can remove membership')
        
        # Prevent removing the last owner
        if member['ws_role'] == 'ws_owner':
            owner_count = common.rpc(
                function_name='count_workspace_owners',
                params={'p_ws_id': workspace_id}
            )
            if owner_count <= 1:
                raise common.ValidationError('Cannot remove the last workspace owner')
        
        # Soft delete member
        common.update_one(
            table='ws_members',
            filters={'id': member_id},
            data={'deleted_at': 'NOW()'}
        )
        
        # Remove favorite if exists
        common.delete_many(
            table='ws_favorites',
            filters={'ws_id': workspace_id, 'user_id': member['user_id']}
        )
        
        logger.info(f"Removed member {member_id} from workspace {workspace_id}")
        return common.success_response({
            'message': 'Member removed successfully',
            'memberId': member_id
        })
    
    except Exception as e:
        logger.exception(f'Error removing member {member_id}: {str(e)}')
        raise


# =============================================================================
# Favorite Handlers
# =============================================================================

def handle_toggle_favorite(
    workspace_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    POST /api/ws/workspaces/{id}/favorite
    
    Toggle favorite status for a workspace.
    
    Args:
        workspace_id: Workspace UUID
        user_id: Supabase user ID
    
    Returns:
        New favorite status
    """
    if not workspace_id:
        raise common.ValidationError('Workspace ID is required')
    
    try:
        # Call RPC function (handles membership check internally)
        result = common.rpc(
            function_name='toggle_workspace_favorite',
            params={
                'p_workspace_id': workspace_id,
                'p_user_id': user_id
            }
        )
        
        logger.info(f"Toggled favorite for workspace {workspace_id}: {result.get('is_favorited')}")
        return common.success_response({
            'workspaceId': result.get('workspace_id'),
            'isFavorited': result.get('is_favorited'),
            'favoritedAt': result.get('favorited_at')
        })
    
    except Exception as e:
        error_msg = str(e).lower()
        if 'not a member' in error_msg:
            raise common.ForbiddenError('You are not a member of this workspace')
        logger.exception(f'Error toggling favorite for workspace {workspace_id}: {str(e)}')
        raise


def handle_list_favorites(
    org_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    GET /api/ws/favorites
    
    List user's favorited workspaces.
    
    Args:
        org_id: Organization ID
        user_id: Supabase user ID
    
    Returns:
        List of favorited workspaces
    """
    try:
        # Use the list workspaces function with favorites_only=True
        workspaces = common.rpc(
            function_name='get_workspaces_with_member_info',
            params={
                'p_org_id': org_id,
                'p_user_id': user_id,
                'p_favorites_only': True,
                'p_favorites_first': True,
                'p_status': 'active'
            }
        )
        
        result = {
            'workspaces': [_transform_workspace(w) for w in (workspaces or [])],
            'totalCount': len(workspaces or [])
        }
        
        logger.info(f"Retrieved {len(workspaces or [])} favorites for user {user_id}")
        return common.success_response(result)
    
    except Exception as e:
        logger.exception(f'Error listing favorites: {str(e)}')
        raise
