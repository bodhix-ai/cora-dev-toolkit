/**
 * Module Eval - Zustand Store
 *
 * State management for evaluation configuration, document types, criteria sets,
 * evaluations, and progress tracking.
 * Uses the module-eval API client and types.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  EvalSysConfig,
  EvalSysPromptConfig,
  EvalSysStatusOption,
  EvalOrgConfig,
  EvalOrgPromptConfig,
  EvalOrgStatusOption,
  EvalMergedPromptConfig,
  OrgDelegationStatus,
  EvalDocType,
  EvalCriteriaSet,
  EvalCriteriaItem,
  Evaluation,
  CriteriaResultWithItem,
  StatusOption,
  EvalResultEdit,
  PromptType,
  CategoricalMode,
  EvaluationStatus,
  CreateDocTypeInput,
  UpdateDocTypeInput,
  CreateCriteriaSetInput,
  UpdateCriteriaSetInput,
  ImportCriteriaSetInput,
  CreateCriteriaItemInput,
  UpdateCriteriaItemInput,
  CreateEvaluationInput,
  UpdateEvaluationInput,
  EditResultInput,
  ListEvaluationsOptions,
  ListDocTypesOptions,
  ListCriteriaSetsOptions,
  UpdateSysConfigInput,
  UpdateOrgConfigInput,
  StatusOptionInput,
  PromptConfigInput,
  ImportCriteriaSetResult,
} from "../types";
import * as api from "../lib/api";

// =============================================================================
// STORE TYPES
// =============================================================================

/** Progress polling state for active evaluations */
interface PollingState {
  /** Active polling intervals by evaluation ID */
  activePolls: Record<string, NodeJS.Timeout>;
  /** Polling interval in milliseconds */
  pollInterval: number;
}

/** Filter state for evaluations */
interface EvaluationFilters {
  /** Current workspace ID */
  workspaceId: string | null;
  /** Filter by status */
  status?: EvaluationStatus;
  /** Filter by doc type */
  docTypeId?: string;
  /** Include deleted */
  includeDeleted?: boolean;
}

/** Eval store state */
interface EvalState {
  // === System Config State (Sys Admin) ===
  /** System configuration */
  sysConfig: EvalSysConfig | null;
  /** System prompts by type */
  sysPrompts: EvalSysPromptConfig[];
  /** System status options */
  sysStatusOptions: EvalSysStatusOption[];
  /** Organizations with delegation status */
  orgsDelegation: OrgDelegationStatus[];
  /** Sys config loading */
  sysConfigLoading: boolean;
  /** Sys config error */
  sysConfigError: string | null;

  // === Org Config State (Org Admin) ===
  /** Current org config */
  orgConfig: EvalOrgConfig | null;
  /** Org prompts (merged with sys defaults) */
  orgPrompts: EvalMergedPromptConfig[];
  /** Org status options */
  orgStatusOptions: EvalOrgStatusOption[];
  /** Org config loading */
  orgConfigLoading: boolean;
  /** Org config error */
  orgConfigError: string | null;

  // === Doc Types State ===
  /** Document types for current org */
  docTypes: EvalDocType[];
  /** Selected doc type (for editing) */
  selectedDocType: EvalDocType | null;
  /** Doc types loading */
  docTypesLoading: boolean;
  /** Doc types error */
  docTypesError: string | null;

  // === Criteria Sets State ===
  /** Criteria sets (optionally filtered by doc type) */
  criteriaSets: EvalCriteriaSet[];
  /** Selected criteria set with items */
  selectedCriteriaSet: EvalCriteriaSet | null;
  /** Criteria sets loading */
  criteriaSetsLoading: boolean;
  /** Criteria sets error */
  criteriaSetsError: string | null;

  // === Evaluations State ===
  /** Evaluations for current workspace */
  evaluations: Evaluation[];
  /** Selected evaluation with full details */
  selectedEvaluation: Evaluation | null;
  /** Evaluation filters */
  evaluationFilters: EvaluationFilters;
  /** Evaluations pagination */
  evaluationsPagination: {
    total: number;
    offset: number;
    hasMore: boolean;
  };
  /** Evaluations loading */
  evaluationsLoading: boolean;
  /** Evaluations error */
  evaluationsError: string | null;
  /** Progress polling state */
  polling: PollingState;

  // === Active Status Options ===
  /** Resolved status options for display (org or sys) */
  activeStatusOptions: StatusOption[];

  // === System Config Actions ===
  loadSysConfig: (token: string) => Promise<void>;
  updateSysConfig: (token: string, input: UpdateSysConfigInput) => Promise<void>;
  loadSysPrompts: (token: string) => Promise<void>;
  updateSysPrompt: (
    token: string,
    promptType: PromptType,
    input: PromptConfigInput
  ) => Promise<void>;
  loadSysStatusOptions: (token: string) => Promise<void>;
  createSysStatusOption: (
    token: string,
    input: StatusOptionInput
  ) => Promise<void>;
  updateSysStatusOption: (
    token: string,
    id: string,
    input: StatusOptionInput
  ) => Promise<void>;
  deleteSysStatusOption: (token: string, id: string) => Promise<void>;
  loadOrgsDelegation: (token: string) => Promise<void>;
  toggleOrgDelegation: (
    token: string,
    orgId: string,
    delegated: boolean
  ) => Promise<void>;

