# Module-Chat Development Guide

This guide covers advanced development topics for module-chat, including adding new AI providers, customizing citation display, testing streaming locally, and monitoring token usage.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Adding New AI Providers](#adding-new-ai-providers)
3. [Customizing Citation Display](#customizing-citation-display)
4. [Testing Streaming Locally](#testing-streaming-locally)
5. [Monitoring Token Usage](#monitoring-token-usage)
6. [Conversation History Management](#conversation-history-management)
7. [RAG Context Optimization](#rag-context-optimization)
8. [Error Handling Patterns](#error-handling-patterns)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Lambda Structure

Module-chat uses three specialized Lambdas:

```
module-chat/
├── backend/
│   └── lambdas/
│       ├── chat-session/       # Session CRUD, sharing, favorites
│       │   └── lambda_function.py
│       ├── chat-message/       # Message CRUD, RAG context
│       │   └── lambda_function.py
│       └── chat-stream/        # AI streaming with SSE
│           └── lambda_function.py
```

### Data Flow

```
User Message → chat-stream Lambda
                    │
                    ├── 1. Save user message
                    │
                    ├── 2. Get grounded KBs
                    │
                    ├── 3. Retrieve RAG context (if KBs enabled)
                    │       └── pgvector similarity search
                    │
                    ├── 4. Build system prompt + history
                    │
                    ├── 5. Call AI provider (streaming)
                    │       ├── OpenAI
                    │       ├── Anthropic
                    │       └── Bedrock
                    │
                    ├── 6. Stream chunks via SSE
                    │
                    └── 7. Save assistant message
```

### SSE Event Protocol

```
data: {"type": "session", "sessionId": "...", "messageId": "..."}

data: {"type": "chunk", "content": "Hello"}

data: {"type": "chunk", "content": " world"}

data: {"type": "context", "citations": [...]}

data: {"type": "complete", "message": {...}, "usage": {...}}

data: [DONE]
```

---

## Adding New AI Providers

### Step 1: Create Provider Client

Add a new provider file in the chat-stream Lambda:

```python
# backend/lambdas/chat-stream/providers/google_vertex.py

from typing import AsyncIterator
import vertexai
from vertexai.generative_models import GenerativeModel

class GoogleVertexProvider:
    """Google Vertex AI provider for chat streaming."""
    
    def __init__(self, project_id: str, location: str):
        vertexai.init(project=project_id, location=location)
        self.model = GenerativeModel("gemini-1.5-pro")
    
    async def stream_response(
        self,
        system_prompt: str | None,
        messages: list[dict],
        user_message: str,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> AsyncIterator[str]:
        """Stream response from Vertex AI."""
        
        # Build prompt with system context
        prompt_parts = []
        if system_prompt:
            prompt_parts.append(f"System: {system_prompt}\n\n")
        
        # Add history
        for msg in messages:
            role = "User" if msg["role"] == "user" else "Assistant"
            prompt_parts.append(f"{role}: {msg['content']}\n")
        
        # Add current message
        prompt_parts.append(f"User: {user_message}\nAssistant:")
        
        full_prompt = "".join(prompt_parts)
        
        # Stream response
        response = await self.model.generate_content_async(
            full_prompt,
            stream=True,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            }
        )
        
        async for chunk in response:
            if chunk.text:
                yield chunk.text
```

### Step 2: Register Provider

Update the provider factory in chat-stream:

```python
# backend/lambdas/chat-stream/providers/__init__.py

from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from .bedrock_provider import BedrockProvider
from .google_vertex import GoogleVertexProvider

PROVIDERS = {
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "bedrock": BedrockProvider,
    "vertex": GoogleVertexProvider,  # Add new provider
}

def get_provider(provider_name: str, **kwargs):
    """Get AI provider instance by name."""
    if provider_name not in PROVIDERS:
        raise ValueError(f"Unknown provider: {provider_name}")
    return PROVIDERS[provider_name](**kwargs)
```

### Step 3: Add Provider Configuration

Update module-ai to support the new provider:

```python
# In module-ai Lambda
SUPPORTED_CHAT_PROVIDERS = {
    "openai": ["gpt-4", "gpt-4-turbo", "gpt-4o"],
    "anthropic": ["claude-3-opus", "claude-3-5-sonnet"],
    "bedrock": ["anthropic.claude-3-5-sonnet-20241022-v2:0", "amazon.titan-text-premier-v1:0"],
    "vertex": ["gemini-1.5-pro", "gemini-1.5-flash"],  # Add new models
}
```

### Step 4: Handle Provider-Specific Token Counting

```python
# backend/lambdas/chat-stream/token_counter.py

import tiktoken

def count_tokens(text: str, model: str) -> int:
    """Count tokens for the given model."""
    
    # OpenAI models
    if model.startswith("gpt"):
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    
    # Anthropic models (estimate)
    if "claude" in model.lower():
        return len(text) // 4  # ~4 chars per token
    
    # Vertex AI models (estimate)
    if "gemini" in model.lower():
        return len(text) // 4
    
    # Bedrock models
    if model.startswith("anthropic.") or model.startswith("amazon."):
        return len(text) // 4
    
    # Default fallback
    return len(text) // 4
```

---

## Customizing Citation Display

### Citation Data Structure

```typescript
interface Citation {
  kbId: string;
  kbName: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;        // Chunk text excerpt
  relevanceScore: number; // 0-1 similarity score
  pageNumber?: number;    // For PDFs
  section?: string;       // Document section heading
}
```

### Custom CitationBadge Component

```typescript
// frontend/components/CustomCitationBadge.tsx

import { Citation } from '../types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CitationBadgeProps {
  citation: Citation;
  index: number;
  onClick?: (citation: Citation) => void;
}

export function CitationBadge({ citation, index, onClick }: CitationBadgeProps) {
  const relevanceClass = citation.relevanceScore > 0.8 
    ? 'bg-green-100 text-green-800' 
    : citation.relevanceScore > 0.6 
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-gray-100 text-gray-800';
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onClick?.(citation)}
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${relevanceClass} hover:opacity-80`}
        >
          [{index + 1}] {citation.documentName}
          {citation.pageNumber && ` (p.${citation.pageNumber})`}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <div className="space-y-2">
          <p className="font-medium">{citation.documentName}</p>
          {citation.section && (
            <p className="text-sm text-muted-foreground">{citation.section}</p>
          )}
          <p className="text-sm line-clamp-4">{citation.content}</p>
          <p className="text-xs text-muted-foreground">
            Relevance: {Math.round(citation.relevanceScore * 100)}%
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
```

### Inline Citation Rendering

Parse and render citations inline within message content:

```typescript
// frontend/utils/renderMessageWithCitations.tsx

import { Citation } from '../types';
import { CitationBadge } from '../components/CitationBadge';

export function renderMessageWithCitations(
  content: string,
  citations: Citation[],
  onCitationClick?: (citation: Citation) => void
): React.ReactNode {
  // Pattern: [1], [2], etc. matching citation indices
  const citationPattern = /\[(\d+)\]/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = citationPattern.exec(content)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    
    // Add citation badge
    const citationIndex = parseInt(match[1], 10) - 1;
    if (citations[citationIndex]) {
      parts.push(
        <CitationBadge
          key={`citation-${citationIndex}`}
          citation={citations[citationIndex]}
          index={citationIndex}
          onClick={onCitationClick}
        />
      );
    } else {
      // Keep original text if citation not found
      parts.push(match[0]);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  
  return <>{parts}</>;
}
```

---

## Testing Streaming Locally

### Option 1: Local Lambda with SAM

```bash
# Install AWS SAM CLI
brew install aws-sam-cli

# Create template.yaml for local testing
cat > template.yaml << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  ChatStreamFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: backend/lambdas/chat-stream/
      Handler: lambda_function.lambda_handler
      Runtime: python3.11
      Timeout: 300
      MemorySize: 1024
      Environment:
        Variables:
          SUPABASE_URL: !Ref SupabaseUrl
          SUPABASE_KEY: !Ref SupabaseKey
          OPENAI_API_KEY: !Ref OpenAIKey
EOF

# Start local API
sam local start-api --env-vars env.json
```

### Option 2: Direct Python Testing

```python
# test_streaming.py

import asyncio
import json
from backend.lambdas.chat_stream.lambda_function import stream_handler

async def test_stream():
    """Test streaming response locally."""
    
    # Mock event
    event = {
        "pathParameters": {"sessionId": "test-session-123"},
        "body": json.dumps({
            "message": "What is CORA architecture?",
            "kbIds": []
        }),
        "requestContext": {
            "authorizer": {
                "claims": {
                    "sub": "test-user-123",
                    "custom:org_id": "test-org-123"
                }
            }
        }
    }
    
    # Collect streamed chunks
    chunks = []
    async for chunk in stream_handler(event, None):
        print(f"Received: {chunk}")
        chunks.append(chunk)
    
    print(f"\nTotal chunks: {len(chunks)}")

if __name__ == "__main__":
    asyncio.run(test_stream())
```

### Option 3: Frontend Mock Server

```typescript
// mock-server/sse-server.ts

import express from 'express';

const app = express();

app.get('/chats/:sessionId/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Mock SSE events
  const events = [
    { type: 'session', sessionId: req.params.sessionId, messageId: 'msg-1' },
    { type: 'chunk', content: 'Hello' },
    { type: 'chunk', content: ' world!' },
    { type: 'chunk', content: ' This is' },
    { type: 'chunk', content: ' a streaming' },
    { type: 'chunk', content: ' response.' },
    { type: 'complete', message: { id: 'msg-1', role: 'assistant', content: 'Hello world! This is a streaming response.' } },
  ];
  
  let index = 0;
  const interval = setInterval(() => {
    if (index < events.length) {
      res.write(`data: ${JSON.stringify(events[index])}\n\n`);
      index++;
    } else {
      res.write('data: [DONE]\n\n');
      clearInterval(interval);
      res.end();
    }
  }, 100);
  
  req.on('close', () => clearInterval(interval));
});

app.listen(3001, () => {
  console.log('Mock SSE server running on http://localhost:3001');
});
```

### Testing SSE in Browser

```javascript
// Browser console test
const eventSource = new EventSource('http://localhost:3001/chats/test-session/stream');

eventSource.onmessage = (event) => {
  console.log('Received:', event.data);
  if (event.data === '[DONE]') {
    eventSource.close();
    console.log('Stream complete');
  }
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};
```

---

## Monitoring Token Usage

### Token Tracking Database

The `chat_messages` table stores token usage per message:

```sql
-- In chat_messages table
token_usage JSONB DEFAULT '{}'

-- Example data:
{
  "promptTokens": 1250,
  "completionTokens": 450,
  "totalTokens": 1700,
  "model": "claude-3-5-sonnet",
  "ragContextTokens": 800  -- Tokens used for RAG context
}
```

### Aggregating Usage by Org

```python
# Usage tracking query
async def get_org_token_usage(org_id: str, start_date: str, end_date: str) -> dict:
    """Get token usage for an organization."""
    
    query = """
    SELECT 
        DATE_TRUNC('day', cm.created_at) as date,
        SUM((cm.token_usage->>'totalTokens')::int) as total_tokens,
        SUM((cm.token_usage->>'promptTokens')::int) as prompt_tokens,
        SUM((cm.token_usage->>'completionTokens')::int) as completion_tokens,
        COUNT(*) as message_count
    FROM chat_messages cm
    JOIN chat_sessions cs ON cm.session_id = cs.id
    WHERE cs.org_id = $1
      AND cm.created_at >= $2
      AND cm.created_at < $3
      AND cm.role = 'assistant'
    GROUP BY DATE_TRUNC('day', cm.created_at)
    ORDER BY date
    """
    
    return await db.fetch_all(query, org_id, start_date, end_date)
```

### Frontend Usage Dashboard

```typescript
// components/TokenUsageDashboard.tsx

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function TokenUsageDashboard({ orgId }: { orgId: string }) {
  const { data: usage, isLoading } = useQuery({
    queryKey: ['tokenUsage', orgId],
    queryFn: () => fetchTokenUsage(orgId),
  });
  
  if (isLoading) return <div>Loading usage data...</div>;
  
  const totalTokens = usage?.reduce((sum, day) => sum + day.totalTokens, 0) || 0;
  const estimatedCost = (totalTokens / 1000) * 0.003; // Example rate
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Total Tokens</h3>
          <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Estimated Cost</h3>
          <p className="text-2xl font-bold">${estimatedCost.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Messages</h3>
          <p className="text-2xl font-bold">
            {usage?.reduce((sum, day) => sum + day.messageCount, 0) || 0}
          </p>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={usage}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="totalTokens" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

---

## Conversation History Management

### History Length Configuration

```python
# backend/lambdas/chat-stream/config.py

MAX_HISTORY_MESSAGES = 10  # Messages to include in context
MAX_HISTORY_TOKENS = 4000  # Token limit for history
HISTORY_TRUNCATION_STRATEGY = "oldest_first"  # or "summarize"
```

### Smart History Truncation

```python
async def get_truncated_history(
    session_id: str,
    max_messages: int = 10,
    max_tokens: int = 4000
) -> list[dict]:
    """Get conversation history with smart truncation."""
    
    # Fetch recent messages
    messages = await fetch_messages(session_id, limit=max_messages * 2)
    
    # Reverse to chronological order
    messages = messages[::-1]
    
    # Count tokens and truncate
    total_tokens = 0
    included_messages = []
    
    for msg in reversed(messages):  # Start from most recent
        msg_tokens = count_tokens(msg["content"], model="gpt-4")
        
        if total_tokens + msg_tokens > max_tokens:
            break
        
        total_tokens += msg_tokens
        included_messages.insert(0, msg)
    
    return included_messages
```

### History Summarization (Optional)

```python
async def summarize_old_history(
    messages: list[dict],
    keep_recent: int = 5
) -> list[dict]:
    """Summarize old messages to save context space."""
    
    if len(messages) <= keep_recent:
        return messages
    
    old_messages = messages[:-keep_recent]
    recent_messages = messages[-keep_recent:]
    
    # Summarize old conversation
    old_text = "\n".join([f"{m['role']}: {m['content']}" for m in old_messages])
    
    summary = await call_ai_summarize(
        f"Summarize this conversation history concisely:\n{old_text}"
    )
    
    # Return summary + recent messages
    return [
        {"role": "system", "content": f"Previous conversation summary: {summary}"},
        *recent_messages
    ]
```

---

## RAG Context Optimization

### Context Relevance Threshold

```python
# Only include chunks above relevance threshold
MIN_RELEVANCE_THRESHOLD = 0.65

async def filter_relevant_chunks(
    chunks: list[dict],
    min_threshold: float = MIN_RELEVANCE_THRESHOLD
) -> list[dict]:
    """Filter chunks by relevance score."""
    return [c for c in chunks if c["relevance_score"] >= min_threshold]
```

### Dynamic Context Window

```python
async def build_optimal_context(
    query: str,
    kb_ids: list[str],
    max_context_tokens: int = 2000
) -> tuple[str, list[dict]]:
    """Build optimal RAG context within token budget."""
    
    # Search with higher limit initially
    all_chunks = await search_kb(query, kb_ids, top_k=20)
    
    # Filter by relevance
    relevant_chunks = filter_relevant_chunks(all_chunks, min_threshold=0.6)
    
    # Build context within token limit
    context_parts = []
    citations = []
    total_tokens = 0
    
    for i, chunk in enumerate(relevant_chunks):
        chunk_tokens = count_tokens(chunk["content"])
        
        if total_tokens + chunk_tokens > max_context_tokens:
            break
        
        context_parts.append(f"[{i+1}] {chunk['content']}")
        citations.append({
            "index": i + 1,
            "kbId": chunk["kb_id"],
            "documentName": chunk["document_name"],
            "content": chunk["content"][:200],
            "relevanceScore": chunk["relevance_score"]
        })
        total_tokens += chunk_tokens
    
    context = "\n\n".join(context_parts)
    return context, citations
```

### Query Enhancement for Better Retrieval

```python
async def enhance_query_for_retrieval(query: str) -> str:
    """Enhance user query for better KB retrieval."""
    
    # Extract key concepts
    # Option 1: Use AI to expand query
    enhanced = await call_ai(
        f"Expand this query with synonyms and related terms for document search: {query}",
        max_tokens=100
    )
    
    # Option 2: Simple keyword extraction
    # keywords = extract_keywords(query)
    # enhanced = f"{query} {' '.join(keywords)}"
    
    return enhanced
```

---

## Error Handling Patterns

### Graceful Streaming Errors

```python
async def stream_with_error_handling(session_id: str, message: str):
    """Stream response with graceful error handling."""
    
    try:
        # Send session info first
        yield {"type": "session", "sessionId": session_id, "messageId": msg_id}
        
        # Stream AI response
        async for chunk in stream_ai_response(...):
            yield {"type": "chunk", "content": chunk}
        
        # Send completion
        yield {"type": "complete", "message": saved_message}
        
    except RateLimitError as e:
        logger.warning(f"Rate limit hit: {e}")
        yield {
            "type": "error",
            "error": "AI provider rate limit reached. Please try again in a moment.",
            "retryAfter": e.retry_after
        }
        
    except TokenLimitError as e:
        logger.warning(f"Token limit exceeded: {e}")
        # Still return partial response
        yield {
            "type": "complete",
            "message": partial_message,
            "wasTruncated": True
        }
        
    except ProviderError as e:
        logger.error(f"Provider error: {e}")
        yield {
            "type": "error",
            "error": "AI service temporarily unavailable. Please try again.",
            "code": "PROVIDER_ERROR"
        }
        
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        yield {
            "type": "error",
            "error": "An unexpected error occurred.",
            "code": "INTERNAL_ERROR"
        }
```

### Frontend Error Recovery

```typescript
// hooks/useChatStream.ts

export function useChatStream(sessionId: string | null) {
  const [error, setError] = useState<ChatError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const sendMessage = async (message: string) => {
    setError(null);
    
    try {
      const cancel = streamMessage(
        sessionId!,
        message,
        (chunk) => setStreamingContent(prev => prev + chunk),
        (finalMessage) => {
          // Success - reset retry count
          setRetryCount(0);
          addMessage(finalMessage);
        },
        (err) => {
          setError(err);
          
          // Auto-retry for transient errors
          if (err.code === 'PROVIDER_ERROR' && retryCount < 3) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              sendMessage(message);
            }, 1000 * (retryCount + 1));
          }
        }
      );
      
      setCancelStream(() => cancel);
    } catch (err) {
      setError({ message: 'Failed to send message', code: 'NETWORK_ERROR' });
    }
  };
  
  return { streaming, streamingContent, error, sendMessage, cancel };
}
```

---

## Performance Optimization

### Connection Pooling

```python
# Use connection pool for database
from psycopg2.pool import ThreadedConnectionPool

pool = ThreadedConnectionPool(
    minconn=1,
    maxconn=10,
    dsn=DATABASE_URL
)

def get_connection():
    return pool.getconn()

def release_connection(conn):
    pool.putconn(conn)
```

### Caching RAG Results

```python
import hashlib
from functools import lru_cache

@lru_cache(maxsize=1000)
def cached_kb_search(query_hash: str, kb_ids_hash: str, top_k: int):
    """Cache KB search results for identical queries."""
    # This is called with hashes, actual search happens in wrapper
    pass

async def search_kb_with_cache(query: str, kb_ids: list[str], top_k: int = 5):
    """Search KB with caching layer."""
    
    # Create cache keys
    query_hash = hashlib.md5(query.encode()).hexdigest()
    kb_ids_hash = hashlib.md5(",".join(sorted(kb_ids)).encode()).hexdigest()
    
    # Check cache (would use Redis in production)
    cache_key = f"kb_search:{query_hash}:{kb_ids_hash}:{top_k}"
    cached = await redis.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    # Perform search
    results = await search_kb(query, kb_ids, top_k)
    
    # Cache for 5 minutes
    await redis.setex(cache_key, 300, json.dumps(results))
    
    return results
```

### Frontend Virtualization

For long message lists:

```typescript
// Use react-window for virtualized list
import { VariableSizeList as List } from 'react-window';

function VirtualizedMessageList({ messages }: { messages: ChatMessage[] }) {
  const listRef = useRef<List>(null);
  
  // Dynamic height calculation
  const getItemSize = (index: number) => {
    const message = messages[index];
    // Estimate height based on content length
    const baseHeight = 80;
    const contentHeight = Math.ceil(message.content.length / 100) * 20;
    return baseHeight + contentHeight;
  };
  
  return (
    <List
      ref={listRef}
      height={600}
      itemCount={messages.length}
      itemSize={getItemSize}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <ChatMessage message={messages[index]} />
        </div>
      )}
    </List>
  );
}
```

---

## Troubleshooting

### Common Issues

#### 1. Streaming Connection Drops

**Symptoms:** SSE connection closes unexpectedly

**Causes:**
- API Gateway timeout (29 seconds for HTTP APIs)
- Lambda timeout
- Network issues

**Solutions:**
```python
# Increase Lambda timeout to 300s
# Use Lambda function URL instead of API Gateway for longer streams
# Implement reconnection in frontend

# Frontend reconnection
const reconnect = () => {
  setTimeout(() => {
    eventSource = new EventSource(url);
    // Re-attach handlers...
  }, 1000);
};

eventSource.onerror = () => {
  eventSource.close();
  reconnect();
};
```

#### 2. RAG Context Not Appearing

**Symptoms:** AI responses don't use KB content

**Debug steps:**
```python
# 1. Check KB grounding is enabled
grounded_kbs = await get_grounded_kbs(session_id)
logger.info(f"Grounded KBs: {grounded_kbs}")

# 2. Check search results
chunks = await search_kb(query, kb_ids)
logger.info(f"Search returned {len(chunks)} chunks")
logger.info(f"Top chunk score: {chunks[0]['relevance_score'] if chunks else 'N/A'}")

# 3. Check context token count
context_tokens = count_tokens(context)
logger.info(f"Context tokens: {context_tokens}")
```

#### 3. Token Usage Not Tracking

**Symptoms:** token_usage field is null or missing

**Fix:**
```python
# Ensure token counting after streaming completes
full_content = "".join(chunks)
usage = {
    "promptTokens": count_tokens(system_prompt + history_text + message),
    "completionTokens": count_tokens(full_content),
    "totalTokens": 0  # Calculate
}
usage["totalTokens"] = usage["promptTokens"] + usage["completionTokens"]

# Save with message
await save_message(session_id, "assistant", full_content, token_usage=usage)
```

#### 4. Citations Not Matching Content

**Symptoms:** Citation numbers in text don't match displayed citations

**Fix:**
```python
# Ensure consistent citation numbering
def build_rag_prompt(context: str, citations: list) -> str:
    """Build prompt with consistent citation format."""
    
    numbered_context = []
    for i, c in enumerate(citations, 1):
        numbered_context.append(f"[{i}] {c['content']}")
    
    return f"""Use the following context to answer the question.
Cite sources using [1], [2], etc. format.

Context:
{chr(10).join(numbered_context)}

Important: Only cite the source numbers provided above."""
```

### Debug Logging

Enable detailed logging for troubleshooting:

```python
# Set log level via environment variable
import logging

log_level = os.environ.get("LOG_LEVEL", "INFO")
logging.basicConfig(level=getattr(logging, log_level))
logger = logging.getLogger(__name__)

# Log key steps
logger.debug(f"Starting stream for session {session_id}")
logger.debug(f"KB IDs: {kb_ids}")
logger.debug(f"RAG context length: {len(context)} chars")
logger.debug(f"History messages: {len(history)}")
logger.info(f"Streaming from provider: {provider_name}")
```

---

## Related Documentation

- [Module-Chat README](../../templates/_modules-functional/module-chat/README.md)
- [Module-Chat Technical Spec](../specifications/module-chat/MODULE-CHAT-TECHNICAL-SPEC.md)
- [Integration Test Checklist](../../templates/_modules-functional/module-chat/INTEGRATION-TEST-CHECKLIST.md)
- [Module-KB Development Guide](guide_MODULE-KB-DEVELOPMENT.md)
- [AI Provider Authentication Guide](guide_AI-PROVIDER-AUTHENTICATION.md)

---

**Last Updated:** January 15, 2026
