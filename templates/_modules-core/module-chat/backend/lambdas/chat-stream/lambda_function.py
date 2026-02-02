"""
Chat Stream Lambda - AI Response Streaming

This Lambda uses Lambda Response Streaming to provide real-time AI responses.
It integrates with module-ai for provider configuration and module-kb for
RAG context retrieval.

Routes:
- POST /chats/{sessionId}/stream - Stream AI response

Request Body:
{
    "message": "user query",
    "kbIds": ["kb-uuid-1", "kb-uuid-2"],  // optional KB grounding override
    "model": "gpt-4",  // optional model override
    "temperature": 0.7,  // optional temperature
    "maxTokens": 4096,  // optional max tokens
    "systemPrompt": "Custom system prompt"  // optional system prompt
}

Response: Server-Sent Events (SSE) stream
- data: {"type": "session", "sessionId": "...", "messageId": "..."}
- data: {"type": "chunk", "content": "..."}
- data: {"type": "context", "citations": [...]}
- data: {"type": "complete", "message": {...}}
- data: {"type": "error", "error": "..."}
- data: [DONE]
"""

import json
import os
import logging
from typing import Any, Dict, Generator, List, Optional, Union
import org_common as common
from chat_common.permissions import can_view_chat, can_edit_chat, is_chat_owner

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Default settings
DEFAULT_MODEL = 'gpt-4'
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 4096
DEFAULT_HISTORY_LIMIT = 10
DEFAULT_RAG_TOP_K = 5
DEFAULT_SIMILARITY_THRESHOLD = 0.7


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for chat streaming.
    
    For Lambda response streaming, this function is wrapped by the
    response_stream decorator. The actual streaming is handled by
    stream_handler().
    
    For non-streaming environments (testing), this returns a standard response.
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
        
        # Handle OPTIONS for CORS
        if http_method == 'OPTIONS':
            return common.success_response({})
        
        # Only POST is supported
        if http_method != 'POST':
            return common.bad_request_response('Only POST method is supported for streaming')
        
        # Extract path parameters
        path_params = event.get('pathParameters', {}) or {}
        session_id = path_params.get('sessionId')
        
        if not session_id:
            return common.bad_request_response('sessionId is required')
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # In non-streaming mode, return a synchronous response
        # This is used for testing or when streaming is not available
        return handle_stream_sync(event, supabase_user_id, org_id, session_id, body)
        
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
# STREAMING HANDLER
# =============================================================================

def response_stream_handler(event: Dict[str, Any], context: Any) -> Generator[str, None, None]:
    """
    Lambda response streaming handler.
    
    This function is the entry point for Lambda response streaming.
    It yields SSE-formatted events as the AI generates tokens.
    
    Use with awslambdaric's StreamingResponse:
    
    ```python
    from awslambdaric.streaming_response import StreamingResponse
    
    def handler(event, context):
        return StreamingResponse(
            content_type='text/event-stream',
            response=response_stream_handler(event, context)
        )
    ```
    """
    try:
        # Extract user info from authorizer
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
        
        # Get org_id for multi-tenancy (CORA Compliance)
        user = common.find_one(
            table='user_profiles',
            filters={'user_id': supabase_user_id}
        )
        
        if not user:
            yield _sse_event('error', {'message': 'User profile not found'})
            return
        
        org_id = user.get('current_org_id') or user.get('org_id')
        if not org_id:
            yield _sse_event('error', {'message': 'User not associated with an organization'})
            return
        
        # Extract session ID
        path_params = event.get('pathParameters', {}) or {}
        session_id = path_params.get('sessionId')
        
        if not session_id:
            yield _sse_event('error', {'message': 'sessionId is required'})
            return
        
        session_id = common.validate_uuid(session_id, 'sessionId')
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # 1. Fetch resource (ADR-019c)
        session = common.find_one(
            table='chat_sessions',
            filters={'id': session_id, 'is_deleted': False}
        )
        
        if not session:
            yield _sse_event('error', {'message': 'Chat session not found'})
            return
        
        # 2. Verify org membership (ADR-019c: MUST come before permission check)
        if not common.can_access_org_resource(supabase_user_id, session['org_id']):
            yield _sse_event('error', {'message': 'Not a member of organization'})
            return
        
        # 3. Check resource permission (ADR-019c)
        if not can_edit_chat(supabase_user_id, session_id):
            yield _sse_event('error', {'message': 'You do not have permission to send messages to this chat'})
            return
        
        # Extract parameters
        user_message = body.get('message')
        if not user_message:
            yield _sse_event('error', {'message': 'message is required'})
            return
        
        kb_ids = body.get('kbIds')
        model = body.get('model', DEFAULT_MODEL)
        temperature = body.get('temperature', DEFAULT_TEMPERATURE)
        max_tokens = body.get('maxTokens', DEFAULT_MAX_TOKENS)
        system_prompt = body.get('systemPrompt')
        
        # Stream the response
        yield from _stream_ai_response(
            session_id=session_id,
            session=session,
            user_id=supabase_user_id,
            user_message=user_message,
            kb_ids=kb_ids,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            system_prompt=system_prompt
        )
        
    except Exception as e:
        print(f'Streaming error: {str(e)}')
        import traceback
        traceback.print_exc()
        yield _sse_event('error', {'message': str(e)})


