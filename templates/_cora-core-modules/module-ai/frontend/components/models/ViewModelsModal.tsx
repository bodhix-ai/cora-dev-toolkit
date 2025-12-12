"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Chip,
  Typography,
  IconButton,
  Tooltip,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from "@mui/material";
import {
  Close as CloseIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  CloudQueue as CloudIcon,
} from "@mui/icons-material";
import { useState, useMemo, useEffect } from "react";
import { AIModel, ModelStatus, ValidationCategory } from "../../types";

interface ViewModelsModalProps {
  open: boolean;
  onClose: () => void;
  models: AIModel[];
  providerName?: string;
  loading?: boolean;
  initialStatusFilter?: ModelStatus | "all";
  initialCategoryFilter?: ValidationCategory | "all";
}

type SortField =
  | "modelId"
  | "displayName"
  | "status"
  | "validationCategory"
  | "createdAt";
type SortDirection = "asc" | "desc";

export function ViewModelsModal({
  open,
  onClose,
  models,
  providerName,
  loading = false,
  initialStatusFilter = "all",
  initialCategoryFilter = "all",
}: ViewModelsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ModelStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<
    ValidationCategory | "all"
  >("all");
  const [sortField, setSortField] = useState<SortField>("modelId");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Set initial filters when modal opens
  useEffect(() => {
    if (open) {
      setStatusFilter(initialStatusFilter);
      setCategoryFilter(initialCategoryFilter);
    }
  }, [open, initialStatusFilter, initialCategoryFilter]);

  // Filter and sort models
  const filteredAndSortedModels = useMemo(() => {
    let filtered = models;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (model) =>
          model.modelId.toLowerCase().includes(query) ||
          model.displayName?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((model) => model.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (model) => model.validationCategory === categoryFilter
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Convert to comparable values
      if (sortField === "createdAt") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [
    models,
    searchQuery,
    statusFilter,
    categoryFilter,
    sortField,
    sortDirection,
  ]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStatusChip = (status: ModelStatus) => {
    switch (status) {
      case "available":
        return (
          <Chip
            icon={<CheckCircleIcon />}
            label="Available"
            color="success"
            size="small"
          />
        );
      case "unavailable":
        return (
          <Chip
            icon={<ErrorIcon />}
            label="Unavailable"
            color="error"
            size="small"
          />
        );
      case "discovered":
        return (
          <Chip
            icon={<ScheduleIcon />}
            label="Discovered"
            color="info"
            size="small"
          />
        );
      case "testing":
        return (
          <Chip
            icon={<CircularProgress size={12} />}
            label="Testing"
            color="warning"
            size="small"
          />
        );
      case "deprecated":
        return <Chip label="Deprecated" color="default" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const getDetailsContent = (model: AIModel) => {
    const category = model.validationCategory;
    const error = model.validationError;

    if (model.status === "available") {
      const text =
        category === "direct_invocation"
          ? "Direct"
          : category === "requires_inference_profile"
            ? "Inference Profile"
            : category?.replace(/_/g, " ") || "—";
      return (
        <Tooltip title={category?.replace(/_/g, " ") || ""}>
          <Typography
            variant="body2"
            noWrap
            sx={{ textTransform: "capitalize", maxWidth: 150 }}
          >
            {text}
          </Typography>
        </Tooltip>
      );
    }

    if (model.status === "unavailable") {
      const text = category?.replace(/_/g, " ") || "—";
      return (
        <Tooltip title={error || text}>
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            sx={{ textTransform: "capitalize", maxWidth: 150 }}
          >
            {text}
          </Typography>
        </Tooltip>
      );
    }

    return <Typography variant="body2">—</Typography>;
  };

  const getCapabilitiesText = (model: AIModel) => {
    if (!model.capabilities) return "—";

    const caps: string[] = [];
    if (model.capabilities.chat) caps.push("Chat");
    if (model.capabilities.embedding) {
      const dimensions =
        model.capabilities.dimensions || model.capabilities.embeddingDimensions;
      if (dimensions) {
        caps.push(`Embedding (${dimensions}D)`);
      } else {
        caps.push("Embedding");
      }
    }
    if (model.capabilities.supportsVision) caps.push("Vision");
    if (model.capabilities.maxTokens) {
      caps.push(`${(model.capabilities.maxTokens / 1000).toFixed(0)}K tokens`);
    }
    if (model.capabilities.supportsStreaming) caps.push("Streaming");

    return caps.length > 0 ? caps.join(", ") : "—";
  };

  const statusCounts = useMemo(() => {
    return models.reduce(
      (acc, model) => {
        acc[model.status] = (acc[model.status] || 0) + 1;
        return acc;
      },
      {} as Record<ModelStatus, number>
    );
  }, [models]);

  const categoryCounts = useMemo(() => {
    return models.reduce(
      (acc, model) => {
        if (model.validationCategory) {
          acc[model.validationCategory] =
            (acc[model.validationCategory] || 0) + 1;
        }
        return acc;
      },
      {} as Record<ValidationCategory, number>
    );
  }, [models]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <CloudIcon color="primary" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">
              Models {providerName ? `- ${providerName}` : ""}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {filteredAndSortedModels.length} of {models.length} models
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Filters */}
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <TextField
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) =>
                setStatusFilter(e.target.value as ModelStatus | "all")
              }
            >
              <MenuItem value="all">All ({models.length})</MenuItem>
              {statusCounts.available && (
                <MenuItem value="available">
                  Available ({statusCounts.available})
                </MenuItem>
              )}
              {statusCounts.discovered && (
                <MenuItem value="discovered">
                  Discovered ({statusCounts.discovered})
                </MenuItem>
              )}
              {statusCounts.unavailable && (
                <MenuItem value="unavailable">
                  Unavailable ({statusCounts.unavailable})
                </MenuItem>
              )}
              {statusCounts.testing && (
                <MenuItem value="testing">
                  Testing ({statusCounts.testing})
                </MenuItem>
              )}
              {statusCounts.deprecated && (
                <MenuItem value="deprecated">
                  Deprecated ({statusCounts.deprecated})
                </MenuItem>
              )}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) =>
                setCategoryFilter(e.target.value as ValidationCategory | "all")
              }
            >
              <MenuItem value="all">All Categories</MenuItem>
              {categoryCounts.direct_invocation && (
                <MenuItem value="direct_invocation">
                  Direct ({categoryCounts.direct_invocation})
                </MenuItem>
              )}
              {categoryCounts.requires_inference_profile && (
                <MenuItem value="requires_inference_profile">
                  Inference Profile ({categoryCounts.requires_inference_profile}
                  )
                </MenuItem>
              )}
              {categoryCounts.requires_marketplace && (
                <MenuItem value="requires_marketplace">
                  Marketplace ({categoryCounts.requires_marketplace})
                </MenuItem>
              )}
              {categoryCounts.deprecated && (
                <MenuItem value="deprecated">
                  Deprecated ({categoryCounts.deprecated})
                </MenuItem>
              )}
              {categoryCounts.invalid_request_format && (
                <MenuItem value="invalid_request_format">
                  Format Issue ({categoryCounts.invalid_request_format})
                </MenuItem>
              )}
              {categoryCounts.unknown_error && (
                <MenuItem value="unknown_error">
                  Unknown Error ({categoryCounts.unknown_error})
                </MenuItem>
              )}
              {categoryCounts.access_denied && (
                <MenuItem value="access_denied">
                  Access Denied ({categoryCounts.access_denied})
                </MenuItem>
              )}
              {categoryCounts.timeout && (
                <MenuItem value="timeout">
                  Timeout ({categoryCounts.timeout})
                </MenuItem>
              )}
            </Select>
          </FormControl>
        </Box>

        {/* Models Table */}
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 8,
            }}
          >
            <CircularProgress />
          </Box>
        ) : filteredAndSortedModels.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              {searchQuery || statusFilter !== "all"
                ? "No models match your filters"
                : "No models discovered yet"}
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === "modelId"}
                      direction={
                        sortField === "modelId" ? sortDirection : "asc"
                      }
                      onClick={() => handleSort("modelId")}
                    >
                      Model ID
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === "displayName"}
                      direction={
                        sortField === "displayName" ? sortDirection : "asc"
                      }
                      onClick={() => handleSort("displayName")}
                    >
                      Display Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ width: "12%" }}>
                    <TableSortLabel
                      active={sortField === "status"}
                      direction={sortField === "status" ? sortDirection : "asc"}
                      onClick={() => handleSort("status")}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ width: "15%" }}>
                    <TableSortLabel
                      active={sortField === "validationCategory"}
                      direction={
                        sortField === "validationCategory"
                          ? sortDirection
                          : "asc"
                      }
                      onClick={() => handleSort("validationCategory")}
                    >
                      Details
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Capabilities</TableCell>
                  <TableCell align="right">Input Cost</TableCell>
                  <TableCell align="right">Output Cost</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === "createdAt"}
                      direction={
                        sortField === "createdAt" ? sortDirection : "asc"
                      }
                      onClick={() => handleSort("createdAt")}
                    >
                      Discovered
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAndSortedModels.map((model) => (
                  <TableRow key={model.id} hover>
                    <TableCell>
                      <Tooltip title={model.modelId}>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ maxWidth: 250 }}
                        >
                          {model.modelId}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {model.displayName || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>{getStatusChip(model.status)}</TableCell>
                    <TableCell>{getDetailsContent(model)}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getCapabilitiesText(model)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {model.costPer1kTokensInput
                          ? `$${model.costPer1kTokensInput.toFixed(4)}`
                          : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {model.costPer1kTokensOutput
                          ? `$${model.costPer1kTokensOutput.toFixed(4)}`
                          : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {model.lastDiscoveredAt
                          ? new Date(
                              model.lastDiscoveredAt
                            ).toLocaleDateString()
                          : new Date(model.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
