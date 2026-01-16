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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        isLoading && "opacity-50 pointer-events-none"
      )}
    >
      {/* Avatar/Icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        <Mail className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">
          {share.sharedWithName || share.sharedWithEmail || "Unknown user"}
        </div>
        {share.sharedWithName && share.sharedWithEmail && (
          <div className="text-xs text-muted-foreground truncate">
            {share.sharedWithEmail}
          </div>
        )}
      </div>

      {/* Permission Select */}
      <Select
        value={share.permissionLevel}
        onValueChange={(value: PermissionLevel) => onUpdatePermission(value)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-24 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="view">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              View
            </div>
          </SelectItem>
          <SelectItem value="edit">
            <div className="flex items-center gap-1">
              <Edit3 className="h-3 w-3" />
              Edit
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={isLoading}
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        aria-label={`Remove access for ${share.sharedWithEmail}`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Chat
          </DialogTitle>
          <DialogDescription>
            Share &quot;{chatTitle}&quot; with colleagues.
          </DialogDescription>
        </DialogHeader>

        {/* Workspace Sharing Option */}
        {onToggleWorkspaceSharing && (
          <>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm">
                    Share with Workspace
                  </div>
                  <div className="text-xs text-muted-foreground">
                    All workspace members can access this chat
                  </div>
                </div>
              </div>
              <Button
                variant={isSharedWithWorkspace ? "secondary" : "outline"}
                size="sm"
                onClick={onToggleWorkspaceSharing}
              >
                {isSharedWithWorkspace ? "Shared" : "Share"}
              </Button>
            </div>
            <Separator />
          </>
        )}

        {/* Share with Email */}
        <div className="space-y-3">
          <Label htmlFor="share-email">Share with specific people</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                id="share-email"
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
              />
            </div>
            <Select
              value={permission}
              onValueChange={(value: PermissionLevel) => setPermission(value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleShare}
              disabled={isSubmitting || !email.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Permission Explanation */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>View:</strong> Can read messages.{" "}
            <strong>Edit:</strong> Can also send messages.
          </AlertDescription>
        </Alert>

        {/* Current Shares */}
        {shares.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              People with access ({shares.length})
            </Label>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
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
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Loading State */}
        {isLoading && shares.length === 0 && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && shares.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            This chat hasn&apos;t been shared with anyone yet.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ShareChatDialog;
