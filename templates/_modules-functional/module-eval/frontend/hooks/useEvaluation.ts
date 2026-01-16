/**
 * useEvaluation - Single Evaluation Management Hook
 *
 * React hook for viewing and editing a single evaluation with results.
 * Wraps the Zustand store for convenient component usage.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useEvalStore, selectCurrentProgress } from "../store";
import type {
  Evaluation,
  CriteriaResultWithItem,
  EvalResultEdit,
  EditResultInput,
  StatusOption,
} from "../types";

// =============================================================================
// SINGLE EVALUATION HOOK
// =============================================================================

/**
 * Hook for managing a single evaluation (User)
 */
export function useEvaluation(
  token: string | null,
  workspaceId: string | null,
  evaluationId: string | null
) {
  const {
    selectedEvaluation,
    evaluationsLoading,
    evaluationsError,
    selectEvaluation,
    clearSelectedEvaluation,
    editResult,
    getEditHistory,
    startPolling,
    stopPolling,
  } = useEvalStore();

  // Load evaluation when ID changes
  useEffect(() => {
    if (token && workspaceId && evaluationId) {
      selectEvaluation(token, workspaceId, evaluationId);
    }
    return () => {
      clearSelectedEvaluation();
    };
  }, [token, workspaceId, evaluationId, selectEvaluation, clearSelectedEvaluation]);

  // Edit a criteria result
  const edit = useCallback(
    async (resultId: string, input: EditResultInput) => {
      if (!token || !workspaceId || !evaluationId)
        throw new Error("No auth token, workspace ID, or evaluation ID");
      await editResult(token, workspaceId, evaluationId, resultId, input);
    },
    [token, workspaceId, evaluationId, editResult]
  );

  // Get edit history for a result
  const getHistory = useCallback(
    async (resultId: string): Promise<EvalResultEdit[]> => {
      if (!token || !workspaceId || !evaluationId)
        throw new Error("No auth token, workspace ID, or evaluation ID");
      return getEditHistory(token, workspaceId, evaluationId, resultId);
    },
    [token, workspaceId, evaluationId, getEditHistory]
  );

  // Refresh evaluation
  const refresh = useCallback(async () => {
    if (!token || !workspaceId || !evaluationId) return;
    await selectEvaluation(token, workspaceId, evaluationId);
  }, [token, workspaceId, evaluationId, selectEvaluation]);

  // Current progress
  const progress = useEvalStore(selectCurrentProgress);

  // Is evaluation processing?
  const isProcessing =
    selectedEvaluation?.status === "processing" ||
    selectedEvaluation?.status === "pending";

  // Is evaluation completed?
  const isCompleted = selectedEvaluation?.status === "completed";

  // Is evaluation failed?
  const isFailed = selectedEvaluation?.status === "failed";

  return {
    evaluation: selectedEvaluation,
    isLoading: evaluationsLoading,
    error: evaluationsError,
    progress,
    isProcessing,
    isCompleted,
    isFailed,
    edit,
    getHistory,
    refresh,
    clear: clearSelectedEvaluation,
  };
}

// =============================================================================
// EVALUATION RESULTS HOOK
// =============================================================================

/**
 * Hook for accessing evaluation results with filtering
 */
