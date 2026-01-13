# Module-Chat Implementation Plan

**Status**: 🔵 PLANNED  
**Priority**: HIGH (Depends on module-kb completion)  
**Dependencies**: module-kb, module-ws, module-ai, module-access, module-mgmt  
**Estimated Duration**: 10-15 sessions (~30-45 hours)

---

## Executive Summary

Implement a CORA-compliant Chat module with AI-powered conversations, streaming responses, KB grounding, workspace context, and simplified UX focused on workspace and chat-level functionality.

---

## Source Material

**Legacy Location**: `~/code/policy/legacy/pm-app-stack/apps/web/`

**Key Components to Migrate**:
- Zustand chat store with session management
- ChatContainer, ChatHistory, ChatMessage, ChatComposer components
- Streaming message support with real-time updates
- KB grounding integration (from module-kb)
- Sharing and collaboration features
- Project/workspace association

---

## Architecture Overview

### Chat Scopes

1. **Workspace-Scoped Chats**: Primary use case
   - Created within workspace context
   - Accessible to workspace members
   - Can ground to workspace KB + org/global KBs

2. **User-Level Chats**: Personal conversations
   - Not tied to any workspace
   - Private to individual user
   - Can ground to org/global KBs only

### KB Grounding Strategy

- Users select which KBs to ground chat responses
- Available KBs: workspace KB, enabled org KBs, enabled global KBs
- RAG context retrieved from module-kb before AI call
- Citations shown in responses (document source + chunk)

### Streaming Architecture

- Lambda response streaming for real-time AI responses
- WebSocket alternative: Server-Sent Events (SSE) via API Gateway
- Cancel stream capability
- Token usage tracking

---

## Phase 1: Foundation & Specification (Sessions 126-128)

**Duration**: 3 sessions (~6-9 hours)

### 1.1 Module Specification Documents

**Location**: `docs/specifications/module-chat/`

- [ ] Create specification directory structure
- [ ] Write `MODULE-SPEC-PARENT.md`:
  - Overview and purpose
  - Workspace-scoped + user-level chat architecture
  - Dependencies: module-kb (RAG), module-ws (context), module-ai (providers)
  - Integration points with module-kb, module-wf
- [ ] Write `MODULE-SPEC-TECHNICAL.md`:
  - Database schema (sessions, messages, shares)
  - Lambda functions (chat-session, chat-message, chat-stream)
  - API endpoints with route docstrings
  - Streaming architecture (SSE or Lambda streaming)
  - KB grounding flow (query → retrieve → inject → stream)
- [ ] Write `MODULE-SPEC-USER-UX.md`:
  - User flows: create chat, send message, KB selection
  - Streaming message display
  - Citation rendering
  - Chat history and search
- [ ] Write `MODULE-SPEC-ADMIN-UX.md`:
  - Org admin: chat usage analytics
  - Platform admin: token usage monitoring
  - Rate limiting configuration

### 1.2 Data Model Design

- [ ] Design CORA-compliant database schema:
  - `chat_sessions` - Chat metadata (workspace_id, title, kb_ids)
  - `chat_messages` - Message storage (role, content, metadata)
  - `chat_shares` - Sharing/collaboration
  - `chat_favorites` - User favorites
  - `chat_kb_grounding` - KB associations per chat
- [ ] Map legacy tables to CORA tables
- [ ] Define RLS policies for multi-tenant access
- [ ] Document KB grounding data flow

### 1.3 API Endpoint Design

- [ ] Define Lambda route structure with docstrings
- [ ] Map legacy endpoints to CORA patterns
- [ ] Document camelCase API response format
- [ ] Define streaming protocol (SSE or Lambda response streaming)

**Deliverables**:
- Complete specification documents
- Database schema design
- API endpoint specifications
- Streaming architecture design

---

## Phase 2: Database Schema (Sessions 129-130)

**Duration**: 2 sessions (~6-8 hours)

### 2.1 Core Tables

