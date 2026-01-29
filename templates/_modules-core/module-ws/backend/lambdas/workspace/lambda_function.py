"""
Workspace Module - Main Handler

This Lambda function provides API endpoints for workspace management including
CRUD operations, member management, favorites, and admin features. It follows
CORA patterns with standard auth and role-based authorization.

Routes - System Admin:
- GET /admin/sys/ws/analytics - Get platform-wide workspace analytics (sys_admin only)
- GET /admin/sys/ws/config - Get workspace module configuration (sys_admin only)
- PUT /admin/sys/ws/config - Update workspace module configuration (sys_admin only)

Routes - Organization Admin:
- GET /admin/org/ws/settings - Get org workspace settings
- PUT /admin/org/ws/settings - Update org workspace settings
- GET /admin/org/ws/analytics - Get workspace analytics for organization
- GET /admin/org/ws/workspaces - List all org workspaces (admin view)
- POST /admin/org/ws/workspaces/{wsId}/restore - Admin restore workspace
- DELETE /admin/org/ws/workspaces/{wsId} - Admin force delete workspace

Routes - Workspaces:
- GET /ws - List user's workspaces
- POST /ws - Create new workspace
- GET /ws/{wsId} - Get workspace details
- PUT /ws/{wsId} - Update workspace
- DELETE /ws/{wsId} - Soft delete workspace
- POST /ws/{wsId}/restore - Restore deleted workspace
- GET /ws/{wsId}/activity - Get workspace activity log
- POST /ws/{wsId}/transfer - Transfer workspace ownership

Routes - Members:
- GET /ws/{wsId}/members - List workspace members
- POST /ws/{wsId}/members - Add member
- PUT /ws/{wsId}/members/{memberId} - Update member role
- DELETE /ws/{wsId}/members/{memberId} - Remove member

Routes - Favorites:
- POST /ws/{wsId}/favorite - Toggle favorite
- GET /ws/favorites - List user's favorites
"""

import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import org_common as common

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# System routes that don't require org_id
SYS_ROUTES = ['/admin/sys/ws/analytics', '/admin/sys/ws/config']


def is_sys_route(path: str) -> bool:
    """Check if route is system-level (no org_id required)."""
    return any(path.startswith(route) for route in SYS_ROUTES)


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
        
        # Route-aware org_id extraction
        # System routes don't require org_id
        org_id = None
        if not is_sys_route(path):
            # Get org_id from query parameters OR request body (for POST/PUT)
            # Accept both snake_case (org_id) and camelCase (orgId) for flexibility
            query_params = event.get('queryStringParameters') or {}
            org_id = query_params.get('org_id') or query_params.get('orgId')
            
            # For POST/PUT requests, also check the request body for org_id
            if not org_id and http_method in ('POST', 'PUT'):
                try:
                    body = json.loads(event.get('body', '{}'))
                    org_id = body.get('org_id') or body.get('orgId')
                except json.JSONDecodeError:
                    pass

            if not org_id:
                return common.bad_request_response('org_id is required (in query params or request body)')
            
            logger.info(f"Request from org_id: {org_id}, user_id: {supabase_user_id}")
        else:
            logger.info(f"System route - no org_id required, user_id: {supabase_user_id}")
        
        # Route dispatcher - System Admin Routes (no org_id required)
        if path == '/admin/sys/ws/analytics' and http_method == 'GET':
            return handle_sys_analytics(supabase_user_id, user_info)
        
        elif path == '/admin/sys/ws/config' and http_method == 'GET':
            return handle_get_config()
        
        elif path == '/admin/sys/ws/config' and http_method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            return handle_update_config(supabase_user_id, user_info, body)
        
        # Route dispatcher - Organization Admin Routes (org_id required)
        elif path == '/admin/org/ws/settings' and http_method == 'GET':
            return handle_get_org_settings(org_id, supabase_user_id, user_info)
        
        elif path == '/admin/org/ws/settings' and http_method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            return handle_update_org_settings(org_id, supabase_user_id, user_info, body)
        
        elif path == '/admin/org/ws/analytics' and http_method == 'GET':
            return handle_admin_analytics(org_id, user_info)
        
        elif path == '/admin/org/ws/workspaces' and http_method == 'GET':
            return handle_admin_list_workspaces(org_id, supabase_user_id, user_info, event)
        
        elif path.startswith('/admin/org/ws/workspaces/') and path.endswith('/restore') and http_method == 'POST':
            workspace_id = path_parameters.get('wsId')
            return handle_admin_restore_workspace(workspace_id, org_id, supabase_user_id, user_info)
        
        elif path.startswith('/admin/org/ws/workspaces/') and http_method == 'DELETE':
            workspace_id = path_parameters.get('wsId')
            return handle_admin_delete_workspace(workspace_id, org_id, supabase_user_id, user_info)
        
        # Route dispatcher - Workspaces
        # Note: path is /ws, /ws/{id}, /ws/{id}/members, etc.
        elif path == '/ws' and http_method == 'GET':
            return handle_list_workspaces(org_id, supabase_user_id, event)
        
        elif path == '/ws' and http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_create_workspace(org_id, supabase_user_id, body)
        
        elif path.endswith('/restore') and http_method == 'POST':
            workspace_id = path_parameters.get('wsId')
            return handle_restore_workspace(workspace_id, supabase_user_id)
        
        elif path.endswith('/favorite') and http_method == 'POST':
            workspace_id = path_parameters.get('wsId')
            return handle_toggle_favorite(workspace_id, supabase_user_id)
        
        elif path.endswith('/activity') and http_method == 'GET':
            workspace_id = path_parameters.get('wsId')
            return handle_get_workspace_activity(workspace_id, supabase_user_id, user_info)
        
        elif path.endswith('/transfer') and http_method == 'POST':
            workspace_id = path_parameters.get('wsId')
            body = json.loads(event.get('body', '{}'))
            return handle_transfer_ownership(workspace_id, supabase_user_id, user_info, body)
        
        elif path.endswith('/members') and http_method == 'GET':
            workspace_id = path_parameters.get('wsId')
            return handle_list_members(workspace_id, supabase_user_id)
        
        elif path.endswith('/members') and http_method == 'POST':
            workspace_id = path_parameters.get('wsId')
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
            workspace_id = path_parameters.get('wsId')
            return handle_get_workspace(workspace_id, supabase_user_id)
        
        elif path.startswith('/ws/') and http_method == 'PUT':
            workspace_id = path_parameters.get('wsId')
            body = json.loads(event.get('body', '{}'))
            return handle_update_workspace(workspace_id, supabase_user_id, body)
        
        elif path.startswith('/ws/') and http_method == 'DELETE':
            workspace_id = path_parameters.get('wsId')
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
    """Transform database workspace record to API response format.
    
    Note: Returns camelCase to match CORA API standards and frontend TypeScript types.
    """
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
        'documentCount': data.get('document_count'),
        'evaluationCount': data.get('evaluation_count'),
        'chatCount': data.get('chat_count'),
        'voiceCount': data.get('voice_count'),
        'createdAt': data.get('created_at'),
        'updatedAt': data.get('updated_at'),
        'createdBy': data.get('created_by'),
        'updatedBy': data.get('updated_by'),
        'deletedAt': data.get('deleted_at'),
        'retentionDays': data.get('retention_days'),
    }


