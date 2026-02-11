"use client";

/**
 * CollapsibleSection Component
 * 
 * Reusable collapsible section wrapper with expand/collapse functionality.
 * Shows summary when collapsed, full content when expanded.
 */

import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Collapse,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  collapsedSummary?: React.ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  subtitle,
  collapsedSummary,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onToggle,
  headerActions,
  children,
}: CollapsibleSectionProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  // Use controlled if provided, otherwise internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    if (onToggle) {
      onToggle(newExpanded);
    } else {
      setInternalExpanded(newExpanded);
    }
  };

  return (
    <Paper sx={{ mb: 3 }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          gap: 2,
          cursor: "pointer",
          "&:hover": { bgcolor: "action.hover" },
        }}
        onClick={handleToggle}
      >
        <IconButton
          size="small"
          aria-label={isExpanded ? "Collapse section" : "Expand section"}
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
        >
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>

        <Box sx={{ flex: 1 }}>
          <Typography variant="h5">{title}</Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          {!isExpanded && collapsedSummary && (
            <Box sx={{ mt: 0.5 }}>
              {collapsedSummary}
            </Box>
          )}
        </Box>

        {headerActions && (
          <Box
            sx={{ display: "flex", gap: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            {headerActions}
          </Box>
        )}
      </Box>

      {/* Content */}
      <Collapse in={isExpanded}>
        <Box sx={{ p: 3, pt: 0 }}>
          {children}
        </Box>
      </Collapse>
    </Paper>
  );
}