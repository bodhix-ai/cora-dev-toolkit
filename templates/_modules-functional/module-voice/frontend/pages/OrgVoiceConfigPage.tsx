/**
 * OrgVoiceConfigPage - Organization Voice Interview Configuration Page
 *
 * Org admin page for managing organization-level voice interview settings:
 * - Interview configurations (templates for different interview types)
 * - Analytics overview and session statistics
 *
 * @example
 * // In Next.js app router: app/(admin)/admin/org/voice/page.tsx
 * import { OrgVoiceConfigPage } from '@/modules/module-voice/frontend/pages';
 * export default function Page() {
 *   return <OrgVoiceConfigPage orgId={orgId} />;
 * }
 */

"use client";

import React, { useState, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Skeleton,
  Chip,
  Alert,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Mic as MicIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useVoiceConfigs } from "../hooks";
import { ConfigForm } from "../components";
import type { VoiceConfig, VoiceConfigInput } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface OrgVoiceConfigPageProps {
  /** Organization ID */
  orgId: string;
  /** Optional CSS class */
  className?: string;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
}

// =============================================================================
// PAGE HEADER COMPONENT
// =============================================================================

function PageHeader({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 4 }}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Voice Interview Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Manage interview configurations and view analytics for your organization.
        </Typography>
      </Box>
      <Button
        onClick={onCreateNew}
        variant="contained"
        startIcon={<AddIcon />}
      >
        New Configuration
      </Button>
    </Box>
  );
}

// =============================================================================
// SECTION COMPONENT
// =============================================================================

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

function Section({ title, description, children, action }: SectionProps) {
  return (
    <Card variant="outlined">
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h6" component="h2" fontWeight="semibold">
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

function LoadingState() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={192} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={256} sx={{ borderRadius: 1 }} />
    </Box>
  );
}

// =============================================================================
// ERROR STATE COMPONENT
// =============================================================================

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 2,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          mb: 2,
          borderRadius: "50%",
          bgcolor: "error.lighter",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <WarningIcon sx={{ fontSize: 32, color: "error.main" }} />
      </Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Failed to load configuration
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        textAlign="center"
        sx={{ mb: 3, maxWidth: 400 }}
      >
        {error.message}
      </Typography>
      <Button onClick={onRetry} variant="contained">
        Try Again
      </Button>
    </Box>
  );
}

// =============================================================================
// CONFIG LIST COMPONENT
// =============================================================================

interface ConfigListProps {
  configs: VoiceConfig[];
  onEdit: (config: VoiceConfig) => void;
  onDelete: (configId: string) => void;
}

function ConfigList({ configs, onEdit, onDelete }: ConfigListProps) {
  if (configs.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <MicIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          No interview configurations yet. Create one to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      {configs.map((config, index) => (
        <Box key={config.id}>
          {index > 0 && <Divider />}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              py: 2,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography
                  variant="body2"
                  fontWeight="medium"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {config.name}
                </Typography>
                <Chip
                  label={config.isActive ? "Active" : "Inactive"}
                  color={config.isActive ? "success" : "default"}
                  size="small"
                  sx={{ fontSize: "0.7rem", height: 20 }}
                />
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  mt: 0.5,
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Type: {config.interviewType}
                {config.description && ` • ${config.description}`}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 2 }}>
              <IconButton
                onClick={() => onEdit(config)}
                size="small"
                title="Edit configuration"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                onClick={() => onDelete(config.id)}
                size="small"
                color="error"
                title="Delete configuration"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// =============================================================================
// CONFIG DIALOG COMPONENT
// =============================================================================

interface ConfigDialogProps {
  isOpen: boolean;
  config: VoiceConfig | null;
  onSave: (data: VoiceConfigInput) => Promise<void>;
  onClose: () => void;
}

function ConfigDialog({ isOpen, config, onSave, onClose }: ConfigDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h6" component="span">
          {config ? "Edit Configuration" : "New Configuration"}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <ConfigForm
          initialData={config || undefined}
          onSubmit={async (data) => {
            await onSave(data);
            onClose();
          }}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function OrgVoiceConfigPage({
  orgId,
  className = "",
  loadingComponent,
}: OrgVoiceConfigPageProps) {
  // State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<VoiceConfig | null>(null);

  // Hooks
  const {
    configs,
    isLoading,
    error,
    createConfig,
    updateConfig,
    deleteConfig,
    refresh,
  } = useVoiceConfigs(orgId);

  // Handlers
  const handleCreateNew = useCallback(() => {
    setEditingConfig(null);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = useCallback((config: VoiceConfig) => {
    setEditingConfig(config);
    setIsDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (configId: string) => {
      if (window.confirm("Are you sure you want to delete this configuration?")) {
        await deleteConfig(configId);
      }
    },
    [deleteConfig]
  );

  const handleSave = useCallback(
    async (data: VoiceConfigInput) => {
      if (editingConfig) {
        await updateConfig(editingConfig.id, data);
      } else {
        await createConfig(data);
      }
    },
    [editingConfig, createConfig, updateConfig]
  );

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingConfig(null);
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <Box className={className} sx={{ p: 3 }}>
        {loadingComponent || <LoadingState />}
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box className={className} sx={{ p: 3 }}>
        <ErrorState error={error} onRetry={refresh} />
      </Box>
    );
  }

  return (
    <Box className={className} sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Page Header */}
      <PageHeader onCreateNew={handleCreateNew} />

      {/* Interview Configurations */}
      <Section
        title="Interview Configurations"
        description="Configure templates for different types of voice interviews."
      >
        <ConfigList
          configs={configs || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Section>

      {/* Info Banner */}
      <Alert severity="info" variant="outlined">
        <Typography variant="body2">
          <strong>Note:</strong> Interview configurations define the settings used by the AI
          interviewer, including voice settings, transcription options, and interview structure.
          Each configuration can be used for multiple interview sessions.
        </Typography>
      </Alert>

      {/* Config Dialog */}
      <ConfigDialog
        isOpen={isDialogOpen}
        config={editingConfig}
        onSave={handleSave}
        onClose={handleCloseDialog}
      />
    </Box>
  );
}

export default OrgVoiceConfigPage;
