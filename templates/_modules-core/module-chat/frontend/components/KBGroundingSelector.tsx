/**
 * Module Chat - KB Grounding Selector Component
 *
 * Dialog/panel for selecting which knowledge bases to ground a chat in.
 */

"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  BookOpen,
  Search,
  Check,
  Plus,
  X,
  Loader2,
  Database,
  Building2,
  Globe,
} from "lucide-react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Chip,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Paper,
  InputAdornment,
} from "@mui/material";
import { useChatKBGrounding } from "../hooks/useChatKBGrounding";
import type { KBInfo, ChatKBGrounding } from "../types";

// =============================================================================
// PROPS TYPES
// =============================================================================

export interface KBGroundingSelectorProps {
  /** Chat session ID */
  chatId: string;
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog closes */
  onOpenChange: (open: boolean) => void;
  /** Callback when error occurs */
  onError?: (message: string) => void;
  /** Callback when successfully updated */
  onSuccess?: () => void;
}

// =============================================================================
// KB ITEM COMPONENT
// =============================================================================

interface KBItemProps {
  kb: KBInfo;
  isGrounded: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

function KBItem({ kb, isGrounded, isLoading, onToggle }: KBItemProps) {
  const scopeIcon = {
    system: <Globe size={12} />,
    org: <Building2 size={12} />,
    workspace: <Database size={12} />,
  };

  const scopeLabel = {
    system: "System",
    org: "Organization",
    workspace: "Workspace",
  };

  return (
    <Paper
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        p: 1.5,
        cursor: 'pointer',
        border: 1,
        borderColor: isGrounded ? 'primary.main' : 'divider',
        bgcolor: isGrounded ? 'primary.light' : 'background.paper',
        opacity: isLoading ? 0.5 : 1,
        pointerEvents: isLoading ? 'none' : 'auto',
        '&:hover': {
          borderColor: isGrounded ? 'primary.main' : 'text.secondary',
        },
        transition: 'all 0.2s',
      }}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isGrounded}
        disabled={isLoading}
        size="small"
        sx={{ mt: -0.5 }}
        aria-label={`${isGrounded ? "Remove" : "Add"} ${kb.name}`}
      />

      {/* KB Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BookOpen size={16} color="text.secondary" />
          <Typography
            variant="body2"
            fontWeight="medium"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {kb.name}
          </Typography>
          {isLoading && <CircularProgress size={12} />}
        </Box>
        {kb.description && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mt: 0.5,
            }}
          >
            {kb.description}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Chip
            icon={scopeIcon[kb.scope]}
            label={scopeLabel[kb.scope]}
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: '0.625rem' }}
          />
          {kb.documentCount !== undefined && (
            <Typography variant="caption" color="text.secondary">
              {kb.documentCount} docs
            </Typography>
          )}
        </Box>
      </Box>

      {/* Selected Indicator */}
      {isGrounded && !isLoading && (
        <Check size={16} color="primary" style={{ flexShrink: 0 }} />
      )}
    </Paper>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Dialog for selecting KB grounding for a chat
 *
 * Features:
 * - Search available KBs
 * - Toggle KBs on/off for grounding
 * - Shows currently grounded KBs
 * - Scope indicators (system/org/workspace)
 *
 * @example
 * ```tsx
 * <KBGroundingSelector
 *   chatId={currentSession.id}
 *   open={kbDialogOpen}
 *   onOpenChange={setKbDialogOpen}
 *   onError={(msg) => toast.error(msg)}
 *   onSuccess={() => toast.success("KB grounding updated")}
 * />
 * ```
 */
