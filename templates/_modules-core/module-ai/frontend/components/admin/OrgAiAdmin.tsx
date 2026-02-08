'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  TextField,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { useUser, useRole, useOrganizationContext } from '@{{PROJECT_NAME}}/module-access';
import { getOrgAdminConfig, updateOrgAdminConfig } from '../../lib/api';

/**
 * Organization AI Admin Component
 * Provides admin interface for managing AI configuration at the organization level.
 *
 * @component OrgAiAdmin
 * @routes
 * - GET /admin/org/ai/config - Get organization AI configuration
 * - PUT /admin/org/ai/config - Update organization AI configuration
 */

interface OrgAIConfig {
  orgId: string;
  orgSystemPrompt?: string | null;
  policyMissionType?: string | null;
  customSystemPrompt?: string | null;
  customContextPrompt?: string | null;
  citationStyle?: string | null;
  includePageNumbers?: boolean | null;
  includeSourceMetadata?: boolean | null;
  responseTone?: string | null;
  maxResponseLength?: number | null;
  platformConfig?: {
    systemPrompt?: string;
    defaultChatDeploymentId?: string;
    defaultEmbeddingDeploymentId?: string;
    chatDeployment?: any;
    embeddingDeployment?: any;
  };
  combinedPrompt?: string;
}

export const OrgAiAdmin = () => {
  const { profile, loading: userLoading, isAuthenticated, authAdapter } = useUser();
  const { isOrgAdmin } = useRole();
  const { currentOrganization } = useOrganizationContext();
  const [config, setConfig] = useState<OrgAIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [orgSystemPrompt, setOrgSystemPrompt] = useState('');

  // Check if user has permission to edit (org admins can edit)
  const canEdit = isOrgAdmin;

  // Fetch config when auth and org context are ready
  useEffect(() => {
    if (!userLoading && profile && authAdapter && currentOrganization?.orgId) {
      fetchConfig();
    }
  }, [userLoading, profile, authAdapter, currentOrganization?.orgId]);

  const fetchConfig = async () => {
    if (!authAdapter || !currentOrganization?.orgId) return;

    try {
      setLoading(true);
      setError(null);

      const token = await authAdapter.getToken();
      if (!token) {
        setError('Failed to get authentication token');
        return;
      }

      // Use helper function (orgId as query param)
      const data = await getOrgAdminConfig(token, currentOrganization.orgId);
      
      setConfig(data);
      setOrgSystemPrompt(data.orgSystemPrompt || '');
    } catch (err) {
      console.error('Error fetching config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      setError('You do not have permission to edit AI configuration');
      return;
    }

    if (!authAdapter || !currentOrganization?.orgId) {
      setError('No organization selected');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const token = await authAdapter.getToken();
      if (!token) {
        setError('Failed to get authentication token');
        return;
      }

      // Use helper function (orgId as query param)
      await updateOrgAdminConfig(token, currentOrganization.orgId, {
        orgSystemPrompt: orgSystemPrompt || null,
      });
      
      // Refresh config to get updated data
      await fetchConfig();
      setSuccessMessage('Configuration updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating config:', err);
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography color="text.secondary">Loading AI configuration...</Typography>
        </Box>
      </Box>
    );
  }

  // Authentication check
  if (!isAuthenticated || !profile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography color="error">You must be logged in to access this page.</Typography>
        </Box>
      </Box>
    );
  }

  // Authorization check - org admins only
  if (!isOrgAdmin) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography color="error">You do not have permission to access this page.</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Organization admin role required.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{ mb: 2 }}
      >
        <Link
          underline="hover"
          color="inherit"
          href="/admin/org"
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          Org Admin
        </Link>
        <Typography color="text.primary">AI Configuration</Typography>
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom>
        Organization AI Configuration
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Customize AI behavior for your organization
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {/* Platform Defaults Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Platform Defaults
          </Typography>
          {config?.platformConfig && (
            config.platformConfig.chatDeployment || 
            config.platformConfig.embeddingDeployment || 
            config.platformConfig.systemPrompt
          ) ? (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {config.platformConfig.chatDeployment && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Default Chat Model
                  </Typography>
                  <Typography variant="body2">
                    {config.platformConfig.chatDeployment.modelName || 
                     config.platformConfig.chatDeployment.modelId}
                  </Typography>
                </Box>
              )}

              {config.platformConfig.embeddingDeployment && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Default Embedding Model
                  </Typography>
                  <Typography variant="body2">
                    {config.platformConfig.embeddingDeployment.modelName || 
                     config.platformConfig.embeddingDeployment.modelId}
                  </Typography>
                </Box>
              )}

              {config.platformConfig.systemPrompt && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Platform System Prompt
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                    {config.platformConfig.systemPrompt}
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              No platform defaults configured. Contact your system administrator to set up AI models and system prompts.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Organization-Specific Configuration */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Organization Configuration
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <TextField
              label="Organization System Prompt"
              multiline
              rows={8}
              fullWidth
              value={orgSystemPrompt}
              onChange={(e) => setOrgSystemPrompt(e.target.value)}
              disabled={!canEdit}
              placeholder="Add organization-specific instructions (optional)"
              helperText="This prompt will be appended to the platform system prompt for all AI interactions in your organization."
            />

            {config?.combinedPrompt && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Combined Prompt Preview
                </Typography>
                <Box
                  sx={{
                    bgcolor: 'grey.100',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                    maxHeight: '300px',
                    overflow: 'auto',
                  }}
                >
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.75rem' }}
                  >
                    {config.combinedPrompt}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {canEdit ? (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setOrgSystemPrompt(config?.orgSystemPrompt || '');
                  setError(null);
                }}
                disabled={saving}
              >
                Reset
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Note:</strong> Only organization owners can modify AI configuration.
                Contact your organization owner to request changes.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
