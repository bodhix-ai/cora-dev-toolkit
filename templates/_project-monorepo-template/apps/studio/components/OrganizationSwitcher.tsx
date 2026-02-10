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
import CheckIcon from "@mui/icons-material/Check";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useOrganizationContext, useProfile } from "@{{PROJECT_NAME}}/module-access";
import { signOut } from "next-auth/react";

/**
 * OrganizationSwitcher Component for Eval Optimizer
 * 
 * Simplified organization selector following ADR-008 pattern.
 * Provides org context needed for eval optimization workspaces.
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
      router.refresh();
    } catch (error) {
      console.error("Failed to switch organization:", error);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/signin" });
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