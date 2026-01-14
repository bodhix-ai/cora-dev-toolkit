"use client";

import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Button,
  CircularProgress,
  Tooltip,
  LinearProgress,
  Divider,
  Collapse,
  Stack,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudQueue as CloudIcon,
  Search as SearchIcon,
  List as ListIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { useState } from "react";
import {
  AIProvider,
  ValidationProgress,
  ValidationCategory,
} from "../../types";

/**
 * Get badge properties for a validation category
 */
function getCategoryBadgeProps(category: string) {
  const categoryMap: Record<
    string,
    {
      label: string;
      color:
        | "default"
        | "primary"
        | "secondary"
        | "error"
        | "warning"
        | "info"
        | "success";
      icon: JSX.Element;
      tooltip: string;
      variant: "filled" | "outlined";
    }
  > = {
    available: {
      label: "Available",
      color: "success",
      icon: <CheckCircleIcon />,
      tooltip: "Validated and ready to use",
      variant: "filled",
    },
    requires_inference_profile: {
      label: "Inference Profile",
      color: "success",
      icon: <CheckCircleIcon />,
      tooltip: "Available via inference profile routing",
      variant: "outlined",
    },
    requires_marketplace: {
      label: "Marketplace",
      color: "warning",
      icon: <ErrorIcon />,
      tooltip: "Requires AWS Marketplace subscription",
      variant: "outlined",
    },
    invalid_request_format: {
      label: "Format Issue",
      color: "error",
      icon: <ErrorIcon />,
      tooltip: "Invalid request format - needs code fix",
      variant: "outlined",
    },
    access_denied: {
      label: "Access Denied",
      color: "error",
      icon: <ErrorIcon />,
      tooltip: "Permission/access error",
      variant: "outlined",
    },
    deprecated: {
      label: "Deprecated",
      color: "default",
      icon: <ErrorIcon />,
      tooltip: "Model no longer available",
      variant: "outlined",
    },
    timeout: {
      label: "Timeout",
      color: "warning",
      icon: <ErrorIcon />,
      tooltip: "Model timed out during validation",
      variant: "outlined",
    },
    unknown_error: {
      label: "Unknown Error",
      color: "error",
      icon: <ErrorIcon />,
      tooltip: "Unknown validation error",
      variant: "outlined",
    },
  };

  return (
    categoryMap[category] || {
      label: category,
      color: "default" as const,
      icon: <ErrorIcon />,
      tooltip: `Category: ${category}`,
      variant: "outlined" as const,
    }
  );
}

interface ProviderCardProps {
  provider: AIProvider;
  onEdit?: (provider: AIProvider) => void;
  onDelete?: (id: string) => void;
  onDiscoverModels?: (providerId: string) => Promise<void>;
  onValidateModels?: (providerId: string) => Promise<void>;
  onViewModels?: (providerId: string) => void;
  onViewCategoryModels?: (
    providerId: string,
    category: ValidationCategory
  ) => void;
  isDiscovering?: boolean;
  validationProgress?: ValidationProgress;
}

