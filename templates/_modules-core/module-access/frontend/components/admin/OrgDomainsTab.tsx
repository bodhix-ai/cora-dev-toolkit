"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  AlertTitle,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import {
  Add,
  Delete,
  CheckCircle,
  Warning,
  Language,
} from "@mui/icons-material";
import { CoraAuthAdapter, createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";

/**
 * Email Domain type
 */
interface EmailDomain {
  id: string;
  domain: string;
  is_verified: boolean;
  default_role: "org_user" | "org_admin" | "org_owner";
  auto_provision: boolean;
  created_at: string;
}

interface OrgDomainsTabProps {
  orgId: string;
  authAdapter: CoraAuthAdapter;
}

/**
 * Organization Email Domains Tab
 * 
 * Manages email domains for an organization, including:
 * - Adding/removing domains
 * - Domain verification
 * - Auto-provisioning settings
 */
export function OrgDomainsTab({ orgId, authAdapter }: OrgDomainsTabProps) {
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchDomains();
  }, [orgId]);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await authAdapter.getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }
      const apiClient = createCoraAuthenticatedClient(token);
      const response = await apiClient.get<{ success: boolean; data: EmailDomain[] }>(`/orgs/${orgId}/email-domains`);
      if (response.success) {
        setDomains(response.data || []);
      } else {
        setError("Failed to load email domains");
      }
    } catch (err) {
      setError("Failed to load email domains");
      console.error("Error fetching domains:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = () => {
    setIsAdding(false);
    fetchDomains();
  };

  const handleDelete = async (domainId: string) => {
    if (!confirm("Are you sure you want to delete this email domain?")) {
      return;
    }

    try {
      const token = await authAdapter.getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }
      const apiClient = createCoraAuthenticatedClient(token);
      const response = await apiClient.delete<{ success: boolean }>(
        `/orgs/${orgId}/email-domains/${domainId}`
      );
      if (response.success) {
        fetchDomains();
      } else {
        setError("Failed to delete email domain");
      }
    } catch (err) {
      setError("Failed to delete email domain");
      console.error("Error deleting domain:", err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">Email Domains</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setIsAdding(true)}
        >
          Add Domain
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {domains.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No email domains configured.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add a domain to enable auto-provisioning for users with matching email addresses.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Domain</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Default Role</TableCell>
                <TableCell>Auto-Provision</TableCell>
                <TableCell>Added</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {domains.map((domain) => (
                <TableRow key={domain.id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Language fontSize="small" color="primary" />
                      <Typography variant="body2" fontFamily="monospace">
                        {domain.domain}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {domain.is_verified ? (
                      <Chip
                        icon={<CheckCircle />}
                        label="Verified"
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip
                        icon={<Warning />}
                        label="Pending Verification"
                        color="warning"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={domain.default_role.replace("org_", "")}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={domain.auto_provision ? "Enabled" : "Disabled"}
                      size="small"
                      color={domain.auto_provision ? "success" : "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(domain.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(domain.id)}
                      title="Delete domain"
                      aria-label={`Delete domain ${domain.domain}`}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Domain Dialog */}
      {isAdding && (
        <AddDomainDialog
          orgId={orgId}
          authAdapter={authAdapter}
          onClose={() => setIsAdding(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </Box>
  );
}

/**
 * Add Domain Dialog
 */
function AddDomainDialog({
  orgId,
  authAdapter,
  onClose,
  onSuccess,
}: {
  orgId: string;
  authAdapter: CoraAuthAdapter;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    domain: "",
    default_role: "org_user" as "org_user" | "org_admin" | "org_owner",
    auto_provision: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const token = await authAdapter.getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }
      const apiClient = createCoraAuthenticatedClient(token);
      const response = await apiClient.post<{ success: boolean; data: EmailDomain }>(
        `/orgs/${orgId}/email-domains`,
        formData
      );

      if (response.success) {
        onSuccess();
      } else {
        setError("Failed to add email domain");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add email domain");
      console.error("Error adding domain:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Email Domain</DialogTitle>
      <DialogContent>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
        >
          {error && (
            <Alert severity="error">
              <AlertTitle>Error</AlertTitle>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Domain"
            aria-label="Email domain"
            value={formData.domain}
            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            placeholder="example.com"
            helperText="Users with this email domain will be auto-provisioned to this organization"
            required
          />

          <FormControl fullWidth>
            <InputLabel>Default Role</InputLabel>
            <Select
              value={formData.default_role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  default_role: e.target.value as any,
                })
              }
              label="Default Role"
              aria-label="Default role for auto-provisioned users"
            >
              <MenuItem value="org_user">Organization User</MenuItem>
              <MenuItem value="org_admin">Organization Admin</MenuItem>
              <MenuItem value="org_owner">Organization Owner</MenuItem>
            </Select>
            <FormHelperText>
              Role assigned to users auto-provisioned via this domain
            </FormHelperText>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Auto-Provision</InputLabel>
            <Select
              value={formData.auto_provision ? "enabled" : "disabled"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  auto_provision: e.target.value === "enabled",
                })
              }
              label="Auto-Provision"
              aria-label="Enable or disable auto-provisioning"
            >
              <MenuItem value="enabled">Enabled</MenuItem>
              <MenuItem value="disabled">Disabled</MenuItem>
            </Select>
            <FormHelperText>
              Automatically add users to this organization when they sign in
            </FormHelperText>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving && <CircularProgress size={16} sx={{ mr: 1 }} />}
          Add Domain
        </Button>
      </DialogActions>
    </Dialog>
  );
}
