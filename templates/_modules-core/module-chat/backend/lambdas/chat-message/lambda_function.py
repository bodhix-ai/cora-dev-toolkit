"""
Chat Message Lambda - Message CRUD and Context Retrieval

Handles chat message operations including listing, sending, and retrieving
messages. Also handles RAG context retrieval from grounded KBs.

Routes - Messages:
- GET /chats/{sessionId}/messages - List messages with pagination
- POST /chats/{sessionId}/messages - Send message (creates user message)
- GET /chats/{sessionId}/messages/{messageId} - Get single message

Routes - Context:
- POST /chats/{sessionId}/context - Get RAG context for query
- GET /chats/{sessionId}/history - Get formatted conversation history

Routes - Org Admin:
- GET /admin/org/chat/messages/{id} - View message content (org admin read-only)
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import org_common as common


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for chat message operations.
    
    Routes requests to appropriate handlers based on HTTP method and path.
    """
    # Log incoming request
    print(json.dumps(event, default=str))
    
    try:
        # Extract user info from authorizer
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        
        # Convert Okta UID to Supabase UUID for database operations
        supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
        
        # Get org_id for multi-tenancy (CORA Compliance)
        user = common.find_one(
            table='user_profiles',
            filters={'user_id': supabase_user_id}
        )
        
        if not user:
            return common.unauthorized_response('User profile not found')
        
        org_id = user.get('current_org_id') or user.get('org_id')
        if not org_id:
            return common.forbidden_response('User not associated with an organization')
        
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
        
        # Context route: /chats/{sessionId}/context
        if '/context' in path:
            session_id = path_params.get('sessionId')
            if http_method == 'POST':
                return handle_get_rag_context(event, supabase_user_id, org_id, session_id)
        
        # History route: /chats/{sessionId}/history
        elif '/history' in path:
            session_id = path_params.get('sessionId')
            if http_method == 'GET':
                return handle_get_history(event, supabase_user_id, org_id, session_id)
        
        # Org Admin routes: /admin/org/chat/messages/{id}
        elif '/admin/org/chat/messages' in path:
            message_id = path_params.get('id')
            if http_method == 'GET' and message_id:
                return handle_org_get_message(user_info, message_id)
        
        # Message routes: /chats/{sessionId}/messages...
        elif '/messages' in path:
            session_id = path_params.get('sessionId')
            message_id = path_params.get('messageId')
            
            if http_method == 'GET':
                if message_id:
                    return handle_get_message(supabase_user_id, org_id, session_id, message_id)
                else:
                    return handle_list_messages(event, supabase_user_id, org_id, session_id)
            elif http_method == 'POST':
                return handle_send_message(event, supabase_user_id, org_id, session_id)
        
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
# MESSAGE CRUD HANDLERS
# =============================================================================

def handle_list_messages(
    event: Dict[str, Any],
    user_id: str,
    org_id: str,
    session_id: str
) -> Dict[str, Any]:
    """
    List messages for a chat session with pagination.
    
    Query parameters:
    - limit: Number of results (default: 50, max: 100)
    - offset: Pagination offset (default: 0)
    - order: 'asc' | 'desc' (default: 'asc' - oldest first)
    
    Returns messages in chronological order by default.
    """
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    # Check permission to view chat
    can_view = common.rpc(
        
'can_view_chat',
        
{
            'p_user_id': user_id,
            'p_session_id': session_id
        }
    )
    
    if not can_view:
        raise common.ForbiddenError('You do not have access to this chat')
    
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
    order = query_params.get('order', 'asc')
    if order not in ['asc', 'desc']:
        order = 'asc'
    
    # Get messages
    order_clause = f'created_at.{order}'
    messages = common.find_many(
        table='chat_messages',
        filters={'session_id': session_id},
        order=order_clause,
        limit=limit,
        offset=offset
    )
    
    # Format messages for response
    result = [_format_message_response(msg) for msg in messages]
    
    # Get total count for pagination
    all_messages = common.find_many(
        table='chat_messages',
        filters={'session_id': session_id},
        select='id'
    )
    total_count = len(all_messages)
    
    return common.success_response({
        'messages': result,
        'pagination': {
            'limit': limit,
            'offset': offset,
            'total': total_count,
            'hasMore': offset + len(result) < total_count
        }
    })


