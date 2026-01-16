/**
 * useEvalProgress - Progress Polling Hook
 *
 * React hook for tracking evaluation progress during async processing.
 * Provides real-time progress updates via polling.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEvalStore, selectCurrentProgress, selectIsAnyProcessing } from "../store";
import type { EvaluationStatus } from "../types";

// =============================================================================
// PROGRESS POLLING HOOK
// =============================================================================

/**
 * Hook for tracking evaluation progress
 */
export function useEvalProgress(
  token: string | null,
  workspaceId: string | null,
  evaluationId: string | null
) {
  const {
    selectedEvaluation,
    startPolling,
    stopPolling,
  } = useEvalStore();

  // Get current progress from store
  const progress = useEvalStore(selectCurrentProgress);

  // Track if polling is active
  const [isPolling, setIsPolling] = useState(false);

  // Start polling when evaluation is processing
  useEffect(() => {
    if (
      token &&
      workspaceId &&
      evaluationId &&
      selectedEvaluation?.id === evaluationId &&
      (selectedEvaluation?.status === "processing" ||
        selectedEvaluation?.status === "pending")
    ) {
      startPolling(token, workspaceId, evaluationId);
      setIsPolling(true);
    }

    return () => {
      if (evaluationId) {
        stopPolling(evaluationId);
        setIsPolling(false);
      }
    };
  }, [
    token,
    workspaceId,
    evaluationId,
    selectedEvaluation?.id,
    selectedEvaluation?.status,
    startPolling,
    stopPolling,
  ]);

  // Stop polling when completed or failed
  useEffect(() => {
    if (
      evaluationId &&
      (selectedEvaluation?.status === "completed" ||
        selectedEvaluation?.status === "failed")
    ) {
      stopPolling(evaluationId);
      setIsPolling(false);
    }
  }, [evaluationId, selectedEvaluation?.status, stopPolling]);

  // Manual start polling
  const start = useCallback(() => {
    if (token && workspaceId && evaluationId) {
      startPolling(token, workspaceId, evaluationId);
      setIsPolling(true);
    }
  }, [token, workspaceId, evaluationId, startPolling]);

  // Manual stop polling
  const stop = useCallback(() => {
    if (evaluationId) {
      stopPolling(evaluationId);
      setIsPolling(false);
    }
  }, [evaluationId, stopPolling]);

  // Current status
  const status = selectedEvaluation?.status ?? "pending";

  // Computed state
  const isProcessing = status === "processing" || status === "pending";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  return {
    progress,
    status,
    isPolling,
    isProcessing,
    isCompleted,
    isFailed,
    errorMessage: selectedEvaluation?.errorMessage,
    startedAt: selectedEvaluation?.startedAt,
    completedAt: selectedEvaluation?.completedAt,
    start,
    stop,
  };
}

// =============================================================================
// PROGRESS BAR HOOK
// =============================================================================

/**
 * Hook for progress bar display
 */
export function useProgressBar(
  token: string | null,
  workspaceId: string | null,
  evaluationId: string | null
) {
  const {
    progress,
    status,
    isProcessing,
    startedAt,
    completedAt,
  } = useEvalProgress(token, workspaceId, evaluationId);

  // Compute display values
  const displayProgress = useMemo(() => {
    if (status === "completed") return 100;
    if (status === "failed") return progress;
    if (status === "pending") return 0;
    return progress;
  }, [status, progress]);

  // Progress percentage text
  const progressText = useMemo(() => {
    return `${Math.round(displayProgress)}%`;
  }, [displayProgress]);

  // Status text
  const statusText = useMemo(() => {
    switch (status) {
      case "pending":
        return "Waiting to start...";
      case "processing":
        return "Processing...";
      case "completed":
        return "Complete";
      case "failed":
        return "Failed";
      default:
        return "Unknown";
    }
  }, [status]);

  // Color variant
  const variant = useMemo(() => {
    switch (status) {
      case "completed":
        return "success" as const;
      case "failed":
        return "error" as const;
      case "processing":
        return "primary" as const;
      default:
        return "secondary" as const;
    }
  }, [status]);

  // Estimated time remaining (rough calculation)
  const estimatedTimeRemaining = useMemo(() => {
    if (!isProcessing || !startedAt || progress === 0) return null;

    const startTime = new Date(startedAt).getTime();
    const elapsedMs = Date.now() - startTime;
    const progressFraction = progress / 100;

    if (progressFraction === 0) return null;

    const totalEstimatedMs = elapsedMs / progressFraction;
    const remainingMs = totalEstimatedMs - elapsedMs;

    // Don't show if less than 5 seconds
    if (remainingMs < 5000) return null;

    const remainingSecs = Math.round(remainingMs / 1000);
    if (remainingSecs < 60) {
      return `~${remainingSecs}s remaining`;
    }
    const remainingMins = Math.round(remainingSecs / 60);
    return `~${remainingMins}m remaining`;
  }, [isProcessing, startedAt, progress]);

  return {
    progress: displayProgress,
    progressText,
    statusText,
    variant,
    estimatedTimeRemaining,
    isProcessing,
  };
}

// =============================================================================
// ANY PROCESSING HOOK
// =============================================================================

/**
 * Hook for checking if any evaluations are processing
 */
export function useAnyProcessing() {
  const isAnyProcessing = useEvalStore(selectIsAnyProcessing);
  const { stopAllPolling } = useEvalStore();

  return {
    isAnyProcessing,
    stopAllPolling,
  };
}

// =============================================================================
// PROGRESS STEPS HOOK
// =============================================================================

/**
 * Hook for displaying progress as steps
 */
export function useProgressSteps(
  token: string | null,
  workspaceId: string | null,
  evaluationId: string | null
) {
  const { progress, status, isProcessing, isFailed, isCompleted } = useEvalProgress(
    token,
    workspaceId,
    evaluationId
  );

  // Define progress steps with thresholds
  const steps = useMemo(() => {
    return [
      {
        id: "pending",
        label: "Queued",
        threshold: 0,
        completed: progress > 0 || status !== "pending",
        active: status === "pending",
      },
      {
        id: "documents",
        label: "Analyzing Documents",
        threshold: 5,
        completed: progress >= 10,
        active: progress > 0 && progress < 10,
      },
      {
        id: "criteria",
        label: "Evaluating Criteria",
        threshold: 10,
        completed: progress >= 90,
        active: progress >= 10 && progress < 90,
      },
      {
        id: "summary",
        label: "Generating Summary",
        threshold: 90,
        completed: progress >= 100 || status === "completed",
        active: progress >= 90 && progress < 100,
      },
      {
        id: "complete",
        label: "Complete",
        threshold: 100,
        completed: status === "completed",
        active: false,
      },
    ];
  }, [progress, status]);

  // Current step
  const currentStep = useMemo(() => {
    if (isFailed) return "failed";
    if (isCompleted) return "complete";
    return steps.find((s) => s.active)?.id ?? "pending";
  }, [steps, isFailed, isCompleted]);

  // Current step index
  const currentStepIndex = useMemo(() => {
    const idx = steps.findIndex((s) => s.active);
    return idx >= 0 ? idx : isCompleted ? steps.length - 1 : 0;
  }, [steps, isCompleted]);

  return {
    steps,
    currentStep,
    currentStepIndex,
    totalSteps: steps.length,
    isFailed,
    isCompleted,
    isProcessing,
  };
}