- [ ] Create `db/schema/001-chat-session.sql`:
  ```sql
  CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    is_shared_with_workspace BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
  );
  
  CREATE INDEX chat_sessions_workspace_id_idx ON chat_sessions(workspace_id);
  CREATE INDEX chat_sessions_created_by_idx ON chat_sessions(created_by);
  ```

- [ ] Create `db/schema/002-chat-message.sql`:
  ```sql
  CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    token_usage JSONB,
    was_truncated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
  );
  
  CREATE INDEX chat_messages_session_id_idx ON chat_messages(session_id);
  CREATE INDEX chat_messages_created_at_idx ON chat_messages(created_at);
  ```

- [ ] Create `db/schema/003-chat-kb-grounding.sql`:
  ```sql
  CREATE TABLE chat_kb_grounding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
    kb_id UUID REFERENCES kb_bases(id) ON DELETE CASCADE NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by UUID REFERENCES auth.users(id) NOT NULL,
    UNIQUE(session_id, kb_id)
  );
  
  CREATE INDEX chat_kb_grounding_session_id_idx ON chat_kb_grounding(session_id);
  ```

### 2.2 Collaboration Tables

- [ ] Create `db/schema/004-chat-share.sql`:
  ```sql
  CREATE TABLE chat_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
    shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    permission_level VARCHAR(50) DEFAULT 'view' CHECK (permission_level IN ('view', 'edit')),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, shared_with_user_id)
  );
  ```

- [ ] Create `db/schema/005-chat-favorite.sql`:
  ```sql
  CREATE TABLE chat_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, user_id)
  );
  ```

### 2.3 RPC Functions

- [ ] Create `db/schema/006-chat-rpc-functions.sql`:
  - `is_chat_owner(user_id, session_id)` → boolean
  - `can_add_messages(user_id, session_id)` → boolean
  - `can_view_chat(user_id, session_id)` → boolean
  - `get_accessible_chats_for_workspace(user_id, workspace_id)` → session[]
  - `get_grounded_kbs_for_chat(session_id)` → kb[]

### 2.4 RLS Policies

- [ ] Create `db/schema/007-apply-rls.sql`:
  - Enable RLS on all chat tables
  - Policies for workspace-scoped vs user-level chats
  - Share-based access policies
  - Owner vs participant permissions

**Deliverables**:
- Complete database schema
- RPC functions for access control
- RLS policies

---

## Phase 3: Backend - Chat Session Lambda (Sessions 131-132)

**Duration**: 2 sessions (~6-8 hours)

### 3.1 Lambda Structure

**Location**: `backend/lambdas/chat-session/`

- [ ] Create `lambda_function.py` with route docstring:
  ```python
  """
  Chat Session Lambda - Session CRUD Operations
  
  Routes - Workspace Scoped:
  - GET /workspaces/{workspaceId}/chats - List workspace chats
  - POST /workspaces/{workspaceId}/chats - Create workspace chat
  - GET /workspaces/{workspaceId}/chats/{sessionId} - Get chat details
  - PATCH /workspaces/{workspaceId}/chats/{sessionId} - Update chat (title, sharing)
  - DELETE /workspaces/{workspaceId}/chats/{sessionId} - Delete chat
  
  Routes - User Level:
  - GET /users/me/chats - List user's personal chats
  - POST /users/me/chats - Create personal chat
  - GET /chats/{sessionId} - Get chat details (any accessible chat)
  - PATCH /chats/{sessionId} - Update chat
  - DELETE /chats/{sessionId} - Delete chat
  
  Routes - KB Grounding:
  - GET /chats/{sessionId}/kbs - List grounded KBs
  - POST /chats/{sessionId}/kbs - Add KB grounding
  - DELETE /chats/{sessionId}/kbs/{kbId} - Remove KB grounding
  
  Routes - Sharing:
  - GET /chats/{sessionId}/shares - List shares
  - POST /chats/{sessionId}/shares - Share chat
  - DELETE /chats/{sessionId}/shares/{shareId} - Remove share
  
  Routes - Favorites:
  - POST /chats/{sessionId}/favorite - Toggle favorite
  """
  ```

### 3.2 Core Handlers

