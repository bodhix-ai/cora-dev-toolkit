/**
 * OrgEvalCriteriaPage - Organization Criteria Management Page
 *
 * Org admin page for managing evaluation criteria:
 * - Create, edit, delete criteria sets
 * - Import criteria from spreadsheets
 * - Manage criteria items
 *
 * @example
 * // In Next.js app router: app/(admin)/admin/org/eval/criteria/page.tsx
 * import { OrgEvalCriteriaPage } from '@/modules/module-eval/frontend/pages';
 * export default function Page() {
 *   return <OrgEvalCriteriaPage orgId={orgId} />;
 * }
 */

"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Skeleton,
  Button,
  Paper,
  Alert,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import {
  useEvalCriteriaSets,
  useEvalDocTypes,
  useEvalCriteriaItems,
} from "../hooks";
import {
  CriteriaSetManager,
  CriteriaImportDialog,
  CriteriaItemEditor,
} from "../components";
import type { EvalCriteriaSet, ImportCriteriaSetInput } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface OrgEvalCriteriaPageProps {
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
        <IconButton onClick={onBack} sx={{ color: "text.secondary" }} aria-label="Back to criteria sets">
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
      <Typography variant="h5" gutterBottom>
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

export function OrgEvalCriteriaPage({
  orgId,
  className = "",
  loadingComponent,
  selectedDocTypeId,
}: OrgEvalCriteriaPageProps) {
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

  // State
  const [filterDocTypeId, setFilterDocTypeId] = useState<string | undefined>(selectedDocTypeId);
  const [selectedSet, setSelectedSet] = useState<EvalCriteriaSet | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Hooks
  const { docTypes } = useEvalDocTypes(token, orgId);

  const {
    criteriaSets,
    isLoading: criteriaSetsLoading,
    error,
    create: createCriteriaSet,
    update: updateCriteriaSet,
    remove: deleteCriteriaSet,
    importFromFile: importCriteriaSet,
    refresh,
  } = useEvalCriteriaSets(token, orgId, { docTypeId: filterDocTypeId });

  // Combined loading state
  const isLoading = criteriaSetsLoading || !token;

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
    async (data: { name: string; docTypeId: string; description?: string }) => {
      if (!token || !orgId) return;
      await createCriteriaSet(data);
    },
    [token, orgId, createCriteriaSet]
  );

  const handleUpdateSet = useCallback(
    async (id: string, data: { name?: string; description?: string; isActive?: boolean }) => {
      if (!token || !orgId) return;
      await updateCriteriaSet(id, data);
    },
    [token, orgId, updateCriteriaSet]
  );

  const handleDeleteSet = useCallback(
    async (id: string) => {
      if (!token || !orgId) return;
      await deleteCriteriaSet(id);
      if (selectedSet?.id === id) {
        setSelectedSet(null);
      }
    },
    [token, orgId, deleteCriteriaSet, selectedSet]
  );

  const handleOpenImport = useCallback(() => {
    setIsImportDialogOpen(true);
  }, []);

  const handleCloseImport = useCallback(() => {
    setIsImportDialogOpen(false);
  }, []);

  const handleImport = useCallback(
    async (data: ImportCriteriaSetInput) => {
      if (!token || !orgId) throw new Error('No auth token or org ID');
      const result = await importCriteriaSet(data);
      setIsImportDialogOpen(false);
      return result;
    },
    [token, orgId, importCriteriaSet]
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

  // Use criteria items hook when a set is selected
  const {
    items: criteriaItems,
    isLoading: itemsLoading,
    add: addItem,
    update: updateItem,
    remove: removeItem,
  } = useEvalCriteriaItems(
    selectedSet ? token : null,
    selectedSet ? orgId : null,
    selectedSet ? selectedSet.id : null
  );

  // Render criteria item editor when a set is selected
  if (selectedSet) {
    return (
      <Box sx={{ p: 3 }} className={className}>
        <PageHeader showBackButton onBack={handleBackToList} />
        <CriteriaItemEditor
          criteriaSet={selectedSet}
          items={criteriaItems}
          isLoading={itemsLoading}
          onAdd={addItem}
          onUpdate={updateItem}
          onDelete={removeItem}
          onBack={handleBackToList}
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
        criteriaSets={criteriaSets || []}
        docTypes={docTypes || []}
        onCreate={handleCreateSet}
        onUpdate={handleUpdateSet}
        onDelete={handleDeleteSet}
        onViewItems={handleSelectSet}
        onImport={handleOpenImport}
        selectedDocTypeId={filterDocTypeId}
        onFilterChange={handleDocTypeFilterChange}
      />

      {/* Import Dialog */}
      <CriteriaImportDialog
        isOpen={isImportDialogOpen}
        onClose={handleCloseImport}
        onImport={handleImport}
        docTypes={docTypes || []}
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

export default OrgEvalCriteriaPage;
