"""
Voice Sessions Lambda - Session CRUD Operations

Handles voice interview session management including creation, retrieval,
updates, status transitions, Daily.co bot orchestration, and KB associations.

Routes - Sessions:
- GET /voice/sessions - List sessions for organization/workspace
- GET /voice/sessions/{sessionId} - Get session by ID
- POST /voice/sessions - Create new session
- PUT /voice/sessions/{sessionId} - Update session
- DELETE /voice/sessions/{sessionId} - Delete session
- POST /voice/sessions/{sessionId}/start - Start bot for session

Routes - KB Associations:
- GET /voice/sessions/{sessionId}/kbs - List KB associations for session
- POST /voice/sessions/{sessionId}/kbs - Add KB to session
- PUT /voice/sessions/{sessionId}/kbs/{kbId} - Toggle KB enabled status
- DELETE /voice/sessions/{sessionId}/kbs/{kbId} - Remove KB from session
"""

import json
import os
import requests
import boto3
from typing import Any, Dict, Optional
from datetime import datetime, timedelta
import org_common as common
import voice_common.permissions as voice_permissions


# Environment variables
DAILY_API_BASE = 'https://api.daily.co/v1'
ECS_CLUSTER_NAME = os.environ.get('ECS_CLUSTER_NAME')
ECS_TASK_DEFINITION_ARN = os.environ.get('ECS_TASK_DEFINITION_ARN')
ECS_SUBNETS = os.environ.get('ECS_SUBNETS', '').split(',')
ECS_SECURITY_GROUPS = os.environ.get('ECS_SECURITY_GROUPS', '').split(',')
DAILY_API_KEY_SECRET_ARN = os.environ.get('DAILY_API_KEY_SECRET_ARN')
WEBSOCKET_API_URL = os.environ.get('WEBSOCKET_API_URL')

# AWS clients
secrets_client = boto3.client('secretsmanager')
ecs_client = boto3.client('ecs')


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for voice session operations.
    
    Routes requests to appropriate handlers based on HTTP method and path.
    """
    print(json.dumps(event, default=str))
    
    try:
        # Extract user info from authorizer
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        
        # Convert external UID to Supabase UUID for database operations
        supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
        
        # Extract HTTP method
        http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod')
        if not http_method:
            return common.bad_request_response('HTTP method not found in request')
        
        # Extract path and path parameters
        path = event.get('rawPath', '') or event.get('path', '')
        path_params = event.get('pathParameters', {}) or {}
        
        # Route based on path patterns
        if http_method == 'OPTIONS':
            return common.success_response({})
        
        # POST /api/voice/sessions/{id}/start - Start bot for session
        if http_method == 'POST' and '/start' in path:
            session_id = path_params.get('id')
            return handle_start_session(event, supabase_user_id, session_id)
        
        # KB Association routes
        if '/kbs' in path:
            session_id = path_params.get('id')
            kb_id = path_params.get('kbId')
            
            # GET /api/voice/sessions/{id}/kbs - List KBs
            if http_method == 'GET' and not kb_id:
                return handle_list_session_kbs(event, supabase_user_id, session_id)
            
            # POST /api/voice/sessions/{id}/kbs - Add KB
            if http_method == 'POST' and not kb_id:
                return handle_add_session_kb(event, supabase_user_id, session_id)
            
            # PUT /api/voice/sessions/{id}/kbs/{kbId} - Toggle KB
            if http_method == 'PUT' and kb_id:
                return handle_toggle_session_kb(event, supabase_user_id, session_id, kb_id)
            
            # DELETE /api/voice/sessions/{id}/kbs/{kbId} - Remove KB
            if http_method == 'DELETE' and kb_id:
                return handle_remove_session_kb(event, supabase_user_id, session_id, kb_id)
        
        # GET /api/voice/sessions - List sessions
        if http_method == 'GET' and not path_params.get('id'):
            return handle_list_sessions(event, supabase_user_id)
        
        # GET /api/voice/sessions/{id} - Get session by ID
        if http_method == 'GET' and path_params.get('id'):
            return handle_get_session(event, supabase_user_id, path_params['id'])
        
        # POST /api/voice/sessions - Create session
        if http_method == 'POST':
            return handle_create_session(event, supabase_user_id)
        
        # PUT /api/voice/sessions/{id} - Update session
        if http_method == 'PUT':
            return handle_update_session(event, supabase_user_id, path_params['id'])
        
        # DELETE /api/voice/sessions/{id} - Delete session
        if http_method == 'DELETE':
            return handle_delete_session(event, supabase_user_id, path_params['id'])
        
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

def handle_list_sessions(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    List voice sessions for an organization or workspace.
    
    Query parameters:
    - orgId: (required) Organization ID
    - workspaceId: (optional) Filter by workspace ID
    - status: Filter by status
    - interviewType: Filter by interview type
    - limit: Number of results (default: 50, max: 100)
    - offset: Pagination offset (default: 0)
    """
    query_params = event.get('queryStringParameters', {}) or {}
    
    # Validate required org_id
    org_id = query_params.get('orgId')
    if not org_id:
        raise common.ValidationError('orgId query parameter is required')
    org_id = common.validate_uuid(org_id, 'orgId')
    
    # Step 1: Verify org membership
    if not common.can_access_org_resource(user_id, org_id):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Validate workspace_id if provided
    workspace_id = query_params.get('workspaceId')
    if workspace_id:
        workspace_id = common.validate_uuid(workspace_id, 'workspaceId')
        # Verify workspace membership
        ws_membership = common.find_one(
            table='ws_members',
            filters={'ws_id': workspace_id, 'user_id': user_id}
        )
        if not ws_membership:
            raise common.ForbiddenError('You do not have access to this workspace')
    
    # Pagination
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
    
    # Build filters
    filters = {'org_id': org_id}
    
    if workspace_id:
        filters['workspace_id'] = workspace_id
    
    if query_params.get('status'):
        filters['status'] = query_params['status']
    
    if query_params.get('interviewType'):
        filters['interview_type'] = query_params['interviewType']
    
    # Query sessions
    sessions = common.find_many(
        table='voice_sessions',
        filters=filters,
        order='created_at.desc',
        limit=limit,
        offset=offset
    )
    
    # Format response (snake_case to camelCase)
    result = [_format_session_response(s) for s in sessions]
    
    return common.success_response(result)


