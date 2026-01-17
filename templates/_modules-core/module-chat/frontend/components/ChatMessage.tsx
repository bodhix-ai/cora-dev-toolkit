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
import {
  Box,
  IconButton,
  Typography,
  Avatar,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
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
    <Paper
      component="button"
      onClick={() => onClick?.(citation)}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        p: 1,
        width: '100%',
        textAlign: 'left',
        bgcolor: 'action.hover',
        '&:hover': {
          bgcolor: 'action.selected',
        },
        cursor: 'pointer',
        border: 'none',
        transition: 'background-color 0.2s',
      }}
    >
      <Avatar
        sx={{
          width: 24,
          height: 24,
          fontSize: '0.75rem',
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
        }}
      >
        {index + 1}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FileText size={12} />
          <Typography
            variant="caption"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'text.secondary',
            }}
          >
            {citation.documentName}
          </Typography>
          {citation.pageNumber && (
            <Typography variant="caption" color="text.secondary">
              · p.{citation.pageNumber}
            </Typography>
          )}
        </Box>
        <Typography
          variant="caption"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mt: 0.5,
          }}
        >
          {citation.content}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {citation.kbName}
          </Typography>
          {citation.relevanceScore !== undefined && (
            <Typography variant="caption" color="text.secondary">
              {Math.round(citation.relevanceScore * 100)}% match
            </Typography>
          )}
        </Box>
      </Box>
      <ExternalLink size={12} color="text.secondary" />
    </Paper>
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
    <Box
      className={className}
      sx={{
        display: 'flex',
        gap: 1.5,
        p: 2,
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: isUser ? 'primary.main' : 'action.hover',
          color: isUser ? 'primary.contrastText' : 'text.primary',
        }}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </Avatar>

      {/* Message Content */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        {/* Message Bubble */}
        <Paper
          sx={{
            display: 'inline-block',
            maxWidth: '85%',
            px: 2,
            py: 1,
            bgcolor: isUser ? 'primary.main' : 'action.hover',
            color: isUser ? 'primary.contrastText' : 'text.primary',
            borderRadius: 2,
            borderBottomRightRadius: isUser ? 1 : 2,
            borderBottomLeftRadius: isUser ? 2 : 1,
          }}
        >
          {/* Content */}
          <Typography
            component="div"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {content}
            {isStreaming && (
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  width: 2,
                  height: 16,
                  bgcolor: 'currentColor',
                  ml: 0.5,
                  animation: 'pulse 1s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                  },
                }}
              />
            )}
          </Typography>

          {/* Truncated Warning */}
          {message.wasTruncated && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
              (Response was truncated)
            </Typography>
          )}
        </Paper>

        {/* Message Footer */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'text.secondary',
          }}
        >
          <Typography variant="caption">{formattedTime}</Typography>
          
          {/* Token Usage (for assistant messages) */}
          {isAssistant && message.tokenUsage && (
            <Typography variant="caption">
              · {message.tokenUsage.totalTokens} tokens
            </Typography>
          )}

          {/* Copy Button */}
          <IconButton
            size="small"
            onClick={handleCopy}
            aria-label="Copy message"
            sx={{ width: 24, height: 24 }}
          >
            {copied ? (
              <Check size={12} style={{ color: '#4caf50' }} />
            ) : (
              <Copy size={12} />
            )}
          </IconButton>
        </Box>

        {/* Citations */}
        {showCitations && hasCitations && isAssistant && (
          <Accordion
            expanded={citationsOpen}
            onChange={(_, expanded) => setCitationsOpen(expanded)}
            sx={{
              width: '100%',
              maxWidth: '85%',
              boxShadow: 'none',
              '&:before': { display: 'none' },
              bgcolor: 'transparent',
            }}
          >
            <AccordionSummary
              expandIcon={citationsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              sx={{
                minHeight: 32,
                px: 0,
                '& .MuiAccordionSummary-content': {
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                },
              }}
            >
              <FileText size={12} />
              <Typography variant="caption" color="text.secondary">
                {citations.length} source{citations.length > 1 ? "s" : ""}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, py: 1 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {citations.map((citation, index) => (
                  <CitationItem
                    key={`${citation.documentId}-${citation.chunkIndex}`}
                    citation={citation}
                    index={index}
                    onClick={onCitationClick}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    </Box>
  );
}

export default ChatMessage;
