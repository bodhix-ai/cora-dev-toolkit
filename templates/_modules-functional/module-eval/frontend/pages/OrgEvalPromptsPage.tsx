/**
 * OrgEvalPromptsPage - Organization Evaluation Prompts Page
 *
 * Org admin page for managing organization-level AI prompts (when delegated):
 * - Document summary prompt configuration
 * - Evaluation prompt configuration
 * - Evaluation summary prompt configuration
 *
 * @example
 * // In Next.js app router: app/(admin)/admin/org/eval/prompts/page.tsx
 * import { OrgEvalPromptsPage } from '@/modules/module-eval/frontend/pages';
 * export default function Page() {
 *   return <OrgEvalPromptsPage orgId={orgId} />;
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
} from "@mui/material";
import {
  Error as ErrorIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { useOrgEvalPrompts, useOrgEvalConfig } from "../hooks";
import { PromptConfigEditor } from "../components";
import type { PromptType } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface OrgEvalPromptsPageProps {
  /** Organization ID */
  orgId: string;
  /** Optional CSS class */
  className?: string;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
}

// =============================================================================
// NOT DELEGATED STATE COMPONENT
// =============================================================================

function NotDelegatedState() {
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
          bgcolor: "action.hover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LockIcon sx={{ width: 32, height: 32, color: "text.secondary" }} />
      </Box>
      <Typography variant="h6" gutterBottom>
        AI Configuration Not Delegated
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", maxWidth: "md" }}>
        Your organization does not have AI prompt customization enabled. Contact
        your platform administrator to request delegation of AI configuration.
      </Typography>
    </Box>
  );
}

// =============================================================================
// PAGE HEADER COMPONENT
// =============================================================================

function PageHeader() {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        AI Prompts
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Customize AI prompts for your organization's document evaluations.
      </Typography>
    </Box>
  );
}

// =============================================================================
// TAB NAVIGATION COMPONENT
// =============================================================================

interface TabNavigationProps {
  activeTab: PromptType;
  onTabChange: (tab: PromptType) => void;
}

function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: Array<{ id: PromptType; label: string }> = [
    { id: "doc_summary", label: "Document Summary" },
    { id: "evaluation", label: "Evaluation" },
    { id: "eval_summary", label: "Evaluation Summary" },
  ];

  const handleChange = (_event: React.SyntheticEvent, newValue: PromptType) => {
    onTabChange(newValue);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
      <Tabs value={activeTab} onChange={handleChange} aria-label="prompt types">
        {tabs.map((tab) => (
          <Tab key={tab.id} value={tab.id} label={tab.label} />
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
      <Typography variant="h6" gutterBottom>
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

export function OrgEvalPromptsPage({
  orgId,
  className = "",
  loadingComponent,
}: OrgEvalPromptsPageProps) {
  // Get auth token
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
    // Note: authAdapter is intentionally omitted from deps - it's a stable reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // State
  const [activeTab, setActiveTab] = useState<PromptType>("doc_summary");

  // Hooks
  const { config, isLoading: isConfigLoading } = useOrgEvalConfig(token, orgId);

  const {
    prompts,
    isLoading: isPromptsLoading,
    error,
    update: updatePrompt,
    test: testPrompt,
    refresh,
  } = useOrgEvalPrompts(token, orgId);

  // Check if delegation is enabled
  const isDelegated = config?.aiConfigDelegated === true;

  // Get current prompt config
  const currentPrompt = prompts?.find((p) => p.promptType === activeTab);

  // Combined loading state
  const isLoading = isConfigLoading || isPromptsLoading || !token;

  // Handlers
  const handleTabChange = useCallback((tab: PromptType) => {
    setActiveTab(tab);
  }, []);

  const handleUpdatePrompt = useCallback(
    async (data: {
      systemPrompt?: string;
      userPromptTemplate?: string;
      aiProvider?: string;
      aiModel?: string;
      temperature?: number;
    }) => {
      if (!token || !orgId) return;
      await updatePrompt(activeTab, data);
    },
    [token, orgId, updatePrompt, activeTab]
  );

  const handleTestPrompt = useCallback(
    async (testInput: string) => {
      if (!token || !orgId) return "";
      return await testPrompt(activeTab, testInput);
    },
    [token, orgId, testPrompt, activeTab]
  );

  // Render loading state
  if (isLoading) {
    return (
      <Box sx={{ p: 3 }} className={className}>
        {loadingComponent || <LoadingState />}
      </Box>
    );
  }

  // Render not delegated state
  if (!isDelegated) {
    return (
      <Box sx={{ p: 3 }} className={className}>
        <PageHeader />
        <NotDelegatedState />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box sx={{ p: 3 }} className={className}>
        <ErrorState error={error} onRetry={refresh} />
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
          onSave={handleUpdatePrompt}
          onTest={handleTestPrompt}
          isSystemLevel={false}
        />
      </Paper>
    </Box>
  );
}

export default OrgEvalPromptsPage;
