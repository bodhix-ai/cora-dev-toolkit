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
import {
  TextField,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Divider,
  InputAdornment,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
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
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1.5,
        borderRadius: 1,
        cursor: 'pointer',
        bgcolor: isSelected ? 'action.selected' : 'transparent',
        '&:hover': {
          bgcolor: isSelected ? 'action.selected' : 'action.hover',
          '& .options-menu': {
            opacity: 1,
          },
        },
        transition: 'background-color 0.2s',
      }}
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
      <Box sx={{ flexShrink: 0 }}>
        {session.isFavorited ? (
          <Star size={16} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
        ) : session.isSharedWithWorkspace ? (
          <Users size={16} color="text.secondary" />
        ) : (
          <MessageSquare size={16} color="text.secondary" />
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {session.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
            {formattedDate}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {session.metadata.messageCount !== undefined && (
            <Typography variant="caption" color="text.secondary">
              {session.metadata.messageCount} messages
            </Typography>
          )}
          {session.accessType === "shared" && (
            <Typography variant="caption" sx={{ color: 'info.main' }}>
              Shared with you
            </Typography>
          )}
          {session.accessType === "workspace" && (
            <Typography variant="caption" sx={{ color: 'success.main' }}>
              Workspace
            </Typography>
          )}
        </Box>
      </Box>

      {/* Options Menu */}
      <Box
        className="options-menu"
        sx={{
          flexShrink: 0,
          opacity: 0,
          transition: 'opacity 0.2s',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ChatOptionsMenu
          chat={session}
          onShareClick={onShareClick}
          onKBGroundingClick={onKBGroundingClick}
          onError={onError}
          onSuccess={onSuccess}
          size="small"
        />
      </Box>
    </Box>
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
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

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
      setFilterAnchorEl(null);
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
    <Box className={className} sx={{ display: 'flex', flexDirection: 'column', height }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        {showNewChatButton && (
          <Button
            onClick={onNewChat}
            size="small"
            variant="contained"
            startIcon={<Plus size={16} />}
            sx={{ flexShrink: 0 }}
          >
            New Chat
          </Button>
        )}

        {/* Search */}
        <TextField
          placeholder="Search chats..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} />
              </InputAdornment>
            ),
          }}
        />

        {/* Filters */}
        {showFilters && (
          <>
            <IconButton
              size="small"
              onClick={(e) => setFilterAnchorEl(e.currentTarget)}
              sx={{ flexShrink: 0 }}
            >
              <Filter size={16} />
            </IconButton>
            <Menu
              anchorEl={filterAnchorEl}
              open={Boolean(filterAnchorEl)}
              onClose={() => setFilterAnchorEl(null)}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="caption" fontWeight="bold">
                  Filters
                </Typography>
              </Box>
              <Divider />
              <MenuItem>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filters.favoritesOnly}
                      onChange={handleToggleFavoritesOnly}
                      size="small"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Star size={14} />
                      <Typography variant="body2">Favorites Only</Typography>
                    </Box>
                  }
                />
              </MenuItem>
              <Divider />
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="caption" fontWeight="bold">
                  Sort By
                </Typography>
              </Box>
              <MenuItem onClick={() => handleSortChange("updatedAt", "desc")}>
                <ListItemIcon>
                  <SortDesc size={16} />
                </ListItemIcon>
                <ListItemText>Latest Activity</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleSortChange("createdAt", "desc")}>
                <ListItemIcon>
                  <SortDesc size={16} />
                </ListItemIcon>
                <ListItemText>Newest First</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleSortChange("createdAt", "asc")}>
                <ListItemIcon>
                  <SortAsc size={16} />
                </ListItemIcon>
                <ListItemText>Oldest First</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleSortChange("title", "asc")}>
                <ListItemIcon>
                  <SortAsc size={16} />
                </ListItemIcon>
                <ListItemText>Title (A-Z)</ListItemText>
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>

      {/* Session List */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
        }}
        onScroll={handleScroll}
      >
        <Box sx={{ p: 1 }}>
          {sessions.length === 0 && !isLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, color: 'text.secondary' }}>
              <MessageSquare size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <Typography variant="body2">
                {debouncedSearch
                  ? "No chats match your search"
                  : "No chat sessions yet"}
              </Typography>
              {!debouncedSearch && showNewChatButton && (
                <Button
                  variant="text"
                  onClick={onNewChat}
                  sx={{ mt: 1 }}
                >
                  Start a new chat
                </Button>
              )}
            </Box>
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
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}

              {/* Load More Button (fallback) */}
              {!isLoading && hasMoreSessions && (
                <Button
                  variant="text"
                  onClick={handleLoadMore}
                  fullWidth
                  sx={{ mt: 1 }}
                >
                  Load More
                </Button>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default ChatSessionList;
