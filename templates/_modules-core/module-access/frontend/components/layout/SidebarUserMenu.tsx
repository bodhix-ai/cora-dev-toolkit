"use client";

import { useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { useOrganizationContext } from "../../hooks/useOrganizationContext";
import { useRole } from "../../hooks/useRole";
import {
  Box,
  Menu,
  MenuItem,
  Divider,
  Avatar,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CheckIcon from "@mui/icons-material/Check";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BusinessIcon from "@mui/icons-material/Business";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { getRoleDisplayName } from "../../lib/permissions";

interface SidebarUserMenuProps {
  isExpanded: boolean;
}

/**
 * SidebarUserMenu Component
 *
 * Claude.ai-style unified bottom menu that combines:
 * - User profile information
 * - Organization switcher
 * - Settings and help links
 * - Sign out action
 *
 * Adapts to sidebar's expanded/collapsed state
 */
export function SidebarUserMenu({ isExpanded }: SidebarUserMenuProps) {
  const { profile, authAdapter } = useUser();
  const { organizations, currentOrganization, switchOrganization, isLoading } =
    useOrganizationContext();
  const { role, hasPermission, isSysAdmin, isOrgAdmin } = useRole();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleOrgSwitch = async (orgId: string) => {
    try {
      await switchOrganization(orgId);
      handleMenuClose();
    } catch (error) {
      console.error("Failed to switch organization:", error);
    }
  };

  const handleSignOut = async () => {
    handleMenuClose();
    if (authAdapter) {
      await authAdapter.signOut();
    }
  };

  // Get user initials
  const getUserInitials = () => {
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
    }
    if (profile?.email) {
      return profile.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  // Get full user name
  const getUserName = () => {
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName} ${profile.lastName}`;
    }
    return profile?.email || "User";
  };

  if (!profile) {
    return null;
  }

  return (
    <>
      {/* Trigger Button */}
      <Box
        component="button"
        onClick={handleMenuClick}
        aria-label="User menu"
        aria-expanded={menuOpen}
        aria-haspopup="true"
        sx={{
          width: "100%",
          display: "flex",
          alignItems: isExpanded ? "center" : "center",
          justifyContent: isExpanded ? "flex-start" : "center",
          gap: isExpanded ? 3 : 0,
          px: isExpanded ? 3 : 0,
          py: 2,
          border: "none",
          bgcolor: "transparent",
          cursor: "pointer",
          borderRadius: isExpanded ? "12px" : "8px",
          transition: "background-color 0.2s",
          position: "relative",
          "&:hover": {
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "#27272a" : "grey.100",
          },
        }}
      >
        {/* User initials - simple text circle */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "20px",
            minWidth: "20px",
            minHeight: "20px",
            borderRadius: "50%",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "#3f3f46" : "grey.200",
            color: (theme) =>
              theme.palette.mode === "dark" ? "white" : "grey.900",
            fontSize: "0.625rem",
            fontWeight: 500,
          }}
        >
          {getUserInitials()}
        </Box>

        {/* Expanded State - Name + Arrow */}
        {isExpanded && (
          <>
            <Box sx={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "white" : "grey.900",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {getUserName()}
              </Typography>
              {role && (
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: (theme) =>
                      theme.palette.mode === "dark" ? "grey.400" : "grey.500",
                  }}
                >
                  {getRoleDisplayName(role)}
                </Typography>
              )}
            </Box>
            <KeyboardArrowDownIcon
              fontSize="small"
              sx={{
                color: (theme) =>
                  theme.palette.mode === "dark" ? "grey.400" : "grey.500",
                transition: "transform 0.2s",
                transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </>
        )}

        {/* Collapsed State - Tooltip */}
        {!isExpanded && (
          <Box
            sx={{
              position: "absolute",
              left: "100%",
              ml: 2,
              px: 3,
              py: 2,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#27272a" : "grey.900",
              color: "white",
              fontSize: "0.875rem",
              borderRadius: "8px",
              opacity: 0,
              pointerEvents: "none",
              whiteSpace: "nowrap",
              transition: "opacity 0.2s",
              zIndex: 50,
              boxShadow: 6,
              "&:hover": {
                opacity: 1,
              },
            }}
          >
            {getUserName()}
          </Box>
        )}
      </Box>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: isExpanded ? "left" : "right",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: isExpanded ? "left" : "left",
        }}
        slotProps={{
          paper: {
            elevation: 3,
            sx: {
              minWidth: 280,
              mt: -1,
              ml: isExpanded ? 0 : 1,
              overflow: "visible",
              borderRadius: "8px",
              border: 1,
              borderColor: "divider",
            },
          },
        }}
      >
        {/* User Info Section */}
        <Box sx={{ px: 4, py: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 2 }}>
            <Avatar
              src=""
              alt=""
              sx={{
                width: 40,
                height: 40,
                fontSize: "1rem",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "#3f3f46" : "grey.200",
                color: (theme) =>
                  theme.palette.mode === "dark" ? "white" : "grey.900",
              }}
            >
              {getUserInitials()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "white" : "grey.900",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {getUserName()}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "grey.400" : "grey.500",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {profile.email}
              </Typography>
            </Box>
          </Box>
          {role && (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 2,
                py: 1,
                borderRadius: "8px",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(30, 64, 175, 0.2)"
                    : "#eff6ff",
                color: (theme) =>
                  theme.palette.mode === "dark" ? "primary.light" : "primary.main",
                fontSize: "0.75rem",
                fontWeight: 500,
              }}
            >
              {getRoleDisplayName(role)}
            </Box>
          )}

          {/* Error/Status Information */}
          {isLoading && (
            <Box
              sx={{
                mt: 2,
                fontSize: "0.75rem",
                color: (theme) =>
                  theme.palette.mode === "dark" ? "#fbbf24" : "#d97706",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(217, 119, 6, 0.2)"
                    : "#fef3c7",
                px: 2,
                py: 1,
                borderRadius: "4px",
              }}
            >
              Loading organization data...
            </Box>
          )}
          {!profile?.firstName && !profile?.lastName && (
            <Box
              sx={{
                mt: 2,
                fontSize: "0.75rem",
                color: (theme) =>
                  theme.palette.mode === "dark" ? "#fb923c" : "#ea580c",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(234, 88, 12, 0.2)"
                    : "#ffedd5",
                px: 2,
                py: 1,
                borderRadius: "4px",
              }}
            >
              Profile incomplete - please update your name
            </Box>
          )}
        </Box>

        {/* Organization Section */}
        {organizations.length > 0 && <Divider />}
        {organizations.length > 0 && (
          <Box sx={{ px: 2, py: 2 }}>
            <Box
              sx={{
                px: 2,
                py: 1,
                fontSize: "0.75rem",
                fontWeight: 600,
                color: (theme) =>
                  theme.palette.mode === "dark" ? "grey.400" : "grey.500",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Organization
            </Box>
            {organizations.map((org) => (
              <MenuItem
                key={org.orgId}
                onClick={() => handleOrgSwitch(org.orgId)}
                disabled={org.orgId === currentOrganization?.orgId || isLoading}
                selected={org.orgId === currentOrganization?.orgId}
                sx={{
                  borderRadius: "6px",
                  mx: 0.5,
                  my: 0.5,
                  "&.Mui-selected": {
                    bgcolor: "rgba(59, 130, 246, 0.1)",
                    "&:hover": {
                      bgcolor: "rgba(59, 130, 246, 0.15)",
                    },
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    width: "100%",
                  }}
                >
                  <Avatar
                    src=""
                    alt=""
                    sx={{
                      width: 32,
                      height: 32,
                      fontSize: "0.75rem",
                      bgcolor: "rgb(59, 130, 246)",
                      color: "white",
                    }}
                  >
                    {org.orgName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {org.orgName}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: (theme) =>
                          theme.palette.mode === "dark"
                            ? "grey.400"
                            : "grey.500",
                      }}
                    >
                      {getRoleDisplayName(org.role)}
                      {org.isOwner && " • Owner"}
                    </Typography>
                  </Box>
                  {org.orgId === currentOrganization?.orgId && (
                    <CheckIcon
                      fontSize="small"
                      sx={{
                        color: (theme) =>
                          theme.palette.mode === "dark"
                            ? "primary.light"
                            : "primary.main",
                      }}
                    />
                  )}
                </Box>
              </MenuItem>
            ))}
          </Box>
        )}

        {/* Actions Section */}
        <Divider />
        <Box sx={{ px: 2, py: 2 }}>
          {/* User Profile */}
          <MenuItem
            onClick={() => {
              handleMenuClose();
              window.location.href = "/profile";
            }}
            sx={{ borderRadius: "6px", mx: 0.5, my: 0.5 }}
          >
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="User Profile"
              primaryTypographyProps={{ fontSize: "0.875rem" }}
            />
          </MenuItem>

          {/* System Admin - Only for system admins */}
          {isSysAdmin && (
            <MenuItem
              onClick={() => {
                handleMenuClose();
                window.location.href = "/admin/platform";
              }}
              sx={{ borderRadius: "6px", mx: 0.5, my: 0.5 }}
            >
              <ListItemIcon>
                <AdminPanelSettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="System Admin"
                primaryTypographyProps={{ fontSize: "0.875rem" }}
              />
            </MenuItem>
          )}

          {/* Organization Admin - Only for org admins */}
          {isOrgAdmin && (
            <MenuItem
              onClick={() => {
                handleMenuClose();
                window.location.href = "/admin/org";
              }}
              sx={{ borderRadius: "6px", mx: 0.5, my: 0.5 }}
            >
              <ListItemIcon>
                <BusinessIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Organization Admin"
                primaryTypographyProps={{ fontSize: "0.875rem" }}
              />
            </MenuItem>
          )}

          <Divider sx={{ my: 1 }} />

          {/* Utility Navigation Items */}
          <MenuItem
            onClick={() => {
              handleMenuClose();
              window.location.href = "/settings";
            }}
            sx={{ borderRadius: "6px", mx: 0.5, my: 0.5 }}
          >
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Settings"
              primaryTypographyProps={{ fontSize: "0.875rem" }}
            />
          </MenuItem>

          <MenuItem
            onClick={() => {
              handleMenuClose();
              window.location.href = "/help";
            }}
            sx={{ borderRadius: "6px", mx: 0.5, my: 0.5 }}
          >
            <ListItemIcon>
              <HelpOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Help"
              primaryTypographyProps={{ fontSize: "0.875rem" }}
            />
          </MenuItem>

          <MenuItem
            onClick={() => {
              handleMenuClose();
              window.location.href = "/docs";
            }}
            sx={{ borderRadius: "6px", mx: 0.5, my: 0.5 }}
          >
            <ListItemIcon>
              <MenuBookIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Documentation"
              primaryTypographyProps={{ fontSize: "0.875rem" }}
            />
          </MenuItem>

          <Divider sx={{ my: 1 }} />

          <MenuItem
            onClick={handleSignOut}
            sx={{ borderRadius: "6px", mx: 0.5, my: 0.5 }}
          >
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Sign Out"
              primaryTypographyProps={{ fontSize: "0.875rem" }}
            />
          </MenuItem>
        </Box>
      </Menu>
    </>
  );
}