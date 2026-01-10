"use client";

import { useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { useOrganizationContext } from "../../hooks/useOrganizationContext";
import { useRole } from "../../hooks/useRole";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
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
  const { role, hasPermission, isGlobalAdmin, isOrgAdmin } = useRole();
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
      <button
        onClick={handleMenuClick}
        className={`w-full transition-colors ${
          isExpanded
            ? "flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"
            : "flex items-center justify-center py-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md group relative"
        }`}
        aria-label="User menu"
        aria-expanded={menuOpen}
        aria-haspopup="true"
      >
        {/* User initials - simple text circle */}
        <div
          className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-white text-[0.625rem] font-medium"
          style={{ minWidth: "20px", minHeight: "20px" }}
        >
          {getUserInitials()}
        </div>

        {/* Expanded State - Name + Arrow */}
        {isExpanded && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {getUserName()}
              </p>
              {role && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {getRoleDisplayName(role)}
                </p>
              )}
            </div>
            <KeyboardArrowDownIcon
              fontSize="small"
              className={`text-gray-500 dark:text-gray-400 transition-transform ${
                menuOpen ? "rotate-180" : ""
              }`}
            />
          </>
        )}

        {/* Collapsed State - Tooltip */}
        {!isExpanded && (
          <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-zinc-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50 shadow-lg">
            {getUserName()}
          </div>
        )}
      </button>

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
              border: "1px solid",
              borderColor: "divider",
            },
          },
        }}
      >
        {/* User Info Section */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            <Avatar
              src=""
              alt=""
              sx={{
                width: 40,
                height: 40,
                fontSize: "1rem",
                bgcolor: "rgb(229, 231, 235)",
                color: "rgb(17, 24, 39)",
              }}
              className="dark:bg-zinc-700 dark:text-white"
            >
              {getUserInitials()}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {getUserName()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {profile.email}
              </p>
            </div>
          </div>
          {role && (
            <div className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium">
              {getRoleDisplayName(role)}
            </div>
          )}

          {/* Error/Status Information */}
          {isLoading && (
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
              Loading organization data...
            </div>
          )}
          {!profile?.firstName && !profile?.lastName && (
            <div className="mt-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
              Profile incomplete - please update your name
            </div>
          )}
        </div>

        {/* Organization Section */}
        {organizations.length > 0 && <Divider />}
        {organizations.length > 0 && (
          <div className="px-2 py-2">
            <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Organization
            </div>
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
                <div className="flex items-center gap-3 w-full">
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
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {org.orgName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {getRoleDisplayName(org.role)}
                      {org.isOwner && " • Owner"}
                    </div>
                  </div>
                  {org.orgId === currentOrganization?.orgId && (
                    <CheckIcon
                      fontSize="small"
                      className="text-blue-600 dark:text-blue-400"
                    />
                  )}
                </div>
              </MenuItem>
            ))}
          </div>
        )}

        {/* Actions Section */}
        <Divider />
        <div className="px-2 py-2">
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

          {/* Platform Admin - Only for global admins */}
          {isGlobalAdmin && (
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
                primary="Platform Admin"
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
        </div>
      </Menu>
    </>
  );
}
