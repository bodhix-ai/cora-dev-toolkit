/**
 * Module Voice - Interview Room Component
 *
 * Wrapper component for Daily.co video room embed.
 * Manages room joining, participant display, and meeting controls.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Typography,
  Alert,
} from "@mui/material";
import {
  Mic,
  Videocam,
  CallEnd,
} from "@mui/icons-material";

// =============================================================================
// PROPS
// =============================================================================

export interface InterviewRoomProps {
  /** Daily.co room URL */
  roomUrl: string;
  /** Room token for authentication (optional) */
  roomToken?: string;
  /** Session ID for tracking */
  sessionId: string;
  /** Handler for when participant joins */
  onJoin?: () => void;
  /** Handler for when participant leaves */
  onLeave?: () => void;
  /** Handler for errors */
  onError?: (error: Error) => void;
  /** Handler for meeting end */
  onMeetingEnd?: () => void;
  /** Whether to show controls */
  showControls?: boolean;
  /** Custom className */
  className?: string;
  /** Height of the room */
  height?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Interview Room Component
 *
 * Embeds a Daily.co video room for voice interviews.
 * 
 * Note: This component requires the Daily.co SDK to be installed.
 * In production, use: `npm install @daily-co/daily-js`
 *
 * @example
 * ```tsx
 * <InterviewRoom
 *   roomUrl={session.dailyRoomUrl}
 *   roomToken={session.dailyRoomToken}
 *   sessionId={session.id}
 *   onJoin={() => console.log('Joined room')}
 *   onMeetingEnd={() => handleMeetingEnd()}
 * />
 * ```
 */