- [ ] Implement session CRUD:
  - `handle_list_workspace_chats()` - List with pagination/filters
  - `handle_create_workspace_chat()` - Create with workspace context
  - `handle_get_chat()` - Get with messages + KB info
  - `handle_update_chat()` - Update title, sharing settings
  - `handle_delete_chat()` - Soft delete with cleanup

- [ ] Implement KB grounding:
  - `handle_list_grounded_kbs()` - Show active KBs for chat
  - `handle_add_kb_grounding()` - Associate KB with chat
  - `handle_remove_kb_grounding()` - Disassociate KB

- [ ] Implement sharing:
  - `handle_list_shares()` - Show who has access
  - `handle_create_share()` - Share with user or workspace
  - `handle_delete_share()` - Revoke access

### 3.3 Helper Functions

- [ ] `get_accessible_chats(user_id, workspace_id, filters)` - Query with RLS
- [ ] `enrich_chat_metadata(chats)` - Add KB info, member counts
- [ ] `check_chat_permission(user_id, session_id, required_permission)` - Auth check

### 3.4 Configuration

- [ ] Create `requirements.txt`:
  ```
  boto3==1.34.0
  psycopg2-binary==2.9.9
  requests==2.31.0
  ```
- [ ] Update `backend/build.sh` to include chat-session

**Deliverables**:
- Complete chat-session Lambda
- Session CRUD with workspace scoping
- KB grounding and sharing support

---

## Phase 4: Backend - Chat Message Lambda (Sessions 133-134)

**Duration**: 2 sessions (~6-8 hours)

### 4.1 Lambda Structure

**Location**: `backend/lambdas/chat-message/`

- [ ] Create `lambda_function.py` with route docstring:
  ```python
  """
  Chat Message Lambda - Message CRUD and Context Retrieval
  
  Routes - Messages:
  - GET /chats/{sessionId}/messages - List messages with pagination
  - POST /chats/{sessionId}/messages - Send message (triggers streaming)
  - GET /chats/{sessionId}/messages/{messageId} - Get single message
  
  Routes - Context:
  - POST /chats/{sessionId}/context - Get RAG context for query
  - GET /chats/{sessionId}/history - Get formatted conversation history
  """
  ```

### 4.2 Core Handlers

- [ ] Implement message CRUD:
  - `handle_list_messages()` - Paginated message list
  - `handle_send_message()` - Create user message, trigger streaming
  - `handle_get_message()` - Get with metadata

- [ ] Implement RAG context retrieval:
  - `handle_get_rag_context()` - Query KB embeddings
  - Integration with module-kb pgvector search
  - Format context with citations

### 4.3 RAG Context Retrieval

- [ ] Implement `retrieve_rag_context(query, kb_ids, top_k=5)`:
  ```python
  # 1. Generate query embedding (OpenAI ada-002)
  # 2. Query pgvector for similar chunks across specified KBs
  # 3. Re-rank by relevance
  # 4. Format with citations (doc name, page, chunk index)
  # 5. Return context string + citation metadata
  ```

- [ ] Implement context injection:
  - Add retrieved context to system message
  - Include citation metadata in response
  - Track which docs were used

### 4.4 Configuration

- [ ] Create `requirements.txt`:
  ```
  boto3==1.34.0
  psycopg2-binary==2.9.9
  openai==1.10.0
  requests==2.31.0
  ```

**Deliverables**:
- Complete chat-message Lambda
- RAG context retrieval integration
- Citation tracking

---

## Phase 5: Backend - Chat Stream Lambda (Sessions 135-136)

**Duration**: 2 sessions (~6-8 hours)

### 5.1 Lambda Structure

**Location**: `backend/lambdas/chat-stream/`

- [ ] Create `lambda_function.py` for streaming:
  ```python
  """
  Chat Stream Lambda - AI Response Streaming
  
  This Lambda uses Lambda Response Streaming to provide real-time AI responses.
  
  Routes:
  - POST /chats/{sessionId}/stream - Stream AI response
  
  Request Body:
  {
    "message": "user query",
    "kbIds": ["kb-uuid-1", "kb-uuid-2"]  // optional KB grounding
  }
  
  Response: Server-Sent Events (SSE) stream
  """
  ```

