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
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";
import { useModels } from "../../hooks/useModels";
import { ModelCard } from "../models/ModelCard";
import { TestModelDialog } from "../models/TestModelDialog";
import { ValidationCategory, AIModel, TestModelInput } from "../../types";

interface ModelsTabProps {
  authAdapter: CoraAuthAdapter;
}

export function ModelsTab({ authAdapter }: ModelsTabProps) {
  const [categoryFilter, setCategoryFilter] =
    useState<ValidationCategory | "all">("all");
  const [testingModel, setTestingModel] = useState<AIModel | null>(null);

  const { models, loading, error, testModel } = useModels(authAdapter);

  const handleCategoryChange = (event: SelectChangeEvent<string>) => {
    setCategoryFilter(event.target.value as ValidationCategory | "all");
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
    categoryFilter === "all"
      ? models
      : models.filter((model) => model.validation_status === categoryFilter);

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
          <InputLabel id="category-filter-label">
            Filter by Status
          </InputLabel>
          <Select
            labelId="category-filter-label"
            id="category-filter"
            value={categoryFilter}
            label="Filter by Status"
            onChange={handleCategoryChange}
          >
            <MenuItem value="all">All Models</MenuItem>
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="unavailable">Unavailable</MenuItem>
            <MenuItem value="untested">Untested</MenuItem>
            <MenuItem value="error">Error</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {loading && !models.length ? (
        <Typography>Loading models...</Typography>
      ) : filteredModels.length === 0 ? (
        <Alert severity="info">
          {categoryFilter === "all"
            ? "No models found. Add a provider and discover models to get started."
            : `No ${categoryFilter} models found.`}
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
