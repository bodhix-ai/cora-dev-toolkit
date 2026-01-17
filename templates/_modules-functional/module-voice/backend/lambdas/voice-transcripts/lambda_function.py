"""
Voice Transcripts Lambda - Transcript Management

Handles CRUD operations for voice interview transcripts including
retrieval, listing, and deletion. Transcripts are created by the
Pipecat bot via WebSocket when interviews complete.

Routes - Transcripts:
- GET /api/voice/transcripts - List transcripts for organization
- GET /api/voice/transcripts/{id} - Get transcript by ID
- DELETE /api/voice/transcripts/{id} - Delete transcript
"""

import json
import os
import boto3
from typing import Any, Dict
import access_common as access


# Environment variables
S3_BUCKET_NAME = os.environ.get('VOICE_TRANSCRIPTS_BUCKET')

# AWS clients
s3_client = boto3.client('s3')


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for voice transcript operations.
    
    Routes requests to appropriate handlers based on HTTP method and path.
    """
    print(json.dumps(event, default=str))
    
    try:
        # Extract user info from authorizer
        user_info = access.get_user_from_event(event)
        okta_uid = user_info['user_id']
        
        # Convert external UID to Supabase UUID for database operations
        supabase_user_id = access.get_supabase_user_id_from_external_uid(okta_uid)
        
        # Extract HTTP method
        http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod')
        if not http_method:
            return access.bad_request_response('HTTP method not found in request')
        
        # Extract path parameters
        path_params = event.get('pathParameters', {}) or {}
        
        # Route based on HTTP method
        if http_method == 'OPTIONS':
            return access.success_response({})
        
        # GET /api/voice/transcripts - List transcripts
        if http_method == 'GET' and not path_params.get('id'):
            return handle_list_transcripts(event, supabase_user_id)
        
        # GET /api/voice/transcripts/{id} - Get transcript by ID
        if http_method == 'GET' and path_params.get('id'):
            return handle_get_transcript(event, supabase_user_id, path_params['id'])
        
        # DELETE /api/voice/transcripts/{id} - Delete transcript
        if http_method == 'DELETE':
            return handle_delete_transcript(event, supabase_user_id, path_params['id'])
        
        return access.not_found_response('Route not found')
        
    except KeyError as e:
        print(f'KeyError: {str(e)}')
        return access.unauthorized_response(f'Missing user information: {str(e)}')
    except access.NotFoundError as e:
        return access.not_found_response(str(e))
    except access.ValidationError as e:
        return access.bad_request_response(str(e))
    except access.ForbiddenError as e:
        return access.forbidden_response(str(e))
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return access.internal_error_response('Internal server error')


# =============================================================================
# TRANSCRIPT CRUD HANDLERS
# =============================================================================

def handle_list_transcripts(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    List voice transcripts for an organization.
    
    Query parameters:
    - orgId: (required) Organization ID
    - sessionId: Filter by session ID
    - interviewType: Filter by interview type
    - candidateName: Filter by candidate name (partial match)
    - limit: Number of results (default: 50, max: 100)
    - offset: Pagination offset (default: 0)
    """
    query_params = event.get('queryStringParameters', {}) or {}
    
    # Validate required org_id
    org_id = query_params.get('orgId')
    if not org_id:
        raise access.ValidationError('orgId query parameter is required')
    org_id = access.validate_uuid(org_id, 'orgId')
    
    # Verify org membership
    membership = access.find_one(
        table='org_members',
        filters={'org_id': org_id, 'user_id': user_id}
    )
    if not membership:
        raise access.ForbiddenError('You do not have access to this organization')
    
    # Pagination
    limit = access.validate_integer(
        query_params.get('limit', 50),
        'limit',
        min_value=1,
        max_value=100
    )
    offset = access.validate_integer(
        query_params.get('offset', 0),
        'offset',
        min_value=0
    )
    
    # Build filters
    filters = {'org_id': org_id}
    
    if query_params.get('sessionId'):
        filters['session_id'] = access.validate_uuid(query_params['sessionId'], 'sessionId')
    
    if query_params.get('interviewType'):
        filters['interview_type'] = query_params['interviewType']
    
    # Query transcripts
    transcripts = access.find_many(
        table='voice_transcripts',
        filters=filters,
        order='created_at.desc',
        limit=limit,
        offset=offset
    )
    
    # Filter by candidate name if provided (partial match)
    if query_params.get('candidateName'):
        search_term = query_params['candidateName'].lower()
        transcripts = [
            t for t in transcripts 
            if t.get('candidate_name') and search_term in t['candidate_name'].lower()
        ]
    
    # Format response (snake_case to camelCase)
    result = [_format_transcript_response(t, include_text=False) for t in transcripts]
    
    return access.success_response(result)