export function ProviderCard({
  provider,
  onEdit,
  onDelete,
  onDiscoverModels,
  onValidateModels,
  onViewModels,
  onViewCategoryModels,
  isDiscovering = false,
  validationProgress,
}: ProviderCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [availableExpanded, setAvailableExpanded] = useState(false);
  const [unavailableExpanded, setUnavailableExpanded] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    onEdit?.(provider);
    handleMenuClose();
  };

  const handleDelete = () => {
    onDelete?.(provider.id);
    handleMenuClose();
  };

  const handleDiscoverModels = async () => {
    if (onDiscoverModels) {
      await onDiscoverModels(provider.id);
    }
  };

  const handleValidateModels = async () => {
    if (onValidateModels) {
      await onValidateModels(provider.id);
    }
  };

  const handleViewModels = () => {
    if (onViewModels) {
      onViewModels(provider.id);
    }
  };

  // Check if provider has credentials configured
  // For iam_role auth, credentials are configured even without secret path
  const hasCredentials = 
    provider.authMethod === 'iam_role' || 
    Boolean(provider.credentialsSecretPath);
  
  const modelCounts = provider.modelCounts || {
    total: 0,
    discovered: 0,
    testing: 0,
    available: 0,
    unavailable: 0,
    deprecated: 0,
  };

  const byCategory = modelCounts.byCategory || {};

  // Define category groups for rendering details
  const availableCategories = [
    "direct_invocation",
    "requires_inference_profile",
  ];
  const unavailableCategories = [
    "requires_marketplace",
    "invalid_request_format",
    "access_denied",
    "deprecated",
    "timeout",
    "unknown_error",
  ];

  const isValidating = validationProgress?.isValidating || false;

  // Calculate validation progress percentage
  const validationPercentage = validationProgress?.total
    ? Math.round(
        (validationProgress.validated / validationProgress.total) * 100
      )
    : 0;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CloudIcon color="primary" />
            <Box>
              <Typography variant="h6">
                {provider.displayName || provider.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {provider.providerType}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={provider.isActive ? "Active" : "Inactive"}
              color={provider.isActive ? "success" : "default"}
              size="small"
            />
            <IconButton onClick={handleMenuOpen} aria-label="Provider actions">
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        {/* --- STATUS & DETAILS SECTION --- */}
        {modelCounts.total > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ mb: 1, display: "block" }}
            >
              Model Status
            </Typography>
            <Stack spacing={1}>
              {/* --- Standalone Badges --- */}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Tooltip title="Total models for this provider">
                  <Chip
                    label={`${modelCounts.total} Total`}
                    size="small"
                    variant="filled"
                  />
                </Tooltip>
                {modelCounts.discovered > 0 && (
                  <Tooltip title="Newly discovered, not yet validated">
                    <Chip
                      icon={<ScheduleIcon />}
                      label={`${modelCounts.discovered} Discovered`}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  </Tooltip>
                )}
                {modelCounts.testing > 0 && (
                  <Tooltip title="Currently being validated">
                    <Chip
                      label={`${modelCounts.testing} Testing`}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  </Tooltip>
                )}
              </Box>

              <Divider sx={{ my: 1 }} />

              {/* --- Available Section (Collapsible) --- */}
              {modelCounts.available > 0 && (
                <Box>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={`${modelCounts.available} Available`}
                    size="small"
                    color="success"
                    variant="filled"
                    onClick={() => setAvailableExpanded(!availableExpanded)}
                    onDelete={() => setAvailableExpanded(!availableExpanded)} // Use onDelete to show expand icon
                    deleteIcon={<ExpandMoreIcon />}
                    sx={{ cursor: "pointer" }}
                  />
                  <Collapse in={availableExpanded} timeout="auto" unmountOnExit>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        flexWrap: "wrap",
                        mt: 1,
                        pl: 2,
                      }}
                    >
                      {availableCategories.map((cat) => {
                        const count = byCategory[cat];
                        if (!count) return null;
                        const props = getCategoryBadgeProps(cat);
                        return (
                          <Tooltip
                            key={cat}
                            title={`View ${count} ${props.label.toLowerCase()} models`}
                          >
                            <Chip
                              icon={props.icon}
                              label={`${count} ${props.label}`}
                              size="small"
                              color={props.color}
                              variant="outlined"
                              clickable
                              onClick={() =>
                                onViewCategoryModels?.(
                                  provider.id,
                                  cat as ValidationCategory
                                )
                              }
                            />
                          </Tooltip>
                        );
                      })}
                    </Box>
                  </Collapse>
                </Box>
              )}

              {/* --- Unavailable Section (Collapsible) --- */}
              {modelCounts.unavailable > 0 && (
                <Box>
                  <Chip
                    icon={<ErrorIcon />}
                    label={`${modelCounts.unavailable} Unavailable`}
                    size="small"
                    color="error"
                    variant="filled"
                    onClick={() => setUnavailableExpanded(!unavailableExpanded)}
                    onDelete={() =>
                      setUnavailableExpanded(!unavailableExpanded)
                    }
                    deleteIcon={<ExpandMoreIcon />}
                    sx={{ cursor: "pointer" }}
                  />
                  <Collapse
                    in={unavailableExpanded}
                    timeout="auto"
                    unmountOnExit
                  >
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        flexWrap: "wrap",
                        mt: 1,
                        pl: 2,
                      }}
                    >
                      {unavailableCategories.map((cat) => {
                        const count = byCategory[cat];
                        if (!count) return null;
                        const props = getCategoryBadgeProps(cat);
                        return (
                          <Tooltip
                            key={cat}
                            title={`View ${count} ${props.label.toLowerCase()} models`}
                          >
                            <Chip
                              icon={props.icon}
                              label={`${count} ${props.label}`}
                              size="small"
                              color={props.color}
                              variant="outlined"
                              clickable
                              onClick={() =>
                                onViewCategoryModels?.(
                                  provider.id,
                                  cat as ValidationCategory
                                )
                              }
                            />
                          </Tooltip>
                        );
                      })}
                    </Box>
                  </Collapse>
                </Box>
              )}
            </Stack>
          </Box>
        )}

        {/* Last Validated Timestamp */}
        {provider.lastValidatedAt && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 1 }}
          >
            Last validated:{" "}
            {new Date(provider.lastValidatedAt).toLocaleString()}
          </Typography>
        )}

        {/* Validation Progress */}
        {isValidating && validationProgress && (
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
            >
              <Typography variant="caption" color="text.secondary">
                Validating {validationProgress.currentModel || "models"}...
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {validationProgress.validated} / {validationProgress.total} (
                {validationPercentage}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={validationPercentage}
            />
            <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
              <Typography variant="caption" color="success.main">
                ✓ {validationProgress.available}
              </Typography>
              <Typography variant="caption" color="error.main">
                ✗ {validationProgress.unavailable}
              </Typography>
            </Box>
          </Box>
        )}

        {provider.credentialsSecretPath && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Credentials: {provider.credentialsSecretPath}
          </Typography>
        )}

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 2 }}
        >
          Created: {new Date(provider.createdAt).toLocaleDateString()}
        </Typography>

        {/* Model Discovery Actions */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={
              isDiscovering ? <CircularProgress size={16} /> : <SearchIcon />
            }
            onClick={handleDiscoverModels}
            disabled={!hasCredentials || isDiscovering}
          >
            {isDiscovering ? "Discovering..." : "Discover Models"}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={
              isValidating ? (
                <CircularProgress size={16} />
              ) : (
                <CheckCircleIcon />
              )
            }
            onClick={handleValidateModels}
            disabled={
              !hasCredentials || isValidating || modelCounts.total === 0
            }
          >
            {isValidating ? "Validating..." : "Validate Models"}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ListIcon />}
            onClick={handleViewModels}
            disabled={modelCounts.total === 0}
          >
            View Models
          </Button>
        </Box>
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>
    </Card>
  );
}
