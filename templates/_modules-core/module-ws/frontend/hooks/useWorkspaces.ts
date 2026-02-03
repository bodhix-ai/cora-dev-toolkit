/**
 * useWorkspaces Hook
 *
 * Fetches and manages the list of workspaces for the current user.
 * Supports filtering, sorting, and pagination.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import { createWorkspaceApiClient } from "../lib/api";
import type {
  Workspace,
  WorkspaceQueryParams,
  WorkspaceFilters,
  WorkspaceSortOptions,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
} from "../types";

export interface UseWorkspacesOptions {
  /** Organization ID to filter by */
  orgId?: string;
  /** Initial filters */
  initialFilters?: WorkspaceFilters;
  /** Initial sort options */
  initialSort?: WorkspaceSortOptions;
  /** Page size for pagination */
  pageSize?: number;
  /** Whether to include deleted workspaces */
  includeDeleted?: boolean;
  /** Whether to auto-fetch on mount */
  autoFetch?: boolean;
}

export interface UseWorkspacesReturn {
  /** List of workspaces */
  workspaces: Workspace[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Total count of workspaces (for pagination) */
  total: number;
  /** Current page (0-indexed) */
  page: number;
  /** Current filters */
  filters: WorkspaceFilters;
  /** Current sort options */
  sort: WorkspaceSortOptions;
  /** Refetch workspaces */
  refetch: () => Promise<void>;
  /** Update filters */
  setFilters: (filters: Partial<WorkspaceFilters>) => void;
  /** Update sort options */
  setSort: (sort: WorkspaceSortOptions) => void;
  /** Go to specific page */
  setPage: (page: number) => void;
  /** Check if there are more pages */
  hasMore: boolean;
}

const DEFAULT_PAGE_SIZE = 50;

export function useWorkspaces(options: UseWorkspacesOptions = {}): UseWorkspacesReturn {
  const {
    orgId: providedOrgId,
    initialFilters = {
      search: "",
      status: "all",
      favoritesOnly: false,
      tags: [],
    },
    initialSort = {
      field: "updatedAt",
      direction: "desc",
    },
    pageSize = DEFAULT_PAGE_SIZE,
    includeDeleted = false,
    autoFetch = true,
  } = options;

  const { data: session } = useSession();
  const { currentOrganization } = useOrganizationContext();
  
  // Use provided orgId or fall back to context orgId
  const orgId = providedOrgId || currentOrganization?.orgId;
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFiltersState] = useState<WorkspaceFilters>(initialFilters);
  const [sort, setSort] = useState<WorkspaceSortOptions>(initialSort);

  const fetchWorkspaces = useCallback(async () => {
    if (!session?.accessToken) {
      setLoading(false);
      return;
    }

    // Don't fetch until org context is available - prevents 400 errors
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = createWorkspaceApiClient(session.accessToken as string);

      const params: WorkspaceQueryParams = {
        orgId: orgId,
        limit: pageSize,
        offset: page * pageSize,
        includeDeleted: includeDeleted,
      };

      // Apply filters (only set status if not 'all')
      if (filters.status !== 'all') {
        params.status = filters.status;
      }
      if (filters.favoritesOnly) {
        params.favoritesOnly = true;
      }
      if (filters.search) {
        params.search = filters.search;
      }
      if (filters.tags.length > 0) {
        params.tags = filters.tags;
      }

      const response = await client.listWorkspaces(params);

      // Sort client-side (API may not support all sort options)
      let sorted = [...response.workspaces];

      // Sort favorites first if enabled
      if (filters.favoritesOnly) {
        sorted = sorted.sort((a, b) => {
          if (a.isFavorited && !b.isFavorited) return -1;
          if (!a.isFavorited && b.isFavorited) return 1;
          return 0;
        });
      }

      // Apply sort
      sorted = sorted.sort((a, b) => {
        const aVal = a[sort.field as keyof Workspace];
        const bVal = b[sort.field as keyof Workspace];

        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        let comparison = 0;
        if (typeof aVal === "string" && typeof bVal === "string") {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === "number" && typeof bVal === "number") {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sort.direction === "desc" ? -comparison : comparison;
      });

      setWorkspaces(sorted);
      setTotal(response.total);
    } catch (err) {
      console.error("Failed to fetch workspaces:", err);
      setError(err instanceof Error ? err.message : "Failed to load workspaces");
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, [
    session?.accessToken,
    orgId,
    page,
    pageSize,
    filters,
    sort,
    includeDeleted,
  ]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchWorkspaces();
    }
  }, [fetchWorkspaces, autoFetch]);

  // Update filters and reset page
  const setFilters = useCallback((newFilters: Partial<WorkspaceFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setPage(0); // Reset to first page when filters change
  }, []);

  // Calculate if there are more pages
  const hasMore = useMemo(() => {
    return (page + 1) * pageSize < total;
  }, [page, pageSize, total]);

  return {
    workspaces,
    loading,
    error,
    total,
    page,
    filters,
    sort,
    refetch: fetchWorkspaces,
    setFilters,
    setSort,
    setPage,
    hasMore,
  };
}

export default useWorkspaces;
