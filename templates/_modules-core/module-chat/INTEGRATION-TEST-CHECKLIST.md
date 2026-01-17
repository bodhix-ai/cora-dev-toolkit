# Module-Chat Integration Test Checklist

This checklist covers end-to-end testing for module-chat integration with other CORA modules.

## Prerequisites

Before testing, ensure:
- [ ] Database migrations applied (all 7 schema files)
- [ ] Lambda functions deployed (chat-session, chat-message, chat-stream)
- [ ] API Gateway routes configured (24 routes)
- [ ] Frontend routes added to Next.js app
- [ ] module-kb is deployed and has at least one KB with documents
- [ ] module-ai is configured with at least one AI provider
- [ ] Test user has access to a workspace

---

## 1. Session Management Tests

### 1.1 Create Workspace Chat
- [ ] Navigate to `/chat`
- [ ] Click "New Chat" button
- [ ] Select a workspace (if prompted)
- [ ] Verify chat session is created
- [ ] Verify session appears in chat list
- [ ] Verify title defaults to "New Chat"

### 1.2 Create User-Level Chat
- [ ] Create chat without workspace context
- [ ] Verify session is user-level (no workspaceId)
- [ ] Verify session is accessible via `/chat`

### 1.3 Update Chat Title
- [ ] Open ChatOptionsMenu (3-dots)
- [ ] Click "Rename"
- [ ] Enter new title
- [ ] Verify title updates in UI
- [ ] Verify title persists after page refresh

### 1.4 Delete Chat
- [ ] Open ChatOptionsMenu (3-dots)
- [ ] Click "Delete"
- [ ] Confirm deletion
- [ ] Verify chat removed from list
- [ ] Verify navigation returns to `/chat`

### 1.5 List Chats with Filters
- [ ] Search by title
- [ ] Filter by favorites only
- [ ] Sort by date (newest/oldest)
- [ ] Verify pagination works with many chats

---

## 2. Messaging Tests

### 2.1 Send Message (No KB Grounding)
- [ ] Open a chat session
- [ ] Type a message in ChatInput
- [ ] Press Enter or click Send
- [ ] Verify user message appears
- [ ] Verify streaming response starts
- [ ] Verify assistant message completes
- [ ] Verify no citations shown (no KB)

### 2.2 Send Message (With KB Grounding)
- [ ] Open KBGroundingSelector
- [ ] Select at least one KB
- [ ] Send a message related to KB content
- [ ] Verify RAG context is retrieved
- [ ] Verify assistant response includes citations
- [ ] Verify citations are clickable/expandable

### 2.3 Conversation History Context
- [ ] Send multiple messages in sequence
- [ ] Verify follow-up questions use conversation context
- [ ] Verify "it", "that", "the document" references work
- [ ] Verify history is limited to last 10 messages

### 2.4 Cancel Streaming
- [ ] Send a message
- [ ] While streaming, click Cancel button
- [ ] Verify stream stops
- [ ] Verify partial content is preserved
- [ ] Verify can send new messages after cancel

### 2.5 Message Pagination
- [ ] Create chat with many messages (20+)
- [ ] Scroll up in message history
- [ ] Verify older messages load (infinite scroll)
- [ ] Verify no duplicate messages

---

## 3. KB Grounding Tests

### 3.1 List Available KBs
- [ ] Open KBGroundingSelector
- [ ] Verify workspace KBs are shown
- [ ] Verify org-enabled KBs are shown
- [ ] Verify system/global KBs are shown
- [ ] Verify KBs are grouped by scope

### 3.2 Add KB Grounding
- [ ] Toggle a KB to enabled
- [ ] Verify KB appears in grounded list
- [ ] Verify KB badge shows in ChatInput area
- [ ] Verify subsequent messages use this KB

### 3.3 Remove KB Grounding
- [ ] Toggle a grounded KB to disabled
- [ ] Verify KB removed from grounded list
- [ ] Verify badge removed from ChatInput
- [ ] Verify subsequent messages don't use this KB

### 3.4 Multiple KB Grounding
- [ ] Ground chat to 2+ KBs
- [ ] Send a message
- [ ] Verify citations can come from multiple KBs
- [ ] Verify citation shows which KB each came from

---

## 4. Sharing Tests

### 4.1 Share with User
- [ ] Open ShareChatDialog
- [ ] Enter colleague's email
- [ ] Select permission level (view/edit)
- [ ] Click Share
- [ ] Verify share appears in list
- [ ] Log in as shared user
- [ ] Verify chat is accessible

### 4.2 Update Share Permission
- [ ] Change share from "view" to "edit"
- [ ] Verify permission updates
- [ ] As shared user, verify can now send messages

### 4.3 Remove Share
- [ ] Click remove on a share
- [ ] Confirm removal
- [ ] Verify share removed from list
- [ ] As previously shared user, verify access denied

