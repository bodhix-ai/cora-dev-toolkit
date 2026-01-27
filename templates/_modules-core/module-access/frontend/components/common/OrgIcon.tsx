/**
 * OrgIcon Component
 * 
 * Dynamic icon renderer for organization branding
 * Renders the appropriate MUI icon based on the icon name string
 */
import React from "react";
import { Box, SxProps, Theme } from "@mui/material";
import {
  AutoAwesomeOutlined,
  PsychologyOutlined,
  SmartToyOutlined,
  AutoFixHighOutlined,
  BoltOutlined,
  HubOutlined,
  MemoryOutlined,
  ModelTrainingOutlined,
} from "@mui/icons-material";

interface OrgIconProps {
  iconName?: string | null;
  className?: string;
  fontSize?: "small" | "medium" | "large" | "inherit";
  sx?: SxProps<Theme>;
}

/**
 * Maps icon names to MUI icon components
 */
const ICON_MAP: Record<string, React.ComponentType<{ fontSize?: "small" | "medium" | "large" | "inherit" }>> = {
  AutoAwesomeOutlined,
  PsychologyOutlined,
  SmartToyOutlined,
  AutoFixHighOutlined,
  BoltOutlined,
  HubOutlined,
  MemoryOutlined,
  ModelTrainingOutlined,
};

const DEFAULT_ICON = "AutoAwesomeOutlined";

/**
 * Renders the appropriate MUI icon based on the icon name
 * Falls back to AutoAwesomeOutlined if icon name is invalid or not provided
 * 
 * Note: MUI icons don't accept className or sx directly, so we wrap in Box when styling is needed
 */
export function OrgIcon({ iconName, className, fontSize = "medium", sx }: OrgIconProps) {
  const IconComponent = ICON_MAP[iconName || DEFAULT_ICON] || ICON_MAP[DEFAULT_ICON];

  // Wrap in Box if className or sx is provided (MUI icons don't accept these props directly)
  if (className || sx) {
    return (
      <Box 
        component="span" 
        className={className} 
        sx={{ display: "inline-flex", alignItems: "center", ...sx }}
      >
        <IconComponent fontSize={fontSize} />
      </Box>
    );
  }

  return <IconComponent fontSize={fontSize} />;
}
