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
  Link as LinkIcon,
  BookOpen,
} from "lucide-react";
import {
  Menu,
  MenuItem,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
} from "@mui/material";
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
  variant?: "text" | "outlined" | "contained";
  /** Button size */
  size?: "small" | "medium" | "large";
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
  variant = "text",
  size = "medium",
}: ChatOptionsMenuProps) {
  // === State ===
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title);

  const menuOpen = Boolean(anchorEl);

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
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleFavoriteClick = useCallback(async () => {
    handleMenuClose();
    await toggleFavorite(chat.id);
  }, [toggleFavorite, chat.id]);

  const handleCopyLink = useCallback(async () => {
    handleMenuClose();
    await copyLink(chat.id);
  }, [copyLink, chat.id]);

  const handleWorkspaceShareToggle = useCallback(async () => {
    handleMenuClose();
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
    handleMenuClose();
    setNewTitle(chat.title);
    setRenameDialogOpen(true);
  }, [chat.title]);

  const handleOpenDeleteDialog = useCallback(() => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  }, []);

  // === Render ===
  const isLoading = isAnyLoading(chat.id);

  return (
    <>
      <IconButton
        className={className}
        onClick={handleMenuOpen}
        disabled={isLoading}
        aria-label="Chat options"
        size={size}
        color={variant === "contained" ? "primary" : "default"}
      >
        <MoreVertical size={16} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: { minWidth: 200 },
        }}
      >
        {/* Favorite Toggle */}
        <MenuItem
          onClick={handleFavoriteClick}
          disabled={isFavoriteLoading(chat.id)}
        >
          <ListItemIcon>
            {chat.isFavorited ? <StarOff size={16} /> : <Star size={16} />}
          </ListItemIcon>
          <ListItemText>
            {chat.isFavorited ? "Remove Favorite" : "Add to Favorites"}
          </ListItemText>
        </MenuItem>

        {/* Rename */}
        {chat.canEdit && (
          <MenuItem onClick={handleOpenRenameDialog}>
            <ListItemIcon>
              <Edit2 size={16} />
            </ListItemIcon>
            <ListItemText>Rename</ListItemText>
          </MenuItem>
        )}

        {/* Copy Link */}
        <MenuItem onClick={handleCopyLink}>
          <ListItemIcon>
            <LinkIcon size={16} />
          </ListItemIcon>
          <ListItemText>Copy Link</ListItemText>
        </MenuItem>

        {/* Share Options */}
        {showShareOptions && chat.isOwner && (
          <>
            <Divider />

            {/* Workspace Sharing Toggle */}
            {chat.workspaceId && (
              <MenuItem
                onClick={handleWorkspaceShareToggle}
                disabled={isSharingLoading(chat.id)}
              >
                <ListItemIcon>
                  <Users size={16} />
                </ListItemIcon>
                <ListItemText>
                  {chat.isSharedWithWorkspace
                    ? "Stop Sharing with Workspace"
                    : "Share with Workspace"}
                </ListItemText>
              </MenuItem>
            )}

            {/* Share with Users */}
            {onShareClick && (
              <MenuItem onClick={() => {
                handleMenuClose();
                onShareClick(chat.id);
              }}>
                <ListItemIcon>
                  <Share2 size={16} />
                </ListItemIcon>
                <ListItemText>Share with Users...</ListItemText>
              </MenuItem>
            )}
          </>
        )}

        {/* KB Grounding Options */}
        {showKBOptions && chat.canEdit && onKBGroundingClick && (
          <>
            <Divider />
            <MenuItem onClick={() => {
              handleMenuClose();
              onKBGroundingClick(chat.id);
            }}>
              <ListItemIcon>
                <BookOpen size={16} />
              </ListItemIcon>
              <ListItemText>Manage Knowledge Bases...</ListItemText>
            </MenuItem>
          </>
        )}

        {/* Delete */}
        {chat.canDelete && (
          <>
            <Divider />
            <MenuItem
              onClick={handleOpenDeleteDialog}
              disabled={isDeleteLoading(chat.id)}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <Trash2 size={16} color="inherit" />
              </ListItemIcon>
              <ListItemText>Delete Chat</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Rename Dialog */}
      <Dialog 
        open={renameDialogOpen} 
        onClose={() => setRenameDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Rename Chat</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter a new name for this chat session.
          </Typography>
          <TextField
            autoFocus
            label="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Chat title"
            fullWidth
            variant="outlined"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRenameSubmit();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRenameDialogOpen(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRenameSubmit}
            disabled={isRenameLoading(chat.id) || !newTitle.trim()}
            variant="contained"
          >
            {isRenameLoading(chat.id) ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Chat</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete &quot;{chat.title}&quot;? This
            action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            disabled={isDeleteLoading(chat.id)}
            variant="contained"
            color="error"
          >
            {isDeleteLoading(chat.id) ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ChatOptionsMenu;
