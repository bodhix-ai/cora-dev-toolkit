/**
 * Org Admin - Module Configuration Page
 *
 * Allows org admins to configure which modules are enabled for their organization.
 * Modules must be enabled at system level to be configurable here.
 *
 * Authorization: org_admin, org_owner, or sys_admin
 * Cascade Rule: Can only toggle modules that are enabled at system level
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
  Breadcrumbs,
  Link,
} from '@mui/material';
import { useOrgModuleConfig } from '@{{PROJECT_NAME}}/module-mgmt';
import { useSession } from 'next-auth/react';

export default function OrgModuleConfigPage() {
  const { data: session } = useSession();
  const { modules, isLoading, error, updateConfig } = useOrgModuleConfig();
  
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Filter to modules that are configurable at org level
  // Rule: Only show modules where systemEnabled = true
  const configurableModules = useMemo(() => {
    return modules.filter(m => m.systemEnabled && m.systemInstalled);
  }, [modules]);

  // Handle module toggle
  const handleToggle = async (moduleName: string, currentEnabled: boolean) => {
    setUpdating(moduleName);
    setUpdateError(null);

    try {
      const success = await updateConfig(moduleName, {
        isEnabled: !currentEnabled,
        configOverrides: {},
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
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link href="/admin/org" underline="hover" color="inherit">
            Org Admin
          </Link>
          <Typography color="text.primary">Modules</Typography>
        </Breadcrumbs>

        <Alert severity="info">
          No modules are available for configuration. Modules must be enabled at the system level before they can be configured at the organization level.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link href="/admin/org" underline="hover" color="inherit">
          Org Admin
        </Link>
        <Typography color="text.primary">Modules</Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Typography variant="h4" gutterBottom>
        Module Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enable or disable modules for your organization. Changes apply to new workspaces and can be overridden at the workspace level.
      </Typography>

      {updateError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUpdateError(null)}>
          {updateError}
        </Alert>
      )}

      {/* Module Cards */}
      <Grid container spacing={2}>
        {configurableModules.map((module: any) => {
          const isEnabled = module.orgEnabled !== null ? module.orgEnabled : module.systemEnabled;
          const isUpdating = updating === module.moduleName;
          const hasOrgOverride = module.orgEnabled !== null;

          return (
            <Grid item xs={12} key={module.moduleName}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="h6">
                          {module.displayName}
                        </Typography>
                        <Chip
                          label={module.moduleType === 'core' ? 'Core' : 'Functional'}
                          size="small"
                          color={module.moduleType === 'core' ? 'primary' : 'default'}
                        />
                        {hasOrgOverride && (
                          <Chip
                            label="Org Override"
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        )}
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {module.moduleName}
                      </Typography>

                      <Box display="flex" gap={1} flexWrap="wrap">
                        <Chip
                          label={`System: ${module.systemEnabled ? 'Enabled' : 'Disabled'}`}
                          size="small"
                          color={module.systemEnabled ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </Box>
                    </Box>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={isEnabled}
                          onChange={() => handleToggle(module.moduleName, isEnabled)}
                          disabled={isUpdating}
                          color="primary"
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

      {/* Info Alert */}
      <Alert severity="info">
        <Typography variant="body2">
          <strong>Note:</strong> Modules can only be configured at the organization level if they are enabled at the system level. Changes made here will affect all new workspaces created in your organization. Existing workspaces may need to be updated individually to reflect these changes.
        </Typography>
      </Alert>

      {/* Workspace Override Info */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>Workspace Overrides:</strong> Workspace administrators can further customize module availability for their specific workspace, but they cannot enable modules that are disabled at the organization level.
        </Typography>
      </Alert>
    </Box>
  );
}