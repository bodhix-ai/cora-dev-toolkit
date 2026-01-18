/**
 * Module Voice - KB Selector Component
 *
 * Component for selecting and managing knowledge bases grounded to a voice session.
 * Allows adding, removing, and toggling KB associations.
 */

import React, { useState } from "react";
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
// SCOPE BADGE STYLES
// =============================================================================

const scopeStyles: Record<string, { bg: string; text: string }> = {
  workspace: { bg: "bg-blue-100", text: "text-blue-700" },
  org: { bg: "bg-purple-100", text: "text-purple-700" },
  system: { bg: "bg-gray-100", text: "text-gray-700" },
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
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            Knowledge Bases
          </span>
          <span className="text-xs text-gray-400">
            ({groundedKbs.length} grounded)
          </span>
        </div>
        {loading && (
          <span className="text-xs text-gray-400">Loading...</span>
        )}
      </div>

      {/* Grounded KBs */}
      <div className="p-3 space-y-2">
        {groundedKbs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-2">
            No knowledge bases grounded.
            {!disabled && " Add one to provide context for the AI."}
          </p>
        ) : (
          groundedKbs.map((kb) => {
            const scopeStyle = scopeStyles[kb.kbScope || "workspace"] || scopeStyles.workspace;
            const isLoading = actionLoading === kb.kbId;

            return (
              <div
                key={kb.id}
                className={`flex items-center justify-between p-2 rounded-lg bg-gray-50 ${
                  !kb.isEnabled ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Toggle checkbox */}
                  <input
                    type="checkbox"
                    checked={kb.isEnabled}
                    onChange={() => handleToggle(kb.kbId, kb.isEnabled)}
                    disabled={disabled || isLoading}
                    aria-label={`Toggle ${kb.kbName || 'KB'}`}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                  />
                  
                  {/* KB info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {kb.kbName || "Unknown KB"}
                    </p>
                  </div>

                  {/* Scope badge */}
                  {kb.kbScope && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${scopeStyle.bg} ${scopeStyle.text}`}
                    >
                      {kb.kbScope}
                    </span>
                  )}
                </div>

                {/* Remove button */}
                {!disabled && (
                  <button
                    onClick={() => handleRemove(kb.kbId)}
                    disabled={isLoading}
                    className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Remove KB"
                  >
                    {isLoading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add KB section */}
      {!disabled && addableKbs.length > 0 && (
        <div className="border-t border-gray-200">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-1 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {isExpanded ? "Hide available KBs" : `Add KB (${addableKbs.length} available)`}
          </button>

          {isExpanded && (
            <div className="p-3 bg-gray-50 border-t border-gray-200 space-y-2">
              {addableKbs.map((kb) => {
                const scopeStyle = scopeStyles[kb.scope] || scopeStyles.workspace;
                const isLoading = actionLoading === kb.id;

                return (
                  <div
                    key={kb.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-200"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {kb.name}
                      </p>
                      {kb.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {kb.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${scopeStyle.bg} ${scopeStyle.text}`}
                      >
                        {kb.scope}
                      </span>
                      <button
                        onClick={() => handleAdd(kb.id)}
                        disabled={isLoading}
                        className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isLoading ? "Adding..." : "Add"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Disabled notice */}
      {disabled && (
        <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-100">
          <p className="text-xs text-yellow-700">
            KB selection is locked while the session is active.
          </p>
        </div>
      )}
    </div>
  );
}

export default KbSelector;
