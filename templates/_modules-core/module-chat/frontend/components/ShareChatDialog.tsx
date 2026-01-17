/**
 * Module Chat - Share Chat Dialog Component
 *
 * Dialog for sharing a chat with specific users (colleagues).
 * Provides email input and permission level selection.
 */

"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Share2,
  UserPlus,
  Mail,
  Trash2,
  Edit3,
  Eye,
  Loader2,
  Users,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Alert,
  AlertTitle,
  Divider,
  CircularProgress,
  IconButton,
  Avatar,
} from "@mui/material";
import { useChatSharing } from "../hooks/useChatSharing";
import type { ChatShare, PermissionLevel } from "../types";

// =============================================================================
// PROPS TYPES
// =============================================================================

export interface ShareChatDialogProps {
  /** Chat session ID */
  chatId: string;
  /** Chat title (for display) */
  chatTitle: string;
  /** Whether workspace sharing is enabled */
  isSharedWithWorkspace?: boolean;
  /** Callback to toggle workspace sharing */
  onToggleWorkspaceSharing?: () => void;
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog closes */
  onOpenChange: (open: boolean) => void;
  /** Callback when error occurs */
  onError?: (message: string) => void;
  /** Callback when successfully shared */
  onSuccess?: () => void;
}

// =============================================================================
// SHARE ITEM COMPONENT
// =============================================================================

interface ShareItemProps {
  share: ChatShare;
  onRemove: () => void;
  onUpdatePermission: (permission: PermissionLevel) => void;
  isLoading: boolean;
}

function ShareItem({
  share,
  onRemove,
  onUpdatePermission,
  isLoading,
}: ShareItemProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        opacity: isLoading ? 0.5 : 1,
        pointerEvents: isLoading ? 'none' : 'auto',
      }}
    >
      {/* Avatar/Icon */}
      <Avatar sx={{ width: 32, height: 32, bgcolor: 'action.hover' }}>
        <Mail size={16} />
      </Avatar>

      {/* User Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight="medium"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {share.sharedWithName || share.sharedWithEmail || "Unknown user"}
        </Typography>
        {share.sharedWithName && share.sharedWithEmail && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {share.sharedWithEmail}
          </Typography>
        )}
      </Box>

      {/* Permission Select */}
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <Select
          value={share.permissionLevel}
          onChange={(e) => onUpdatePermission(e.target.value as PermissionLevel)}
          disabled={isLoading}
          sx={{ height: 32 }}
          inputProps={{ "aria-label": "Permission level" }}
        >
          <MenuItem value="view">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Eye size={12} />
              View
            </Box>
          </MenuItem>
          <MenuItem value="edit">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Edit3 size={12} />
              Edit
            </Box>
          </MenuItem>
        </Select>
      </FormControl>

      {/* Remove Button */}
      <IconButton
        size="small"
        onClick={onRemove}
        disabled={isLoading}
        sx={{
          color: 'text.secondary',
          '&:hover': {
            color: 'error.main',
          },
        }}
        aria-label={`Remove access for ${share.sharedWithEmail}`}
      >
        {isLoading ? (
          <CircularProgress size={16} />
        ) : (
          <Trash2 size={16} />
        )}
      </IconButton>
    </Box>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Dialog for sharing a chat with specific users
 *
 * Features:
 * - Email input with permission level
 * - List of current shares
 * - Update/remove existing shares
 * - Workspace sharing toggle
 *
 * @example
 * ```tsx
 * <ShareChatDialog
 *   chatId={currentSession.id}
 *   chatTitle={currentSession.title}
 *   isSharedWithWorkspace={currentSession.isSharedWithWorkspace}
 *   onToggleWorkspaceSharing={() => toggleWorkspaceSharing(currentSession.id)}
 *   open={shareDialogOpen}
 *   onOpenChange={setShareDialogOpen}
 *   onError={(msg) => toast.error(msg)}
 *   onSuccess={() => toast.success("Sharing updated")}
 * />
 * ```
 */
