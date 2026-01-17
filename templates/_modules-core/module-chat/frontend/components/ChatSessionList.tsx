/**
 * Module Chat - Chat Session List Component
 *
 * Displays a list of chat sessions with search, filters, and infinite scroll.
 */

"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  Search,
  Star,
  MessageSquare,
  Users,
  Filter,
  SortAsc,
  SortDesc,
  Plus,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useChat } from "../hooks/useChat";
import { ChatOptionsMenu } from "./ChatOptionsMenu";
import type { ChatSession, ListSessionsOptions } from "../types";

// =============================================================================
// PROPS TYPES
// =============================================================================

export interface ChatSessionListProps {
  /** Workspace ID to filter by (optional) */
  workspaceId?: string;
  /** Currently selected session ID */
  selectedSessionId?: string;
  /** Callback when a session is selected */
  onSelectSession?: (session: ChatSession) => void;
  /** Callback when creating a new chat */
  onNewChat?: () => void;
  /** Callback to open share dialog */
  onShareClick?: (chatId: string) => void;
  /** Callback to open KB grounding dialog */
  onKBGroundingClick?: (chatId: string) => void;
  /** Callback when error occurs */
  onError?: (message: string) => void;
  /** Callback when action succeeds */
  onSuccess?: (action: string, chatId: string) => void;
  /** Whether to show the new chat button */
  showNewChatButton?: boolean;
  /** Whether to show filters */
  showFilters?: boolean;
  /** Optional class name */
  className?: string;
  /** Height of the list (default: full height) */
  height?: string | number;
}

// =============================================================================
// SESSION ITEM COMPONENT
// =============================================================================

interface ChatSessionItemProps {
  session: ChatSession;
  isSelected: boolean;
  onClick: () => void;
  onShareClick?: (chatId: string) => void;
  onKBGroundingClick?: (chatId: string) => void;
  onError?: (message: string) => void;
  onSuccess?: (action: string, chatId: string) => void;
}

function ChatSessionItem({
  session,
  isSelected,
  onClick,
  onShareClick,
  onKBGroundingClick,
  onError,
  onSuccess,
}: ChatSessionItemProps) {
  const lastMessageAt = session.metadata.lastMessageAt
    ? new Date(session.metadata.lastMessageAt)
    : new Date(session.updatedAt);

  const formattedDate = useMemo(() => {
    const now = new Date();
    const diffMs = now.getTime() - lastMessageAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return lastMessageAt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return lastMessageAt.toLocaleDateString([], { weekday: "short" });
    } else {
      return lastMessageAt.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    }
  }, [lastMessageAt]);

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-lg p-3 cursor-pointer transition-colors",
        "hover:bg-muted/50",
        isSelected && "bg-muted"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick();
        }
      }}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {session.isFavorited ? (
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        ) : session.isSharedWithWorkspace ? (
          <Users className="h-4 w-4 text-muted-foreground" />
        ) : (
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium truncate text-sm">{session.title}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formattedDate}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {session.metadata.messageCount !== undefined && (
            <span>{session.metadata.messageCount} messages</span>
          )}
          {session.accessType === "shared" && (
            <span className="text-blue-500">Shared with you</span>
          )}
          {session.accessType === "workspace" && (
            <span className="text-green-500">Workspace</span>
          )}
        </div>
      </div>

      {/* Options Menu */}
      <div
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <ChatOptionsMenu
          chat={session}
          onShareClick={onShareClick}
          onKBGroundingClick={onKBGroundingClick}
          onError={onError}
          onSuccess={onSuccess}
          size="sm"
        />
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Chat session list with search, filters, and infinite scroll
 *
 * Features:
 * - Search by title
 * - Filter by favorites only
 * - Sort by date or title
 * - Infinite scroll pagination
 * - New chat button
 * - Per-session options menu
 *
 * @example
 * ```tsx
 * <ChatSessionList
 *   workspaceId={currentWorkspace.id}
 *   selectedSessionId={currentSessionId}
 *   onSelectSession={(session) => setCurrentSession(session)}
 *   onNewChat={() => createNewChat()}
 *   onError={(msg) => toast.error(msg)}
 * />
 * ```
 */
