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
import { DeploymentInfo } from "../types/ai-models";

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
                <Typography variant="h6">{model.modelName}</Typography>
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
                label={model.deploymentStatus}
                color={getStatusColor(model.deploymentStatus)}
                size="small"
              />
            </Box>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
            {model.supportsChat && (
              <Chip label="Chat" size="small" variant="outlined" />
            )}
            {model.supportsEmbeddings && (
              <Chip label="Embedding" size="small" variant="outlined" />
            )}
            {model.supportsEmbeddings && model.capabilities?.embeddingDimensions ? (
              <Chip
                label={`${model.capabilities.embeddingDimensions} dims`}
                size="small"
                variant="outlined"
              />
            ) : null}
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