def handle_send_message(
    event: Dict[str, Any],
    user_id: str,
    org_id: str,
    session_id: str
) -> Dict[str, Any]:
    """
    Send a message to a chat session.
    
    Creates a user message in the chat. The actual AI response is handled
    by the chat-stream Lambda for streaming responses.
    
    Request body:
    {
        "content": "User message content",
        "metadata": {  // Optional
            "model": "gpt-4",
            "temperature": 0.7
        }
    }
    
    Returns the created user message. Client should then call
    /chats/{sessionId}/stream to get the AI response.
    """
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    # Get session with org_id filter for multi-tenancy (CORA Compliance)
    session = common.find_one(
        table='chat_sessions',
        filters={'id': session_id, 'org_id': org_id, 'is_deleted': False}
    )
    
    if not session:
        raise common.NotFoundError('Chat session not found or access denied')
    
    # Check permission to add messages
    can_add = common.rpc(
        
'can_add_messages',
        
{
            'p_user_id': user_id,
            'p_session_id': session_id
        }
    )
    
    if not can_add:
        raise common.ForbiddenError('You do not have permission to send messages to this chat')
    
    body = json.loads(event.get('body', '{}'))
    
    content = body.get('content')
    if not content:
        raise common.ValidationError('content is required')
    
    content = common.validate_string_length(content, 'content', max_length=100000)  # 100K char limit
    
    metadata = body.get('metadata', {})
    if not isinstance(metadata, dict):
        metadata = {}
    
    # Create user message
    message_data = {
        'session_id': session_id,
        'role': 'user',
        'content': content,
        'metadata': json.dumps(metadata),
        'created_by': user_id
    }
    
    message = common.insert_one(
        table='chat_messages',
        data=message_data
    )
    
    # Update session metadata
    _update_session_metadata(session_id, user_id)
    
    result = _format_message_response(message)
    
    return common.created_response(result)


def handle_get_message(
    user_id: str,
    org_id: str,
    session_id: str,
    message_id: str
) -> Dict[str, Any]:
    """
    Get a single message by ID.
    
    Returns the message with full metadata including citations.
    """
    session_id = common.validate_uuid(session_id, 'sessionId')
    message_id = common.validate_uuid(message_id, 'messageId')
    
    # Check permission to view chat
    can_view = common.rpc(
        
'can_view_chat',
        
{
            'p_user_id': user_id,
            'p_session_id': session_id
        }
    )
    
    if not can_view:
        raise common.ForbiddenError('You do not have access to this chat')
    
    message = common.find_one(
        table='chat_messages',
        filters={
            'id': message_id,
            'session_id': session_id
        }
    )
    
    if not message:
        raise common.NotFoundError('Message not found')
    
    result = _format_message_response(message)
    
    return common.success_response(result)


# =============================================================================
# CONTEXT RETRIEVAL HANDLERS
# =============================================================================

def handle_get_rag_context(
    event: Dict[str, Any],
    user_id: str,
    org_id: str,
    session_id: str
) -> Dict[str, Any]:
    """
    Get RAG context for a query using grounded KBs.
    
    This endpoint retrieves relevant document chunks from the knowledge bases
    grounded to the chat session. The context can be used for augmenting
    AI responses.
    
    Request body:
    {
        "query": "User's question or message",
        "topK": 5,  // Optional, default: 5, max: 20
        "kbIds": ["uuid1", "uuid2"]  // Optional, override grounded KBs
    }
    
    Returns:
    {
        "context": "Formatted context string for injection into prompt",
        "citations": [...],  // Array of citation objects
        "tokensUsed": 1500  // Approximate token count of context
    }
    """
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    # Check permission to view chat
    can_view = common.rpc(
        
'can_view_chat',
        
{
            'p_user_id': user_id,
            'p_session_id': session_id
        }
    )
    
    if not can_view:
        raise common.ForbiddenError('You do not have access to this chat')
    
    body = json.loads(event.get('body', '{}'))
    
    query = body.get('query')
    if not query:
        raise common.ValidationError('query is required')
    
    query = common.validate_string_length(query, 'query', max_length=10000)
    
    top_k = common.validate_integer(
        body.get('topK', 5),
        'topK',
        min_value=1,
        max_value=20
    )
    
    # Get KBs to search - either specified or grounded
    kb_ids = body.get('kbIds')
    if kb_ids:
        # Validate provided KB IDs
        kb_ids = [common.validate_uuid(kb_id, 'kbId') for kb_id in kb_ids]
    else:
        # Use grounded KBs from the session
        grounded_kbs = common.rpc(
            
'get_grounded_kbs_for_chat',
            
{'p_session_id': session_id}
        )
        kb_ids = [kb['kb_id'] for kb in grounded_kbs if kb.get('is_enabled', True)]
    
    if not kb_ids:
        return common.success_response({
            'context': '',
            'citations': [],
            'tokensUsed': 0,
            'message': 'No knowledge bases grounded to this chat'
        })
    
    # Retrieve RAG context
    context_result = _retrieve_rag_context(query, kb_ids, top_k, user_id)
    
    return common.success_response(context_result)