  // === Org Config Actions ===
  loadOrgConfig: (token: string, orgId: string) => Promise<void>;
  updateOrgConfig: (
    token: string,
    orgId: string,
    input: UpdateOrgConfigInput
  ) => Promise<void>;
  loadOrgPrompts: (token: string, orgId: string) => Promise<void>;
  updateOrgPrompt: (
    token: string,
    orgId: string,
    promptType: PromptType,
    input: PromptConfigInput
  ) => Promise<void>;
  loadOrgStatusOptions: (token: string, orgId: string) => Promise<void>;
  createOrgStatusOption: (
    token: string,
    orgId: string,
    input: StatusOptionInput
  ) => Promise<void>;
  updateOrgStatusOption: (
    token: string,
    orgId: string,
    id: string,
    input: StatusOptionInput
  ) => Promise<void>;
  deleteOrgStatusOption: (
    token: string,
    orgId: string,
    id: string
  ) => Promise<void>;

  // === Doc Types Actions ===
  loadDocTypes: (
    token: string,
    orgId: string,
    options?: ListDocTypesOptions
  ) => Promise<void>;
  createDocType: (
    token: string,
    orgId: string,
    input: CreateDocTypeInput
  ) => Promise<EvalDocType>;
  updateDocType: (
    token: string,
    orgId: string,
    id: string,
    input: UpdateDocTypeInput
  ) => Promise<void>;
  deleteDocType: (token: string, orgId: string, id: string) => Promise<void>;
  selectDocType: (token: string, orgId: string, id: string) => Promise<void>;
  clearSelectedDocType: () => void;

  // === Criteria Sets Actions ===
  loadCriteriaSets: (
    token: string,
    orgId: string,
    options?: ListCriteriaSetsOptions
  ) => Promise<void>;
  getCriteriaSet: (
    token: string,
    orgId: string,
    id: string
  ) => Promise<EvalCriteriaSet>;
  createCriteriaSet: (
    token: string,
    orgId: string,
    input: CreateCriteriaSetInput
  ) => Promise<EvalCriteriaSet>;
  updateCriteriaSet: (
    token: string,
    orgId: string,
    id: string,
    input: UpdateCriteriaSetInput
  ) => Promise<void>;
  deleteCriteriaSet: (token: string, orgId: string, id: string) => Promise<void>;
  importCriteriaSet: (
    token: string,
    orgId: string,
    input: ImportCriteriaSetInput
  ) => Promise<ImportCriteriaSetResult>;
  selectCriteriaSet: (
    token: string,
    orgId: string,
    id: string
  ) => Promise<void>;
  clearSelectedCriteriaSet: () => void;

  // === Criteria Items Actions ===
  addCriteriaItem: (
    token: string,
    orgId: string,
    criteriaSetId: string,
    input: CreateCriteriaItemInput
  ) => Promise<void>;
  updateCriteriaItem: (
    token: string,
    orgId: string,
    id: string,
    input: UpdateCriteriaItemInput
  ) => Promise<void>;
  deleteCriteriaItem: (
    token: string,
    orgId: string,
    id: string
  ) => Promise<void>;

  // === Evaluations Actions ===
  loadEvaluations: (
    token: string,
    workspaceId: string,
    options?: ListEvaluationsOptions
  ) => Promise<void>;
  loadMoreEvaluations: (token: string, workspaceId: string) => Promise<void>;
  createEvaluation: (
    token: string,
    workspaceId: string,
    input: CreateEvaluationInput
  ) => Promise<Evaluation>;
  updateEvaluation: (
    token: string,
    workspaceId: string,
    evaluationId: string,
    input: UpdateEvaluationInput
  ) => Promise<Evaluation>;
  getEvaluation: (
    token: string,
    workspaceId: string,
    id: string
  ) => Promise<Evaluation>;
  deleteEvaluation: (
    token: string,
    workspaceId: string,
    id: string
  ) => Promise<void>;
  selectEvaluation: (
    token: string,
    workspaceId: string,
    id: string
  ) => Promise<void>;
  clearSelectedEvaluation: () => void;
  setEvaluationFilters: (filters: Partial<EvaluationFilters>) => void;

  // === Progress Polling Actions ===
  startPolling: (
    token: string,
    workspaceId: string,
    evaluationId: string
  ) => void;
  stopPolling: (evaluationId: string) => void;
  stopAllPolling: () => void;

  // === Result Editing Actions ===
  editResult: (
    token: string,
    workspaceId: string,
    evaluationId: string,
    resultId: string,
    input: EditResultInput
  ) => Promise<void>;
  getEditHistory: (
    token: string,
    workspaceId: string,
    evaluationId: string,
    resultId: string
  ) => Promise<EvalResultEdit[]>;

  // === Export Actions ===
  exportPdf: (
    token: string,
    workspaceId: string,
    evaluationId: string
  ) => Promise<void>;
  exportXlsx: (
    token: string,
    workspaceId: string,
    evaluationId: string
  ) => Promise<void>;

