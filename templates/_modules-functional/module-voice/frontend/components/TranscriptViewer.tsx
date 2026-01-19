/**
 * Module Voice - Transcript Viewer Component
 *
 * Displays voice interview transcripts with speaker differentiation,
 * timestamps, and search/filter capabilities.
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  Chip,
  Alert,
} from "@mui/material";
import {
  Warning as WarningIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from "@mui/icons-material";
import type { SpeakerSegment, VoiceTranscript } from "../types";

// =============================================================================
// PROPS
// =============================================================================

export interface TranscriptViewerProps {
  /** Transcript data (stored) */
  transcript?: VoiceTranscript | null;
  /** Live segments (real-time) */
  liveSegments?: SpeakerSegment[];
  /** Whether to show timestamps */
  showTimestamps?: boolean;
  /** Whether to auto-scroll to new segments */
  autoScroll?: boolean;
  /** Search query */
  searchQuery?: string;
  /** Custom className */
  className?: string;
  /** Height of the viewer */
  height?: string;
}

// =============================================================================
// SPEAKER STYLES
// =============================================================================

const speakerStyles = {
  bot: {
    bgcolor: "primary.50",
    color: "primary.900",
    label: "AI Interviewer",
    chipBg: "primary.100",
  },
  candidate: {
    bgcolor: "grey.50",
    color: "grey.900",
    label: "Candidate",
    chipBg: "grey.100",
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Transcript Viewer Component
 *
 * @example
 * ```tsx
 * <TranscriptViewer
 *   transcript={transcript}
 *   liveSegments={liveSegments}
 *   showTimestamps={true}
 *   autoScroll={true}
 * />
 * ```
 */
export function TranscriptViewer({
  transcript,
  liveSegments = [],
  showTimestamps = true,
  autoScroll = true,
  searchQuery = "",
  className = "",
  height = "400px",
}: TranscriptViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  // Combine stored transcript segments with live segments
  const allSegments = useMemo(() => {
    const stored = transcript?.speakerSegments || [];
    return [...stored, ...liveSegments];
  }, [transcript?.speakerSegments, liveSegments]);

  // Filter segments by search query
  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return allSegments;
    const query = searchQuery.toLowerCase();
    return allSegments.filter((seg) =>
      seg.text.toLowerCase().includes(query)
    );
  }, [allSegments, searchQuery]);

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    if (autoScroll && !userScrolled && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [allSegments.length, autoScroll, userScrolled]);

  // Track user scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setUserScrolled(!isAtBottom);
  };

  // Format timestamp
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Highlight search matches
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    
    return parts.map((part, i) =>
      regex.test(part) ? (
        <Box
          key={i}
          component="mark"
          sx={{
            bgcolor: "warning.light",
            px: 0.5,
            borderRadius: 0.5,
          }}
        >
          {part}
        </Box>
      ) : (
        part
      )
    );
  };

  if (allSegments.length === 0) {
    return (
      <Box
        className={className}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "grey.50",
          borderRadius: 1,
          border: 1,
          borderColor: "divider",
          height,
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No transcript available
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Transcript will appear when the interview starts
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        ref={containerRef}
        onScroll={handleScroll}
        className={className}
        sx={{
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 1,
          border: 1,
          borderColor: "divider",
          height,
        }}
      >
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {filteredSegments.map((segment, index) => {
            const style = speakerStyles[segment.speaker] || speakerStyles.candidate;
            const isLive = index >= (transcript?.speakerSegments?.length || 0);

            return (
              <Paper
                key={`${segment.start_time}-${index}`}
                variant="outlined"
                sx={{
                  p: 1.5,
                  bgcolor: style.bgcolor,
                  ...(isLive && {
                    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    "@keyframes pulse": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.8 },
                    },
                  }),
                }}
              >
                {/* Speaker header */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Chip
                    label={style.label}
                    size="small"
                    sx={{
                      bgcolor: style.chipBg,
                      color: style.color,
                      fontSize: "0.7rem",
                      height: 20,
                      fontWeight: "medium",
                    }}
                  />
                  {showTimestamps && (
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(segment.start_time)}
                      {segment.end_time !== segment.start_time && (
                        <> - {formatTime(segment.end_time)}</>
                      )}
                    </Typography>
                  )}
                </Box>

                {/* Text content */}
                <Typography
                  variant="body2"
                  sx={{
                    color: style.color,
                    lineHeight: 1.6,
                  }}
                >
                  {highlightText(segment.text, searchQuery)}
                </Typography>

                {/* Confidence indicator (if available) */}
                {segment.confidence !== undefined && segment.confidence < 0.8 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "warning.main",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <WarningIcon sx={{ fontSize: 12 }} />
                      Low confidence ({Math.round(segment.confidence * 100)}%)
                    </Typography>
                  </Box>
                )}
              </Paper>
            );
          })}

          {/* Live indicator */}
          {liveSegments.length > 0 && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "success.main",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "success.main",
                    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    "@keyframes pulse": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.5 },
                    },
                  }}
                />
                Live transcription
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Scroll to bottom button */}
      {userScrolled && (
        <Button
          onClick={() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
              setUserScrolled(false);
            }
          }}
          variant="contained"
          size="small"
          endIcon={<ArrowDownIcon />}
          sx={{
            position: "sticky",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            borderRadius: 20,
            boxShadow: 3,
          }}
        >
          Scroll to bottom
        </Button>
      )}
    </Box>
  );
}

export default TranscriptViewer;
