/**
 * Module Voice - Session Card Component
 *
 * Displays a voice session summary in a card format with status badges,
 * actions, and key information.
 */

import React from "react";
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
// STATUS BADGE STYLES
// =============================================================================

const statusStyles: Record<VoiceSessionStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-gray-100", text: "text-gray-700", label: "Pending" },
  ready: { bg: "bg-blue-100", text: "text-blue-700", label: "Ready" },
  active: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
  completed: { bg: "bg-purple-100", text: "text-purple-700", label: "Completed" },
  failed: { bg: "bg-red-100", text: "text-red-700", label: "Failed" },
  cancelled: { bg: "bg-orange-100", text: "text-orange-700", label: "Cancelled" },
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
  const statusStyle = statusStyles[session.status] || statusStyles.pending;

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
    <div
      onClick={handleCardClick}
      className={`
        relative p-4 bg-white rounded-lg border transition-all cursor-pointer
        ${isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300"}
        ${className}
      `}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleCardClick();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {session.candidateName || "Unnamed Session"}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {session.interviewType}
          </p>
        </div>
        <span
          className={`
            inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
            ${statusStyle.bg} ${statusStyle.text}
          `}
        >
          {statusStyle.label}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Created</span>
          <span>{formatDate(session.createdAt)}</span>
        </div>
        {session.startedAt && (
          <div className="flex justify-between">
            <span>Started</span>
            <span>{formatDate(session.startedAt)}</span>
          </div>
        )}
        {session.status === "completed" && (
          <div className="flex justify-between">
            <span>Duration</span>
            <span>{formatDuration(session.durationSeconds)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {(canStart || canDelete) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          {canStart && onStart && (
            <button
              onClick={handleStartClick}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              Start Interview
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={handleDeleteClick}
              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default SessionCard;