export function KBGroundingSelector({
  chatId,
  open,
  onOpenChange,
  onError,
  onSuccess,
}: KBGroundingSelectorProps) {
  const [search, setSearch] = useState("");

  // Hook for KB grounding
  const {
    groundedKbs,
    availableKbs,
    isLoading,
    isGrounded,
    add,
    remove,
    toggle,
    reload,
    reloadAvailable,
  } = useChatKBGrounding({
    sessionId: chatId,
    autoLoad: true,
    loadAvailable: true,
  });

  // Reload data when dialog opens
  useEffect(() => {
    if (open) {
      reload();
      reloadAvailable();
    }
  }, [open, reload, reloadAvailable]);

  // Filter KBs by search
  const filteredKbs = useMemo(() => {
    if (!search.trim()) return availableKbs;
    const lowerSearch = search.toLowerCase();
    return availableKbs.filter(
      (kb) =>
        kb.name.toLowerCase().includes(lowerSearch) ||
        kb.description?.toLowerCase().includes(lowerSearch)
    );
  }, [availableKbs, search]);

  // Group KBs by scope
  const groupedKbs = useMemo(() => {
    const groups: Record<"workspace" | "org" | "system", KBInfo[]> = {
      workspace: [],
      org: [],
      system: [],
    };
    filteredKbs.forEach((kb) => {
      groups[kb.scope].push(kb);
    });
    return groups;
  }, [filteredKbs]);

  // Track loading state per KB
  const [loadingKbs, setLoadingKbs] = useState<Set<string>>(new Set());

  // Handle toggle
  const handleToggle = useCallback(
    async (kb: KBInfo) => {
      setLoadingKbs((prev: Set<string>) => new Set(prev).add(kb.id));
      try {
        await toggle(kb.id);
        onSuccess?.();
      } catch {
        // Error handled by hook
        onError?.("Failed to update KB grounding");
      } finally {
        setLoadingKbs((prev: Set<string>) => {
          const next = new Set(prev);
          next.delete(kb.id);
          return next;
        });
      }
    },
    [toggle, onSuccess, onError]
  );

  // Render KB group
  const renderGroup = (title: string, kbs: KBInfo[]) => {
    if (kbs.length === 0) return null;
    return (
      <Box sx={{ mb: 2 }}>
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
          {title}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {kbs.map((kb) => (
            <KBItem
              key={kb.id}
              kb={kb}
              isGrounded={isGrounded(kb.id)}
              isLoading={loadingKbs.has(kb.id)}
              onToggle={() => handleToggle(kb)}
            />
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BookOpen size={20} />
        Knowledge Base Grounding
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select knowledge bases to ground this chat. The AI will use these
          sources to provide informed answers.
        </Typography>

        {/* Currently Grounded */}
        {groundedKbs.length > 0 && (
          <Paper
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              p: 1.5,
              bgcolor: 'action.hover',
              mb: 2,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ width: '100%', mb: 0.5 }}
            >
              Currently grounded ({groundedKbs.length}):
            </Typography>
            {groundedKbs.map((grounding) => (
              <Chip
                key={grounding.id}
                label={grounding.kbName}
                size="small"
                onDelete={() =>
                  handleToggle({
                    id: grounding.kbId,
                    name: grounding.kbName ?? "Unknown KB",
                    scope: "workspace",
                  })
                }
                deleteIcon={<X size={12} />}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                }}
              />
            ))}
          </Paper>
        )}

        {/* Search */}
        <TextField
          placeholder="Search knowledge bases..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          size="small"
          aria-label="Search knowledge bases"
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} />
              </InputAdornment>
            ),
          }}
        />

        {/* KB List */}
        <Box
          sx={{
            maxHeight: 300,
            overflow: 'auto',
          }}
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : filteredKbs.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 4,
                color: 'text.secondary',
              }}
            >
              <Database size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <Typography variant="body2">
                {search
                  ? "No knowledge bases match your search"
                  : "No knowledge bases available"}
              </Typography>
            </Box>
          ) : (
            <>
              {renderGroup("Workspace", groupedKbs.workspace)}
              {renderGroup("Organization", groupedKbs.org)}
              {renderGroup("System", groupedKbs.system)}
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default KBGroundingSelector;