def _transform_member(data: Dict[str, Any]) -> Dict[str, Any]:
    """Transform database member record to API response format.
    
    Note: Returns camelCase to match CORA API standards and frontend TypeScript types.
    """
    return {
        'id': data.get('id'),
        'wsId': data.get('ws_id'),
        'userId': data.get('user_id'),
        'wsRole': data.get('ws_role'),
        'profile': {
            'email': data.get('email'),
            'displayName': data.get('display_name'),
            'avatarUrl': data.get('avatar_url'),
        },
        'createdAt': data.get('created_at'),
        'updatedAt': data.get('updated_at'),
        'createdBy': data.get('created_by'),
    }


def _transform_config(data: Dict[str, Any]) -> Dict[str, Any]:
    """Transform database config record to API response format.
    
    Note: Returns camelCase to match CORA API standards and frontend TypeScript types.
    """
    return {
        'id': data.get('id'),
        'navLabelSingular': data.get('nav_label_singular'),
        'navLabelPlural': data.get('nav_label_plural'),
        'navIcon': data.get('nav_icon'),
        'enableFavorites': data.get('enable_favorites'),
        'enableTags': data.get('enable_tags'),
        'enableColorCoding': data.get('enable_color_coding'),
        'defaultColor': data.get('default_color'),
        'defaultRetentionDays': data.get('default_retention_days'),
        'maxTagsPerWorkspace': data.get('max_tags_per_workspace'),
        'maxTagLength': data.get('max_tag_length'),
        'createdAt': data.get('created_at'),
        'updatedAt': data.get('updated_at'),
        'updatedBy': data.get('updated_by'),
    }


def _get_user_ws_role(workspace_id: str, user_id: str) -> Optional[str]:
    """Get user's role in a workspace."""
    result = common.rpc(
        function_name='get_ws_role',
        params={'p_ws_id': workspace_id, 'p_user_id': user_id}
    )
    return result


def _is_ws_member(workspace_id: str, user_id: str) -> bool:
    """Check if user is a member of the workspace."""
    result = common.rpc(
        function_name='is_ws_member',
        params={'p_ws_id': workspace_id, 'p_user_id': user_id}
    )
    return result is True


def _is_ws_owner(workspace_id: str, user_id: str) -> bool:
    """Check if user is an owner of the workspace."""
    result = common.rpc(
        function_name='is_ws_owner',
        params={'p_ws_id': workspace_id, 'p_user_id': user_id}
    )
    return result is True


def _is_ws_admin_or_owner(workspace_id: str, user_id: str) -> bool:
    """Check if user is admin or owner of the workspace."""
    result = common.rpc(
        function_name='is_ws_admin_or_owner',
        params={'p_ws_id': workspace_id, 'p_user_id': user_id}
    )
    return result is True


def _is_sys_admin(user_id: str) -> bool:
    """Check if user has sys admin role."""
    profile = common.find_one('user_profiles', {'user_id': user_id})
    return profile and profile.get('sys_role') in ['sys_admin', 'sys_owner']


def _is_org_admin(org_id: str, user_id: str) -> bool:
    """Check if user is org admin or owner."""
    org_member = common.find_one(
        table='org_members',
        filters={'org_id': org_id, 'user_id': user_id}
    )
    return org_member and org_member.get('org_role') in ['org_admin', 'org_owner']


def _log_activity(ws_id: str, user_id: str, action: str, metadata: Optional[Dict[str, Any]] = None):
    """Log workspace activity (if ws_activity_log table exists)."""
    try:
        common.insert_one(
            table='ws_activity_log',
            data={
                'ws_id': ws_id,
                'user_id': user_id,
                'action': action,
                'metadata': metadata or {}
            }
        )
    except Exception as e:
        # Don't fail the request if logging fails
        logger.warning(f'Failed to log activity: {str(e)}')


