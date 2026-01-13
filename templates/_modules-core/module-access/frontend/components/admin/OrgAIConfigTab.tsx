"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
  Paper,
} from "@mui/material";
import { Save, Settings } from "@mui/icons-material";
import { CoraAuthAdapter, createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";

/**
 * Org AI Configuration type
 */
interface OrgAIConfig {
  org_id: string;
  custom_system_prompt?: string;
  default_chat_model?: string;
  default_embedding_model?: string;
  updated_at?: string;
}

interface OrgAIConfigTabProps {
  orgId: string;
  authAdapter: CoraAuthAdapter;
}

/**
 * Organization AI Configuration Tab
 * 
 * Manages organization-specific AI settings (system admin only).
 * Allows system admins to override default AI settings for an organization.
 */
export function OrgAIConfigTab({ orgId, authAdapter }: OrgAIConfigTabProps) {
  const [config, setConfig] = useState<OrgAIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    custom_system_prompt: "",
    default_chat_model: "",
    default_embedding_model: "",
  });

  useEffect(() => {
    fetchConfig();
  }, [orgId]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await authAdapter.getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }
      const apiClient = createCoraAuthenticatedClient(token);
      const response = await apiClient.get<{ success: boolean; data: OrgAIConfig }>(`/orgs/${orgId}/ai/config`);
      if (response.success) {
        const data = response.data || {};
        setConfig(data);
        setFormData({
          custom_system_prompt: data.custom_system_prompt || "",
          default_chat_model: data.default_chat_model || "",
          default_embedding_model: data.default_embedding_model || "",
        });
      } else {
        setError("Failed to load AI configuration");
      }
    } catch (err) {
      setError("Failed to load AI configuration");
      console.error("Error fetching AI config:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      const token = await authAdapter.getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }
      const apiClient = createCoraAuthenticatedClient(token);
      const response = await apiClient.put<{ success: boolean; data: OrgAIConfig }>(`/orgs/${orgId}/ai/config`, {
        custom_system_prompt: formData.custom_system_prompt || null,
        default_chat_model: formData.default_chat_model || null,
        default_embedding_model: formData.default_embedding_model || null,
      });

      if (response.success) {
        setSuccessMessage("AI configuration saved successfully");
        fetchConfig();
      } else {
        setError("Failed to save AI configuration");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save AI configuration");
      console.error("Error saving AI config:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Organization AI Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure organization-specific AI settings. These settings override platform defaults for this organization.
      </Typography>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <AlertTitle>System Admin Only</AlertTitle>
        This configuration is only accessible to system administrators. Organization owners and admins cannot modify these settings.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Box
          component="form"
          onSubmit={handleSave}
          sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
          <TextField
            fullWidth
            label="Custom System Prompt"
            value={formData.custom_system_prompt}
            onChange={(e) =>
              setFormData({ ...formData, custom_system_prompt: e.target.value })
            }
            placeholder="Enter organization-specific system prompt..."
            multiline
            rows={6}
            helperText="Override the system default system prompt for this organization"
          />

          <TextField
            fullWidth
            label="Default Chat Model"
            value={formData.default_chat_model}
            onChange={(e) =>
              setFormData({ ...formData, default_chat_model: e.target.value })
            }
            placeholder="e.g., gpt-4, claude-3-opus"
            helperText="Override the system default chat model for this organization"
          />

          <TextField
            fullWidth
            label="Default Embedding Model"
            value={formData.default_embedding_model}
            onChange={(e) =>
              setFormData({
                ...formData,
                default_embedding_model: e.target.value,
              })
            }
            placeholder="e.g., text-embedding-ada-002"
            helperText="Override the system default embedding model for this organization"
          />

          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              onClick={() => {
                setFormData({
                  custom_system_prompt: config?.custom_system_prompt || "",
                  default_chat_model: config?.default_chat_model || "",
                  default_embedding_model: config?.default_embedding_model || "",
                });
                setError(null);
                setSuccessMessage(null);
              }}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
              disabled={saving}
            >
              {saving && <CircularProgress size={16} sx={{ mr: 1 }} />}
              Save Configuration
            </Button>
          </Box>
        </Box>
      </Paper>

      {config?.updated_at && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Last updated: {new Date(config.updated_at).toLocaleString()}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
