/**
 * Module Eval - API Client
 *
 * API client functions for evaluation configuration, document types, criteria,
 * evaluations, results, and exports.
 * Uses the CORA API Gateway with Bearer token authentication.
 */

import type {
  // Configuration types
  EvalSysConfig,
  EvalSysPromptConfig,
  EvalSysStatusOption,
  EvalOrgConfig,
  EvalOrgStatusOption,
  EvalMergedPromptConfig,
  OrgDelegationStatus,
  // Document types
  EvalDocType,
  EvalCriteriaSet,
  EvalCriteriaItem,
  // Evaluation types
  Evaluation,
  EvaluationStatusResponse,
  EvalResultEdit,
  // Input types
  UpdateSysConfigInput,
  UpdateOrgConfigInput,
  StatusOptionInput,
  PromptConfigInput,
  TestPromptInput,
  PromptTestResult,
  ToggleDelegationInput,
  DelegationToggleResult,
  CreateDocTypeInput,
  UpdateDocTypeInput,
  CreateCriteriaSetInput,
  UpdateCriteriaSetInput,
  ImportCriteriaSetInput,
  ImportCriteriaSetResult,
  CreateCriteriaItemInput,
  UpdateCriteriaItemInput,
  CreateEvaluationInput,
  UpdateEvaluationInput,
  EditResultInput,
  EditHistoryResponse,
  ExportResponse,
  // Response types
  ListEvaluationsResponse,
  // Option types
  ListEvaluationsOptions,
  ListDocTypesOptions,
  ListCriteriaSetsOptions,
  ListCriteriaItemsOptions,
  ListStatusOptionsOptions,
  PromptType,
  StatusOptionMode,
} from "../types";

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Get the API base URL from environment
 */
const getApiBase = (): string => {
  if (typeof window !== "undefined") {
    return (
      process.env.NEXT_PUBLIC_CORA_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "/api"
    );
  }
  return process.env.NEXT_PUBLIC_CORA_API_URL || "";
};

// =============================================================================
// HTTP HELPERS
// =============================================================================

/**
 * Standard API error class
 */
export class EvalApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "EvalApiError";
  }
}

/**
 * Parse API response with error handling
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const responseText = await response.text();

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorCode: string | undefined;

    try {
      const json = JSON.parse(responseText);
      errorMessage = json.error || json.message || errorMessage;
      errorCode = json.code;
    } catch {
      if (responseText) {
        errorMessage = responseText;
      }
    }

    throw new EvalApiError(errorMessage, response.status, errorCode);
  }

  // Handle empty responses (204 No Content)
  if (!responseText || response.status === 204) {
    return {} as T;
  }

  try {
    const json = JSON.parse(responseText);
    
    // Unwrap standard API response format { success: true, data: <actual_data> }
    // This handles Lambda responses that use the standard wrapper pattern
    if (
      json && 
      typeof json === 'object' && 
      'success' in json && 
      'data' in json
    ) {
      return json.data as T;
    }
    
    return json as T;
  } catch {
    throw new EvalApiError(
      `Failed to parse API response: ${responseText}`,
      response.status
    );
  }
}

/**
 * Build URL with query parameters
 */
function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const base = getApiBase();
  const url = new URL(
    endpoint,
    base.startsWith("http") ? base : `https://placeholder${base}`
  );

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  // Return just the pathname + search if we used a placeholder
  if (!base.startsWith("http")) {
    return `${base}${url.pathname}${url.search}`;
  }
  return url.toString();
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${getApiBase()}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  // Add Content-Type for requests with body
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return parseResponse<T>(response);
}

// =============================================================================
// SYSTEM CONFIG API
// =============================================================================

/**
 * Get system-level evaluation configuration
 * GET /admin/sys/eval/config
 */
export async function getSysConfig(token: string): Promise<EvalSysConfig> {
  return apiRequest<EvalSysConfig>("/admin/sys/eval/config", token);
}