export function ShareChatDialog({
  chatId,
  chatTitle,
  isSharedWithWorkspace = false,
  onToggleWorkspaceSharing,
  open,
  onOpenChange,
  onError,
  onSuccess,
}: ShareChatDialogProps) {
  // === State ===
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<PermissionLevel>("view");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingShares, setLoadingShares] = useState<Set<string>>(new Set());

  // === Hook ===
  const {
    shares,
    isLoading,
    share,
    updatePermission,
    remove,
    reload,
  } = useChatSharing({
    sessionId: chatId,
    autoLoad: true,
  });

  // Reload when dialog opens
  useEffect(() => {
    if (open) {
      reload();
    }
  }, [open, reload]);

  // === Handlers ===

  const handleShare = useCallback(async () => {
    if (!email.trim()) {
      onError?.("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      onError?.("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      await share(email.trim(), permission);
      setEmail("");
      setPermission("view");
      onSuccess?.();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Failed to share");
    } finally {
      setIsSubmitting(false);
    }
  }, [email, permission, share, onError, onSuccess]);

  const handleUpdatePermission = useCallback(
    async (shareId: string, newPermission: PermissionLevel) => {
      setLoadingShares((prev: Set<string>) => new Set(prev).add(shareId));
      try {
        await updatePermission(shareId, newPermission);
        onSuccess?.();
      } catch (error) {
        onError?.(
          error instanceof Error ? error.message : "Failed to update permission"
        );
      } finally {
        setLoadingShares((prev: Set<string>) => {
          const next = new Set(prev);
          next.delete(shareId);
          return next;
        });
      }
    },
    [updatePermission, onError, onSuccess]
  );

  const handleRemoveShare = useCallback(
    async (shareId: string) => {
      setLoadingShares((prev: Set<string>) => new Set(prev).add(shareId));
      try {
        await remove(shareId);
        onSuccess?.();
      } catch (error) {
        onError?.(
          error instanceof Error ? error.message : "Failed to remove share"
        );
      } finally {
        setLoadingShares((prev: Set<string>) => {
          const next = new Set(prev);
          next.delete(shareId);
          return next;
        });
      }
    },
    [remove, onError, onSuccess]
  );

  // === Render ===
  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Share2 size={20} />
        Share Chat
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Share &quot;{chatTitle}&quot; with colleagues.
        </Typography>

        {/* Workspace Sharing Option */}
        {onToggleWorkspaceSharing && (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'action.hover',
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Users size={20} color="text.secondary" />
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    Share with Workspace
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    All workspace members can access this chat
                  </Typography>
                </Box>
              </Box>
              <Button
                variant={isSharedWithWorkspace ? "contained" : "outlined"}
                size="small"
                onClick={onToggleWorkspaceSharing}
              >
                {isSharedWithWorkspace ? "Shared" : "Share"}
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
          </>
        )}

        {/* Share with Email */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
            Share with specific people
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleShare();
                }
              }}
              disabled={isSubmitting}
              size="small"
              fullWidth
              aria-label="Enter email address to share with"
            />
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={permission}
                onChange={(e) => setPermission(e.target.value as PermissionLevel)}
                disabled={isSubmitting}
                inputProps={{ "aria-label": "Permission level" }}
              >
                <MenuItem value="view">View</MenuItem>
                <MenuItem value="edit">Edit</MenuItem>
              </Select>
            </FormControl>
            <IconButton
              color="primary"
              onClick={handleShare}
              disabled={isSubmitting || !email.trim()}
              aria-label="Add person"
              sx={{ width: 40, height: 40 }}
            >
              {isSubmitting ? (
                <CircularProgress size={20} />
              ) : (
                <UserPlus size={20} />
              )}
            </IconButton>
          </Box>
        </Box>

        {/* Permission Explanation */}
        <Alert severity="info" icon={<AlertCircle size={16} />} sx={{ mb: 2 }}>
          <Typography variant="caption">
            <strong>View:</strong> Can read messages.{" "}
            <strong>Edit:</strong> Can also send messages.
          </Typography>
        </Alert>

        {/* Current Shares */}
        {shares.length > 0 && (
          <Box>
            <Typography
              variant="caption"
              fontWeight="medium"
              color="text.secondary"
              sx={{
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'block',
                mb: 1,
              }}
            >
              People with access ({shares.length})
            </Typography>
            <Box
              sx={{
                maxHeight: 200,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {shares.map((share) => (
                <ShareItem
                  key={share.id}
                  share={share}
                  onRemove={() => handleRemoveShare(share.id)}
                  onUpdatePermission={(perm) =>
                    handleUpdatePermission(share.id, perm)
                  }
                  isLoading={loadingShares.has(share.id)}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Loading State */}
        {isLoading && shares.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {/* Empty State */}
        {!isLoading && shares.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ py: 2 }}
          >
            This chat hasn&apos;t been shared with anyone yet.
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ShareChatDialog;