export function ChatSessionList({
  workspaceId,
  selectedSessionId,
  onSelectSession,
  onNewChat,
  onShareClick,
  onKBGroundingClick,
  onError,
  onSuccess,
  showNewChatButton = true,
  showFilters = true,
  className,
  height = "100%",
}: ChatSessionListProps) {
  // === State ===
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // === Hook ===
  const {
    sessions,
    isLoading,
    hasMoreSessions,
    filters,
    setSearch,
    setFavoritesOnly,
    setSort,
    loadSessions,
    loadMoreSessions,
  } = useChat({
    workspaceId,
    autoLoad: true,
  });

  // Report errors via callback
  useEffect(() => {
    // Error handling is done at the component level if needed
  }, [onError]);

  // Update search filter when debounced search changes
  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);

  // === Handlers ===
  const handleToggleFavoritesOnly = useCallback(() => {
    setFavoritesOnly(!filters.favoritesOnly);
  }, [setFavoritesOnly, filters.favoritesOnly]);

  const handleSortChange = useCallback(
    (sortBy: "createdAt" | "updatedAt" | "title", sortOrder: "asc" | "desc") => {
      setSort(sortBy, sortOrder);
    },
    [setSort]
  );

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMoreSessions) {
      loadMoreSessions();
    }
  }, [isLoading, hasMoreSessions, loadMoreSessions]);

  // Handle scroll to load more
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const scrollBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight;
      if (scrollBottom < 100) {
        handleLoadMore();
      }
    },
    [handleLoadMore]
  );

  // === Render ===
  return (
    <div className={cn("flex flex-col", className)} style={{ height }}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b">
        {showNewChatButton && (
          <Button onClick={onNewChat} size="sm" className="flex-shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            New Chat
          </Button>
        )}

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filters</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={filters.favoritesOnly}
                onCheckedChange={handleToggleFavoritesOnly}
              >
                <Star className="mr-2 h-4 w-4" />
                Favorites Only
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Sort By</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => handleSortChange("updatedAt", "desc")}
              >
                <SortDesc className="mr-2 h-4 w-4" />
                Latest Activity
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange("createdAt", "desc")}
              >
                <SortDesc className="mr-2 h-4 w-4" />
                Newest First
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange("createdAt", "asc")}
              >
                <SortAsc className="mr-2 h-4 w-4" />
                Oldest First
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange("title", "asc")}
              >
                <SortAsc className="mr-2 h-4 w-4" />
                Title (A-Z)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Session List */}
      <ScrollArea className="flex-1" onScrollCapture={handleScroll}>
        <div className="p-2 space-y-1">
          {sessions.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">
                {debouncedSearch
                  ? "No chats match your search"
                  : "No chat sessions yet"}
              </p>
              {!debouncedSearch && showNewChatButton && (
                <Button
                  variant="link"
                  onClick={onNewChat}
                  className="mt-2"
                >
                  Start a new chat
                </Button>
              )}
            </div>
          ) : (
            <>
              {sessions.map((session) => (
                <ChatSessionItem
                  key={session.id}
                  session={session}
                  isSelected={session.id === selectedSessionId}
                  onClick={() => onSelectSession?.(session)}
                  onShareClick={onShareClick}
                  onKBGroundingClick={onKBGroundingClick}
                  onError={onError}
                  onSuccess={onSuccess}
                />
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Load More Button (fallback) */}
              {!isLoading && hasMoreSessions && (
                <Button
                  variant="ghost"
                  onClick={handleLoadMore}
                  className="w-full mt-2"
                >
                  Load More
                </Button>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default ChatSessionList;