def _get_workspace_counts(workspace_ids: List[str]) -> Dict[str, Dict[str, int]]:
    """
    Get resource counts for workspaces using the database RPC function.
    
    Returns dict: {workspace_id: {memberCount, documentCount, evaluationCount, chatCount, voiceCount}}
    
    Note: Uses get_workspace_resource_counts RPC function which gracefully handles
    optional modules (eval, voice). Returns 0 for modules not installed.
    """
    counts = {}
    
    # Initialize all counts to 0
    for ws_id in workspace_ids:
        counts[ws_id] = {
            'member_count': 0,
            'document_count': 0,
            'evaluation_count': 0,
            'chat_count': 0,
            'voice_count': 0
        }
    
    if not workspace_ids:
        return counts
    
    try:
        # Call the database RPC function for batch counting
        results = common.rpc(
            function_name='get_workspace_resource_counts',
            params={'p_workspace_ids': workspace_ids}
        )
        
        # Parse results into our counts dict
        if results:
            for row in results:
                ws_id = row.get('ws_id')
                if ws_id:
                    counts[ws_id] = {
                        'member_count': row.get('member_count', 0),
                        'document_count': row.get('document_count', 0),
                        'evaluation_count': row.get('evaluation_count', 0),
                        'chat_count': row.get('chat_count', 0),
                        'voice_count': row.get('voice_count', 0)
                    }
        
        logger.info(f"Retrieved resource counts for {len(workspace_ids)} workspaces")
        return counts
    
    except Exception as e:
        # If RPC function doesn't exist yet, log warning and return zeros
        error_msg = str(e).lower()
        if 'function' in error_msg and ('does not exist' in error_msg or 'not found' in error_msg):
            logger.warning(f"get_workspace_resource_counts RPC function not found - returning zero counts. Run migration: 20260122_add_workspace_resource_counts.sql")
        else:
            logger.warning(f"Failed to get workspace counts: {e}")
        
        # Return initialized counts (all zeros)
        return counts


# =============================================================================
# System-Level Handlers (no org_id required)
# =============================================================================

