/**
 * SysEvalConfigPage - System Evaluation Configuration Page
 *
 * Platform admin page for managing system-level evaluation settings:
 * - Scoring configuration (categorical mode, numerical scores)
 * - Status options management
 * - Organization delegation management
 *
 * @example
 * // In Next.js app router: app/(admin)/admin/sys/eval/config/page.tsx
 * import { SysEvalConfigPage } from '@/modules/module-eval/frontend/pages';
 * export default function Page() {
 *   return <SysEvalConfigPage />;
 * }
 */

"use client";

import React, { useCallback, useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  Button,
  Alert,
} from "@mui/material";
import { Error as ErrorIcon } from "@mui/icons-material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import {
  useSysEvalConfig,
  useSysStatusOptions,
  useOrgsDelegation,
} from "../hooks";
import {
  ScoringConfigPanel,
  StatusOptionManager,
  OrgDelegationManager,
} from "../components";

// =============================================================================
// TYPES
// =============================================================================

export interface SysEvalConfigPageProps {
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
        Evaluation Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Configure platform-level evaluation settings, scoring options, and organization delegation.
      </Typography>
    </Box>
  );
}

// =============================================================================
// SECTION COMPONENT
// =============================================================================

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  return (
    <Paper variant="outlined">
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </Box>
      <Box sx={{ p: 3 }}>{children}</Box>
    </Paper>
  );
}

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

function LoadingState() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={192} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={256} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={192} sx={{ borderRadius: 1 }} />
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
        Failed to load configuration
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

export function SysEvalConfigPage({
  className = "",
  loadingComponent,
}: SysEvalConfigPageProps) {
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
  }, [authAdapter]);

  // Hooks
  const {
    config,
    isLoading: isConfigLoading,
    error: configError,
    update: updateConfig,
    refresh: refreshConfig,
  } = useSysEvalConfig(token);

  const {
    options: statusOptions,
    isLoading: isStatusLoading,
    create: createOption,
    update: updateOption,
    remove: deleteOption,
    refresh: refreshStatus,
  } = useSysStatusOptions(token);

  const {
    orgs,
    toggle: toggleDelegation,
    refresh: refreshOrgs,
  } = useOrgsDelegation(token);

  // Combined loading and error states
  const isLoading = isConfigLoading || isStatusLoading || !token;
  const error = configError;

  // Handlers
  const handleRefresh = useCallback(() => {
    refreshConfig();
    refreshStatus();
    refreshOrgs();
  }, [refreshConfig, refreshStatus, refreshOrgs]);

  const handleScoringUpdate = useCallback(
    async (updates: { categoricalMode?: string; showNumericalScore?: boolean }) => {
      await updateConfig(updates);
    },
    [updateConfig]
  );

  // Render loading state
  if (isLoading || !config) {
    return (
      <Box sx={{ p: 3 }} className={className}>
        {loadingComponent || <LoadingState />}
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box sx={{ p: 3 }} className={className}>
        <ErrorState error={error instanceof Error ? error : new Error(error || 'Unknown error')} onRetry={handleRefresh} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }} className={className}>
      {/* Page Header */}
      <PageHeader />

      {/* Scoring Configuration */}
      <Section
        title="Scoring Configuration"
        description="Configure how evaluations are scored across the platform."
      >
        <ScoringConfigPanel
          config={{
            categoricalMode: config?.categoricalMode || "boolean",
            showNumericalScore: config?.showNumericalScore || false,
          }}
          onSave={handleScoringUpdate}
          isSystemLevel
        />
      </Section>

      {/* Status Options */}
      <Section
        title="Default Status Options"
        description="Configure the default status options available for evaluation results."
      >
        <StatusOptionManager
          statusOptions={statusOptions || []}
          onCreate={createOption}
          onUpdate={updateOption}
          onDelete={deleteOption}
          onRefresh={refreshStatus}
          isSystemLevel
        />
      </Section>

      {/* Organization Delegation */}
      <Section
        title="Organization Delegation"
        description="Control which organizations can customize their own AI prompts and models."
      >
        <OrgDelegationManager
          organizations={orgs || []}
          onToggle={toggleDelegation}
          onRefresh={refreshOrgs}
        />
      </Section>
    </Box>
  );
}

export default SysEvalConfigPage;
