"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  FormHelperText,
} from "@mui/material";
import { createAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";
import { createOrgModuleClient } from "../../lib/api";
import { useUser } from "../../contexts/UserContext";
import { generateSlug } from "../../lib/validation";

/**
 * Create Organization Component
 *
 * First-time user onboarding flow to create a new organization.
 * Displayed when a user logs in but has no organizations.
 *
 * Features:
 * - Organization name input with validation
 * - Auto-generates slug from organization name
 * - Industry and company size selection
 * - Creates org, org_profile, org_members, and org_config records
 * - Sets user as owner with super_admin role
 * - Redirects to dashboard on success
 */

interface CreateOrganizationProps {
  onSuccess?: () => void;
  onSkip?: () => void;
}

export function CreateOrganization({
  onSuccess,
  onSkip,
}: CreateOrganizationProps) {
  const router = useRouter();
  const { refreshUserContext, authAdapter } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    industry: "",
    companySize: "",
  });

  // Auto-generate slug from organization name
  const handleNameChange = (name: string) => {
    const slug = generateSlug(name);
    setFormData({ ...formData, name, slug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Organization name is required");
      return;
    }

    setIsLoading(true);

    try {
      if (!authAdapter) {
        throw new Error("Auth adapter not available");
      }
      const token = await authAdapter.getToken();
      if (!token) {
        throw new Error("Authentication token not found");
      }
      const client = createAuthenticatedClient(token);
      const api = createOrgModuleClient(client);

      // Create organization using org-module API
      const response = await api.createOrganization({
        name: formData.name,
        slug: formData.slug,
      });

      if (response.success && response.data) {
        // Refresh user context to load the new organization
        await refreshUserContext();

        // Redirect to dashboard or call success callback
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/dashboard");
        }
      } else {
        setError("Failed to create organization");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create organization";
      setError(errorMessage);
      console.error("Error creating organization:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 12,
        px: { xs: 4, sm: 6, lg: 8 },
      }}
    >
      <Box sx={{ maxWidth: "448px", width: "100%" }}>
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="h3"
            sx={{
              mt: 6,
              textAlign: "center",
              fontSize: "1.875rem",
              fontWeight: 800,
              color: (theme) =>
                theme.palette.mode === "dark" ? "grey.100" : "grey.900",
            }}
          >
            Create Your Organization
          </Typography>
          <Typography
            sx={{
              mt: 2,
              textAlign: "center",
              fontSize: "0.875rem",
              color: (theme) =>
                theme.palette.mode === "dark" ? "grey.400" : "grey.600",
            }}
          >
            Get started by creating your organization workspace
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 8 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* Organization Name */}
            <Box>
              <Typography
                component="label"
                htmlFor="org-name"
                sx={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "grey.300" : "grey.700",
                  mb: 1,
                }}
              >
                Organization Name <Box component="span" sx={{ color: "error.main" }}>*</Box>
              </Typography>
              <TextField
                id="org-name"
                name="name"
                type="text"
                required
                fullWidth
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Acme Corporation"
                aria-label="Organization Name"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "#27272a" : "white",
                  },
                }}
              />
            </Box>

            {/* Organization Slug */}
            <Box>
              <Typography
                component="label"
                htmlFor="org-slug"
                sx={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "grey.300" : "grey.700",
                  mb: 1,
                }}
              >
                URL Slug
              </Typography>
              <TextField
                id="org-slug"
                name="slug"
                type="text"
                fullWidth
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                placeholder="acme-corporation"
                aria-label="URL Slug"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "#27272a" : "white",
                  },
                }}
              />
              <FormHelperText sx={{ mt: 1, fontSize: "0.75rem" }}>
                Used in URLs and must be unique
              </FormHelperText>
            </Box>

            {/* Industry */}
            <FormControl fullWidth>
              <Typography
                component="label"
                htmlFor="industry"
                sx={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "grey.300" : "grey.700",
                  mb: 1,
                }}
              >
                Industry
              </Typography>
              <Select
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
                aria-label="Industry"
                displayEmpty
                sx={{
                  borderRadius: "12px",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "#27272a" : "white",
                }}
              >
                <MenuItem value="">Select industry</MenuItem>
                <MenuItem value="technology">Technology</MenuItem>
                <MenuItem value="healthcare">Healthcare</MenuItem>
                <MenuItem value="finance">Finance</MenuItem>
                <MenuItem value="education">Education</MenuItem>
                <MenuItem value="manufacturing">Manufacturing</MenuItem>
                <MenuItem value="retail">Retail</MenuItem>
                <MenuItem value="consulting">Consulting</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            {/* Company Size */}
            <FormControl fullWidth>
              <Typography
                component="label"
                htmlFor="company-size"
                sx={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "grey.300" : "grey.700",
                  mb: 1,
                }}
              >
                Company Size
              </Typography>
              <Select
                id="company-size"
                name="companySize"
                value={formData.companySize}
                onChange={(e) =>
                  setFormData({ ...formData, companySize: e.target.value })
                }
                aria-label="Company Size"
                displayEmpty
                sx={{
                  borderRadius: "12px",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "#27272a" : "white",
                }}
              >
                <MenuItem value="">Select company size</MenuItem>
                <MenuItem value="1-10">1-10 employees</MenuItem>
                <MenuItem value="11-50">11-50 employees</MenuItem>
                <MenuItem value="51-200">51-200 employees</MenuItem>
                <MenuItem value="201-500">201-500 employees</MenuItem>
                <MenuItem value="501-1000">501-1000 employees</MenuItem>
                <MenuItem value="1000+">1000+ employees</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mt: 4 }}>
              {error}
            </Alert>
          )}

          {/* Submit Button */}
          <Box sx={{ mt: 6 }}>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              sx={{
                py: 2,
                px: 4,
                fontSize: "0.875rem",
                fontWeight: 500,
                borderRadius: "8px",
                textTransform: "none",
                bgcolor: "primary.main",
                "&:hover": {
                  bgcolor: "primary.dark",
                },
                "&:disabled": {
                  opacity: 0.5,
                  cursor: "not-allowed",
                },
              }}
            >
              {isLoading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <CircularProgress size={20} sx={{ color: "white" }} />
                  Creating organization...
                </Box>
              ) : (
                "Create Organization"
              )}
            </Button>
          </Box>

          {/* Skip Option */}
          {onSkip && (
            <Box sx={{ textAlign: "center", mt: 4 }}>
              <Button
                type="button"
                onClick={onSkip}
                sx={{
                  fontSize: "0.875rem",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "grey.400" : "grey.600",
                  textDecoration: "underline",
                  textTransform: "none",
                  "&:hover": {
                    color: (theme) =>
                      theme.palette.mode === "dark" ? "grey.200" : "grey.900",
                    bgcolor: "transparent",
                  },
                }}
              >
                Skip for now
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}