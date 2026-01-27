"use client";

import { useState } from "react";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Avatar from "@mui/material/Avatar";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
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
                <Box
                  component="span"
                  sx={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {org.orgName}
                </Box>
              </Box>
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
                <CheckIcon
                  fontSize="small"
                  sx={{ ml: 2, color: "primary.main" }}
                />
              )}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  // Full variant
  return (
    <Box sx={{ width: "100%" }}>
      <Typography
        component="label"
        sx={{
          display: "block",
          fontSize: "0.875rem",
          fontWeight: 500,
          color: (theme) =>
            theme.palette.mode === "dark" ? "grey.300" : "grey.700",
          mb: 2,
        }}
      >
        Current Organization
      </Typography>
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
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
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: (theme) =>
                        theme.palette.mode === "dark" ? "white" : "grey.900",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {org.orgName}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.875rem",
                      color: (theme) =>
                        theme.palette.mode === "dark" ? "grey.400" : "grey.500",
                    }}
                  >
                    {getRoleDisplayName(org.role)}
                    {org.isOwner && " • Owner"}
                  </Typography>
                </Box>
              </Box>
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
                    width: 40,
                    height: 40,
                    fontSize: "1rem",
                    bgcolor: "rgb(59, 130, 246)",
                    color: "white",
                  }}
                >
                  {org.orgName.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {org.orgName}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.875rem",
                      color: (theme) =>
                        theme.palette.mode === "dark" ? "grey.400" : "grey.500",
                    }}
                  >
                    {getRoleDisplayName(org.role)}
                    {org.isOwner && " • Owner"}
                  </Typography>
                </Box>
                {org.orgId === currentOrganization.orgId && (
                  <CheckIcon fontSize="small" sx={{ color: "primary.main" }} />
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {organizations.length > 1 && (
        <Typography
          sx={{
            mt: 2,
            fontSize: "0.75rem",
            color: (theme) =>
              theme.palette.mode === "dark" ? "grey.400" : "grey.500",
          }}
        >
          You belong to {organizations.length} organizations
        </Typography>
      )}
    </Box>
  );
}