import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  getProjectsWithFavoritesEnhancement,
  ProjectsFilterOptions,
  EnhancedProjectsResponse,
  Project,
} from "../lib/api";
import { useOrganizationContext } from "module-access";

export interface FilterState {
  searchQuery: string;
  showFavoritesOnly: boolean;
  sortBy: "name" | "created_at" | "updated_at" | "favorites_first";
  groupByFavorites: boolean;
  ownerRoleOnly: boolean;
  dateFilter: {
    type: "all" | "before" | "after" | "between";
    startDate?: string;
    endDate?: string;
  };
  enabled?: boolean; // Optional: Skip fetching when false (useful for conditional loading like dialogs)
}

export interface FilteredProjectsData {
  projects: Project[];
  favorites: Project[];
  others: Project[];
  totalCount: number;
  favoriteCount: number;
}

export interface FilteredProjectsReturn {
  data: FilteredProjectsData | null;
  isLoading: boolean;
  error: string | null;
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  refetch: () => Promise<void>;
}

const DEFAULT_FILTERS: FilterState = {
  searchQuery: "",
  showFavoritesOnly: false,
  sortBy: "favorites_first",
  groupByFavorites: true,
  ownerRoleOnly: false,
  dateFilter: {
    type: "all",
  },
};

/**
 * Hook for managing filtered and sorted project data with favorites enhancement
 * Provides comprehensive project filtering, sorting, and grouping capabilities
 */
