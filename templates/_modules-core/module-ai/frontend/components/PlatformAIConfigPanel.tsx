"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Typography,
} from "@mui/material";
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";
import {
  usePlatformAIConfig,
  useDeployments,
  type PlatformAIConfig,
} from "../hooks/useAIConfig";
import { ModelSelectionModal } from "./ModelSelectionModal";

interface PlatformAIConfigPanelProps {
  authAdapter: CoraAuthAdapter;
}

export const PlatformAIConfigPanel: React.FC<PlatformAIConfigPanelProps> = ({
  authAdapter,
}) => {
  const {
    config,
    isLoading: configLoading,
    error: configError,
    updateConfig,
  } = usePlatformAIConfig(authAdapter);

  const {
    deployments,
    isLoading: deploymentsLoading,
    error: deploymentsError,
  } = useDeployments(authAdapter);

  const [localConfig, setLocalConfig] = useState<PlatformAIConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isChatModalOpen, setChatModalOpen] = useState(false);
  const [isEmbeddingModalOpen, setEmbeddingModalOpen] = useState(false);

  // Sync local state with fetched config
  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleSave = async () => {
    if (!localConfig) return;
    setSaving(true);
    try {
      // Filter out null values to match expected type
      const configToSave = {
        defaultEmbeddingModelId:
          localConfig.defaultEmbeddingModelId || undefined,
        defaultChatModelId: localConfig.defaultChatModelId || undefined,
        systemPrompt: localConfig.systemPrompt || undefined,
      };
      await updateConfig(configToSave);
      setSuccess(true);
    } catch (err) {
      console.error("Failed to save configuration:", err);
    }
    setSaving(false);
  };

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | SelectChangeEvent<string>
  ) => {
    if (localConfig && e.target.name) {
      setLocalConfig({
        ...localConfig,
        [e.target.name]: e.target.value,
      });
    }
  };

  const loading = configLoading || deploymentsLoading;
  const error = configError || deploymentsError;

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const chatModels = deployments?.filter((d) => d.supports_chat) || [];
  const embeddingModels =
    deployments?.filter((d) => d.supports_embeddings) || [];

  const selectedChatModel = chatModels.find(
    (m) => m.id === localConfig?.defaultChatModelId
  );
  const selectedEmbeddingModel = embeddingModels.find(
    (m) => m.id === localConfig?.defaultEmbeddingModelId
  );

  return (
    <>
      <Card>
        <CardHeader
          title="Default AI Model Configuration"
          subheader="Set the default chat and embedding models for the platform."
        />
        <CardContent>
          <Box
            component="form"
            noValidate
            autoComplete="off"
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            <Box>
              <Button variant="outlined" onClick={() => setChatModalOpen(true)}>
                Select Default Chat Model
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {selectedChatModel
                  ? `${selectedChatModel.model_name} (${selectedChatModel.provider})`
                  : "None selected"}
              </Typography>
            </Box>

            <Box>
              <Button
                variant="outlined"
                onClick={() => setEmbeddingModalOpen(true)}
              >
                Select Default Embedding Model
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {selectedEmbeddingModel
                  ? `${selectedEmbeddingModel.model_name} (${selectedEmbeddingModel.provider})`
                  : "None selected"}
              </Typography>
            </Box>

            <TextField
              id="systemPrompt"
              name="systemPrompt"
              label="System Prompt"
              multiline
              rows={4}
              value={localConfig?.systemPrompt || ""}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              helperText="The global system prompt to guide AI behavior across the platform."
            />

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <CircularProgress size={24} /> : "Save Configuration"}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
        message="Configuration saved successfully"
      />
      <ModelSelectionModal
        open={isChatModalOpen}
        onClose={() => setChatModalOpen(false)}
        models={chatModels}
        onSelectModel={(modelId) => {
          if (localConfig) {
            setLocalConfig({ ...localConfig, defaultChatModelId: modelId });
          }
          setChatModalOpen(false);
        }}
        title="Select Default Chat Model"
      />
      <ModelSelectionModal
        open={isEmbeddingModalOpen}
        onClose={() => setEmbeddingModalOpen(false)}
        models={embeddingModels}
        onSelectModel={(modelId) => {
          if (localConfig) {
            setLocalConfig({
              ...localConfig,
              defaultEmbeddingModelId: modelId,
            });
          }
          setEmbeddingModalOpen(false);
        }}
        title="Select Default Embedding Model"
      />
    </>
  );
};
