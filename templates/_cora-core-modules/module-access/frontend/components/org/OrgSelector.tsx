"use client";

import { useState } from "react";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Avatar from "@mui/material/Avatar";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import CheckIcon from "@mui/icons-material/Check";
import { useOrganizationContext } from "../../hooks/useOrganizationContext";
import { getRoleDisplayName } from "../../lib/permissions";

interface OrgSelectorProps {
  variant?: "compact" | "full";
}

/**
 * OrgSelector Component
 *
 * Dropdown to switch between organizations
 * - Shows current organization name and user's role
 * - Display org avatar/icon
 * - Supports compact and full variants
 */
export function OrgSelector({ variant = "full" }: OrgSelectorProps) {
  const { organizations, currentOrganization, switchOrganization, isLoading } =
    useOrganizationContext();
  const [switching, setSwitching] = useState(false);

  const handleOrgChange = async (orgId: string) => {
    console.log("[OrgSelector] handleOrgChange called with orgId:", orgId);
    console.log("[OrgSelector] Current org:", currentOrganization?.orgId);
    console.log("[OrgSelector] Switching state:", switching);

    if (orgId === currentOrganization?.orgId || switching) {
      console.log("[OrgSelector] Skipping - same org or already switching");
      return;
    }

    setSwitching(true);
    console.log("[OrgSelector] Calling switchOrganization...");
    try {
      await switchOrganization(orgId);
      console.log("[OrgSelector] switchOrganization completed successfully");
    } catch (error) {
      console.error("[OrgSelector] switchOrganization error:", error);
    } finally {
      setSwitching(false);
    }
  };

  if (!currentOrganization || organizations.length === 0) {
    return null;
  }

  if (variant === "compact") {
    return (
      <FormControl
        size="small"
        disabled={isLoading || switching}
        sx={{ minWidth: 200 }}
      >
        <Select
          value={currentOrganization.orgId}
          onChange={(e) => handleOrgChange(e.target.value)}
          aria-label="Select organization"
          sx={{
            borderRadius: "8px",
            "& .MuiSelect-select": {
              display: "flex",
              alignItems: "center",
              gap: 1,
            },
          }}
          renderValue={(value) => {
            const org = organizations.find((o) => o.orgId === value);
            if (!org) return null;
            return (
              <div className="flex items-center gap-2">
                <Avatar
                  src=""
                  alt=""
                  sx={{
                    width: 24,
                    height: 24,
                    fontSize: "0.75rem",
                    bgcolor: "rgb(59, 130, 246)",
                    color: "white",
                  }}
                >
                  {org.orgName.charAt(0).toUpperCase()}
                </Avatar>
                <span className="text-sm font-medium truncate">
                  {org.orgName}
                </span>
              </div>
            );
          }}
        >
          {organizations.map((org) => (
            <MenuItem
              key={org.orgId}
              value={org.orgId}
              selected={org.orgId === currentOrganization.orgId}
            >
              <ListItemIcon>
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
              </ListItemIcon>
              <ListItemText
                primary={org.orgName}
                secondary={getRoleDisplayName(org.role)}
              />
              {org.orgId === currentOrganization.orgId && (
                <CheckIcon fontSize="small" className="ml-2 text-blue-600" />
              )}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  // Full variant
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Current Organization
      </label>
      <FormControl fullWidth disabled={isLoading || switching}>
        <Select
          value={currentOrganization.orgId}
          onChange={(e) => handleOrgChange(e.target.value)}
          aria-label="Select organization"
          sx={{
            borderRadius: "8px",
            "& .MuiSelect-select": {
              display: "flex",
              alignItems: "center",
              gap: 2,
              py: 1.5,
            },
          }}
          renderValue={(value) => {
            const org = organizations.find((o) => o.orgId === value);
            if (!org) return null;
            return (
              <div className="flex items-center gap-3">
                <Avatar
                  src=""
                  alt=""
                  sx={{
                    width: 40,
                    height: 40,
                    fontSize: "1rem",
                    bgcolor: "rgb(59, 130, 246)",
                    color: "white",
                  }}
                >
                  {org.orgName.charAt(0).toUpperCase()}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-gray-900 dark:text-white truncate">
                    {org.orgName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {getRoleDisplayName(org.role)}
                    {org.isOwner && " • Owner"}
                  </div>
                </div>
              </div>
            );
          }}
        >
          {organizations.map((org) => (
            <MenuItem
              key={org.orgId}
              value={org.orgId}
              selected={org.orgId === currentOrganization.orgId}
              sx={{
                py: 1.5,
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
                    width: 40,
                    height: 40,
                    fontSize: "1rem",
                    bgcolor: "rgb(59, 130, 246)",
                    color: "white",
                  }}
                >
                  {org.orgName.charAt(0).toUpperCase()}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold truncate">
                    {org.orgName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {getRoleDisplayName(org.role)}
                    {org.isOwner && " • Owner"}
                  </div>
                </div>
                {org.orgId === currentOrganization.orgId && (
                  <CheckIcon fontSize="small" className="text-blue-600" />
                )}
              </div>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {organizations.length > 1 && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          You belong to {organizations.length} organizations
        </p>
      )}
    </div>
  );
}
