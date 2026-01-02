/**
 * IDP Configuration Admin Card
 *
 * Platform admin card for managing Identity Provider (IDP) configurations.
 * Only visible to users with platform admin roles:
 * - super_admin
 * - platform_owner
 * - platform_admin
 * - global_owner
 * - global_admin
 */

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  Box,
  Chip,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Paper,
} from "@mui/material";
import {
  Shield,
  VpnKey,
  CheckCircle,
  Cancel,
  Warning,
  Settings,
} from "@mui/icons-material";

/**
 * IDP Configuration type
 * 
 * **Phase 1: Okta-Only (ADR-010)**
 * Currently supports only Okta. Future phases will migrate to AWS Cognito
 * with federated external IDPs (Google, Microsoft, Okta).
 */
interface IdpConfig {
  id: string;
  provider_type: "okta";
  display_name: string;
  config: {
    client_id?: string;
    issuer?: string;
    jwks_uri?: string;
  };
  is_active: boolean;
  is_configured: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Props for IdpConfigCard
 */
interface IdpConfigCardProps {
  /** Authenticated API client for making requests */
  apiClient: {
    get: <T = unknown>(url: string) => Promise<{ data: T; success: boolean }>;
    put: <T = unknown>(url: string, data: unknown) => Promise<{ data: T; success: boolean }>;
    post: <T = unknown>(url: string, data?: unknown) => Promise<{ data: T; success: boolean }>;
  };
  /** Callback when IDP is changed */
  onIdpChanged?: () => void;
}

/**
 * IDP Configuration Card Component
 *
 * Displays and manages identity provider configurations for platform admins.
 */
export function IdpConfigCard({ apiClient, onIdpChanged }: IdpConfigCardProps) {
  const [configs, setConfigs] = useState<IdpConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<IdpConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch IDP configurations on mount
  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<IdpConfig[]>("/admin/idp-config");
      if (response.success) {
        setConfigs(response.data || []);
      } else {
        setError("Failed to load IDP configurations");
      }
    } catch (err) {
      setError("Failed to load IDP configurations");
      console.error("Error fetching IDP configs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (
    providerType: string,
    configData: Record<string, string>
  ) => {
    try {
      setSaving(true);
      setError(null);

      const response = await apiClient.put<IdpConfig>(
        `/admin/idp-config/${providerType}`,
        {
          config: configData,
        }
      );

      if (response.success) {
        await fetchConfigs();
        setEditingConfig(null);
        onIdpChanged?.();
      } else {
        setError("Failed to save IDP configuration");
      }
    } catch (err) {
      setError("Failed to save IDP configuration");
      console.error("Error saving IDP config:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (providerType: string) => {
    try {
      setSaving(true);
      setError(null);

      const response = await apiClient.post<{ success: boolean }>(
        `/admin/idp-config/${providerType}/activate`
      );

      if (response.success) {
        await fetchConfigs();
        onIdpChanged?.();
      } else {
        setError("Failed to activate IDP");
      }
    } catch (err) {
      setError("Failed to activate IDP");
      console.error("Error activating IDP:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader avatar={<Shield />} title="Identity Providers" />
        <CardContent sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        avatar={<Shield />}
        title="Identity Providers"
        subheader="Configure authentication providers for your platform. Only one provider can be active at a time."
      />
      <CardContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {error && (
            <Alert severity="error">
              <AlertTitle>Error</AlertTitle>
              {error}
            </Alert>
          )}

          {configs.map((config) => (
            <IdpProviderRow
              key={config.id}
              config={config}
              onEdit={() => setEditingConfig(config)}
              onActivate={() => handleActivate(config.provider_type)}
              saving={saving}
            />
          ))}

          {/* Edit Dialog */}
          {editingConfig && (
            <IdpEditDialog
              config={editingConfig}
              onClose={() => setEditingConfig(null)}
              onSave={handleSaveConfig}
              saving={saving}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

/**
 * Individual IDP Provider Row
 */
function IdpProviderRow({
  config,
  onEdit,
  onActivate,
  saving,
}: {
  config: IdpConfig;
  onEdit: () => void;
  onActivate: () => void;
  saving: boolean;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor:
              config.provider_type === "okta"
                ? "primary.light"
                : "secondary.light",
          }}
        >
          {config.provider_type === "okta" ? (
            <VpnKey color="primary" />
          ) : (
            <Shield color="secondary" />
          )}
        </Box>

        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Typography variant="subtitle1" fontWeight="medium">
              {config.display_name}
            </Typography>
            {config.is_active && (
              <Chip label="Active" color="success" size="small" />
            )}
            {config.is_configured ? (
              <Chip
                icon={<CheckCircle />}
                label="Configured"
                color="success"
                variant="outlined"
                size="small"
              />
            ) : (
              <Chip
                icon={<Cancel />}
                label="Not Configured"
                color="warning"
                variant="outlined"
                size="small"
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            Okta OIDC Authentication
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Settings />}
          onClick={onEdit}
          disabled={saving}
        >
          Configure
        </Button>
        {config.is_configured && !config.is_active && (
          <Button
            variant="contained"
            size="small"
            onClick={onActivate}
            disabled={saving}
          >
            {saving && <CircularProgress size={16} sx={{ mr: 1 }} />}
            Activate
          </Button>
        )}
      </Box>
    </Paper>
  );
}

/**
 * IDP Edit Dialog
 */
function IdpEditDialog({
  config,
  onClose,
  onSave,
  saving,
}: {
  config: IdpConfig;
  onClose: () => void;
  onSave: (providerType: string, data: Record<string, string>) => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState<Record<string, string>>(
    config.config as Record<string, string>
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config.provider_type, formData);
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configure {config.display_name}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Enter your Okta OIDC credentials. Client secrets are stored securely in AWS Secrets Manager.
        </DialogContentText>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <OktaConfigFields formData={formData} setFormData={setFormData} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving && <CircularProgress size={16} sx={{ mr: 1 }} />}
          Save Configuration
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Okta-specific configuration fields
 */
function OktaConfigFields({
  formData,
  setFormData,
}: {
  formData: Record<string, string>;
  setFormData: (data: Record<string, string>) => void;
}) {
  return (
    <>
      <TextField
        fullWidth
        label="Client ID"
        aria-label="Okta Client ID"
        value={formData.client_id || ""}
        onChange={(e) =>
          setFormData({ ...formData, client_id: e.target.value })
        }
        placeholder="0oax0eaf3bgW5NP73697"
        required
      />

      <TextField
        fullWidth
        label="Issuer URL"
        aria-label="Okta Issuer URL"
        value={formData.issuer || ""}
        onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
        placeholder="https://your-domain.okta.com/oauth2/default"
        helperText="Usually: https://your-domain.okta.com/oauth2/default"
        required
      />

      <TextField
        fullWidth
        label="JWKS URI (optional)"
        aria-label="JWKS URI"
        value={formData.jwks_uri || ""}
        onChange={(e) => setFormData({ ...formData, jwks_uri: e.target.value })}
        placeholder="https://your-domain.okta.com/oauth2/default/v1/keys"
        helperText="Auto-derived from issuer if not provided"
      />

      <Alert severity="info" icon={<VpnKey />}>
        Client Secret is managed separately in AWS Secrets Manager for security.
      </Alert>
    </>
  );
}

export default IdpConfigCard;
