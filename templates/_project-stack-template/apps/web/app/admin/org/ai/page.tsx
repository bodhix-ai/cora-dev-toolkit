'use client';

import { useState, useEffect } from 'react';
import { useUser, useRole } from '@{{PROJECT_NAME}}/module-access';

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

export default function OrgAIAdminPage() {
  const { profile, loading: userLoading, isAuthenticated } = useUser();
  const { isOrgAdmin } = useRole();
  const [config, setConfig] = useState<OrgAIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [orgSystemPrompt, setOrgSystemPrompt] = useState('');

  // Check if user has permission to edit (org_owner only)
  // Note: This page allows org_admin to view, but only org_owner to edit
  const canEdit = profile?.role === 'org_owner';

  useEffect(() => {
    if (!userLoading && profile) {
      fetchConfig();
    }
  }, [userLoading, profile]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/org/ai/config', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch configuration: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setConfig(data.data);
        setOrgSystemPrompt(data.data.orgSystemPrompt || '');
      } else {
        throw new Error(data.error || 'Failed to load configuration');
      }
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

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/admin/org/ai/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgSystemPrompt: orgSystemPrompt || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update configuration: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setConfig(data.data);
        setSuccessMessage('Configuration updated successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(data.error || 'Failed to update configuration');
      }
    } catch (err) {
      console.error('Error updating config:', err);
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading AI configuration...</p>
        </div>
      </div>
    );
  }

  // Authentication check (Pattern A - ADR-015)
  if (!isAuthenticated || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive">You must be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  // Authorization check - org admins only (revised ADR-016)
  if (!isOrgAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive">You do not have permission to access this page.</p>
          <p className="text-sm text-muted-foreground mt-2">Organization admin role required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization AI Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Customize AI behavior for your organization
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {/* Platform Defaults Section */}
      <div className="bg-muted/50 border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Platform Defaults</h2>
        <div className="space-y-4">
          {config?.platformConfig?.chatDeployment && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Default Chat Model
              </label>
              <p className="text-sm mt-1">
                {config.platformConfig.chatDeployment.modelName || 
                 config.platformConfig.chatDeployment.modelId}
              </p>
            </div>
          )}

          {config?.platformConfig?.embeddingDeployment && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Default Embedding Model
              </label>
              <p className="text-sm mt-1">
                {config.platformConfig.embeddingDeployment.modelName || 
                 config.platformConfig.embeddingDeployment.modelId}
              </p>
            </div>
          )}

          {config?.platformConfig?.systemPrompt && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Platform System Prompt
              </label>
              <p className="text-sm mt-1 whitespace-pre-wrap">
                {config.platformConfig.systemPrompt}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Organization-Specific Configuration */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Organization Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="orgSystemPrompt" className="block text-sm font-medium mb-2">
              Organization System Prompt
              {!canEdit && (
                <span className="ml-2 text-xs text-muted-foreground">(Read-only)</span>
              )}
            </label>
            <textarea
              id="orgSystemPrompt"
              value={orgSystemPrompt}
              onChange={(e) => setOrgSystemPrompt(e.target.value)}
              disabled={!canEdit}
              className="w-full min-h-[200px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:cursor-not-allowed"
              placeholder="Add organization-specific instructions (optional)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This prompt will be appended to the platform system prompt for all AI interactions in your organization.
            </p>
          </div>

          {config?.combinedPrompt && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Combined Prompt Preview
              </label>
              <div className="bg-muted/50 border rounded p-3 max-h-[300px] overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap">{config.combinedPrompt}</pre>
              </div>
            </div>
          )}
        </div>

        {canEdit && (
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                setOrgSystemPrompt(config?.orgSystemPrompt || '');
                setError(null);
              }}
              disabled={saving}
              className="px-4 py-2 border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {!canEdit && (
          <div className="mt-6 p-4 bg-muted/50 border rounded">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Only organization owners can modify AI configuration.
              Contact your organization owner to request changes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}