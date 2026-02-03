"use client";

import { useState, useEffect } from "react";
import { Box, IconButton } from "@mui/material";
import { useUser } from "../../contexts/UserContext";
import { useOrganizationContext } from "../../hooks/useOrganizationContext";
import { useRole } from "../../hooks/useRole";
import { NavLink } from "./NavLink";
import { ResizeHandle } from "./ResizeHandle";
import { SidebarUserMenu } from "./SidebarUserMenu";
import { OrgIcon } from "../common/OrgIcon";
import type { NavigationConfig } from "@{{PROJECT_NAME}}/shared-types";

// MUI Icons
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

// Constants
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 60;
const MAX_WIDTH = 400;
const COLLAPSED_WIDTH = 60;

interface SidebarProps {
  navigation: NavigationConfig;
}

/**
 * Sidebar Component
 *
 * Left navigation sidebar with:
 * - Expand/collapse functionality
 * - Resizable width
 * - MUI icons
 * - Organization switcher at bottom
 * - User profile section
 * - Dynamic navigation from module composition
 */
export function Sidebar({ navigation }: SidebarProps) {
  const { profile, isAuthenticated } = useUser();
  const { currentOrganization } = useOrganizationContext();
  const { hasPermission } = useRole();
  const [isExpanded, setIsExpanded] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load saved preferences from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-restricted-properties -- UI preference storage only, not auth tokens
      const savedExpanded = localStorage.getItem("sidebarExpanded");
      // eslint-disable-next-line no-restricted-properties -- UI preference storage only, not auth tokens
      const savedWidth = localStorage.getItem("sidebarWidth");

      if (savedExpanded !== null) {
        setIsExpanded(savedExpanded === "true");
      }
      if (savedWidth !== null) {
        const width = parseInt(savedWidth, 10);
        setSidebarWidth(width);
      }
    }
  }, []);

  // Persist preferences to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebarExpanded", String(isExpanded));

      localStorage.setItem("sidebarWidth", String(sidebarWidth));
    }
  }, [isExpanded, sidebarWidth]);

  // Toggle expand/collapse
  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
    if (isExpanded) {
      setSidebarWidth(COLLAPSED_WIDTH);
    } else {
      setSidebarWidth(DEFAULT_WIDTH);
    }
  };

  // Handle width resize
  const handleResize = (newWidth: number) => {
    setSidebarWidth(newWidth);

    // Auto-expand/collapse based on width
    if (newWidth > COLLAPSED_WIDTH + 20 && !isExpanded) {
      setIsExpanded(true);
    } else if (newWidth <= COLLAPSED_WIDTH + 20 && isExpanded) {
      setIsExpanded(false);
    }
  };

  // Sort navigation sections by order
  const sortedNavigation = [...navigation].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <Box
        component="aside"
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "#18181b" : "white",
          borderRight: 1,
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "#27272a" : "grey.200",
          position: "relative",
          transition: "all 0.3s",
          width: `${sidebarWidth}px`,
        }}
      >
        {/* Resize Handle */}
        <ResizeHandle
          onResize={handleResize}
          minWidth={MIN_WIDTH}
          maxWidth={MAX_WIDTH}
          isResizing={isResizing}
          setIsResizing={setIsResizing}
        />

        {/* App Branding Section */}
        {isExpanded ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              px: 4,
              py: 4,
              borderBottom: 1,
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "#27272a" : "grey.200",
            }}
          >
            <OrgIcon
              iconName={currentOrganization?.appIcon}
              sx={{
                color: (theme) =>
                  theme.palette.mode === "dark" ? "primary.light" : "primary.main",
              }}
              fontSize="medium"
            />
            <Box
              component="span"
              sx={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: (theme) =>
                  theme.palette.mode === "dark" ? "white" : "grey.900",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {currentOrganization?.appName || currentOrganization?.orgName || "CORA"}
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: 4,
              py: 4,
              borderBottom: 1,
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "#27272a" : "grey.200",
            }}
          >
            <OrgIcon
              iconName={currentOrganization?.appIcon}
              sx={{
                color: (theme) =>
                  theme.palette.mode === "dark" ? "primary.light" : "primary.main",
              }}
              fontSize="medium"
            />
          </Box>
        )}

        {/* Collapse/Expand Button */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", p: 4 }}>
          <IconButton
            onClick={toggleExpanded}
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
            sx={{
              p: 2,
              borderRadius: 1,
              transition: "background-color 0.2s",
              "&:hover": {
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "#27272a" : "grey.100",
              },
            }}
          >
            {isExpanded ? (
              <ChevronLeftIcon fontSize="small" />
            ) : (
              <ChevronRightIcon fontSize="small" />
            )}
          </IconButton>
        </Box>

        {/* Navigation Links - Flat list without section headers */}
        <Box
          component="nav"
          sx={{
            flex: 1,
            px: 3,
            py: 4,
            overflowY: "auto",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {sortedNavigation.flatMap((section) =>
              section.items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon as React.ReactNode}
                  label={item.label}
                  isExpanded={isExpanded}
                />
              ))
            )}
          </Box>
        </Box>

        {/* Bottom Section - Unified User Menu */}
        <Box
          sx={{
            borderTop: 1,
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "#27272a" : "grey.200",
            p: 3,
          }}
        >
          <SidebarUserMenu isExpanded={isExpanded} />
        </Box>
      </Box>

      {/* Mobile Menu - Overlay */}
      {isMobileMenuOpen && (
        <Box
          sx={{
            display: { xs: "block", md: "none" },
            position: "fixed",
            inset: 0,
            zIndex: 50,
          }}
        >
          {/* Backdrop */}
          <Box
            onClick={() => setIsMobileMenuOpen(false)}
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: "rgba(0, 0, 0, 0.5)",
            }}
          />

          {/* Sidebar */}
          <Box
            component="aside"
            sx={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "256px",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#18181b" : "white",
              boxShadow: 24,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* App Branding + Close button */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 4,
                borderBottom: 1,
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "#27272a" : "grey.200",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                <OrgIcon
                  iconName={currentOrganization?.appIcon}
                  sx={{
                    color: (theme) =>
                      theme.palette.mode === "dark"
                        ? "primary.light"
                        : "primary.main",
                  }}
                  fontSize="medium"
                />
                <Box
                  component="span"
                  sx={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    color: (theme) =>
                      theme.palette.mode === "dark" ? "white" : "grey.900",
                  }}
                >
                  {currentOrganization?.appName || currentOrganization?.orgName || "CORA"}
                </Box>
              </Box>
              <IconButton
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
                sx={{
                  p: 2,
                  borderRadius: 1,
                  "&:hover": {
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "#27272a" : "grey.100",
                  },
                }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Navigation - Flat list without section headers */}
            <Box
              component="nav"
              sx={{
                flex: 1,
                px: 3,
                py: 4,
                overflowY: "auto",
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {sortedNavigation.flatMap((section) =>
                  section.items.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      icon={item.icon as React.ReactNode}
                      label={item.label}
                      isExpanded={true}
                    />
                  ))
                )}
              </Box>
            </Box>

            {/* Bottom section - Unified User Menu */}
            <Box
              sx={{
                borderTop: 1,
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "#27272a" : "grey.200",
                p: 3,
              }}
            >
              <SidebarUserMenu isExpanded={true} />
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
}