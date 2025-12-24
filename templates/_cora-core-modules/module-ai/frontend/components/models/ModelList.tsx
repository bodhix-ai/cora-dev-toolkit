"use client";

import {
  Box,
  Button,
  Stack,
  Typography,
  Alert,
  Skeleton,
  Chip,
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import { useState } from "react";
import { useModels } from "../../hooks/useModels";
import { ModelCard } from "./ModelCard";
import { TestModelDialog } from "./TestModelDialog";
import { AIModel, TestModelInput } from "../../types";
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";

interface ModelListProps {
  providerId: string;
  providerName: string;
  authAdapter: CoraAuthAdapter;
}

export function ModelList({
  providerId,
  providerName,
  authAdapter,
}: ModelListProps) {
  const { models, loading, error, discovering, discoverModels, testModel } =
    useModels(authAdapter, providerId);
  const [testingModel, setTestingModel] = useState<AIModel | null>(null);

  const handleDiscover = async () => {
    await discoverModels(providerId);
  };

  const handleTest = async (data: TestModelInput) => {
    if (!testingModel) return null;
    const result = await testModel(testingModel.id, data);
    if (result) {
      setTestingModel(null);
    }
    return result;
  };

  if (loading && models.length === 0) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rectangular" height={120} />
        <Skeleton variant="rectangular" height={120} />
        <Skeleton variant="rectangular" height={120} />
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (models.length === 0) {
    return (
      <Box
        sx={{
          textAlign: "center",
          py: 8,
          px: 2,
        }}
      >
        <Typography variant="h6" gutterBottom>
          No Models Discovered
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Discover models from {providerName} to get started
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={handleDiscover}
          disabled={discovering}
        >
          {discovering ? "Discovering..." : "Discover Models"}
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5">Models</Typography>
          <Typography variant="body2" color="text.secondary">
            {providerName}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleDiscover}
          disabled={discovering}
        >
          {discovering ? "Discovering..." : "Refresh Models"}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {discovering && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Discovering models from {providerName}...
        </Alert>
      )}

      <Stack spacing={2}>
        {models.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            onTest={(m) => setTestingModel(m)}
          />
        ))}
      </Stack>

      {testingModel && (
        <TestModelDialog
          open={!!testingModel}
          model={testingModel}
          onTest={handleTest}
          onClose={() => setTestingModel(null)}
        />
      )}
    </Box>
  );
}