export function InterviewRoom({
  roomUrl,
  roomToken,
  sessionId,
  onJoin,
  onLeave,
  onError,
  onMeetingEnd,
  showControls = true,
  className = "",
  height = "500px",
}: InterviewRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  // Note: In production, you would import Daily from '@daily-co/daily-js'
  // For now, this is a placeholder that shows the room info
  interface WindowWithDaily extends Window {
    DailyIframe?: unknown;
  }
  const isDailyAvailable = typeof window !== "undefined" && (window as WindowWithDaily).DailyIframe;

  const initializeDaily = useCallback(async () => {
    if (!containerRef.current || !roomUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isDailyAvailable) {
        // Daily.co SDK integration
        const DailyIframe = (window as WindowWithDaily).DailyIframe;
        
        const dailyFrame = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: {
            width: "100%",
            height: "100%",
            border: "0",
            borderRadius: "8px",
          },
          showLeaveButton: showControls,
          showFullscreenButton: showControls,
        });

        // Set up event handlers
        dailyFrame.on("joined-meeting", () => {
          setIsJoined(true);
          setIsLoading(false);
          onJoin?.();
        });

        dailyFrame.on("left-meeting", () => {
          setIsJoined(false);
          onLeave?.();
        });

        dailyFrame.on("error", (event: { errorMsg?: string }) => {
          const err = new Error(event.errorMsg || "Unknown Daily.co error");
          setError(err.message);
          onError?.(err);
        });

        dailyFrame.on("participant-joined", () => {
          setParticipantCount((prev) => prev + 1);
        });

        dailyFrame.on("participant-left", () => {
          setParticipantCount((prev) => Math.max(0, prev - 1));
        });

        // Join the room
        interface JoinOptions {
          url: string;
          token?: string;
        }
        const joinOptions: JoinOptions = { url: roomUrl };
        if (roomToken) {
          joinOptions.token = roomToken;
        }

        await dailyFrame.join(joinOptions);
      } else {
        // Placeholder mode - Daily.co SDK not available
        setIsLoading(false);
        console.warn("Daily.co SDK not loaded. Using placeholder mode.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize video room";
      setError(errorMessage);
      setIsLoading(false);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [roomUrl, roomToken, showControls, isDailyAvailable, onJoin, onLeave, onError]);

  useEffect(() => {
    initializeDaily();
  }, [initializeDaily]);

  // Loading state
  if (isLoading) {
    return (
      <Box
        className={className}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "grey.900",
          borderRadius: 1,
          height,
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress sx={{ mb: 2, color: "common.white" }} />
          <Typography variant="body2" color="common.white">
            Connecting to interview room...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box
        className={className}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "grey.900",
          borderRadius: 1,
          height,
        }}
      >
        <Box sx={{ textAlign: "center", p: 3 }}>
          <Typography variant="h3" color="error.light" sx={{ mb: 2 }}>
            ⚠
          </Typography>
          <Typography variant="body2" color="common.white" sx={{ mb: 1 }}>
            Failed to connect to video room
          </Typography>
          <Typography variant="caption" color="grey.400" sx={{ mb: 2, display: "block" }}>
            {error}
          </Typography>
          <Button
            onClick={initializeDaily}
            variant="contained"
            size="small"
          >
            Retry
          </Button>
        </Box>
      </Box>
    );
  }

  // Placeholder mode (Daily SDK not available)
  if (!isDailyAvailable) {
    return (
      <Box
        className={className}
        sx={{
          display: "flex",
          flexDirection: "column",
          bgcolor: "grey.900",
          borderRadius: 1,
          overflow: "hidden",
          height,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            bgcolor: "grey.800",
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                bgcolor: "success.main",
                animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "@keyframes pulse": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.5 },
                },
              }}
            />
            <Typography variant="body2" color="common.white" fontWeight="medium">
              Interview Room
            </Typography>
          </Box>
          <Typography variant="caption" color="grey.400">
            Session: {sessionId.slice(0, 8)}...
          </Typography>
        </Box>

        {/* Video area placeholder */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "grey.900",
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <Box sx={{ fontSize: "4rem", mb: 2 }} role="img" aria-label="Video camera">
              🎥
            </Box>
            <Typography variant="h2" color="common.white" sx={{ mb: 1 }}>
              Video Room
            </Typography>
            <Typography
              variant="body2"
              color="grey.400"
              sx={{ maxWidth: 300, mx: "auto" }}
            >
              Daily.co video embed will appear here when the SDK is loaded.
            </Typography>
            <Box
              sx={{
                mt: 2,
                px: 2,
                py: 1,
                bgcolor: "grey.800",
                borderRadius: 1,
                display: "inline-block",
              }}
            >
              <Typography
                variant="caption"
                color="grey.300"
                sx={{
                  fontFamily: "monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 300,
                  display: "block",
                }}
              >
                {roomUrl}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Controls placeholder */}
        {showControls && (
          <Box
            sx={{
              bgcolor: "grey.800",
              px: 2,
              py: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <IconButton
              sx={{
                bgcolor: "grey.700",
                color: "common.white",
                "&:hover": { bgcolor: "grey.600" },
              }}
              aria-label="Mute microphone"
              title="Mute"
            >
              <Mic />
            </IconButton>
            <IconButton
              sx={{
                bgcolor: "grey.700",
                color: "common.white",
                "&:hover": { bgcolor: "grey.600" },
              }}
              aria-label="Toggle video camera"
              title="Toggle Video"
            >
              <Videocam />
            </IconButton>
            <IconButton
              sx={{
                bgcolor: "error.main",
                color: "common.white",
                "&:hover": { bgcolor: "error.dark" },
              }}
              aria-label="Leave meeting"
              title="Leave"
              onClick={onMeetingEnd}
            >
              <CallEnd />
            </IconButton>
          </Box>
        )}
      </Box>
    );
  }

  // Daily.co embed container
  return (
    <Box
      ref={containerRef}
      className={className}
      sx={{
        bgcolor: "grey.900",
        borderRadius: 1,
        overflow: "hidden",
        height,
      }}
    />
  );
}

export default InterviewRoom;