### 5.2 Streaming Implementation

- [ ] Implement Lambda response streaming:
  - Use `awslambdaric` for streaming support
  - Stream tokens as they arrive from AI provider
  - Send SSE events: `data: {type: "token", content: "..."}`
  - Final event: `data: {type: "done", messageId: "uuid", usage: {...}}`

- [ ] Integrate with module-ai:
  - Retrieve org's configured AI provider from module-ai
  - Use provider credentials (OpenAI, Anthropic, Bedrock)
  - Handle different streaming protocols per provider

### 5.3 RAG Integration

- [ ] Implement grounded response flow:
  ```python
  # 1. Retrieve RAG context from module-kb (via chat-message Lambda)
  # 2. Build system message with context + instructions
  # 3. Format conversation history (last N messages)
  # 4. Call AI provider streaming API
  # 5. Stream tokens back to client
  # 6. Save assistant message with metadata (usage, citations)
  ```

### 5.4 Error Handling

- [ ] Handle streaming errors:
  - AI provider rate limits
  - Connection drops
  - Token limit exceeded
  - Send error events: `data: {type: "error", message: "..."}`

### 5.5 Configuration

- [ ] Create `requirements.txt`:
  ```
  boto3==1.34.0
  psycopg2-binary==2.9.9
  openai==1.10.0
  anthropic==0.18.0
  requests==2.31.0
  ```

**Deliverables**:
- Complete chat-stream Lambda with SSE
- AI provider integration via module-ai
- RAG-grounded responses

---

## Phase 6: Infrastructure (Session 137)

**Duration**: 1 session (~3-4 hours)

### 6.1 Terraform Resources

**Location**: `infrastructure/`

- [ ] Create `main.tf`:
  - 3 Lambda functions (chat-session, chat-message, chat-stream)
  - API Gateway routes with streaming support
  - Lambda execution roles
  - CloudWatch log groups

- [ ] Create `variables.tf`:
  ```hcl
  variable "project_name" {}
  variable "environment" {}
  variable "org_common_layer_arn" {}
  variable "supabase_url" {}
  variable "supabase_anon_key" {}
  variable "supabase_service_role_key" {}
  variable "openai_api_key" {}
  ```

- [ ] Create `outputs.tf`:
  ```hcl
  output "chat_api_endpoint" {}
  output "chat_stream_endpoint" {}
  ```

### 6.2 Lambda Configuration

- [ ] chat-session: Memory 512 MB, Timeout 30s
- [ ] chat-message: Memory 512 MB, Timeout 30s
- [ ] chat-stream: Memory 1024 MB, Timeout 300s (5 min), Response Streaming enabled
- [ ] All use `source_code_hash` for code change detection
- [ ] All use `lifecycle { create_before_destroy = true }`

### 6.3 API Gateway Configuration

- [ ] Configure CORS for streaming endpoints
- [ ] Set up streaming response for chat-stream Lambda
- [ ] Configure request/response validation

**Deliverables**:
- Complete Terraform infrastructure
- Streaming-enabled API Gateway
- Proper IAM permissions

---

## Phase 7: Frontend - Types & API (Session 138)

**Duration**: 1 session (~3-4 hours)

### 7.1 TypeScript Types

**Location**: `frontend/types/index.ts`

- [ ] Define chat types (camelCase):
  ```typescript
  export interface ChatSession {
    id: string;
    title: string;
    workspaceId?: string;
    orgId: string;
    createdBy: string;
    isSharedWithWorkspace: boolean;
    metadata: ChatMetadata;
    groundedKbs: KnowledgeBase[];
    createdAt: string;
    updatedAt: string;
  }
  
  export interface ChatMetadata {
    lastMessageAt?: string;
    messageCount: number;
    participantCount: number;
    tokenUsage: TokenUsage;
  }
  
  export interface ChatMessage {
    id: string;
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata: MessageMetadata;
    tokenUsage?: TokenUsage;
    wasTruncated: boolean;
    createdAt: string;
    createdBy?: string;
  }
  
  export interface MessageMetadata {
    citations?: Citation[];
    model?: string;
    temperature?: number;
  }
  
  export interface Citation {
    kbId: string;
    kbName: string;
    documentId: string;
    documentName: string;
    chunkIndex: number;
    content: string;
  }
  
  export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }
  
  export interface ChatShare {
    id: string;
    sessionId: string;
    sharedWithUserId: string;
    sharedWithUserEmail: string;
    permissionLevel: 'view' | 'edit';
    createdBy: string;
    createdAt: string;
  }
  ```

