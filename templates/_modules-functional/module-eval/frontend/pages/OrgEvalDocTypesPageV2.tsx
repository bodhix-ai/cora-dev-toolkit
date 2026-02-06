/**
 * OrgEvalDocTypesPageV2 - Organization Document Types Page (Simplified)
 *
 * Simplified version that avoids infinite loops by:
 * - Using direct API calls (no Zustand store)
 * - Simple useState for local state management
 * - Controlled useEffect with stable dependencies
 * - Reusing the working DocTypeManager component
 *
 * @example
 * // In Next.js app router: app/(admin)/admin/org/eval/doc-types/page.tsx
 * import { OrgEvalDocTypesPageV2 } from '@/modules/module-eval/frontend/pages';
 * export default function Page() {
 *   return <OrgEvalDocTypesPageV2 orgId={orgId} />;
 * }
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { DocTypeManager } from "../components";
import {
  listDocTypes,
  createDocType,
  updateDocType,
  deleteDocType,
} from "../lib/api";
import type {
  EvalDocType,
  CreateDocTypeInput,
  UpdateDocTypeInput,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface OrgEvalDocTypesPageV2Props {
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
        Policy Areas
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Manage policy areas for your organization. Each policy area can have
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
        Failed to load policy areas
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

export function OrgEvalDocTypesPageV2({
  orgId,
  className = "",
  loadingComponent,
  onNavigateToCriteria,
}: OrgEvalDocTypesPageV2Props) {
  // Local state (no store)
  const [docTypes, setDocTypes] = useState<EvalDocType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Get auth adapter
  const { authAdapter } = useUser();

  // Fetch token once on mount
  useEffect(() => {
    let mounted = true;
    
    async function fetchToken() {
      try {
        const t = await authAdapter.getToken();
        if (mounted) {
          setToken(t);
        }
      } catch (err) {
        console.error("Failed to get auth token:", err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error("Failed to get auth token"));
          setIsLoading(false);
        }
      }
    }

    fetchToken();

    return () => {
      mounted = false;
    };
  }, []); // Only run once on mount

  // Load doc types when token is available
  const loadDocTypes = useCallback(async () => {
    if (!token || !orgId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await listDocTypes(token, orgId, { includeInactive: false });
      setDocTypes(data);
    } catch (err) {
      console.error("Failed to load doc types:", err);
      setError(err instanceof Error ? err : new Error("Failed to load doc types"));
    } finally {
      setIsLoading(false);
    }
  }, [token, orgId]);

  // Load doc types when token becomes available
  useEffect(() => {
    if (token && orgId) {
      loadDocTypes();
    }
  }, [token, orgId, loadDocTypes]);

  // Create handler
  const handleCreate = useCallback(
    async (input: CreateDocTypeInput) => {
      if (!token || !orgId) {
        throw new Error("No auth token or org ID");
      }

      const newDocType = await createDocType(token, orgId, input);
      setDocTypes((prev) => [...prev, newDocType]);
    },
    [token, orgId]
  );

  // Update handler
  const handleUpdate = useCallback(
    async (id: string, input: UpdateDocTypeInput) => {
      if (!token || !orgId) {
        throw new Error("No auth token or org ID");
      }

      const updatedDocType = await updateDocType(token, orgId, id, input);
      setDocTypes((prev) =>
        prev.map((dt) => (dt.id === id ? updatedDocType : dt))
      );
    },
    [token, orgId]
  );

  // Delete handler
  const handleDelete = useCallback(
    async (id: string) => {
      if (!token || !orgId) {
        throw new Error("No auth token or org ID");
      }

      await deleteDocType(token, orgId, id);
      setDocTypes((prev) => prev.filter((dt) => dt.id !== id));
    },
    [token, orgId]
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
        <ErrorState error={error} onRetry={loadDocTypes} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }} className={className}>
      {/* Page Header */}
      <PageHeader />

      {/* Doc Type Manager */}
      <DocTypeManager
        docTypes={docTypes}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onRefresh={loadDocTypes}
      />

      {/* Help Text */}
      <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          About Policy Areas
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5, "& li": { mb: 0.5 } }}>
          <Typography component="li" variant="body2" color="text.secondary">
            Policy areas categorize the documents your organization evaluates.
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Each policy area can have multiple criteria sets for different evaluation scenarios.
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Deactivating a policy area hides it from users but preserves existing evaluations.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export default OrgEvalDocTypesPageV2;
