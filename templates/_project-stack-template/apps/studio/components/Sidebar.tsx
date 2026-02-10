"use client";

import * as React from "react";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FolderIcon from "@mui/icons-material/Folder";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import TuneIcon from "@mui/icons-material/Tune";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";

/**
 * Sidebar Component for Eval Optimizer
 * 
 * Simplified sidebar following ADR-008 CORA Sidebar pattern.
 * Provides navigation specific to the eval optimization workflow.
 * 
 * @see cora-dev-toolkit/docs/ADR-008-SIDEBAR-AND-ORG-SELECTOR-STANDARD.md
 */

const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_COLLAPSED = 72;

// Eval Optimizer specific navigation
const EVAL_OPT_NAVIGATION = [
  { href: "/", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/ws", label: "Workspaces", icon: <FolderIcon /> },
  { href: "/optimizer", label: "Run Optimizer", icon: <PlayArrowIcon /> },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  // Get current organization for app branding
  const { currentOrganization } = useOrganizationContext();
  
  // Use collapsed width on desktop when in focus mode
  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    router.push(path as any);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo/Header */}
      <Box sx={{ 
        p: collapsed ? 1.5 : 3, 
        borderBottom: 1, 
        borderColor: "divider", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 1.5,
        transition: "all 0.3s ease"
      }}>
        <Tooltip title={collapsed ? "Design Studio" : ""} placement="right" arrow>
          <TuneIcon sx={{ color: "primary.main", fontSize: 28 }} />
        </Tooltip>
        {!collapsed && (
          <Typography variant="h6" fontWeight={600}>
            Design Studio
          </Typography>
        )}
      </Box>

      {/* Current Organization Display - Hidden when collapsed */}
      {!collapsed && currentOrganization && (
        <Box sx={{ px: 3, py: 1.5, bgcolor: "action.hover" }}>
          <Typography variant="caption" color="text.secondary">
            Organization
          </Typography>
          <Typography variant="body2" fontWeight={500}>
            {currentOrganization.orgName}
          </Typography>
        </Box>
      )}

      {/* Navigation Items */}
      <List sx={{ flexGrow: 1, overflowY: "auto", py: 2 }}>
        {EVAL_OPT_NAVIGATION.map((item) => (
          <ListItem key={item.href} disablePadding sx={{ px: collapsed ? 1 : 2 }}>
            <Tooltip
              title={collapsed ? item.label : ""}
              placement="right"
              arrow
              disableHoverListener={!collapsed}
            >
              <ListItemButton
                selected={pathname === item.href}
                onClick={() => handleNavigation(item.href)}
                sx={{
                  borderRadius: 1,
                  justifyContent: collapsed ? "center" : "flex-start",
                  minHeight: 48,
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": {
                      bgcolor: "primary.dark",
                    },
                    "& .MuiListItemIcon-root": {
                      color: "primary.contrastText",
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: collapsed ? 0 : 40,
                  justifyContent: "center"
                }}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && <ListItemText primary={item.label} />}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      {/* Organization Switcher at Bottom - Always visible, adapts to collapsed state */}
      <OrganizationSwitcher collapsed={collapsed} />
    </Box>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="Open navigation menu"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{
            position: "fixed",
            top: 16,
            left: 16,
            zIndex: theme.zIndex.drawer + 1,
            bgcolor: "background.paper",
            boxShadow: 2,
            "&:hover": {
              bgcolor: "background.paper",
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Desktop: Permanent Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            transition: "width 0.3s ease",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Mobile: Temporary Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}