def handle_get_history(
    event: Dict[str, Any],
    user_id: str,
    org_id: str,
    session_id: str
) -> Dict[str, Any]:
    """
    Get formatted conversation history for AI context.
    
    Returns the last N messages formatted for inclusion in an AI prompt.
    
    Query parameters:
    - limit: Number of messages (default: 10, max: 50)
    - format: 'openai' | 'anthropic' | 'raw' (default: 'openai')
    
    Returns:
    {
        "messages": [
            {"role": "user", "content": "..."},
            {"role": "assistant", "content": "..."}
        ],
        "tokensEstimate": 1500
    }
    """
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    # Check permission to view chat
    can_view = common.rpc(
        
'can_view_chat',
        
{
            'p_user_id': user_id,
            'p_session_id': session_id
        }
    )
    
    if not can_view:
        raise common.ForbiddenError('You do not have access to this chat')
    
    query_params = event.get('queryStringParameters', {}) or {}
    
    limit = common.validate_integer(
        query_params.get('limit', 10),
        'limit',
        min_value=1,
        max_value=50
    )
    
    format_type = query_params.get('format', 'openai')
    if format_type not in ['openai', 'anthropic', 'raw']:
        format_type = 'openai'
    
    # Get recent messages (most recent first, then reverse)
    messages = common.find_many(
        table='chat_messages',
        filters={'session_id': session_id},
        order='created_at.desc',
        limit=limit
    )
    
    # Reverse to get chronological order
    messages = list(reversed(messages))
    
    # Format based on requested format
    if format_type == 'openai':
        formatted = _format_for_openai(messages)
    elif format_type == 'anthropic':
        formatted = _format_for_anthropic(messages)
    else:
        formatted = [_format_message_response(msg) for msg in messages]
    
    # Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    total_chars = sum(len(msg.get('content', '')) for msg in messages)
    tokens_estimate = total_chars // 4
    
    return common.success_response({
        'messages': formatted,
        'tokensEstimate': tokens_estimate,
        'count': len(messages)
    })


# =============================================================================
# ORG ADMIN HANDLERS
# =============================================================================

def handle_org_get_message(user_info: Dict[str, Any], message_id: str) -> Dict[str, Any]:
    """
    View message content (org admin read-only access).
    
    Allows org admins to view message content for auditing/support purposes.
    The message must belong to a chat session in the admin's organization.
    """
    org_id = user_info.get('org_id')
    if not org_id:
        raise common.ForbiddenError('Organization context required')
    
    # Verify org_admin or org_owner role
    if user_info.get('org_role') not in ['org_admin', 'org_owner']:
        raise common.ForbiddenError('org_admin or org_owner role required')
    
    message_id = common.validate_uuid(message_id, 'messageId')
    
    # Get the message
    message = common.find_one(
        table='chat_messages',
        filters={'id': message_id}
    )
    
    if not message:
        raise common.NotFoundError('Message not found')
    
    # Verify the message belongs to a session in this org
    session = common.find_one(
        table='chat_sessions',
        filters={'id': message['session_id']}
    )
    
    if not session or session['org_id'] != org_id:
        raise common.NotFoundError('Message not found in this organization')
    
    result = _format_message_response(message)
    
    # Add session context for admin view
    result['sessionTitle'] = session.get('title')
    result['sessionCreatedBy'] = session.get('created_by')
    
    return common.success_response(result)


# =============================================================================
# RAG CONTEXT RETRIEVAL
# =============================================================================

