/**
 * Module Voice - KB Selector Component
 *
 * Component for selecting and managing knowledge bases grounded to a voice session.
 * Allows adding, removing, and toggling KB associations.
 */

import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Typography,
  Alert,
} from "@mui/material";
import {
  Storage as StorageIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import type { VoiceSessionKb, AvailableKb } from "../types";

// =============================================================================
// PROPS
// =============================================================================

export interface KbSelectorProps {
  /** Currently grounded KBs */
  groundedKbs: VoiceSessionKb[];
  /** Available KBs for selection */
  availableKbs: AvailableKb[];
  /** Handler for adding a KB */
  onAdd: (kbId: string) => Promise<void>;
  /** Handler for removing a KB */
  onRemove: (kbId: string) => Promise<void>;
  /** Handler for toggling KB enabled status */
  onToggle: (kbId: string, enabled: boolean) => Promise<void>;
  /** Whether the session is active (disables modifications) */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Custom className */
  className?: string;
}

// =============================================================================
// SCOPE BADGE COLORS
// =============================================================================

const scopeColors: Record<string, "primary" | "secondary" | "default"> = {
  workspace: "primary",
  org: "secondary",
  system: "default",
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * KB Selector Component
 *
 * @example
 * ```tsx
 * <KbSelector
 *   groundedKbs={groundedKbs}
 *   availableKbs={availableKbs}
 *   onAdd={addKb}
 *   onRemove={removeKb}
 *   onToggle={toggleKb}
 *   disabled={session.status === 'active'}
 * />
 * ```
 */
export function KbSelector({
  groundedKbs,
  availableKbs,
  onAdd,
  onRemove,
  onToggle,
  disabled = false,
  loading = false,
  className = "",
}: KbSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Get KBs that can be added (not already grounded)
  const addableKbs = availableKbs.filter((kb) => !kb.isAlreadyGrounded);

  const handleAdd = async (kbId: string) => {
    if (disabled || actionLoading) return;
    setActionLoading(kbId);
    try {
      await onAdd(kbId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (kbId: string) => {
    if (disabled || actionLoading) return;
    setActionLoading(kbId);
    try {
      await onRemove(kbId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (kbId: string, currentEnabled: boolean) => {
    if (disabled || actionLoading) return;
    setActionLoading(kbId);
    try {
      await onToggle(kbId, !currentEnabled);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Card variant="outlined" className={className}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <StorageIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <Typography variant="body2" fontWeight="medium">
            Knowledge Bases
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ({groundedKbs.length} grounded)
          </Typography>
        </Box>
        {loading && (
          <Typography variant="caption" color="text.secondary">
            Loading...
          </Typography>
        )}
      </Box>

      {/* Grounded KBs */}
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {groundedKbs.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 1 }}>
            No knowledge bases grounded.
            {!disabled && " Add one to provide context for the AI."}
          </Typography>
        ) : (
          groundedKbs.map((kb) => {
            const scopeColor = scopeColors[kb.kbScope || "workspace"] || scopeColors.workspace;
            const isLoading = actionLoading === kb.kbId;

            return (
              <Box
                key={kb.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1,
                  borderRadius: 1,
                  bgcolor: "grey.50",
                  opacity: !kb.isEnabled ? 0.6 : 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flex: 1 }}>
                  {/* Toggle checkbox */}
                  <Checkbox
                    checked={kb.isEnabled}
                    onChange={() => handleToggle(kb.kbId, kb.isEnabled)}
                    disabled={disabled || isLoading}
                    size="small"
                    aria-label={`Toggle ${kb.kbName || 'KB'}`}
                  />
                  
                  {/* KB info */}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {kb.kbName || "Unknown KB"}
                    </Typography>
                  </Box>

                  {/* Scope badge */}
                  {kb.kbScope && (
                    <Chip
                      label={kb.kbScope}
                      color={scopeColor}
                      size="small"
                      sx={{ fontSize: "0.7rem", height: 20 }}
                    />
                  )}
                </Box>

                {/* Remove button */}
                {!disabled && (
                  <IconButton
                    onClick={() => handleRemove(kb.kbId)}
                    disabled={isLoading}
                    size="small"
                    sx={{
                      ml: 1,
                      color: "text.secondary",
                      "&:hover": { color: "error.main", bgcolor: "error.50" },
                    }}
                    title="Remove KB"
                    aria-label={`Remove ${kb.kbName || 'KB'}`}
                  >
                    {isLoading ? (
                      <CircularProgress size={16} />
                    ) : (
                      <CloseIcon fontSize="small" />
                    )}
                  </IconButton>
                )}
              </Box>
            );
          })
        )}
      </CardContent>

      {/* Add KB section */}
      {!disabled && addableKbs.length > 0 && (
        <Box sx={{ borderTop: 1, borderColor: "divider" }}>
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            fullWidth
            sx={{
              py: 1,
              justifyContent: "center",
              gap: 0.5,
            }}
          >
            <ExpandMoreIcon
              sx={{
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
            {isExpanded ? "Hide available KBs" : `Add KB (${addableKbs.length} available)`}
          </Button>

          <Collapse in={isExpanded}>
            <Box
              sx={{
                p: 1.5,
                bgcolor: "grey.50",
                borderTop: 1,
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {addableKbs.map((kb) => {
                const scopeColor = scopeColors[kb.scope] || scopeColors.workspace;
                const isLoading = actionLoading === kb.id;

                return (
                  <Box
                    key={kb.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1,
                      borderRadius: 1,
                      bgcolor: "background.paper",
                      border: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight="medium"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {kb.name}
                      </Typography>
                      {kb.description && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "block",
                          }}
                        >
                          {kb.description}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 1 }}>
                      <Chip
                        label={kb.scope}
                        color={scopeColor}
                        size="small"
                        sx={{ fontSize: "0.7rem", height: 20 }}
                      />
                      <Button
                        onClick={() => handleAdd(kb.id)}
                        disabled={isLoading}
                        variant="contained"
                        size="small"
                        sx={{ minWidth: 60 }}
                      >
                        {isLoading ? "Adding..." : "Add"}
                      </Button>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Disabled notice */}
      {disabled && (
        <Alert severity="warning" sx={{ borderRadius: 0, borderTop: 1, borderColor: "divider" }}>
          KB selection is locked while the session is active.
        </Alert>
      )}
    </Card>
  );
}

export default KbSelector;
