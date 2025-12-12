import { useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { toggleProjectFavorite } from "../lib/api";

export interface FavoritesState {
  [projectId: string]: {
    isFavorited: boolean;
    isToggling: boolean;
    favoritedAt?: string;
  };
}

export interface FavoritesManager {
  favoritesState: FavoritesState;
  toggleFavorite: (projectId: string) => Promise<void>;
  setFavoriteState: (
    projectId: string,
    isFavorited: boolean,
    favoritedAt?: string
  ) => void;
  initializeFavorites: (
    projects: Array<{
      id: string;
      is_favorited?: boolean;
      favorited_at?: string;
    }>
  ) => void;
  isToggling: (projectId: string) => boolean;
  isFavorited: (projectId: string) => boolean;
}

/**
 * Hook for managing project favorites state with optimistic updates
 * Provides centralized favorites management for the application
 */
export function useFavoritesManager(): FavoritesManager {
  const { getToken } = useAuth();
  const [favoritesState, setFavoritesState] = useState<FavoritesState>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize favorites state from projects data
  const initializeFavorites = useCallback(
    (
      projects: Array<{
        id: string;
        is_favorited?: boolean;
        favorited_at?: string;
      }>
    ) => {
      const newState: FavoritesState = {};
      projects.forEach((project) => {
        newState[project.id] = {
          isFavorited: project.is_favorited || false,
          isToggling: false,
          favoritedAt: project.favorited_at,
        };
      });
      setFavoritesState(newState);
    },
    []
  );

  // Set individual favorite state (useful for external updates)
  const setFavoriteState = useCallback(
    (projectId: string, isFavorited: boolean, favoritedAt?: string) => {
      setFavoritesState((prev) => ({
        ...prev,
        [projectId]: {
          isFavorited,
          isToggling: false,
          favoritedAt,
        },
      }));
    },
    []
  );

  // Toggle favorite with optimistic updates and error handling
  const toggleFavorite = useCallback(
    async (projectId: string) => {
      try {
        // Prevent multiple simultaneous requests for the same project
        if (favoritesState[projectId]?.isToggling) {
          return;
        }

        // Cancel any previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();

        const currentState = favoritesState[projectId];
        const newFavoriteState = !currentState?.isFavorited;

        // Optimistic update - immediately update UI
        setFavoritesState((prev) => ({
          ...prev,
          [projectId]: {
            isFavorited: newFavoriteState,
            isToggling: true,
            favoritedAt: newFavoriteState
              ? new Date().toISOString()
              : undefined,
          },
        }));

        // Make API call
        const token = await getToken({ template: "policy-supabase" });
        if (!token) {
          throw new Error("Authentication token not available");
        }

        const result = await toggleProjectFavorite(projectId, token);

        // Update with server response
        setFavoritesState((prev) => ({
          ...prev,
          [projectId]: {
            isFavorited: result.is_favorited,
            isToggling: false,
            favoritedAt: result.is_favorited
              ? new Date().toISOString()
              : undefined,
          },
        }));
      } catch (error) {
        // Revert optimistic update on error
        setFavoritesState((prev) => ({
          ...prev,
          [projectId]: {
            isFavorited: prev[projectId]?.isFavorited || false,
            isToggling: false,
            favoritedAt: prev[projectId]?.favoritedAt,
          },
        }));

        // Re-throw error for component handling
        throw error;
      }
    },
    [favoritesState, getToken]
  );

  // Helper functions
  const isToggling = useCallback(
    (projectId: string) => {
      return favoritesState[projectId]?.isToggling || false;
    },
    [favoritesState]
  );

  const isFavorited = useCallback(
    (projectId: string) => {
      return favoritesState[projectId]?.isFavorited || false;
    },
    [favoritesState]
  );

  return {
    favoritesState,
    toggleFavorite,
    setFavoriteState,
    initializeFavorites,
    isToggling,
    isFavorited,
  };
}
