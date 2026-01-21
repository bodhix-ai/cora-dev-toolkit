"use client";

import React from "react";
import {
  Button,
  Box,
  TextField,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { Warning as WarningIcon } from "@mui/icons-material";
import { DeploymentInfo } from "../types/ai-models";
import { ModelCard } from "./ModelCard";

const RECOMMENDED_DIMENSIONS = 1024;

interface ModelSelectionModalProps {
  open: boolean;
  onClose: () => void;
  models: DeploymentInfo[];
  onSelectModel: (modelId: string) => void;
  title: string;
}

export const ModelSelectionModal: React.FC<ModelSelectionModalProps> = ({
  open,
  onClose,
  models,
  onSelectModel,
  title,
}) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [providerFilter, setProviderFilter] = React.useState<string>("all");
  const [dimensionFilter, setDimensionFilter] = React.useState<string>("all");
  const [warningOpen, setWarningOpen] = React.useState(false);
  const [selectedModel, setSelectedModel] =
    React.useState<DeploymentInfo | null>(null);

  const providers = [...new Set(models.map((model) => model.provider))];
  const dimensions = [
    ...new Set(
      models
        .map((model) => model.capabilities?.embeddingDimensions)
        .filter(Boolean)
    ),
  ];

  const filteredModels = models
    .filter(
      (model) => providerFilter === "all" || model.provider === providerFilter
    )
    .filter(
      (model) =>
        dimensionFilter === "all" ||
        model.capabilities?.embeddingDimensions === parseInt(dimensionFilter)
    )
    .filter((model) =>
      model.modelName.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleSelect = (model: DeploymentInfo) => {
    if (
      model.capabilities?.embeddingDimensions &&
      model.capabilities.embeddingDimensions !== RECOMMENDED_DIMENSIONS
    ) {
      setSelectedModel(model);
      setWarningOpen(true);
    } else {
      onSelectModel(model.id);
    }
  };

  const handleConfirmWarning = () => {
    if (selectedModel) {
      onSelectModel(selectedModel.id);
    }
    setWarningOpen(false);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, display: "flex", gap: 2 }}>
            <TextField
              label="Search models..."
              variant="outlined"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Model Vendor</InputLabel>
              <Select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                label="Model Vendor"
                aria-label="Filter by model vendor"
              >
                <MenuItem value="all">All</MenuItem>
                {providers.map((provider) => (
                  <MenuItem key={provider} value={provider}>
                    {provider}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Dimensions</InputLabel>
              <Select
                value={dimensionFilter}
                onChange={(e) => setDimensionFilter(e.target.value)}
                label="Dimensions"
                aria-label="Filter by dimensions"
              >
                <MenuItem value="all">All</MenuItem>
                {dimensions.map((dim) => (
                  <MenuItem key={dim} value={dim}>
                    {dim}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Grid container spacing={2} sx={{ p: 2 }}>
            {filteredModels.map((model) => (
              <Grid item xs={12} sm={6} md={4} key={model.id}>
                <ModelCard model={model} onSelect={() => handleSelect(model)} />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={warningOpen} onClose={() => setWarningOpen(false)}>
        <DialogTitle>Dimension Mismatch</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The selected model has a dimension of{" "}
            {selectedModel?.capabilities?.embeddingDimensions}. The database is
            configured for {RECOMMENDED_DIMENSIONS}. Using this model will
            require re-embedding all existing documents.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarningOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmWarning} color="warning">
            Proceed Anyway
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
