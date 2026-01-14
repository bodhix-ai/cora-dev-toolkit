"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  MenuItem,
  Grid,
  Paper,
  Divider,
} from "@mui/material";
import { Save, Cancel } from "@mui/icons-material";
import { CoraAuthAdapter, createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";
import { OrgIcon } from "../common/OrgIcon";
import { ORG_ICON_OPTIONS } from "../../types";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  appName?: string | null;
  appIcon?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrgDetailsTabProps {
  orgId: string;
  authAdapter: CoraAuthAdapter;
  onUpdate?: () => void;
}

/**
 * Organization Details Tab Component
 * 
 * Displays and allows editing of organization metadata:
 * - Basic info: name, slug, description
 * - Branding: website, logo, app name, app icon
 */
export function OrgDetailsTab({ orgId, authAdapter, onUpdate }: OrgDetailsTabProps) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    websiteUrl: "",
    logoUrl: "",
    appName: "",
    appIcon: "",
  });

  useEffect(() => {
    fetchOrganization();
  }, [orgId]);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await authAdapter.getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }
      const apiClient = createCoraAuthenticatedClient(token);
      const response = await apiClient.get<{ success: boolean; data: Organization }>(
        `/orgs/${orgId}`
      );
      if (response.success) {
        setOrganization(response.data);
        setFormData({
          name: response.data.name || "",
          slug: response.data.slug || "",
          description: response.data.description || "",
          websiteUrl: response.data.websiteUrl || "",
          logoUrl: response.data.logoUrl || "",
          appName: response.data.appName || "",
          appIcon: response.data.appIcon || "",
        });
      } else {
        setError("Failed to load organization");
      }
    } catch (err) {
      setError("Failed to load organization");
      console.error("Error fetching organization:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccessMessage(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setSuccessMessage(null);
    // Reset form to original values
    if (organization) {
      setFormData({
        name: organization.name || "",
        slug: organization.slug || "",
        description: organization.description || "",
        websiteUrl: organization.websiteUrl || "",
        logoUrl: organization.logoUrl || "",
        appName: organization.appName || "",
        appIcon: organization.appIcon || "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    try {
      setSaving(true);
      const token = await authAdapter.getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const apiClient = createCoraAuthenticatedClient(token);
      
      // Only send changed fields
      const updateData: Partial<{
        name: string;
        slug: string;
        description: string | null;
        website_url: string | null;
        logo_url: string | null;
        app_name: string | null;
        app_icon: string | null;
      }> = {};
      if (formData.name !== organization?.name) updateData.name = formData.name;
      if (formData.slug !== organization?.slug) updateData.slug = formData.slug;
      if (formData.description !== organization?.description) {
        updateData.description = formData.description || null;
      }
      if (formData.websiteUrl !== organization?.websiteUrl) {
        updateData.website_url = formData.websiteUrl || null;
      }
      if (formData.logoUrl !== organization?.logoUrl) {
        updateData.logo_url = formData.logoUrl || null;
      }
      if (formData.appName !== organization?.appName) {
        updateData.app_name = formData.appName || null;
      }
      if (formData.appIcon !== organization?.appIcon) {
        updateData.app_icon = formData.appIcon || null;
      }

      const response = await apiClient.put<{ success: boolean; data: Organization }>(
        `/orgs/${orgId}`,
        updateData
      );

      if (response.success) {
        setOrganization(response.data);
        setSuccessMessage("Organization updated successfully");
        setIsEditing(false);
        if (onUpdate) {
          onUpdate();
        }
      } else {
        setError("Failed to update organization");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update organization";
      setError(errorMessage);
      console.error("Error updating organization:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !organization) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h5">Organization Information</Typography>
          {!isEditing && (
            <Button variant="contained" onClick={handleEdit}>
              Edit Organization
            </Button>
          )}
        </Box>

        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Basic Information Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Organization Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  helperText="The display name of your organization"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Slug"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  helperText="URL-friendly identifier (e.g., my-company)"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  helperText="A brief description of your organization"
                />
              </Grid>

              {/* Branding Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Branding & Appearance
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Website URL"
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  helperText="Your organization's website"
                  placeholder="https://example.com"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Logo URL"
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  helperText="URL to your organization's logo image"
                  placeholder="https://example.com/logo.png"
                />
              </Grid>

              {/* App Branding Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  App Branding (Sidebar)
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="App Name"
                  value={formData.appName}
                  onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                  helperText="Custom app name displayed in sidebar (defaults to org name)"
                  placeholder="AI Assistant"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="App Icon"
                  value={formData.appIcon || ""}
                  onChange={(e) => setFormData({ ...formData, appIcon: e.target.value })}
                  helperText="Icon displayed in sidebar"
                >
                  <MenuItem value="">
                    <em>Default (Sparkles)</em>
                  </MenuItem>
                  {ORG_ICON_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <OrgIcon iconName={option.value} fontSize="small" />
                        <span>{option.label}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* App Icon Preview */}
              {formData.appIcon && (
                <Grid item xs={12}>
                  <Box
                    sx={{
                      p: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      bgcolor: "background.paper",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Sidebar Preview:
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                      <OrgIcon
                        iconName={formData.appIcon}
                        className="text-blue-600"
                        fontSize="medium"
                      />
                      <Typography variant="body1" fontWeight="500">
                        {formData.appName || formData.name || "Your App"}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Cancel />}
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        ) : (
          <Grid container spacing={2}>
            {/* Read-only display */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Name:
              </Typography>
              <Typography variant="body1">{organization?.name}</Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Slug:
              </Typography>
              <Typography variant="body1" fontFamily="monospace">
                {organization?.slug}
              </Typography>
            </Grid>

            {organization?.description && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Description:
                </Typography>
                <Typography variant="body1">{organization.description}</Typography>
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Branding & Appearance
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            {organization?.websiteUrl && (
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Website:
                </Typography>
                <Typography variant="body1">
                  <a 
                    href={organization.websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label={`Visit website: ${organization.websiteUrl}`}
                  >
                    {organization.websiteUrl}
                  </a>
                </Typography>
              </Grid>
            )}

            {organization?.logoUrl && (
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Logo:
                </Typography>
                <Typography variant="body1">
                  <a 
                    href={organization.logoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label={`View logo: ${organization.logoUrl}`}
                  >
                    {organization.logoUrl}
                  </a>
                </Typography>
              </Grid>
            )}

            {(organization?.appName || organization?.appIcon) && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    App Branding (Sidebar)
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>

                {organization?.appName && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      App Name:
                    </Typography>
                    <Typography variant="body1">{organization.appName}</Typography>
                  </Grid>
                )}

                {organization?.appIcon && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      App Icon:
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                      <OrgIcon iconName={organization.appIcon} fontSize="small" />
                      <Typography variant="body1">
                        {ORG_ICON_OPTIONS.find((opt) => opt.value === organization.appIcon)?.label}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Box
                    sx={{
                      p: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      bgcolor: "background.paper",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Sidebar Preview:
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                      <OrgIcon
                        iconName={organization.appIcon}
                        className="text-blue-600"
                        fontSize="medium"
                      />
                      <Typography variant="body1" fontWeight="500">
                        {organization.appName || organization.name}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                System Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Created:
              </Typography>
              <Typography variant="body1">
                {organization?.createdAt && new Date(organization.createdAt).toLocaleString()}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Last Updated:
              </Typography>
              <Typography variant="body1">
                {organization?.updatedAt && new Date(organization.updatedAt).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        )}
      </Paper>
    </Box>
  );
}