def handle_get_transcript(event: Dict[str, Any], user_id: str, transcript_id: str) -> Dict[str, Any]:
    """
    Get voice transcript by ID.
    
    Query parameters:
    - includeText: Include full transcript text (default: true)
    """
    transcript_id = access.validate_uuid(transcript_id, 'id')
    query_params = event.get('queryStringParameters', {}) or {}
    
    # Get transcript
    transcript = access.find_one(
        table='voice_transcripts',
        filters={'id': transcript_id}
    )
    
    if not transcript:
        raise access.NotFoundError('Transcript not found')
    
    # Verify org membership
    membership = access.find_one(
        table='org_members',
        filters={'org_id': transcript['org_id'], 'user_id': user_id}
    )
    if not membership:
        raise access.ForbiddenError('You do not have access to this transcript')
    
    # Check if we should include full text
    include_text = query_params.get('includeText', 'true').lower() != 'false'
    
    result = _format_transcript_response(transcript, include_text=include_text)
    
    # Include session details if present
    if transcript.get('session_id'):
        session = access.find_one(
            table='voice_sessions',
            filters={'id': transcript['session_id']}
        )
        if session:
            result['session'] = {
                'id': session['id'],
                'status': session['status'],
                'interviewType': session['interview_type'],
                'candidateName': session.get('candidate_name'),
                'startedAt': session.get('started_at'),
                'completedAt': session.get('completed_at'),
                'durationSeconds': session.get('duration_seconds')
            }
    
    # Include analytics if present
    analytics = access.find_one(
        table='voice_analytics',
        filters={'transcript_id': transcript_id}
    )
    if analytics:
        result['analytics'] = {
            'id': analytics['id'],
            'score': analytics.get('score'),
            'strengths': analytics.get('strengths', []),
            'weaknesses': analytics.get('weaknesses', []),
            'recommendations': analytics.get('recommendations', [])
        }
    
    return access.success_response(result)


def handle_delete_transcript(event: Dict[str, Any], user_id: str, transcript_id: str) -> Dict[str, Any]:
    """
    Delete voice transcript.
    
    Also deletes associated S3 object if present.
    Only org admins can delete transcripts.
    """
    transcript_id = access.validate_uuid(transcript_id, 'id')
    
    # Get transcript
    transcript = access.find_one(
        table='voice_transcripts',
        filters={'id': transcript_id}
    )
    
    if not transcript:
        raise access.NotFoundError('Transcript not found')
    
    # Verify org membership with admin role
    membership = access.find_one(
        table='org_members',
        filters={'org_id': transcript['org_id'], 'user_id': user_id}
    )
    if not membership:
        raise access.ForbiddenError('You do not have access to this transcript')
    
    if membership.get('role') not in ['admin', 'owner']:
        raise access.ForbiddenError('Only org admins can delete transcripts')
    
    # Delete S3 object if present
    if transcript.get('transcript_s3_url') and S3_BUCKET_NAME:
        try:
            s3_key = _extract_s3_key_from_url(transcript['transcript_s3_url'])
            if s3_key:
                s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
        except Exception as e:
            print(f'Warning: Failed to delete S3 object: {e}')
            # Continue with record deletion even if S3 deletion fails
    
    # Delete associated analytics
    try:
        analytics = access.find_one(
            table='voice_analytics',
            filters={'transcript_id': transcript_id}
        )
        if analytics:
            access.delete_one(
                table='voice_analytics',
                filters={'transcript_id': transcript_id}
            )
    except Exception as e:
        print(f'Warning: Failed to delete analytics: {e}')
    
    # Delete the transcript record
    access.delete_one(
        table='voice_transcripts',
        filters={'id': transcript_id}
    )
    
    return access.success_response({
        'message': 'Transcript deleted successfully',
        'id': transcript_id
    })