export function useEvaluationResults(
  token: string | null,
  workspaceId: string | null,
  evaluationId: string | null
) {
  const { evaluation } = useEvaluation(token, workspaceId, evaluationId);

  const results = evaluation?.criteriaResults ?? [];

  // Group results by category
  const resultsByCategory = useMemo(() => {
    const grouped: Record<string, CriteriaResultWithItem[]> = {};

    results.forEach((result) => {
      const category = result.criteriaItem.category ?? "Uncategorized";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(result);
    });

    return grouped;
  }, [results]);

  // Get unique categories
  const categories = useMemo(
    () => Object.keys(resultsByCategory),
    [resultsByCategory]
  );

  // Get results by status
  const getByStatus = useCallback(
    (statusId: string) =>
      results.filter((r) => {
        const effectiveStatusId = r.currentEdit?.editedStatusId ?? r.aiResult?.statusId;
        return effectiveStatusId === statusId;
      }),
    [results]
  );

  // Get edited results only
  const editedResults = useMemo(
    () => results.filter((r) => r.hasEdit),
    [results]
  );

  // Get unedited results
  const uneditedResults = useMemo(
    () => results.filter((r) => !r.hasEdit),
    [results]
  );

  // Get result by criteria item ID
  const getByCriteriaItemId = useCallback(
    (criteriaItemId: string) =>
      results.find((r) => r.criteriaItem.id === criteriaItemId),
    [results]
  );

  return {
    results,
    resultsByCategory,
    categories,
    editedResults,
    uneditedResults,
    getByStatus,
    getByCriteriaItemId,
    count: results.length,
    editedCount: editedResults.length,
  };
}

// =============================================================================
// EVALUATION SUMMARY HOOK
// =============================================================================

/**
 * Hook for evaluation summary data
 */
export function useEvaluationSummary(
  token: string | null,
  workspaceId: string | null,
  evaluationId: string | null
) {
  const { evaluation, isCompleted } = useEvaluation(token, workspaceId, evaluationId);

  const summary = useMemo(() => {
    if (!evaluation || !isCompleted) {
      return null;
    }

    return {
      docSummary: evaluation.docSummary,
      evalSummary: evaluation.evalSummary,
      complianceScore: evaluation.complianceScore,
      documentCount: evaluation.documentCount ?? evaluation.documents?.length ?? 0,
      criteriaCount: evaluation.criteriaResults?.length ?? 0,
      startedAt: evaluation.startedAt,
      completedAt: evaluation.completedAt,
    };
  }, [evaluation, isCompleted]);

  return summary;
}

// =============================================================================
// EVALUATION DOCUMENTS HOOK
// =============================================================================

/**
 * Hook for evaluation document details
 */
export function useEvaluationDocuments(
  token: string | null,
  workspaceId: string | null,
  evaluationId: string | null
) {
  const { evaluation } = useEvaluation(token, workspaceId, evaluationId);

  const documents = evaluation?.documents ?? [];

  // Get primary document
  const primaryDocument = useMemo(
    () => documents.find((d) => d.isPrimary),
    [documents]
  );

  // Get supporting documents
  const supportingDocuments = useMemo(
    () => documents.filter((d) => !d.isPrimary),
    [documents]
  );

  return {
    documents,
    primaryDocument,
    supportingDocuments,
    count: documents.length,
  };
}

// =============================================================================
// EVALUATION CITATIONS HOOK
// =============================================================================

/**
 * Hook for aggregating citations from evaluation results
 */
export function useEvaluationCitations(
  token: string | null,
  workspaceId: string | null,
  evaluationId: string | null
) {
  const { results } = useEvaluationResults(token, workspaceId, evaluationId);

  // Aggregate all citations
  const allCitations = useMemo(() => {
    const citations: Array<{
      text: string;
      source?: string;
      criteriaId: string;
      criteriaRequirement: string;
    }> = [];

    results.forEach((result) => {
      const criteriaId = result.criteriaItem.criteriaId;
      const criteriaRequirement = result.criteriaItem.requirement;

      result.aiResult?.citations.forEach((citation) => {
        citations.push({
          ...citation,
          criteriaId,
          criteriaRequirement,
        });
      });
    });

    return citations;
  }, [results]);

  // Group citations by source
  const citationsBySource = useMemo(() => {
    const grouped: Record<string, typeof allCitations> = {};

    allCitations.forEach((citation) => {
      const source = citation.source ?? "Unknown";
      if (!grouped[source]) {
        grouped[source] = [];
      }
      grouped[source].push(citation);
    });

    return grouped;
  }, [allCitations]);

  // Get unique sources
  const sources = useMemo(
    () => Object.keys(citationsBySource),
    [citationsBySource]
  );

  return {
    citations: allCitations,
    citationsBySource,
    sources,
    count: allCitations.length,
  };
}
