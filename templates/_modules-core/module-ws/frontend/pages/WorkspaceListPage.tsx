/**
 * WorkspaceListPage Component
 *
 * Main page for displaying and managing workspaces.
 * Shows workspace cards in grid/list view with filtering and search.
 */

import React, { useState, useEffect, useMemo } from "react";
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
import { useSession } from "next-auth/react";
import { useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import type { Workspace, WorkspaceFormValues, WorkspaceCreateRequest } from "../types";
import { DEFAULT_FILTERS } from "../types";
import { useWorkspaces } from "../hooks/useWorkspaces";
import { useWorkspaceConfig } from "../hooks/useWorkspaceConfig";
import { WorkspaceCard } from "../components/WorkspaceCard";
import { FilterBar, ViewMode } from "../components/FilterBar";
import { EmptyState } from "../components/EmptyState";
import { WorkspaceForm } from "../components/WorkspaceForm";
import { createWorkspaceApiClient } from "../lib/api";
import type { WorkspaceApiClient } from "../lib/api";

export interface WorkspaceListPageProps {
  /** Organization ID to filter workspaces (optional - falls back to context) */
  orgId?: string;
  /** Current user ID */
  userId?: string;
  /** Callback when workspace is clicked */
  onWorkspaceClick?: (workspace: Workspace) => void;
  /** API client for workspace operations */
  apiClient?: WorkspaceApiClient;
  /** Whether user can create workspaces */
  canCreate?: boolean;
}

export function WorkspaceListPage({
  orgId: providedOrgId,
  userId,
  onWorkspaceClick,
  apiClient: providedApiClient,
  canCreate = true,
}: WorkspaceListPageProps): React.ReactElement {
  // Get orgId from context if not provided as prop
  const { currentOrganization } = useOrganizationContext();
  const orgId = providedOrgId || currentOrganization?.orgId || "";
  
  // Get session for API client creation
  const { data: session } = useSession();
  
  // Create API client if not provided
  const apiClient = useMemo(() => {
    if (providedApiClient) return providedApiClient;
    if (session?.accessToken) {
      return createWorkspaceApiClient(session.accessToken as string);
    }
    return null;
  }, [providedApiClient, session?.accessToken]);
  
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editWorkspace, setEditWorkspace] = useState<Workspace | null>(null);

  // Get workspace module config for dynamic labels and defaults
  const { config: wsConfig } = useWorkspaceConfig();

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
    if (!apiClient || !orgId) return;
    try {
      const newStatus = workspace.status === "active" ? "archived" : "active";
      await apiClient.updateWorkspace(workspace.id, { status: newStatus }, orgId);
      refetch();
    } catch (err) {
      console.error("Failed to archive workspace:", err);
    }
  };

  const handleDeleteClick = async (workspace: Workspace) => {
    if (!apiClient || !orgId) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`
    );
    if (confirmed) {
      try {
        await apiClient.deleteWorkspace(workspace.id, orgId);
        refetch();
      } catch (err) {
        console.error("Failed to delete workspace:", err);
      }
    }
  };

  const handleToggleFavorite = async (workspace: Workspace) => {
    if (!apiClient || !orgId) return;
    try {
      const result = await apiClient.toggleFavorite(workspace.id, orgId);
      // Optimistic UI update: Update local workspace state immediately
      // The hook's setWorkspaces should handle this, but we also refetch to ensure consistency
      refetch();
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
      // Revert on error by refetching
      refetch();
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

  // Wrapper function to adapt apiClient.createWorkspace signature to WorkspaceForm's onCreate prop
  const handleCreateWorkspace = async (orgId: string, values: WorkspaceFormValues): Promise<Workspace> => {
    if (!apiClient?.createWorkspace) {
      throw new Error("API client not available");
    }
    
    // Convert WorkspaceFormValues to WorkspaceCreateRequest
    const request: WorkspaceCreateRequest = {
      name: values.name,
      description: values.description,
      orgId: orgId,
      color: values.color,
      icon: values.icon,
      tags: values.tags,
    };
    
    return await apiClient.createWorkspace(request);
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const filteredWorkspaces = workspaces;
  const hasActiveFilters =
    !!filters.search ||
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
            {wsConfig?.navLabelPlural || "Workspaces"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and organize your {(wsConfig?.navLabelPlural || "workspaces").toLowerCase()}
          </Typography>
        </Box>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateClick}
            size="large"
          >
            Create {wsConfig?.navLabelSingular || "Workspace"}
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
        onCreate={handleCreateWorkspace}
        onCreateSuccess={handleCreateSuccess}
        defaultColor={wsConfig?.defaultColor}
        labelSingular={wsConfig?.navLabelSingular || "Workspace"}
      />

      {/* Edit dialog */}
      <WorkspaceForm
        open={Boolean(editWorkspace)}
        onClose={() => setEditWorkspace(null)}
        workspace={editWorkspace}
        onUpdate={apiClient ? async (wsId, values) => apiClient.updateWorkspace(wsId, values, orgId) : undefined}
        onUpdateSuccess={handleUpdateSuccess}
        labelSingular={wsConfig?.navLabelSingular || "Workspace"}
      />
    </Container>
  );
}

export default WorkspaceListPage;