# =============================================================================
# INTERNAL FUNCTIONS (Called by Pipecat bot via internal API)
# =============================================================================

def create_transcript(
    org_id: str,
    session_id: str,
    transcript_text: str,
    candidate_name: str = None,
    interview_type: str = None,
    summary: str = None,
    metadata: Dict = None,
    created_by: str = None
) -> Dict[str, Any]:
    """
    Create a new transcript record.
    
    This function is called internally by the Pipecat bot when an interview completes.
    It's not exposed as an API endpoint for external use.
    """
    # Upload transcript to S3 for archival
    s3_url = None
    if S3_BUCKET_NAME and transcript_text:
        s3_key = f"transcripts/{org_id}/{session_id}.txt"
        try:
            s3_client.put_object(
                Bucket=S3_BUCKET_NAME,
                Key=s3_key,
                Body=transcript_text.encode('utf-8'),
                ContentType='text/plain',
                Metadata={
                    'session_id': session_id,
                    'org_id': org_id
                }
            )
            s3_url = f"s3://{S3_BUCKET_NAME}/{s3_key}"
        except Exception as e:
            print(f'Warning: Failed to upload transcript to S3: {e}')
    
    # Create transcript record
    transcript_data = {
        'org_id': org_id,
        'session_id': session_id,
        'transcript_text': transcript_text,
        'transcript_s3_url': s3_url,
        'candidate_name': candidate_name,
        'interview_type': interview_type,
        'summary': summary,
        'metadata': metadata or {},
        'created_by': created_by
    }
    
    transcript = access.insert_one(table='voice_transcripts', data=transcript_data)
    
    return transcript


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _format_transcript_response(transcript: Dict[str, Any], include_text: bool = True) -> Dict[str, Any]:
    """Format transcript for API response (snake_case to camelCase)."""
    response = {
        'id': transcript['id'],
        'orgId': transcript['org_id'],
        'sessionId': transcript.get('session_id'),
        'candidateName': transcript.get('candidate_name'),
        'interviewType': transcript.get('interview_type'),
        'summary': transcript.get('summary'),
        'metadata': transcript.get('metadata', {}),
        'hasS3Backup': bool(transcript.get('transcript_s3_url')),
        'createdAt': transcript.get('created_at'),
        'updatedAt': transcript.get('updated_at'),
        'createdBy': transcript.get('created_by'),
        'updatedBy': transcript.get('updated_by')
    }
    
    # Include full transcript text if requested
    if include_text:
        response['transcriptText'] = transcript.get('transcript_text')
    
    # Include text preview for list views
    if not include_text and transcript.get('transcript_text'):
        text = transcript['transcript_text']
        response['textPreview'] = text[:200] + '...' if len(text) > 200 else text
    
    return response


def _extract_s3_key_from_url(s3_url: str) -> str:
    """Extract S3 key from s3:// URL."""
    if not s3_url or not s3_url.startswith('s3://'):
        return None
    
    # s3://bucket-name/key/path -> key/path
    parts = s3_url.replace('s3://', '').split('/', 1)
    if len(parts) >= 2:
        return parts[1]
    return None