  // === Utility Actions ===
  loadActiveStatusOptions: (token: string, orgId: string) => Promise<void>;
  clearErrors: () => void;
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialPollingState: PollingState = {
  activePolls: {},
  pollInterval: 2000, // 2 seconds
};

const initialEvaluationFilters: EvaluationFilters = {
  workspaceId: null,
  status: undefined,
  docTypeId: undefined,
  includeDeleted: false,
};

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useEvalStore = create<EvalState>()(
  persist(
    (set, get) => ({
      // === Initial State ===

      // System config
      sysConfig: null,
      sysPrompts: [],
      sysStatusOptions: [],
      orgsDelegation: [],
      sysConfigLoading: false,
      sysConfigError: null,

      // Org config
      orgConfig: null,
      orgPrompts: [],
      orgStatusOptions: [],
      orgConfigLoading: false,
      orgConfigError: null,

      // Doc types
      docTypes: [],
      selectedDocType: null,
      docTypesLoading: false,
      docTypesError: null,

      // Criteria sets
      criteriaSets: [],
      selectedCriteriaSet: null,
      criteriaSetsLoading: false,
      criteriaSetsError: null,

      // Evaluations
      evaluations: [],
      selectedEvaluation: null,
      evaluationFilters: initialEvaluationFilters,
      evaluationsPagination: { total: 0, offset: 0, hasMore: false },
      evaluationsLoading: false,
      evaluationsError: null,
      polling: initialPollingState,

      // Status options
      activeStatusOptions: [],

      // =================================================================
      // SYSTEM CONFIG ACTIONS
      // =================================================================

      loadSysConfig: async (token) => {
        set({ sysConfigLoading: true, sysConfigError: null });

        try {
          const response = await api.getSysConfig(token);
          // Defensive unwrapping: handle { data: ... } wrapper if API client didn't unwrap
          const config = 'data' in response ? response.data : response;
          set({ sysConfig: config, sysConfigLoading: false });
        } catch (error) {
          console.error("Failed to load sys config:", error);
          set({
            sysConfigLoading: false,
            sysConfigError:
              error instanceof Error
                ? error.message
                : "Failed to load system config",
          });
        }
      },

      updateSysConfig: async (token, input) => {
        const previous = get().sysConfig;

        // Optimistic update
        if (previous) {
          set({
            sysConfig: {
              ...previous,
              categoricalMode: input.categoricalMode ?? previous.categoricalMode,
              showNumericalScore:
                input.showNumericalScore ?? previous.showNumericalScore,
            },
          });
        }

        try {
          const updated = await api.updateSysConfig(token, input);
          set({ sysConfig: updated });
        } catch (error) {
          // Revert
          console.error("Failed to update sys config:", error);
          set({ sysConfig: previous });
          throw error;
        }
      },

      loadSysPrompts: async (token) => {
        set({ sysConfigLoading: true });

        try {
          const response = await api.listSysPrompts(token);
          // Defensive unwrapping: handle { data: [...] } wrapper if API client didn't unwrap
          const prompts = 'data' in response ? response.data : response;
          set({ sysPrompts: Array.isArray(prompts) ? prompts : [], sysConfigLoading: false });
        } catch (error) {
          console.error("Failed to load sys prompts:", error);
          set({ sysConfigLoading: false });
        }
      },

      updateSysPrompt: async (token, promptType, input) => {
        try {
          const updated = await api.updateSysPrompt(token, promptType, input);

          set((state) => ({
            sysPrompts: state.sysPrompts.map((p) =>
              p.promptType === promptType ? updated : p
            ),
          }));
        } catch (error) {
          console.error("Failed to update sys prompt:", error);
          throw error;
        }
      },

      loadSysStatusOptions: async (token) => {
        try {
          const response = await api.listSysStatusOptions(token);
          // Defensive unwrapping: handle { data: [...] } wrapper if API client didn't unwrap
          const options = 'data' in response ? response.data : response;
          set({ sysStatusOptions: Array.isArray(options) ? options : [] });
        } catch (error) {
          console.error("Failed to load sys status options:", error);
        }
      },

      createSysStatusOption: async (token, input) => {
        try {
          const option = await api.createSysStatusOption(token, input);
          set((state) => ({
            sysStatusOptions: [...state.sysStatusOptions, option],
          }));
        } catch (error) {
          console.error("Failed to create sys status option:", error);
          throw error;
        }
      },

      updateSysStatusOption: async (token, id, input) => {
        try {
          const updated = await api.updateSysStatusOption(token, id, input);
          set((state) => ({
            sysStatusOptions: state.sysStatusOptions.map((o) =>
              o.id === id ? updated : o
            ),
          }));
        } catch (error) {
          console.error("Failed to update sys status option:", error);
          throw error;
        }
      },

      deleteSysStatusOption: async (token, id) => {
        const previous = get().sysStatusOptions;

        // Optimistic removal
        set((state) => ({
          sysStatusOptions: state.sysStatusOptions.filter((o) => o.id !== id),
        }));

        try {
          await api.deleteSysStatusOption(token, id);
        } catch (error) {
          // Revert
          console.error("Failed to delete sys status option:", error);
          set({ sysStatusOptions: previous });
          throw error;
        }
      },

      loadOrgsDelegation: async (token) => {
        try {
          const orgs = await api.listOrgsDelegation(token);
          set({ orgsDelegation: orgs });
        } catch (error) {
          console.error("Failed to load orgs delegation:", error);
        }
      },

      toggleOrgDelegation: async (token, orgId, delegated) => {
        const previous = get().orgsDelegation;

        // Optimistic update
        set((state) => ({
          orgsDelegation: state.orgsDelegation.map((o) =>
            o.id === orgId ? { ...o, aiConfigDelegated: delegated } : o
          ),
        }));

        try {
          await api.toggleOrgDelegation(token, orgId, delegated);
        } catch (error) {
          // Revert
          console.error("Failed to toggle org delegation:", error);
          set({ orgsDelegation: previous });
          throw error;
        }
      },

      // =================================================================
      // ORG CONFIG ACTIONS
      // =================================================================

      loadOrgConfig: async (token, orgId) => {
        set({ orgConfigLoading: true, orgConfigError: null });

        try {
          const config = await api.getOrgConfig(token, orgId);
          set({ orgConfig: config, orgConfigLoading: false });
        } catch (error) {
          console.error("Failed to load org config:", error);
          set({
            orgConfigLoading: false,
            orgConfigError:
              error instanceof Error
                ? error.message
                : "Failed to load org config",
          });
        }
      },

      updateOrgConfig: async (token, orgId, input) => {
        const previous = get().orgConfig;

        try {
          const updated = await api.updateOrgConfig(token, orgId, input);
          set({ orgConfig: updated });
        } catch (error) {
          console.error("Failed to update org config:", error);
          throw error;
        }
      },

      loadOrgPrompts: async (token, orgId) => {
        set({ orgConfigLoading: true });

        try {
          const prompts = await api.listOrgPrompts(token, orgId);
          set({ orgPrompts: prompts, orgConfigLoading: false });
        } catch (error) {
          console.error("Failed to load org prompts:", error);
          set({ orgConfigLoading: false });
        }
      },

      updateOrgPrompt: async (token, orgId, promptType, input) => {
        try {
          const updated = await api.updateOrgPrompt(
            token,
            orgId,
            promptType,
            input
          );

          set((state) => ({
            orgPrompts: state.orgPrompts.map((p) =>
              p.promptType === promptType ? updated : p
            ),
          }));
        } catch (error) {
          console.error("Failed to update org prompt:", error);
          throw error;
        }
      },

      loadOrgStatusOptions: async (token, orgId) => {
        try {
          const options = await api.listOrgStatusOptions(token, orgId);
          set({ orgStatusOptions: options });
        } catch (error) {
          console.error("Failed to load org status options:", error);
        }
      },

      createOrgStatusOption: async (token, orgId, input) => {
        try {
          const option = await api.createOrgStatusOption(token, orgId, input);
          set((state) => ({
            orgStatusOptions: [...state.orgStatusOptions, option],
          }));
        } catch (error) {
          console.error("Failed to create org status option:", error);
          throw error;
        }
      },

      updateOrgStatusOption: async (token, orgId, id, input) => {
        try {
          const updated = await api.updateOrgStatusOption(
            token,
            orgId,
            id,
            input
          );
          set((state) => ({
            orgStatusOptions: state.orgStatusOptions.map((o) =>
              o.id === id ? updated : o
            ),
          }));
        } catch (error) {
          console.error("Failed to update org status option:", error);
          throw error;
        }
      },

      deleteOrgStatusOption: async (token, orgId, id) => {
        const previous = get().orgStatusOptions;

        // Optimistic removal
        set((state) => ({
          orgStatusOptions: state.orgStatusOptions.filter((o) => o.id !== id),
        }));

        try {
          await api.deleteOrgStatusOption(token, orgId, id);
        } catch (error) {
          // Revert
          console.error("Failed to delete org status option:", error);
          set({ orgStatusOptions: previous });
          throw error;
        }
      },

      // =================================================================
      // DOC TYPES ACTIONS
      // =================================================================

      loadDocTypes: async (token, orgId, options) => {
        set({ docTypesLoading: true, docTypesError: null });

        try {
          const docTypes = await api.listDocTypes(token, orgId, options);
          set({ docTypes, docTypesLoading: false });
        } catch (error) {
          console.error("Failed to load doc types:", error);
          set({
            docTypesLoading: false,
            docTypesError:
              error instanceof Error
                ? error.message
                : "Failed to load document types",
          });
        }
      },

      createDocType: async (token, orgId, input) => {
        try {
          const docType = await api.createDocType(token, orgId, input);
          set((state) => ({
            docTypes: [...state.docTypes, docType],
          }));
          return docType;
        } catch (error) {
          console.error("Failed to create doc type:", error);
          throw error;
        }
      },

      updateDocType: async (token, orgId, id, input) => {
        const previous = get().docTypes;

        // Optimistic update
        set((state) => ({
          docTypes: state.docTypes.map((dt) =>
            dt.id === id
              ? {
                  ...dt,
                  name: input.name ?? dt.name,
                  description: input.description ?? dt.description,
                  isActive: input.isActive ?? dt.isActive,
                }
              : dt
          ),
        }));

        try {
          const updated = await api.updateDocType(token, orgId, id, input);
          set((state) => ({
            docTypes: state.docTypes.map((dt) =>
              dt.id === id ? updated : dt
            ),
            selectedDocType:
              state.selectedDocType?.id === id ? updated : state.selectedDocType,
          }));
        } catch (error) {
          // Revert
          console.error("Failed to update doc type:", error);
          set({ docTypes: previous });
          throw error;
        }
      },

      deleteDocType: async (token, orgId, id) => {
        const previous = get().docTypes;

        // Optimistic removal
        set((state) => ({
          docTypes: state.docTypes.filter((dt) => dt.id !== id),
          selectedDocType:
            state.selectedDocType?.id === id ? null : state.selectedDocType,
        }));

        try {
          await api.deleteDocType(token, orgId, id);
        } catch (error) {
          // Revert
          console.error("Failed to delete doc type:", error);
          set({ docTypes: previous });
          throw error;
        }
      },

      selectDocType: async (token, orgId, id) => {
        const existing = get().docTypes.find((dt) => dt.id === id);
        if (existing) {
          set({ selectedDocType: existing });
        }

        try {
          const docType = await api.getDocType(token, orgId, id);
          set({ selectedDocType: docType });
        } catch (error) {
          console.error("Failed to get doc type:", error);
        }
      },

      clearSelectedDocType: () => {
        set({ selectedDocType: null });
      },

      // =================================================================
      // CRITERIA SETS ACTIONS
      // =================================================================

      loadCriteriaSets: async (token, orgId, options) => {
        set({ criteriaSetsLoading: true, criteriaSetsError: null });

        try {
          const sets = await api.listCriteriaSets(token, orgId, options);
          set({ criteriaSets: sets, criteriaSetsLoading: false });
        } catch (error) {
          console.error("Failed to load criteria sets:", error);
          set({
            criteriaSetsLoading: false,
            criteriaSetsError:
              error instanceof Error
                ? error.message
                : "Failed to load criteria sets",
          });
        }
      },

      getCriteriaSet: async (token, orgId, id) => {
        try {
          const criteriaSet = await api.getCriteriaSet(token, orgId, id);
          return criteriaSet;
        } catch (error) {
          console.error("Failed to get criteria set:", error);
          throw error;
        }
      },

      createCriteriaSet: async (token, orgId, input) => {
        try {
          const criteriaSet = await api.createCriteriaSet(token, orgId, input);
          set((state) => ({
            criteriaSets: [...state.criteriaSets, criteriaSet],
          }));
          return criteriaSet;
        } catch (error) {
          console.error("Failed to create criteria set:", error);
          throw error;
        }
      },

      updateCriteriaSet: async (token, orgId, id, input) => {
        const previous = get().criteriaSets;

        // Optimistic update
        set((state) => ({
          criteriaSets: state.criteriaSets.map((cs) =>
            cs.id === id
              ? {
                  ...cs,
                  name: input.name ?? cs.name,
                  description: input.description ?? cs.description,
                  version: input.version ?? cs.version,
                  useWeightedScoring:
                    input.useWeightedScoring ?? cs.useWeightedScoring,
                  isActive: input.isActive ?? cs.isActive,
                }
              : cs
          ),
        }));

        try {
          const updated = await api.updateCriteriaSet(token, orgId, id, input);
          set((state) => ({
            criteriaSets: state.criteriaSets.map((cs) =>
              cs.id === id ? updated : cs
            ),
            selectedCriteriaSet:
              state.selectedCriteriaSet?.id === id
                ? { ...state.selectedCriteriaSet, ...updated }
                : state.selectedCriteriaSet,
          }));
        } catch (error) {
          // Revert
          console.error("Failed to update criteria set:", error);
          set({ criteriaSets: previous });
          throw error;
        }
      },

      deleteCriteriaSet: async (token, orgId, id) => {
        const previous = get().criteriaSets;

        // Optimistic removal
        set((state) => ({
          criteriaSets: state.criteriaSets.filter((cs) => cs.id !== id),
          selectedCriteriaSet:
            state.selectedCriteriaSet?.id === id
              ? null
              : state.selectedCriteriaSet,
        }));

        try {
          await api.deleteCriteriaSet(token, orgId, id);
        } catch (error) {
          // Revert
          console.error("Failed to delete criteria set:", error);
          set({ criteriaSets: previous });
          throw error;
        }
      },

      importCriteriaSet: async (token, orgId, input) => {
        try {
          const result = await api.importCriteriaSet(token, orgId, input);

          // Reload criteria sets to get the new one
          await get().loadCriteriaSets(token, orgId, {
            docTypeId: input.docTypeId,
          });

          return result;
        } catch (error) {
          console.error("Failed to import criteria set:", error);
          throw error;
        }
      },

      selectCriteriaSet: async (token, orgId, id) => {
        try {
          const criteriaSet = await api.getCriteriaSet(token, orgId, id);
          set({ selectedCriteriaSet: criteriaSet });
        } catch (error) {
          console.error("Failed to select criteria set:", error);
        }
      },

      clearSelectedCriteriaSet: () => {
        set({ selectedCriteriaSet: null });
      },

      // =================================================================
      // CRITERIA ITEMS ACTIONS
      // =================================================================

      addCriteriaItem: async (token, orgId, criteriaSetId, input) => {
        try {
          const item = await api.addCriteriaItem(
            token,
            orgId,
            criteriaSetId,
            input
          );

          // Update selected criteria set if it matches
          set((state) => {
            if (state.selectedCriteriaSet?.id === criteriaSetId) {
              return {
                selectedCriteriaSet: {
                  ...state.selectedCriteriaSet,
                  items: [...(state.selectedCriteriaSet.items || []), item],
                  itemCount: (state.selectedCriteriaSet.itemCount || 0) + 1,
                },
              };
            }
            return state;
          });
        } catch (error) {
          console.error("Failed to add criteria item:", error);
          throw error;
        }
      },

      updateCriteriaItem: async (token, orgId, id, input) => {
        try {
          const updated = await api.updateCriteriaItem(token, orgId, id, input);

          // Update selected criteria set if it contains this item
          set((state) => {
            if (state.selectedCriteriaSet?.items) {
              return {
                selectedCriteriaSet: {
                  ...state.selectedCriteriaSet,
                  items: state.selectedCriteriaSet.items.map((item) =>
                    item.id === id ? updated : item
                  ),
                },
              };
            }
            return state;
          });
        } catch (error) {
          console.error("Failed to update criteria item:", error);
          throw error;
        }
      },

      deleteCriteriaItem: async (token, orgId, id) => {
        try {
          await api.deleteCriteriaItem(token, orgId, id);

          // Update selected criteria set
          set((state) => {
            if (state.selectedCriteriaSet?.items) {
              return {
                selectedCriteriaSet: {
                  ...state.selectedCriteriaSet,
                  items: state.selectedCriteriaSet.items.filter(
                    (item) => item.id !== id
                  ),
                  itemCount: Math.max(
                    0,
                    (state.selectedCriteriaSet.itemCount || 0) - 1
                  ),
                },
              };
            }
            return state;
          });
        } catch (error) {
          console.error("Failed to delete criteria item:", error);
          throw error;
        }
      },

      // =================================================================
      // EVALUATIONS ACTIONS
      // =================================================================

      loadEvaluations: async (token, workspaceId, options) => {
        const { evaluationFilters } = get();

        set({
          evaluationsLoading: true,
          evaluationsError: null,
          evaluationFilters: { ...evaluationFilters, workspaceId },
        });

        try {
          const mergedOptions: ListEvaluationsOptions = {
            status: evaluationFilters.status,
            docTypeId: evaluationFilters.docTypeId,
            includeDeleted: evaluationFilters.includeDeleted,
            limit: 20,
            offset: 0,
            ...options,
          };

          const response = await api.listEvaluations(
            token,
            workspaceId,
            mergedOptions
          );

          set({
            evaluations: response.evaluations,
            evaluationsLoading: false,
            evaluationsPagination: {
              total: response.pagination.total,
              offset: response.pagination.offset,
              hasMore: response.pagination.hasMore,
            },
          });

          // Start polling for any processing evaluations
          response.evaluations
            .filter((e) => e.status === "processing" || e.status === "pending")
            .forEach((e) => {
              get().startPolling(token, workspaceId, e.id);
            });
        } catch (error) {
          console.error("Failed to load evaluations:", error);
          set({
            evaluationsLoading: false,
            evaluationsError:
              error instanceof Error
                ? error.message
                : "Failed to load evaluations",
          });
        }
      },

      loadMoreEvaluations: async (token, workspaceId) => {
        const {
          evaluationsPagination,
          evaluations,
          evaluationFilters,
          evaluationsLoading,
        } = get();

        if (evaluationsLoading || !evaluationsPagination.hasMore) return;

        set({ evaluationsLoading: true });

        try {
          const response = await api.listEvaluations(token, workspaceId, {
            status: evaluationFilters.status,
            docTypeId: evaluationFilters.docTypeId,
            includeDeleted: evaluationFilters.includeDeleted,
            limit: 20,
            offset: evaluationsPagination.offset + 20,
          });

          set({
            evaluations: [...evaluations, ...response.evaluations],
            evaluationsLoading: false,
            evaluationsPagination: {
              total: response.pagination.total,
              offset: response.pagination.offset,
              hasMore: response.pagination.hasMore,
            },
          });
        } catch (error) {
          console.error("Failed to load more evaluations:", error);
          set({
            evaluationsLoading: false,
            evaluationsError:
              error instanceof Error
                ? error.message
                : "Failed to load more evaluations",
          });
        }
      },

      createEvaluation: async (token, workspaceId, input) => {
        try {
          const evaluation = await api.createEvaluation(
            token,
            workspaceId,
            input
          );

          set((state) => ({
            evaluations: [evaluation, ...state.evaluations],
          }));

          // Start polling for progress
          get().startPolling(token, workspaceId, evaluation.id);

          return evaluation;
        } catch (error) {
          console.error("Failed to create evaluation:", error);
          set({
            evaluationsError:
              error instanceof Error
                ? error.message
                : "Failed to create evaluation",
          });
          throw error;
        }
      },

      updateEvaluation: async (token, workspaceId, evaluationId, input) => {
        try {
          const updated = await api.updateEvaluation(
            token,
            workspaceId,
            evaluationId,
            input
          );

          // Update evaluation in list
          set((state) => ({
            evaluations: state.evaluations.map((e) =>
              e.id === evaluationId ? updated : e
            ),
            selectedEvaluation:
              state.selectedEvaluation?.id === evaluationId
                ? updated
                : state.selectedEvaluation,
          }));

          // Start polling for progress if status is pending or processing
          if (updated.status === "pending" || updated.status === "processing") {
            get().startPolling(token, workspaceId, evaluationId);
          }

          return updated;
        } catch (error) {
          console.error("Failed to update evaluation:", error);
          set({
            evaluationsError:
              error instanceof Error
                ? error.message
                : "Failed to update evaluation",
          });
          throw error;
        }
      },

      getEvaluation: async (token, workspaceId, id) => {
        try {
          const evaluation = await api.getEvaluation(token, workspaceId, id);
          return evaluation;
        } catch (error) {
          console.error("Failed to get evaluation:", error);
          throw error;
        }
      },

      deleteEvaluation: async (token, workspaceId, id) => {
        const previous = get().evaluations;

        // Stop polling if active
        get().stopPolling(id);

        // Optimistic removal
        set((state) => ({
          evaluations: state.evaluations.filter((e) => e.id !== id),
          selectedEvaluation:
            state.selectedEvaluation?.id === id
              ? null
              : state.selectedEvaluation,
        }));

        try {
          await api.deleteEvaluation(token, workspaceId, id);
        } catch (error) {
          // Revert
          console.error("Failed to delete evaluation:", error);
          set({ evaluations: previous });
          throw error;
        }
      },

      selectEvaluation: async (token, workspaceId, id) => {
        try {
          const evaluation = await api.getEvaluation(token, workspaceId, id);
          set({ selectedEvaluation: evaluation });

          // Start polling if processing
          if (
            evaluation.status === "processing" ||
            evaluation.status === "pending"
          ) {
            get().startPolling(token, workspaceId, id);
          }
        } catch (error) {
          console.error("Failed to select evaluation:", error);
          set({
            evaluationsError:
              error instanceof Error
                ? error.message
                : "Failed to load evaluation",
          });
        }
      },

      clearSelectedEvaluation: () => {
        const { selectedEvaluation } = get();
        if (selectedEvaluation) {
          get().stopPolling(selectedEvaluation.id);
        }
        set({ selectedEvaluation: null });
      },

      setEvaluationFilters: (filters) => {
        set((state) => ({
          evaluationFilters: { ...state.evaluationFilters, ...filters },
        }));
      },

      // =================================================================
      // PROGRESS POLLING ACTIONS
      // =================================================================

      startPolling: (token, workspaceId, evaluationId) => {
        const { polling } = get();

        // Don't start if already polling
        if (polling.activePolls[evaluationId]) return;

        const poll = async () => {
          try {
            const status = await api.getEvaluationStatus(
              token,
              workspaceId,
              evaluationId
            );

            // Update evaluation in list
            set((state) => ({
              evaluations: state.evaluations.map((e) =>
                e.id === evaluationId
                  ? {
                      ...e,
                      status: status.status,
                      progress: status.progress,
                      errorMessage: status.errorMessage,
                      startedAt: status.startedAt,
                      completedAt: status.completedAt,
                    }
                  : e
              ),
              selectedEvaluation:
                state.selectedEvaluation?.id === evaluationId
                  ? {
                      ...state.selectedEvaluation,
                      status: status.status,
                      progress: status.progress,
                      errorMessage: status.errorMessage,
                      startedAt: status.startedAt,
                      completedAt: status.completedAt,
                    }
                  : state.selectedEvaluation,
            }));

            // Stop polling if completed or failed
            if (status.status === "completed" || status.status === "failed") {
              get().stopPolling(evaluationId);

              // If completed and selected, reload to get full results
              if (
                status.status === "completed" &&
                get().selectedEvaluation?.id === evaluationId
              ) {
                const full = await api.getEvaluation(
                  token,
                  workspaceId,
                  evaluationId
                );
                set({ selectedEvaluation: full });
              }
            }
          } catch (error) {
            console.error("Polling error:", error);
            // Don't stop polling on error, let it retry
          }
        };

        // Initial poll
        poll();

        // Set up interval
        const intervalId = setInterval(poll, polling.pollInterval);

        set((state) => ({
          polling: {
            ...state.polling,
            activePolls: {
              ...state.polling.activePolls,
              [evaluationId]: intervalId,
            },
          },
        }));
      },

      stopPolling: (evaluationId) => {
        const { polling } = get();
        const intervalId = polling.activePolls[evaluationId];

        if (intervalId) {
          clearInterval(intervalId);

          set((state) => {
            const { [evaluationId]: _, ...rest } = state.polling.activePolls;
            return {
              polling: {
                ...state.polling,
                activePolls: rest,
              },
            };
          });
        }
      },

      stopAllPolling: () => {
        const { polling } = get();

        Object.values(polling.activePolls).forEach((intervalId) => {
          clearInterval(intervalId);
        });

        set((state) => ({
          polling: {
            ...state.polling,
            activePolls: {},
          },
        }));
      },

      // =================================================================
      // RESULT EDITING ACTIONS
      // =================================================================

      editResult: async (token, workspaceId, evaluationId, resultId, input) => {
        try {
          const edit = await api.editResult(
            token,
            workspaceId,
            evaluationId,
            resultId,
            input
          );

          // Update selected evaluation's criteria results
          set((state) => {
            if (state.selectedEvaluation?.id === evaluationId) {
              const results = state.selectedEvaluation.criteriaResults?.map(
                (result) => {
                  if (result.aiResult?.id === resultId) {
                    return {
                      ...result,
                      currentEdit: edit,
                      hasEdit: true,
                    };
                  }
                  return result;
                }
              );

              return {
                selectedEvaluation: {
                  ...state.selectedEvaluation,
                  criteriaResults: results,
                },
              };
            }
            return state;
          });
        } catch (error) {
          console.error("Failed to edit result:", error);
          throw error;
        }
      },

      getEditHistory: async (token, workspaceId, evaluationId, resultId) => {
        try {
          const response = await api.getEditHistory(
            token,
            workspaceId,
            evaluationId,
            resultId
          );
          return response.history;
        } catch (error) {
          console.error("Failed to get edit history:", error);
          throw error;
        }
      },

      // =================================================================
      // EXPORT ACTIONS
      // =================================================================

      exportPdf: async (token, workspaceId, evaluationId) => {
        try {
          const response = await api.exportPdf(
            token,
            workspaceId,
            evaluationId
          );
          await api.downloadExport(response);
        } catch (error) {
          console.error("Failed to export PDF:", error);
          throw error;
        }
      },

      exportXlsx: async (token, workspaceId, evaluationId) => {
        try {
          const response = await api.exportXlsx(
            token,
            workspaceId,
            evaluationId
          );
          await api.downloadExport(response);
        } catch (error) {
          console.error("Failed to export XLSX:", error);
          throw error;
        }
      },

      // =================================================================
      // UTILITY ACTIONS
      // =================================================================

      loadActiveStatusOptions: async (token, orgId) => {
        // Load org status options and fallback to sys if none
        try {
          const orgOptions = await api.listOrgStatusOptions(token, orgId, {
            includeInactive: false,
          });

          if (orgOptions.length > 0) {
            set({
              activeStatusOptions: orgOptions.map((o) => ({
                id: o.id,
                name: o.name,
                color: o.color,
                scoreValue: o.scoreValue,
              })),
            });
          } else {
            // Fallback to sys options
            const sysOptions = await api.listSysStatusOptions(token);
            set({
              activeStatusOptions: sysOptions.map((o) => ({
                id: o.id,
                name: o.name,
                color: o.color,
                scoreValue: o.scoreValue,
              })),
            });
          }
        } catch (error) {
          console.error("Failed to load active status options:", error);
        }
      },

      clearErrors: () => {
        set({
          sysConfigError: null,
          orgConfigError: null,
          docTypesError: null,
          criteriaSetsError: null,
          evaluationsError: null,
        });
      },

      reset: () => {
        // Stop all polling
        get().stopAllPolling();

        set({
          // System config
          sysConfig: null,
          sysPrompts: [],
          sysStatusOptions: [],
          orgsDelegation: [],
          sysConfigLoading: false,
          sysConfigError: null,

          // Org config
          orgConfig: null,
          orgPrompts: [],
          orgStatusOptions: [],
          orgConfigLoading: false,
          orgConfigError: null,

          // Doc types
          docTypes: [],
          selectedDocType: null,
          docTypesLoading: false,
          docTypesError: null,

          // Criteria sets
          criteriaSets: [],
          selectedCriteriaSet: null,
          criteriaSetsLoading: false,
          criteriaSetsError: null,

          // Evaluations
          evaluations: [],
          selectedEvaluation: null,
          evaluationFilters: initialEvaluationFilters,
          evaluationsPagination: { total: 0, offset: 0, hasMore: false },
          evaluationsLoading: false,
          evaluationsError: null,
          polling: initialPollingState,

          // Status options
          activeStatusOptions: [],
        });
      },
    }),
    {
      name: "module-eval-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist user-facing data
      partialize: (state) => ({
        evaluations: state.evaluations,
        evaluationFilters: state.evaluationFilters,
        docTypes: state.docTypes,
        criteriaSets: state.criteriaSets,
        // Don't persist: loading states, errors, polling, admin config
      }),
      // Clean up on rehydrate
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reset loading states
          state.sysConfigLoading = false;
          state.orgConfigLoading = false;
          state.docTypesLoading = false;
          state.criteriaSetsLoading = false;
          state.evaluationsLoading = false;
          // Reset polling
          state.polling = initialPollingState;
        }
      },
    }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

/** Select processing evaluations */
export const selectProcessingEvaluations = (state: EvalState) =>
  state.evaluations.filter(
    (e) => e.status === "processing" || e.status === "pending"
  );

/** Select completed evaluations */
export const selectCompletedEvaluations = (state: EvalState) =>
  state.evaluations.filter((e) => e.status === "completed");

/** Select failed evaluations */
export const selectFailedEvaluations = (state: EvalState) =>
  state.evaluations.filter((e) => e.status === "failed");

/** Select evaluations by doc type */
export const selectEvaluationsByDocType =
  (docTypeId: string) => (state: EvalState) =>
    state.evaluations.filter((e) => e.docTypeId === docTypeId);

/** Select active doc types */
export const selectActiveDocTypes = (state: EvalState) =>
  state.docTypes.filter((dt) => dt.isActive);

/** Select criteria sets by doc type */
export const selectCriteriaSetsByDocType =
  (docTypeId: string) => (state: EvalState) =>
    state.criteriaSets.filter((cs) => cs.docTypeId === docTypeId && cs.isActive);

/** Select whether any evaluations are processing */
export const selectIsAnyProcessing = (state: EvalState) =>
  state.evaluations.some(
    (e) => e.status === "processing" || e.status === "pending"
  );

/** Select current evaluation progress */
export const selectCurrentProgress = (state: EvalState) =>
  state.selectedEvaluation?.progress ?? 0;

/** Select org delegation status */
export const selectOrgDelegation =
  (orgId: string) => (state: EvalState) =>
    state.orgsDelegation.find((o) => o.id === orgId);

// =============================================================================
// DEVELOPMENT HELPERS
// =============================================================================

// Expose store for E2E testing
if (
  typeof window !== "undefined" &&
  (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test")
) {
  (window as unknown as { useModuleEvalStore: typeof useEvalStore }).useModuleEvalStore =
    useEvalStore;
}
