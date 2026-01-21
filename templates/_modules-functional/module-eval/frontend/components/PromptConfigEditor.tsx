/**
 * PromptConfigEditor - Prompt Configuration Editor Component
 *
 * Admin component for editing AI prompt configurations.
 * Supports system-level and org-level prompt overrides.
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  Chip,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  FormHelperText,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ScienceIcon from "@mui/icons-material/Science";
import SearchIcon from "@mui/icons-material/Search";
import type {
  EvalSysPromptConfig,
  EvalOrgPromptConfig,
  EvalMergedPromptConfig,
  PromptConfigInput,
  PromptTestResult,
  PromptType,
} from "../types";
import type { DeploymentInfo } from "../types/ai-models";
import { ModelSelectionModal } from "./ModelSelectionModal";

// =============================================================================
// TYPES
// =============================================================================

export interface PromptConfigEditorProps {
  /** Prompt type being edited */
  promptType: PromptType;
  /** Merged/effective prompt config */
  config: EvalMergedPromptConfig;
  /** System config (for reference in org view) */
  sysConfig?: EvalSysPromptConfig;
  /** Available AI providers (simple list for legacy support) */
  aiProviders?: { id: string; name: string }[];
  /** Available AI models (simple list for legacy support) */
  aiModels?: { id: string; name: string }[];
  /** Full deployment info for enhanced model selector (preferred) */
  deployments?: DeploymentInfo[];
  /** Whether editing is allowed (for org: delegation must be enabled) */
  canEdit?: boolean;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Whether test is in progress */
  isTesting?: boolean;
  /** Test result */
  testResult?: PromptTestResult | null;
  /** Error message */
  error?: string | null;
  /** Callback when saving config */
  onSave: (input: PromptConfigInput) => Promise<void>;
  /** Callback when testing prompt */
  onTest?: (input: { systemPrompt?: string; userPromptTemplate?: string }) => Promise<PromptTestResult>;
  /** Callback when provider changes */
  onProviderChange?: (providerId: string) => void;
  /** Callback when resetting to system defaults (org level only) */
  onResetToDefault?: () => Promise<void>;
  /** Custom class name */
  className?: string;
}

export interface PromptPreviewProps {
  /** System prompt */
  systemPrompt: string;
  /** User prompt template */
  userPromptTemplate: string;
  /** Whether preview is expanded */
  isExpanded?: boolean;
  /** Toggle expansion */
  onToggle?: () => void;
}

export interface TestVariablesFormProps {
  /** Test variables */
  variables: Record<string, string>;
  /** Update variables */
  onChange: (variables: Record<string, string>) => void;
  /** Whether disabled */
  disabled?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PROMPT_TYPE_LABELS: Record<PromptType, string> = {
  doc_summary: "Document Summary",
  evaluation: "Criteria Evaluation",
  eval_summary: "Evaluation Summary",
};

const PROMPT_TYPE_DESCRIPTIONS: Record<PromptType, string> = {
  doc_summary: "Generates a summary of uploaded documents",
  evaluation: "Evaluates documents against each criteria item",
  eval_summary: "Generates overall evaluation summary and compliance score",
};

const DEFAULT_TEST_VARIABLES: Record<PromptType, Record<string, string>> = {
  doc_summary: {
    document_name: "IT Security Policy v2.3.pdf",
    document_content: "[Document content will be inserted here]",
  },
  evaluation: {
    criteria_id: "AC-1",
    requirement: "The organization develops, documents, and disseminates an access control policy.",
    document_context: "[RAG context will be inserted here]",
  },
  eval_summary: {
    results_summary: "[Criteria results will be inserted here]",
    total_criteria: "50",
    compliant_count: "42",
  },
};

// =============================================================================
// PROMPT PREVIEW
// =============================================================================

export function PromptPreview({
  systemPrompt,
  userPromptTemplate,
  isExpanded = false,
  onToggle,
}: PromptPreviewProps) {
  return (
    <Accordion expanded={isExpanded} onChange={onToggle}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="body2" fontWeight={500}>
          Preview
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
              System Prompt
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 1,
                backgroundColor: "background.paper",
                overflowX: "auto",
              }}
            >
              <Typography
                component="pre"
                variant="caption"
                sx={{
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  m: 0,
                }}
              >
                {systemPrompt || "(empty)"}
              </Typography>
            </Paper>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
              User Prompt Template
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 1,
                backgroundColor: "background.paper",
                overflowX: "auto",
              }}
            >
              <Typography
                component="pre"
                variant="caption"
                sx={{
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  m: 0,
                }}
              >
                {userPromptTemplate || "(empty)"}
              </Typography>
            </Paper>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

// =============================================================================
// TEST VARIABLES FORM
// =============================================================================

export function TestVariablesForm({
  variables,
  onChange,
  disabled = false,
}: TestVariablesFormProps) {
  const entries = Object.entries(variables);

  if (entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No template variables detected.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {entries.map(([key, value]) => (
        <TextField
          key={key}
          id={`var-${key}`}
          label={`{{${key}}}`}
          value={value}
          onChange={(e) => onChange({ ...variables, [key]: e.target.value })}
          disabled={disabled}
          size="small"
          fullWidth
        />
      ))}
    </Box>
  );
}

