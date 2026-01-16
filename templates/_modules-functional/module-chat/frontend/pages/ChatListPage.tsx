/**
 * Module Chat - Chat List Page
 *
 * Main page for displaying and managing chat sessions.
 * Shows chat sessions with filtering, search, and workspace/user-level support.
 */

"use client";

import React, { useState, useCallback } from "react";
import {
  MessageSquare,
  Plus,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import { ChatSessionList } from "../components/ChatSessionList";
import { ShareChatDialog } from "../components/ShareChatDialog";
import { KBGroundingSelector } from "../components/KBGroundingSelector";
import { useChat } from "../hooks/useChat";
import type { ChatSession, CreateSessionInput } from "../types";

// =============================================================================
// PROPS TYPES
// =============================================================================

export interface ChatListPageProps {
  /** Workspace ID to show chats for (optional - shows user-level if omitted) */
  workspaceId?: string;
  /** Organization ID (optional - falls back to context) */
  orgId?: string;
  /** Callback when a chat is selected */
  onChatSelect?: (session: ChatSession) => void;
  /** Callback when navigating back */
  onBack?: () => void;
  /** Whether to show back button */
  showBackButton?: boolean;
  /** Page title override */
  title?: string;
  /** Page description override */
  description?: string;
  /** Optional class name */
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Chat list page with session management
 *
 * Features:
 * - List all accessible chat sessions
 * - Filter by workspace or show all user chats
 * - Search and favorites filter
 * - Create new chats
 * - Share dialog integration
 * - KB grounding dialog integration
 *
 * @example
 * ```tsx
 * // Workspace-level chats
 * <ChatListPage
 *   workspaceId={workspace.id}
 *   onChatSelect={(chat) => router.push(`/chat/${chat.id}`)}
 * />
 *
 * // User-level chats (all chats)
 * <ChatListPage
 *   onChatSelect={(chat) => router.push(`/chat/${chat.id}`)}
 * />
 * ```
 */
export function ChatListPage({
  workspaceId,
  orgId: providedOrgId,
  onChatSelect,
  onBack,
  showBackButton = false,
  title,
  description,
  className,
}: ChatListPageProps) {
  // === Context ===
  const { data: session } = useSession();
  const { currentOrganization } = useOrganizationContext();
  const orgId = providedOrgId || currentOrganization?.orgId || "";

  // === State ===
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDialogChat, setShareDialogChat] = useState<ChatSession | null>(null);
  const [kbDialogOpen, setKbDialogOpen] = useState(false);
  const [kbDialogChatId, setKbDialogChatId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Track sessions for dialog lookups
  const [sessionsMap, setSessionsMap] = useState<Map<string, ChatSession>>(new Map());

  // === Hook ===
  const {
    createSession,
    selectSession,
    isLoading,
  } = useChat({
    workspaceId,
    autoLoad: false, // ChatSessionList handles loading
  });

  // === Handlers ===
  const handleNewChat = useCallback(async () => {
    setIsCreating(true);
    try {
      const input: CreateSessionInput = {
        title: "New Chat",
        workspaceId: workspaceId,
      };
      const newSession = await createSession(input);
      if (newSession) {
        selectSession(newSession.id);
        onChatSelect?.(newSession);
      }
    } catch (error) {
      console.error("Failed to create chat:", error);
    } finally {
      setIsCreating(false);
    }
  }, [createSession, selectSession, workspaceId, onChatSelect]);

  const handleSelectSession = useCallback(
    (session: ChatSession) => {
      selectSession(session.id);
      onChatSelect?.(session);
    },
    [selectSession, onChatSelect]
  );

  const handleShareClick = useCallback((chatId: string) => {
    const chat = sessionsMap.get(chatId);
    if (chat) {
      setShareDialogChat(chat);
      setShareDialogOpen(true);
    }
  }, [sessionsMap]);

  const handleKBGroundingClick = useCallback((chatId: string) => {
    setKbDialogChatId(chatId);
    setKbDialogOpen(true);
  }, []);

  const handleError = useCallback((message: string) => {
    // In a real app, this would show a toast notification
    console.error("Chat error:", message);
  }, []);

  const handleSuccess = useCallback((action: string, chatId: string) => {
    // In a real app, this would show a toast notification
    console.log(`Chat action succeeded: ${action} for ${chatId}`);
  }, []);

  // === Computed ===
  const pageTitle = title || (workspaceId ? "Workspace Chats" : "My Chats");
  const pageDescription =
    description ||
    (workspaceId
      ? "Chat sessions in this workspace"
      : "All your chat sessions across workspaces");

  // === Render ===
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-3">
          {showBackButton && onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="mr-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">{pageTitle}</h1>
              <p className="text-sm text-muted-foreground">{pageDescription}</p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleNewChat}
          disabled={isCreating}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Chat Session List */}
      <div className="flex-1 overflow-hidden">
        <ChatSessionList
          workspaceId={workspaceId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onShareClick={handleShareClick}
          onKBGroundingClick={handleKBGroundingClick}
          onError={handleError}
          onSuccess={handleSuccess}
          showNewChatButton={false} // We have one in the header
          showFilters={true}
          height="100%"
        />
      </div>

      {/* Share Dialog */}
      {shareDialogChat && (
        <ShareChatDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          chatId={shareDialogChat.id}
          chatTitle={shareDialogChat.title}
          isSharedWithWorkspace={shareDialogChat.isSharedWithWorkspace}
          onError={handleError}
          onSuccess={() => handleSuccess("share", shareDialogChat.id)}
        />
      )}

      {/* KB Grounding Dialog */}
      {kbDialogChatId && (
        <KBGroundingSelector
          open={kbDialogOpen}
          onOpenChange={setKbDialogOpen}
          chatId={kbDialogChatId}
          onError={handleError}
          onSuccess={() => handleSuccess("kb_grounding", kbDialogChatId)}
        />
      )}
    </div>
  );
}

export default ChatListPage;
