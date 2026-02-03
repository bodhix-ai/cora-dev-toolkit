/**
 * SysEvalPromptsPage - System Evaluation Prompts Page
 *
 * Platform admin page for managing system-level AI prompts:
 * - Document summary prompt configuration
 * - Evaluation prompt configuration
 * - Evaluation summary prompt configuration
 * - AI provider/model selection
 * - Prompt testing
 *
 * @example
 * // In Next.js app router: app/(admin)/admin/sys/eval/prompts/page.tsx
 * import { SysEvalPromptsPage } from '@/modules/module-eval/frontend/pages';
 * export default function Page() {
 *   return <SysEvalPromptsPage />;
 * }
 */

"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Skeleton,
  Button,
  Paper,
  Alert,
} from "@mui/material";
import { Error as ErrorIcon } from "@mui/icons-material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { useProviders, useDeployments } from "@{{PROJECT_NAME}}/module-ai";
import { useSysEvalPrompts } from "../hooks";
import { PromptConfigEditor } from "../components";
import type { PromptType } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface SysEvalPromptsPageProps {
  /** Optional CSS class */
  className?: string;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
}

// =============================================================================
// PAGE HEADER COMPONENT
// =============================================================================

function PageHeader() {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Default AI Prompts
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Configure the default AI prompts used for document evaluation. These settings
        can be overridden by organizations with delegation enabled.
      </Typography>
    </Box>
  );
}

// =============================================================================
// PROMPT TAB NAVIGATION
// =============================================================================

interface TabNavigationProps {
  activeTab: PromptType;
  onTabChange: (tab: PromptType) => void;
}

function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: Array<{ id: PromptType; label: string; description: string }> = [
    {
      id: "doc_summary",
      label: "Document Summary",
      description: "Generates summaries for individual documents",
    },
    {
      id: "evaluation",
      label: "Evaluation",
      description: "Evaluates criteria against document content",
    },
    {
      id: "eval_summary",
      label: "Evaluation Summary",
      description: "Generates overall evaluation summary",
    },
  ];

  const handleChange = (_event: React.SyntheticEvent, newValue: PromptType) => {
    onTabChange(newValue);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
      <Tabs value={activeTab} onChange={handleChange} aria-label="prompt types">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            value={tab.id}
            label={
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  {tab.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {tab.description}
                </Typography>
              </Box>
            }
            sx={{ textTransform: "none", alignItems: "flex-start" }}
          />
        ))}
      </Tabs>
    </Box>
  );
}

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

function LoadingState() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={384} sx={{ borderRadius: 1 }} />
    </Box>
  );
}

// =============================================================================
// ERROR STATE COMPONENT
// =============================================================================

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 2,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          mb: 2,
          borderRadius: "50%",
          bgcolor: "error.lighter",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ErrorIcon sx={{ width: 32, height: 32, color: "error.main" }} />
      </Box>
      <Typography variant="h5" gutterBottom>
        Failed to load prompts
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 3, maxWidth: "md" }}>
        {error.message}
      </Typography>
      <Button variant="contained" onClick={onRetry}>
        Try Again
      </Button>
    </Box>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SysEvalPromptsPage({
  className = "",
  loadingComponent,
}: SysEvalPromptsPageProps) {
  // Get auth
  const { authAdapter } = useUser();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchToken() {
      try {
        const t = await authAdapter.getToken();
        if (mounted) setToken(t);
      } catch (error) {
        console.error("Failed to get auth token:", error);
        if (mounted) setToken(null);
      }
    }
    fetchToken();
    return () => { mounted = false; };
  }, [authAdapter]);

  // State
  const [activeTab, setActiveTab] = useState<PromptType>("doc_summary");
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [aiModels, setAiModels] = useState<{ id: string; name: string }[]>([]);

  // Hooks
  const {
    prompts,
    isLoading,
    update,
    refresh,
    getPromptByType,
  } = useSysEvalPrompts(token);

  // Load AI providers and deployments from module-ai
  const { providers, getModels } = useProviders(authAdapter);
  const { deployments } = useDeployments(authAdapter);

  // Get current prompt config
  const currentPrompt = getPromptByType(activeTab);

  // Load models when provider changes
  useEffect(() => {
    async function loadModels() {
      if (selectedProviderId && getModels) {
        const models = await getModels(selectedProviderId);
        setAiModels(
          models.map((m) => ({
            id: m.id,
            name: m.displayName || m.modelId,
          }))
        );
      } else {
        setAiModels([]);
      }
    }
    loadModels();
  }, [selectedProviderId, getModels]);

  // Set initial provider when prompt loads
  useEffect(() => {
    if (currentPrompt?.aiProviderId) {
      setSelectedProviderId(currentPrompt.aiProviderId);
    }
  }, [currentPrompt?.aiProviderId]);

  // Handlers
  const handleTabChange = useCallback((tab: PromptType) => {
    setActiveTab(tab);
  }, []);

  const handleProviderChange = useCallback((providerId: string) => {
    setSelectedProviderId(providerId);
  }, []);

  const handleUpdatePrompt = useCallback(
    async (data: {
      aiProviderId?: string;
      aiModelId?: string;
      systemPrompt?: string;
      userPromptTemplate?: string;
      temperature?: number;
      maxTokens?: number;
    }) => {
      await update(activeTab, data);
    },
    [update, activeTab]
  );

  // Render loading state
  if (isLoading || !token || !prompts || !currentPrompt) {
    return (
      <Box sx={{ p: 3 }} className={className}>
        {loadingComponent || <LoadingState />}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }} className={className}>
      {/* Page Header */}
      <PageHeader />

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Prompt Editor */}
      <Paper variant="outlined">
        <PromptConfigEditor
          promptType={activeTab}
          config={currentPrompt}
          aiProviders={providers.map((p) => ({
            id: p.id,
            name: p.displayName || p.name,
          }))}
          aiModels={aiModels}
          deployments={deployments}
          onSave={handleUpdatePrompt}
          onProviderChange={handleProviderChange}
        />
      </Paper>

      {/* Help Text */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          About AI Prompts
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5, "& li": { mb: 0.5 } }}>
          <Typography component="li" variant="body2">
            <strong>Document Summary:</strong> Used to generate concise summaries of uploaded documents.
          </Typography>
          <Typography component="li" variant="body2">
            <strong>Evaluation:</strong> Used to evaluate each criteria item against the document content with RAG context.
          </Typography>
          <Typography component="li" variant="body2">
            <strong>Evaluation Summary:</strong> Used to generate the overall compliance assessment after all criteria are evaluated.
          </Typography>
        </Box>
        <Typography variant="caption" display="block" sx={{ mt: 1.5 }}>
          Organizations with AI delegation enabled can override these prompts with their own configurations.
        </Typography>
      </Alert>
    </Box>
  );
}

export default SysEvalPromptsPage;
