/**
 * Module Chat - Chat Detail Page
 *
 * Full chat interface with message display, input, and streaming responses.
 * Supports KB grounding, sharing, and message history.
 */

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  MessageSquare,
  ChevronLeft,
  BookOpen,
  Share2,
  Loader2,
} from "lucide-react";
import {
  Box,
  IconButton,
  Button,
  Chip,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useSession } from "next-auth/react";
import { useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import { ChatMessage } from "../components/ChatMessage";
import { ChatInput } from "../components/ChatInput";
import { ChatOptionsMenu } from "../components/ChatOptionsMenu";
import { ShareChatDialog } from "../components/ShareChatDialog";
import { KBGroundingSelector } from "../components/KBGroundingSelector";
import { useChatSession } from "../hooks/useChatSession";
import { useStreaming } from "../hooks/useStreaming";
import type { ChatSession, ChatMessage as ChatMessageType, KBInfo } from "../types";

// =============================================================================
// PROPS TYPES
// =============================================================================

export interface ChatDetailPageProps {
  /** Chat session ID */
  sessionId: string;
  /** Workspace ID (optional - for context) */
  workspaceId?: string;
  /** Organization ID (optional - falls back to context) */
  orgId?: string;
  /** Current user ID */
  userId?: string;
  /** Callback when navigating back */
  onBack?: () => void;
  /** Callback when session is deleted */
  onDeleted?: () => void;
  /** Whether to show back button */
  showBackButton?: boolean;
  /** Optional class name */
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Chat detail page with message history and streaming
 *
 * Features:
 * - Message display with streaming support
 * - Chat input with KB grounding indicators
 * - Share dialog integration
 * - KB grounding selector
 * - Session options (rename, delete, etc.)
 *
 * @example
 * ```tsx
 * <ChatDetailPage
 *   sessionId={sessionId}
 *   workspaceId={workspace?.id}
 *   onBack={() => router.push("/chat")}
 *   onDeleted={() => router.push("/chat")}
 *   showBackButton={true}
 * />
 * ```
 */
export function ChatDetailPage({
  sessionId,
  workspaceId,
  orgId: providedOrgId,
  userId,
  onBack,
  onDeleted,
  showBackButton = true,
  className,
}: ChatDetailPageProps) {
  // === Context ===
  const { data: authSession } = useSession();
  const { currentOrganization } = useOrganizationContext();
  const orgId = providedOrgId || currentOrganization?.orgId || "";
  const currentUserId = userId || (authSession?.user as { id?: string })?.id || "";

  // === Refs ===
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // === State ===
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [kbDialogOpen, setKbDialogOpen] = useState(false);

  // === Hooks ===
  const {
    session,
    messages,
    groundedKbs,
    messagesLoading,
    isOwner,
    canEdit,
    sendMessage,
    reloadMessages,
    loadMoreMessages,
    hasMoreMessages,
  } = useChatSession({
    sessionId,
    autoLoad: true,
    loadMessages: true,
    loadKBs: true,
  });

  const {
    isStreaming,
    content: streamingContent,
    citations: streamingCitations,
    cancel: cancelStreaming,
    canCancel,
  } = useStreaming();

  // === Effects ===

  // Auto-scroll to bottom when messages change or streaming
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, streamingContent]);

  // === Handlers ===

  const handleSendMessage = useCallback(
    async (content: string) => {
      try {
        await sendMessage(content);
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    },
    [sendMessage]
  );

  const handleError = useCallback((message: string) => {
    console.error("Chat error:", message);
  }, []);

  const handleSuccess = useCallback((action: string) => {
    console.log(`Chat action succeeded: ${action}`);
    if (action === "delete") {
      onDeleted?.();
    }
  }, [onDeleted]);

  const handleLoadMore = useCallback(() => {
    if (!messagesLoading && hasMoreMessages) {
      loadMoreMessages();
    }
  }, [messagesLoading, hasMoreMessages, loadMoreMessages]);

  // Handle scroll for infinite loading
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      // Load more when scrolled near top (for older messages)
      if (target.scrollTop < 100) {
        handleLoadMore();
      }
    },
    [handleLoadMore]
  );

  // === Computed ===
  // Convert groundedKbs to KBInfo array for ChatInput
  const groundedKbsInfo: KBInfo[] = groundedKbs.map((kb) => ({
    id: kb.kbId,
    name: kb.kbName || "Unknown",
    description: kb.kbDescription,
    scope: "workspace" as const, // Default scope for display
  }));

  // === Render ===

  if (messagesLoading && !session) {
    return (
      <Box className={className} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!session) {
    return (
      <Box className={className} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
        <MessageSquare size={48} style={{ opacity: 0.5 }} color="text.secondary" />
        <Typography variant="body2" color="text.secondary">Chat session not found</Typography>
        {showBackButton && onBack && (
          <Button variant="outlined" onClick={onBack}>
            Go Back
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box className={className} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          {showBackButton && onBack && (
            <IconButton onClick={onBack} sx={{ flexShrink: 0 }}>
              <ChevronLeft size={20} />
            </IconButton>
          )}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {session.isSharedWithWorkspace && (
                <Chip label="Workspace" size="small" variant="outlined" />
              )}
              {groundedKbs.length > 0 && (
                <Chip 
                  icon={<BookOpen size={12} />}
                  label={`${groundedKbs.length} KB${groundedKbs.length > 1 ? "s" : ""}`}
                  size="small"
                  variant="outlined"
                />
              )}
              {session.metadata.messageCount !== undefined && (
                <Typography variant="caption" color="text.secondary">
                  {session.metadata.messageCount} messages
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <IconButton
            onClick={() => setKbDialogOpen(true)}
            title="Knowledge Base Grounding"
          >
            <BookOpen size={16} />
          </IconButton>
          <IconButton
            onClick={() => setShareDialogOpen(true)}
            title="Share Chat"
          >
            <Share2 size={16} />
          </IconButton>
          <ChatOptionsMenu
            chat={session}
            onShareClick={() => setShareDialogOpen(true)}
            onKBGroundingClick={() => setKbDialogOpen(true)}
            onError={handleError}
            onSuccess={handleSuccess}
          />
        </Box>
      </Box>

      {/* Messages */}
      <Box
        ref={scrollAreaRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          overflow: 'auto',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', p: 2, gap: 2 }}>
          {/* Load More Button */}
          {hasMoreMessages && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="text"
                size="small"
                onClick={handleLoadMore}
                disabled={messagesLoading}
                startIcon={messagesLoading ? <CircularProgress size={16} /> : null}
              >
                Load Earlier Messages
              </Button>
            </Box>
          )}

          {/* Message List */}
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
            />
          ))}

          {/* Streaming Message */}
          {isStreaming && streamingContent && (
            <ChatMessage
              message={{
                id: "streaming",
                sessionId: sessionId,
                role: "assistant",
                content: streamingContent,
                metadata: {
                  citations: streamingCitations,
                },
                wasTruncated: false,
                createdAt: new Date().toISOString(),
              }}
              isStreaming={true}
            />
          )}

          {/* Empty State */}
          {messages.length === 0 && !isStreaming && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, color: 'text.secondary' }}>
              <MessageSquare size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <Typography variant="body2">No messages yet. Start the conversation!</Typography>
              {groundedKbs.length > 0 && (
                <Typography variant="caption" sx={{ mt: 1 }}>
                  This chat is grounded in {groundedKbs.length} knowledge base
                  {groundedKbs.length > 1 ? "s" : ""}.
                </Typography>
              )}
            </Box>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </Box>
      </Box>

      {/* Input */}
      <Box sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', p: 2 }}>
        <ChatInput
          onSend={handleSendMessage}
          onCancel={canCancel ? cancelStreaming : undefined}
          isStreaming={isStreaming}
          groundedKbs={groundedKbsInfo}
          disabled={!canEdit}
          placeholder={
            canEdit
              ? groundedKbs.length > 0
                ? `Ask about ${groundedKbsInfo.slice(0, 2).map(kb => kb.name).join(", ")}...`
                : "Type a message..."
              : "You don't have permission to send messages"
          }
          onManageKBs={() => setKbDialogOpen(true)}
        />
      </Box>

      {/* Share Dialog */}
      <ShareChatDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        chatId={session.id}
        chatTitle={session.title}
        isSharedWithWorkspace={session.isSharedWithWorkspace}
        onError={handleError}
        onSuccess={() => handleSuccess("share")}
      />

      {/* KB Grounding Dialog */}
      <KBGroundingSelector
        open={kbDialogOpen}
        onOpenChange={setKbDialogOpen}
        chatId={session.id}
        onError={handleError}
        onSuccess={() => handleSuccess("kb_grounding")}
      />
    </Box>
  );
}

export default ChatDetailPage;
