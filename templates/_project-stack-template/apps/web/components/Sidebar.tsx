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
import SettingsIcon from "@mui/icons-material/Settings";
import * as MuiIcons from "@mui/icons-material";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { useWorkspaceConfig } from "@{{PROJECT_NAME}}/module-ws";
import { useOrganizationContext, OrgIcon } from "@{{PROJECT_NAME}}/module-access";
import { ModuleGate } from "@{{PROJECT_NAME}}/module-mgmt";

/**
 * Sidebar Component - Following ADR-008 CORA Sidebar and Org Selector Standard
 * 
 * Implements MUI Drawer pattern with:
 * - Permanent drawer for desktop (md and up)
 * - Temporary drawer for mobile (below md)
 * - Navigation items in the middle
 * - OrganizationSwitcher at the bottom (standard SaaS pattern)
 * 
 * Key principle: NO state management for user/org in this component.
 * Uses CORA context via OrganizationSwitcher.
 * 
 * @see cora-dev-toolkit/docs/ADR-008-SIDEBAR-AND-ORG-SELECTOR-STANDARD.md
 */

import type { NavigationConfig } from "@{{PROJECT_NAME}}/shared-types";

const DRAWER_WIDTH = 280;

interface SidebarProps {
  navigation: NavigationConfig;
}

export function Sidebar({ navigation }: SidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  // Get workspace config for dynamic navigation label
  const { config: wsConfig } = useWorkspaceConfig();
  
  // Get current organization for app branding
  const { currentOrganization } = useOrganizationContext();
  
  // Helper function to map routes to module names for ModuleGate
  const getModuleFromRoute = (href: string): string | null => {
    // Strip /admin prefix if present to normalize route matching
    const normalizedHref = href.startsWith('/admin/') ? href.substring(6) : href;
    
    // Map routes to functional module names (toggleable modules only)
    const routeToModule: Record<string, string> = {
      "/chat": "module-chat",
      "/eval": "module-eval",
      "/voice": "module-voice",
    };
    return routeToModule[normalizedHref] || null;
  };
  
  // Get current org ID for org-level module filtering (S4)
  const currentOrgId = currentOrganization?.id || null;
  
  // Helper function to get dynamic label for navigation items
  const getNavLabel = (item: { href: string; label: string }) => {
    // Override workspace label with config value if available
    if (item.href === "/ws" && wsConfig?.navLabelPlural) {
      return wsConfig.navLabelPlural;
    }
    return item.label;
  };

  // Helper function to get dynamic icon for navigation items
  const getNavIcon = (item: { href: string; icon: React.ReactNode }) => {
    // Override workspace icon with config value if available
    if (item.href === "/ws" && wsConfig?.navIcon) {
      const IconComponent = (MuiIcons as Record<string, React.ComponentType<any>>)[wsConfig.navIcon];
      if (IconComponent) {
        return <IconComponent />;
      }
    }
    return item.icon;
  };

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
      {/* Logo/Header - Dynamic App Branding from Organization Settings */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ color: "primary.main", fontSize: 28, display: "flex" }}>
          <OrgIcon iconName={currentOrganization?.appIcon} />
        </Box>
        <Typography variant="h6" fontWeight={600}>
          {currentOrganization?.appName || currentOrganization?.orgName || "CORA"}
        </Typography>
      </Box>

      {/* Navigation Items */}
      <List sx={{ flexGrow: 1, overflowY: "auto", py: 2 }}>
        {navigation.flatMap((section) =>
          section.items.map((item) => {
            // Don't render workspace nav item until custom label is loaded
            // This prevents showing default "Workspaces" label before custom label loads
            if (item.href === "/ws" && !wsConfig?.navLabelPlural) {
              return null;
            }

            const moduleName = getModuleFromRoute(item.href);
            const navItem = (
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
                  <ListItemIcon sx={{ minWidth: 40 }}>{getNavIcon(item)}</ListItemIcon>
                  <ListItemText primary={getNavLabel(item)} />
                </ListItemButton>
              </ListItem>
            );

            // Wrap functional module nav items in ModuleGate for visibility control
            // Pass orgId for org-level filtering (S4: sys → org cascade)
            if (moduleName) {
              return (
                <ModuleGate key={item.href} moduleName={moduleName} orgId={currentOrgId} fallback={null}>
                  {navItem}
                </ModuleGate>
              );
            }

            // Core module nav items are always visible
            return navItem;
          })
        )}
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
          keepMounted: true, // Better mobile performance
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
