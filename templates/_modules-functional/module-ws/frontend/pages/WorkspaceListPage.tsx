/**
 * WorkspaceListPage Component
 *
 * Main page for displaying and managing workspaces.
 * Shows workspace cards in grid/list view with filtering and search.
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import type { Workspace } from "../types";
import { DEFAULT_FILTERS } from "../types";
import { useWorkspaces } from "../hooks/useWorkspaces";
import { WorkspaceCard } from "../components/WorkspaceCard";
import { FilterBar, ViewMode } from "../components/FilterBar";
import { EmptyState } from "../components/EmptyState";
import { WorkspaceForm } from "../components/WorkspaceForm";

export interface WorkspaceListPageProps {
  /** Organization ID to filter workspaces */
  orgId: string;
  /** Current user ID */
  userId?: string;
  /** Callback when workspace is clicked */
  onWorkspaceClick?: (workspace: Workspace) => void;
  /** API client for workspace operations */
  apiClient?: any;
  /** Whether user can create workspaces */
  canCreate?: boolean;
}

export function WorkspaceListPage({
  orgId,
  userId,
  onWorkspaceClick,
  apiClient,
  canCreate = true,
}: WorkspaceListPageProps): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editWorkspace, setEditWorkspace] = useState<Workspace | null>(null);

  const {
    workspaces,
    loading,
    error,
    filters,
    setFilters,
    refetch,
  } = useWorkspaces({
    orgId,
    autoFetch: true,
  });

  // Extract unique tags from all workspaces for filter bar
  const availableTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    workspaces.forEach((ws) => {
      ws.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [workspaces]);

  const handleCreateClick = () => {
    setCreateDialogOpen(true);
  };

  const handleEditClick = (workspace: Workspace) => {
    setEditWorkspace(workspace);
  };

  const handleArchiveClick = async (workspace: Workspace) => {
    if (!apiClient) return;
    try {
      const newStatus = workspace.status === "active" ? "archived" : "active";
      await apiClient.updateWorkspace(workspace.id, { status: newStatus });
      refetch();
    } catch (err) {
      console.error("Failed to archive workspace:", err);
    }
  };

  const handleDeleteClick = async (workspace: Workspace) => {
    if (!apiClient) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`
    );
    if (confirmed) {
      try {
        await apiClient.deleteWorkspace(workspace.id);
        refetch();
      } catch (err) {
        console.error("Failed to delete workspace:", err);
      }
    }
  };

  const handleToggleFavorite = async (workspace: Workspace) => {
    if (!apiClient) return;
    try {
      await apiClient.toggleFavorite(workspace.id);
      refetch();
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    refetch();
  };

  const handleUpdateSuccess = () => {
    setEditWorkspace(null);
    refetch();
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const filteredWorkspaces = workspaces;
  const hasActiveFilters =
    filters.search ||
    filters.status !== "all" ||
    filters.favoritesOnly ||
    filters.tags.length > 0;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Workspaces
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and organize your workspaces
          </Typography>
        </Box>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateClick}
            size="large"
          >
            Create Workspace
          </Button>
        )}
      </Box>

      {/* Error alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        availableTags={availableTags}
        loading={loading}
        showViewToggle
      />

      {/* Loading state */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty state */}
      {!loading && filteredWorkspaces.length === 0 && (
        <EmptyState
          variant={hasActiveFilters ? "no-results" : filters.favoritesOnly ? "no-favorites" : "no-workspaces"}
          onAction={hasActiveFilters ? handleClearFilters : canCreate ? handleCreateClick : undefined}
          showAction={hasActiveFilters || canCreate}
        />
      )}

      {/* Grid view */}
      {!loading && filteredWorkspaces.length > 0 && viewMode === "grid" && (
        <Grid container spacing={3}>
          {filteredWorkspaces.map((workspace) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={workspace.id}>
              <WorkspaceCard
                workspace={workspace}
                onClick={onWorkspaceClick}
                onToggleFavorite={handleToggleFavorite}
                onEdit={handleEditClick}
                onArchive={handleArchiveClick}
                onDelete={handleDeleteClick}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* List view */}
      {!loading && filteredWorkspaces.length > 0 && viewMode === "list" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filteredWorkspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              onClick={onWorkspaceClick}
              onToggleFavorite={handleToggleFavorite}
              onEdit={handleEditClick}
              onArchive={handleArchiveClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </Box>
      )}

      {/* Create dialog */}
      <WorkspaceForm
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        orgId={orgId}
        onCreate={apiClient?.createWorkspace}
        onCreateSuccess={handleCreateSuccess}
      />

      {/* Edit dialog */}
      <WorkspaceForm
        open={Boolean(editWorkspace)}
        onClose={() => setEditWorkspace(null)}
        workspace={editWorkspace}
        onUpdate={apiClient?.updateWorkspace}
        onUpdateSuccess={handleUpdateSuccess}
      />
    </Container>
  );
}

export default WorkspaceListPage;