### 4.4 Workspace Sharing
- [ ] Open ChatOptionsMenu
- [ ] Toggle "Share with Workspace"
- [ ] Verify setting updates
- [ ] As workspace member, verify chat is accessible
- [ ] As non-workspace member, verify access denied

---

## 5. Favorites Tests

### 5.1 Toggle Favorite
- [ ] Click favorite star on a chat
- [ ] Verify star fills/highlights
- [ ] Verify chat appears with filter "Favorites only"
- [ ] Click star again to unfavorite
- [ ] Verify star unfills
- [ ] Verify chat removed from favorites filter

### 5.2 Favorite Persistence
- [ ] Favorite a chat
- [ ] Refresh page
- [ ] Verify favorite status persists

---

## 6. Integration Tests

### 6.1 module-access Integration
- [ ] Unauthenticated user cannot access `/chat`
- [ ] Authenticated user sees only their accessible chats
- [ ] User can only delete chats they own
- [ ] JWT token properly passed to all API calls

### 6.2 module-kb Integration
- [ ] KB selector shows KBs from module-kb
- [ ] RAG context retrieval uses pgvector search
- [ ] Citations include document name from module-kb
- [ ] Citation click navigates to document (if implemented)

### 6.3 module-ws Integration
- [ ] Workspace-scoped chats use workspace context
- [ ] Workspace members can access shared chats
- [ ] Non-members cannot access workspace chats
- [ ] Activities tab shows workspace chats (if implemented)

### 6.4 module-ai Integration
- [ ] AI provider settings retrieved from module-ai
- [ ] Correct model used based on org configuration
- [ ] Token usage tracked per message
- [ ] Provider-specific streaming works (OpenAI/Anthropic/Bedrock)

---

## 7. Error Handling Tests

### 7.1 Network Errors
- [ ] Disconnect network during streaming
- [ ] Verify error message shown
- [ ] Verify can retry after reconnection

### 7.2 Rate Limiting
- [ ] Send many messages rapidly
- [ ] Verify rate limit error handled gracefully
- [ ] Verify can continue after waiting

### 7.3 Token Limit
- [ ] Send very long message or have very long context
- [ ] Verify `wasTruncated` flag is set if applicable
- [ ] Verify truncation warning shown in UI

### 7.4 Invalid KB
- [ ] Ground to a KB, then have admin disable/delete it
- [ ] Send a message
- [ ] Verify graceful handling (skip unavailable KB)

### 7.5 Permission Denied
- [ ] Try to access chat without permission
- [ ] Verify 403 error handled
- [ ] Verify user-friendly error message

---

## 8. UI/UX Tests

### 8.1 Responsive Design
- [ ] Test on desktop (1920px)
- [ ] Test on tablet (768px)
- [ ] Test on mobile (375px)
- [ ] Verify all components are usable

### 8.2 Loading States
- [ ] Verify loading spinner during chat list load
- [ ] Verify loading state during message send
- [ ] Verify streaming animation during response

### 8.3 Empty States
- [ ] Verify empty state when no chats exist
- [ ] Verify empty state when no messages in chat
- [ ] Verify helpful actions in empty states

### 8.4 Accessibility
- [ ] Verify keyboard navigation works
- [ ] Verify screen reader announces messages
- [ ] Verify focus management during dialogs
- [ ] Verify color contrast meets WCAG

---

## 9. Performance Tests

### 9.1 Chat List Performance
- [ ] Load chat list with 100+ chats
- [ ] Verify reasonable load time (<2s)
- [ ] Verify scrolling is smooth

### 9.2 Message History Performance
- [ ] Load chat with 500+ messages
- [ ] Verify pagination loads incrementally
- [ ] Verify smooth scrolling

### 9.3 Streaming Performance
- [ ] Verify tokens appear in real-time
- [ ] Verify no UI blocking during stream
- [ ] Verify stream content is not choppy

---

## 10. Validation Tests

Run CORA validators to ensure compliance:

### 10.1 API Response Validator
```bash
cd validation
python cora-validate.py api-response --module module-chat
```
- [ ] 0 violations reported

### 10.2 Frontend Compliance Validator
```bash
cd validation
python cora-validate.py frontend-compliance --module module-chat
```
- [ ] 0 violations reported

### 10.3 Structure Validator
```bash
cd validation
python cora-validate.py structure --module module-chat
```
- [ ] 0 violations reported

---

## Test Results Summary

| Category | Total | Passed | Failed | Notes |
|----------|-------|--------|--------|-------|
| Session Management | 5 | | | |
| Messaging | 5 | | | |
| KB Grounding | 4 | | | |
| Sharing | 4 | | | |
| Favorites | 2 | | | |
| Integration | 4 | | | |
| Error Handling | 5 | | | |
| UI/UX | 4 | | | |
| Performance | 3 | | | |
| Validation | 3 | | | |
| **TOTAL** | **39** | | | |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Tech Lead | | | |

---

**Last Updated**: January 2026
