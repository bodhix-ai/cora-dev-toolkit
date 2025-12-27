"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import CheckIcon from "@mui/icons-material/Check";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useOrganizationContext, useProfile } from "@{{PROJECT_NAME}}/module-access";
import { signOut } from "next-auth/react";

/**
 * OrganizationSwitcher Component - Following ADR-008 CORA Sidebar and Org Selector Standard
 * 
 * Bottom-left organization selector with user menu (standard SaaS pattern).
 * 
 * Features:
 * - Current org + user display
 * - Organization switching (uses CORA context)
 * - Settings link
 * - Admin link (conditional on super_admin role)
 * - Logout
 * 
 * Key principle: Uses CORA context ONLY (NO Zustand).
 * - useOrganizationContext() for org state
 * - useProfile() for user state
 * - switchOrganization() persists to backend via CORA
 * 
 * @see cora-dev-toolkit/docs/ADR-008-SIDEBAR-AND-ORG-SELECTOR-STANDARD.md
 */
export function OrganizationSwitcher() {
  const { currentOrganization, organizations, switchOrganization, isLoading } =
    useOrganizationContext();
  const { profile } = useProfile();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOrgSwitch = async (orgId: string) => {
    try {
      await switchOrganization(orgId);
      handleClose();
      // Optionally refresh the page to reload data for new org
      router.refresh();
    } catch (error) {
      console.error("Failed to switch organization:", error);
      // Optionally show error toast/snackbar
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/signin" });
  };

  const handleSettings = () => {
    router.push("/settings" as any);
    handleClose();
  };

  const handlePlatformAdmin = () => {
    router.push("/admin/platform" as any);
    handleClose();
  };

  const handleOrgAdmin = () => {
    router.push("/admin/org" as any);
    handleClose();
  };

  const handleProfile = () => {
    router.push("/profile" as any);
    handleClose();
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (profile?.name) {
      return profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (profile?.email) {
      return profile.email[0].toUpperCase();
    }
    return "?";
  };

  return (
    <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
      <Box
        onClick={handleClick}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1.5,
          borderRadius: 1,
          cursor: "pointer",
          transition: "background-color 0.2s",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main" }}>
          {getUserInitials()}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={500} noWrap>
            {profile?.name || profile?.email || "User"}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {currentOrganization?.orgName || "No organization"}
          </Typography>
        </Box>
        <ExpandMoreIcon sx={{ color: "text.secondary" }} />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        PaperProps={{
          sx: {
            width: 280,
            mt: -1,
            overflow: "visible",
            boxShadow: 3,
          },
        }}
      >
        {/* User Info Header */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {profile?.name || "User"}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {profile?.email}
          </Typography>
        </Box>

        {/* Organization List */}
        {organizations && organizations.length > 0 && (
          <>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                ORGANIZATIONS
              </Typography>
            </Box>
            {organizations.map((org) => (
              <MenuItem
                key={org.orgId}
                onClick={() => handleOrgSwitch(org.orgId)}
                selected={org.orgId === currentOrganization?.orgId}
                disabled={isLoading}
              >
                <ListItemIcon>
                  {org.orgId === currentOrganization?.orgId && (
                    <CheckIcon fontSize="small" />
                  )}
                </ListItemIcon>
                <Typography variant="body2" noWrap>
                  {org.orgName}
                </Typography>
              </MenuItem>
            ))}
            <Divider sx={{ my: 1 }} />
          </>
        )}

        {/* Admin Section (conditional visibility) */}
        {(profile?.globalRole === "platform_owner" || profile?.globalRole === "platform_admin" || 
          currentOrganization?.role === "org_owner" || currentOrganization?.role === "org_admin") && (
          <>
            {/* Platform Admin */}
            {(profile?.globalRole === "platform_owner" || profile?.globalRole === "platform_admin") && (
              <MenuItem onClick={handlePlatformAdmin}>
                <ListItemIcon>
                  <AdminPanelSettingsIcon fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">Platform Admin</Typography>
              </MenuItem>
            )}

            {/* Org Admin */}
            {currentOrganization && (currentOrganization.role === "org_owner" || currentOrganization.role === "org_admin") && (
              <MenuItem onClick={handleOrgAdmin}>
                <ListItemIcon>
                  <BusinessIcon fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">Org Admin</Typography>
              </MenuItem>
            )}

            <Divider sx={{ my: 1 }} />
          </>
        )}

        {/* User Section */}
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Profile</Typography>
        </MenuItem>

        <MenuItem onClick={handleSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Settings</Typography>
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        {/* Logout */}
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Logout</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
}
