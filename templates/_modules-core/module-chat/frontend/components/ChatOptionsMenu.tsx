/**
 * Module Chat - Chat Options Menu Component
 *
 * 3-dots menu for chat actions (favorite, rename, delete, share, etc.)
 * Mirrors the ChatOptionsMenu pattern from pm-app-stack.
 */

"use client";

import React, { useState, useCallback } from "react";
import {
  MoreVertical,
  Star,
  StarOff,
  Edit2,
  Trash2,
  Share2,
  Users,
  Link,
  BookOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChatActions } from "../hooks/useChatActions";
import type { ChatSession } from "../types";

// =============================================================================
// PROPS TYPES
// =============================================================================

export interface ChatOptionsMenuProps {
  /** Chat session */
  chat: ChatSession;
  /** Callback when error occurs */
  onError?: (message: string) => void;
  /** Callback when action succeeds */
  onSuccess?: (action: string, chatId: string) => void;
  /** Callback to open share dialog (handled by parent) */
  onShareClick?: (chatId: string) => void;
  /** Callback to open KB grounding dialog (handled by parent) */
  onKBGroundingClick?: (chatId: string) => void;
  /** Whether to show share options */
  showShareOptions?: boolean;
  /** Whether to show KB grounding options */
  showKBOptions?: boolean;
  /** Optional class name */
  className?: string;
  /** Button variant */
  variant?: "ghost" | "outline" | "default";
  /** Button size */
  size?: "sm" | "default" | "lg" | "icon";
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * 3-dots options menu for chat sessions
 *
 * Provides actions:
 * - Toggle favorite
 * - Rename chat
 * - Copy link
 * - Toggle workspace sharing
 * - Share with users (via callback)
 * - Manage KB grounding (via callback)
 * - Delete chat
 *
 * @example
 * ```tsx
 * <ChatOptionsMenu
 *   chat={session}
 *   onError={(msg) => toast.error(msg)}
 *   onSuccess={(action) => toast.success(`${action} completed`)}
 *   onShareClick={(id) => setShareDialogOpen(true)}
 *   onKBGroundingClick={(id) => setKBDialogOpen(true)}
 * />
 * ```
 */
export function ChatOptionsMenu({
  chat,
  onError,
  onSuccess,
  onShareClick,
  onKBGroundingClick,
  showShareOptions = true,
  showKBOptions = true,
  className,
  variant = "ghost",
  size = "icon",
}: ChatOptionsMenuProps) {
  // === State ===
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title);

  // === Hook ===
  const {
    toggleFavorite,
    rename,
    deleteChat,
    toggleWorkspaceSharing,
    copyLink,
    isFavoriteLoading,
    isRenameLoading,
    isDeleteLoading,
    isSharingLoading,
    isAnyLoading,
  } = useChatActions({
    onError,
    onSuccess,
  });

  // === Handlers ===
  const handleFavoriteClick = useCallback(async () => {
    await toggleFavorite(chat.id);
  }, [toggleFavorite, chat.id]);

  const handleCopyLink = useCallback(async () => {
    await copyLink(chat.id);
  }, [copyLink, chat.id]);

  const handleWorkspaceShareToggle = useCallback(async () => {
    await toggleWorkspaceSharing(chat.id);
  }, [toggleWorkspaceSharing, chat.id]);

  const handleRenameSubmit = useCallback(async () => {
    try {
      await rename(chat.id, newTitle);
      setRenameDialogOpen(false);
    } catch {
      // Error handled by hook
    }
  }, [rename, chat.id, newTitle]);

  const handleDeleteConfirm = useCallback(async () => {
    try {
      await deleteChat(chat.id);
      setDeleteDialogOpen(false);
    } catch {
      // Error handled by hook
    }
  }, [deleteChat, chat.id]);

  const handleOpenRenameDialog = useCallback(() => {
    setNewTitle(chat.title);
    setRenameDialogOpen(true);
  }, [chat.title]);

  // === Render ===
  const isLoading = isAnyLoading(chat.id);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={className}
            disabled={isLoading}
            aria-label="Chat options"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Favorite Toggle */}
          <DropdownMenuItem
            onClick={handleFavoriteClick}
            disabled={isFavoriteLoading(chat.id)}
          >
            {chat.isFavorited ? (
              <>
                <StarOff className="mr-2 h-4 w-4" />
                Remove Favorite
              </>
            ) : (
              <>
                <Star className="mr-2 h-4 w-4" />
                Add to Favorites
              </>
            )}
          </DropdownMenuItem>

          {/* Rename */}
          {chat.canEdit && (
            <DropdownMenuItem onClick={handleOpenRenameDialog}>
              <Edit2 className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
          )}

          {/* Copy Link */}
          <DropdownMenuItem onClick={handleCopyLink}>
            <Link className="mr-2 h-4 w-4" />
            Copy Link
          </DropdownMenuItem>

          {/* Share Options */}
          {showShareOptions && chat.isOwner && (
            <>
              <DropdownMenuSeparator />

              {/* Workspace Sharing Toggle */}
              {chat.workspaceId && (
                <DropdownMenuItem
                  onClick={handleWorkspaceShareToggle}
                  disabled={isSharingLoading(chat.id)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {chat.isSharedWithWorkspace
                    ? "Stop Sharing with Workspace"
                    : "Share with Workspace"}
                </DropdownMenuItem>
              )}

              {/* Share with Users */}
              {onShareClick && (
                <DropdownMenuItem onClick={() => onShareClick(chat.id)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share with Users...
                </DropdownMenuItem>
              )}
            </>
          )}

          {/* KB Grounding Options */}
          {showKBOptions && chat.canEdit && onKBGroundingClick && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onKBGroundingClick(chat.id)}>
                <BookOpen className="mr-2 h-4 w-4" />
                Manage Knowledge Bases...
              </DropdownMenuItem>
            </>
          )}

          {/* Delete */}
          {chat.canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
                disabled={isDeleteLoading(chat.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Chat
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new name for this chat session.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="chat-title">Title</Label>
              <Input
                id="chat-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Chat title"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameSubmit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={isRenameLoading(chat.id) || !newTitle.trim()}
            >
              {isRenameLoading(chat.id) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{chat.title}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleteLoading(chat.id)}
            >
              {isDeleteLoading(chat.id) ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ChatOptionsMenu;
