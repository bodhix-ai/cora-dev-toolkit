"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Stack,
} from "@mui/material";
import { CoraAuthAdapter } from "@ai-sec/api-client";
import { useModels } from "../../hooks/useModels";
import { ModelCard } from "../models/ModelCard";
import { TestModelDialog } from "../models/TestModelDialog";
import { AIModel, TestModelInput } from "../../types";

interface ModelsTabProps {
  authAdapter: CoraAuthAdapter;
}

export function ModelsTab({ authAdapter }: ModelsTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [testingModel, setTestingModel] = useState<AIModel | null>(null);

  const { models, loading, error, testModel } = useModels(authAdapter);

  const handleFilterChange = (event: SelectChangeEvent<string>) => {
    setStatusFilter(event.target.value);
  };

  const handleTest = async (data: TestModelInput) => {
    if (!testingModel) return null;
    const result = await testModel(testingModel.id, data);
    if (result) {
      setTestingModel(null);
    }
    return result;
  };

  const filteredModels =
    statusFilter === "all"
      ? models
      : models.filter((model) => {
          if (statusFilter === "untested") return model.status === "discovered";
          if (statusFilter === "error") return model.status === "unavailable"; // Simplified mapping
          return model.status === statusFilter;
        });

  return (
    <Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        View and validate all AI models across providers. Models are discovered
        from providers and validated to ensure they are available for use.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="status-filter-label">Filter by Status</InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            value={statusFilter}
            label="Filter by Status"
            onChange={handleFilterChange}
          >
            <MenuItem value="all">All Models</MenuItem>
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="unavailable">Unavailable</MenuItem>
            <MenuItem value="untested">Untested (Discovered)</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {loading && !models.length ? (
        <Typography>Loading models...</Typography>
      ) : filteredModels.length === 0 ? (
        <Alert severity="info">
          {statusFilter === "all"
            ? "No models found. Add a provider and discover models to get started."
            : `No ${statusFilter} models found.`}
        </Alert>
      ) : (
        <Stack spacing={2}>
          {filteredModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onTest={(m) => setTestingModel(m)}
            />
          ))}
        </Stack>
      )}

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