/**
 * Update system-level evaluation configuration
 * PATCH /admin/sys/eval/config
 */
export async function updateSysConfig(
  token: string,
  input: UpdateSysConfigInput
): Promise<EvalSysConfig> {
  return apiRequest<EvalSysConfig>("/admin/sys/eval/config", token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// =============================================================================
// SYSTEM STATUS OPTIONS API
// =============================================================================

/**
 * List system status options
 * GET /admin/sys/eval/status-options
 */
export async function listSysStatusOptions(
  token: string,
  options?: ListStatusOptionsOptions
): Promise<EvalSysStatusOption[]> {
  const params: Record<string, string | undefined> = {
    mode: options?.mode,
  };
  const url = buildUrl("/admin/sys/eval/status-options", params);
  return apiRequest<EvalSysStatusOption[]>(url, token);
}

/**
 * Create a system status option
 * POST /admin/sys/eval/status-options
 */
export async function createSysStatusOption(
  token: string,
  input: StatusOptionInput
): Promise<EvalSysStatusOption> {
  return apiRequest<EvalSysStatusOption>("/admin/sys/eval/status-options", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Update a system status option
 * PATCH /admin/sys/eval/status-options/{id}
 */
export async function updateSysStatusOption(
  token: string,
  statusId: string,
  input: Partial<StatusOptionInput>
): Promise<EvalSysStatusOption> {
  return apiRequest<EvalSysStatusOption>(
    `/admin/sys/eval/status-options/${statusId}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}

/**
 * Delete a system status option
 * DELETE /admin/sys/eval/status-options/{id}
 */
export async function deleteSysStatusOption(
  token: string,
  statusId: string
): Promise<{ message: string; id: string }> {
  return apiRequest<{ message: string; id: string }>(
    `/admin/sys/eval/status-options/${statusId}`,
    token,
    { method: "DELETE" }
  );
}

// =============================================================================
// SYSTEM PROMPTS API
// =============================================================================

/**
 * List system prompt configurations
 * GET /admin/sys/eval/prompts
 */
export async function listSysPrompts(
  token: string
): Promise<EvalSysPromptConfig[]> {
  return apiRequest<EvalSysPromptConfig[]>("/admin/sys/eval/prompts", token);
}

/**
 * Update a system prompt configuration
 * PATCH /admin/sys/eval/prompts/{type}
 */
export async function updateSysPrompt(
  token: string,
  promptType: PromptType,
  input: PromptConfigInput
): Promise<EvalSysPromptConfig> {
  return apiRequest<EvalSysPromptConfig>(
    `/admin/sys/eval/prompts/${promptType}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}

/**
 * Test a system prompt
 * POST /admin/sys/eval/prompts/{type}/test
 */
export async function testSysPrompt(
  token: string,
  promptType: PromptType,
  input: TestPromptInput
): Promise<PromptTestResult> {
  return apiRequest<PromptTestResult>(
    `/admin/sys/eval/prompts/${promptType}/test`,
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}

// =============================================================================
// DELEGATION API
// =============================================================================

/**
 * List organizations with delegation status
 * GET /admin/sys/eval/orgs
 */
export async function listOrgsDelegation(
  token: string,
  options?: { limit?: number; offset?: number }
): Promise<OrgDelegationStatus[]> {
  const params: Record<string, number | undefined> = {
    limit: options?.limit,
    offset: options?.offset,
  };
  const url = buildUrl("/admin/sys/eval/orgs", params);
  return apiRequest<OrgDelegationStatus[]>(url, token);
}

/**
 * Toggle AI config delegation for an organization
 * PATCH /admin/sys/eval/orgs/{orgId}/delegation
 */
export async function toggleOrgDelegation(
  token: string,
  orgId: string,
  input: ToggleDelegationInput
): Promise<DelegationToggleResult> {
  return apiRequest<DelegationToggleResult>(
    `/admin/sys/eval/orgs/${orgId}/delegation`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}

// =============================================================================
// ORG CONFIG API
// =============================================================================

/**
 * Get organization evaluation configuration (merged with sys defaults)
 * GET /admin/org/eval/config
 */
export async function getOrgConfig(
  token: string,
  orgId: string
): Promise<EvalOrgConfig> {
  const url = buildUrl("/admin/org/eval/config", { orgId });
  return apiRequest<EvalOrgConfig>(url, token);
}

/**
 * Update organization evaluation configuration
 * PATCH /admin/org/eval/config
 */
export async function updateOrgConfig(
  token: string,
  orgId: string,
  input: UpdateOrgConfigInput
): Promise<EvalOrgConfig> {
  const url = buildUrl("/admin/org/eval/config", { orgId });
  return apiRequest<EvalOrgConfig>(url, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// =============================================================================
// ORG STATUS OPTIONS API
// =============================================================================

/**
 * List organization status options
 * GET /admin/org/eval/status-options
 */
export async function listOrgStatusOptions(
  token: string,
  orgId: string,
  options?: ListStatusOptionsOptions
): Promise<EvalOrgStatusOption[]> {
  const params: Record<string, string | boolean | undefined> = {
    orgId,
    mode: options?.mode,
    includeInactive: options?.includeInactive,
  };
  const url = buildUrl("/admin/org/eval/status-options", params);
  return apiRequest<EvalOrgStatusOption[]>(url, token);
}

/**
 * Create an organization status option
 * POST /admin/org/eval/status-options
 */
export async function createOrgStatusOption(
  token: string,
  orgId: string,
  input: StatusOptionInput
): Promise<EvalOrgStatusOption> {
  const url = buildUrl("/admin/org/eval/status-options", { orgId });
  return apiRequest<EvalOrgStatusOption>(url, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Update an organization status option
 * PATCH /admin/org/eval/status-options/{id}
 */
export async function updateOrgStatusOption(
  token: string,
  orgId: string,
  statusId: string,
  input: Partial<StatusOptionInput>
): Promise<EvalOrgStatusOption> {
  const url = buildUrl(`/admin/org/eval/status-options/${statusId}`, { orgId });
  return apiRequest<EvalOrgStatusOption>(url, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/**
 * Delete (soft) an organization status option
 * DELETE /admin/org/eval/status-options/{id}
 */
export async function deleteOrgStatusOption(
  token: string,
  orgId: string,
  statusId: string
): Promise<{ message: string; id: string }> {
  const url = buildUrl(`/admin/org/eval/status-options/${statusId}`, { orgId });
  return apiRequest<{ message: string; id: string }>(url, token, {
    method: "DELETE",
  });
}

// =============================================================================
// ORG PROMPTS API
// =============================================================================

/**
 * List organization prompt configurations (merged with sys defaults)
 * GET /admin/org/eval/prompts
 */
export async function listOrgPrompts(
  token: string,
  orgId: string
): Promise<EvalMergedPromptConfig[]> {
  const url = buildUrl("/admin/org/eval/prompts", { orgId });
  return apiRequest<EvalMergedPromptConfig[]>(url, token);
}

/**
 * Update an organization prompt configuration
 * PATCH /admin/org/eval/prompts/{type}
 */
export async function updateOrgPrompt(
  token: string,
  orgId: string,
  promptType: PromptType,
  input: PromptConfigInput
): Promise<EvalMergedPromptConfig> {
  const url = buildUrl(`/admin/org/eval/prompts/${promptType}`, { orgId });
  return apiRequest<EvalMergedPromptConfig>(url, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/**
 * Test an organization prompt
 * POST /admin/org/eval/prompts/{type}/test
 */
export async function testOrgPrompt(
  promptType: PromptType,
  orgId: string,
  token: string,
  input: TestPromptInput
): Promise<PromptTestResult> {
  const url = buildUrl(`/admin/org/eval/prompts/${promptType}/test`, { orgId });
  return apiRequest<PromptTestResult>(url, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// =============================================================================
// RESOURCE API (Workspace-scoped — any workspace member can access)
// =============================================================================

/**
 * List doc types available for evaluation creation in a workspace
 * GET /ws/{wsId}/eval/config/doc-types
 *
 * This is a RESOURCE route (not admin) — any workspace member can call it.
 * Use this for evaluation creation flows instead of the admin listDocTypes().
 */
export async function getConfigDocTypes(
  token: string,
  wsId: string,
  options?: { includeInactive?: boolean }
): Promise<EvalDocType[]> {
  const params: Record<string, string | boolean | undefined> = {
    includeInactive: options?.includeInactive,
  };
  const url = buildUrl(`/ws/${wsId}/eval/config/doc-types`, params);
  return apiRequest<EvalDocType[]>(url, token);
}

/**
 * List criteria sets available for evaluation creation in a workspace
 * GET /ws/{wsId}/eval/config/criteria-sets
 *
 * This is a RESOURCE route (not admin) — any workspace member can call it.
 * Use this for evaluation creation flows instead of the admin listCriteriaSets().
 */
export async function getConfigCriteriaSets(
  token: string,
  wsId: string,
  options?: { docTypeId?: string; includeInactive?: boolean }
): Promise<EvalCriteriaSet[]> {
  const params: Record<string, string | boolean | undefined> = {
    docTypeId: options?.docTypeId,
    includeInactive: options?.includeInactive,
  };
  const url = buildUrl(`/ws/${wsId}/eval/config/criteria-sets`, params);
  return apiRequest<EvalCriteriaSet[]>(url, token);
}

/**
 * List criteria items for a specific criteria set in a workspace
 * GET /ws/{wsId}/eval/config/criteria-sets/{id}/items
 *
 * This is a RESOURCE route (not admin) — any workspace member can call it.
 */
export async function getConfigCriteriaItems(
  token: string,
  wsId: string,
  criteriaSetId: string,
  options?: { includeInactive?: boolean }
): Promise<EvalCriteriaItem[]> {
  const params: Record<string, string | boolean | undefined> = {
    includeInactive: options?.includeInactive,
  };
  const url = buildUrl(
    `/ws/${wsId}/eval/config/criteria-sets/${criteriaSetId}/items`,
    params
  );
  return apiRequest<EvalCriteriaItem[]>(url, token);
}

// =============================================================================
// DOC TYPES API (Admin — org admin access required)
// =============================================================================

/**
 * List document types for an organization
 * GET /admin/org/eval/doc-types
 */
export async function listDocTypes(
  token: string,
  orgId: string,
  options?: ListDocTypesOptions
): Promise<EvalDocType[]> {
  const params: Record<string, string | boolean | undefined> = {
    orgId,
    includeInactive: options?.includeInactive,
  };
  const url = buildUrl("/admin/org/eval/doc-types", params);
  return apiRequest<EvalDocType[]>(url, token);
}

/**
 * Get a document type with criteria sets
 * GET /admin/org/eval/doc-types/{id}
 */
export async function getDocType(
  token: string,
  orgId: string,
  docTypeId: string
): Promise<EvalDocType> {
  const url = buildUrl(`/admin/org/eval/doc-types/${docTypeId}`, { orgId });
  return apiRequest<EvalDocType>(url, token);
}

/**
 * Create a document type
 * POST /admin/org/eval/doc-types
 */
export async function createDocType(
  token: string,
  orgId: string,
  input: CreateDocTypeInput
): Promise<EvalDocType> {
  const url = buildUrl("/admin/org/eval/doc-types", { orgId });
  return apiRequest<EvalDocType>(url, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Update a document type
 * PATCH /admin/org/eval/doc-types/{id}
 */
export async function updateDocType(
  token: string,
  orgId: string,
  docTypeId: string,
  input: UpdateDocTypeInput
): Promise<EvalDocType> {
  const url = buildUrl(`/admin/org/eval/doc-types/${docTypeId}`, { orgId });
  return apiRequest<EvalDocType>(url, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/**
 * Delete (soft) a document type
 * DELETE /admin/org/eval/doc-types/{id}
 */
export async function deleteDocType(
  token: string,
  orgId: string,
  docTypeId: string
): Promise<{ message: string; id: string }> {
  const url = buildUrl(`/admin/org/eval/doc-types/${docTypeId}`, { orgId });
  return apiRequest<{ message: string; id: string }>(url, token, {
    method: "DELETE",
  });
}

// =============================================================================
// CRITERIA SETS API
// =============================================================================

/**
 * List criteria sets for an organization
 * GET /admin/org/eval/criteria-sets
 */
export async function listCriteriaSets(
  token: string,
  orgId: string,
  options?: ListCriteriaSetsOptions
): Promise<EvalCriteriaSet[]> {
  const params: Record<string, string | boolean | undefined> = {
    orgId,
    docTypeId: options?.docTypeId,
    includeInactive: options?.includeInactive,
  };
  const url = buildUrl("/admin/org/eval/criteria-sets", params);
  return apiRequest<EvalCriteriaSet[]>(url, token);
}

/**
 * Get a criteria set with items
 * GET /admin/org/eval/criteria-sets/{id}
 */
export async function getCriteriaSet(
  token: string,
  orgId: string,
  criteriaSetId: string
): Promise<EvalCriteriaSet> {
  const url = buildUrl(`/admin/org/eval/criteria-sets/${criteriaSetId}`, {
    orgId,
  });
  return apiRequest<EvalCriteriaSet>(url, token);
}

/**
 * Create a criteria set
 * POST /admin/org/eval/criteria-sets
 */
export async function createCriteriaSet(
  token: string,
  orgId: string,
  input: CreateCriteriaSetInput
): Promise<EvalCriteriaSet> {
  const url = buildUrl("/admin/org/eval/criteria-sets", { orgId });
  return apiRequest<EvalCriteriaSet>(url, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Update a criteria set
 * PATCH /admin/org/eval/criteria-sets/{id}
 */
export async function updateCriteriaSet(
  token: string,
  orgId: string,
  criteriaSetId: string,
  input: UpdateCriteriaSetInput
): Promise<EvalCriteriaSet> {
  const url = buildUrl(`/admin/org/eval/criteria-sets/${criteriaSetId}`, {
    orgId,
  });
  return apiRequest<EvalCriteriaSet>(url, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/**
 * Delete (soft) a criteria set
 * DELETE /admin/org/eval/criteria-sets/{id}
 */
export async function deleteCriteriaSet(
  token: string,
  orgId: string,
  criteriaSetId: string
): Promise<{ message: string; id: string }> {
  const url = buildUrl(`/admin/org/eval/criteria-sets/${criteriaSetId}`, {
    orgId,
  });
  return apiRequest<{ message: string; id: string }>(url, token, {
    method: "DELETE",
  });
}

/**
 * Import criteria set from spreadsheet
 * POST /admin/org/eval/criteria-sets/import
 */
export async function importCriteriaSet(
  token: string,
  orgId: string,
  input: ImportCriteriaSetInput
): Promise<ImportCriteriaSetResult> {
  const url = buildUrl("/admin/org/eval/criteria-sets/import", { orgId });
  return apiRequest<ImportCriteriaSetResult>(url, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// =============================================================================
// CRITERIA ITEMS API
// =============================================================================

/**
 * List criteria items for a criteria set
 * GET /admin/org/eval/criteria-sets/{id}/items
 */
export async function listCriteriaItems(
  token: string,
  orgId: string,
  criteriaSetId: string,
  options?: ListCriteriaItemsOptions
): Promise<EvalCriteriaItem[]> {
  const params: Record<string, string | boolean | undefined> = {
    orgId,
    category: options?.category,
    includeInactive: options?.includeInactive,
  };
  const url = buildUrl(
    `/admin/org/eval/criteria-sets/${criteriaSetId}/items`,
    params
  );
  return apiRequest<EvalCriteriaItem[]>(url, token);
}

/**
 * Add a criteria item to a criteria set
 * POST /admin/org/eval/criteria-sets/{id}/items
 */
export async function addCriteriaItem(
  token: string,
  orgId: string,
  criteriaSetId: string,
  input: CreateCriteriaItemInput
): Promise<EvalCriteriaItem> {
  const url = buildUrl(`/admin/org/eval/criteria-sets/${criteriaSetId}/items`, {
    orgId,
  });
  return apiRequest<EvalCriteriaItem>(url, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Update a criteria item
 * PATCH /admin/org/eval/criteria-items/{id}
 */
export async function updateCriteriaItem(
  token: string,
  orgId: string,
  itemId: string,
  input: UpdateCriteriaItemInput
): Promise<EvalCriteriaItem> {
  const url = buildUrl(`/admin/org/eval/criteria-items/${itemId}`, { orgId });
  return apiRequest<EvalCriteriaItem>(url, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/**
 * Delete (soft) a criteria item
 * DELETE /admin/org/eval/criteria-items/{id}
 */
export async function deleteCriteriaItem(
  token: string,
  orgId: string,
  itemId: string
): Promise<{ message: string; id: string }> {
  const url = buildUrl(`/admin/org/eval/criteria-items/${itemId}`, { orgId });
  return apiRequest<{ message: string; id: string }>(url, token, {
    method: "DELETE",
  });
}

// =============================================================================
// EVALUATION CRUD API
// =============================================================================

/**
 * Create a new evaluation
 * POST /ws/{wsId}/eval
 */
export async function createEvaluation(
  token: string,
  workspaceId: string,
  input: CreateEvaluationInput
): Promise<Evaluation> {
  return apiRequest<Evaluation>(`/ws/${workspaceId}/eval`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * List evaluations for a workspace
 * GET /ws/{wsId}/eval
 */
export async function listEvaluations(
  token: string,
  workspaceId: string,
  options?: ListEvaluationsOptions
): Promise<ListEvaluationsResponse> {
  const params: Record<string, string | number | boolean | undefined> = {
    status: options?.status,
    docTypeId: options?.docTypeId,
    includeDeleted: options?.includeDeleted,
    limit: options?.limit,
    offset: options?.offset,
  };
  const url = buildUrl(`/ws/${workspaceId}/eval`, params);
  return apiRequest<ListEvaluationsResponse>(url, token);
}

/**
 * Get evaluation detail with results
 * GET /ws/{wsId}/eval/{id}
 */
export async function getEvaluation(
  token: string,
  workspaceId: string,
  evaluationId: string
): Promise<Evaluation> {
  return apiRequest<Evaluation>(
    `/ws/${workspaceId}/eval/${evaluationId}`,
    token
  );
}

/**
 * Get evaluation status (for polling during processing)
 * GET /ws/{wsId}/eval/{id}/status
 */
export async function getEvaluationStatus(
  token: string,
  workspaceId: string,
  evaluationId: string
): Promise<EvaluationStatusResponse> {
  return apiRequest<EvaluationStatusResponse>(
    `/ws/${workspaceId}/eval/${evaluationId}/status`,
    token
  );
}

/**
 * Update draft evaluation with configuration and trigger processing
 * PATCH /ws/{wsId}/eval/{id}
 */
export async function updateEvaluation(
  token: string,
  workspaceId: string,
  evaluationId: string,
  input: UpdateEvaluationInput
): Promise<Evaluation> {
  return apiRequest<Evaluation>(
    `/ws/${workspaceId}/eval/${evaluationId}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}

/**
 * Delete (soft) an evaluation
 * DELETE /ws/{wsId}/eval/{id}
 */
export async function deleteEvaluation(
  token: string,
  workspaceId: string,
  evaluationId: string
): Promise<{ message: string; id: string }> {
  return apiRequest<{ message: string; id: string }>(
    `/ws/${workspaceId}/eval/${evaluationId}`,
    token,
    { method: "DELETE" }
  );
}

// =============================================================================
// RESULT EDITING API
// =============================================================================

/**
 * Edit a criteria result
 * PATCH /ws/{wsId}/eval/{id}/results/{resultId}
 */
export async function editResult(
  token: string,
  workspaceId: string,
  evaluationId: string,
  resultId: string,
  input: EditResultInput
): Promise<{
  edit: EvalResultEdit;
  criteriaResultId: string;
  evaluationId: string;
  message: string;
}> {
  return apiRequest(
    `/ws/${workspaceId}/eval/${evaluationId}/results/${resultId}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}

/**
 * Get edit history for a criteria result
 * GET /ws/{wsId}/eval/{id}/results/{resultId}/history
 */
export async function getEditHistory(
  token: string,
  workspaceId: string,
  evaluationId: string,
  resultId: string
): Promise<EditHistoryResponse> {
  return apiRequest<EditHistoryResponse>(
    `/ws/${workspaceId}/eval/${evaluationId}/results/${resultId}/history`,
    token
  );
}

// =============================================================================
// EXPORT API
// =============================================================================

/**
 * Export evaluation as PDF
 * GET /ws/{wsId}/eval/{id}/export/pdf
 */
export async function exportPdf(
  token: string,
  workspaceId: string,
  evaluationId: string
): Promise<ExportResponse> {
  return apiRequest<ExportResponse>(
    `/ws/${workspaceId}/eval/${evaluationId}/export/pdf`,
    token
  );
}

/**
 * Export evaluation as XLSX
 * GET /ws/{wsId}/eval/{id}/export/xlsx
 */
export async function exportXlsx(
  token: string,
  workspaceId: string,
  evaluationId: string
): Promise<ExportResponse> {
  return apiRequest<ExportResponse>(
    `/ws/${workspaceId}/eval/${evaluationId}/export/xlsx`,
    token
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Download export file from response
 * Handles both URL and inline content responses
 */
export async function downloadExport(
  response: ExportResponse,
  defaultFileName?: string
): Promise<void> {
  if ("downloadUrl" in response) {
    // URL response - open in new tab or download
    window.open(response.downloadUrl, "_blank");
  } else {
    // Inline content response - create blob and download
    const byteCharacters = atob(response.content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: response.contentType });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = response.fileName || defaultFileName || "export";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Poll evaluation status until complete or failed
 */
export async function pollEvaluationStatus(
  token: string,
  workspaceId: string,
  evaluationId: string,
  options?: {
    intervalMs?: number;
    maxAttempts?: number;
    onProgress?: (status: EvaluationStatusResponse) => void;
  }
): Promise<EvaluationStatusResponse> {
  const intervalMs = options?.intervalMs || 2000;
  const maxAttempts = options?.maxAttempts || 300; // 10 minutes at 2s intervals

  let attempts = 0;

  while (attempts < maxAttempts) {
    const status = await getEvaluationStatus(token, workspaceId, evaluationId);

    options?.onProgress?.(status);

    if (status.status === "completed" || status.status === "failed") {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    attempts++;
  }

  throw new EvalApiError("Polling timeout - evaluation still processing", 408);
}

/**
 * Helper to convert file to base64 for import
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:text/csv;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Helper to prepare import input from file
 */
export async function prepareImportInput(
  file: File,
  docTypeId: string,
  name: string,
  options?: {
    description?: string;
    version?: string;
    useWeightedScoring?: boolean;
  }
): Promise<ImportCriteriaSetInput> {
  const fileContent = await fileToBase64(file);
  const fileType = file.name.toLowerCase().endsWith(".xlsx")
    ? "xlsx"
    : file.name.toLowerCase().endsWith(".xls")
      ? "xlsx"
      : "csv";

  return {
    docTypeId,
    name,
    description: options?.description,
    version: options?.version,
    useWeightedScoring: options?.useWeightedScoring,
    fileContent,
    fileName: file.name,
    fileType,
  };
}
