/**
 * Module Voice - Transcript Viewer Component
 *
 * Displays voice interview transcripts with speaker differentiation,
 * timestamps, and search/filter capabilities.
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
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
    bg: "bg-blue-50",
    text: "text-blue-900",
    label: "AI Interviewer",
    labelBg: "bg-blue-100",
  },
  candidate: {
    bg: "bg-gray-50",
    text: "text-gray-900",
    label: "Candidate",
    labelBg: "bg-gray-100",
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
        <mark key={i} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (allSegments.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 ${className}`}
        style={{ height }}
      >
        <div className="text-center text-gray-500">
          <p className="text-sm">No transcript available</p>
          <p className="text-xs mt-1">
            Transcript will appear when the interview starts
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto bg-white rounded-lg border border-gray-200 ${className}`}
      style={{ height }}
    >
      <div className="p-4 space-y-4">
        {filteredSegments.map((segment, index) => {
          const style = speakerStyles[segment.speaker] || speakerStyles.candidate;
          const isLive = index >= (transcript?.speakerSegments?.length || 0);

          return (
            <div
              key={`${segment.start_time}-${index}`}
              className={`rounded-lg p-3 ${style.bg} ${isLive ? "animate-pulse" : ""}`}
            >
              {/* Speaker header */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${style.labelBg} ${style.text}`}
                >
                  {style.label}
                </span>
                {showTimestamps && (
                  <span className="text-xs text-gray-400">
                    {formatTime(segment.start_time)}
                    {segment.end_time !== segment.start_time && (
                      <> - {formatTime(segment.end_time)}</>
                    )}
                  </span>
                )}
              </div>

              {/* Text content */}
              <p className={`text-sm ${style.text} leading-relaxed`}>
                {highlightText(segment.text, searchQuery)}
              </p>

              {/* Confidence indicator (if available) */}
              {segment.confidence !== undefined && segment.confidence < 0.8 && (
                <div className="mt-1">
                  <span className="text-xs text-orange-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Low confidence ({Math.round(segment.confidence * 100)}%)
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Live indicator */}
        {liveSegments.length > 0 && (
          <div className="flex items-center justify-center py-2">
            <span className="flex items-center gap-2 text-xs text-green-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Live transcription
            </span>
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {userScrolled && (
        <button
          onClick={() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
              setUserScrolled(false);
            }
          }}
          className="sticky bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          ↓ Scroll to bottom
        </button>
      )}
    </div>
  );
}

export default TranscriptViewer;