// =============================================================================
// PROMPT CONFIG EDITOR
// =============================================================================

export function PromptConfigEditor({
  promptType,
  config,
  sysConfig,
  aiProviders = [],
  aiModels = [],
  deployments = [],
  canEdit = true,
  isSaving = false,
  isTesting = false,
  testResult,
  error,
  onSave,
  onTest,
  onProviderChange,
  onResetToDefault,
  className = "",
}: PromptConfigEditorProps) {
  const [aiProviderId, setAiProviderId] = useState(config?.aiProviderId || "");
  const [aiModelId, setAiModelId] = useState(config?.aiModelId || "");
  const [systemPrompt, setSystemPrompt] = useState(config?.systemPrompt || "");
  const [userPromptTemplate, setUserPromptTemplate] = useState(
    config?.userPromptTemplate || ""
  );
  const [temperature, setTemperature] = useState((config?.temperature ?? 0.7).toString());
  const [maxTokens, setMaxTokens] = useState((config?.maxTokens ?? 2000).toString());
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [testVariables, setTestVariables] = useState<Record<string, string>>(
    DEFAULT_TEST_VARIABLES[promptType] || {}
  );
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);

  // Sync state when config prop changes (e.g., when switching between prompt types)
  useEffect(() => {
    if (!config) return;
    setAiProviderId(config.aiProviderId || "");
    setAiModelId(config.aiModelId || "");
    setSystemPrompt(config.systemPrompt || "");
    setUserPromptTemplate(config.userPromptTemplate || "");
    setTemperature((config.temperature ?? 0.7).toString());
    setMaxTokens((config.maxTokens ?? 2000).toString());
    setTestVariables(DEFAULT_TEST_VARIABLES[promptType] || {});
  }, [config, promptType]);

  const handleProviderChange = (providerId: string) => {
    setAiProviderId(providerId);
    setAiModelId(""); // Reset model when provider changes
    onProviderChange?.(providerId);
  };

  const handleModelSelect = (modelId: string) => {
    // Find the selected model to get provider info
    const selectedDeployment = deployments.find((d) => d.id === modelId);
    if (selectedDeployment) {
      setAiProviderId(selectedDeployment.providerType);
      setAiModelId(modelId);
    }
    setShowModelSelector(false);
  };

  const getSelectedModelName = () => {
    if (deployments.length > 0) {
      const selected = deployments.find((d) => d.id === aiModelId);
      return selected ? `${selected.modelName} (${selected.provider})` : "None selected";
    }
    // Fallback to simple list
    const selected = aiModels.find((m) => m.id === aiModelId);
    return selected ? selected.name : "None selected";
  };

  const handleSave = async () => {
    const tempNum = parseFloat(temperature);
    if (isNaN(tempNum) || tempNum < 0 || tempNum > 2) {
      setLocalError("Temperature must be between 0 and 2");
      return;
    }

    const maxTokensNum = parseInt(maxTokens);
    if (isNaN(maxTokensNum) || maxTokensNum < 1) {
      setLocalError("Max tokens must be a positive number");
      return;
    }

    try {
      setLocalError(null);
      await onSave({
        aiProviderId: aiProviderId || undefined,
        aiModelId: aiModelId || undefined,
        systemPrompt: systemPrompt || undefined,
        userPromptTemplate: userPromptTemplate || undefined,
        temperature: tempNum,
        maxTokens: maxTokensNum,
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleTest = async () => {
    if (!onTest) return;
    try {
      setLocalError(null);
      await onTest({
        systemPrompt,
        userPromptTemplate,
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Test failed");
    }
  };

  const displayError = error || localError;

  // Handle undefined config (happens when loading or no config exists)
  if (!config) {
    return (
      <Box className={className} sx={{ p: 3 }}>
        <Alert severity="info">
          Loading prompt configuration...
        </Alert>
      </Box>
    );
  }

  return (
    <Box className={className}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              {PROMPT_TYPE_LABELS[promptType]} Prompt
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {PROMPT_TYPE_DESCRIPTIONS[promptType]}
            </Typography>
          </Box>
          {config.hasOrgOverride && (
            <Chip label="Org Override" color="info" size="small" />
          )}
        </Box>
      </Box>

      {/* Not Editable Warning */}
      {!canEdit && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          AI configuration is managed at the system level. Contact your
          platform administrator to enable org-level prompt customization.
        </Alert>
      )}

      {/* Form */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* AI Model Selection */}
        {deployments.length > 0 ? (
          /* Enhanced model selector with search and filters */
          <Box>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
              AI Model
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Selected Model:
                </Typography>
                <Typography variant="body1">{getSelectedModelName()}</Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<SearchIcon />}
                onClick={() => setShowModelSelector(true)}
                disabled={!canEdit || isSaving}
              >
                Browse Models
              </Button>
            </Paper>
            <ModelSelectionModal
              open={showModelSelector}
              onClose={() => setShowModelSelector(false)}
              models={deployments}
              onSelectModel={handleModelSelect}
              title="Select AI Model for Evaluation"
            />
          </Box>
        ) : (
          /* Fallback to simple dropdowns if deployments not available */
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="prompt-provider-label">AI Provider</InputLabel>
                <Select
                  labelId="prompt-provider-label"
                  id="prompt-provider"
                  value={aiProviderId}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  disabled={!canEdit || isSaving}
                  label="AI Provider"
                >
                  <MenuItem value="">Default</MenuItem>
                  {aiProviders.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="prompt-model-label">AI Model</InputLabel>
                <Select
                  labelId="prompt-model-label"
                  id="prompt-model"
                  value={aiModelId}
                  onChange={(e) => setAiModelId(e.target.value)}
                  disabled={!canEdit || isSaving || !aiProviderId}
                  label="AI Model"
                >
                  <MenuItem value="">Default</MenuItem>
                  {aiModels.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}

        {/* Temperature & Max Tokens */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              id="prompt-temperature"
              label="Temperature"
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              disabled={!canEdit || isSaving}
              inputProps={{ min: 0, max: 2, step: 0.1 }}
              size="small"
              fullWidth
              helperText="0 = deterministic, 1 = creative"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              id="prompt-max-tokens"
              label="Max Tokens"
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              disabled={!canEdit || isSaving}
              inputProps={{ min: 1 }}
              size="small"
              fullWidth
              helperText="Max response length"
            />
          </Grid>
        </Grid>

        {/* System Prompt */}
        <TextField
          id="prompt-system"
          label="System Prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          disabled={!canEdit || isSaving}
          multiline
          rows={4}
          placeholder="You are an expert document evaluator..."
          fullWidth
          InputProps={{
            sx: { fontFamily: "monospace" },
          }}
        />

        {/* User Prompt Template */}
        <Box>
          <TextField
            id="prompt-user"
            label="User Prompt Template"
            value={userPromptTemplate}
            onChange={(e) => setUserPromptTemplate(e.target.value)}
            disabled={!canEdit || isSaving}
            multiline
            rows={6}
            placeholder="Evaluate the following document against the criteria..."
            fullWidth
            InputProps={{
              sx: { fontFamily: "monospace" },
            }}
          />
          <FormHelperText>
            Use {`{{variable_name}}`} for template placeholders
          </FormHelperText>
        </Box>

        {/* Preview */}
        <PromptPreview
          systemPrompt={systemPrompt}
          userPromptTemplate={userPromptTemplate}
          isExpanded={showPreview}
          onToggle={() => setShowPreview(!showPreview)}
        />

        {/* Test Panel */}
        {onTest && (
          <Accordion expanded={showTestPanel} onChange={() => setShowTestPanel(!showTestPanel)}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ScienceIcon fontSize="small" />
                <Typography variant="body2" fontWeight={500}>
                  Test Prompt
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <TestVariablesForm
                  variables={testVariables}
                  onChange={setTestVariables}
                  disabled={isTesting}
                />
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Button
                    onClick={handleTest}
                    disabled={isTesting || !canEdit}
                    variant="contained"
                    color="success"
                    size="small"
                  >
                    {isTesting ? "Testing..." : "Run Test"}
                  </Button>
                </Box>
                {testResult && (
                  <Paper variant="outlined" sx={{ p: 2, backgroundColor: "grey.50" }}>
                    <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                      Test Result
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      {testResult.message}
                    </Typography>
                    {testResult.renderedSystemPrompt && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Rendered System:
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 1, mt: 0.5, overflowX: "auto" }}>
                          <Typography
                            component="pre"
                            variant="caption"
                            sx={{
                              fontFamily: "monospace",
                              whiteSpace: "pre-wrap",
                              m: 0,
                            }}
                          >
                            {testResult.renderedSystemPrompt}
                          </Typography>
                        </Paper>
                      </Box>
                    )}
                    {testResult.renderedUserPrompt && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Rendered User:
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 1, mt: 0.5, overflowX: "auto" }}>
                          <Typography
                            component="pre"
                            variant="caption"
                            sx={{
                              fontFamily: "monospace",
                              whiteSpace: "pre-wrap",
                              m: 0,
                            }}
                          >
                            {testResult.renderedUserPrompt}
                          </Typography>
                        </Paper>
                      </Box>
                    )}
                  </Paper>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {/* System Default Reference (for org level) */}
        {sysConfig && (
          <Paper variant="outlined" sx={{ p: 2, backgroundColor: "grey.50" }}>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1.5 }}>
              System Default
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Temperature:</strong> {sysConfig.temperature}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                <strong>Max Tokens:</strong> {sysConfig.maxTokens}
              </Typography>
            </Box>
            {onResetToDefault && canEdit && (
              <Button
                onClick={onResetToDefault}
                disabled={isSaving}
                size="small"
                sx={{ mt: 1.5 }}
              >
                Reset to system default
              </Button>
            )}
          </Paper>
        )}

        {/* Error */}
        {displayError && (
          <Alert severity="error">{displayError}</Alert>
        )}

        {/* Actions */}
        {canEdit && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 1 }}>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              variant="contained"
              color="primary"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default PromptConfigEditor;