def handle_sys_analytics(user_id: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    GET /ws/sys/analytics
    
    Get enhanced cross-organization workspace statistics. Platform admin only.
    
    Args:
        user_id: Supabase user ID
        user_info: User information from auth token
    
    Returns:
        Platform-wide workspace statistics with org breakdown
    """
    # Check if user has sys admin role
    if not _is_sys_admin(user_id):
        raise common.ForbiddenError('Only sys administrators can access system analytics')
    
    try:
        # Get all workspaces across all organizations
        all_workspaces = common.find_many(table='workspaces', filters={})
        
        # Calculate platform-wide metrics
        total_count = len(all_workspaces)
        active_count = len([w for w in all_workspaces if w.get('deleted_at') is None and w.get('status') == 'active'])
        archived_count = len([w for w in all_workspaces if w.get('deleted_at') is None and w.get('status') == 'archived'])
        
        # Count workspaces created this month
        now = datetime.now()
        this_month_count = len([
            w for w in all_workspaces
            if w.get('created_at') and w.get('created_at').startswith(f"{now.year}-{now.month:02d}")
        ])
        
        # Build org usage table
        org_stats = {}
        for workspace in all_workspaces:
            if workspace.get('deleted_at') is not None:
                continue  # Skip deleted workspaces
            
            org_id = workspace.get('org_id')
            if org_id:
                if org_id not in org_stats:
                    org_stats[org_id] = {
                        'orgId': org_id,
                        'total': 0,
                        'active': 0,
                        'archived': 0,
                    }
                org_stats[org_id]['total'] += 1
                if workspace.get('status') == 'active':
                    org_stats[org_id]['active'] += 1
                elif workspace.get('status') == 'archived':
                    org_stats[org_id]['archived'] += 1
        
        # Get org member counts and calculate average
        for org_id, stats in org_stats.items():
            org_members = common.find_many(
                table='org_members',
                filters={'org_id': org_id}
            )
            member_count = len(org_members)
            stats['avgPerUser'] = round(stats['total'] / member_count, 2) if member_count > 0 else 0
        
        # Calculate feature adoption
        workspaces_with_favorites = len([
            w for w in all_workspaces
            if w.get('deleted_at') is None and common.find_one('ws_favorites', {'ws_id': w['id']}) is not None
        ])
        workspaces_with_tags = len([
            w for w in all_workspaces
            if w.get('deleted_at') is None and w.get('tags') and len(w.get('tags', [])) > 0
        ])
        workspaces_with_colors = len([
            w for w in all_workspaces
            if w.get('deleted_at') is None and w.get('color') is not None
        ])
        
        active_and_archived = active_count + archived_count
        feature_adoption = {
            'favoritesPct': round((workspaces_with_favorites / active_and_archived * 100), 1) if active_and_archived > 0 else 0,
            'tagsPct': round((workspaces_with_tags / active_and_archived * 100), 1) if active_and_archived > 0 else 0,
            'colorsPct': round((workspaces_with_colors / active_and_archived * 100), 1) if active_and_archived > 0 else 0,
        }
        
        analytics = {
            'platformWide': {
                'totalWorkspaces': total_count,
                'activeWorkspaces': active_count,
                'archivedWorkspaces': archived_count,
                'createdThisMonth': this_month_count,
            },
            'byOrganization': list(org_stats.values()),
            'featureAdoption': feature_adoption,
        }
        
        logger.info("Retrieved system-wide analytics")
        return common.success_response({'analytics': analytics})
    
    except Exception as e:
        logger.exception(f'Error getting system analytics: {str(e)}')
        raise


# =============================================================================
# Organization-Level Handlers (org_id required)
# =============================================================================

def handle_get_org_settings(
    org_id: str,
    user_id: str,
    user_info: Dict[str, Any]
) -> Dict[str, Any]:
    """
    GET /ws/org/settings?org_id={uuid}
    
    Get organization-specific workspace settings. Org admin or platform admin can access.
    
    Args:
        org_id: Organization ID
        user_id: Supabase user ID
        user_info: User information from auth token
    
    Returns:
        Organization workspace settings
    """
    # Check authorization: org admin or platform admin
    is_org_admin = _is_org_admin(org_id, user_id)
    is_sys_admin = _is_sys_admin(user_id)
    
    if not is_org_admin and not is_sys_admin:
        raise common.ForbiddenError('Only organization or sys administrators can access org settings')
    
    try:
        # Get or create default settings
        settings = common.find_one(
            table='ws_org_settings',
            filters={'org_id': org_id}
        )
        
        if not settings:
            # Return default settings (will be created on first PUT)
            settings = {
                'orgId': org_id,
                'allowUserCreation': True,
                'requireApproval': False,
                'maxWorkspacesPerUser': 10,
            }
        else:
            # Format database response to camelCase
            settings = common.format_record(settings)
        
        logger.info(f"Retrieved org settings for org {org_id}")
        return common.success_response({'settings': settings})
    
    except Exception as e:
        logger.exception(f'Error getting org settings for {org_id}: {str(e)}')
        raise


def handle_update_org_settings(
    org_id: str,
    user_id: str,
    user_info: Dict[str, Any],
    body: Dict[str, Any]
) -> Dict[str, Any]:
    """
    PUT /ws/org/settings
    
    Update organization-specific workspace settings. Org admin or platform admin can update.
    
    Args:
        org_id: Organization ID (from body)
        user_id: Supabase user ID
        user_info: User information from auth token
        body: Request body with settings to update
    
    Returns:
        Updated organization workspace settings
    """
    # Check authorization: org admin or platform admin
    is_org_admin = _is_org_admin(org_id, user_id)
    is_sys_admin = _is_sys_admin(user_id)
    
    if not is_org_admin and not is_sys_admin:
        raise common.ForbiddenError('Only organization or sys administrators can update org settings')
    
    # Allowed fields for update
    allowed_fields = ['allow_user_creation', 'require_approval', 'max_workspaces_per_user']
    update_data = {k: v for k, v in body.items() if k in allowed_fields and v is not None}
    
    if not update_data:
        raise common.ValidationError('No valid fields to update')
    
    # Validate max_workspaces_per_user
    if 'max_workspaces_per_user' in update_data:
        max_ws = update_data['max_workspaces_per_user']
        if not isinstance(max_ws, int) or max_ws < 1 or max_ws > 100:
            raise common.ValidationError('max_workspaces_per_user must be between 1 and 100')
    
    update_data['updated_by'] = user_id
    
    try:
        # Check if settings exist
        existing = common.find_one(
            table='ws_org_settings',
            filters={'org_id': org_id}
        )
        
        if existing:
            # Update existing settings
            updated_settings = common.update_one(
                table='ws_org_settings',
                filters={'org_id': org_id},
                data=update_data
            )
        else:
            # Create new settings with defaults
            settings_data = {
                'org_id': org_id,
                'allow_user_creation': True,
                'require_approval': False,
                'max_workspaces_per_user': 10,
                'created_by': user_id,
                'updated_by': user_id,
            }
            settings_data.update(update_data)
            updated_settings = common.insert_one(
                table='ws_org_settings',
                data=settings_data
            )
        
        logger.info(f"Updated org settings for org {org_id}")
        return common.success_response({'settings': updated_settings})
    
    except Exception as e:
        logger.exception(f'Error updating org settings for {org_id}: {str(e)}')
        raise


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
        List of workspaces with member info and resource counts
    """
    try:
        query_params = event.get('queryStringParameters') or {}
        favorites_only = query_params.get('favorites_only', 'false').lower() == 'true'
        favorites_first = query_params.get('favorites_first', 'true').lower() == 'true'
        status = query_params.get('status', 'active')
        
        # Call RPC function
        workspaces = common.rpc(
            function_name='get_ws_with_member_info',
            params={
                'p_org_id': org_id,
                'p_user_id': user_id,
                'p_favorites_only': favorites_only,
                'p_favorites_first': favorites_first,
                'p_status': status
            }
        )
        
        # Get resource counts for all workspaces
        if workspaces:
            workspace_ids = [w['id'] for w in workspaces]
            resource_counts = _get_workspace_counts(workspace_ids)
            
            # Merge counts into workspace records
            for workspace in workspaces:
                ws_counts = resource_counts.get(workspace['id'], {})
                workspace['document_count'] = ws_counts.get('document_count', 0)
                workspace['evaluation_count'] = ws_counts.get('evaluation_count', 0)
                workspace['chat_count'] = ws_counts.get('chat_count', 0)
                workspace['voice_count'] = ws_counts.get('voice_count', 0)
        
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
            function_name='create_ws_with_owner',
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
        
        # Log activity
        _log_activity(result['id'], user_id, 'Workspace created')
        
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
    if not _is_ws_member(workspace_id, user_id):
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
        role = _get_user_ws_role(workspace_id, user_id)
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
    if not _is_ws_admin_or_owner(workspace_id, user_id):
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
        
        # Log activity
        _log_activity(workspace_id, user_id, 'Workspace updated', {'fields': list(update_data.keys())})
        
        # Add user info for response
        updated_workspace['user_role'] = _get_user_ws_role(workspace_id, user_id)
        
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
            function_name='soft_delete_ws',
            params={
                'p_workspace_id': workspace_id,
                'p_user_id': user_id
            }
        )
        
        # Log activity
        _log_activity(workspace_id, user_id, 'Workspace deleted')
        
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
            function_name='restore_ws',
            params={
                'p_workspace_id': workspace_id,
                'p_user_id': user_id
            }
        )
        
        # Log activity
        _log_activity(workspace_id, user_id, 'Workspace restored')
        
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