### 7.2 API Client

**Location**: `frontend/lib/api.ts`

- [ ] Implement chat API functions:
  ```typescript
  // Sessions
  export async function listWorkspaceChats(workspaceId: string, filters?: ChatFilters): Promise<ChatSession[]>
  export async function createWorkspaceChat(workspaceId: string, title: string, kbIds?: string[]): Promise<ChatSession>
  export async function getChatSession(sessionId: string): Promise<ChatSession>
  export async function updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession>
  export async function deleteChatSession(sessionId: string): Promise<void>
  
  // Messages
  export async function listMessages(sessionId: string, pagination?: Pagination): Promise<ChatMessage[]>
  export async function streamMessage(sessionId: string, message: string, kbIds?: string[], onChunk: (chunk: string) => void, onComplete: (message: ChatMessage) => void, onError: (error: Error) => void): () => void
  
  // KB Grounding
  export async function listGroundedKBs(sessionId: string): Promise<KnowledgeBase[]>
  export async function addKBGrounding(sessionId: string, kbId: string): Promise<void>
  export async function removeKBGrounding(sessionId: string, kbId: string): Promise<void>
  
  // Sharing
  export async function listChatShares(sessionId: string): Promise<ChatShare[]>
  export async function shareChatSession(sessionId: string, userId: string, permission: 'view' | 'edit'): Promise<ChatShare>
  export async function removeChatShare(shareId: string): Promise<void>
  
  // Favorites
  export async function toggleChatFavorite(sessionId: string): Promise<void>
  ```

**Deliverables**:
- Complete TypeScript types
- API client with streaming support

---

## Phase 8: Frontend - State Management (Session 139)

**Duration**: 1 session (~3-4 hours)

### 8.1 Zustand Chat Store

**Location**: `frontend/store/chatStore.ts`

- [ ] Create chat store with persistence:
  ```typescript
  interface ChatState {
    // Current session
    currentSessionId: string | null;
    messages: ChatMessage[];
    
    // Streaming state
    streaming: boolean;
    streamingContent: string;
    cancelStream: (() => void) | null;
    
    // Sessions list
    sessions: ChatSession[];
    sessionsLoading: boolean;
    
    // KB grounding
    groundedKbs: KnowledgeBase[];
    
    // Actions
    loadSessions: (workspaceId?: string) => Promise<void>;
    createSession: (workspaceId: string, title?: string, kbIds?: string[]) => Promise<ChatSession>;
    switchSession: (sessionId: string) => Promise<void>;
    deleteSession: (sessionId: string) => Promise<void>;
    sendMessage: (message: string) => Promise<void>;
    cancelCurrentStream: () => void;
    addKBGrounding: (kbId: string) => Promise<void>;
    removeKBGrounding: (kbId: string) => Promise<void>;
  }
  ```

- [ ] Implement session management actions
- [ ] Implement streaming message handling
- [ ] Implement KB grounding actions
- [ ] Add localStorage persistence for current session

**Deliverables**:
- Complete Zustand store
- Persistence configuration

---

## Phase 9: Frontend - Hooks (Sessions 140-141)

**Duration**: 2 sessions (~6-8 hours)

### 9.1 Chat Session Hooks

**Location**: `frontend/hooks/`

- [ ] Create `useChatSessions.ts`:
  ```typescript
  export function useChatSessions(workspaceId?: string) {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    
    const createSession = async (title?: string, kbIds?: string[]) => { /* ... */ };
    const deleteSession = async (sessionId: string) => { /* ... */ };
    
    return { sessions, loading, createSession, deleteSession, refresh };
  }
  ```

