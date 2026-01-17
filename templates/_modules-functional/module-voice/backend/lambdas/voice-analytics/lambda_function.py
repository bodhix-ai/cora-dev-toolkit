"""
Voice Analytics Lambda - Interview Analytics Management

Handles retrieval of AI-generated interview analytics including scores,
strengths, weaknesses, and recommendations. Analytics are created by
a background process after interview transcripts are processed.

Routes - Analytics:
- GET /api/voice/analytics - List analytics for organization
- GET /api/voice/analytics/{id} - Get analytics by session ID
"""

import json
import os
from typing import Any, Dict
import access_common as access


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for voice analytics operations.
    
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
        
        # GET /api/voice/analytics - List analytics
        if http_method == 'GET' and not path_params.get('id'):
            return handle_list_analytics(event, supabase_user_id)
        
        # GET /api/voice/analytics/{id} - Get analytics by session ID
        if http_method == 'GET' and path_params.get('id'):
            return handle_get_analytics(event, supabase_user_id, path_params['id'])
        
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
# ANALYTICS HANDLERS
# =============================================================================

def handle_list_analytics(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    List voice analytics for an organization.
    
    Query parameters:
    - orgId: (required) Organization ID
    - minScore: Filter by minimum score (0-100)
    - maxScore: Filter by maximum score (0-100)
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
    
    # Query analytics
    analytics_list = access.find_many(
        table='voice_analytics',
        filters=filters,
        order='created_at.desc',
        limit=limit,
        offset=offset
    )
    
    # Apply score filters (post-query since access_common may not support range queries)
    if query_params.get('minScore'):
        min_score = access.validate_integer(
            query_params['minScore'], 'minScore', min_value=0, max_value=100
        )
        analytics_list = [a for a in analytics_list if (a.get('score') or 0) >= min_score]
    
    if query_params.get('maxScore'):
        max_score = access.validate_integer(
            query_params['maxScore'], 'maxScore', min_value=0, max_value=100
        )
        analytics_list = [a for a in analytics_list if (a.get('score') or 100) <= max_score]
    
    # Format response with session details
    result = []
    for analytics in analytics_list:
        formatted = _format_analytics_response(analytics)
        
        # Include session summary
        if analytics.get('session_id'):
            session = access.find_one(
                table='voice_sessions',
                filters={'id': analytics['session_id']}
            )
            if session:
                formatted['session'] = {
                    'id': session['id'],
                    'candidateName': session.get('candidate_name'),
                    'interviewType': session['interview_type'],
                    'status': session['status'],
                    'completedAt': session.get('completed_at'),
                    'durationSeconds': session.get('duration_seconds')
                }
        
        result.append(formatted)
    
    return access.success_response(result)


def handle_get_analytics(event: Dict[str, Any], user_id: str, session_id: str) -> Dict[str, Any]:
    """
    Get voice analytics by session ID.
    
    The ID parameter is the session_id, not the analytics record ID.
    This makes it easier to navigate from session -> analytics.
    """
    session_id = access.validate_uuid(session_id, 'id')
    
    # Get session first to verify ownership
    session = access.find_one(
        table='voice_sessions',
        filters={'id': session_id}
    )
    
    if not session:
        raise access.NotFoundError('Session not found')
    
    # Verify org membership
    membership = access.find_one(
        table='org_members',
        filters={'org_id': session['org_id'], 'user_id': user_id}
    )
    if not membership:
        raise access.ForbiddenError('You do not have access to this session')
    
    # Get analytics for this session
    analytics = access.find_one(
        table='voice_analytics',
        filters={'session_id': session_id}
    )
    
    if not analytics:
        raise access.NotFoundError('Analytics not found for this session')
    
    result = _format_analytics_response(analytics, include_detailed=True)
    
    # Include full session details
    result['session'] = {
        'id': session['id'],
        'candidateName': session.get('candidate_name'),
        'candidateEmail': session.get('candidate_email'),
        'interviewType': session['interview_type'],
        'status': session['status'],
        'startedAt': session.get('started_at'),
        'completedAt': session.get('completed_at'),
        'durationSeconds': session.get('duration_seconds')
    }
    
    # Include transcript summary if available
    if analytics.get('transcript_id'):
        transcript = access.find_one(
            table='voice_transcripts',
            filters={'id': analytics['transcript_id']}
        )
        if transcript:
            result['transcript'] = {
                'id': transcript['id'],
                'summary': transcript.get('summary'),
                'hasFullText': bool(transcript.get('transcript_text'))
            }
    
    return access.success_response(result)


# =============================================================================
# INTERNAL FUNCTIONS (Called by background processor)
# =============================================================================

def create_analytics(
    org_id: str,
    session_id: str,
    transcript_id: str,
    score: int,
    strengths: list,
    weaknesses: list,
    recommendations: list,
    detailed_analysis: Dict = None,
    created_by: str = None
) -> Dict[str, Any]:
    """
    Create a new analytics record.
    
    This function is called internally by the analytics processor after
    an interview transcript has been analyzed by AI.
    """
    # Validate score
    if score is not None and (score < 0 or score > 100):
        raise access.ValidationError('Score must be between 0 and 100')
    
    # Create analytics record
    analytics_data = {
        'org_id': org_id,
        'session_id': session_id,
        'transcript_id': transcript_id,
        'score': score,
        'strengths': strengths or [],
        'weaknesses': weaknesses or [],
        'recommendations': recommendations or [],
        'detailed_analysis': detailed_analysis or {},
        'created_by': created_by
    }
    
    analytics = access.insert_one(table='voice_analytics', data=analytics_data)
    
    return analytics


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _format_analytics_response(analytics: Dict[str, Any], include_detailed: bool = False) -> Dict[str, Any]:
    """Format analytics for API response (snake_case to camelCase)."""
    response = {
        'id': analytics['id'],
        'orgId': analytics['org_id'],
        'sessionId': analytics.get('session_id'),
        'transcriptId': analytics.get('transcript_id'),
        'score': analytics.get('score'),
        'strengths': analytics.get('strengths', []),
        'weaknesses': analytics.get('weaknesses', []),
        'recommendations': analytics.get('recommendations', []),
        'createdAt': analytics.get('created_at'),
        'updatedAt': analytics.get('updated_at'),
        'createdBy': analytics.get('created_by')
    }
    
    # Include detailed analysis only when requested (can be large)
    if include_detailed:
        response['detailedAnalysis'] = analytics.get('detailed_analysis', {})
    
    return response
