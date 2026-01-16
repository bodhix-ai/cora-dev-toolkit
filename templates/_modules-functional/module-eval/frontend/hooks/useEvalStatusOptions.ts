/**
 * useEvalStatusOptions - Status Options Management Hooks
 *
 * React hooks for managing status options at system and org levels.
 * Wraps the Zustand store for convenient component usage.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useEvalStore } from "../store";
import type {
  EvalSysStatusOption,
  EvalOrgStatusOption,
  StatusOption,
  StatusOptionInput,
  StatusOptionMode,
  ListStatusOptionsOptions,
} from "../types";

// =============================================================================
// SYSTEM STATUS OPTIONS HOOKS
// =============================================================================

/**
 * Hook for system-level status options (Sys Admin)
 */
export function useSysStatusOptions(token: string | null) {
  const {
    sysStatusOptions,
    sysConfigLoading,
    loadSysStatusOptions,
    createSysStatusOption,
    updateSysStatusOption,
    deleteSysStatusOption,
  } = useEvalStore();

  // Load status options on mount
  useEffect(() => {
    if (token && sysStatusOptions.length === 0 && !sysConfigLoading) {
      loadSysStatusOptions(token);
    }
  }, [token, sysStatusOptions.length, sysConfigLoading, loadSysStatusOptions]);

  const create = useCallback(
    async (input: StatusOptionInput) => {
      if (!token) throw new Error("No auth token");
      await createSysStatusOption(token, input);
    },
    [token, createSysStatusOption]
  );

  const update = useCallback(
    async (id: string, input: StatusOptionInput) => {
      if (!token) throw new Error("No auth token");
      await updateSysStatusOption(token, id, input);
    },
    [token, updateSysStatusOption]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!token) throw new Error("No auth token");
      await deleteSysStatusOption(token, id);
    },
    [token, deleteSysStatusOption]
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    await loadSysStatusOptions(token);
  }, [token, loadSysStatusOptions]);

  // Filter by mode
  const getByMode = useCallback(
    (mode: StatusOptionMode) =>
      sysStatusOptions.filter((o) => o.mode === mode || o.mode === "both"),
    [sysStatusOptions]
  );

  // Get boolean mode options
  const booleanOptions = useMemo(
    () => sysStatusOptions.filter((o) => o.mode === "boolean" || o.mode === "both"),
    [sysStatusOptions]
  );

  // Get detailed mode options
  const detailedOptions = useMemo(
    () => sysStatusOptions.filter((o) => o.mode === "detailed" || o.mode === "both"),
    [sysStatusOptions]
  );

  return {
    options: sysStatusOptions,
    booleanOptions,
    detailedOptions,
    isLoading: sysConfigLoading,
    create,
    update,
    remove,
    refresh,
    getByMode,
  };
}

// =============================================================================
// ORG STATUS OPTIONS HOOKS
// =============================================================================

/**
 * Hook for organization-level status options (Org Admin)
 */
export function useOrgStatusOptions(
  token: string | null,
  orgId: string | null,
  options: ListStatusOptionsOptions = {}
) {
  const {
    orgStatusOptions,
    orgConfigLoading,
    loadOrgStatusOptions,
    createOrgStatusOption,
    updateOrgStatusOption,
    deleteOrgStatusOption,
  } = useEvalStore();

  // Load status options on mount or org change
  useEffect(() => {
    if (token && orgId && orgStatusOptions.length === 0 && !orgConfigLoading) {
      loadOrgStatusOptions(token, orgId);
    }
  }, [token, orgId, orgStatusOptions.length, orgConfigLoading, loadOrgStatusOptions]);

  const create = useCallback(
    async (input: StatusOptionInput) => {
      if (!token || !orgId) throw new Error("No auth token or org ID");
      await createOrgStatusOption(token, orgId, input);
    },
    [token, orgId, createOrgStatusOption]
  );

  const update = useCallback(
    async (id: string, input: StatusOptionInput) => {
      if (!token || !orgId) throw new Error("No auth token or org ID");
      await updateOrgStatusOption(token, orgId, id, input);
    },
    [token, orgId, updateOrgStatusOption]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!token || !orgId) throw new Error("No auth token or org ID");
      await deleteOrgStatusOption(token, orgId, id);
    },
    [token, orgId, deleteOrgStatusOption]
  );

  const refresh = useCallback(async () => {
    if (!token || !orgId) return;
    await loadOrgStatusOptions(token, orgId);
  }, [token, orgId, loadOrgStatusOptions]);

  // Filter active options
  const activeOptions = useMemo(
    () => orgStatusOptions.filter((o) => o.isActive),
    [orgStatusOptions]
  );

  // Filter by mode
  const getByMode = useCallback(
    (mode: StatusOptionMode) =>
      orgStatusOptions.filter(
        (o) => o.isActive && (o.mode === mode || o.mode === "both")
      ),
    [orgStatusOptions]
  );

  return {
    options: orgStatusOptions,
    activeOptions,
    isLoading: orgConfigLoading,
    create,
    update,
    remove,
    refresh,
    getByMode,
  };
}

// =============================================================================
// ACTIVE STATUS OPTIONS HOOK
// =============================================================================

/**
 * Hook for getting effective status options (org overrides or sys defaults)
 * Used in evaluation forms and results display
 */
export function useActiveStatusOptions(
  token: string | null,
  orgId: string | null
) {
  const {
    activeStatusOptions,
    loadActiveStatusOptions,
    orgConfig,
    sysConfig,
  } = useEvalStore();

  // Load active status options
  useEffect(() => {
    if (token && orgId) {
      loadActiveStatusOptions(token, orgId);
    }
  }, [token, orgId, loadActiveStatusOptions]);

  // Determine effective categorical mode
  const categoricalMode = useMemo(() => {
    if (orgConfig?.categoricalMode) {
      return orgConfig.categoricalMode;
    }
    return sysConfig?.categoricalMode ?? "boolean";
  }, [orgConfig, sysConfig]);

  // Filter options by current mode
  const effectiveOptions = useMemo(() => {
    // activeStatusOptions are already resolved (org or sys)
    return activeStatusOptions;
  }, [activeStatusOptions]);

  // Get option by ID
  const getOptionById = useCallback(
    (id: string) => activeStatusOptions.find((o) => o.id === id),
    [activeStatusOptions]
  );

  // Get option by name (for display)
  const getOptionByName = useCallback(
    (name: string) => activeStatusOptions.find((o) => o.name === name),
    [activeStatusOptions]
  );

  return {
    options: effectiveOptions,
    categoricalMode,
    getOptionById,
    getOptionByName,
  };
}

// =============================================================================
// STATUS OPTION SELECT HOOK
// =============================================================================

/**
 * Hook for status option selection in forms/dropdowns
 */
export function useStatusOptionSelect(
  token: string | null,
  orgId: string | null
) {
  const { options, categoricalMode } = useActiveStatusOptions(token, orgId);

  // Convert to select options format
  const selectOptions = useMemo(
    () =>
      options.map((o) => ({
        value: o.id,
        label: o.name,
        color: o.color,
        scoreValue: o.scoreValue,
      })),
    [options]
  );

  return {
    options: selectOptions,
    categoricalMode,
    rawOptions: options,
  };
}