- [ ] Create `useChatSession.ts`:
  ```typescript
  export function useChatSession(sessionId: string | null) {
    const [session, setSession] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    
    const updateSession = async (updates: Partial<ChatSession>) => { /* ... */ };
    
    return { session, messages, loading, updateSession, refresh };
  }
  ```

### 9.2 Messaging Hooks

- [ ] Create `useChatStream.ts`:
  ```typescript
  export function useChatStream(sessionId: string | null) {
    const [streaming, setStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [cancelStream, setCancelStream] = useState<(() => void) | null>(null);
    
    const sendMessage = async (message: string, kbIds?: string[]) => {
      // Set up streaming with SSE
      const cancel = streamMessage(
        sessionId!,
        message,
        kbIds,
        (chunk) => setStreamingContent(prev => prev + chunk),
        (finalMessage) => { /* add to messages */ },
        (error) => { /* handle error */ }
      );
      setCancelStream(() => cancel);
    };
    
    const cancel = () => {
      if (cancelStream) cancelStream();
    };
    
    return { streaming, streamingContent, sendMessage, cancel };
  }
  ```

### 9.3 KB Grounding Hooks

- [ ] Create `useChatKBGrounding.ts`:
  ```typescript
  export function useChatKBGrounding(sessionId: string | null) {
    const [groundedKbs, setGroundedKbs] = useState<KnowledgeBase[]>([]);
    const [availableKbs, setAvailableKbs] = useState<KnowledgeBase[]>([]);
    
    const addKB = async (kbId: string) => { /* ... */ };
    const removeKB = async (kbId: string) => { /* ... */ };
    
    return { groundedKbs, availableKbs, addKB, removeKB, refresh };
  }
  ```

**Deliverables**:
- Complete hooks for chat management
- Streaming message hooks
- KB grounding hooks

---

## Phase 10: Frontend - Components (Sessions 142-145)

**Duration**: 4 sessions (~12-16 hours)

### 10.1 Chat Container

**Location**: `frontend/components/`

- [ ] Create `ChatContainer.tsx`:
  - Main wrapper for chat interface
  - Header with title, KB selector, options menu
  - Message history area
  - Input composer at bottom
  - Responsive layout

### 10.2 Message Display

- [ ] Create `ChatHistory.tsx`:
  - Scrollable message list
  - Auto-scroll to bottom on new messages
  - Infinite scroll for older messages
  - Date dividers

- [ ] Create `ChatMessage.tsx`:
  - User vs assistant styling
  - Markdown rendering (code blocks, links, lists)
  - Citation badges (clickable to show source)
  - Token usage display
  - Copy button

- [ ] Create `StreamingMessage.tsx`:
  - Real-time token display
  - Typing indicator
  - Cancel button
  - Progress indicator

### 10.3 Input Composer

- [ ] Create `ChatComposer.tsx`:
  - Textarea with auto-resize
  - Send button (Enter to send, Shift+Enter for newline)
  - KB selector dropdown
  - Character count
  - Disabled state when streaming

### 10.4 KB Grounding

- [ ] Create `ChatKBSelector.tsx`:
  - Dropdown showing available KBs
  - Multi-select with checkboxes
  - Grouped by source (workspace, org, global)
  - Badge count of selected KBs
  - Real-time update of grounded KBs

### 10.5 Session Management

- [ ] Create `ChatSessionList.tsx`:
  - Sidebar list of recent chats
  - Search/filter
  - Create new chat button
  - Delete confirmation

- [ ] Create `ChatSessionCard.tsx`:
  - Session title
  - Last message preview
  - Timestamp
  - Favorite star
  - Options menu (3 dots)

### 10.6 Citations

- [ ] Create `CitationBadge.tsx`:
  - Document name + page/chunk indicator
  - Hover to show excerpt
  - Click to open document (if accessible)

- [ ] Create `CitationPanel.tsx`:
  - Side panel showing all citations in conversation
  - Grouped by document
  - Click to jump to message

