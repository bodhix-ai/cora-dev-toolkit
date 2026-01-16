/**
 * useEvalConfig - Configuration Management Hooks
 *
 * React hooks for managing eval configuration at system and org levels.
 * Wraps the Zustand store for convenient component usage.
 */

import { useCallback, useEffect } from "react";
import { useEvalStore } from "../store";
import type {
  UpdateSysConfigInput,
  UpdateOrgConfigInput,
  PromptConfigInput,
  PromptType,
} from "../types";

// =============================================================================
// SYSTEM CONFIG HOOKS
// =============================================================================

/**
 * Hook for system-level eval configuration (Sys Admin)
 */
export function useSysEvalConfig(token: string | null) {
  const {
    sysConfig,
    sysConfigLoading,
    sysConfigError,
    loadSysConfig,
    updateSysConfig,
  } = useEvalStore();

  // Load config on mount
  useEffect(() => {
    if (token && !sysConfig && !sysConfigLoading) {
      loadSysConfig(token);
    }
  }, [token, sysConfig, sysConfigLoading, loadSysConfig]);

  const update = useCallback(
    async (input: UpdateSysConfigInput) => {
      if (!token) throw new Error("No auth token");
      await updateSysConfig(token, input);
    },
    [token, updateSysConfig]
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    await loadSysConfig(token);
  }, [token, loadSysConfig]);

  return {
    config: sysConfig,
    isLoading: sysConfigLoading,
    error: sysConfigError,
    update,
    refresh,
  };
}

/**
 * Hook for system-level prompt configuration (Sys Admin)
 */
export function useSysEvalPrompts(token: string | null) {
  const {
    sysPrompts,
    sysConfigLoading,
    loadSysPrompts,
    updateSysPrompt,
  } = useEvalStore();

  // Load prompts on mount
  useEffect(() => {
    if (token && sysPrompts.length === 0 && !sysConfigLoading) {
      loadSysPrompts(token);
    }
  }, [token, sysPrompts.length, sysConfigLoading, loadSysPrompts]);

  const update = useCallback(
    async (promptType: PromptType, input: PromptConfigInput) => {
      if (!token) throw new Error("No auth token");
      await updateSysPrompt(token, promptType, input);
    },
    [token, updateSysPrompt]
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    await loadSysPrompts(token);
  }, [token, loadSysPrompts]);

  const getPromptByType = useCallback(
    (type: PromptType) => {
      return sysPrompts.find((p) => p.promptType === type);
    },
    [sysPrompts]
  );

  return {
    prompts: sysPrompts,
    isLoading: sysConfigLoading,
    update,
    refresh,
    getPromptByType,
  };
}

/**
 * Hook for organization delegation management (Sys Admin)
 */
export function useOrgsDelegation(token: string | null) {
  const {
    orgsDelegation,
    loadOrgsDelegation,
    toggleOrgDelegation,
  } = useEvalStore();

  // Load delegation status on mount
  useEffect(() => {
    if (token && orgsDelegation.length === 0) {
      loadOrgsDelegation(token);
    }
  }, [token, orgsDelegation.length, loadOrgsDelegation]);

  const toggle = useCallback(
    async (orgId: string, delegated: boolean) => {
      if (!token) throw new Error("No auth token");
      await toggleOrgDelegation(token, orgId, delegated);
    },
    [token, toggleOrgDelegation]
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    await loadOrgsDelegation(token);
  }, [token, loadOrgsDelegation]);

  const getOrgStatus = useCallback(
    (orgId: string) => {
      return orgsDelegation.find((o) => o.id === orgId);
    },
    [orgsDelegation]
  );

  return {
    orgs: orgsDelegation,
    toggle,
    refresh,
    getOrgStatus,
  };
}

// =============================================================================
// ORG CONFIG HOOKS
// =============================================================================

/**
 * Hook for organization-level eval configuration (Org Admin)
 */
export function useOrgEvalConfig(token: string | null, orgId: string | null) {
  const {
    orgConfig,
    orgConfigLoading,
    orgConfigError,
    loadOrgConfig,
    updateOrgConfig,
  } = useEvalStore();

  // Load config on mount or org change
  useEffect(() => {
    if (token && orgId && (!orgConfig || orgConfig.orgId !== orgId)) {
      loadOrgConfig(token, orgId);
    }
  }, [token, orgId, orgConfig, loadOrgConfig]);

  const update = useCallback(
    async (input: UpdateOrgConfigInput) => {
      if (!token || !orgId) throw new Error("No auth token or org ID");
      await updateOrgConfig(token, orgId, input);
    },
    [token, orgId, updateOrgConfig]
  );

  const refresh = useCallback(async () => {
    if (!token || !orgId) return;
    await loadOrgConfig(token, orgId);
  }, [token, orgId, loadOrgConfig]);

  return {
    config: orgConfig,
    isLoading: orgConfigLoading,
    error: orgConfigError,
    update,
    refresh,
  };
}

/**
 * Hook for organization-level prompt configuration (Org Admin)
 */
export function useOrgEvalPrompts(token: string | null, orgId: string | null) {
  const {
    orgPrompts,
    orgConfig,
    orgConfigLoading,
    loadOrgPrompts,
    updateOrgPrompt,
  } = useEvalStore();

  // Load prompts on mount or org change
  useEffect(() => {
    if (token && orgId && orgPrompts.length === 0 && !orgConfigLoading) {
      loadOrgPrompts(token, orgId);
    }
  }, [token, orgId, orgPrompts.length, orgConfigLoading, loadOrgPrompts]);

  const update = useCallback(
    async (promptType: PromptType, input: PromptConfigInput) => {
      if (!token || !orgId) throw new Error("No auth token or org ID");
      await updateOrgPrompt(token, orgId, promptType, input);
    },
    [token, orgId, updateOrgPrompt]
  );

  const refresh = useCallback(async () => {
    if (!token || !orgId) return;
    await loadOrgPrompts(token, orgId);
  }, [token, orgId, loadOrgPrompts]);

  const getPromptByType = useCallback(
    (type: PromptType) => {
      return orgPrompts.find((p) => p.promptType === type);
    },
    [orgPrompts]
  );

  // Check if org can edit prompts (delegation enabled)
  const canEditPrompts = orgConfig?.aiConfigDelegated ?? false;

  return {
    prompts: orgPrompts,
    isLoading: orgConfigLoading,
    canEditPrompts,
    update,
    refresh,
    getPromptByType,
  };
}

// =============================================================================
// COMBINED CONFIG HOOK
// =============================================================================

/**
 * Combined hook for eval config (resolves sys/org based on role)
 */
export function useEvalConfig(
  token: string | null,
  orgId: string | null,
  options: { isSysAdmin?: boolean } = {}
) {
  const { isSysAdmin = false } = options;

  const sysConfig = useSysEvalConfig(isSysAdmin ? token : null);
  const orgConfig = useOrgEvalConfig(!isSysAdmin ? token : null, orgId);

  if (isSysAdmin) {
    return {
      level: "system" as const,
      ...sysConfig,
    };
  }

  return {
    level: "org" as const,
    ...orgConfig,
  };
}
