/**
 * Module Admin Dashboard Component
 *
 * Admin dashboard for managing CORA modules.
 * Allows administrators to view, enable, disable, and configure modules.
 *
 * @example
 * ```tsx
 * <ModuleAdminDashboard />
 * ```
 */

import React, { useState, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import {
  useModuleRegistry,
  type Module,
  type ModuleUpdate,
} from "../hooks/useModuleRegistry";

// =============================================================================
// Types
// =============================================================================

export interface ModuleAdminDashboardProps {
  /** CSS class name for the container */
  className?: string;
  /** Callback when a module is toggled */
  onModuleToggle?: (module: Module, enabled: boolean) => void;
  /** Callback when a module is updated */
  onModuleUpdate?: (module: Module) => void;
  /** Custom card render function */
  renderCard?: (module: Module, actions: ModuleCardActions) => React.ReactNode;
}

export interface ModuleCardActions {
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  openConfig: () => void;
}

export interface ModuleCardProps {
  module: Module;
  onEnable: () => Promise<void>;
  onDisable: () => Promise<void>;
  onConfigure: () => void;
  isProcessing: boolean;
}

// =============================================================================
// Module Card Component
// =============================================================================

function ModuleCard({
  module,
  onEnable,
  onDisable,
  onConfigure,
  isProcessing,
}: ModuleCardProps): React.ReactElement {
  const tierLabels = {
    1: "Tier 1 (No Dependencies)",
    2: "Tier 2 (Depends on Tier 1)",
    3: "Tier 3 (Depends on Tier 1 & 2)",
  };

  return (
    <Paper
      elevation={2}
      sx={{
        borderLeft: (theme) =>
          `4px solid ${
            module.type === "core" ? theme.palette.primary.main : theme.palette.success.main
          }`,
        opacity: module.isEnabled ? 1 : 0.7,
        transition: "all 0.15s ease",
        "&:hover": {
          boxShadow: 4,
        },
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
          <Box>
            <Typography variant="h6" component="h3" sx={{ mb: 0.5 }}>
              {module.displayName}
            </Typography>
            <Chip
              label={module.type}
              size="small"
              sx={{
                textTransform: "uppercase",
                fontSize: "0.75rem",
                bgcolor: (theme) =>
                  module.type === "core"
                    ? theme.palette.mode === "dark"
                      ? "rgba(33, 150, 243, 0.2)"
                      : "#dbeafe"
                    : theme.palette.mode === "dark"
                    ? "rgba(76, 175, 80, 0.2)"
                    : "#dcfce7",
                color: (theme) =>
                  module.type === "core"
                    ? theme.palette.mode === "dark"
                      ? "#90caf9"
                      : "#1e40af"
                    : theme.palette.mode === "dark"
                    ? "#a5d6a7"
                    : "#166534",
              }}
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: module.isEnabled ? "success.main" : "error.main",
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {module.isEnabled ? "Enabled" : "Disabled"}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
          {module.description || "No description available."}
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", fontSize: "0.8125rem" }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ width: "100px", flexShrink: 0 }}
            >
              Module Name:
            </Typography>
            <Typography
              variant="body2"
              component="code"
              sx={{
                bgcolor: "action.hover",
                px: 0.5,
                borderRadius: 0.5,
                fontFamily: "monospace",
              }}
            >
              {module.name}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", fontSize: "0.8125rem" }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ width: "100px", flexShrink: 0 }}
            >
              Tier:
            </Typography>
            <Typography variant="body2">{tierLabels[module.tier]}</Typography>
          </Box>
          {module.version && (
            <Box sx={{ display: "flex", fontSize: "0.8125rem" }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ width: "100px", flexShrink: 0 }}
              >
                Version:
              </Typography>
              <Typography variant="body2">{module.version}</Typography>
            </Box>
          )}
          {module.dependencies.length > 0 && (
            <Box sx={{ display: "flex", fontSize: "0.8125rem" }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ width: "100px", flexShrink: 0 }}
              >
                Dependencies:
              </Typography>
              <Typography variant="body2">{module.dependencies.join(", ")}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          p: 2,
          display: "flex",
          gap: 1.5,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={onConfigure}
          disabled={isProcessing}
          sx={{ flex: 1 }}
        >
          Configure
        </Button>
        {module.isEnabled ? (
          <Button
            variant="contained"
            color="error"
            onClick={onDisable}
            disabled={isProcessing || module.type === "core"}
            title={
              module.type === "core"
                ? "Core modules cannot be disabled"
                : "Disable module"
            }
            sx={{ flex: 1 }}
          >
            {isProcessing ? "Processing..." : "Disable"}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={onEnable}
            disabled={isProcessing}
            sx={{ flex: 1 }}
          >
            {isProcessing ? "Processing..." : "Enable"}
          </Button>
        )}
      </Box>
    </Paper>
  );
}

// =============================================================================
// Module Config Modal Component
// =============================================================================

interface ModuleConfigModalProps {
  module: Module;
  onClose: () => void;
  onSave: (updates: Partial<ModuleUpdate>) => Promise<void>;
}

function ModuleConfigModal({
  module,
  onClose,
  onSave,
}: ModuleConfigModalProps): React.ReactElement {
  const [config, setConfig] = useState(JSON.stringify(module.config, null, 2));
  const [featureFlags, setFeatureFlags] = useState(
    JSON.stringify(module.featureFlags, null, 2)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const updates: Partial<ModuleUpdate> = {
        config: JSON.parse(config),
        featureFlags: JSON.parse(featureFlags),
      };
      await onSave(updates);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save configuration"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6">Configure {module.displayName}</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Module Configuration (JSON)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={10}
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            placeholder="{}"
            inputProps={{
              style: { fontFamily: "monospace", fontSize: "0.875rem" },
              "aria-label": "Module Configuration JSON",
            }}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Feature Flags (JSON)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={featureFlags}
            onChange={(e) => setFeatureFlags(e.target.value)}
            placeholder="{}"
            inputProps={{
              style: { fontFamily: "monospace", fontSize: "0.875rem" },
              "aria-label": "Feature Flags JSON",
            }}
          />
        </Box>

        <Paper sx={{ p: 2, bgcolor: "action.hover" }}>
          <Typography variant="subtitle2" gutterBottom>
            Module Information
          </Typography>
          <Grid container spacing={1} sx={{ fontSize: "0.8125rem" }}>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                Name:
              </Typography>
            </Grid>
            <Grid item xs={8}>
              <Typography variant="body2">{module.name}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                Type:
              </Typography>
            </Grid>
            <Grid item xs={8}>
              <Typography variant="body2">{module.type}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                Tier:
              </Typography>
            </Grid>
            <Grid item xs={8}>
              <Typography variant="body2">{module.tier}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                Dependencies:
              </Typography>
            </Grid>
            <Grid item xs={8}>
              <Typography variant="body2">
                {module.dependencies.join(", ") || "None"}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                Required Permissions:
              </Typography>
            </Grid>
            <Grid item xs={8}>
              <Typography variant="body2">
                {module.requiredPermissions.join(", ") || "None"}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={16} /> : null}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// =============================================================================
// Main Dashboard Component
// =============================================================================

export function ModuleAdminDashboard({
  className = "",
  onModuleToggle,
  onModuleUpdate,
  renderCard,
}: ModuleAdminDashboardProps): React.ReactElement {
  const {
    modules,
    isLoading,
    error,
    refreshModules,
    enableModule,
    disableModule,
    updateModule,
  } = useModuleRegistry({
    autoFetch: true,
    includeDisabled: true,
  });

  const [processingModules, setProcessingModules] = useState<Set<string>>(
    new Set()
  );
  const [configModule, setConfigModule] = useState<Module | null>(null);
  const [filter, setFilter] = useState<"all" | "core" | "functional">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Handle enable/disable
  const handleToggleModule = useCallback(
    async (module: Module, enable: boolean) => {
      setProcessingModules((prev) => new Set(prev).add(module.name));

      try {
        const success = enable
          ? await enableModule(module.name)
          : await disableModule(module.name);

        if (success) {
          onModuleToggle?.(module, enable);
        }
      } finally {
        setProcessingModules((prev) => {
          const next = new Set(prev);
          next.delete(module.name);
          return next;
        });
      }
    },
    [enableModule, disableModule, onModuleToggle]
  );

  // Handle configuration save
  const handleSaveConfig = useCallback(
    async (module: Module, updates: Partial<ModuleUpdate>) => {
      const updated = await updateModule(module.name, updates);
      if (updated) {
        onModuleUpdate?.(updated);
      }
    },
    [updateModule, onModuleUpdate]
  );

  // Filter modules
  const filteredModules = (modules || []).filter((m) => {
    if (filter !== "all" && m.type !== filter) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(query) ||
        m.displayName.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Group modules by tier
  const modulesByTier = {
    1: filteredModules.filter((m) => m.tier === 1),
    2: filteredModules.filter((m) => m.tier === 2),
    3: filteredModules.filter((m) => m.tier === 3),
  };

  if (isLoading) {
    return (
      <Box className={className} sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={className} sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Failed to load modules
          </Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
        <Button variant="contained" onClick={refreshModules}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box className={className} sx={{ p: 4, maxWidth: 1400, mx: "auto" }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight={600}>
          Module Registry
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage CORA modules for your application
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "center",
          mb: 4,
          flexWrap: "wrap",
        }}
      >
        <TextField
          placeholder="Search modules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ width: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            "aria-label": "Search modules",
          }}
        />

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant={filter === "all" ? "contained" : "outlined"}
            onClick={() => setFilter("all")}
            size="small"
          >
            All ({(modules || []).length})
          </Button>
          <Button
            variant={filter === "core" ? "contained" : "outlined"}
            onClick={() => setFilter("core")}
            size="small"
          >
            Core ({(modules || []).filter((m) => m.type === "core").length})
          </Button>
          <Button
            variant={filter === "functional" ? "contained" : "outlined"}
            onClick={() => setFilter("functional")}
            size="small"
          >
            Functional ({(modules || []).filter((m) => m.type === "functional").length})
          </Button>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refreshModules}
          size="small"
          sx={{ ml: "auto" }}
        >
          Refresh
        </Button>
      </Box>

      <Box>
        {[1, 2, 3].map((tier) => {
          const tierModules = modulesByTier[tier as 1 | 2 | 3];
          if (tierModules.length === 0) return null;

          return (
            <Box key={tier} sx={{ mb: 4 }}>
              <Typography
                variant="h5"
                gutterBottom
                fontWeight={600}
                sx={{ mb: 2, pb: 1, borderBottom: 2, borderColor: "divider" }}
              >
                Tier {tier} Modules
              </Typography>
              <Grid container spacing={3}>
                {tierModules.map((module) => {
                  const isProcessing = processingModules.has(module.name);
                  const actions: ModuleCardActions = {
                    enable: () => handleToggleModule(module, true),
                    disable: () => handleToggleModule(module, false),
                    openConfig: () => setConfigModule(module),
                  };

                  if (renderCard) {
                    return (
                      <Grid item xs={12} sm={6} lg={4} key={module.name}>
                        {renderCard(module, actions)}
                      </Grid>
                    );
                  }

                  return (
                    <Grid item xs={12} sm={6} lg={4} key={module.name}>
                      <ModuleCard
                        module={module}
                        onEnable={actions.enable}
                        onDisable={actions.disable}
                        onConfigure={actions.openConfig}
                        isProcessing={isProcessing}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          );
        })}
      </Box>

      {configModule && (
        <ModuleConfigModal
          module={configModule}
          onClose={() => setConfigModule(null)}
          onSave={(updates) => handleSaveConfig(configModule, updates)}
        />
      )}
    </Box>
  );
}

export default ModuleAdminDashboard;