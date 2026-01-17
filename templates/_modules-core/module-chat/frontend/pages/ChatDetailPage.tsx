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
  MoreVertical,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
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
      <div className={cn("flex items-center justify-center h-full", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full gap-4", className)}>
        <MessageSquare className="h-12 w-12 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Chat session not found</p>
        {showBackButton && onBack && (
          <Button variant="outline" onClick={onBack}>
            Go Back
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-3 min-w-0">
          {showBackButton && onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="flex-shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold truncate">{session.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {session.isSharedWithWorkspace && (
                <Badge variant="secondary" className="text-xs">
                  Workspace
                </Badge>
              )}
              {groundedKbs.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <BookOpen className="h-3 w-3" />
                  {groundedKbs.length} KB{groundedKbs.length > 1 ? "s" : ""}
                </Badge>
              )}
              {session.metadata.messageCount !== undefined && (
                <span>{session.metadata.messageCount} messages</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setKbDialogOpen(true)}
            title="Knowledge Base Grounding"
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShareDialogOpen(true)}
            title="Share Chat"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <ChatOptionsMenu
            chat={session}
            onShareClick={() => setShareDialogOpen(true)}
            onKBGroundingClick={() => setKbDialogOpen(true)}
            onError={handleError}
            onSuccess={handleSuccess}
          />
        </div>
      </div>

      {/* Messages */}
      <ScrollArea
        className="flex-1"
        ref={scrollAreaRef}
        onScrollCapture={handleScroll}
      >
        <div className="flex flex-col p-4 gap-4">
          {/* Load More Button */}
          {hasMoreMessages && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                disabled={messagesLoading}
              >
                {messagesLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Load Earlier Messages
              </Button>
            </div>
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
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">No messages yet. Start the conversation!</p>
              {groundedKbs.length > 0 && (
                <p className="text-xs mt-2">
                  This chat is grounded in {groundedKbs.length} knowledge base
                  {groundedKbs.length > 1 ? "s" : ""}.
                </p>
              )}
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-background p-4">
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
      </div>

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
    </div>
  );
}

export default ChatDetailPage;