def handle_get_workspace_activity(
    workspace_id: str,
    user_id: str,
    user_info: Dict[str, Any]
) -> Dict[str, Any]:
    """
    GET /ws/{id}/activity
    
    Get workspace activity log. User must be a member, or org/platform admin.
    
    Args:
        workspace_id: Workspace UUID
        user_id: Supabase user ID
        user_info: User information from auth token
    
    Returns:
        Workspace activity log
    """
    if not workspace_id:
        raise common.ValidationError('Workspace ID is required')
    
    # Get workspace to check org_id
    workspace = common.find_one(
        table='workspaces',
        filters={'id': workspace_id}
    )
    if not workspace:
        raise common.NotFoundError('Workspace not found')
    
    # Check authorization: workspace member OR org admin OR sys admin
    is_member = _is_ws_member(workspace_id, user_id)
    is_org_admin = _is_org_admin(workspace['org_id'], user_id)
    is_sys_admin = _is_sys_admin(user_id)
    
    if not is_member and not is_org_admin and not is_sys_admin:
        raise common.ForbiddenError('You do not have permission to view this workspace activity')
    
    try:
        # Get activity log
        activities = common.find_many(
            table='ws_activity_log',
            filters={'ws_id': workspace_id}
        )
        
        # Enrich with user profile data
        enriched_activities = []
        for activity in activities:
            profile = common.find_one(
                table='user_profiles',
                filters={'user_id': activity['user_id']}
            )
            enriched_activities.append({
                'id': activity.get('id'),
                'action': activity.get('action'),
                'user_id': activity.get('user_id'),
                'user_name': profile.get('display_name') if profile else 'Unknown User',
                'metadata': activity.get('metadata', {}),
                'created_at': activity.get('created_at'),
            })
        
        # Sort by created_at descending
        enriched_activities.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        result = {
            'activities': enriched_activities,
            'totalCount': len(enriched_activities)
        }
        
        logger.info(f"Retrieved {len(enriched_activities)} activities for workspace {workspace_id}")
        return common.success_response(result)
    
    except Exception as e:
        # If table doesn't exist yet, return empty array
        if 'does not exist' in str(e).lower() or 'relation' in str(e).lower():
            logger.warning(f'ws_activity_log table not found, returning empty activities')
            return common.success_response({'activities': [], 'totalCount': 0})
        logger.exception(f'Error getting workspace activity {workspace_id}: {str(e)}')
        raise


