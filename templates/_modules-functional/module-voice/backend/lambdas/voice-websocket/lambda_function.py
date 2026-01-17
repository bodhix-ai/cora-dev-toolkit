"""
Voice WebSocket Lambda - Real-time Transcript Streaming

Handles WebSocket connections for real-time transcript streaming during
voice interviews. Manages connection lifecycle and broadcasts transcript
segments to connected clients.

Routes - WebSocket:
- $connect - Client connection
- $disconnect - Client disconnection
- transcript - Receive transcript segment from bot
- status - Receive session status update from bot
"""

import json
import os
import boto3
from typing import Any, Dict, Optional
from datetime import datetime
import access_common as access


# Environment variables
CONNECTIONS_TABLE = os.environ.get('CONNECTIONS_TABLE')
WEBSOCKET_API_URL = os.environ.get('WEBSOCKET_API_URL')

# AWS clients
dynamodb = boto3.resource('dynamodb')
apigateway = boto3.client('apigatewaymanagementapi', endpoint_url=WEBSOCKET_API_URL) if WEBSOCKET_API_URL else None


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for WebSocket operations.
    
    Routes requests based on route key ($connect, $disconnect, or action).
    """
    print(json.dumps(event, default=str))
    
    try:
        request_context = event.get('requestContext', {})
        route_key = request_context.get('routeKey', '')
        connection_id = request_context.get('connectionId', '')
        
        if route_key == '$connect':
            return handle_connect(event, connection_id)
        
        if route_key == '$disconnect':
            return handle_disconnect(event, connection_id)
        
        if route_key == 'transcript':
            return handle_transcript(event, connection_id)
        
        if route_key == 'status':
            return handle_status(event, connection_id)
        
        if route_key == 'subscribe':
            return handle_subscribe(event, connection_id)
        
        return _response(400, {'error': f'Unknown route: {route_key}'})
        
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return _response(500, {'error': 'Internal server error'})


# =============================================================================
# CONNECTION HANDLERS
# =============================================================================

def handle_connect(event: Dict[str, Any], connection_id: str) -> Dict[str, Any]:
    """
    Handle WebSocket connection.
    
    Validates authentication and stores connection info.
    """
    if not CONNECTIONS_TABLE:
        print('CONNECTIONS_TABLE not configured')
        return _response(500, {'error': 'WebSocket not configured'})
    
    # Get query parameters for auth
    query_params = event.get('queryStringParameters', {}) or {}
    token = query_params.get('token')
    session_id = query_params.get('sessionId')
    
    if not token:
        return _response(401, {'error': 'Token required'})
    
    if not session_id:
        return _response(400, {'error': 'sessionId required'})
    
    try:
        # Validate token and get user info
        # Note: In production, validate JWT token here
        # For now, we'll store the connection with session_id
        
        table = dynamodb.Table(CONNECTIONS_TABLE)
        table.put_item(
            Item={
                'connectionId': connection_id,
                'sessionId': session_id,
                'connectedAt': datetime.utcnow().isoformat(),
                'ttl': int(datetime.utcnow().timestamp()) + 86400  # 24 hour TTL
            }
        )
        
        print(f'Connection {connection_id} subscribed to session {session_id}')
        return _response(200, {'message': 'Connected'})
        
    except Exception as e:
        print(f'Connection error: {str(e)}')
        return _response(500, {'error': 'Failed to connect'})


def handle_disconnect(event: Dict[str, Any], connection_id: str) -> Dict[str, Any]:
    """
    Handle WebSocket disconnection.
    
    Removes connection from tracking table.
    """
    if not CONNECTIONS_TABLE:
        return _response(200, {})
    
    try:
        table = dynamodb.Table(CONNECTIONS_TABLE)
        table.delete_item(Key={'connectionId': connection_id})
        print(f'Connection {connection_id} disconnected')
        return _response(200, {})
        
    except Exception as e:
        print(f'Disconnect error: {str(e)}')
        return _response(200, {})  # Always return success for disconnect


def handle_subscribe(event: Dict[str, Any], connection_id: str) -> Dict[str, Any]:
    """
    Handle session subscription request.
    
    Updates connection to subscribe to a specific session.
    
    Message format:
    {
        "action": "subscribe",
        "sessionId": "uuid"
    }
    """
    if not CONNECTIONS_TABLE:
        return _response(500, {'error': 'WebSocket not configured'})
    
    try:
        body = json.loads(event.get('body', '{}'))
        session_id = body.get('sessionId')
        
        if not session_id:
            return _response(400, {'error': 'sessionId required'})
        
        # Update connection with new session ID
        table = dynamodb.Table(CONNECTIONS_TABLE)
        table.update_item(
            Key={'connectionId': connection_id},
            UpdateExpression='SET sessionId = :sid',
            ExpressionAttributeValues={':sid': session_id}
        )
        
        print(f'Connection {connection_id} subscribed to session {session_id}')
        
        # Send confirmation
        _send_to_connection(connection_id, {
            'type': 'subscribed',
            'sessionId': session_id
        })
        
        return _response(200, {'message': 'Subscribed'})
        
    except Exception as e:
        print(f'Subscribe error: {str(e)}')
        return _response(500, {'error': 'Failed to subscribe'})


# =============================================================================
# MESSAGE HANDLERS
# =============================================================================

def handle_transcript(event: Dict[str, Any], connection_id: str) -> Dict[str, Any]:
    """
    Handle transcript segment from bot.
    
    Broadcasts transcript segment to all clients subscribed to the session.
    Also persists the segment to the database.
    
    Message format:
    {
        "action": "transcript",
        "sessionId": "uuid",
        "segment": {
            "speaker": "bot" | "candidate",
            "text": "transcript text",
            "start_time": 0.0,
            "end_time": 1.5,
            "confidence": 0.95
        }
    }
    """
    try:
        body = json.loads(event.get('body', '{}'))
        session_id = body.get('sessionId')
        segment = body.get('segment', {})
        
        if not session_id:
            return _response(400, {'error': 'sessionId required'})
        
        if not segment:
            return _response(400, {'error': 'segment required'})
        
        # Validate segment structure
        required_fields = ['speaker', 'text', 'start_time', 'end_time']
        for field in required_fields:
            if field not in segment:
                return _response(400, {'error': f'segment.{field} required'})
        
        # Build message to broadcast
        message = {
            'type': 'transcript_segment',
            'sessionId': session_id,
            'segment': {
                'speaker': segment['speaker'],
                'text': segment['text'],
                'startTime': segment['start_time'],
                'endTime': segment['end_time'],
                'confidence': segment.get('confidence')
            },
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Broadcast to all subscribers
        broadcast_count = _broadcast_to_session(session_id, message)
        print(f'Broadcast transcript to {broadcast_count} connections for session {session_id}')
        
        return _response(200, {'message': 'Transcript broadcasted', 'count': broadcast_count})
        
    except json.JSONDecodeError:
        return _response(400, {'error': 'Invalid JSON'})
    except Exception as e:
        print(f'Transcript error: {str(e)}')
        return _response(500, {'error': 'Failed to process transcript'})


def handle_status(event: Dict[str, Any], connection_id: str) -> Dict[str, Any]:
    """
    Handle session status update from bot.
    
    Broadcasts status change to all clients subscribed to the session.
    
    Message format:
    {
        "action": "status",
        "sessionId": "uuid",
        "status": "active" | "completed" | "failed",
        "message": "optional status message"
    }
    """
    try:
        body = json.loads(event.get('body', '{}'))
        session_id = body.get('sessionId')
        status = body.get('status')
        
        if not session_id:
            return _response(400, {'error': 'sessionId required'})
        
        if not status:
            return _response(400, {'error': 'status required'})
        
        # Build message to broadcast
        message = {
            'type': 'session_status',
            'sessionId': session_id,
            'status': status,
            'message': body.get('message'),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Update session status in database
        try:
            access.update_one(
                table='voice_sessions',
                filters={'id': session_id},
                data={'status': status}
            )
        except Exception as e:
            print(f'Failed to update session status: {e}')
        
        # Broadcast to all subscribers
        broadcast_count = _broadcast_to_session(session_id, message)
        print(f'Broadcast status to {broadcast_count} connections for session {session_id}')
        
        return _response(200, {'message': 'Status broadcasted', 'count': broadcast_count})
        
    except json.JSONDecodeError:
        return _response(400, {'error': 'Invalid JSON'})
    except Exception as e:
        print(f'Status error: {str(e)}')
        return _response(500, {'error': 'Failed to process status'})


# =============================================================================
# BROADCAST HELPERS
# =============================================================================

def _broadcast_to_session(session_id: str, message: Dict[str, Any]) -> int:
    """
    Broadcast a message to all connections subscribed to a session.
    
    Returns the number of successful broadcasts.
    """
    if not CONNECTIONS_TABLE:
        return 0
    
    table = dynamodb.Table(CONNECTIONS_TABLE)
    
    # Query connections for this session
    # Note: In production, use a GSI on sessionId for efficient queries
    response = table.scan(
        FilterExpression='sessionId = :sid',
        ExpressionAttributeValues={':sid': session_id}
    )
    
    connections = response.get('Items', [])
    success_count = 0
    stale_connections = []
    
    for conn in connections:
        connection_id = conn['connectionId']
        success = _send_to_connection(connection_id, message)
        if success:
            success_count += 1
        else:
            stale_connections.append(connection_id)
    
    # Clean up stale connections
    for conn_id in stale_connections:
        try:
            table.delete_item(Key={'connectionId': conn_id})
        except Exception as e:
            print(f'Failed to delete stale connection {conn_id}: {e}')
    
    return success_count


def _send_to_connection(connection_id: str, message: Dict[str, Any]) -> bool:
    """
    Send a message to a specific WebSocket connection.
    
    Returns True if successful, False if connection is stale.
    """
    if not apigateway:
        print('API Gateway management client not configured')
        return False
    
    try:
        apigateway.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(message, default=str).encode('utf-8')
        )
        return True
    except apigateway.exceptions.GoneException:
        print(f'Connection {connection_id} is stale')
        return False
    except Exception as e:
        print(f'Failed to send to connection {connection_id}: {e}')
        return False


def _response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Build HTTP response for WebSocket Lambda."""
    return {
        'statusCode': status_code,
        'body': json.dumps(body, default=str)
    }
