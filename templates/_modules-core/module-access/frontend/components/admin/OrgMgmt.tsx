/**
 * Organization Management Component
 *
 * Platform admin interface for managing organizations.
 * Features:
 * - List all organizations
 * - Create new organizations
 * - Edit organization details and domain configuration
 * - Configure domain-based auto-provisioning
 *
 * Only accessible to sys_owner and sys_admin roles.
 */

"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
} from "@mui/material";
import {
  Business,
  Add,
  Edit,
  Delete,
  Language,
  People,
} from "@mui/icons-material";

/**
 * Organization type
 */
interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  allowedDomain?: string;
  domainDefaultRole?: "org_user" | "org_admin" | "org_owner";
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Organization API payload types
 */
interface CreateOrganizationPayload {
  name: string;
  slug: string;
  description?: string;
  allowedDomain?: string;
  domainDefaultRole?: "org_user" | "org_admin" | "org_owner";
}

interface UpdateOrganizationPayload {
  name: string;
  slug: string;
  description?: string;
  allowedDomain?: string;
  domainDefaultRole?: "org_user" | "org_admin" | "org_owner";
}

/**
 * Props for OrganizationManagement
 */
interface OrganizationManagementProps {
  /** Authenticated API client for making requests */
  apiClient: {
    get: <T = unknown>(url: string) => Promise<{ data: T; success: boolean }>;
    post: <T = unknown>(url: string, data: unknown) => Promise<{ data: T; success: boolean }>;
    put: <T = unknown>(url: string, data: unknown) => Promise<{ data: T; success: boolean }>;
    delete: (url: string) => Promise<{ success: boolean }>;
  };
}

/**
 * Organization Management Component
 */
