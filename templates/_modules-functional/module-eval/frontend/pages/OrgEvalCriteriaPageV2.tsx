/**
 * OrgEvalCriteriaPageV2 - Organization Criteria Management Page (Simplified)
 *
 * Simplified version that avoids infinite loops by:
 * - Using direct API calls (no Zustand store)
 * - Simple useState for local state management
 * - Controlled useEffect with stable dependencies
 * - Reusing the working CriteriaSetManager component
 *
 * @example
 * // In Next.js app router: app/(admin)/admin/org/eval/criteria/page.tsx
 * import { OrgEvalCriteriaPageV2 } from '@/modules/module-eval/frontend/pages';
 * export default function Page() {
 *   return <OrgEvalCriteriaPageV2 orgId={orgId} />;
 * }
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Skeleton,
  Button,
  Paper,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import {
  CriteriaSetManager,
  CriteriaImportDialog,
  CriteriaItemEditor,
} from "../components";
import {
  listCriteriaSets,
  createCriteriaSet,
  updateCriteriaSet,
  deleteCriteriaSet,
  importCriteriaSet,
  listDocTypes,
} from "../lib/api";
import type {
  EvalCriteriaSet,
  EvalDocType,
  CreateCriteriaSetInput,
  UpdateCriteriaSetInput,
  ImportCriteriaSetInput,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface OrgEvalCriteriaPageV2Props {
  /** Organization ID */
  orgId: string;
  /** Optional CSS class */
  className?: string;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Pre-selected doc type ID (from navigation) */
  selectedDocTypeId?: string;
}

// =============================================================================
// PAGE HEADER COMPONENT
// =============================================================================

interface PageHeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

function PageHeader({ showBackButton, onBack }: PageHeaderProps) {
  return (
    <Box sx={{ mb: 4, display: "flex", alignItems: "center", gap: 2 }}>
      {showBackButton && onBack && (
        <IconButton onClick={onBack} sx={{ color: "text.secondary" }}>
          <ArrowBackIcon />
        </IconButton>
      )}
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Evaluation Criteria
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage criteria sets and items for document evaluations.
        </Typography>
      </Box>
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
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={96} sx={{ borderRadius: 1 }} />
        ))}
      </Box>
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
        Failed to load criteria
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

export function OrgEvalCriteriaPageV2({
  orgId,
  className = "",
  loadingComponent,
  selectedDocTypeId,
}: OrgEvalCriteriaPageV2Props) {
  // Local state (no store)
  const [criteriaSets, setCriteriaSets] = useState<EvalCriteriaSet[]>([]);
  const [docTypes, setDocTypes] = useState<EvalDocType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [filterDocTypeId, setFilterDocTypeId] = useState<string | undefined>(selectedDocTypeId);
  const [selectedSet, setSelectedSet] = useState<EvalCriteriaSet | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

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

  // Load data when token is available
  const loadData = useCallback(async () => {
    if (!token || !orgId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load both criteria sets and doc types in parallel
      const [criteriaData, docTypesData] = await Promise.all([
        listCriteriaSets(token, orgId, { 
          docTypeId: filterDocTypeId,
          includeInactive: false 
        }),
        listDocTypes(token, orgId, { includeInactive: false }),
      ]);
      
      setCriteriaSets(criteriaData);
      setDocTypes(docTypesData);
    } catch (err) {
      console.error("Failed to load criteria data:", err);
      setError(err instanceof Error ? err : new Error("Failed to load criteria data"));
    } finally {
      setIsLoading(false);
    }
  }, [token, orgId, filterDocTypeId]);

  // Load data when token or filter changes
  useEffect(() => {
    if (token && orgId) {
      loadData();
    }
  }, [token, orgId, loadData]);

  // Handlers
  const handleDocTypeFilterChange = useCallback((docTypeId: string | undefined) => {
    setFilterDocTypeId(docTypeId);
  }, []);

  const handleSelectSet = useCallback((set: EvalCriteriaSet) => {
    setSelectedSet(set);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedSet(null);
  }, []);

  const handleCreateSet = useCallback(
    async (data: CreateCriteriaSetInput) => {
      if (!token || !orgId) {
        throw new Error("No auth token or org ID");
      }

      const newSet = await createCriteriaSet(token, orgId, data);
      setCriteriaSets((prev) => [...prev, newSet]);
    },
    [token, orgId]
  );

  const handleUpdateSet = useCallback(
    async (id: string, data: UpdateCriteriaSetInput) => {
      if (!token || !orgId) {
        throw new Error("No auth token or org ID");
      }

      const updatedSet = await updateCriteriaSet(token, orgId, id, data);
      setCriteriaSets((prev) =>
        prev.map((set) => (set.id === id ? updatedSet : set))
      );
    },
    [token, orgId]
  );

  const handleDeleteSet = useCallback(
    async (id: string) => {
      if (!token || !orgId) {
        throw new Error("No auth token or org ID");
      }

      await deleteCriteriaSet(token, orgId, id);
      setCriteriaSets((prev) => prev.filter((set) => set.id !== id));
      
      if (selectedSet?.id === id) {
        setSelectedSet(null);
      }
    },
    [token, orgId, selectedSet]
  );

  const handleOpenImport = useCallback(() => {
    setIsImportDialogOpen(true);
  }, []);

  const handleCloseImport = useCallback(() => {
    setIsImportDialogOpen(false);
  }, []);

  const handleImport = useCallback(
    async (input: ImportCriteriaSetInput) => {
      if (!token || !orgId) {
        throw new Error("No auth token or org ID");
      }

      await importCriteriaSet(token, orgId, input);
      setIsImportDialogOpen(false);
      await loadData(); // Reload to show imported set
    },
    [token, orgId, loadData]
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
        <ErrorState error={error} onRetry={loadData} />
      </Box>
    );
  }

  // Render criteria item editor when a set is selected
  if (selectedSet) {
    return (
      <Box sx={{ p: 3 }} className={className}>
        <PageHeader showBackButton onBack={handleBackToList} />
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">
            {selectedSet.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedSet.description || "No description"}
          </Typography>
        </Box>
        <CriteriaItemEditor
          criteriaSetId={selectedSet.id}
          orgId={orgId}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }} className={className}>
      {/* Page Header */}
      <PageHeader />

      {/* Criteria Set Manager */}
      <CriteriaSetManager
        criteriaSets={criteriaSets}
        docTypes={docTypes}
        onCreate={handleCreateSet}
        onUpdate={handleUpdateSet}
        onDelete={handleDeleteSet}
        onViewItems={handleSelectSet}
        onImport={handleOpenImport}
        onFilterChange={handleDocTypeFilterChange}
        selectedDocTypeId={filterDocTypeId}
      />

      {/* Import Dialog */}
      <CriteriaImportDialog
        isOpen={isImportDialogOpen}
        onClose={handleCloseImport}
        onImport={handleImport}
        docTypes={docTypes}
      />

      {/* Help Text */}
      <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          About Criteria Sets
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5, "& li": { mb: 0.5 } }}>
          <Typography component="li" variant="body2" color="text.secondary">
            Criteria sets define the evaluation criteria for a document type.
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Import criteria from CSV or XLSX files for bulk creation.
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Each criteria item includes a requirement, optional description, and category.
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            You can have multiple criteria sets per document type for different use cases.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export default OrgEvalCriteriaPageV2;