**Deliverables**:
- Complete chat UI components
- Streaming display
- KB grounding selector
- Citation rendering

---

## Phase 11: Frontend - Pages & Routes (Sessions 146-147)

**Duration**: 2 sessions (~6-8 hours)

### 11.1 Chat Pages

**Location**: `frontend/pages/`

- [ ] Create `ChatListPage.tsx`:
  - List all accessible chats
  - Filter by workspace, favorites, shared
  - Search by title or content
  - Create new chat button

- [ ] Create `ChatPage.tsx`:
  - Full chat interface
  - Breadcrumb navigation (workspace → chat)
  - KB selector in header
  - Options menu (share, favorite, delete)

### 11.2 Workspace Integration

- [ ] Update `WorkspaceDetailPage.tsx` (Activities tab):
  - Show recent workspace chats
  - KB grounding indicators
  - Quick create chat button
  - "Continue Chat" actions

### 11.3 Routes

**Location**: `routes/`

- [ ] Create `routes/chat/page.tsx`:
  - Renders ChatListPage
  - Shows all accessible chats

- [ ] Create `routes/chat/[id]/page.tsx`:
  - Renders ChatPage
  - Dynamic route for session ID

- [ ] Create `routes/ws/[id]/chats/page.tsx`:
  - Workspace-scoped chat list
  - Shows only workspace chats

**Deliverables**:
- Chat pages
- Workspace integration
- Next.js routes

---

## Phase 12: Integration & Testing (Sessions 148-149)

**Duration**: 2 sessions (~6-8 hours)

### 12.1 Module Integration

- [ ] Integrate with module-kb:
  - KB selector uses `listAvailableKBsForChat()`
  - RAG context retrieval
  - Citation display with document links

- [ ] Integrate with module-ws:
  - Workspace context for chat creation
  - Access control via workspace membership
  - Activities tab shows workspace chats

- [ ] Integrate with module-ai:
  - Retrieve org's AI provider configuration
  - Use provider credentials for streaming
  - Track token usage

### 12.2 Module Registration

- [ ] Update `module.json` with complete metadata
- [ ] Register in `templates/_modules-functional/README.md`
- [ ] Add to CORA module registry

### 12.3 Validation

- [ ] Run API response validator
- [ ] Run frontend compliance validator
- [ ] Run structure validator
- [ ] Fix any compliance issues

### 12.4 End-to-End Testing

- [ ] Create test project with module-chat + module-kb:
  ```bash
  ./scripts/create-cora-project.sh test-chat-01
  ```
- [ ] Deploy infrastructure
- [ ] Test workspace chat creation
- [ ] Test streaming responses
- [ ] Test KB grounding (upload doc, enable KB, see citations)
- [ ] Test sharing and collaboration
- [ ] Test favorites

**Deliverables**:
- Fully integrated module-chat
- Validation passing
- End-to-end testing complete

---

## Phase 13: Documentation (Session 150)

**Duration**: 1 session (~3-4 hours)

### 13.1 Module Documentation

- [ ] Update `templates/_modules-functional/module-chat/README.md`:
  - Overview and features
  - Architecture diagram
  - Setup instructions
  - Configuration options
  - Usage examples

### 13.2 Integration Guide

- [ ] Update `INTEGRATION-GUIDE.md`:
  - Add module-chat section
  - Document workspace chat integration
  - Document KB grounding pattern
  - Document streaming architecture

### 13.3 Developer Guide

- [ ] Create `docs/guides/guide_MODULE-CHAT-DEVELOPMENT.md`:
  - Adding new AI providers
  - Customizing citation display
  - Testing streaming locally
  - Monitoring token usage

### 13.4 Memory Bank Update

- [ ] Update `memory-bank/activeContext.md`:
  - Mark module-chat as complete
  - Document lessons learned
  - Note integration with module-kb

**Deliverables**:
- Complete module documentation
- Updated integration guide
- Developer guide

---

## Success Criteria

### Functional Requirements