def _retrieve_rag_context(
    query: str,
    kb_ids: List[str],
    top_k: int,
    user_id: str
) -> Dict[str, Any]:
    """
    Retrieve RAG context from knowledge bases.
    
    1. Generate query embedding using OpenAI ada-002
    2. Query pgvector for similar chunks across specified KBs
    3. Re-rank by relevance
    4. Format with citations
    5. Return context string + citation metadata
    
    Args:
        query: The user's query to find relevant context for
        kb_ids: List of KB IDs to search
        top_k: Number of top results to return
        user_id: User ID for permission checks
    
    Returns:
        {
            "context": "Formatted context for prompt injection",
            "citations": [...],
            "tokensUsed": int
        }
    """
    # Try to get embedding for query
    try:
        query_embedding = _get_query_embedding(query)
    except Exception as e:
        print(f'Error generating embedding: {str(e)}')
        # Return empty context if embedding fails
        return {
            'context': '',
            'citations': [],
            'tokensUsed': 0,
            'error': 'Failed to generate query embedding'
        }
    
    # Search for similar chunks across all KBs
    all_chunks = []
    for kb_id in kb_ids:
        try:
            chunks = _search_kb_chunks(kb_id, query_embedding, top_k)
            all_chunks.extend(chunks)
        except Exception as e:
            print(f'Error searching KB {kb_id}: {str(e)}')
            continue
    
    if not all_chunks:
        return {
            'context': '',
            'citations': [],
            'tokensUsed': 0
        }
    
    # Sort by similarity score and take top_k overall
    all_chunks.sort(key=lambda x: x.get('similarity', 0), reverse=True)
    top_chunks = all_chunks[:top_k]
    
    # Format context and citations
    context_parts = []
    citations = []
    
    for i, chunk in enumerate(top_chunks):
        # Add to context
        context_parts.append(f"[{i + 1}] {chunk['content']}")
        
        # Build citation
        citations.append({
            'index': i + 1,
            'kbId': chunk.get('kb_id'),
            'kbName': chunk.get('kb_name'),
            'documentId': chunk.get('document_id'),
            'documentName': chunk.get('document_name'),
            'chunkIndex': chunk.get('chunk_index', 0),
            'pageNumber': chunk.get('page_number'),
            'content': chunk.get('content', '')[:500],  # Truncate for response
            'similarity': chunk.get('similarity', 0)
        })
    
    # Join context
    context = '\n\n'.join(context_parts)
    
    # Estimate tokens
    tokens_used = len(context) // 4
    
    return {
        'context': context,
        'citations': citations,
        'tokensUsed': tokens_used
    }


def _get_query_embedding(query: str) -> List[float]:
    """
    Generate embedding for query using OpenAI ada-002.
    
    This function calls the embedding endpoint to convert the query
    text into a vector for similarity search.
    
    Returns:
        List of floats representing the embedding vector
    """
    import os
    import requests
    
    # Get OpenAI API key from environment
    openai_api_key = os.environ.get('OPENAI_API_KEY')
    if not openai_api_key:
        raise Exception('OPENAI_API_KEY not configured')
    
    # Call OpenAI embeddings API
    response = requests.post(
        'https://api.openai.com/v1/embeddings',
        headers={
            'Authorization': f'Bearer {openai_api_key}',
            'Content-Type': 'application/json'
        },
        json={
            'model': 'text-embedding-ada-002',
            'input': query
        },
        timeout=30
    )
    
    if response.status_code != 200:
        raise Exception(f'OpenAI API error: {response.status_code} {response.text}')
    
    result = response.json()
    embedding = result['data'][0]['embedding']
    
    return embedding


def _search_kb_chunks(
    kb_id: str,
    query_embedding: List[float],
    top_k: int
) -> List[Dict[str, Any]]:
    """
    Search KB chunks using pgvector similarity search.
    
    Uses the RPC function from module-kb to perform vector search.
    
    Args:
        kb_id: Knowledge base ID to search
        query_embedding: Query embedding vector
        top_k: Number of results to return
    
    Returns:
        List of chunk dictionaries with content and metadata
    """
    # Call the KB search RPC function
    # This RPC is provided by module-kb
    try:
        results = common.rpc(
            
'search_kb_chunks',
            
{
                'p_kb_id': kb_id,
                'p_query_embedding': query_embedding,
                'p_top_k': top_k,
                'p_similarity_threshold': 0.7  # Minimum similarity score
            }
        )
        
        return results if results else []
        
    except Exception as e:
        print(f'Error in KB search: {str(e)}')
        return []


# =============================================================================
# MESSAGE FORMATTING
# =============================================================================

