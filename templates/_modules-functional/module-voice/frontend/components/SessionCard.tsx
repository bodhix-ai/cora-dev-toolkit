/**
 * Module Voice - Session Card Component
 *
 * Displays a voice session summary in a card format with status badges,
 * actions, and key information.
 */

import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Typography,
  Divider,
} from "@mui/material";
import type { VoiceSessionSummary, VoiceSessionStatus } from "../types";

// =============================================================================
// PROPS
// =============================================================================

export interface SessionCardProps {
  /** Session data */
  session: VoiceSessionSummary;
  /** Click handler for card */
  onClick?: (sessionId: string) => void;
  /** Start session handler */
  onStart?: (sessionId: string) => void;
  /** Delete session handler */
  onDelete?: (sessionId: string) => void;
  /** Whether card is selected */
  isSelected?: boolean;
  /** Custom className */
  className?: string;
}

// =============================================================================
// STATUS BADGE COLORS
// =============================================================================

const statusConfig: Record<VoiceSessionStatus, { color: "default" | "primary" | "success" | "secondary" | "error" | "warning"; label: string }> = {
  pending: { color: "default", label: "Pending" },
  ready: { color: "primary", label: "Ready" },
  active: { color: "success", label: "Active" },
  completed: { color: "secondary", label: "Completed" },
  failed: { color: "error", label: "Failed" },
  cancelled: { color: "warning", label: "Cancelled" },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Session Card Component
 *
 * @example
 * ```tsx
 * <SessionCard
 *   session={session}
 *   onClick={(id) => router.push(`/voice/${id}`)}
 *   onStart={(id) => startSession(id)}
 *   onDelete={(id) => deleteSession(id)}
 * />
 * ```
 */
export function SessionCard({
  session,
  onClick,
  onStart,
  onDelete,
  isSelected = false,
  className = "",
}: SessionCardProps) {
  const statusConf = statusConfig[session.status] || statusConfig.pending;

  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds) return "--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "--";
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCardClick = () => {
    onClick?.(session.id);
  };

  const handleStartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStart?.(session.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(session.id);
  };

  const canStart = session.status === "pending" || session.status === "ready";
  const canDelete = session.status === "pending" || session.status === "cancelled" || session.status === "failed";

  return (
    <Card
      onClick={handleCardClick}
      className={className}
      variant="outlined"
      sx={{
        cursor: "pointer",
        transition: "all 0.2s",
        ...(isSelected && {
          borderColor: "primary.main",
          boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
        }),
        "&:hover": {
          borderColor: isSelected ? "primary.main" : "grey.300",
        },
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleCardClick();
        }
      }}
    >
      <CardContent>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight="medium"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {session.candidateName || "Unnamed Session"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              {session.interviewType}
            </Typography>
          </Box>
          <Chip
            label={statusConf.label}
            color={statusConf.color}
            size="small"
            sx={{ ml: 1, fontSize: "0.7rem" }}
          />
        </Box>

        {/* Details */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">
              Created
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(session.createdAt)}
            </Typography>
          </Box>
          {session.startedAt && (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="caption" color="text.secondary">
                Started
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDate(session.startedAt)}
              </Typography>
            </Box>
          )}
          {session.status === "completed" && (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="caption" color="text.secondary">
                Duration
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDuration(session.durationSeconds)}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>

      {/* Actions */}
      {(canStart || canDelete) && (
        <>
          <Divider />
          <CardActions sx={{ p: 2, pt: 1.5, gap: 1 }}>
            {canStart && onStart && (
              <Button
                onClick={handleStartClick}
                variant="contained"
                size="small"
                fullWidth={!canDelete}
                sx={{ flex: canDelete ? 1 : undefined }}
              >
                Start Interview
              </Button>
            )}
            {canDelete && onDelete && (
              <Button
                onClick={handleDeleteClick}
                color="error"
                size="small"
              >
                Delete
              </Button>
            )}
          </CardActions>
        </>
      )}
    </Card>
  );
}

export default SessionCard;
