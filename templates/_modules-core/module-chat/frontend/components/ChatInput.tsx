/**
 * Module Chat - Chat Input Component
 *
 * Message input with streaming state awareness and KB grounding indicator.
 */

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Send, Square, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

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
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
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
      ? "text-destructive"
      : charCount > maxLength * 0.75
        ? "text-warning"
        : "text-muted-foreground";

  const isDisabled = disabled || isSending;
  const showCancel = isStreaming && onCancel;
  const canSend = message.trim().length > 0 && !isDisabled && !isStreaming;

  return (
    <div className={cn("border-t bg-background p-4", className)}>
      {/* KB Grounding Indicator */}
      {groundedKbs.length > 0 && (
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            Grounded in:
          </span>
          {groundedKbs.slice(0, 3).map((kb) => (
            <Badge key={kb.id} variant="secondary" className="text-xs">
              {kb.name}
            </Badge>
          ))}
          {groundedKbs.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{groundedKbs.length - 3} more
            </Badge>
          )}
          {onManageKBs && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onManageKBs}
              className="h-6 text-xs"
            >
              Manage
            </Button>
          )}
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            className={cn(
              "min-h-[44px] max-h-[200px] resize-none pr-16",
              "focus-visible:ring-1"
            )}
            rows={1}
          />
          {/* Character Count */}
          <div
            className={cn(
              "absolute right-2 bottom-2 text-xs",
              charCountColor
            )}
          >
            {charCount}/{maxLength}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {showCancel ? (
            <Button
              variant="destructive"
              size="icon"
              onClick={onCancel}
              className="h-10 w-10"
              aria-label="Cancel"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="icon"
              onClick={handleSend}
              disabled={!canSend}
              className="h-10 w-10"
              aria-label="Send message"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}

export default ChatInput;
