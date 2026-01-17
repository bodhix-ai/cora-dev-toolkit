/**
 * Module Voice - Interview Room Component
 *
 * Wrapper component for Daily.co video room embed.
 * Manages room joining, participant display, and meeting controls.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";

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
  const isDailyAvailable = typeof window !== "undefined" && (window as any).DailyIframe;

  const initializeDaily = useCallback(async () => {
    if (!containerRef.current || !roomUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isDailyAvailable) {
        // Daily.co SDK integration
        const DailyIframe = (window as any).DailyIframe;
        
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

        dailyFrame.on("error", (event: any) => {
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
        const joinOptions: any = { url: roomUrl };
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
      <div
        className={`flex items-center justify-center bg-gray-900 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white text-sm">Connecting to interview room...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-900 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center p-6">
          <div className="text-red-400 text-4xl mb-4">⚠</div>
          <p className="text-white text-sm mb-2">Failed to connect to video room</p>
          <p className="text-gray-400 text-xs mb-4">{error}</p>
          <button
            onClick={initializeDaily}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Placeholder mode (Daily SDK not available)
  if (!isDailyAvailable) {
    return (
      <div
        className={`flex flex-col bg-gray-900 rounded-lg overflow-hidden ${className}`}
        style={{ height }}
      >
        {/* Header */}
        <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
            <span className="text-white text-sm font-medium">Interview Room</span>
          </div>
          <span className="text-gray-400 text-xs">
            Session: {sessionId.slice(0, 8)}...
          </span>
        </div>

        {/* Video area placeholder */}
        <div className="flex-1 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="text-gray-500 text-6xl mb-4">🎥</div>
            <p className="text-white text-lg mb-2">Video Room</p>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              Daily.co video embed will appear here when the SDK is loaded.
            </p>
            <div className="mt-4 px-4 py-2 bg-gray-800 rounded-lg inline-block">
              <p className="text-gray-300 text-xs font-mono truncate max-w-xs">
                {roomUrl}
              </p>
            </div>
          </div>
        </div>

        {/* Controls placeholder */}
        {showControls && (
          <div className="bg-gray-800 px-4 py-3 flex items-center justify-center gap-4">
            <button
              className="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              title="Mute"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <button
              className="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              title="Toggle Video"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
              title="Leave"
              onClick={onMeetingEnd}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Daily.co embed container
  return (
    <div
      ref={containerRef}
      className={`bg-gray-900 rounded-lg overflow-hidden ${className}`}
      style={{ height }}
    />
  );
}

export default InterviewRoom;