export function useFilteredProjects(
  initialFilters: Partial<FilterState> = {}
): FilteredProjectsReturn {
  const { getToken } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  // State management
  const [filters, setFiltersState] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [data, setData] = useState<FilteredProjectsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update filters function
  const setFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Convert internal filters to API options
  const apiOptions = useMemo(
    (): ProjectsFilterOptions => ({
      favoritesOnly: filters.showFavoritesOnly,
      favoritesFirst: filters.sortBy === "favorites_first",
      sortBy: filters.sortBy,
      groupByFavorites: filters.groupByFavorites,
    }),
    [filters]
  );

  // Client-side sorting function
  const applySorting = useCallback(
    (projects: Project[]): Project[] => {
      const sorted = [...projects];

      switch (filters.sortBy) {
        case "favorites_first":
          // Sort favorites first, then by name
          return sorted.sort((a, b) => {
            if (a.is_favorited && !b.is_favorited) return -1;
            if (!a.is_favorited && b.is_favorited) return 1;
            return a.name.localeCompare(b.name);
          });

        case "name":
          // Sort alphabetically by name
          return sorted.sort((a, b) => a.name.localeCompare(b.name));

        case "created_at":
          // Sort by creation date (newest first)
          return sorted.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );

        case "updated_at":
          // Sort by last updated (most recent first)
          return sorted.sort(
            (a, b) =>
              new Date(b.updated_at).getTime() -
              new Date(a.updated_at).getTime()
          );

        default:
          return sorted;
      }
    },
    [filters.sortBy]
  );

  // Client-side filtering function for advanced filters
  const applyClientSideFilters = useCallback(
    (projects: Project[]): Project[] => {
      let filteredProjects = [...projects];

      // Apply search filter first
      if (filters.searchQuery.trim()) {
        const searchLower = filters.searchQuery.toLowerCase().trim();
        filteredProjects = filteredProjects.filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            (p.description && p.description.toLowerCase().includes(searchLower))
        );
      }

      // Apply owner role filter
      if (filters.ownerRoleOnly) {
        filteredProjects = filteredProjects.filter(
          (p) => p.user_role === "owner"
        );
      }

      // Apply date filter
      if (filters.dateFilter.type !== "all") {
        const now = new Date();

        filteredProjects = filteredProjects.filter((p) => {
          const projectDate = new Date(p.created_at);

          switch (filters.dateFilter.type) {
            case "after":
              if (filters.dateFilter.startDate) {
                const startDate = new Date(filters.dateFilter.startDate);
                return projectDate >= startDate;
              }
              return true;

            case "before":
              if (filters.dateFilter.endDate) {
                const endDate = new Date(filters.dateFilter.endDate);
                return projectDate <= endDate;
              }
              return true;

            case "between":
              if (filters.dateFilter.startDate && filters.dateFilter.endDate) {
                const startDate = new Date(filters.dateFilter.startDate);
                const endDate = new Date(filters.dateFilter.endDate);
                return projectDate >= startDate && projectDate <= endDate;
              }
              return true;

            default:
              return true;
          }
        });
      }

      // Apply sorting after filtering
      return applySorting(filteredProjects);
    },
    [
      filters.searchQuery,
      filters.ownerRoleOnly,
      filters.dateFilter,
      applySorting,
    ]
  );

  // Fetch projects function
  const fetchProjects = useCallback(async () => {
    if (!currentOrganization) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken({ template: "policy-supabase" });
      if (!token) {
        throw new Error("Authentication token not available");
      }

      const result = await getProjectsWithFavoritesEnhancement(
        token,
        currentOrganization.orgId,
        apiOptions
      );

      // Process the result based on whether it's grouped or not
      if (
        filters.groupByFavorites &&
        typeof result === "object" &&
        "favorites" in result
      ) {
        // Result is EnhancedProjectsResponse
        const enhancedResult = result as EnhancedProjectsResponse;

        // Apply client-side filtering to all project arrays
        const allProjects = applyClientSideFilters(
          enhancedResult.projects || []
        );
        const favorites = applyClientSideFilters(
          enhancedResult.favorites || []
        );
        const others = applyClientSideFilters(enhancedResult.others || []);

        setData({
          projects: allProjects,
          favorites: favorites,
          others: others,
          totalCount: allProjects.length,
          favoriteCount: favorites.length,
        });
      } else {
        // Result is Project[] - handle both enhanced response fallback and simple array
        let projects: Project[] = [];

        if (Array.isArray(result)) {
          projects = result;
        } else if (
          result &&
          typeof result === "object" &&
          "projects" in result
        ) {
          projects = (result as any).projects || [];
        }

        // Apply client-side filtering
        const filteredProjects = applyClientSideFilters(projects);
        const favorites = filteredProjects.filter((p) => p.is_favorited);
        const others = filteredProjects.filter((p) => !p.is_favorited);

        setData({
          projects: filteredProjects,
          favorites,
          others,
          totalCount: filteredProjects.length,
          favoriteCount: favorites.length,
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch projects";
      setError(errorMessage);
      console.error("Error fetching filtered projects:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentOrganization,
    apiOptions,
    filters.groupByFavorites,
    getToken,
    applyClientSideFilters,
  ]);

  // Refetch function for external use
  const refetch = useCallback(async () => {
    await fetchProjects();
  }, [fetchProjects]);

  // Effect to fetch data when dependencies change
  // OPTIMIZATION: Only fetch if enabled is true (defaults to true for backward compatibility)
  useEffect(() => {
    // OLD CODE (always fetches):
    // fetchProjects();

    // NEW CODE (respects enabled flag):
    const shouldFetch = filters.enabled !== false; // Default to true if not specified
    if (shouldFetch) {
      fetchProjects();
    }
  }, [fetchProjects, filters.enabled]);

  return {
    data,
    isLoading,
    error,
    filters,
    setFilters,
    refetch,
  };
}

/**
 * Simplified hook for basic project filtering without grouping
 * Useful for components that need simple favorites filtering
 */
export function useSimpleProjectFilter(showFavoritesOnly: boolean = false) {
  const result = useFilteredProjects({
    showFavoritesOnly,
    groupByFavorites: false,
    sortBy: "favorites_first",
  });

  return {
    projects: result.data?.projects || [],
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
  };
}

/**
 * Hook specifically for favorites management in components
 * Returns only favorited projects with optimized loading
 */
export function useFavoriteProjects() {
  const result = useFilteredProjects({
    showFavoritesOnly: true,
    groupByFavorites: false,
    sortBy: "updated_at", // Sort favorites by most recent activity
  });

  return {
    favorites: result.data?.projects || [],
    favoriteCount: result.data?.favoriteCount || 0,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
  };
}
