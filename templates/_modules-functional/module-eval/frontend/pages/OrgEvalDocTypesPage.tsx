/**
 * OrgEvalDocTypesPage - Organization Document Types Page
 *
 * Org admin page for managing document types:
 * - Create, edit, delete document types
 * - View associated criteria sets
 *
 * @example
 * // In Next.js app router: app/(admin)/admin/org/eval/doc-types/page.tsx
 * import { OrgEvalDocTypesPage } from '@/modules/module-eval/frontend/pages';
 * export default function Page() {
 *   return <OrgEvalDocTypesPage orgId={orgId} />;
 * }
 */

"use client";

import React, { useCallback, useState, useEffect } from "react";
import {
  Box,
  Typography,
  Skeleton,
  Button,
  Paper,
  Grid,
} from "@mui/material";
import { Error as ErrorIcon } from "@mui/icons-material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { useEvalDocTypes } from "../hooks";
import { DocTypeManager } from "../components";

// =============================================================================
// TYPES
// =============================================================================

export interface OrgEvalDocTypesPageProps {
  /** Organization ID */
  orgId: string;
  /** Optional CSS class */
  className?: string;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Callback when navigating to criteria for a doc type */
  onNavigateToCriteria?: (docTypeId: string) => void;
}

// =============================================================================
// PAGE HEADER COMPONENT
// =============================================================================

function PageHeader() {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Document Types
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Manage document types for your organization. Each document type can have
        associated criteria sets for evaluation.
      </Typography>
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
      <Grid container spacing={2}>
        {[1, 2, 3].map((i) => (
          <Grid item xs={12} md={6} lg={4} key={i}>
            <Skeleton variant="rectangular" height={128} sx={{ borderRadius: 1 }} />
          </Grid>
        ))}
      </Grid>
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
        Failed to load document types
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

export function OrgEvalDocTypesPage({
  orgId,
  className = "",
  loadingComponent,
  onNavigateToCriteria,
}: OrgEvalDocTypesPageProps) {
  // Get auth token (same pattern as working SysEvalConfigPage)
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hooks
  const {
    docTypes,
    isLoading: docTypesLoading,
    error,
    create: createDocType,
    update: updateDocType,
    remove: deleteDocType,
    refresh,
  } = useEvalDocTypes(token, orgId);

  // Combined loading state
  const isLoading = docTypesLoading || !token;

  // Handlers
  const handleCreateDocType = useCallback(
    async (data: { name: string; description?: string }) => {
      if (!token || !orgId) return;
      await createDocType(data);
    },
    [token, orgId, createDocType]
  );

  const handleUpdateDocType = useCallback(
    async (id: string, data: { name?: string; description?: string; isActive?: boolean }) => {
      if (!token || !orgId) return;
      await updateDocType(id, data);
    },
    [token, orgId, updateDocType]
  );

  const handleDeleteDocType = useCallback(
    async (id: string) => {
      if (!token || !orgId) return;
      await deleteDocType(id);
    },
    [token, orgId, deleteDocType]
  );

  const handleViewCriteria = useCallback(
    (docTypeId: string) => {
      onNavigateToCriteria?.(docTypeId);
    },
    [onNavigateToCriteria]
  );

  // Render loading state
  if (isLoading) {
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
        <ErrorState error={typeof error === 'string' ? new Error(error) : error} onRetry={refresh} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }} className={className}>
      {/* Page Header */}
      <PageHeader />

      {/* Doc Type Manager */}
      <DocTypeManager
        docTypes={docTypes || []}
        onCreate={handleCreateDocType}
        onUpdate={handleUpdateDocType}
        onDelete={handleDeleteDocType}
        onRefresh={refresh}
      />

      {/* Help Text */}
      <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          About Document Types
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5, "& li": { mb: 0.5 } }}>
          <Typography component="li" variant="body2" color="text.secondary">
            Document types categorize the documents your organization evaluates.
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Each document type can have multiple criteria sets for different evaluation scenarios.
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Deactivating a document type hides it from users but preserves existing evaluations.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export default OrgEvalDocTypesPage;
