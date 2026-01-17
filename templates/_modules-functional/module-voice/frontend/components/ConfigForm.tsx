/**
 * Module Voice - Config Form Component
 *
 * Form for creating and editing voice interview configurations.
 * Manages Pipecat settings including voice, transcription, and interview parameters.
 */

import React, { useState, useEffect } from "react";
import type {
  VoiceConfig,
  VoiceConfigJson,
  CreateVoiceConfigRequest,
  UpdateVoiceConfigRequest,
} from "../types";

// =============================================================================
// PROPS
// =============================================================================

export interface ConfigFormProps {
  /** Existing config for editing (null for create mode) */
  config?: VoiceConfig | null;
  /** Organization ID for new configs */
  orgId: string;
  /** Submit handler */
  onSubmit: (data: CreateVoiceConfigRequest | UpdateVoiceConfigRequest) => Promise<void>;
  /** Cancel handler */
  onCancel: () => void;
  /** Loading state */
  loading?: boolean;
  /** Custom className */
  className?: string;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const defaultConfigJson: VoiceConfigJson = {
  bot_name: "AI Interviewer",
  system_prompt: "You are a professional interviewer conducting a structured interview. Be polite, professional, and thorough.",
  initial_message: "Hello! Thank you for joining today. I'll be conducting your interview. Are you ready to begin?",
  voice: {
    provider: "cartesia",
    voice_id: "default",
    speed: 1.0,
  },
  transcription: {
    provider: "deepgram",
    language: "en",
    model: "nova-2",
  },
  llm: {
    provider: "openai",
    model: "gpt-4",
    temperature: 0.7,
    max_tokens: 500,
  },
  interview: {
    max_duration_minutes: 30,
    questions: [],
    scoring_rubric: {
      criteria: [],
    },
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Config Form Component
 *
 * @example
 * ```tsx
 * <ConfigForm
 *   config={existingConfig}
 *   orgId={currentOrg.id}
 *   onSubmit={handleSave}
 *   onCancel={() => setShowForm(false)}
 * />
 * ```
 */
export function ConfigForm({
  config,
  orgId,
  onSubmit,
  onCancel,
  loading = false,
  className = "",
}: ConfigFormProps) {
  const isEditMode = !!config;

  // Form state
  const [name, setName] = useState(config?.name || "");
  const [interviewType, setInterviewType] = useState(config?.interviewType || "general");
  const [description, setDescription] = useState(config?.description || "");
  const [configJson, setConfigJson] = useState<VoiceConfigJson>(
    config?.configJson || defaultConfigJson
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync with prop changes (for edit mode)
  useEffect(() => {
    if (config) {
      setName(config.name);
      setInterviewType(config.interviewType);
      setDescription(config.description || "");
      setConfigJson(config.configJson);
    }
  }, [config]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!interviewType.trim()) {
      newErrors.interviewType = "Interview type is required";
    }
    if (!configJson.system_prompt?.trim()) {
      newErrors.systemPrompt = "System prompt is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || loading) return;

    if (isEditMode) {
      const updateData: UpdateVoiceConfigRequest = {
        name,
        interviewType,
        description: description || null,
        configJson,
      };
      await onSubmit(updateData);
    } else {
      const createData: CreateVoiceConfigRequest = {
        orgId,
        name,
        interviewType,
        description: description || undefined,
        configJson,
      };
      await onSubmit(createData);
    }
  };

  // Update nested config
  const updateConfigField = <K extends keyof VoiceConfigJson>(
    key: K,
    value: VoiceConfigJson[K]
  ) => {
    setConfigJson((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* Basic Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

        {/* Name */}
        <div>
          <label htmlFor="config-name" className="block text-sm font-medium text-gray-700">
            Configuration Name *
          </label>
          <input
            id="config-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Technical Interview - Senior"
            className={`mt-1 block w-full rounded-md border ${
              errors.name ? "border-red-300" : "border-gray-300"
            } px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500`}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>

        {/* Interview Type */}
        <div>
          <label htmlFor="interview-type" className="block text-sm font-medium text-gray-700">
            Interview Type *
          </label>
          <select
            id="interview-type"
            value={interviewType}
            onChange={(e) => setInterviewType(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="general">General</option>
            <option value="technical">Technical</option>
            <option value="behavioral">Behavioral</option>
            <option value="screening">Screening</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional description of this configuration"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Bot Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">AI Bot Settings</h3>

        {/* Bot Name */}
        <div>
          <label htmlFor="bot-name" className="block text-sm font-medium text-gray-700">
            Bot Name
          </label>
          <input
            id="bot-name"
            type="text"
            value={configJson.bot_name || ""}
            onChange={(e) => updateConfigField("bot_name", e.target.value)}
            placeholder="AI Interviewer"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* System Prompt */}
        <div>
          <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-700">
            System Prompt *
          </label>
          <textarea
            id="system-prompt"
            value={configJson.system_prompt || ""}
            onChange={(e) => updateConfigField("system_prompt", e.target.value)}
            rows={4}
            placeholder="Define how the AI should behave during the interview..."
            className={`mt-1 block w-full rounded-md border ${
              errors.systemPrompt ? "border-red-300" : "border-gray-300"
            } px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500`}
          />
          {errors.systemPrompt && (
            <p className="mt-1 text-xs text-red-600">{errors.systemPrompt}</p>
          )}
        </div>

        {/* Initial Message */}
        <div>
          <label htmlFor="initial-message" className="block text-sm font-medium text-gray-700">
            Initial Message
          </label>
          <textarea
            id="initial-message"
            value={configJson.initial_message || ""}
            onChange={(e) => updateConfigField("initial_message", e.target.value)}
            rows={2}
            placeholder="The first message the bot will say..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Voice Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Voice Settings</h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Voice Provider */}
          <div>
            <label htmlFor="voice-provider" className="block text-sm font-medium text-gray-700">
              Voice Provider
            </label>
            <select
              id="voice-provider"
              value={configJson.voice?.provider || "cartesia"}
              onChange={(e) =>
                updateConfigField("voice", {
                  ...configJson.voice,
                  provider: e.target.value,
                })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="cartesia">Cartesia</option>
              <option value="elevenlabs">ElevenLabs</option>
            </select>
          </div>

          {/* Voice Speed */}
          <div>
            <label htmlFor="voice-speed" className="block text-sm font-medium text-gray-700">
              Voice Speed: {configJson.voice?.speed || 1.0}x
            </label>
            <input
              id="voice-speed"
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={configJson.voice?.speed || 1.0}
              onChange={(e) =>
                updateConfigField("voice", {
                  ...configJson.voice,
                  speed: parseFloat(e.target.value),
                })
              }
              className="mt-1 block w-full"
            />
          </div>
        </div>
      </div>

      {/* Interview Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Interview Settings</h3>

        {/* Max Duration */}
        <div>
          <label htmlFor="max-duration" className="block text-sm font-medium text-gray-700">
            Max Duration (minutes)
          </label>
          <input
            id="max-duration"
            type="number"
            min="5"
            max="120"
            value={configJson.interview?.max_duration_minutes || 30}
            onChange={(e) =>
              updateConfigField("interview", {
                ...configJson.interview,
                max_duration_minutes: parseInt(e.target.value, 10),
              })
            }
            className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "Saving..." : isEditMode ? "Save Changes" : "Create Configuration"}
        </button>
      </div>
    </form>
  );
}

export default ConfigForm;
