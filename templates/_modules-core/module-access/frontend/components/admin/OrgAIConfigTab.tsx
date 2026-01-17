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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
} from "@mui/material";
import { Save, Info } from "@mui/icons-material";
import { CoraAuthAdapter, createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";

/**
 * Org AI Configuration type (matches API response)
 */
interface OrgAIConfig {
  orgId: string;
  policyMissionType?: string;
  customSystemPrompt?: string;
  customContextPrompt?: string;
  citationStyle?: string;
  includePageNumbers?: boolean;
  includeSourceMetadata?: boolean;
  responseTone?: string;
  maxResponseLength?: string;
  orgSystemPrompt?: string;
  platformConfig?: {
    systemPrompt?: string;
    defaultChatDeploymentId?: string;
    defaultEmbeddingDeploymentId?: string;
    chatDeployment?: {
      modelName?: string;
    };
    embeddingDeployment?: {
      modelName?: string;
    };
  };
  combinedPrompt?: string;
  updatedAt?: string;
}

interface OrgAIConfigTabProps {
  orgId: string;
  authAdapter: CoraAuthAdapter;
}

/**
 * Organization AI Configuration Tab
 * 
 * Manages organization-specific prompt engineering configuration (system admin only).
 * Model selection is platform-level only and cannot be overridden per-org.
 */
export function OrgAIConfigTab({ orgId, authAdapter }: OrgAIConfigTabProps) {
  const [config, setConfig] = useState<OrgAIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    policyMissionType: "",
    customSystemPrompt: "",
    customContextPrompt: "",
    citationStyle: "inline",
    includePageNumbers: true,
    includeSourceMetadata: true,
    responseTone: "",
    maxResponseLength: "",
    orgSystemPrompt: "",
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

      if (response.success && response.data) {
        setConfig(response.data);
        setFormData({
          policyMissionType: response.data.policyMissionType || "",
          customSystemPrompt: response.data.customSystemPrompt || "",
          customContextPrompt: response.data.customContextPrompt || "",
          citationStyle: response.data.citationStyle || "inline",
          includePageNumbers: response.data.includePageNumbers !== undefined ? response.data.includePageNumbers : true,
          includeSourceMetadata: response.data.includeSourceMetadata !== undefined ? response.data.includeSourceMetadata : true,
          responseTone: response.data.responseTone || "",
          maxResponseLength: response.data.maxResponseLength || "",
          orgSystemPrompt: response.data.orgSystemPrompt || "",
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
      
      // Send all prompt engineering fields
      const response = await apiClient.put<{ success: boolean } & OrgAIConfig>(`/orgs/${orgId}/ai/config`, {
        policyMissionType: formData.policyMissionType || null,
        customSystemPrompt: formData.customSystemPrompt || null,
        customContextPrompt: formData.customContextPrompt || null,
        citationStyle: formData.citationStyle,
        includePageNumbers: formData.includePageNumbers,
        includeSourceMetadata: formData.includeSourceMetadata,
        responseTone: formData.responseTone || null,
        maxResponseLength: formData.maxResponseLength || null,
        orgSystemPrompt: formData.orgSystemPrompt || null,
      });

      if (response.success) {
        setSuccessMessage("AI configuration saved successfully");
        // Refresh to get latest data
        await fetchConfig();
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
        Organization Prompt Engineering Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure organization-specific prompt engineering settings. These settings control how AI responses are generated for this organization.
      </Typography>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <AlertTitle>System Admin Only</AlertTitle>
        This configuration is only accessible to system administrators. Model selection is managed at the platform level.
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

      {/* Platform Settings (Read-Only) */}
      {config?.platformConfig && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3, bgcolor: "grey.50" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Info fontSize="small" color="info" />
            <Typography variant="subtitle2" color="text.secondary">
              Platform Settings (Read-Only)
            </Typography>
          </Box>
          
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {config.platformConfig.chatDeployment?.modelName && (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Chat Model
                </Typography>
                <Chip 
                  label={config.platformConfig.chatDeployment.modelName} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              </Box>
            )}
            
            {config.platformConfig.embeddingDeployment?.modelName && (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Embedding Model
                </Typography>
                <Chip 
                  label={config.platformConfig.embeddingDeployment.modelName} 
                  size="small" 
                  color="secondary" 
                  variant="outlined"
                />
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* Organization Prompt Engineering Settings (Editable) */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Box
          component="form"
          onSubmit={handleSave}
          sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
          {/* Mission Type */}
          <FormControl fullWidth>
            <InputLabel>Policy Mission Type</InputLabel>
            <Select
              value={formData.policyMissionType}
              label="Policy Mission Type"
              onChange={(e) =>
                setFormData({ ...formData, policyMissionType: e.target.value })
              }
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              <MenuItem value="research">Research</MenuItem>
              <MenuItem value="compliance">Compliance</MenuItem>
              <MenuItem value="education">Education</MenuItem>
              <MenuItem value="general">General</MenuItem>
            </Select>
          </FormControl>

          <Divider />

          {/* Prompt Configuration */}
          <Typography variant="subtitle2" color="text.secondary">
            Prompt Configuration
          </Typography>

          <TextField
            fullWidth
            label="Organization System Prompt"
            value={formData.orgSystemPrompt}
            onChange={(e) =>
              setFormData({ ...formData, orgSystemPrompt: e.target.value })
            }
            placeholder="Enter organization-specific system prompt..."
            multiline
            rows={4}
            helperText="This prompt will be appended to the platform default system prompt"
            aria-label="Organization System Prompt"
          />

          <TextField
            fullWidth
            label="Custom System Prompt"
            value={formData.customSystemPrompt}
            onChange={(e) =>
              setFormData({ ...formData, customSystemPrompt: e.target.value })
            }
            placeholder="Enter custom system prompt..."
            multiline
            rows={4}
            helperText="Additional system-level instructions for AI responses"
            aria-label="Custom System Prompt"
          />

          <TextField
            fullWidth
            label="Custom Context Prompt"
            value={formData.customContextPrompt}
            onChange={(e) =>
              setFormData({ ...formData, customContextPrompt: e.target.value })
            }
            placeholder="Enter custom context prompt..."
            multiline
            rows={4}
            helperText="Context-specific instructions for AI responses"
          />

          <Divider />

          {/* Citation Configuration */}
          <Typography variant="subtitle2" color="text.secondary">
            Citation Configuration
          </Typography>

          <FormControl fullWidth>
            <InputLabel>Citation Style</InputLabel>
            <Select
              value={formData.citationStyle}
              label="Citation Style"
              onChange={(e) =>
                setFormData({ ...formData, citationStyle: e.target.value })
              }
            >
              <MenuItem value="inline">Inline</MenuItem>
              <MenuItem value="footnote">Footnote</MenuItem>
              <MenuItem value="endnote">Endnote</MenuItem>
              <MenuItem value="none">None</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.includePageNumbers}
                  onChange={(e) =>
                    setFormData({ ...formData, includePageNumbers: e.target.checked })
                  }
                  inputProps={{ 'aria-label': 'Include Page Numbers in Citations' }}
                />
              }
              label="Include Page Numbers in Citations"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.includeSourceMetadata}
                  onChange={(e) =>
                    setFormData({ ...formData, includeSourceMetadata: e.target.checked })
                  }
                  inputProps={{ 'aria-label': 'Include Source Metadata in Citations' }}
                />
              }
              label="Include Source Metadata in Citations"
            />
          </Box>

          <Divider />

          {/* Response Configuration */}
          <Typography variant="subtitle2" color="text.secondary">
            Response Configuration
          </Typography>

          <FormControl fullWidth>
            <InputLabel>Response Tone</InputLabel>
            <Select
              value={formData.responseTone}
              label="Response Tone"
              onChange={(e) =>
                setFormData({ ...formData, responseTone: e.target.value })
              }
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              <MenuItem value="professional">Professional</MenuItem>
              <MenuItem value="casual">Casual</MenuItem>
              <MenuItem value="technical">Technical</MenuItem>
              <MenuItem value="simple">Simple</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Max Response Length</InputLabel>
            <Select
              value={formData.maxResponseLength}
              label="Max Response Length"
              onChange={(e) =>
                setFormData({ ...formData, maxResponseLength: e.target.value })
              }
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              <MenuItem value="concise">Concise</MenuItem>
              <MenuItem value="moderate">Moderate</MenuItem>
              <MenuItem value="detailed">Detailed</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setFormData({
                  policyMissionType: config?.policyMissionType || "",
                  customSystemPrompt: config?.customSystemPrompt || "",
                  customContextPrompt: config?.customContextPrompt || "",
                  citationStyle: config?.citationStyle || "inline",
                  includePageNumbers: config?.includePageNumbers !== undefined ? config.includePageNumbers : true,
                  includeSourceMetadata: config?.includeSourceMetadata !== undefined ? config.includeSourceMetadata : true,
                  responseTone: config?.responseTone || "",
                  maxResponseLength: config?.maxResponseLength || "",
                  orgSystemPrompt: config?.orgSystemPrompt || "",
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

      {config?.updatedAt && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Last updated: {new Date(config.updatedAt).toLocaleString()}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
