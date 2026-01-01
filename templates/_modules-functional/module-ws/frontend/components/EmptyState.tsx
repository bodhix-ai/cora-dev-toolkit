/**
 * EmptyState Component
 *
 * Displays an empty state with icon, message, and optional action button.
 */

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { Add, Search, Workspaces } from "@mui/icons-material";

export type EmptyStateVariant = "no-workspaces" | "no-results" | "no-favorites" | "custom";

export interface EmptyStateProps {
  /** Variant determines the default icon and message */
  variant?: EmptyStateVariant;
  /** Custom title (overrides variant default) */
  title?: string;
  /** Custom description (overrides variant default) */
  description?: string;
  /** Custom icon component (overrides variant default) */
  icon?: React.ReactNode;
  /** Action button label */
  actionLabel?: string;
  /** Action button callback */
  onAction?: () => void;
  /** Whether to show the action button */
  showAction?: boolean;
}

interface VariantConfig {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
}

const variantConfigs: Record<EmptyStateVariant, VariantConfig> = {
  "no-workspaces": {
    title: "No workspaces yet",
    description: "Create your first workspace to get started organizing your work.",
    icon: <Workspaces sx={{ fontSize: 64, color: "action.disabled" }} />,
    actionLabel: "Create Workspace",
  },
  "no-results": {
    title: "No results found",
    description: "Try adjusting your search or filters to find what you're looking for.",
    icon: <Search sx={{ fontSize: 64, color: "action.disabled" }} />,
    actionLabel: "Clear Filters",
  },
  "no-favorites": {
    title: "No favorites yet",
    description: "Star workspaces to add them to your favorites for quick access.",
    icon: <Workspaces sx={{ fontSize: 64, color: "action.disabled" }} />,
    actionLabel: "Browse Workspaces",
  },
  custom: {
    title: "Nothing here",
    description: "There's nothing to display at the moment.",
    icon: <Workspaces sx={{ fontSize: 64, color: "action.disabled" }} />,
    actionLabel: "Go Back",
  },
};

export function EmptyState({
  variant = "no-workspaces",
  title,
  description,
  icon,
  actionLabel,
  onAction,
  showAction = true,
}: EmptyStateProps): React.ReactElement {
  const config = variantConfigs[variant];

  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayIcon = icon || config.icon;
  const displayActionLabel = actionLabel || config.actionLabel;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 3,
        textAlign: "center",
      }}
    >
      <Box sx={{ mb: 3 }}>{displayIcon}</Box>

      <Typography variant="h6" gutterBottom color="text.primary">
        {displayTitle}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 400, mb: 3 }}
      >
        {displayDescription}
      </Typography>

      {showAction && onAction && (
        <Button
          variant="contained"
          startIcon={variant === "no-workspaces" ? <Add /> : undefined}
          onClick={onAction}
        >
          {displayActionLabel}
        </Button>
      )}
    </Box>
  );
}

export default EmptyState;
