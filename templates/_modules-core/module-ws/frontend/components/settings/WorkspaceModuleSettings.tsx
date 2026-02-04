/**
 * Workspace Module Settings Component
 *
 * Allows workspace admins to configure which modules are enabled for their workspace.
 * Only shows modules that are enabled at both system and org levels.
 *
 * Authorization: ws_owner, ws_admin only
 * Cascade Rule: Can only toggle modules that are enabled at sys AND org levels
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Grid,
} from '@mui/material';
import { useWorkspaceModuleConfig } from '@{{PROJECT_NAME}}/module-mgmt';
import { useWorkspacePlugin } from '@{{PROJECT_NAME}}/shared/workspace-plugin';

interface WorkspaceModuleSettingsProps {
  workspaceId: string;
}

export function WorkspaceModuleSettings({ workspaceId }: WorkspaceModuleSettingsProps) {
  const { modules, isLoading, error, updateConfig } = useWorkspaceModuleConfig(workspaceId);
  const { userRole } = useWorkspacePlugin();
  
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Authorization check - only ws_owner and ws_admin can access
  const isAuthorized = userRole === 'ws_owner' || userRole === 'ws_admin';

  // Filter to modules that are configurable at workspace level
  // Rule: Only show modules where systemEnabled AND orgEnabled are both true
  const configurableModules = useMemo(() => {
    return modules.filter(m => {
      // Must be enabled at both system and org levels to be configurable
      const orgEnabled = m.orgEnabled !== null ? m.orgEnabled : m.systemEnabled;
      return m.systemEnabled && orgEnabled && m.isInstalled;
    });
  }, [modules]);

  // Handle module toggle
  const handleToggle = async (moduleName: string, currentEnabled: boolean) => {
    setUpdating(moduleName);
    setUpdateError(null);

    try {
      // Note: We don't send isEnabled in the update for workspace level
      // Workspace level can only override config/featureFlags, not enablement
      // The module is considered "enabled" if not explicitly disabled via config
      const success = await updateConfig(moduleName, {
        configOverrides: currentEnabled ? { _wsDisabled: true } : {},
        featureFlagOverrides: {},
      });

      if (!success) {
        setUpdateError(`Failed to update ${moduleName}`);
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setUpdating(null);
    }
  };

  // Authorization guard
  if (!isAuthorized) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. Only workspace owners and administrators can configure modules.
        </Alert>
      </Box>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading module configuration: {error}
        </Alert>
      </Box>
    );
  }

  // No configurable modules
  if (configurableModules.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          No modules are available for configuration. Modules must be enabled at both system and organization levels before they can be configured at the workspace level.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Module Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enable or disable modules for this workspace. Only modules enabled by your organization are shown.
      </Typography>

      {updateError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUpdateError(null)}>
          {updateError}
        </Alert>
      )}

      <Grid container spacing={2}>
        {configurableModules.map((module) => {
          const isEnabled = module.resolvedEnabled;
          const isUpdating = updating === module.name;
          const hasOrgOverride = module.orgEnabled !== null;
          // Check if there are workspace-level overrides by seeing if config/featureFlags differ from system
          const hasWsOverride = module.wsEnabled !== undefined;

          return (
            <Grid item xs={12} key={module.name}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="h6">
                          {module.displayName}
                        </Typography>
                        <Chip
                          label={module.type === 'core' ? 'Core' : 'Functional'}
                          size="small"
                          color={module.type === 'core' ? 'primary' : 'default'}
                        />
                        {hasOrgOverride && (
                          <Chip
                            label="Org Override"
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        )}
                        {hasWsOverride && (
                          <Chip
                            label="Workspace Override"
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        )}
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {module.name}
                      </Typography>

                      <Box display="flex" gap={1} flexWrap="wrap">
                        <Chip
                          label={`System: ${module.systemEnabled ? 'Enabled' : 'Disabled'}`}
                          size="small"
                          color={module.systemEnabled ? 'success' : 'default'}
                          variant="outlined"
                        />
                        <Chip
                          label={`Org: ${module.orgEnabled !== null ? (module.orgEnabled ? 'Enabled' : 'Disabled') : 'Inherited'}`}
                          size="small"
                          color={module.orgEnabled !== null ? (module.orgEnabled ? 'success' : 'default') : 'default'}
                          variant="outlined"
                        />
                      </Box>
                    </Box>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={isEnabled}
                          onChange={() => handleToggle(module.name, isEnabled)}
                          disabled={isUpdating}
                          color="primary"
                          inputProps={{
                            'aria-label': `Enable or disable ${module.displayName} for this workspace`,
                          }}
                        />
                      }
                      label={isEnabled ? 'Enabled' : 'Disabled'}
                      labelPlacement="start"
                    />
                  </Box>

                  {isUpdating && (
                    <Box display="flex" alignItems="center" gap={1} mt={2}>
                      <CircularProgress size={16} />
                      <Typography variant="caption" color="text.secondary">
                        Updating...
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Alert severity="info">
        <Typography variant="body2">
          <strong>Note:</strong> Modules can only be configured at the workspace level if they are enabled at both the system and organization levels. If you need to enable a module that is not listed here, contact your organization administrator.
        </Typography>
      </Alert>
    </Box>
  );
}

export default WorkspaceModuleSettings;