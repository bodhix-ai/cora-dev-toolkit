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
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Voice Service Configuration
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage platform-wide voice service credentials. These credentials are used
        by all organizations unless they configure their own.
      </p>
    </div>
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
    </div>
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
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Failed to load credentials
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
        {error.message}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Try Again
      </button>
    </div>
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
    <div className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-2xl bg-gray-100 dark:bg-gray-700 rounded-lg">
        {service.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {service.name}
          </h3>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              isConfigured
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
            }`}
          >
            {isConfigured ? "Configured" : "Not Configured"}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {service.description}
        </p>
        {credential && (
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Last updated: {new Date(credential.updatedAt).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isConfigured && (
          <>
            <button
              onClick={onValidate}
              disabled={isValidating}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {isValidating ? "Validating..." : "Validate"}
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
              title="Remove credential"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </>
        )}
        <button
          onClick={onConfigure}
          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          {isConfigured ? "Update" : "Configure"}
        </button>
      </div>
    </div>
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

  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl m-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Configure {service.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The API key will be stored securely in AWS Secrets Manager.
            </p>
          </div>
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !apiKey.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Credential"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SysVoiceConfigPage({
  className = "",
  loadingComponent,
}: SysVoiceConfigPageProps) {
  // State
  const [credentials, setCredentials] = useState<VoiceCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [configureService, setConfigureService] = useState<(typeof VOICE_SERVICES)[number] | null>(null);
  const [validatingService, setValidatingService] = useState<string | null>(null);

  // Load credentials on mount
  React.useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual API call
      // const response = await voiceApi.getCredentials({ scope: 'platform' });
      // setCredentials(response.data);
      setCredentials([]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load credentials"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCredential = useCallback(async (data: CredentialFormData) => {
    // TODO: Replace with actual API call
    // await voiceApi.createCredential({
    //   serviceName: data.serviceName,
    //   apiKey: data.apiKey,
    //   scope: 'platform'
    // });
    console.log("Saving credential:", data);
    await loadCredentials();
  }, []);

  const handleValidateCredential = useCallback(async (serviceName: string) => {
    setValidatingService(serviceName);
    try {
      // TODO: Replace with actual API call
      // await voiceApi.validateCredential(credentialId);
      console.log("Validating credential for:", serviceName);
      // Show success toast
    } catch (err) {
      // Show error toast
      console.error("Validation failed:", err);
    } finally {
      setValidatingService(null);
    }
  }, []);

  const handleDeleteCredential = useCallback(async (serviceName: string) => {
    if (!window.confirm(`Are you sure you want to remove the ${serviceName} credential?`)) {
      return;
    }
    try {
      // TODO: Replace with actual API call
      // await voiceApi.deleteCredential(credentialId);
      console.log("Deleting credential for:", serviceName);
      await loadCredentials();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }, []);

  const getCredentialForService = (serviceName: string): VoiceCredential | null => {
    return credentials.find((c) => c.serviceName === serviceName) || null;
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        {loadingComponent || <LoadingState />}
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <ErrorState error={error} onRetry={loadCredentials} />
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Page Header */}
      <PageHeader />

      {/* Voice Service Credentials */}
      <Section
        title="Service Credentials"
        description="Configure API keys for external voice services."
      >
        <div className="space-y-4">
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
        </div>
      </Section>

      {/* ECS Configuration */}
      <Section
        title="Bot Runtime Configuration"
        description="Configure the ECS/Fargate settings for Pipecat bot instances."
      >
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Bot runtime configuration is managed through Terraform infrastructure.
            See the deployment documentation for details on configuring ECS clusters,
            task definitions, and scaling policies.
          </p>
        </div>
      </Section>

      {/* Info Banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Platform Credentials:</strong> These credentials serve as defaults
              for all organizations. Individual organizations can configure their own
              credentials through their Voice Settings page.
            </p>
          </div>
        </div>
      </div>

      {/* Credential Dialog */}
      <CredentialDialog
        isOpen={!!configureService}
        service={configureService}
        onSave={handleSaveCredential}
        onClose={() => setConfigureService(null)}
      />
    </div>
  );
}

export default SysVoiceConfigPage;
