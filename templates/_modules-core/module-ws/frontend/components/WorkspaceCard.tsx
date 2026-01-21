/**
 * WorkspaceCard Component
 *
 * Displays a workspace as a card with color, icon, tags, and favorite toggle.
 * Used in the workspace list grid view.
 */

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardActionArea,
  Box,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Avatar,
} from "@mui/material";
import {
  Star,
  StarBorder,
  MoreVert,
  Edit,
  Delete,
  Archive,
  Unarchive,
  Group,
} from "@mui/icons-material";
import type { Workspace, WorkspaceRole } from "../types";
import { WORKSPACE_ROLE_DISPLAY_NAMES } from "../types";

export interface WorkspaceCardProps {
  /** Workspace data */
  workspace: Workspace;
  /** Whether to show the favorite button */
  showFavorite?: boolean;
  /** Whether to show the context menu */
  showMenu?: boolean;
  /** Callback when card is clicked */
  onClick?: (workspace: Workspace) => void;
  /** Callback when favorite is toggled */
  onToggleFavorite?: (workspace: Workspace) => void;
  /** Callback when edit is clicked */
  onEdit?: (workspace: Workspace) => void;
  /** Callback when archive is clicked */
  onArchive?: (workspace: Workspace) => void;
  /** Callback when delete is clicked */
  onDelete?: (workspace: Workspace) => void;
  /** Custom icon component (optional) */
  iconComponent?: React.ReactNode;
}

/**
 * Get contrasting text color for a given background color
 */
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function WorkspaceCard({
  workspace,
  showFavorite = true,
  showMenu = true,
  onClick,
  onToggleFavorite,
  onEdit,
  onArchive,
  onDelete,
  iconComponent,
}: WorkspaceCardProps): React.ReactElement {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);

  const handleCardClick = () => {
    if (onClick) {
      onClick(workspace);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(workspace);
    }
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    if (onEdit) {
      onEdit(workspace);
    }
  };

  const handleArchive = () => {
    handleMenuClose();
    if (onArchive) {
      onArchive(workspace);
    }
  };

  const handleDelete = () => {
    handleMenuClose();
    if (onDelete) {
      onDelete(workspace);
    }
  };

  const isArchived = workspace.status === "archived";
  const isDeleted = Boolean(workspace.deletedAt);
  const userRole = workspace.userRole;
  const canEdit = userRole === "ws_owner" || userRole === "ws_admin";
  const canDelete = userRole === "ws_owner";

  return (
    <Card
      sx={{
        position: "relative",
        opacity: isDeleted ? 0.6 : 1,
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: 4,
        },
      }}
    >
      <CardActionArea onClick={handleCardClick} disabled={isDeleted}>
        {/* Color banner */}
        <Box
          sx={{
            height: 8,
            backgroundColor: workspace.color || "#1976d2",
          }}
        />

        <CardContent>
          {/* Header with icon and actions */}
          <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1 }}>
            {/* Icon */}
            <Avatar
              sx={{
                backgroundColor: workspace.color || "#1976d2",
                color: getContrastColor(workspace.color || "#1976d2"),
                width: 40,
                height: 40,
                mr: 1.5,
              }}
            >
              {iconComponent || workspace.name.charAt(0).toUpperCase()}
            </Avatar>

            {/* Name and status */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                component="h3"
                noWrap
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {workspace.name}
              </Typography>
              {isArchived && (
                <Chip
                  label="Archived"
                  size="small"
                  color="warning"
                  sx={{ height: 18, fontSize: "0.65rem", mt: 0.5 }}
                />
              )}
              {isDeleted && (
                <Chip
                  label="Deleted"
                  size="small"
                  color="error"
                  sx={{ height: 18, fontSize: "0.65rem", mt: 0.5 }}
                />
              )}
            </Box>

            {/* Actions */}
            <Box sx={{ display: "flex", ml: 1 }}>
              {showFavorite && !isDeleted && (
                <Tooltip title={workspace.isFavorited ? "Remove from favorites" : "Add to favorites"}>
                  <IconButton
                    size="small"
                    onClick={handleFavoriteClick}
                    aria-label={workspace.isFavorited ? "Remove from favorites" : "Add to favorites"}
                    sx={{ color: workspace.isFavorited ? "warning.main" : "action.disabled" }}
                  >
                    {workspace.isFavorited ? <Star /> : <StarBorder />}
                  </IconButton>
                </Tooltip>
              )}
              {showMenu && canEdit && !isDeleted && (
                <>
                  <IconButton size="small" onClick={handleMenuOpen} aria-label="Workspace options">
                    <MoreVert />
                  </IconButton>
                  <Menu
                    anchorEl={menuAnchor}
                    open={menuOpen}
                    onClose={handleMenuClose}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MenuItem onClick={handleEdit}>
                      <Edit fontSize="small" sx={{ mr: 1 }} />
                      Edit
                    </MenuItem>
                    <MenuItem onClick={handleArchive}>
                      {isArchived ? (
                        <>
                          <Unarchive fontSize="small" sx={{ mr: 1 }} />
                          Unarchive
                        </>
                      ) : (
                        <>
                          <Archive fontSize="small" sx={{ mr: 1 }} />
                          Archive
                        </>
                      )}
                    </MenuItem>
                    {canDelete && (
                      <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
                        <Delete fontSize="small" sx={{ mr: 1 }} />
                        Delete
                      </MenuItem>
                    )}
                  </Menu>
                </>
              )}
            </Box>
          </Box>

          {/* Description */}
          {workspace.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                lineHeight: 1.4,
              }}
            >
              {workspace.description}
            </Typography>
          )}

          {/* Tags */}
          {workspace.tags && workspace.tags.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1.5 }}>
              {workspace.tags.slice(0, 3).map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: "0.7rem" }}
                />
              ))}
              {workspace.tags.length > 3 && (
                <Chip
                  label={`+${workspace.tags.length - 3}`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: "0.7rem" }}
                />
              )}
            </Box>
          )}

          {/* Footer */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mt: "auto",
            }}
          >
            {/* Member count */}
            <Box sx={{ display: "flex", alignItems: "center", color: "text.secondary" }}>
              <Group fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="caption">
                {workspace.memberCount ?? 0} {workspace.memberCount === 1 ? "member" : "members"}
              </Typography>
            </Box>

            {/* Role badge and updated time */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {userRole && (
                <Chip
                  label={WORKSPACE_ROLE_DISPLAY_NAMES[userRole]}
                  size="small"
                  sx={{ height: 18, fontSize: "0.65rem" }}
                />
              )}
              <Typography variant="caption" color="text.secondary">
                {formatRelativeTime(workspace.updatedAt)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default WorkspaceCard;