def handle_stream_sync(
    event: Dict[str, Any],
    user_id: str,
    org_id: str,
    session_id: str,
    body: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Synchronous (non-streaming) handler for testing or fallback.
    
    This collects all tokens and returns them as a single response.
    """
    session_id = common.validate_uuid(session_id, 'sessionId')
    
    # 1. Fetch resource (ADR-019c)
    session = common.find_one(
        table='chat_sessions',
        filters={'id': session_id, 'is_deleted': False}
    )
    
    if not session:
        raise common.NotFoundError('Chat session not found')
    
    # 2. Verify org membership (ADR-019c: MUST come before permission check)
    if not common.can_access_org_resource(user_id, session['org_id']):
        raise common.ForbiddenError('Not a member of organization')
    
    # 3. Check resource permission (ADR-019c)
    if not can_edit_chat(user_id, session_id):
        raise common.ForbiddenError('You do not have permission to send messages to this chat')
    
    # Extract parameters
    user_message = body.get('message')
    if not user_message:
        raise common.ValidationError('message is required')
    
    kb_ids = body.get('kbIds')
    model = body.get('model', DEFAULT_MODEL)
    temperature = body.get('temperature', DEFAULT_TEMPERATURE)
    max_tokens = body.get('maxTokens', DEFAULT_MAX_TOKENS)
    system_prompt = body.get('systemPrompt')
    
    # Get complete response (non-streaming)
    result = _get_ai_response_sync(
        session_id=session_id,
        session=session,
        user_id=user_id,
        user_message=user_message,
        kb_ids=kb_ids,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        system_prompt=system_prompt
    )
    
    return common.success_response(result)


# =============================================================================
# AI RESPONSE GENERATION
# =============================================================================

def _stream_ai_response(
    session_id: str,
    session: Dict[str, Any],
    user_id: str,
    user_message: str,
    kb_ids: Optional[List[str]],
    model: str,
    temperature: float,
    max_tokens: int,
    system_prompt: Optional[str]
) -> Generator[str, None, None]:
    """
    Stream AI response with RAG grounding.
    
    Flow based on production pm-app-stack patterns:
    1. Send session info first
    2. Save user message in DB
    3. Retrieve RAG context from grounded KBs
    4. Get conversation history
    5. Build messages array with system prompt + context + history
    6. Call AI provider streaming API
    7. Yield chunks as SSE events
    8. Save assistant message after completion
    9. Send complete event with usage
    """
    import uuid
    from datetime import datetime
    
    response_id = str(uuid.uuid4())
    
    # Step 1: Send session info first (production pattern)
    yield _sse_event('session', {
        'sessionId': session_id,
        'messageId': response_id
    })
    
    # Step 2: Save user message
    user_msg = _create_user_message(session_id, user_message, user_id)
    
    # Step 3: Get RAG context
    rag_context = None
    citations = []
    has_rag_context = False
    
    if kb_ids is None:
        # Use session's grounded KBs
        try:
            grounded_kbs = common.rpc(
                
'get_grounded_kbs_for_chat',
                
{'p_session_id': session_id}
            )
            kb_ids = [kb['kb_id'] for kb in grounded_kbs if kb.get('is_enabled', True)]
        except Exception as e:
            logger.warning(f'Failed to get grounded KBs: {str(e)}')
            kb_ids = []
    
    if kb_ids:
        try:
            rag_result = _retrieve_rag_context(user_message, kb_ids, DEFAULT_RAG_TOP_K, user_id)
            rag_context = rag_result.get('context')
            citations = rag_result.get('citations', [])
            has_rag_context = bool(rag_context)
            
            if citations:
                yield _sse_event('context', {
                    'citations': citations,
                    'tokensUsed': rag_result.get('tokensUsed', 0)
                })
        except Exception as e:
            logger.warning(f'RAG retrieval error: {str(e)}')
            # Continue without RAG context
    
    # Step 4: Get conversation history
    history = _get_conversation_history(session_id, DEFAULT_HISTORY_LIMIT)
    
    # Step 5: Build messages array with RAG awareness
    messages = _build_messages_array(
        system_prompt=system_prompt,
        rag_context=rag_context,
        history=history,
        user_message=user_message,
        session=session,
        has_rag_context=has_rag_context
    )
    
    # Step 6: Determine provider and stream
    provider = _get_ai_provider(session.get('org_id'), model)
    
    # Count prompt tokens
    system_content = messages[0]['content'] if messages else ''
    prompt_tokens = _count_tokens(system_content + user_message, model)
    
    # Step 7: Stream from provider
    full_content = ''
    completion_tokens = 0
    was_truncated = False
    
    try:
        if provider['type'] == 'openai':
            for event in _stream_openai(messages, model, temperature, max_tokens, provider):
                if event['type'] == 'token':
                    full_content += event['content']
                    yield _sse_event('chunk', {'content': event['content']})
                elif event['type'] == 'usage':
                    completion_tokens = event['usage'].get('completion_tokens', 0)
                elif event['type'] == 'truncated':
                    was_truncated = True
                    
        elif provider['type'] == 'anthropic':
            for event in _stream_anthropic(messages, model, temperature, max_tokens, provider):
                if event['type'] == 'token':
                    full_content += event['content']
                    yield _sse_event('chunk', {'content': event['content']})
                elif event['type'] == 'usage':
                    completion_tokens = event['usage'].get('completion_tokens', 0)
                elif event['type'] == 'truncated':
                    was_truncated = True
                    
        elif provider['type'] == 'bedrock':
            for event in _stream_bedrock(messages, model, temperature, max_tokens, provider):
                if event['type'] == 'token':
                    full_content += event['content']
                    yield _sse_event('chunk', {'content': event['content']})
                elif event['type'] == 'usage':
                    completion_tokens = event['usage'].get('completion_tokens', 0)
                elif event['type'] == 'truncated':
                    was_truncated = True
        else:
            yield _sse_event('error', {'error': f'Unknown provider type: {provider["type"]}'})
            return
            
    except Exception as e:
        logger.error(f'Streaming error from provider: {str(e)}')
        import traceback
        traceback.print_exc()
        yield _sse_event('error', {'error': f'AI provider error: {str(e)}'})
        return
    
    # Calculate completion tokens if not provided by API
    if completion_tokens == 0:
        completion_tokens = _count_tokens(full_content, model)
    
    total_tokens = prompt_tokens + completion_tokens
    
    token_usage = {
        'prompt_tokens': prompt_tokens,
        'completion_tokens': completion_tokens,
        'total_tokens': total_tokens
    }
    
    # Step 8: Save assistant message
    metadata = {
        'model': model,
        'temperature': temperature,
        'max_tokens': max_tokens,
        'provider': provider['type'],
        'streaming': True
    }
    if citations:
        metadata['citations'] = citations
    
    assistant_msg = _create_assistant_message(
        session_id=session_id,
        content=full_content,
        metadata=metadata,
        token_usage=token_usage,
        was_truncated=was_truncated
    )
    
    # Step 9: Send complete event with full message info (production pattern)
    complete_message = {
        'id': assistant_msg['id'],
        'message': full_content,
        'sessionId': session_id,
        'timestamp': datetime.utcnow().isoformat(),
        'usage': {
            'promptTokens': prompt_tokens,
            'completionTokens': completion_tokens,
            'totalTokens': total_tokens
        }
    }
    
    yield _sse_event('complete', {'message': complete_message})
    
    # Send done signal
    yield _sse_done()


def _get_ai_response_sync(
    session_id: str,
    session: Dict[str, Any],
    user_id: str,
    user_message: str,
    kb_ids: Optional[List[str]],
    model: str,
    temperature: float,
    max_tokens: int,
    system_prompt: Optional[str]
) -> Dict[str, Any]:
    """
    Get AI response synchronously (non-streaming).
    
    Used for testing or when streaming is not available.
    """
    # Save user message
    user_msg = _create_user_message(session_id, user_message, user_id)
    
    # Get RAG context
    rag_context = None
    citations = []
    
    if kb_ids is None:
        grounded_kbs = common.rpc(
            
'get_grounded_kbs_for_chat',
            
{'p_session_id': session_id}
        )
        kb_ids = [kb['kb_id'] for kb in grounded_kbs if kb.get('is_enabled', True)]
    
    if kb_ids:
        try:
            rag_result = _retrieve_rag_context(user_message, kb_ids, DEFAULT_RAG_TOP_K, user_id)
            rag_context = rag_result.get('context')
            citations = rag_result.get('citations', [])
        except Exception as e:
            print(f'RAG retrieval error: {str(e)}')
    
    # Get conversation history
    history = _get_conversation_history(session_id, DEFAULT_HISTORY_LIMIT)
    
    # Build messages array
    messages = _build_messages_array(
        system_prompt=system_prompt,
        rag_context=rag_context,
        history=history,
        user_message=user_message,
        session=session
    )
    
    # Get provider
    provider = _get_ai_provider(session.get('org_id'), model)
    
    # Get response (non-streaming)
    if provider['type'] == 'openai':
        result = _call_openai_sync(messages, model, temperature, max_tokens, provider)
    elif provider['type'] == 'anthropic':
        result = _call_anthropic_sync(messages, model, temperature, max_tokens, provider)
    elif provider['type'] == 'bedrock':
        result = _call_bedrock_sync(messages, model, temperature, max_tokens, provider)
    else:
        raise common.ValidationError(f'Unknown provider type: {provider["type"]}')
    
    # Save assistant message
    metadata = {
        'model': model,
        'temperature': temperature,
        'provider': provider['type']
    }
    if citations:
        metadata['citations'] = citations
    
    assistant_msg = _create_assistant_message(
        session_id=session_id,
        content=result['content'],
        metadata=metadata,
        token_usage=result.get('usage'),
        was_truncated=result.get('was_truncated', False)
    )
    
    return {
        'userMessage': user_msg,
        'assistantMessage': assistant_msg,
        'citations': citations
    }


# =============================================================================
# PROVIDER INTEGRATION
# =============================================================================

def _get_ai_provider(org_id: Optional[str], model: str) -> Dict[str, Any]:
    """
    Get AI provider configuration from module-ai.
    
    This retrieves the org's configured AI provider and credentials.
    Falls back to environment variables if module-ai is not configured.
    """
    # Try to get provider from module-ai
    if org_id:
        try:
            # Call module-ai RPC to get provider config
            provider_config = common.rpc(
                
'get_org_ai_provider',
                
{
                    'p_org_id': org_id,
                    'p_model': model
                }
            )
            
            if provider_config:
                return provider_config
        except Exception as e:
            print(f'Error getting AI provider from module-ai: {str(e)}')
    
    # Fallback: determine provider from model name and use env vars
    if model.startswith('gpt-') or model.startswith('o1-'):
        return {
            'type': 'openai',
            'api_key': os.environ.get('OPENAI_API_KEY'),
            'base_url': os.environ.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        }
    elif model.startswith('claude-'):
        return {
            'type': 'anthropic',
            'api_key': os.environ.get('ANTHROPIC_API_KEY'),
            'base_url': os.environ.get('ANTHROPIC_BASE_URL', 'https://api.anthropic.com')
        }
    elif model.startswith('amazon.') or model.startswith('anthropic.') or model.startswith('meta.'):
        return {
            'type': 'bedrock',
            'region': os.environ.get('AWS_REGION', 'us-east-1')
        }
    else:
        # Default to OpenAI
        return {
            'type': 'openai',
            'api_key': os.environ.get('OPENAI_API_KEY'),
            'base_url': os.environ.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        }


# =============================================================================
# OPENAI STREAMING
# =============================================================================

def _stream_openai(
    messages: List[Dict],
    model: str,
    temperature: float,
    max_tokens: int,
    provider: Dict[str, Any]
) -> Generator[Dict, None, None]:
    """
    Stream response from OpenAI API.
    """
    import requests
    
    api_key = provider.get('api_key')
    if not api_key:
        raise Exception('OpenAI API key not configured')
    
    base_url = provider.get('base_url', 'https://api.openai.com/v1')
    
    response = requests.post(
        f'{base_url}/chat/completions',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        },
        json={
            'model': model,
            'messages': messages,
            'temperature': temperature,
            'max_tokens': max_tokens,
            'stream': True,
            'stream_options': {'include_usage': True}
        },
        stream=True,
        timeout=300
    )
    
    if response.status_code != 200:
        raise Exception(f'OpenAI API error: {response.status_code} {response.text}')
    
    for line in response.iter_lines():
        if line:
            line = line.decode('utf-8')
            if line.startswith('data: '):
                data = line[6:]
                if data == '[DONE]':
                    break
                try:
                    chunk = json.loads(data)
                    
                    # Check for token
                    choices = chunk.get('choices', [])
                    if choices:
                        delta = choices[0].get('delta', {})
                        content = delta.get('content')
                        if content:
                            yield {'type': 'token', 'content': content}
                        
                        # Check for finish reason
                        finish_reason = choices[0].get('finish_reason')
                        if finish_reason == 'length':
                            yield {'type': 'truncated'}
                    
                    # Check for usage
                    usage = chunk.get('usage')
                    if usage:
                        yield {
                            'type': 'usage',
                            'usage': {
                                'prompt_tokens': usage.get('prompt_tokens', 0),
                                'completion_tokens': usage.get('completion_tokens', 0),
                                'total_tokens': usage.get('total_tokens', 0)
                            }
                        }
                except json.JSONDecodeError:
                    continue


def _call_openai_sync(
    messages: List[Dict],
    model: str,
    temperature: float,
    max_tokens: int,
    provider: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Call OpenAI API synchronously (non-streaming).
    """
    import requests
    
    api_key = provider.get('api_key')
    if not api_key:
        raise Exception('OpenAI API key not configured')
    
    base_url = provider.get('base_url', 'https://api.openai.com/v1')
    
    response = requests.post(
        f'{base_url}/chat/completions',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        },
        json={
            'model': model,
            'messages': messages,
            'temperature': temperature,
            'max_tokens': max_tokens
        },
        timeout=300
    )
    
    if response.status_code != 200:
        raise Exception(f'OpenAI API error: {response.status_code} {response.text}')
    
    result = response.json()
    choice = result['choices'][0]
    
    return {
        'content': choice['message']['content'],
        'usage': result.get('usage'),
        'was_truncated': choice.get('finish_reason') == 'length'
    }