def handle_transfer_ownership(
    workspace_id: str,
    user_id: str,
    user_info: Dict[str, Any],
    body: Dict[str, Any]
) -> Dict[str, Any]:
    """
    POST /ws/{id}/transfer
    
    Transfer workspace ownership. Only org admin or platform admin can do this.
    
    Args:
        workspace_id: Workspace UUID
        user_id: Supabase user ID (requester)
        user_info: User information from auth token
        body: Request body with new_owner_id
    
    Returns:
        Updated workspace
    """
    if not workspace_id:
        raise common.ValidationError('Workspace ID is required')
    
    new_owner_id = body.get('new_owner_id') or body.get('newOwnerId')
    if not new_owner_id:
        raise common.ValidationError('new_owner_id is required')
    
    # Get workspace to check org_id
    workspace = common.find_one(
        table='workspaces',
        filters={'id': workspace_id, 'deleted_at': None}
    )
    if not workspace:
        raise common.NotFoundError('Workspace not found')
    
    # Check authorization: org admin OR platform admin (NOT just ws_owner)
    is_org_admin = _is_org_admin(workspace['org_id'], user_id)
    is_sys_admin = _is_sys_admin(user_id)
    
    if not is_org_admin and not is_sys_admin:
        raise common.ForbiddenError('Only organization or sys administrators can transfer workspace ownership')
    
    # Validate new owner is in the organization
    org_member = common.find_one(
        table='org_members',
        filters={'org_id': workspace['org_id'], 'user_id': new_owner_id}
    )
    if not org_member:
        raise common.ValidationError('New owner must be a member of the organization')
    
    try:
        # Check if there's an RPC function for this
        try:
            result = common.rpc(
                function_name='transfer_ws_ownership',
                params={
                    'p_ws_id': workspace_id,
                    'p_new_owner_id': new_owner_id,
                    'p_requester_id': user_id
                }
            )
        except Exception as rpc_error:
            # If RPC doesn't exist, do it manually
            logger.warning(f'RPC function not found, transferring ownership manually: {str(rpc_error)}')
            
            # Get current owner(s)
            current_owners = common.find_many(
                table='ws_members',
                filters={'ws_id': workspace_id, 'ws_role': 'ws_owner', 'deleted_at': None}
            )
            
            # Check if new owner is already a member
            new_owner_member = common.find_one(
                table='ws_members',
                filters={'ws_id': workspace_id, 'user_id': new_owner_id, 'deleted_at': None}
            )
            
            if new_owner_member:
                # Update existing member to owner
                common.update_one(
                    table='ws_members',
                    filters={'id': new_owner_member['id']},
                    data={'ws_role': 'ws_owner', 'updated_by': user_id}
                )
            else:
                # Add new owner
                common.insert_one(
                    table='ws_members',
                    data={
                        'ws_id': workspace_id,
                        'user_id': new_owner_id,
                        'ws_role': 'ws_owner',
                        'created_by': user_id
                    }
                )
            
            # Demote previous owners to admin
            for owner in current_owners:
                common.update_one(
                    table='ws_members',
                    filters={'id': owner['id']},
                    data={'ws_role': 'ws_admin', 'updated_by': user_id}
                )
            
            result = workspace
        
        # Log activity
        _log_activity(workspace_id, user_id, 'Ownership transferred', {'new_owner_id': new_owner_id})
        
        # Get updated workspace
        updated_workspace = common.find_one(
            table='workspaces',
            filters={'id': workspace_id}
        )
        
        # Add user info
        updated_workspace['user_role'] = _get_user_ws_role(workspace_id, user_id)
        
        members = common.find_many(
            table='ws_members',
            filters={'ws_id': workspace_id, 'deleted_at': None}
        )
        updated_workspace['member_count'] = len(members)
        
        logger.info(f"Transferred ownership of workspace {workspace_id} to {new_owner_id}")
        return common.success_response({
            'message': 'Workspace ownership transferred successfully',
            'workspace': _transform_workspace(updated_workspace)
        })
    
    except Exception as e:
        logger.exception(f'Error transferring ownership of workspace {workspace_id}: {str(e)}')
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
    if not _is_ws_member(workspace_id, user_id):
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
            # Always set profile fields, even if profile not found
            member['email'] = profile.get('email') if profile else None
            member['display_name'] = profile.get('display_name') if profile else None
            member['avatar_url'] = profile.get('avatar_url') if profile else None
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
    if not _is_ws_owner(workspace_id, user_id):
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
        
        # Log activity
        _log_activity(workspace_id, user_id, 'Member added', {'member_user_id': member_user_id, 'role': ws_role})
        
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
    if not _is_ws_owner(workspace_id, user_id):
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
                function_name='count_ws_owners',
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
        
        # Log activity
        _log_activity(workspace_id, user_id, 'Member role updated', {'member_id': member_id, 'new_role': ws_role})
        
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
        is_owner = _is_ws_owner(workspace_id, user_id)
        is_self = member['user_id'] == user_id
        
        if not is_owner and not is_self:
            raise common.ForbiddenError('Only workspace owners or the member themselves can remove membership')
        
        # Prevent removing the last owner
        if member['ws_role'] == 'ws_owner':
            owner_count = common.rpc(
                function_name='count_ws_owners',
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
        
        # Log activity
        _log_activity(workspace_id, user_id, 'Member removed', {'member_id': member_id})
        
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
            function_name='toggle_ws_favorite',
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
            function_name='get_ws_with_member_info',
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


# =============================================================================
# Config Handlers
# =============================================================================

def handle_get_config() -> Dict[str, Any]:
    """
    GET /api/ws/config
    
    Get workspace module configuration. Available to all authenticated users.
    
    Returns:
        Configuration object with navigation labels, icons, feature flags (camelCase)
    """
    try:
        # Get singleton config record
        config = common.find_one(
            table='ws_configs',
            filters={'id': '00000000-0000-0000-0000-000000000001'}
        )
        
        if not config:
            # Return default config if not found (already camelCase)
            config = {
                'id': '00000000-0000-0000-0000-000000000001',
                'navLabelSingular': 'Workspace',
                'navLabelPlural': 'Workspaces',
                'navIcon': 'WorkspaceIcon',
                'enableFavorites': True,
                'enableTags': True,
                'enableColorCoding': True,
                'defaultColor': '#1976d2',
            }
        else:
            # Transform DB record (snake_case) to API format (camelCase)
            config = _transform_config(config)
        
        logger.info("Retrieved workspace config")
        return common.success_response({'config': config})
    
    except Exception as e:
        logger.exception(f'Error getting config: {str(e)}')
        raise


def handle_update_config(
    user_id: str,
    user_info: Dict[str, Any],
    body: Dict[str, Any]
) -> Dict[str, Any]:
    """
    PUT /api/ws/config
    
    Update workspace module configuration. Only sys_admin and sys_owner can update.
    
    Args:
        user_id: Supabase user ID
        user_info: User information from auth token
        body: Request body with config fields to update (accepts both camelCase and snake_case)
    
    Returns:
        Updated configuration
    """
    # Check if user has platform admin role
    if not _is_sys_admin(user_id):
        raise common.ForbiddenError('Only sys administrators can update workspace configuration')
    
    # Map camelCase to snake_case for field names
    # Accept both formats for flexibility (frontend sends camelCase, DB uses snake_case)
    field_mapping = {
        'navLabelSingular': 'nav_label_singular',
        'navLabelPlural': 'nav_label_plural',
        'navIcon': 'nav_icon',
        'enableFavorites': 'enable_favorites',
        'enableTags': 'enable_tags',
        'enableColorCoding': 'enable_color_coding',
        'defaultColor': 'default_color',
        'defaultRetentionDays': 'default_retention_days',
        'maxTagsPerWorkspace': 'max_tags_per_workspace',
        'maxTagLength': 'max_tag_length',
        # Also allow snake_case input
        'nav_label_singular': 'nav_label_singular',
        'nav_label_plural': 'nav_label_plural',
        'nav_icon': 'nav_icon',
        'enable_favorites': 'enable_favorites',
        'enable_tags': 'enable_tags',
        'enable_color_coding': 'enable_color_coding',
        'default_color': 'default_color',
        'default_retention_days': 'default_retention_days',
        'max_tags_per_workspace': 'max_tags_per_workspace',
        'max_tag_length': 'max_tag_length',
    }
    
    # Normalize input to snake_case
    update_data = {}
    for key, value in body.items():
        if key in field_mapping and value is not None:
            update_data[field_mapping[key]] = value
    
    if not update_data:
        raise common.ValidationError('No valid fields to update')
    
    # Validate labels
    if 'nav_label_singular' in update_data:
        if len(update_data['nav_label_singular']) < 1 or len(update_data['nav_label_singular']) > 50:
            raise common.ValidationError('nav_label_singular must be 1-50 characters')
    
    if 'nav_label_plural' in update_data:
        if len(update_data['nav_label_plural']) < 1 or len(update_data['nav_label_plural']) > 50:
            raise common.ValidationError('nav_label_plural must be 1-50 characters')
    
    # Validate color format
    if 'default_color' in update_data:
        color = update_data['default_color']
        if not (color.startswith('#') and len(color) == 7):
            raise common.ValidationError('default_color must be in #RRGGBB format')
    
    # Validate retention days
    if 'default_retention_days' in update_data:
        retention_days = update_data['default_retention_days']
        if retention_days is not None and (not isinstance(retention_days, int) or retention_days < 1 or retention_days > 365):
            raise common.ValidationError('default_retention_days must be between 1 and 365')
    
    # Validate max tags per workspace
    if 'max_tags_per_workspace' in update_data:
        max_tags = update_data['max_tags_per_workspace']
        if max_tags is not None and (not isinstance(max_tags, int) or max_tags < 1 or max_tags > 50):
            raise common.ValidationError('max_tags_per_workspace must be between 1 and 50')
    
    # Validate max tag length
    if 'max_tag_length' in update_data:
        max_length = update_data['max_tag_length']
        if max_length is not None and (not isinstance(max_length, int) or max_length < 3 or max_length > 50):
            raise common.ValidationError('max_tag_length must be between 3 and 50')
    
    update_data['updated_by'] = user_id
    
    try:
        # Update singleton config record
        updated_config = common.update_one(
            table='ws_configs',
            filters={'id': '00000000-0000-0000-0000-000000000001'},
            data=update_data
        )
        
        if not updated_config:
            raise common.NotFoundError('Configuration not found')
        
        logger.info(f"Updated workspace config by user {user_id}")
        # Transform DB record (snake_case) to API format (camelCase)
        return common.success_response({'config': _transform_config(updated_config)})
    
    except Exception as e:
        logger.exception(f'Error updating config: {str(e)}')
        raise


# =============================================================================
# Organization Admin Handlers (New Routes)
# =============================================================================

def handle_admin_list_workspaces(
    org_id: str,
    user_id: str,
    user_info: Dict[str, Any],
    event: Dict[str, Any]
) -> Dict[str, Any]:
    """
    GET /admin/org/ws/workspaces
    
    List all workspaces in an organization (admin view).
    Org admin or platform admin can access.
    
    Args:
        org_id: Organization ID
        user_id: Supabase user ID
        user_info: User information from auth token
        event: API Gateway event
    
    Returns:
        List of all org workspaces with admin metadata
    """
    # Check authorization: org admin or platform admin
    is_org_admin = _is_org_admin(org_id, user_id)
    is_sys_admin = _is_sys_admin(user_id)
    
    if not is_org_admin and not is_sys_admin:
        raise common.ForbiddenError('Only organization or sys administrators can list all org workspaces')
    
    try:
        query_params = event.get('queryStringParameters') or {}
        status = query_params.get('status', 'active')  # active, archived, all, deleted
        
        # Get all workspaces for organization
        filters = {'org_id': org_id}
        
        if status == 'active':
            filters['deleted_at'] = None
            filters['status'] = 'active'
        elif status == 'archived':
            filters['deleted_at'] = None
            filters['status'] = 'archived'
        elif status == 'deleted':
            # Only fetch deleted workspaces (deleted_at IS NOT NULL)
            # This requires a special query since we can't directly filter for NOT NULL
            pass  # Will handle below
        # 'all' means no additional filters
        
        if status == 'deleted':
            # Get all workspaces and filter manually for deleted ones
            all_workspaces = common.find_many(table='workspaces', filters={'org_id': org_id})
            workspaces = [w for w in all_workspaces if w.get('deleted_at') is not None]
        else:
            workspaces = common.find_many(table='workspaces', filters=filters)
        
        # Enrich with member counts and owner info
        for workspace in workspaces:
            # Get member count
            members = common.find_many(
                table='ws_members',
                filters={'ws_id': workspace['id'], 'deleted_at': None}
            )
            workspace['member_count'] = len(members)
            
            # Get owner info
            owners = [m for m in members if m.get('ws_role') == 'ws_owner']
            if owners:
                owner = owners[0]  # Get first owner
                profile = common.find_one('user_profiles', {'user_id': owner['user_id']})
                workspace['owner_name'] = profile.get('display_name') if profile else 'Unknown'
                workspace['owner_email'] = profile.get('email') if profile else None
        
        result = {
            'workspaces': [_transform_workspace(w) for w in workspaces],
            'totalCount': len(workspaces),
            'filters': {
                'status': status,
                'orgId': org_id
            }
        }
        
        logger.info(f"Admin retrieved {len(workspaces)} workspaces for org {org_id}")
        return common.success_response(result)
    
    except Exception as e:
        logger.exception(f'Error listing workspaces for org {org_id}: {str(e)}')
        raise


def handle_admin_restore_workspace(
    workspace_id: str,
    org_id: str,
    user_id: str,
    user_info: Dict[str, Any]
) -> Dict[str, Any]:
    """
    POST /admin/org/ws/workspaces/{workspaceId}/restore
    
    Admin restore a deleted workspace. Org admin or platform admin can restore.
    Unlike user restore, this doesn't require the admin to have been an owner.
    
    Args:
        workspace_id: Workspace UUID
        org_id: Organization ID
        user_id: Supabase user ID (admin performing restore)
        user_info: User information from auth token
    
    Returns:
        Restored workspace
    """
    if not workspace_id:
        raise common.ValidationError('Workspace ID is required')
    
    # Check authorization: org admin or platform admin
    is_org_admin = _is_org_admin(org_id, user_id)
    is_sys_admin = _is_sys_admin(user_id)
    
    if not is_org_admin and not is_sys_admin:
        raise common.ForbiddenError('Only organization or sys administrators can restore workspaces')
    
    # Verify workspace belongs to this org
    workspace = common.find_one(
        table='workspaces',
        filters={'id': workspace_id}
    )
    if not workspace:
        raise common.NotFoundError('Workspace not found')
    
    if workspace.get('org_id') != org_id:
        raise common.ForbiddenError('Workspace does not belong to this organization')
    
    if not workspace.get('deleted_at'):
        raise common.ValidationError('Workspace is not deleted')
    
    try:
        # Restore workspace
        restored = common.update_one(
            table='workspaces',
            filters={'id': workspace_id},
            data={'deleted_at': None, 'updated_by': user_id}
        )
        
        # Log activity
        _log_activity(workspace_id, user_id, 'Workspace restored by admin')
        
        # Add metadata
        restored['user_role'] = None  # Admin may not be a member
        restored['is_favorited'] = False
        
        members = common.find_many(
            table='ws_members',
            filters={'ws_id': workspace_id, 'deleted_at': None}
        )
        restored['member_count'] = len(members)
        
        logger.info(f"Admin restored workspace {workspace_id}")
        return common.success_response({
            'message': 'Workspace restored successfully',
            'workspace': _transform_workspace(restored)
        })
    
    except Exception as e:
        logger.exception(f'Error restoring workspace {workspace_id}: {str(e)}')
        raise


def handle_admin_delete_workspace(
    workspace_id: str,
    org_id: str,
    user_id: str,
    user_info: Dict[str, Any]
) -> Dict[str, Any]:
    """
    DELETE /admin/org/ws/workspaces/{workspaceId}
    
    Admin force delete a workspace. Org admin or platform admin can delete.
    Unlike user delete, this doesn't require the admin to be an owner.
    
    Args:
        workspace_id: Workspace UUID
        org_id: Organization ID
        user_id: Supabase user ID (admin performing delete)
        user_info: User information from auth token
    
    Returns:
        Deletion confirmation
    """
    if not workspace_id:
        raise common.ValidationError('Workspace ID is required')
    
    # Check authorization: org admin or platform admin
    is_org_admin = _is_org_admin(org_id, user_id)
    is_sys_admin = _is_sys_admin(user_id)
    
    if not is_org_admin and not is_sys_admin:
        raise common.ForbiddenError('Only organization or sys administrators can force delete workspaces')
    
    # Verify workspace belongs to this org
    workspace = common.find_one(
        table='workspaces',
        filters={'id': workspace_id, 'deleted_at': None}
    )
    if not workspace:
        raise common.NotFoundError('Workspace not found')
    
    if workspace.get('org_id') != org_id:
        raise common.ForbiddenError('Workspace does not belong to this organization')
    
    try:
        # Soft delete workspace
        deleted = common.update_one(
            table='workspaces',
            filters={'id': workspace_id},
            data={'deleted_at': 'NOW()', 'updated_by': user_id}
        )
        
        # Log activity
        _log_activity(workspace_id, user_id, 'Workspace deleted by admin')
        
        logger.info(f"Admin deleted workspace {workspace_id}")
        return common.success_response({
            'message': 'Workspace deleted successfully',
            'workspaceId': workspace_id,
            'deletedAt': deleted.get('deleted_at')
        })
    
    except Exception as e:
        logger.exception(f'Error deleting workspace {workspace_id}: {str(e)}')
        raise


# =============================================================================
# Admin Handlers (Legacy)
# =============================================================================

def handle_admin_stats(user_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    GET /api/ws/admin/stats
    
    Get workspace statistics across all organizations. Platform admin only.
    DEPRECATED: Use /ws/sys/analytics instead.
    
    Args:
        user_info: User information from auth token
    
    Returns:
        Platform-wide workspace statistics
    """
    # Check if user has sys admin role
    # Must query database for sys_role (not in JWT)
    okta_uid = user_info['user_id']
    supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
    
    if not _is_sys_admin(supabase_user_id):
        raise common.ForbiddenError('Only sys administrators can access these statistics')
    
    try:
        # Get total workspace counts
        all_workspaces = common.find_many(table='workspaces', filters={})
        active_workspaces = [w for w in all_workspaces if w.get('deleted_at') is None and w.get('status') == 'active']
        archived_workspaces = [w for w in all_workspaces if w.get('deleted_at') is None and w.get('status') == 'archived']
        deleted_workspaces = [w for w in all_workspaces if w.get('deleted_at') is not None]
        
        # Get workspace counts by organization
        org_stats = {}
        for workspace in all_workspaces:
            org_id = workspace.get('org_id')
            if org_id:
                if org_id not in org_stats:
                    org_stats[org_id] = {'total': 0, 'active': 0, 'archived': 0, 'deleted': 0}
                org_stats[org_id]['total'] += 1
                if workspace.get('deleted_at') is not None:
                    org_stats[org_id]['deleted'] += 1
                elif workspace.get('status') == 'active':
                    org_stats[org_id]['active'] += 1
                elif workspace.get('status') == 'archived':
                    org_stats[org_id]['archived'] += 1
        
        stats = {
            'totalWorkspaces': len(all_workspaces),
            'activeWorkspaces': len(active_workspaces),
            'archivedWorkspaces': len(archived_workspaces),
            'deletedWorkspaces': len(deleted_workspaces),
            'organizationsCount': len(org_stats),
            'byOrganization': org_stats
        }
        
        logger.info("Retrieved admin workspace stats")
        return common.success_response({'stats': stats})
    
    except Exception as e:
        logger.exception(f'Error getting admin stats: {str(e)}')
        raise


def handle_admin_analytics(org_id: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    GET /api/ws/admin/analytics
    
    Get workspace analytics for an organization. Org admin and platform admin can access.
    
    Args:
        org_id: Organization ID
        user_info: User information from auth token
    
    Returns:
        Organization workspace analytics
    """
    # Check if user has appropriate admin role
    okta_uid = user_info['user_id']
    supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
    
    is_org_admin = _is_org_admin(org_id, supabase_user_id)
    is_sys_admin = _is_sys_admin(supabase_user_id)
    
    if not is_org_admin and not is_sys_admin:
        raise common.ForbiddenError('Only administrators can access analytics')
    
    try:
        # Get all workspaces for organization
        workspaces = common.find_many(
            table='workspaces',
            filters={'org_id': org_id}
        )
        
        # Calculate analytics
        total_count = len(workspaces)
        active_count = len([w for w in workspaces if w.get('deleted_at') is None and w.get('status') == 'active'])
        archived_count = len([w for w in workspaces if w.get('deleted_at') is None and w.get('status') == 'archived'])
        deleted_count = len([w for w in workspaces if w.get('deleted_at') is not None])
        
        # Get member counts
        total_members = 0
        for workspace in workspaces:
            if workspace.get('deleted_at') is None:
                members = common.find_many(
                    table='ws_members',
                    filters={'ws_id': workspace['id'], 'deleted_at': None}
                )
                total_members += len(members)
        
        avg_members = total_members / active_count if active_count > 0 else 0
        
        analytics = {
            'orgId': org_id,
            'totalWorkspaces': total_count,
            'activeWorkspaces': active_count,
            'archivedWorkspaces': archived_count,
            'deletedWorkspaces': deleted_count,
            'totalMembers': total_members,
            'avgMembersPerWorkspace': round(avg_members, 2)
        }
        
        logger.info(f"Retrieved analytics for org {org_id}")
        return common.success_response({'analytics': analytics})
    
    except Exception as e:
        logger.exception(f'Error getting analytics for org {org_id}: {str(e)}')
        raise
