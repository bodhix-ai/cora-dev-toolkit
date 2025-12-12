"use client";

import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  Stack,
} from "@mui/material";
import {
  PlayArrow as PlayIcon,
  Memory as MemoryIcon,
} from "@mui/icons-material";
import { AIModel } from "../../types";

interface ModelCardProps {
  model: AIModel;
  onTest?: (model: AIModel) => void;
}

export function ModelCard({ model, onTest }: ModelCardProps) {
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

  const formatCost = (cost: number | null) => {
    if (cost === null) return "N/A";
    return `$${cost.toFixed(4)}`;
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <MemoryIcon color="primary" />
            <Box>
              <Typography variant="h6">
                {model.displayName || model.modelId}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {model.modelId}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={model.status}
              color={getStatusColor(model.status)}
              size="small"
            />
            {onTest && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<PlayIcon />}
                onClick={() => onTest(model)}
              >
                Test
              </Button>
            )}
          </Box>
        </Box>

        {model.capabilities && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Capabilities
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {model.capabilities.chat && (
                <Chip label="Chat" size="small" variant="outlined" />
              )}
              {model.capabilities.embedding && (
                <Chip label="Embedding" size="small" variant="outlined" />
              )}
              {model.capabilities.supportsStreaming && (
                <Chip label="Streaming" size="small" variant="outlined" />
              )}
              {model.capabilities.supportsVision && (
                <Chip label="Vision" size="small" variant="outlined" />
              )}
              {model.capabilities.maxTokens && (
                <Chip
                  label={`Max: ${model.capabilities.maxTokens} tokens`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 4 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Input Cost (per 1K tokens)
            </Typography>
            <Typography variant="body2">
              {formatCost(model.costPer1kTokensInput)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Output Cost (per 1K tokens)
            </Typography>
            <Typography variant="body2">
              {formatCost(model.costPer1kTokensOutput)}
            </Typography>
          </Box>
        </Box>

        {model.lastDiscoveredAt && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 2, display: "block" }}
          >
            Last discovered: {new Date(model.lastDiscoveredAt).toLocaleString()}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