def _format_message_response(message: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format message for API response (camelCase).
    """
    # Parse metadata if string
    metadata = message.get('metadata', {})
    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except:
            metadata = {}
    
    # Parse token_usage if string
    token_usage = message.get('token_usage')
    if isinstance(token_usage, str):
        try:
            token_usage = json.loads(token_usage)
        except:
            token_usage = None
    
    return {
        'id': message['id'],
        'sessionId': message['session_id'],
        'role': message['role'],
        'content': message['content'],
        'metadata': metadata,
        'tokenUsage': _format_token_usage(token_usage) if token_usage else None,
        'wasTruncated': message.get('was_truncated', False),
        'createdAt': message.get('created_at'),
        'createdBy': message.get('created_by')
    }


def _format_token_usage(usage: Optional[Dict]) -> Optional[Dict]:
    """
    Format token usage for API response.
    """
    if not usage:
        return None
    
    return {
        'promptTokens': usage.get('prompt_tokens', 0),
        'completionTokens': usage.get('completion_tokens', 0),
        'totalTokens': usage.get('total_tokens', 0)
    }


def _format_for_openai(messages: List[Dict]) -> List[Dict]:
    """
    Format messages for OpenAI API format.
    
    Returns:
        [{"role": "user", "content": "..."}, ...]
    """
    result = []
    for msg in messages:
        # Skip system messages unless they're the first
        if msg['role'] == 'system' and result:
            continue
        
        result.append({
            'role': msg['role'],
            'content': msg['content']
        })
    
    return result


def _format_for_anthropic(messages: List[Dict]) -> List[Dict]:
    """
    Format messages for Anthropic API format.
    
    Anthropic uses 'human' and 'assistant' roles.
    System messages are handled separately.
    
    Returns:
        [{"role": "user", "content": "..."}, ...]
    """
    result = []
    for msg in messages:
        # Skip system messages (handled separately in Anthropic)
        if msg['role'] == 'system':
            continue
        
        role = msg['role']
        if role == 'user':
            role = 'user'  # Same for Anthropic
        elif role == 'assistant':
            role = 'assistant'  # Same for Anthropic
        
        result.append({
            'role': role,
            'content': msg['content']
        })
    
    return result


# =============================================================================
# SESSION HELPERS
# =============================================================================

def _update_session_metadata(session_id: str, user_id: str) -> None:
    """
    Update session metadata after a new message.
    
    Updates:
    - messageCount
    - lastMessageAt
    - updated_at/updated_by
    """
    # Get current message count
    messages = common.find_many(
        table='chat_messages',
        filters={'session_id': session_id},
        select='id'
    )
    
    # Get current session metadata
    session = common.find_one(
        table='chat_sessions',
        filters={'id': session_id}
    )
    
    if not session:
        return
    
    # Parse existing metadata
    metadata = session.get('metadata', {})
    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except:
            metadata = {}
    
    # Update metadata
    metadata['messageCount'] = len(messages)
    metadata['lastMessageAt'] = datetime.now(timezone.utc).isoformat()
    
    # Update session
    common.update_one(
        table='chat_sessions',
        filters={'id': session_id},
        data={
            'metadata': json.dumps(metadata),
            'updated_by': user_id
        }
    )


def create_assistant_message(
    session_id: str,
    content: str,
    metadata: Optional[Dict] = None,
    token_usage: Optional[Dict] = None,
    was_truncated: bool = False
) -> Dict[str, Any]:
    """
    Create an assistant message.
    
    This function is used by the chat-stream Lambda to save
    the AI response after streaming completes.
    
    Args:
        session_id: Chat session ID
        content: Full message content
        metadata: Message metadata (model, citations, etc.)
        token_usage: Token usage statistics
        was_truncated: Whether the response was truncated
    
    Returns:
        Created message record
    """
    message_data = {
        'session_id': session_id,
        'role': 'assistant',
        'content': content,
        'metadata': json.dumps(metadata) if metadata else '{}',
        'token_usage': json.dumps(token_usage) if token_usage else None,
        'was_truncated': was_truncated
        # Note: assistant messages don't have created_by (no user)
    }
    
    message = common.insert_one(
        table='chat_messages',
        data=message_data
    )
    
    # Update session metadata
    _update_session_metadata(session_id, None)
    
    return _format_message_response(message)


def create_system_message(
    session_id: str,
    content: str,
    user_id: str
) -> Dict[str, Any]:
    """
    Create a system message.
    
    System messages are used for RAG context injection or
    special instructions added during the conversation.
    
    Args:
        session_id: Chat session ID
        content: System message content
        user_id: User who triggered the system message
    
    Returns:
        Created message record
    """
    message_data = {
        'session_id': session_id,
        'role': 'system',
        'content': content,
        'metadata': '{}',
        'created_by': user_id
    }
    
    message = common.insert_one(
        table='chat_messages',
        data=message_data
    )
    
    return _format_message_response(message)
