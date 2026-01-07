"use client";

import { Box, Button, Stack, Typography, Alert, Skeleton } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useState } from "react";
import { useProviders } from "../../hooks/useProviders";
import { useModels } from "../../hooks/useModels";
import { ProviderCard } from "./ProviderCard";
import { ProviderForm } from "./ProviderForm";
import { ViewModelsModal } from "../models/ViewModelsModal";
import {
  AIProvider,
  CreateProviderInput,
  ValidationProgress,
  ValidationCategory,
} from "../../types";
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";

interface ProviderListProps {
  authAdapter: CoraAuthAdapter;
}

export function ProviderList({ authAdapter }: ProviderListProps) {
  const {
    providers,
    loading,
    error,
    discoveryLoading,
    refetch,
    createProvider,
    updateProvider,
    deleteProvider,
    discoverModels,
  } = useProviders(authAdapter);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(
    null
  );
  const [viewingModelsProviderId, setViewingModelsProviderId] = useState<
    string | null
  >(null);
  const [initialCategoryFilter, setInitialCategoryFilter] =
    useState<ValidationCategory | null>(null);
  const {
    models: viewingModels,
    loading: modelsLoading,
    validateModels,
  } = useModels(authAdapter, viewingModelsProviderId ?? undefined);
  const [validationProgress, setValidationProgress] = useState<
    Record<string, ValidationProgress>
  >({});

  const handleCreate = async (data: CreateProviderInput) => {
    const result = await createProvider(data);
    if (result) {
      setIsFormOpen(false);
    }
  };

  const handleUpdate = async (id: string, data: Partial<AIProvider>) => {
    // Filter out null values and only keep string or undefined
    const updateData: {
      displayName?: string;
      credentialsSecretPath?: string;
      isActive?: boolean;
      authMethod?: 'iam_role' | 'secrets_manager' | 'ssm_parameter';
    } = {};

    if (data.displayName !== null && data.displayName !== undefined) {
      updateData.displayName = data.displayName;
    }
    if (
      data.credentialsSecretPath !== null &&
      data.credentialsSecretPath !== undefined
    ) {
      updateData.credentialsSecretPath = data.credentialsSecretPath;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.authMethod !== null && data.authMethod !== undefined) {
      updateData.authMethod = data.authMethod;
    }

    const result = await updateProvider(id, updateData);
    if (result) {
      setEditingProvider(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this provider?")) {
      await deleteProvider(id);
    }
  };

  const handleDiscoverModels = async (providerId: string) => {
    const result = await discoverModels(providerId);
    if (result) {
      // Show success message (you could use a toast/snackbar here)
      console.log(
        `Successfully discovered ${result.models?.length || 0} models`
      );
      // Refetch providers to update model counts
      await refetch();
    }
  };

  const handleValidateModels = async (providerId: string) => {
    // Initialize progress tracking for the specific provider
    setValidationProgress((prev) => ({
      ...prev,
      [providerId]: {
        isValidating: true,
        validated: 0,
        total: 0,
        available: 0,
        unavailable: 0,
      },
    }));

    try {
      // Await the promise from validateModels, which resolves on completion
      await validateModels(providerId, (progress) => {
        setValidationProgress((prev) => ({
          ...prev,
          [providerId]: {
            isValidating: progress.isValidating ?? true,
            validated: progress.validated,
            total: progress.total,
            available: progress.available,
            unavailable: progress.unavailable,
            currentModel: progress.currentModel,
          },
        }));
      });

      // Now that validation is complete, refetch the provider list
      console.log(
        `Validation for provider ${providerId} complete. Refetching providers.`
      );
      await refetch();
    } catch (err) {
      console.error("Error during model validation:", err);
      // Optionally, show an error message to the user
    } finally {
      // Clear the progress indicator for this provider after a short delay
      setTimeout(() => {
        setValidationProgress((prev) => {
          const newState = { ...prev };
          delete newState[providerId];
          return newState;
        });
      }, 3000);
    }
  };

  const handleViewModels = (providerId: string) => {
    setViewingModelsProviderId(providerId);
    setInitialCategoryFilter(null);
  };

  const handleViewCategoryModels = (
    providerId: string,
    category: ValidationCategory
  ) => {
    setViewingModelsProviderId(providerId);
    setInitialCategoryFilter(category);
  };

  const handleCloseModelsModal = () => {
    setViewingModelsProviderId(null);
    setInitialCategoryFilter(null);
  };

  if (loading && providers.length === 0) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rectangular" height={100} />
        <Skeleton variant="rectangular" height={100} />
        <Skeleton variant="rectangular" height={100} />
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (providers.length === 0 && !isFormOpen) {
    return (
      <Box
        sx={{
          textAlign: "center",
          py: 8,
          px: 2,
        }}
      >
        <Typography variant="h6" gutterBottom>
          No AI Providers
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Add your first AI provider to start discovering models
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsFormOpen(true)}
        >
          Add Provider
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5">AI Providers</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsFormOpen(true)}
        >
          Add Provider
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onEdit={(p) => setEditingProvider(p)}
            onDelete={handleDelete}
            onDiscoverModels={handleDiscoverModels}
            onValidateModels={handleValidateModels}
            onViewModels={handleViewModels}
            onViewCategoryModels={handleViewCategoryModels}
            isDiscovering={discoveryLoading === provider.id}
            validationProgress={validationProgress[provider.id]}
          />
        ))}
      </Stack>

      {(isFormOpen || editingProvider) && (
        <ProviderForm
          open={isFormOpen || !!editingProvider}
          initialData={editingProvider || undefined}
          onSubmit={
            editingProvider
              ? (data) =>
                  handleUpdate(editingProvider.id, data as Partial<AIProvider>)
              : (data) => handleCreate(data as CreateProviderInput)
          }
          onCancel={() => {
            setIsFormOpen(false);
            setEditingProvider(null);
          }}
        />
      )}

      <ViewModelsModal
        open={!!viewingModelsProviderId}
        onClose={handleCloseModelsModal}
        models={viewingModels}
        providerName={
          providers.find((p) => p.id === viewingModelsProviderId)
            ?.displayName || undefined
        }
        loading={modelsLoading}
        initialCategoryFilter={initialCategoryFilter || undefined}
        initialStatusFilter="available"
      />
    </Box>
  );
}