# =============================================================================
# ANTHROPIC STREAMING
# =============================================================================

def _stream_anthropic(
    messages: List[Dict],
    model: str,
    temperature: float,
    max_tokens: int,
    provider: Dict[str, Any]
) -> Generator[Dict, None, None]:
    """
    Stream response from Anthropic API.
    """
    import requests
    
    api_key = provider.get('api_key')
    if not api_key:
        raise Exception('Anthropic API key not configured')
    
    base_url = provider.get('base_url', 'https://api.anthropic.com')
    
    # Extract system message (Anthropic handles it separately)
    system_content = None
    chat_messages = []
    for msg in messages:
        if msg['role'] == 'system':
            system_content = msg['content']
        else:
            chat_messages.append(msg)
    
    request_body = {
        'model': model,
        'messages': chat_messages,
        'temperature': temperature,
        'max_tokens': max_tokens,
        'stream': True
    }
    
    if system_content:
        request_body['system'] = system_content
    
    response = requests.post(
        f'{base_url}/v1/messages',
        headers={
            'x-api-key': api_key,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
        },
        json=request_body,
        stream=True,
        timeout=300
    )
    
    if response.status_code != 200:
        raise Exception(f'Anthropic API error: {response.status_code} {response.text}')
    
    for line in response.iter_lines():
        if line:
            line = line.decode('utf-8')
            if line.startswith('data: '):
                data = line[6:]
                try:
                    event = json.loads(data)
                    event_type = event.get('type')
                    
                    if event_type == 'content_block_delta':
                        delta = event.get('delta', {})
                        if delta.get('type') == 'text_delta':
                            text = delta.get('text', '')
                            if text:
                                yield {'type': 'token', 'content': text}
                    
                    elif event_type == 'message_delta':
                        # Check stop reason
                        stop_reason = event.get('delta', {}).get('stop_reason')
                        if stop_reason == 'max_tokens':
                            yield {'type': 'truncated'}
                        
                        # Get usage
                        usage = event.get('usage')
                        if usage:
                            yield {
                                'type': 'usage',
                                'usage': {
                                    'prompt_tokens': usage.get('input_tokens', 0),
                                    'completion_tokens': usage.get('output_tokens', 0),
                                    'total_tokens': usage.get('input_tokens', 0) + usage.get('output_tokens', 0)
                                }
                            }
                    
                    elif event_type == 'message_stop':
                        break
                        
                except json.JSONDecodeError:
                    continue


