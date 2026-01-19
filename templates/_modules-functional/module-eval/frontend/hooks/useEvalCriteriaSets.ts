/**
 * useEvalCriteriaSets - Criteria Sets Management Hooks
 *
 * React hooks for managing criteria sets and items within an organization.
 * Wraps the Zustand store for convenient component usage.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useEvalStore, selectCriteriaSetsByDocType } from "../store";
import type {
  EvalCriteriaSet,
  EvalCriteriaItem,
  CreateCriteriaSetInput,
  UpdateCriteriaSetInput,
  ImportCriteriaSetInput,
  CreateCriteriaItemInput,
  UpdateCriteriaItemInput,
  ListCriteriaSetsOptions,
  ImportCriteriaSetResult,
} from "../types";

// =============================================================================
// CRITERIA SETS HOOKS
// =============================================================================

/**
 * Hook for managing criteria sets (Org Admin)
 */
export function useEvalCriteriaSets(
  token: string | null,
  orgId: string | null,
  options: ListCriteriaSetsOptions = {}
) {
  const {
    criteriaSets,
    criteriaSetsLoading,
    criteriaSetsError,
    loadCriteriaSets,
    createCriteriaSet,
    updateCriteriaSet,
    deleteCriteriaSet,
    importCriteriaSet,
  } = useEvalStore();

  // Load criteria sets on mount or org change
  useEffect(() => {
    if (token && orgId && criteriaSets.length === 0 && !criteriaSetsLoading) {
      loadCriteriaSets(token, orgId, options);
    }
    // Note: options and loadCriteriaSets are intentionally excluded from deps to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orgId, criteriaSets.length, criteriaSetsLoading]);

  const create = useCallback(
    async (input: CreateCriteriaSetInput): Promise<EvalCriteriaSet> => {
      if (!token || !orgId) throw new Error("No auth token or org ID");
      return createCriteriaSet(token, orgId, input);
    },
    [token, orgId, createCriteriaSet]
  );

  const update = useCallback(
    async (id: string, input: UpdateCriteriaSetInput) => {
      if (!token || !orgId) throw new Error("No auth token or org ID");
      await updateCriteriaSet(token, orgId, id, input);
    },
    [token, orgId, updateCriteriaSet]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!token || !orgId) throw new Error("No auth token or org ID");
      await deleteCriteriaSet(token, orgId, id);
    },
    [token, orgId, deleteCriteriaSet]
  );

  const importFromFile = useCallback(
    async (input: ImportCriteriaSetInput): Promise<ImportCriteriaSetResult> => {
      if (!token || !orgId) throw new Error("No auth token or org ID");
      return importCriteriaSet(token, orgId, input);
    },
    [token, orgId, importCriteriaSet]
  );

  const refresh = useCallback(async () => {
    if (!token || !orgId) return;
    await loadCriteriaSets(token, orgId, options);
    // Note: options and loadCriteriaSets are intentionally excluded from deps to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orgId]);

  // Get criteria sets by doc type
  const getByDocType = useCallback(
    (docTypeId: string) => criteriaSets.filter((cs) => cs.docTypeId === docTypeId && cs.isActive),
    [criteriaSets]
  );

  // Get criteria set by ID
  const getById = useCallback(
    (id: string) => criteriaSets.find((cs) => cs.id === id),
    [criteriaSets]
  );

  return {
    criteriaSets,
    isLoading: criteriaSetsLoading,
    error: criteriaSetsError,
    create,
    update,
    remove,
    importFromFile,
    refresh,
    getByDocType,
    getById,
  };
}

/**
 * Hook for criteria sets filtered by doc type
 */
export function useEvalCriteriaSetsByDocType(
  token: string | null,
  orgId: string | null,
  docTypeId: string | null
) {
  const { criteriaSets, criteriaSetsLoading, loadCriteriaSets } = useEvalStore();

  // Load criteria sets for doc type
  useEffect(() => {
    if (token && orgId && docTypeId) {
      loadCriteriaSets(token, orgId, { docTypeId });
    }
    // Note: loadCriteriaSets is intentionally excluded from deps to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orgId, docTypeId]);

  // Filter criteria sets by doc type using selector
  const filteredSets = useEvalStore(
    docTypeId ? selectCriteriaSetsByDocType(docTypeId) : () => []
  );

  return {
    criteriaSets: filteredSets,
    isLoading: criteriaSetsLoading,
  };
}

/**
 * Hook for selecting a single criteria set with items
 */
export function useEvalCriteriaSet(
  token: string | null,
  orgId: string | null,
  criteriaSetId: string | null
) {
  const {
    selectedCriteriaSet,
    criteriaSetsLoading,
    selectCriteriaSet,
    clearSelectedCriteriaSet,
  } = useEvalStore();

  // Load criteria set when ID changes
  useEffect(() => {
    if (token && orgId && criteriaSetId) {
      selectCriteriaSet(token, orgId, criteriaSetId);
    }
    return () => {
      clearSelectedCriteriaSet();
    };
  }, [token, orgId, criteriaSetId, selectCriteriaSet, clearSelectedCriteriaSet]);

  return {
    criteriaSet: selectedCriteriaSet,
    items: selectedCriteriaSet?.items ?? [],
    isLoading: criteriaSetsLoading,
    clear: clearSelectedCriteriaSet,
  };
}

/**
 * Hook for criteria set selection in forms/dropdowns
 */
export function useCriteriaSetSelect(
  token: string | null,
  orgId: string | null,
  docTypeId: string | null,
  options: { activeOnly?: boolean } = {}
) {
  const { activeOnly = true } = options;

  const { criteriaSets, criteriaSetsLoading, loadCriteriaSets } = useEvalStore();

  // Load criteria sets if doc type provided
  useEffect(() => {
    if (token && orgId && docTypeId) {
      loadCriteriaSets(token, orgId, { docTypeId, includeInactive: !activeOnly });
    }
    // Note: loadCriteriaSets is intentionally excluded from deps to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orgId, docTypeId, activeOnly]);

  // Filter to doc type and active
  const selectOptions = useMemo(() => {
    let filtered = criteriaSets.filter((cs) => cs.docTypeId === docTypeId);
    if (activeOnly) {
      filtered = filtered.filter((cs) => cs.isActive);
    }

    return filtered.map((cs) => ({
      value: cs.id,
      label: cs.name,
      version: cs.version,
      itemCount: cs.itemCount,
    }));
  }, [criteriaSets, docTypeId, activeOnly]);

  return {
    options: selectOptions,
    isLoading: criteriaSetsLoading,
    criteriaSets: criteriaSets.filter((cs) => cs.docTypeId === docTypeId),
  };
}

// =============================================================================
// CRITERIA ITEMS HOOKS
// =============================================================================

/**
 * Hook for managing criteria items within a criteria set
 */
export function useEvalCriteriaItems(
  token: string | null,
  orgId: string | null,
  criteriaSetId: string | null
) {
  const {
    selectedCriteriaSet,
    criteriaSetsLoading,
    addCriteriaItem,
    updateCriteriaItem,
    deleteCriteriaItem,
    selectCriteriaSet,
  } = useEvalStore();

  // Load criteria set with items
  useEffect(() => {
    if (token && orgId && criteriaSetId) {
      selectCriteriaSet(token, orgId, criteriaSetId);
    }
    // Note: selectCriteriaSet is intentionally excluded from deps to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orgId, criteriaSetId]);

  const items = selectedCriteriaSet?.items ?? [];

  const add = useCallback(
    async (input: CreateCriteriaItemInput): Promise<void> => {
      if (!token || !orgId || !criteriaSetId)
        throw new Error("No auth token, org ID, or criteria set ID");
      await addCriteriaItem(token, orgId, criteriaSetId, input);
    },
    [token, orgId, criteriaSetId, addCriteriaItem]
  );

  const update = useCallback(
    async (id: string, input: UpdateCriteriaItemInput) => {
      if (!token || !orgId) throw new Error("No auth token or org ID");
      await updateCriteriaItem(token, orgId, id, input);
    },
    [token, orgId, updateCriteriaItem]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!token || !orgId) throw new Error("No auth token or org ID");
      await deleteCriteriaItem(token, orgId, id);
    },
    [token, orgId, deleteCriteriaItem]
  );

  // Get items by category
  const getByCategory = useCallback(
    (category: string) => items.filter((item) => item.category === category),
    [items]
  );

  // Get unique categories
  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category).filter(Boolean))] as string[],
    [items]
  );

  // Get item by ID
  const getById = useCallback(
    (id: string) => items.find((item) => item.id === id),
    [items]
  );

  return {
    items,
    isLoading: criteriaSetsLoading,
    add,
    update,
    remove,
    getByCategory,
    getById,
    categories,
  };
}
