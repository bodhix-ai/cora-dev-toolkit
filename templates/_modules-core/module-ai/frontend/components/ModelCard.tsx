"use client";

import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Stack,
  Tooltip,
} from "@mui/material";
import { Memory as MemoryIcon } from "@mui/icons-material";
import { DeploymentInfo } from "../hooks/useAIConfig";

interface ModelCardProps {
  model: DeploymentInfo;
  onSelect: (modelId: string) => void;
}

export function ModelCard({ model, onSelect }: ModelCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "success";
      case "testing":
        return "warning";
      case "deprecated":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Tooltip
      title={model.description || "No description available"}
      placement="top"
    >
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <MemoryIcon color="primary" />
              <Box>
                <Typography variant="h6">{model.model_name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {model.provider}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block" }}
                >
                  {model.modelId}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                label={model.deployment_status}
                color={getStatusColor(model.deployment_status)}
                size="small"
              />
            </Box>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
            {model.supports_chat && (
              <Chip label="Chat" size="small" variant="outlined" />
            )}
            {model.supports_embeddings && (
              <Chip label="Embedding" size="small" variant="outlined" />
            )}
            {model.supports_embeddings &&
              model.capabilities?.embedding_dimensions && (
                <Chip
                  label={`${model.capabilities.embedding_dimensions} dims`}
                  size="small"
                  variant="outlined"
                />
              )}
          </Stack>

          <Button
            variant="contained"
            fullWidth
            onClick={() => onSelect(model.id)}
          >
            Select
          </Button>
        </CardContent>
      </Card>
    </Tooltip>
  );
}