def handle_get_session(event: Dict[str, Any], user_id: str, session_id: str) -> Dict[str, Any]:
    """
    Get voice session by ID.
    """
    session_id = common.validate_uuid(session_id, 'id')
    
    # Step 1: Fetch resource
    session = common.find_one(
        table='voice_sessions',
        filters={'id': session_id}
    )
    
    if not session:
        raise common.NotFoundError('Session not found')
    
    # Step 2: Verify org membership
    if not common.can_access_org_resource(user_id, session['org_id']):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Step 3: Check resource permission
    if not voice_permissions.can_view_voice_session(user_id, session_id):
        raise common.ForbiddenError('You do not have permission to view this session')
    
    result = _format_session_response(session)
    
    # Include config details if present
    if session.get('config_id'):
        config = common.find_one(
            table='voice_configs',
            filters={'id': session['config_id']}
        )
        if config:
            result['config'] = {
                'id': config['id'],
                'name': config['name'],
                'interviewType': config['interview_type']
            }
    
    return common.success_response(result)


def handle_create_session(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Create a new voice session.
    
    Request body:
    {
        "orgId": "uuid",
        "workspaceId": "uuid",  // optional - workspace to associate session with
        "interviewType": "technical",
        "candidateName": "John Doe",
        "candidateEmail": "john@example.com",
        "configId": "uuid",  // optional
        "kbIds": ["uuid", ...]  // optional - KB IDs to associate for AI grounding
    }
    """
    body = json.loads(event.get('body', '{}'))
    
    # Validate required fields
    org_id = body.get('orgId')
    if not org_id:
        raise common.ValidationError('orgId is required')
    org_id = common.validate_uuid(org_id, 'orgId')
    
    interview_type = body.get('interviewType')
    if not interview_type:
        raise common.ValidationError('interviewType is required')
    interview_type = common.validate_string_length(interview_type, 'interviewType', max_length=100)
    
    # Step 1: Verify org membership (for creation, only org membership needed)
    if not common.can_access_org_resource(user_id, org_id):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Validate workspace_id if provided
    workspace_id = body.get('workspaceId')
    if workspace_id:
        workspace_id = common.validate_uuid(workspace_id, 'workspaceId')
        # Verify workspace membership
        ws_membership = common.find_one(
            table='ws_members',
            filters={'ws_id': workspace_id, 'user_id': user_id}
        )
        if not ws_membership:
            raise common.ForbiddenError('You do not have access to this workspace')
        
        # Verify workspace belongs to the org
        workspace = common.find_one(
            table='workspaces',
            filters={'id': workspace_id, 'org_id': org_id}
        )
        if not workspace:
            raise common.ValidationError('Workspace does not belong to the specified organization')
    
    # Validate config_id if provided
    config_id = body.get('configId')
    if config_id:
        config_id = common.validate_uuid(config_id, 'configId')
        config = common.find_one(
            table='voice_configs',
            filters={'id': config_id, 'org_id': org_id, 'is_active': True}
        )
        if not config:
            raise common.NotFoundError('Config not found or inactive')
    
    # Validate optional fields
    candidate_name = body.get('candidateName')
    if candidate_name:
        candidate_name = common.validate_string_length(candidate_name, 'candidateName', max_length=255)
    
    candidate_email = body.get('candidateEmail')
    if candidate_email:
        candidate_email = common.validate_string_length(candidate_email, 'candidateEmail', max_length=255)
    
    # Create session
    session_data = {
        'org_id': org_id,
        'ws_id': workspace_id,
        'interview_type': interview_type,
        'candidate_name': candidate_name,
        'candidate_email': candidate_email,
        'config_id': config_id,
        'status': 'pending',
        'session_metadata': body.get('sessionMetadata', {}),
        'created_by': user_id
    }
    
    session = common.insert_one(table='voice_sessions', data=session_data)
    
    # Add KB associations if provided
    kb_ids = body.get('kbIds', [])
    if kb_ids:
        for kb_id in kb_ids:
            try:
                kb_id = common.validate_uuid(kb_id, 'kbId')
                # Verify KB exists and is accessible
                kb = common.find_one(
                    table='kb_bases',
                    filters={'id': kb_id}
                )
                if kb:
                    common.insert_one(
                        table='voice_session_kbs',
                        data={
                            'session_id': session['id'],
                            'kb_id': kb_id,
                            'is_enabled': True,
                            'added_by': user_id
                        }
                    )
            except Exception as e:
                print(f'Warning: Failed to add KB {kb_id}: {e}')
    
    result = _format_session_response(session)
    
    # Include KB associations in response
    if kb_ids:
        result['kbAssociations'] = _get_session_kbs(session['id'])
    
    return common.created_response(result)


def handle_update_session(event: Dict[str, Any], user_id: str, session_id: str) -> Dict[str, Any]:
    """
    Update voice session.
    
    Request body:
    {
        "candidateName": "Jane Doe",
        "candidateEmail": "jane@example.com",
        "status": "cancelled",
        "sessionMetadata": {}
    }
    """
    session_id = common.validate_uuid(session_id, 'id')
    
    # Step 1: Fetch resource
    session = common.find_one(
        table='voice_sessions',
        filters={'id': session_id}
    )
    
    if not session:
        raise common.NotFoundError('Session not found')
    
    # Step 2: Verify org membership
    if not common.can_access_org_resource(user_id, session['org_id']):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Step 3: Check resource permission
    if not voice_permissions.can_edit_voice_session(user_id, session_id):
        raise common.ForbiddenError('You do not have permission to edit this session')
    
    body = json.loads(event.get('body', '{}'))
    update_data = {}
    
    # Handle updatable fields
    if 'candidateName' in body:
        update_data['candidate_name'] = common.validate_string_length(
            body['candidateName'], 'candidateName', max_length=255
        ) if body['candidateName'] else None
    
    if 'candidateEmail' in body:
        update_data['candidate_email'] = common.validate_string_length(
            body['candidateEmail'], 'candidateEmail', max_length=255
        ) if body['candidateEmail'] else None
    
    if 'sessionMetadata' in body:
        update_data['session_metadata'] = body['sessionMetadata']
    
    # Handle status update with validation
    if 'status' in body:
        new_status = body['status']
        current_status = session['status']
        
        # Validate status transition
        valid_transitions = {
            'pending': ['ready', 'failed', 'cancelled'],
            'ready': ['active', 'cancelled'],
            'active': ['completed', 'failed', 'cancelled']
        }
        
        allowed = valid_transitions.get(current_status, [])
        if new_status not in allowed:
            raise common.ValidationError(
                f'Invalid status transition from {current_status} to {new_status}'
            )
        
        update_data['status'] = new_status
        
        # Set timestamps based on status
        if new_status == 'active':
            update_data['started_at'] = datetime.utcnow().isoformat()
        elif new_status in ['completed', 'failed', 'cancelled']:
            update_data['completed_at'] = datetime.utcnow().isoformat()
            
            # Calculate duration if started
            if session.get('started_at'):
                started = session['started_at']
                if isinstance(started, str):
                    started = datetime.fromisoformat(started.replace('Z', '+00:00'))
                duration = (datetime.utcnow() - started.replace(tzinfo=None)).total_seconds()
                update_data['duration_seconds'] = int(duration)
    
    if not update_data:
        raise common.ValidationError('No valid fields to update')
    
    update_data['updated_by'] = user_id
    
    updated_session = common.update_one(
        table='voice_sessions',
        filters={'id': session_id},
        data=update_data
    )
    
    result = _format_session_response(updated_session)
    
    return common.success_response(result)


def handle_delete_session(event: Dict[str, Any], user_id: str, session_id: str) -> Dict[str, Any]:
    """
    Delete voice session.
    
    Only sessions in pending/cancelled/failed status can be deleted.
    """
    session_id = common.validate_uuid(session_id, 'id')
    
    # Step 1: Fetch resource
    session = common.find_one(
        table='voice_sessions',
        filters={'id': session_id}
    )
    
    if not session:
        raise common.NotFoundError('Session not found')
    
    # Step 2: Verify org membership
    if not common.can_access_org_resource(user_id, session['org_id']):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Step 3: Check resource permission
    if not voice_permissions.can_delete_voice_session(user_id, session_id):
        raise common.ForbiddenError('You do not have permission to delete this session')
    
    # Check if session can be deleted
    if session['status'] not in ['pending', 'cancelled', 'failed']:
        raise common.ValidationError(
            f"Cannot delete session in status: {session['status']}. "
            "Only pending, cancelled, or failed sessions can be deleted."
        )
    
    # Delete the session
    common.delete_one(
        table='voice_sessions',
        filters={'id': session_id}
    )
    
    return common.success_response({
        'message': 'Session deleted successfully',
        'id': session_id
    })


# =============================================================================
# START SESSION HANDLER
# =============================================================================

def handle_start_session(event: Dict[str, Any], user_id: str, session_id: str) -> Dict[str, Any]:
    """
    Start a voice session - creates Daily.co room and starts ECS bot.
    
    POST /api/voice/sessions/{id}/start
    """
    session_id = common.validate_uuid(session_id, 'id')
    
    # Step 1: Fetch resource
    session = common.find_one(
        table='voice_sessions',
        filters={'id': session_id}
    )
    
    if not session:
        raise common.NotFoundError('Session not found')
    
    # Step 2: Verify org membership
    if not common.can_access_org_resource(user_id, session['org_id']):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Step 3: Check resource permission (starting is an edit operation)
    if not voice_permissions.can_edit_voice_session(user_id, session_id):
        raise common.ForbiddenError('You do not have permission to start this session')
    
    # Check session status
    if session['status'] not in ['pending', 'ready']:
        raise common.ValidationError(
            f"Cannot start session in status: {session['status']}. "
            "Session must be in pending or ready status."
        )
    
    org_id = session['org_id']
    
    # Get interview config
    config = {}
    if session.get('config_id'):
        config_record = common.find_one(
            table='voice_configs',
            filters={'id': session['config_id']}
        )
        if config_record:
            config = config_record.get('config_json', {})
    
    # Create Daily.co room
    room_data = _create_daily_room(org_id, session_id)
    
    # Create meeting tokens
    bot_token = _create_meeting_token(org_id, room_data['room_name'], is_bot=True)
    participant_token = _create_meeting_token(org_id, room_data['room_name'], is_bot=False)
    
    # Start ECS bot task
    task_arn = _start_ecs_bot(
        session_id=session_id,
        room_url=room_data['room_url'],
        room_token=bot_token,
        config=config,
        org_id=org_id
    )
    
    # Update session with Daily.co details
    updated_session = common.update_one(
        table='voice_sessions',
        filters={'id': session_id},
        data={
            'status': 'ready',
            'daily_room_url': room_data['room_url'],
            'daily_room_name': room_data['room_name'],
            'daily_room_token': participant_token,
            'ecs_task_arn': task_arn,
            'updated_by': user_id
        }
    )
    
    result = _format_session_response(updated_session)
    
    return common.success_response(result)


# =============================================================================
# DAILY.CO INTEGRATION
# =============================================================================

def _get_daily_api_key(org_id: str) -> str:
    """Get Daily.co API key from AWS Secrets Manager."""
    # First check for org-specific credentials
    credential = common.find_one(
        table='voice_credentials',
        filters={'org_id': org_id, 'service_name': 'daily', 'is_active': True}
    )
    
    if credential:
        secret_arn = credential['credentials_secret_arn']
    else:
        # Fall back to platform default
        secret_arn = DAILY_API_KEY_SECRET_ARN
    
    if not secret_arn:
        raise common.ValidationError('Daily.co API key not configured')
    
    response = secrets_client.get_secret_value(SecretId=secret_arn)
    secret_data = json.loads(response['SecretString'])
    return secret_data.get('api_key') or secret_data.get('DAILY_API_KEY')


def _create_daily_room(org_id: str, session_id: str) -> Dict[str, str]:
    """Create a Daily.co room for the interview session."""
    api_key = _get_daily_api_key(org_id)
    
    room_name = f"voice-{session_id[:8]}"
    
    # Room expires in 24 hours
    exp_time = int((datetime.utcnow() + timedelta(hours=24)).timestamp())
    
    response = requests.post(
        f'{DAILY_API_BASE}/rooms',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        },
        json={
            'name': room_name,
            'privacy': 'private',
            'properties': {
                'exp': exp_time,
                'max_participants': 2,
                'enable_recording': False,
                'enable_chat': False,
                'start_audio_off': False,
                'start_video_off': True
            }
        },
        timeout=30
    )
    
    if response.status_code != 200:
        print(f'Daily.co room creation failed: {response.text}')
        raise Exception(f'Failed to create Daily room: {response.text}')
    
    room_data = response.json()
    return {
        'room_url': room_data['url'],
        'room_name': room_data['name']
    }


def _create_meeting_token(org_id: str, room_name: str, is_bot: bool = False) -> str:
    """Create a meeting token for room access."""
    api_key = _get_daily_api_key(org_id)
    
    # Token expires in 2 hours
    exp_time = int((datetime.utcnow() + timedelta(hours=2)).timestamp())
    
    response = requests.post(
        f'{DAILY_API_BASE}/meeting-tokens',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        },
        json={
            'properties': {
                'room_name': room_name,
                'is_owner': is_bot,
                'exp': exp_time,
                'user_name': 'Interview Bot' if is_bot else 'Candidate'
            }
        },
        timeout=30
    )
    
    if response.status_code != 200:
        print(f'Daily.co token creation failed: {response.text}')
        raise Exception(f'Failed to create meeting token: {response.text}')
    
    return response.json()['token']


# =============================================================================
# ECS BOT ORCHESTRATION
# =============================================================================

def _start_ecs_bot(
    session_id: str,
    room_url: str,
    room_token: str,
    config: Dict,
    org_id: str
) -> str:
    """Start Pipecat bot as ECS Fargate task."""
    if not ECS_CLUSTER_NAME or not ECS_TASK_DEFINITION_ARN:
        print('ECS not configured, skipping bot start')
        return 'ecs-not-configured'
    
    response = ecs_client.run_task(
        cluster=ECS_CLUSTER_NAME,
        taskDefinition=ECS_TASK_DEFINITION_ARN,
        launchType='FARGATE',
        networkConfiguration={
            'awsvpcConfiguration': {
                'subnets': [s for s in ECS_SUBNETS if s],
                'securityGroups': [sg for sg in ECS_SECURITY_GROUPS if sg],
                'assignPublicIp': 'ENABLED'
            }
        },
        overrides={
            'containerOverrides': [
                {
                    'name': 'pipecat-bot',
                    'environment': [
                        {'name': 'SESSION_ID', 'value': session_id},
                        {'name': 'DAILY_ROOM_URL', 'value': room_url},
                        {'name': 'DAILY_ROOM_TOKEN', 'value': room_token},
                        {'name': 'BOT_CONFIG', 'value': json.dumps(config)},
                        {'name': 'ORG_ID', 'value': org_id},
                        {'name': 'WEBSOCKET_URL', 'value': WEBSOCKET_API_URL or ''}
                    ]
                }
            ]
        },
        tags=[
            {'key': 'SessionId', 'value': session_id},
            {'key': 'Module', 'value': 'voice'},
            {'key': 'OrgId', 'value': org_id}
        ]
    )
    
    if not response.get('tasks'):
        failures = response.get('failures', [])
        print(f'Failed to start ECS task: {failures}')
        raise Exception(f"Failed to start ECS task: {failures}")
    
    task_arn = response['tasks'][0]['taskArn']
    print(f'Started ECS task: {task_arn}')
    return task_arn


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

# =============================================================================
# KB ASSOCIATION HANDLERS
# =============================================================================

def handle_list_session_kbs(event: Dict[str, Any], user_id: str, session_id: str) -> Dict[str, Any]:
    """
    List KB associations for a voice session.
    
    GET /api/voice/sessions/{id}/kbs
    """
    session_id = common.validate_uuid(session_id, 'id')
    
    # Step 1: Fetch resource
    session = common.find_one(
        table='voice_sessions',
        filters={'id': session_id}
    )
    
    if not session:
        raise common.NotFoundError('Session not found')
    
    # Step 2: Verify org membership
    if not common.can_access_org_resource(user_id, session['org_id']):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Step 3: Check resource permission
    if not voice_permissions.can_view_voice_session(user_id, session_id):
        raise common.ForbiddenError('You do not have permission to view this session')
    
    result = _get_session_kbs(session_id)
    
    return common.success_response(result)


def handle_add_session_kb(event: Dict[str, Any], user_id: str, session_id: str) -> Dict[str, Any]:
    """
    Add a KB to a voice session.
    
    POST /api/voice/sessions/{id}/kbs
    
    Request body:
    {
        "kbId": "uuid",
        "isEnabled": true  // optional, default true
    }
    """
    session_id = common.validate_uuid(session_id, 'id')
    
    # Step 1: Fetch resource
    session = common.find_one(
        table='voice_sessions',
        filters={'id': session_id}
    )
    
    if not session:
        raise common.NotFoundError('Session not found')
    
    # Step 2: Verify org membership
    if not common.can_access_org_resource(user_id, session['org_id']):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Step 3: Check resource permission (adding KB is an edit operation)
    if not voice_permissions.can_edit_voice_session(user_id, session_id):
        raise common.ForbiddenError('You do not have permission to edit this session')
    
    body = json.loads(event.get('body', '{}'))
    
    kb_id = body.get('kbId')
    if not kb_id:
        raise common.ValidationError('kbId is required')
    kb_id = common.validate_uuid(kb_id, 'kbId')
    
    # Verify KB exists
    kb = common.find_one(
        table='kb_bases',
        filters={'id': kb_id}
    )
    if not kb:
        raise common.NotFoundError('Knowledge base not found')
    
    # Check if already associated
    existing = common.find_one(
        table='voice_session_kbs',
        filters={'session_id': session_id, 'kb_id': kb_id}
    )
    if existing:
        raise common.ValidationError('KB is already associated with this session')
    
    # Add association
    is_enabled = body.get('isEnabled', True)
    association = common.insert_one(
        table='voice_session_kbs',
        data={
            'session_id': session_id,
            'kb_id': kb_id,
            'is_enabled': is_enabled,
            'added_by': user_id
        }
    )
    
    return common.created_response({
        'id': association['id'],
        'sessionId': session_id,
        'kbId': kb_id,
        'kbName': kb.get('name'),
        'isEnabled': is_enabled,
        'addedAt': association.get('added_at')
    })


def handle_toggle_session_kb(event: Dict[str, Any], user_id: str, session_id: str, kb_id: str) -> Dict[str, Any]:
    """
    Toggle KB enabled status for a voice session.
    
    PUT /api/voice/sessions/{id}/kbs/{kbId}
    
    Request body:
    {
        "isEnabled": true|false
    }
    """
    session_id = common.validate_uuid(session_id, 'id')
    kb_id = common.validate_uuid(kb_id, 'kbId')
    
    # Step 1: Fetch resource
    session = common.find_one(
        table='voice_sessions',
        filters={'id': session_id}
    )
    
    if not session:
        raise common.NotFoundError('Session not found')
    
    # Step 2: Verify org membership
    if not common.can_access_org_resource(user_id, session['org_id']):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Step 3: Check resource permission (toggling KB is an edit operation)
    if not voice_permissions.can_edit_voice_session(user_id, session_id):
        raise common.ForbiddenError('You do not have permission to edit this session')
    
    # Get association
    association = common.find_one(
        table='voice_session_kbs',
        filters={'session_id': session_id, 'kb_id': kb_id}
    )
    if not association:
        raise common.NotFoundError('KB association not found')
    
    body = json.loads(event.get('body', '{}'))
    
    if 'isEnabled' not in body:
        raise common.ValidationError('isEnabled is required')
    
    is_enabled = bool(body['isEnabled'])
    
    # Update association
    updated = common.update_one(
        table='voice_session_kbs',
        filters={'session_id': session_id, 'kb_id': kb_id},
        data={'is_enabled': is_enabled}
    )
    
    return common.success_response({
        'id': updated['id'],
        'sessionId': session_id,
        'kbId': kb_id,
        'isEnabled': is_enabled
    })


def handle_remove_session_kb(event: Dict[str, Any], user_id: str, session_id: str, kb_id: str) -> Dict[str, Any]:
    """
    Remove KB from a voice session.
    
    DELETE /api/voice/sessions/{id}/kbs/{kbId}
    """
    session_id = common.validate_uuid(session_id, 'id')
    kb_id = common.validate_uuid(kb_id, 'kbId')
    
    # Step 1: Fetch resource
    session = common.find_one(
        table='voice_sessions',
        filters={'id': session_id}
    )
    
    if not session:
        raise common.NotFoundError('Session not found')
    
    # Step 2: Verify org membership
    if not common.can_access_org_resource(user_id, session['org_id']):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Step 3: Check resource permission (removing KB is an edit operation)
    if not voice_permissions.can_edit_voice_session(user_id, session_id):
        raise common.ForbiddenError('You do not have permission to edit this session')
    
    # Get association
    association = common.find_one(
        table='voice_session_kbs',
        filters={'session_id': session_id, 'kb_id': kb_id}
    )
    if not association:
        raise common.NotFoundError('KB association not found')
    
    # Delete association
    common.delete_one(
        table='voice_session_kbs',
        filters={'session_id': session_id, 'kb_id': kb_id}
    )
    
    return common.success_response({
        'message': 'KB removed from session',
        'sessionId': session_id,
        'kbId': kb_id
    })


def _get_session_kbs(session_id: str) -> list:
    """Get all KB associations for a session with KB details."""
    associations = common.find_many(
        table='voice_session_kbs',
        filters={'session_id': session_id}
    )
    
    result = []
    for assoc in associations:
        kb = common.find_one(
            table='kb_bases',
            filters={'id': assoc['kb_id']}
        )
        result.append({
            'id': assoc['id'],
            'kbId': assoc['kb_id'],
            'kbName': kb.get('name') if kb else None,
            'kbScope': kb.get('scope') if kb else None,
            'isEnabled': assoc.get('is_enabled', True),
            'addedAt': assoc.get('added_at')
        })
    
    return result


def _format_session_response(session: Dict[str, Any]) -> Dict[str, Any]:
    """Format session for API response (snake_case to camelCase)."""
    return {
        'id': session['id'],
        'orgId': session['org_id'],
        'workspaceId': session.get('workspace_id'),
        'candidateName': session.get('candidate_name'),
        'candidateEmail': session.get('candidate_email'),
        'interviewType': session['interview_type'],
        'configId': session.get('config_id'),
        'status': session['status'],
        'dailyRoomUrl': session.get('daily_room_url'),
        'dailyRoomName': session.get('daily_room_name'),
        'dailyRoomToken': session.get('daily_room_token'),
        'ecsTaskArn': session.get('ecs_task_arn'),
        'sessionMetadata': session.get('session_metadata', {}),
        'startedAt': session.get('started_at'),
        'completedAt': session.get('completed_at'),
        'durationSeconds': session.get('duration_seconds'),
        'createdAt': session.get('created_at'),
        'updatedAt': session.get('updated_at'),
        'createdBy': session.get('created_by'),
        'updatedBy': session.get('updated_by')
    }
