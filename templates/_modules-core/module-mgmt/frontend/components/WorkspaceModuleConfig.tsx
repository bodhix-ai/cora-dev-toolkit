/**
 * Workspace Module Configuration Component
 *
 * Allows workspace admins to configure module enablement for their workspace.
 * Shows inherited settings from org/system and allows workspace-level overrides.
 *
 * ADR-019c Compliance: Resource Permissions Pattern
 * - Uses useWorkspaceModuleConfig hook for data + authorization
 * - Shows cascade status (sys → org → ws)
 * - Respects parent-level enablement
 */

import React, { useState } from "react";
import { useWorkspaceModuleConfig, type WorkspaceModuleConfig as WorkspaceModuleConfigType } from "../hooks/useWorkspaceModuleConfig";
import {
  Box,
  Alert,
  CircularProgress,
  Typography,
  Switch,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from "@mui/material";
import {
  CheckCircle as EnabledIcon,
  Cancel as DisabledIcon,
  Lock as LockedIcon,
} from "@mui/icons-material";

interface WorkspaceModuleConfigProps {
  workspaceId: string;
  /**
   * Callback when a module is toggled.
   * Use this to refresh parent context (e.g., WorkspacePluginProvider).
   */
  onModuleToggled?: () => Promise<void>;
}

interface Module {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  type: "core" | "functional";
  tier?: number;
  isEnabled: boolean;
  systemEnabled: boolean; // System-level enablement
  orgEnabled?: boolean; // Org-level enablement
  wsEnabled?: boolean; // Workspace-level override
  version?: string;
  config?: Record<string, any>;
  featureFlags?: Record<string, any>;
  dependencies?: string[];
}

export function WorkspaceModuleConfig({ workspaceId, onModuleToggled }: WorkspaceModuleConfigProps) {
  // ADR-019c: Use hook for data + authorization
  const {
    modules,
    isLoading,
    error: modulesError,
    updateConfig,
    refreshModules,
  } = useWorkspaceModuleConfig(workspaceId);

  // Local state for update errors
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleToggleEnabled = async (module: WorkspaceModuleConfigType) => {
    try {
      setUpdateError(null);

      // Toggle isEnabled: if currently enabled, disable; if disabled, enable
      const newEnabledState = !module.isEnabled;

      // Call the hook's updateConfig method with the toggled isEnabled state
      await updateConfig(module.name, {
        isEnabled: newEnabledState,
        configOverrides: {},
        featureFlagOverrides: {},
      });

      // Refresh both the local modules list AND notify parent
      // This ensures the tabs update immediately when modules are toggled
      await refreshModules();
      if (onModuleToggled) {
        await onModuleToggled();
      }
    } catch (err) {
      console.error("Error toggling module:", err);
      setUpdateError(
        err instanceof Error ? err.message : "Failed to toggle module"
      );
    }
  };

  // Determine if toggle is disabled
  const isToggleDisabled = (module: WorkspaceModuleConfigType) => {
    // Can't enable if system disabled
    if (!module.systemEnabled) return true;
    // Can't enable if org disabled
    if (module.orgEnabled === false) return true;
    return false;
  };

  // Get tooltip for disabled toggle
  const getDisabledReason = (module: WorkspaceModuleConfigType) => {
    if (!module.systemEnabled) return "Module is disabled at system level";
    if (module.orgEnabled === false) return "Module is disabled at organization level";
    return "";
  };

  // ADR-019c: Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Module Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Manage which modules are enabled for this workspace. Changes only affect this workspace.
      </Typography>

      {/* Error Alerts */}
      {modulesError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {modulesError}
        </Alert>
      )}
      {updateError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setUpdateError(null)}
        >
          {updateError}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Module</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>System</TableCell>
              <TableCell>Org</TableCell>
              <TableCell>Workspace</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {modules.map((module) => (
              <TableRow key={module.id || module.name}>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {module.displayName}
                    </Typography>
                    {module.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.5 }}
                      >
                        {module.description}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={module.type}
                    size="small"
                    color={module.type === "core" ? "primary" : "default"}
                  />
                  {module.tier && (
                    <Chip
                      label={`Tier ${module.tier}`}
                      size="small"
                      sx={{ ml: 0.5 }}
                    />
                  )}
                </TableCell>
                <TableCell>
                  {module.systemEnabled ? (
                    <EnabledIcon color="success" fontSize="small" />
                  ) : (
                    <DisabledIcon color="error" fontSize="small" />
                  )}
                </TableCell>
                <TableCell>
                  {module.orgEnabled ? (
                    <EnabledIcon color="success" fontSize="small" />
                  ) : (
                    <DisabledIcon color="error" fontSize="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {module.isEnabled ? (
                      <EnabledIcon color="success" fontSize="small" />
                    ) : (
                      <DisabledIcon color="error" fontSize="small" />
                    )}
                    <Switch
                      checked={module.isEnabled}
                      onChange={() => handleToggleEnabled(module)}
                      size="small"
                      disabled={isToggleDisabled(module)}
                    />
                    {isToggleDisabled(module) && (
                      <Tooltip title={getDisabledReason(module)}>
                        <LockedIcon color="disabled" fontSize="small" />
                      </Tooltip>
                    )}
                    {module.wsEnabled !== undefined && (
                      <Chip label="Override" size="small" color="info" />
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
