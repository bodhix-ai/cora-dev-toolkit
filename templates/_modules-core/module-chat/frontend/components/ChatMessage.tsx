/**
 * Module Chat - Chat Message Component
 *
 * Displays a single chat message with role-based styling and citation support.
 */

"use client";

import React, { useMemo, useState } from "react";
import {
  User,
  Bot,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType, Citation } from "../types";

// =============================================================================
// PROPS TYPES
// =============================================================================

export interface ChatMessageProps {
  /** Message data */
  message: ChatMessageType;
  /** Whether this is a streaming message (partial content) */
  isStreaming?: boolean;
  /** Optional streaming content (for partial responses) */
  streamingContent?: string;
  /** Whether to show citations */
  showCitations?: boolean;
  /** Callback when citation is clicked */
  onCitationClick?: (citation: Citation) => void;
  /** Optional class name */
  className?: string;
}

// =============================================================================
// CITATION COMPONENT
// =============================================================================

interface CitationItemProps {
  citation: Citation;
  index: number;
  onClick?: (citation: Citation) => void;
}

function CitationItem({ citation, index, onClick }: CitationItemProps) {
  return (
    <button
      className={cn(
        "flex items-start gap-2 p-2 rounded-md text-left w-full",
        "bg-muted/50 hover:bg-muted transition-colors",
        "text-sm"
      )}
      onClick={() => onClick?.(citation)}
    >
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <FileText className="h-3 w-3" />
          <span className="truncate">{citation.documentName}</span>
          {citation.pageNumber && (
            <span className="text-muted-foreground">
              · p.{citation.pageNumber}
            </span>
          )}
        </div>
        <p className="text-xs mt-1 line-clamp-2">{citation.content}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {citation.kbName}
          </span>
          {citation.relevanceScore !== undefined && (
            <span className="text-xs text-muted-foreground">
              {Math.round(citation.relevanceScore * 100)}% match
            </span>
          )}
        </div>
      </div>
      <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
    </button>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Chat message bubble with role-based styling
 *
 * Features:
 * - User/Assistant message styling
 * - Citation display with collapsible list
 * - Copy message content
 * - Streaming animation support
 *
 * @example
 * ```tsx
 * <ChatMessage
 *   message={message}
 *   showCitations={true}
 *   onCitationClick={(citation) => openDocument(citation.documentId)}
 * />
 * ```
 */
export function ChatMessage({
  message,
  isStreaming = false,
  streamingContent,
  showCitations = true,
  onCitationClick,
  className,
}: ChatMessageProps) {
  const [citationsOpen, setCitationsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get display content (streaming or final)
  const content = isStreaming && streamingContent !== undefined 
    ? streamingContent 
    : message.content;

  // Get citations from metadata
  const citations = useMemo(() => {
    return message.metadata?.citations ?? [];
  }, [message.metadata?.citations]);

  const hasCitations = citations.length > 0;

  // Handle copy
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail
    }
  };

  // Format timestamp
  const formattedTime = useMemo(() => {
    const date = new Date(message.createdAt);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [message.createdAt]);

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3 p-4",
        isUser && "flex-row-reverse",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex-1 min-w-0 space-y-2",
          isUser && "text-right"
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            "inline-block rounded-lg px-4 py-2 max-w-[85%]",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted",
            isUser ? "rounded-br-sm" : "rounded-bl-sm"
          )}
        >
          {/* Content */}
          <div className="whitespace-pre-wrap break-words">
            {content}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
            )}
          </div>

          {/* Truncated Warning */}
          {message.wasTruncated && (
            <div className="text-xs mt-2 opacity-70">
              (Response was truncated)
            </div>
          )}
        </div>

        {/* Message Footer */}
        <div
          className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground",
            isUser && "justify-end"
          )}
        >
          <span>{formattedTime}</span>
          
          {/* Token Usage (for assistant messages) */}
          {isAssistant && message.tokenUsage && (
            <span>· {message.tokenUsage.totalTokens} tokens</span>
          )}

          {/* Copy Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Citations */}
        {showCitations && hasCitations && isAssistant && (
          <Collapsible open={citationsOpen} onOpenChange={setCitationsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <FileText className="h-3 w-3 mr-1" />
                {citations.length} source{citations.length > 1 ? "s" : ""}
                {citationsOpen ? (
                  <ChevronUp className="h-3 w-3 ml-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 ml-1" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {citations.map((citation, index) => (
                <CitationItem
                  key={`${citation.documentId}-${citation.chunkIndex}`}
                  citation={citation}
                  index={index}
                  onClick={onCitationClick}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
