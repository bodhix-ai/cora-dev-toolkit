"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Create Your Organization
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Get started by creating your organization workspace
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            {/* Organization Name */}
            <div>
              <label
                htmlFor="org-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                id="org-name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Acme Corporation"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                aria-label="Organization Name"
              />
            </div>

            {/* Organization Slug */}
            <div>
              <label
                htmlFor="org-slug"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                URL Slug
              </label>
              <input
                id="org-slug"
                name="slug"
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                placeholder="acme-corporation"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                aria-label="URL Slug"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Used in URLs and must be unique
              </p>
            </div>

            {/* Industry */}
            <div>
              <label
                htmlFor="industry"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Industry
              </label>
              <select
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                aria-label="Industry"
              >
                <option value="">Select industry</option>
                <option value="technology">Technology</option>
                <option value="healthcare">Healthcare</option>
                <option value="finance">Finance</option>
                <option value="education">Education</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="retail">Retail</option>
                <option value="consulting">Consulting</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Company Size */}
            <div>
              <label
                htmlFor="company-size"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Company Size
              </label>
              <select
                id="company-size"
                name="companySize"
                value={formData.companySize}
                onChange={(e) =>
                  setFormData({ ...formData, companySize: e.target.value })
                }
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                aria-label="Company Size"
              >
                <option value="">Select company size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="501-1000">501-1000 employees</option>
                <option value="1000+">1000+ employees</option>
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating organization...
                </>
              ) : (
                "Create Organization"
              )}
            </button>
          </div>

          {/* Skip Option */}
          {onSkip && (
            <div className="text-center">
              <button
                type="button"
                onClick={onSkip}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline"
              >
                Skip for now
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
