import { useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useChatStore } from "@/store/chatStore";

export interface ChatFavoritesState {
  [chatId: string]: {
    isFavorited: boolean;
    isToggling: boolean;
    favoritedAt?: string;
  };
}

export interface ChatFavoritesManager {
  favoritesState: ChatFavoritesState;
  toggleFavorite: (chatId: string) => Promise<void>;
  setFavoriteState: (
    chatId: string,
    isFavorited: boolean,
    favoritedAt?: string
  ) => void;
  initializeFavorites: (
    chats: Array<{
      id: string;
      is_favorited?: boolean;
      favorited_at?: string;
    }>
  ) => void;
  isToggling: (chatId: string) => boolean;
  isFavorited: (chatId: string) => boolean;
}

/**
 * Hook for managing chat favorites state with optimistic updates
 * Provides centralized favorites management for chat sessions
 * Follows the same patterns as useFavoritesManager but for chats
 */
export function useChatFavorites(): ChatFavoritesManager {
  const { getToken } = useAuth();
  const [favoritesState, setFavoritesState] = useState<ChatFavoritesState>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize favorites state from chats data
  const initializeFavorites = useCallback(
    (
      chats: Array<{
        id: string;
        is_favorited?: boolean;
        favorited_at?: string;
      }>
    ) => {
      const newState: ChatFavoritesState = {};
      chats.forEach((chat) => {
        newState[chat.id] = {
          isFavorited: chat.is_favorited || false,
          isToggling: false,
          favoritedAt: chat.favorited_at,
        };
      });
      setFavoritesState(newState);
    },
    []
  );

  // Set individual favorite state (useful for external updates)
  const setFavoriteState = useCallback(
    (chatId: string, isFavorited: boolean, favoritedAt?: string) => {
      setFavoritesState((prev) => ({
        ...prev,
        [chatId]: {
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
    async (chatId: string) => {
      try {
        // Prevent multiple simultaneous requests for the same chat
        if (favoritesState[chatId]?.isToggling) {
          return;
        }

        // Cancel any previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();

        // CRITICAL FIX: Check Zustand store first to get the true current state
        // This handles cases where the hook's local state hasn't been initialized
        // but the session data from backend has is_favorited = true
        const session = useChatStore
          .getState()
          .sessions.find((s) => s.id === chatId);
        const currentIsFavorited =
          session?.is_favorited ?? favoritesState[chatId]?.isFavorited ?? false;

        const currentState = favoritesState[chatId];
        const newFavoriteState = !currentIsFavorited;

        // Optimistic update - immediately update UI
        setFavoritesState((prev) => ({
          ...prev,
          [chatId]: {
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

        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        const endpoint = newFavoriteState
          ? `${baseUrl}/chat/sessions/${chatId}/favorite`
          : `${baseUrl}/chat/sessions/${chatId}/favorite`;

        const response = await fetch(endpoint, {
          method: newFavoriteState ? "POST" : "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();

        // Update local state (backend returns complete session data)
        setFavoritesState((prev) => ({
          ...prev,
          [chatId]: {
            isFavorited: newFavoriteState,
            isToggling: false,
            favoritedAt: newFavoriteState
              ? new Date().toISOString()
              : undefined,
          },
        }));
      } catch (error) {
        // Revert optimistic update on error
        setFavoritesState((prev) => ({
          ...prev,
          [chatId]: {
            isFavorited: prev[chatId]?.isFavorited || false,
            isToggling: false,
            favoritedAt: prev[chatId]?.favoritedAt,
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
    (chatId: string) => {
      return favoritesState[chatId]?.isToggling || false;
    },
    [favoritesState]
  );

  const isFavorited = useCallback(
    (chatId: string) => {
      return favoritesState[chatId]?.isFavorited || false;
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