export function OrganizationManagement({
  apiClient,
}: OrganizationManagementProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  // Fetch organizations on mount
  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<Organization[]>("/orgs");
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

  const handleEditSuccess = () => {
    setEditingOrg(null);
    fetchOrganizations();
  };

  const handleDelete = async (orgId: string) => {
    /*
    // Organization deletion not implemented in backend yet
    if (!confirm("Are you sure you want to delete this organization?")) {
      return;
    }

    try {
      // const response = await apiClient.delete_method(`/orgs/${orgId}`);
      // Mock success for now since backend is not implemented
      const response = { success: false, error: "Not implemented" }; 
      if (response.success) {
        fetchOrganizations();
      } else {
        setError("Failed to delete organization");
      }
    } catch (err) {
      setError("Failed to delete organization");
      console.error("Error deleting organization:", err);
    }
    */
    alert("Organization deletion is not currently supported.");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader avatar={<Business />} title="Organization Management" />
        <CardContent sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card>
        <CardHeader
          avatar={<Business />}
          title="Organization Management"
          subheader="Create and manage organizations, configure domain-based auto-provisioning"
          action={
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setIsCreating(true)}
            >
              Create Organization
            </Button>
          }
        />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Error</AlertTitle>
              {error}
            </Alert>
          )}

          <OrganizationList
            organizations={organizations}
            onEdit={setEditingOrg}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {/* Create Dialog */}
      {isCreating && (
        <CreateOrganizationDialog
          apiClient={apiClient}
          onClose={() => setIsCreating(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Edit Dialog */}
      {editingOrg && (
        <EditOrganizationDialog
          apiClient={apiClient}
          organization={editingOrg}
          onClose={() => setEditingOrg(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </Box>
  );
}

/**
 * Organization List Table
 */
function OrganizationList({
  organizations,
  onEdit,
  onDelete,
}: {
  organizations: Organization[];
  onEdit: (org: Organization) => void;
  onDelete: (orgId: string) => void;
}) {
  if (organizations.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No organizations found. Create one to get started.
        </Typography>
      </Box>
    );
  }

  return (
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
            <TableRow key={org.id} hover>
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
                {org.allowedDomain ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Language fontSize="small" color="primary" />
                    <Box>
                      <Typography variant="body2">{org.allowedDomain}</Typography>
                      <Chip
                        label={org.domainDefaultRole || "org_user"}
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
                  <Typography variant="body2">{org.memberCount || 0}</Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {new Date(org.createdAt).toLocaleDateString()}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={() => onEdit(org)}
                  title="Edit organization"
                  aria-label="Edit organization"
                >
                  <Edit fontSize="small" />
                </IconButton>
                {/* 
                <IconButton
                  size="small"
                  onClick={() => onDelete(org.id)}
                  title="Delete organization"
                  aria-label="Delete organization"
                  color="error"
                >
                  <Delete fontSize="small" />
                </IconButton>
                */}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * Create Organization Dialog
 */
function CreateOrganizationDialog({
  apiClient,
  onClose,
  onSuccess,
}: {
  apiClient: OrganizationManagementProps["apiClient"];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    allowedDomain: "",
    domainDefaultRole: "org_user" as "org_user" | "org_admin" | "org_owner",
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
      const payload: CreateOrganizationPayload = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
      };

      // Only include domain config if domain is set
      if (formData.allowedDomain) {
        payload.allowedDomain = formData.allowedDomain;
        payload.domainDefaultRole = formData.domainDefaultRole;
      }

      const response = await apiClient.post<Organization>("/orgs", payload);

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
            value={formData.allowedDomain}
            onChange={(e) => setFormData({ ...formData, allowedDomain: e.target.value })}
            placeholder="example.com"
            helperText="Users with this email domain will be auto-provisioned"
          />

          {formData.allowedDomain && (
            <FormControl fullWidth>
              <InputLabel>Default Role for Domain Users</InputLabel>
              <Select
                value={formData.domainDefaultRole}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    domainDefaultRole: e.target.value as "org_user" | "org_admin" | "org_owner",
                  })
                }
                label="Default Role for Domain Users"
                aria-label="Default Role for Domain Users"
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

/**
 * Edit Organization Dialog
 */
function EditOrganizationDialog({
  apiClient,
  organization,
  onClose,
  onSuccess,
}: {
  apiClient: OrganizationManagementProps["apiClient"];
  organization: Organization;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: organization.name,
    slug: organization.slug,
    description: organization.description || "",
    allowedDomain: organization.allowedDomain || "",
    domainDefaultRole:
      organization.domainDefaultRole || ("org_user" as "org_user" | "org_admin" | "org_owner"),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload: UpdateOrganizationPayload = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        allowedDomain: formData.allowedDomain || undefined,
        domainDefaultRole: formData.allowedDomain
          ? formData.domainDefaultRole
          : undefined,
      };

      const response = await apiClient.put<Organization>(`/orgs/${organization.id}`, payload);

      if (response.success) {
        onSuccess();
      } else {
        setError("Failed to update organization");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update organization");
      console.error("Error updating organization:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Organization</DialogTitle>
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
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <TextField
            fullWidth
            label="URL Slug"
            aria-label="URL Slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            helperText="Used in URLs and must be unique"
            required
          />

          <TextField
            fullWidth
            label="Description"
            aria-label="Organization Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={2}
          />

          <TextField
            fullWidth
            label="Allowed Domain (optional)"
            aria-label="Allowed Domain for auto-provisioning"
            value={formData.allowedDomain}
            onChange={(e) => setFormData({ ...formData, allowedDomain: e.target.value })}
            placeholder="example.com"
            helperText="Users with this email domain will be auto-provisioned"
          />

          {formData.allowedDomain && (
            <FormControl fullWidth>
              <InputLabel>Default Role for Domain Users</InputLabel>
              <Select
                value={formData.domainDefaultRole}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    domainDefaultRole: e.target.value as "org_user" | "org_admin" | "org_owner",
                  })
                }
                label="Default Role for Domain Users"
                aria-label="Default Role for Domain Users"
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
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default OrganizationManagement;
