"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Box, Link as MuiLink, Tooltip } from "@mui/material";

interface NavLinkProps {
  href: string;
  icon: ReactNode;
  label: string;
  isExpanded: boolean;
}

/**
 * NavLink Component
 *
 * Navigation link with active state highlighting and icon support.
 * Adapts to collapsed/expanded sidebar state.
 */
export function NavLink({ href, icon, label, isExpanded }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  const linkContent = (
    <MuiLink
      component={Link}
      href={href}
      aria-label={label}
      underline="none"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: isExpanded ? 3 : 0,
        px: isExpanded ? 4 : 2,
        py: 3,
        borderRadius: 2,
        position: "relative",
        transition: "all 0.2s",
        justifyContent: isExpanded ? "flex-start" : "center",
        bgcolor: isActive
          ? (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(30, 64, 175, 0.2)"
                : "rgba(219, 234, 254, 1)"
          : "transparent",
        color: isActive
          ? (theme) =>
              theme.palette.mode === "dark" ? "primary.light" : "primary.main"
          : (theme) =>
              theme.palette.mode === "dark" ? "grey.300" : "grey.700",
        "&:hover": {
          bgcolor: isActive
            ? (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(30, 64, 175, 0.2)"
                  : "rgba(219, 234, 254, 1)"
            : (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(63, 63, 70, 1)"
                  : "rgba(243, 244, 246, 1)",
        },
      }}
    >
      {/* Active indicator bar */}
      {isActive && (
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "4px",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "primary.light" : "primary.main",
            borderTopRightRadius: 4,
            borderBottomRightRadius: 4,
          }}
        />
      )}

      {/* Icon */}
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isActive
            ? (theme) =>
                theme.palette.mode === "dark"
                  ? "primary.light"
                  : "primary.main"
            : "inherit",
        }}
      >
        {icon}
      </Box>

      {/* Label - hidden when collapsed */}
      {isExpanded && (
        <Box
          component="span"
          sx={{
            fontSize: "0.875rem",
            fontWeight: isActive ? 600 : 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Box>
      )}
    </MuiLink>
  );

  // Wrap with tooltip when collapsed
  if (!isExpanded) {
    return (
      <Tooltip title={label} placement="right" arrow>
        {linkContent}
      </Tooltip>
    );
  }

  return linkContent;
}