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
  ArrowForward,
  Language,
  People,
} from "@mui/icons-material";
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";
import { useRouter } from "next/navigation";

/**
 * Organization type
 */
interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  allowed_domain?: string;
  domain_default_role?: "org_user" | "org_admin" | "org_owner";
  member_count?: number;
  created_at: string;
  updated_at: string;
}

interface OrgsTabProps {
  authAdapter: CoraAuthAdapter;
}

/**
 * Organizations Tab Component
 * 
 * Displays list of all organizations for platform admins.
 * Clicking an organization navigates to the org details page.
 */
export function OrgsTab({ authAdapter }: OrgsTabProps) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAdapter.get("/orgs");
      if (response.success) {
        setOrganizations(response.data || []);
      } else {
        setError("Failed to load organizations");
      }
    } catch (err) {
      setError("Failed to load organizations");
      console.error("Error fetching organizations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setIsCreating(false);
    fetchOrganizations();
  };

  const handleViewDetails = (orgId: string) => {
    router.push(`/admin/access/orgs/${orgId}`);
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
        <Typography variant="h6">
          All Organizations
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setIsCreating(true)}
        >
          Create Organization
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {organizations.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No organizations found.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create one to get started.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Domain</TableCell>
                <TableCell align="center">Members</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {organizations.map((org) => (
                <TableRow 
                  key={org.id} 
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => handleViewDetails(org.id)}
                >
                  <TableCell>
                    <Typography variant="subtitle2">{org.name}</Typography>
                    {org.description && (
                      <Typography variant="body2" color="text.secondary">
                        {org.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {org.slug}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {org.allowed_domain ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Language fontSize="small" color="primary" />
                        <Box>
                          <Typography variant="body2">{org.allowed_domain}</Typography>
                          <Chip
                            label={org.domain_default_role || "org_user"}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not configured
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                      <People fontSize="small" color="action" />
                      <Typography variant="body2">{org.member_count || 0}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(org.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(org.id);
                      }}
                      title="View details"
                      aria-label={`View details for ${org.name}`}
                    >
                      <ArrowForward fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Organization Dialog */}
      {isCreating && (
        <CreateOrganizationDialog
          authAdapter={authAdapter}
          onClose={() => setIsCreating(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </Box>
  );
}

/**
 * Create Organization Dialog
 */
function CreateOrganizationDialog({
  authAdapter,
  onClose,
  onSuccess,
}: {
  authAdapter: CoraAuthAdapter;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    allowed_domain: "",
    domain_default_role: "org_user" as "org_user" | "org_admin" | "org_owner",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setFormData({ ...formData, name, slug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload: any = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
      };

      // Only include domain config if domain is set
      if (formData.allowed_domain) {
        payload.allowed_domain = formData.allowed_domain;
        payload.domain_default_role = formData.domain_default_role;
      }

      const response = await authAdapter.post("/orgs", payload);

      if (response.success) {
        onSuccess();
      } else {
        setError("Failed to create organization");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
      console.error("Error creating organization:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Organization</DialogTitle>
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
            label="Organization Name"
            aria-label="Organization Name"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., Acme Corporation"
            required
          />

          <TextField
            fullWidth
            label="URL Slug"
            aria-label="URL Slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="acme-corporation"
            helperText="Used in URLs and must be unique"
            required
          />

          <TextField
            fullWidth
            label="Description"
            aria-label="Organization Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the organization"
            multiline
            rows={2}
          />

          <TextField
            fullWidth
            label="Allowed Domain (optional)"
            aria-label="Allowed Domain for auto-provisioning"
            value={formData.allowed_domain}
            onChange={(e) => setFormData({ ...formData, allowed_domain: e.target.value })}
            placeholder="example.com"
            helperText="Users with this email domain will be auto-provisioned"
          />

          {formData.allowed_domain && (
            <FormControl fullWidth>
              <InputLabel>Default Role for Domain Users</InputLabel>
              <Select
                value={formData.domain_default_role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    domain_default_role: e.target.value as any,
                  })
                }
                label="Default Role for Domain Users"
                aria-label="Default role for auto-provisioned users"
              >
                <MenuItem value="org_user">Organization User</MenuItem>
                <MenuItem value="org_admin">Organization Admin</MenuItem>
                <MenuItem value="org_owner">Organization Owner</MenuItem>
              </Select>
              <FormHelperText>
                Role assigned to users auto-provisioned via domain
              </FormHelperText>
            </FormControl>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving && <CircularProgress size={16} sx={{ mr: 1 }} />}
          Create Organization
        </Button>
      </DialogActions>
    </Dialog>
  );
}