- [ ] Users can create workspace-scoped chats
- [ ] Users can send messages with streaming AI responses
- [ ] Users can select which KBs to ground responses
- [ ] KB-grounded responses show citations
- [ ] Users can share chats with workspace members
- [ ] Users can favorite chats for quick access
- [ ] Chat history is searchable and filterable
- [ ] Streaming can be cancelled mid-response

### Technical Requirements

- [ ] All Lambda functions have CORA-compliant route docstrings
- [ ] Database schema follows CORA naming conventions
- [ ] API responses use camelCase
- [ ] RLS policies enforce multi-tenant access control
- [ ] Streaming uses Lambda response streaming or SSE
- [ ] Token usage is tracked per message
- [ ] Citations link back to source documents
- [ ] Terraform uses `source_code_hash` for code change detection

### Validation Requirements

- [ ] API response validator: 0 violations
- [ ] Frontend compliance validator: 0 violations
- [ ] Structure validator: 0 violations
- [ ] All tests passing in test project

---

## Dependencies

### Required Modules
- `module-kb` - RAG context retrieval
- `module-ws` - Workspace context
- `module-ai` - AI provider integration
- `module-access` - Authentication
- `module-mgmt` - Platform management

### Required Infrastructure
- Supabase for chat session and message storage
- API Gateway with streaming support
- Lambda with response streaming
- OpenAI/Anthropic API keys (via module-ai)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Streaming response latency too high | HIGH | Use Lambda in same region as Supabase, optimize RAG retrieval, consider caching |
| Token costs exceed budget | MEDIUM | Implement rate limiting per user/org, add usage alerts, track costs in module-ai |
| RAG context too large for prompt | MEDIUM | Limit top_k chunks, implement intelligent re-ranking, compress context |
| Citation accuracy issues | MEDIUM | Store chunk metadata with source info, test citation generation, add manual override |
| Concurrent chat sessions cause state issues | LOW | Use Zustand with proper state isolation, test multi-tab scenarios |

---

## Open Questions

1. **Streaming Protocol**: Lambda response streaming vs SSE via API Gateway?
   - **Decision**: Lambda response streaming (simpler, native AWS support)

2. **Chat History Length**: How many messages to include in context?
   - **Decision**: Last 10 messages (configurable), with token limit check

3. **Citation Display**: Inline vs side panel?
   - **Decision**: Inline badges + expandable side panel for details

4. **Workspace Sharing**: Should workspace chats be shared with all members by default?
   - **Decision**: No, creator must explicitly enable workspace sharing

---

## Navigation Integration

**Left Navigation for Chats**:
- All users (regular members) get a "Chats" link in left navigation
- Clicking "Chats" navigates to `/chat` (chat list page)
- Individual chats accessible via `/chat/[id]`

**Left Nav Structure (All Users)**:
```
Main Navigation
├── Dashboard
├── Workspaces
├── Chats ← NEW (module-chat) - All users can access
└── Settings
```

**Admin Navigation**:
- Chat does NOT have admin-specific pages (unlike KB which has admin pages)
- Platform/org admins can view chat usage analytics in module-mgmt
- No special left nav entries for admins

**Workspace Context Navigation**:
- Within workspace detail page (`/ws/[id]`), Activities tab shows workspace chats
- "Continue Chat" buttons navigate to `/chat/[id]` (same as left nav)
- No separate workspace-specific chat nav

**Chat List vs Workspace Integration**:
- `/chat` - Shows ALL accessible chats (workspace + user-level)
- `/ws/[id]` Activities tab - Shows ONLY workspace-scoped chats
- Both views use same underlying components (ChatSessionList, ChatSessionCard)

---

## Next Steps After Completion

1. **Module-Workflow Implementation**: Use module-chat for workflow status updates
2. **Advanced Features**: Thread branching, chat search, export
3. **Analytics**: Token usage dashboards, popular KB tracking
4. **Optimization**: Response caching, embedding caching, prompt optimization
5. **V2 Features**: Multi-modal (images), voice input, chat templates

---

**Status**: 🔵 PLANNED  
**Last Updated**: January 12, 2026  
**Next Review**: After module-kb Phase 12 completion
