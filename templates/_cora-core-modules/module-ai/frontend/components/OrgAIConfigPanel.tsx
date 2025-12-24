"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@mui/material";
import {
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { useOrgAIConfig } from "../hooks/useAIConfig";
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";

interface OrgAIConfigPanelProps {
  organizationId: string;
  authAdapter: CoraAuthAdapter;
}

export default function OrgAIConfigPanel({
  organizationId,
  authAdapter,
}: OrgAIConfigPanelProps) {
  const { config, isLoading, error, updateConfig } = useOrgAIConfig(
    authAdapter,
    organizationId
  );

  // Local state for form
  const [orgSystemPrompt, setOrgSystemPrompt] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  // Initialize form when config loads
  useEffect(() => {
    if (config) {
      setOrgSystemPrompt(config.org_system_prompt || "");
    }
  }, [config]);

  // Track changes
  useEffect(() => {
    if (!config) return;

    const changed = orgSystemPrompt !== (config.org_system_prompt || "");
    setHasChanges(changed);
  }, [config, orgSystemPrompt]);

  const handleSave = async () => {
    if (!hasChanges) return;

    try {
      setIsSaving(true);

      await updateConfig({
        org_system_prompt: orgSystemPrompt.trim() || null,
      });

      setNotification({
        open: true,
        message: "Organization AI configuration saved successfully!",
        severity: "success",
      });
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save org AI config:", error);
      setNotification({
        open: true,
        message:
          error instanceof Error
            ? error.message
            : "Failed to save configuration",
        severity: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setOrgSystemPrompt("");
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!config) {
    return (
      <Alert severity="error">
        Configuration not available. Please try refreshing the page.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        AI Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Customize AI behavior for your organization by adding an optional system
        prompt that extends the platform defaults.
      </Typography>

      {/* Platform Configuration (Read-Only) */}
      <Accordion defaultExpanded sx={{ mb: 3 }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          data-testid="platform-config-accordion"
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <InfoIcon fontSize="small" color="primary" />
            <Typography variant="subtitle1">Platform Configuration</Typography>
            <Chip label="Inherited" size="small" color="primary" />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Chat Model
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {config.platform_config.chat_deployment
                ? `${config.platform_config.chat_deployment.provider} - ${config.platform_config.chat_deployment.model_name} (${config.platform_config.chat_deployment.deployment_name})`
                : config.platform_config.default_chat_deployment_id}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Embedding Model
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {config.platform_config.embedding_deployment
                ? `${config.platform_config.embedding_deployment.provider} - ${config.platform_config.embedding_deployment.model_name} (${config.platform_config.embedding_deployment.deployment_name})`
                : config.platform_config.default_embedding_deployment_id}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Platform System Prompt
            </Typography>
            <Card variant="outlined" sx={{ bgcolor: "grey.50" }}>
              <CardContent>
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                  }}
                >
                  {config.platform_config.system_prompt}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Organization System Prompt */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Organization System Prompt (Optional)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add organization-specific instructions that will be appended to the
            platform system prompt. This allows you to customize AI behavior for
            your organization's specific needs without affecting the base
            configuration.
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={8}
            value={orgSystemPrompt}
            onChange={(
              e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
            ) => setOrgSystemPrompt(e.target.value)}
            label="Organization System Prompt"
            placeholder="Add organization-specific instructions here..."
            data-testid="org-system-prompt-input"
            helperText={`${orgSystemPrompt.length} characters${orgSystemPrompt ? " - This will be appended to the platform prompt" : ""}`}
          />

          {orgSystemPrompt && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="text"
                size="small"
                onClick={handleClear}
                disabled={isSaving}
              >
                Clear Organization Prompt
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Combined Prompt Preview */}
      {config.combined_prompt && (
        <Accordion sx={{ mb: 3 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            data-testid="combined-prompt-accordion"
          >
            <Typography variant="subtitle1">Combined Prompt Preview</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Alert severity="info" sx={{ mb: 2 }}>
              This is the complete system prompt that will be sent to the AI,
              combining both platform and organization prompts.
            </Alert>
            <Card variant="outlined" sx={{ bgcolor: "grey.50" }}>
              <CardContent>
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                  }}
                >
                  {config.combined_prompt}
                </Typography>
              </CardContent>
            </Card>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Save Button */}
      {hasChanges && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              if (config) {
                setOrgSystemPrompt(config.org_system_prompt || "");
              }
            }}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            size="large"
            data-testid="save-org-config-button"
          >
            {isSaving ? "Saving..." : "Save Configuration"}
          </Button>
        </Box>
      )}

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
