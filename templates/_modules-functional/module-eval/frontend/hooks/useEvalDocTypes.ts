/**
 * useEvalDocTypes - Document Types Management Hooks
 *
 * React hooks for managing document types within an organization.
 * Wraps the Zustand store for convenient component usage.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useEvalStore, selectActiveDocTypes } from "../store";
import type {
  EvalDocType,
  CreateDocTypeInput,
  UpdateDocTypeInput,
  ListDocTypesOptions,
} from "../types";

// =============================================================================
// DOC TYPES HOOKS
// =============================================================================

/**
 * Hook for managing document types (Org Admin)
 */
export function useEvalDocTypes(
  token: string | null,
  orgId: string | null,
  options: ListDocTypesOptions = {}
) {
  const {
    docTypes,
    docTypesLoading,
    docTypesError,
    loadDocTypes,
    createDocType,
    updateDocType,
    deleteDocType,
  } = useEvalStore();

  // Load doc types on mount or org change
  useEffect(() => {
    if (token && orgId && docTypes.length === 0 && !docTypesLoading) {
      loadDocTypes(token, orgId, options);
    }
    // Note: options and loadDocTypes are intentionally excluded from deps to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orgId, docTypes.length, docTypesLoading]);

  const create = useCallback(
    async (input: CreateDocTypeInput): Promise<EvalDocType> => {
      if (!token || !orgId) throw new Error("No auth token or org ID");
      return createDocType(token, orgId, input);
    },
    [token, orgId, createDocType]
  );

  const update = useCallback(
    async (id: string, input: UpdateDocTypeInput) => {
      if (!token || !orgId) throw new Error("No auth token or org ID");
      await updateDocType(token, orgId, id, input);
    },
    [token, orgId, updateDocType]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!token || !orgId) throw new Error("No auth token or org ID");
      await deleteDocType(token, orgId, id);
    },
    [token, orgId, deleteDocType]
  );

  const refresh = useCallback(async () => {
    if (!token || !orgId) return;
    await loadDocTypes(token, orgId, options);
    // Note: options and loadDocTypes are intentionally excluded from deps to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orgId]);

  // Filter active doc types
  const activeDocTypes = useEvalStore(selectActiveDocTypes);

  // Get doc type by ID
  const getById = useCallback(
    (id: string) => docTypes.find((dt) => dt.id === id),
    [docTypes]
  );

  return {
    docTypes,
    activeDocTypes,
    isLoading: docTypesLoading,
    error: docTypesError,
    create,
    update,
    remove,
    refresh,
    getById,
  };
}

/**
 * Hook for selecting a single document type
 */
export function useEvalDocType(
  token: string | null,
  orgId: string | null,
  docTypeId: string | null
) {
  const {
    selectedDocType,
    docTypesLoading,
    selectDocType,
    clearSelectedDocType,
  } = useEvalStore();

  // Load doc type when ID changes
  useEffect(() => {
    if (token && orgId && docTypeId) {
      selectDocType(token, orgId, docTypeId);
    }
    return () => {
      clearSelectedDocType();
    };
  }, [token, orgId, docTypeId, selectDocType, clearSelectedDocType]);

  return {
    docType: selectedDocType,
    isLoading: docTypesLoading,
    clear: clearSelectedDocType,
  };
}

/**
 * Hook for doc type selection in forms/dropdowns
 */
export function useDocTypeSelect(
  token: string | null,
  orgId: string | null,
  options: { activeOnly?: boolean } = {}
) {
  const { activeOnly = true } = options;

  const { docTypes, docTypesLoading, loadDocTypes } = useEvalStore();

  // Load doc types if not already loaded
  useEffect(() => {
    if (token && orgId && docTypes.length === 0 && !docTypesLoading) {
      loadDocTypes(token, orgId, { includeInactive: !activeOnly });
    }
    // Note: loadDocTypes is intentionally excluded from deps to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orgId, docTypes.length, docTypesLoading, activeOnly]);

  // Filter to active only if requested
  const selectOptions = useMemo(() => {
    const filtered = activeOnly
      ? docTypes.filter((dt) => dt.isActive)
      : docTypes;

    return filtered.map((dt) => ({
      value: dt.id,
      label: dt.name,
      description: dt.description,
    }));
  }, [docTypes, activeOnly]);

  return {
    options: selectOptions,
    isLoading: docTypesLoading,
    docTypes: activeOnly ? docTypes.filter((dt) => dt.isActive) : docTypes,
  };
}
