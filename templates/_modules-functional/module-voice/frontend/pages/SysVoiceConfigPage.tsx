/**
 * SysVoiceConfigPage - Platform Voice Configuration Page
 *
 * Platform admin page for managing system-wide voice service credentials:
 * - Daily.co API keys
 * - Deepgram API keys
 * - Cartesia API keys
 * - ECS/Fargate configuration
 *
 * @example
 * // In Next.js app router: app/(admin)/admin/sys/voice/page.tsx
 * import { SysVoiceConfigPage } from '@/modules/module-voice/frontend/pages';
 * export default function Page() {
 *   return <SysVoiceConfigPage />;
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
  TextField,
  Skeleton,
  Chip,
  Alert,
  Breadcrumbs,
  Link,
  Snackbar,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  NavigateNext as NavigateNextIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import {
  sysListCredentials,
  sysCreateCredential,
  sysUpdateCredential,
  sysDeleteCredential,
  sysValidateCredential,
} from "../lib/api";
import type { VoiceCredential } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface SysVoiceConfigPageProps {
  /** Optional CSS class */
  className?: string;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
}

interface CredentialFormData {
  serviceName: "daily" | "deepgram" | "cartesia";
  apiKey: string;
  configMetadata?: Record<string, unknown>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const VOICE_SERVICES = [
  {
    id: "daily",
    name: "Daily.co",
    description: "WebRTC video rooms for real-time interviews",
    icon: "🎥",
  },
  {
    id: "deepgram",
    name: "Deepgram",
    description: "Speech-to-text transcription service",
    icon: "🎤",
  },
  {
    id: "cartesia",
    name: "Cartesia",
    description: "Text-to-speech synthesis for AI responses",
    icon: "🔊",
  },
] as const;

// =============================================================================
// PAGE HEADER COMPONENT
// =============================================================================

function PageHeader() {
  return (
    <Box sx={{ mb: 4 }}>
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{ mb: 2 }}
      >
        <Link
          underline="hover"
          color="inherit"
          href="/admin/sys"
          sx={{ display: "flex", alignItems: "center" }}
          aria-label="Navigate to Sys Admin"
        >
          Sys Admin
        </Link>
        <Typography color="text.primary">Voice</Typography>
      </Breadcrumbs>
      <Typography variant="h4" component="h1" fontWeight="bold">
        Voice Service Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Manage platform-wide voice service credentials. These credentials are used
        by all organizations unless they configure their own.
      </Typography>
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
}

function Section({ title, description, children }: SectionProps) {
  return (
    <Card variant="outlined">
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h5" component="h2" fontWeight="semibold">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
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
      <Skeleton variant="rectangular" height={192} sx={{ borderRadius: 1 }} />
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
        Failed to load credentials
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
// CREDENTIAL CARD COMPONENT
// =============================================================================

interface CredentialCardProps {
  service: (typeof VOICE_SERVICES)[number];
  credential: VoiceCredential | null;
  onConfigure: () => void;
  onValidate: () => void;
  onDelete: () => void;
  isValidating?: boolean;
}

function CredentialCard({
  service,
  credential,
  onConfigure,
  onValidate,
  onDelete,
  isValidating,
}: CredentialCardProps) {
  const isConfigured = !!credential?.isActive;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 2,
        p: 2,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          width: 48,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
          bgcolor: "grey.100",
          borderRadius: 1,
        }}
      >
        {service.icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" fontWeight="medium">
            {service.name}
          </Typography>
          <Chip
            label={isConfigured ? "Configured" : "Not Configured"}
            color={isConfigured ? "success" : "warning"}
            size="small"
            sx={{ fontSize: "0.7rem", height: 20 }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {service.description}
        </Typography>
        {credential && (
          <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: "block" }}>
            Last updated: {new Date(credential.updatedAt).toLocaleDateString()}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {isConfigured && (
          <>
            <Button
              onClick={onValidate}
              disabled={isValidating}
              variant="outlined"
              size="small"
            >
              {isValidating ? "Validating..." : "Validate"}
            </Button>
            <IconButton
              onClick={onDelete}
              size="small"
              color="error"
              aria-label="Remove credential"
              title="Remove credential"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </>
        )}
        <Button
          onClick={onConfigure}
          variant="contained"
          size="small"
        >
          {isConfigured ? "Update" : "Configure"}
        </Button>
      </Box>
    </Box>
  );
}

// =============================================================================
// CREDENTIAL DIALOG COMPONENT
// =============================================================================

interface CredentialDialogProps {
  isOpen: boolean;
  service: (typeof VOICE_SERVICES)[number] | null;
  onSave: (data: CredentialFormData) => Promise<void>;
  onClose: () => void;
}

function CredentialDialog({ isOpen, service, onSave, onClose }: CredentialDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !apiKey.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        serviceName: service.id as "daily" | "deepgram" | "cartesia",
        apiKey: apiKey.trim(),
      });
      setApiKey("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save credential");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen && !!service}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
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
          Configure {service?.name}
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close dialog">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            id="apiKey"
            label="API Key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter API key..."
            helperText="The API key will be stored securely in AWS Secrets Manager."
            required
            fullWidth
            size="small"
          />
          {error && (
            <Alert severity="error">{error}</Alert>
          )}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, pt: 1 }}>
            <Button
              type="button"
              onClick={onClose}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !apiKey.trim()}
              variant="contained"
            >
              {isSaving ? "Saving..." : "Save Credential"}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SysVoiceConfigPage({
  className = "",
  loadingComponent,
}: SysVoiceConfigPageProps) {
  // Auth hook for token
  const { authAdapter, isAuthenticated } = useUser();

  // State
  const [credentials, setCredentials] = useState<VoiceCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [configureService, setConfigureService] = useState<(typeof VOICE_SERVICES)[number] | null>(null);
  const [validatingService, setValidatingService] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Helper to get token
  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      return await authAdapter.getToken();
    } catch (err) {
      console.error("Failed to get auth token:", err);
      return null;
    }
  }, [authAdapter]);

  // Load credentials on mount and when authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      loadCredentials();
    }
  }, [isAuthenticated]);

  const loadCredentials = async () => {
    const token = await getToken();
    if (!token) {
      setError(new Error("Authentication required"));
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await sysListCredentials(token);
      setCredentials(data);
    } catch (err) {
      console.error("Failed to load credentials:", err);
      setError(err instanceof Error ? err : new Error("Failed to load credentials"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCredential = useCallback(async (data: CredentialFormData) => {
    const token = await getToken();
    if (!token) throw new Error("No authentication token");
    
    // Check if credential already exists for this service
    const existing = credentials.find((c) => c.serviceName === data.serviceName);
    
    if (existing) {
      // Update existing credential
      await sysUpdateCredential(existing.id, token, {
        apiKey: data.apiKey,
        configMetadata: data.configMetadata,
      });
      setSnackbar({ open: true, message: `${data.serviceName} credential updated`, severity: "success" });
    } else {
      // Create new credential
      await sysCreateCredential(token, {
        serviceName: data.serviceName,
        apiKey: data.apiKey,
        configMetadata: data.configMetadata,
      });
      setSnackbar({ open: true, message: `${data.serviceName} credential created`, severity: "success" });
    }
    
    await loadCredentials();
  }, [getToken, credentials]);

  const handleValidateCredential = useCallback(async (serviceName: string) => {
    const token = await getToken();
    if (!token) return;
    
    const credential = credentials.find((c) => c.serviceName === serviceName);
    if (!credential) return;
    
    setValidatingService(serviceName);
    try {
      const result = await sysValidateCredential(credential.id, token);
      if (result.isValid) {
        setSnackbar({ open: true, message: `${serviceName} credential is valid`, severity: "success" });
      } else {
        setSnackbar({ open: true, message: result.message || `${serviceName} validation failed`, severity: "error" });
      }
    } catch (err) {
      console.error("Validation failed:", err);
      setSnackbar({ 
        open: true, 
        message: err instanceof Error ? err.message : "Validation failed", 
        severity: "error" 
      });
    } finally {
      setValidatingService(null);
    }
  }, [getToken, credentials]);

  const handleDeleteCredential = useCallback(async (serviceName: string) => {
    const token = await getToken();
    if (!token) return;
    
    const credential = credentials.find((c) => c.serviceName === serviceName);
    if (!credential) return;
    
    if (!window.confirm(`Are you sure you want to remove the ${serviceName} credential?`)) {
      return;
    }
    
    try {
      await sysDeleteCredential(credential.id, token);
      setSnackbar({ open: true, message: `${serviceName} credential deleted`, severity: "success" });
      await loadCredentials();
    } catch (err) {
      console.error("Delete failed:", err);
      setSnackbar({ 
        open: true, 
        message: err instanceof Error ? err.message : "Delete failed", 
        severity: "error" 
      });
    }
  }, [getToken, credentials]);

  const getCredentialForService = (serviceName: string): VoiceCredential | null => {
    return credentials.find((c) => c.serviceName === serviceName) || null;
  };

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
        <ErrorState error={error} onRetry={loadCredentials} />
      </Box>
    );
  }

  return (
    <Box className={className} sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Page Header */}
      <PageHeader />

      {/* Voice Service Credentials */}
      <Section
        title="Service Credentials"
        description="Configure API keys for external voice services."
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {VOICE_SERVICES.map((service) => (
            <CredentialCard
              key={service.id}
              service={service}
              credential={getCredentialForService(service.id)}
              onConfigure={() => setConfigureService(service)}
              onValidate={() => handleValidateCredential(service.id)}
              onDelete={() => handleDeleteCredential(service.id)}
              isValidating={validatingService === service.id}
            />
          ))}
        </Box>
      </Section>

      {/* ECS Configuration */}
      <Section
        title="Bot Runtime Configuration"
        description="Configure the ECS/Fargate settings for Pipecat bot instances."
      >
        <Alert severity="info" variant="outlined">
          Bot runtime configuration is managed through Terraform infrastructure.
          See the deployment documentation for details on configuring ECS clusters,
          task definitions, and scaling policies.
        </Alert>
      </Section>

      {/* Info Banner */}
      <Alert severity="info" icon={<InfoIcon />}>
        <Typography variant="body2">
          <strong>Platform Credentials:</strong> These credentials serve as defaults
          for all organizations. Individual organizations can configure their own
          credentials through their Voice Settings page.
        </Typography>
      </Alert>

      {/* Credential Dialog */}
      <CredentialDialog
        isOpen={!!configureService}
        service={configureService}
        onSave={handleSaveCredential}
        onClose={() => setConfigureService(null)}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          icon={snackbar.severity === "success" ? <CheckCircleIcon /> : undefined}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default SysVoiceConfigPage;
