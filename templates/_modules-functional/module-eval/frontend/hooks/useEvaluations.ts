/**
 * useEvaluations - Evaluations List Management Hook
 *
 * React hook for listing and creating evaluations within a workspace.
 * Wraps the Zustand store for convenient component usage.
 */

import { useCallback, useEffect, useMemo } from "react";
import {
  useEvalStore,
  selectProcessingEvaluations,
  selectCompletedEvaluations,
  selectFailedEvaluations,
  selectEvaluationsByDocType,
  selectIsAnyProcessing,
} from "../store";
import type {
  Evaluation,
  CreateEvaluationInput,
  ListEvaluationsOptions,
  EvaluationStatus,
} from "../types";

// =============================================================================
// EVALUATIONS LIST HOOK
// =============================================================================

/**
 * Hook for managing evaluations list (User)
 */
export function useEvaluations(
  token: string | null,
  workspaceId: string | null,
  options: ListEvaluationsOptions = {}
) {
  const {
    evaluations,
    evaluationsLoading,
    evaluationsError,
    evaluationsPagination,
    evaluationFilters,
    loadEvaluations,
    loadMoreEvaluations,
    createEvaluation,
    deleteEvaluation,
    setEvaluationFilters,
  } = useEvalStore();

  // Load evaluations on mount or workspace change
  useEffect(() => {
    if (token && workspaceId) {
      loadEvaluations(token, workspaceId, options);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, workspaceId]);

  const create = useCallback(
    async (input: CreateEvaluationInput): Promise<Evaluation> => {
      if (!token || !workspaceId) throw new Error("No auth token or workspace ID");
      return createEvaluation(token, workspaceId, input);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, workspaceId]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!token || !workspaceId) throw new Error("No auth token or workspace ID");
      await deleteEvaluation(token, workspaceId, id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, workspaceId]
  );

  const loadMore = useCallback(async () => {
    if (!token || !workspaceId) return;
    await loadMoreEvaluations(token, workspaceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, workspaceId]);

  const refresh = useCallback(async () => {
    if (!token || !workspaceId) return;
    await loadEvaluations(token, workspaceId, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, workspaceId, options]);

  // Set filters
  const setFilters = useCallback(
    (filters: Partial<ListEvaluationsOptions>) => {
      setEvaluationFilters(filters);
      if (token && workspaceId) {
        loadEvaluations(token, workspaceId, { ...options, ...filters });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, workspaceId, options]
  );

  // Filter by status
  const setStatusFilter = useCallback(
    (status: EvaluationStatus | undefined) => {
      setFilters({ status });
    },
    [setFilters]
  );

  // Filter by doc type
  const setDocTypeFilter = useCallback(
    (docTypeId: string | undefined) => {
      setFilters({ docTypeId });
    },
    [setFilters]
  );

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({ status: undefined, docTypeId: undefined });
  }, [setFilters]);

  // Get evaluation by ID
  const getById = useCallback(
    (id: string) => evaluations.find((e) => e.id === id),
    [evaluations]
  );

  return {
    evaluations,
    isLoading: evaluationsLoading,
    error: evaluationsError,
    pagination: evaluationsPagination,
    filters: evaluationFilters,
    create,
    remove,
    loadMore,
    refresh,
    setFilters,
    setStatusFilter,
    setDocTypeFilter,
    clearFilters,
    getById,
    hasMore: evaluationsPagination.hasMore,
  };
}

// =============================================================================
// EVALUATIONS BY STATUS HOOKS
// =============================================================================

/**
 * Hook for getting processing evaluations
 */
export function useProcessingEvaluations() {
  const evaluations = useEvalStore(selectProcessingEvaluations);
  const isAnyProcessing = useEvalStore(selectIsAnyProcessing);

  return {
    evaluations,
    isAnyProcessing,
    count: evaluations.length,
  };
}

/**
 * Hook for getting completed evaluations
 */
export function useCompletedEvaluations() {
  const evaluations = useEvalStore(selectCompletedEvaluations);

  return {
    evaluations,
    count: evaluations.length,
  };
}

/**
 * Hook for getting failed evaluations
 */
export function useFailedEvaluations() {
  const evaluations = useEvalStore(selectFailedEvaluations);

  return {
    evaluations,
    count: evaluations.length,
  };
}

/**
 * Hook for getting evaluations by doc type
 */
export function useEvaluationsByDocType(docTypeId: string | null) {
  const evaluations = useEvalStore(
    docTypeId ? selectEvaluationsByDocType(docTypeId) : () => []
  );

  return {
    evaluations,
    count: evaluations.length,
  };
}

// =============================================================================
// EVALUATION STATS HOOK
// =============================================================================

/**
 * Hook for evaluation statistics
 */
export function useEvaluationStats() {
  const { evaluations } = useEvalStore();

  const stats = useMemo(() => {
    const total = evaluations.length;
    const pending = evaluations.filter((e) => e.status === "pending").length;
    const processing = evaluations.filter((e) => e.status === "processing").length;
    const completed = evaluations.filter((e) => e.status === "completed").length;
    const failed = evaluations.filter((e) => e.status === "failed").length;

    // Average compliance score for completed evaluations
    const completedWithScore = evaluations.filter(
      (e) => e.status === "completed" && e.complianceScore !== undefined
    );
    const avgComplianceScore =
      completedWithScore.length > 0
        ? completedWithScore.reduce((sum, e) => sum + (e.complianceScore ?? 0), 0) /
          completedWithScore.length
        : null;

    return {
      total,
      pending,
      processing,
      completed,
      failed,
      avgComplianceScore,
      hasActive: pending > 0 || processing > 0,
    };
  }, [evaluations]);

  return stats;
}