def _call_anthropic_sync(
    messages: List[Dict],
    model: str,
    temperature: float,
    max_tokens: int,
    provider: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Call Anthropic API synchronously (non-streaming).
    """
    import requests
    
    api_key = provider.get('api_key')
    if not api_key:
        raise Exception('Anthropic API key not configured')
    
    base_url = provider.get('base_url', 'https://api.anthropic.com')
    
    # Extract system message
    system_content = None
    chat_messages = []
    for msg in messages:
        if msg['role'] == 'system':
            system_content = msg['content']
        else:
            chat_messages.append(msg)
    
    request_body = {
        'model': model,
        'messages': chat_messages,
        'temperature': temperature,
        'max_tokens': max_tokens
    }
    
    if system_content:
        request_body['system'] = system_content
    
    response = requests.post(
        f'{base_url}/v1/messages',
        headers={
            'x-api-key': api_key,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
        },
        json=request_body,
        timeout=300
    )
    
    if response.status_code != 200:
        raise Exception(f'Anthropic API error: {response.status_code} {response.text}')
    
    result = response.json()
    
    content = ''
    for block in result.get('content', []):
        if block.get('type') == 'text':
            content += block.get('text', '')
    
    usage = result.get('usage', {})
    
    return {
        'content': content,
        'usage': {
            'prompt_tokens': usage.get('input_tokens', 0),
            'completion_tokens': usage.get('output_tokens', 0),
            'total_tokens': usage.get('input_tokens', 0) + usage.get('output_tokens', 0)
        },
        'was_truncated': result.get('stop_reason') == 'max_tokens'
    }


# =============================================================================
# BEDROCK STREAMING
# =============================================================================

def _stream_bedrock(
    messages: List[Dict],
    model: str,
    temperature: float,
    max_tokens: int,
    provider: Dict[str, Any]
) -> Generator[Dict, None, None]:
    """
    Stream response from AWS Bedrock.
    
    Based on production patterns with inference profile fallback.
    """
    import boto3
    
    region = provider.get('region', os.environ.get('AWS_REGION', 'us-east-1'))
    client = boto3.client('bedrock-runtime', region_name=region)
    
    # Build request based on model
    try:
        if model.startswith('anthropic.'):
            # Anthropic model on Bedrock
            yield from _stream_bedrock_anthropic(client, messages, model, temperature, max_tokens)
        elif model.startswith('amazon.'):
            # Amazon Titan model
            yield from _stream_bedrock_titan(client, messages, model, temperature, max_tokens)
        elif model.startswith('meta.'):
            # Meta Llama model
            yield from _stream_bedrock_llama(client, messages, model, temperature, max_tokens)
        else:
            raise Exception(f'Unsupported Bedrock model: {model}')
    except Exception as e:
        error_message = str(e)
        # Check for on-demand throughput error (production pattern)
        if "on-demand throughput isn't supported" in error_message and "inference profile" in error_message:
            # Try with inference profile
            inference_profile_id = f'us.{model}'
            logger.warning(f'Model {model} requires inference profile. Retrying with: {inference_profile_id}')
            
            if model.startswith('anthropic.'):
                yield from _stream_bedrock_anthropic(client, messages, inference_profile_id, temperature, max_tokens)
            elif model.startswith('amazon.'):
                yield from _stream_bedrock_titan(client, messages, inference_profile_id, temperature, max_tokens)
            elif model.startswith('meta.'):
                yield from _stream_bedrock_llama(client, messages, inference_profile_id, temperature, max_tokens)
        else:
            raise e


def _stream_bedrock_anthropic(
    client: Any,
    messages: List[Dict],
    model: str,
    temperature: float,
    max_tokens: int
) -> Generator[Dict, None, None]:
    """
    Stream from Anthropic model on Bedrock.
    """
    # Extract system message
    system_content = None
    chat_messages = []
    for msg in messages:
        if msg['role'] == 'system':
            system_content = msg['content']
        else:
            chat_messages.append(msg)
    
    request_body = {
        'anthropic_version': 'bedrock-2023-05-31',
        'messages': chat_messages,
        'max_tokens': max_tokens,
        'temperature': temperature
    }
    
    if system_content:
        request_body['system'] = system_content
    
    response = client.invoke_model_with_response_stream(
        modelId=model,
        contentType='application/json',
        accept='application/json',
        body=json.dumps(request_body)
    )
    
    for event in response['body']:
        chunk = json.loads(event['chunk']['bytes'].decode('utf-8'))
        chunk_type = chunk.get('type')
        
        if chunk_type == 'content_block_delta':
            delta = chunk.get('delta', {})
            if delta.get('type') == 'text_delta':
                text = delta.get('text', '')
                if text:
                    yield {'type': 'token', 'content': text}
        
        elif chunk_type == 'message_delta':
            stop_reason = chunk.get('delta', {}).get('stop_reason')
            if stop_reason == 'max_tokens':
                yield {'type': 'truncated'}
            
            usage = chunk.get('usage')
            if usage:
                yield {
                    'type': 'usage',
                    'usage': {
                        'prompt_tokens': usage.get('input_tokens', 0),
                        'completion_tokens': usage.get('output_tokens', 0),
                        'total_tokens': usage.get('input_tokens', 0) + usage.get('output_tokens', 0)
                    }
                }


def _stream_bedrock_titan(
    client: Any,
    messages: List[Dict],
    model: str,
    temperature: float,
    max_tokens: int
) -> Generator[Dict, None, None]:
    """
    Stream from Amazon Titan model on Bedrock.
    """
    # Convert messages to Titan format
    prompt = _convert_messages_to_prompt(messages)
    
    request_body = {
        'inputText': prompt,
        'textGenerationConfig': {
            'maxTokenCount': max_tokens,
            'temperature': temperature
        }
    }
    
    response = client.invoke_model_with_response_stream(
        modelId=model,
        contentType='application/json',
        accept='application/json',
        body=json.dumps(request_body)
    )
    
    for event in response['body']:
        chunk = json.loads(event['chunk']['bytes'].decode('utf-8'))
        output_text = chunk.get('outputText', '')
        if output_text:
            yield {'type': 'token', 'content': output_text}
        
        # Check completion reason
        if chunk.get('completionReason') == 'LENGTH':
            yield {'type': 'truncated'}


def _stream_bedrock_llama(
    client: Any,
    messages: List[Dict],
    model: str,
    temperature: float,
    max_tokens: int
) -> Generator[Dict, None, None]:
    """
    Stream from Meta Llama model on Bedrock.
    """
    # Convert messages to Llama format
    prompt = _convert_messages_to_llama_prompt(messages)
    
    request_body = {
        'prompt': prompt,
        'max_gen_len': max_tokens,
        'temperature': temperature
    }
    
    response = client.invoke_model_with_response_stream(
        modelId=model,
        contentType='application/json',
        accept='application/json',
        body=json.dumps(request_body)
    )
    
    for event in response['body']:
        chunk = json.loads(event['chunk']['bytes'].decode('utf-8'))
        generation = chunk.get('generation', '')
        if generation:
            yield {'type': 'token', 'content': generation}
        
        if chunk.get('stop_reason') == 'length':
            yield {'type': 'truncated'}


def _call_bedrock_sync(
    messages: List[Dict],
    model: str,
    temperature: float,
    max_tokens: int,
    provider: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Call Bedrock API synchronously (non-streaming).
    """
    import boto3
    
    region = provider.get('region', os.environ.get('AWS_REGION', 'us-east-1'))
    client = boto3.client('bedrock-runtime', region_name=region)
    
    if model.startswith('anthropic.'):
        # Anthropic model on Bedrock
        system_content = None
        chat_messages = []
        for msg in messages:
            if msg['role'] == 'system':
                system_content = msg['content']
            else:
                chat_messages.append(msg)
        
        request_body = {
            'anthropic_version': 'bedrock-2023-05-31',
            'messages': chat_messages,
            'max_tokens': max_tokens,
            'temperature': temperature
        }
        
        if system_content:
            request_body['system'] = system_content
        
        response = client.invoke_model(
            modelId=model,
            contentType='application/json',
            accept='application/json',
            body=json.dumps(request_body)
        )
        
        result = json.loads(response['body'].read().decode('utf-8'))
        
        content = ''
        for block in result.get('content', []):
            if block.get('type') == 'text':
                content += block.get('text', '')
        
        usage = result.get('usage', {})
        
        return {
            'content': content,
            'usage': {
                'prompt_tokens': usage.get('input_tokens', 0),
                'completion_tokens': usage.get('output_tokens', 0),
                'total_tokens': usage.get('input_tokens', 0) + usage.get('output_tokens', 0)
            },
            'was_truncated': result.get('stop_reason') == 'max_tokens'
        }
    
    elif model.startswith('amazon.'):
        # Amazon Titan model
        prompt = _convert_messages_to_prompt(messages)
        
        request_body = {
            'inputText': prompt,
            'textGenerationConfig': {
                'maxTokenCount': max_tokens,
                'temperature': temperature
            }
        }
        
        response = client.invoke_model(
            modelId=model,
            contentType='application/json',
            accept='application/json',
            body=json.dumps(request_body)
        )
        
        result = json.loads(response['body'].read().decode('utf-8'))
        
        return {
            'content': result.get('results', [{}])[0].get('outputText', ''),
            'was_truncated': result.get('results', [{}])[0].get('completionReason') == 'LENGTH'
        }
    
    elif model.startswith('meta.'):
        # Meta Llama model
        prompt = _convert_messages_to_llama_prompt(messages)
        
        request_body = {
            'prompt': prompt,
            'max_gen_len': max_tokens,
            'temperature': temperature
        }
        
        response = client.invoke_model(
            modelId=model,
            contentType='application/json',
            accept='application/json',
            body=json.dumps(request_body)
        )
        
        result = json.loads(response['body'].read().decode('utf-8'))
        
        return {
            'content': result.get('generation', ''),
            'was_truncated': result.get('stop_reason') == 'length'
        }
    
    else:
        raise Exception(f'Unsupported Bedrock model: {model}')


def _convert_messages_to_prompt(messages: List[Dict]) -> str:
    """
    Convert messages array to a single prompt string for models that don't
    support chat format (e.g., Titan).
    """
    parts = []
    for msg in messages:
        role = msg['role']
        content = msg['content']
        if role == 'system':
            parts.append(f'System: {content}')
        elif role == 'user':
            parts.append(f'User: {content}')
        elif role == 'assistant':
            parts.append(f'Assistant: {content}')
    
    parts.append('Assistant:')  # Prompt for response
    return '\n\n'.join(parts)


def _convert_messages_to_llama_prompt(messages: List[Dict]) -> str:
    """
    Convert messages array to Llama prompt format.
    """
    parts = []
    system_prompt = None
    
    for msg in messages:
        role = msg['role']
        content = msg['content']
        if role == 'system':
            system_prompt = content
        elif role == 'user':
            parts.append(f'[INST] {content} [/INST]')
        elif role == 'assistant':
            parts.append(content)
    
    if system_prompt:
        # Add system prompt at the beginning
        if parts:
            first_inst = parts[0]
            parts[0] = f'[INST] <<SYS>>\n{system_prompt}\n<</SYS>>\n\n{first_inst[7:-8]} [/INST]'
    
    return '\n'.join(parts)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _build_messages_array(
    system_prompt: Optional[str],
    rag_context: Optional[str],
    history: List[Dict],
    user_message: str,
    session: Dict[str, Any],
    has_rag_context: bool = False
) -> List[Dict]:
    """
    Build the messages array for the AI API call.
    
    Order:
    1. System prompt (with RAG context if available)
    2. Conversation history
    3. Current user message (enhanced with RAG context)
    
    Based on production patterns from pm-app-stack.
    """
    messages = []
    
    # Build system message with RAG instructions if context is available
    system_content = _build_system_prompt(system_prompt, has_rag_context, session)
    
    messages.append({
        'role': 'system',
        'content': system_content
    })
    
    # Add conversation history
    for msg in history:
        if msg['role'] != 'system':  # Skip system messages from history
            messages.append({
                'role': msg['role'],
                'content': msg['content']
            })
    
    # Add current user message (with RAG context prepended if available)
    enhanced_message = user_message
    if rag_context:
        enhanced_message = f"{rag_context}{user_message}"
    
    messages.append({
        'role': 'user',
        'content': enhanced_message
    })
    
    return messages


def _build_system_prompt(
    custom_prompt: Optional[str],
    has_rag_context: bool,
    session: Dict[str, Any]
) -> str:
    """
    Build system prompt with optional RAG instructions.
    
    Based on production build_system_prompt() from pm-app-stack.
    """
    if custom_prompt:
        base_prompt = custom_prompt
    else:
        # Default system prompt
        base_prompt = (
            'You are a helpful AI assistant. Provide clear, accurate, and helpful responses. '
            'Be concise but thorough in your responses.'
        )
    
    # Add RAG-specific instructions when document context is provided
    if has_rag_context:
        base_prompt += """

## Document Context Instructions

Relevant excerpts from knowledge base documents are provided above the user's question.

CRITICAL RULES:
1. **ALWAYS acknowledge document context**: Never say "I don't have access" or "I don't see any document" when sources are provided
2. **Cite sources**: Use the [Source N] format: "According to [Source 1]..."
3. **Prioritize documents**: Base answers primarily on provided excerpts
4. **Distinguish knowledge**:
   - "According to the uploaded document..." (document-based)
   - "While not in the documents, generally..." (supplemental)
5. **Synthesize multiple sources**: When multiple sources provided, combine information
6. **Use relevance scores**: Note confidence based on relevance percentages

BAD ❌: "I don't see any document that has been uploaded"
GOOD ✅: "According to [Source 1] (95% relevance), ..."
"""
    
    return base_prompt


def _get_conversation_history(session_id: str, limit: int) -> List[Dict]:
    """
    Get recent conversation history for context.
    """
    messages = common.find_many(
        table='chat_messages',
        filters={'session_id': session_id},
        order='created_at.desc',
        limit=limit
    )
    
    # Reverse to chronological order and exclude the most recent user message
    # (which will be added separately)
    return list(reversed(messages))[:-1] if messages else []


def _retrieve_rag_context(
    query: str,
    kb_ids: List[str],
    top_k: int,
    user_id: str
) -> Dict[str, Any]:
    """
    Retrieve RAG context from knowledge bases.
    
    Enhanced based on production patterns from pm-app-stack.
    Includes fallback logic for generic queries.
    """
    # Get query embedding
    try:
        query_embedding = _get_query_embedding(query)
    except Exception as e:
        logger.error(f'Error generating embedding: {str(e)}')
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
            logger.warning(f'Error searching KB {kb_id}: {str(e)}')
            continue
    
    # Fallback for generic queries or no results (production pattern)
    if not all_chunks:
        generic_patterns = ['summarize', 'summary', 'overview', "what's in", 'tell me about']
        is_generic = any(p in query.lower() for p in generic_patterns)
        
        if is_generic:
            # Try with lower threshold for generic queries
            for kb_id in kb_ids:
                try:
                    chunks = _search_kb_chunks(kb_id, query_embedding, top_k, threshold=0.5)
                    all_chunks.extend(chunks)
                except Exception as e:
                    continue
    
    if not all_chunks:
        return {
            'context': '',
            'citations': [],
            'tokensUsed': 0
        }
    
    # Sort by similarity and take top_k
    all_chunks.sort(key=lambda x: x.get('similarity', 0), reverse=True)
    top_chunks = all_chunks[:top_k]
    
    # Format context and citations (production format)
    context = _format_rag_context(top_chunks)
    citations = _format_citations(top_chunks)
    
    # Estimate tokens (rough: 1 token ≈ 4 characters)
    tokens_used = len(context) // 4
    
    return {
        'context': context,
        'citations': citations,
        'tokensUsed': tokens_used
    }


def _format_rag_context(chunks: List[Dict[str, Any]]) -> str:
    """
    Format retrieved chunks into context string.
    
    Based on production format_rag_context() from pm-app-stack.
    """
    if not chunks:
        return ''
    
    context = 'I found relevant information from knowledge base documents:\n\n'
    
    for i, chunk in enumerate(chunks, 1):
        metadata = chunk.get('metadata', {})
        filename = chunk.get('document_name') or metadata.get('filename', 'Unknown Document')
        similarity = chunk.get('similarity', 0)
        content = chunk.get('content', '')
        page = chunk.get('page_number') or metadata.get('page_number')
        
        page_info = f' (Page {page})' if page else ''
        context += f'[Source {i}] {filename}{page_info} (relevance: {similarity:.1%}):\n{content}\n\n'
    
    context += '---\n\nBased on the above documents, '
    return context


def _format_citations(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Format chunks into citation objects for API response.
    """
    citations = []
    
    for i, chunk in enumerate(chunks, 1):
        citations.append({
            'index': i,
            'kbId': chunk.get('kb_id'),
            'kbName': chunk.get('kb_name'),
            'documentId': chunk.get('document_id'),
            'documentName': chunk.get('document_name'),
            'chunkIndex': chunk.get('chunk_index', 0),
            'pageNumber': chunk.get('page_number'),
            'content': chunk.get('content', '')[:500],  # Truncate for response
            'similarity': chunk.get('similarity', 0)
        })
    
    return citations


def _get_query_embedding(query: str) -> List[float]:
    """
    Generate embedding for query using OpenAI ada-002.
    """
    import requests
    
    openai_api_key = os.environ.get('OPENAI_API_KEY')
    if not openai_api_key:
        raise Exception('OPENAI_API_KEY not configured')
    
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
    return result['data'][0]['embedding']


def _search_kb_chunks(
    kb_id: str,
    query_embedding: List[float],
    top_k: int,
    threshold: float = DEFAULT_SIMILARITY_THRESHOLD
) -> List[Dict[str, Any]]:
    """
    Search KB chunks using pgvector similarity search.
    
    Supports configurable threshold for fallback queries.
    """
    try:
        results = common.rpc(
            
'search_kb_chunks',
            
{
                'p_kb_id': kb_id,
                'p_query_embedding': query_embedding,
                'p_top_k': top_k,
                'p_similarity_threshold': threshold
            }
        )
        return results if results else []
    except Exception as e:
        logger.error(f'Error in KB search: {str(e)}')
        return []


def _count_tokens(text: str, model: str = 'gpt-4') -> int:
    """
    Count tokens for a given text.
    
    Uses tiktoken if available, falls back to rough estimate.
    Based on production count_tokens() from pm-app-stack.
    """
    try:
        import tiktoken
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    except Exception as e:
        logger.warning(f'Failed to count tokens precisely: {str(e)}')
        # Fallback to rough estimate (1 token ≈ 4 characters)
        return len(text) // 4


def _create_user_message(session_id: str, content: str, user_id: str) -> Dict[str, Any]:
    """
    Create a user message in the database.
    """
    message_data = {
        'session_id': session_id,
        'role': 'user',
        'content': content,
        'metadata': '{}',
        'created_by': user_id
    }
    
    message = common.insert_one(
        table='chat_messages',
        data=message_data
    )
    
    # Update session metadata
    _update_session_metadata(session_id, user_id)
    
    return _format_message_response(message)


def _create_assistant_message(
    session_id: str,
    content: str,
    metadata: Optional[Dict] = None,
    token_usage: Optional[Dict] = None,
    was_truncated: bool = False
) -> Dict[str, Any]:
    """
    Create an assistant message in the database.
    """
    message_data = {
        'session_id': session_id,
        'role': 'assistant',
        'content': content,
        'metadata': json.dumps(metadata) if metadata else '{}',
        'token_usage': json.dumps(token_usage) if token_usage else None,
        'was_truncated': was_truncated
    }
    
    message = common.insert_one(
        table='chat_messages',
        data=message_data
    )
    
    # Update session metadata
    _update_session_metadata(session_id, None)
    
    return _format_message_response(message)


def _update_session_metadata(session_id: str, user_id: Optional[str]) -> None:
    """
    Update session metadata after a new message.
    
    Note: This function doesn't filter by org_id because it's called
    after we've already validated the session with org_id filtering.
    """
    from datetime import datetime, timezone
    
    messages = common.find_many(
        table='chat_messages',
        filters={'session_id': session_id},
        select='id'
    )
    
    session = common.find_one(
        table='chat_sessions',
        filters={'id': session_id}
    )
    
    if not session:
        return
    
    metadata = session.get('metadata', {})
    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except:
            metadata = {}
    
    metadata['messageCount'] = len(messages)
    metadata['lastMessageAt'] = datetime.now(timezone.utc).isoformat()
    
    update_data = {'metadata': json.dumps(metadata)}
    if user_id:
        update_data['updated_by'] = user_id
    
    common.update_one(
        table='chat_sessions',
        filters={'id': session_id},
        data=update_data
    )


def _format_message_response(message: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format message for API response (camelCase).
    """
    metadata = message.get('metadata', {})
    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except:
            metadata = {}
    
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


def _sse_event(event_type: str, data: Dict) -> str:
    """
    Format an SSE event.
    
    Based on production create_sse_data() from pm-app-stack.
    """
    event_data = {'type': event_type, **data}
    return f'data: {json.dumps(event_data)}\n\n'


def _sse_done() -> str:
    """
    Format the SSE done signal.
    """
    return 'data: [DONE]\n\n'
