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

// Eval Optimizer specific navigation
const EVAL_OPT_NAVIGATION = [
  { href: "/", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/ws", label: "Workspaces", icon: <FolderIcon /> },
  { href: "/optimizer", label: "Run Optimizer", icon: <PlayArrowIcon /> },
];

export function Sidebar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  // Get current organization for app branding
  const { currentOrganization } = useOrganizationContext();

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
      <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", gap: 1.5 }}>
        <TuneIcon sx={{ color: "primary.main", fontSize: 28 }} />
        <Typography variant="h6" fontWeight={600}>
          Eval Optimizer
        </Typography>
      </Box>

      {/* Current Organization Display */}
      {currentOrganization && (
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
          <ListItem key={item.href} disablePadding sx={{ px: 2 }}>
            <ListItemButton
              selected={pathname === item.href}
              onClick={() => handleNavigation(item.href)}
              sx={{
                borderRadius: 1,
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
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Organization Switcher at Bottom */}
      <OrganizationSwitcher />
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
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
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