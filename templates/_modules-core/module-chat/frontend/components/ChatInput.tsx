/**
 * Module Chat - Chat Input Component
 *
 * Message input with streaming state awareness and KB grounding indicator.
 */

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Send, Square, Loader2, BookOpen } from "lucide-react";
import { 
  TextField, 
  Button, 
  IconButton, 
  Chip, 
  Box, 
  Typography 
} from "@mui/material";
import type { KBInfo } from "../types";

// =============================================================================
// PROPS TYPES
// =============================================================================

export interface ChatInputProps {
  /** Callback when message is submitted */
  onSend: (message: string) => void | Promise<void>;
  /** Callback to cancel streaming */
  onCancel?: () => void;
  /** Whether currently streaming a response */
  isStreaming?: boolean;
  /** Whether input should be disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Currently grounded KBs (for display) */
  groundedKbs?: KBInfo[];
  /** Callback to manage KB grounding */
  onManageKBs?: () => void;
  /** Maximum input length */
  maxLength?: number;
  /** Optional class name */
  className?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Chat message input with streaming controls
 *
 * Features:
 * - Multi-line input with auto-resize
 * - Send on Enter (Shift+Enter for new line)
 * - Cancel button during streaming
 * - KB grounding indicator
 * - Character count
 *
 * @example
 * ```tsx
 * <ChatInput
 *   onSend={(message) => sendMessage(message)}
 *   onCancel={() => cancelStreaming()}
 *   isStreaming={isStreaming}
 *   groundedKbs={currentGroundedKbs}
 *   onManageKBs={() => setKBDialogOpen(true)}
 * />
 * ```
 */
export function ChatInput({
  onSend,
  onCancel,
  isStreaming = false,
  disabled = false,
  placeholder = "Type a message...",
  groundedKbs = [],
  onManageKBs,
  maxLength = 10000,
  className,
  autoFocus = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Handle send
  const handleSend = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending || disabled || isStreaming) return;

    setIsSending(true);
    try {
      await onSend(trimmedMessage);
      setMessage("");
    } finally {
      setIsSending(false);
    }
  }, [message, isSending, disabled, isStreaming, onSend]);

  // Handle keydown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Send on Enter (without Shift)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Calculate character count
  const charCount = message.length;
  const charCountColor =
    charCount > maxLength * 0.9
      ? "error.main"
      : charCount > maxLength * 0.75
        ? "warning.main"
        : "text.secondary";

  const isDisabled = disabled || isSending;
  const showCancel = isStreaming && onCancel;
  const canSend = message.trim().length > 0 && !isDisabled && !isStreaming;

  return (
    <Box 
      className={className}
      sx={{ 
        borderTop: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: 2
      }}
    >
      {/* KB Grounding Indicator */}
      {groundedKbs.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Typography 
            variant="caption" 
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}
          >
            <BookOpen size={12} />
            Grounded in:
          </Typography>
          {groundedKbs.slice(0, 3).map((kb) => (
            <Chip 
              key={kb.id} 
              label={kb.name}
              size="small"
              variant="outlined"
            />
          ))}
          {groundedKbs.length > 3 && (
            <Chip 
              label={`+${groundedKbs.length - 3} more`}
              size="small"
              variant="outlined"
            />
          )}
          {onManageKBs && (
            <Button
              variant="text"
              size="small"
              onClick={onManageKBs}
              sx={{ minHeight: 24, px: 1, fontSize: '0.75rem' }}
            >
              Manage
            </Button>
          )}
        </Box>
      )}

      {/* Input Row */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        <Box sx={{ position: 'relative', flex: 1 }}>
          <TextField
            inputRef={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            multiline
            maxRows={8}
            fullWidth
            variant="outlined"
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                pr: 8,
              }
            }}
          />
          {/* Character Count */}
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              color: charCountColor,
            }}
          >
            {charCount}/{maxLength}
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {showCancel ? (
            <IconButton
              color="error"
              onClick={onCancel}
              aria-label="Cancel"
              sx={{ width: 40, height: 40 }}
            >
              <Square size={16} />
            </IconButton>
          ) : (
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={!canSend}
              aria-label="Send message"
              sx={{ width: 40, height: 40 }}
            >
              {isSending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Hint */}
      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
        Press Enter to send, Shift+Enter for new line
      </Typography>
    </Box>
  );
}

export default ChatInput;
