/**
 * Module Voice - Config Form Component
 *
 * Form for creating and editing voice interview configurations.
 * Manages Pipecat settings including voice, transcription, and interview parameters.
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Slider,
  Grid,
} from "@mui/material";
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
    <Box
      component="form"
      onSubmit={handleSubmit}
      className={className}
      sx={{ display: "flex", flexDirection: "column", gap: 3 }}
    >
      {/* Basic Info */}
      <Card variant="outlined">
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="h6" component="h3">
            Basic Information
          </Typography>

          {/* Name */}
          <TextField
            id="config-name"
            label="Configuration Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Technical Interview - Senior"
            error={!!errors.name}
            helperText={errors.name}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "config-name-error" : undefined}
            FormHelperTextProps={{
              id: "config-name-error"
            }}
            fullWidth
            size="small"
          />

          {/* Interview Type */}
          <FormControl fullWidth size="small">
            <InputLabel id="interview-type-label">Interview Type *</InputLabel>
            <Select
              labelId="interview-type-label"
              id="interview-type"
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              label="Interview Type *"
            >
              <MenuItem value="general">General</MenuItem>
              <MenuItem value="technical">Technical</MenuItem>
              <MenuItem value="behavioral">Behavioral</MenuItem>
              <MenuItem value="screening">Screening</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>

          {/* Description */}
          <TextField
            id="description"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
            placeholder="Optional description of this configuration"
            fullWidth
            size="small"
          />
        </CardContent>
      </Card>

      {/* Bot Settings */}
      <Card variant="outlined">
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="h6" component="h3">
            AI Bot Settings
          </Typography>

          {/* Bot Name */}
          <TextField
            id="bot-name"
            label="Bot Name"
            value={configJson.bot_name || ""}
            onChange={(e) => updateConfigField("bot_name", e.target.value)}
            placeholder="AI Interviewer"
            fullWidth
            size="small"
          />

          {/* System Prompt */}
          <TextField
            id="system-prompt"
            label="System Prompt *"
            value={configJson.system_prompt || ""}
            onChange={(e) => updateConfigField("system_prompt", e.target.value)}
            multiline
            rows={4}
            placeholder="Define how the AI should behave during the interview..."
            error={!!errors.systemPrompt}
            helperText={errors.systemPrompt}
            aria-invalid={!!errors.systemPrompt}
            aria-describedby={errors.systemPrompt ? "system-prompt-error" : undefined}
            FormHelperTextProps={{
              id: "system-prompt-error"
            }}
            fullWidth
            size="small"
          />

          {/* Initial Message */}
          <TextField
            id="initial-message"
            label="Initial Message"
            value={configJson.initial_message || ""}
            onChange={(e) => updateConfigField("initial_message", e.target.value)}
            multiline
            rows={2}
            placeholder="The first message the bot will say..."
            fullWidth
            size="small"
          />
        </CardContent>
      </Card>

      {/* Voice Settings */}
      <Card variant="outlined">
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="h6" component="h3">
            Voice Settings
          </Typography>

          <Grid container spacing={2}>
            {/* Voice Provider */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="voice-provider-label">Voice Provider</InputLabel>
                <Select
                  labelId="voice-provider-label"
                  id="voice-provider"
                  value={configJson.voice?.provider || "cartesia"}
                  onChange={(e) =>
                    updateConfigField("voice", {
                      ...configJson.voice,
                      provider: e.target.value,
                    })
                  }
                  label="Voice Provider"
                >
                  <MenuItem value="cartesia">Cartesia</MenuItem>
                  <MenuItem value="elevenlabs">ElevenLabs</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Voice Speed */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" gutterBottom>
                Voice Speed: {configJson.voice?.speed || 1.0}x
              </Typography>
              <Slider
                id="voice-speed"
                value={configJson.voice?.speed || 1.0}
                onChange={(_, value) =>
                  updateConfigField("voice", {
                    ...configJson.voice,
                    speed: value as number,
                  })
                }
                min={0.5}
                max={2.0}
                step={0.1}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Interview Settings */}
      <Card variant="outlined">
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="h6" component="h3">
            Interview Settings
          </Typography>

          {/* Max Duration */}
          <TextField
            id="max-duration"
            label="Max Duration (minutes)"
            type="number"
            value={configJson.interview?.max_duration_minutes || 30}
            onChange={(e) =>
              updateConfigField("interview", {
                ...configJson.interview,
                max_duration_minutes: parseInt(e.target.value, 10),
              })
            }
            inputProps={{ min: 5, max: 120 }}
            sx={{ width: 200 }}
            size="small"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button
          type="button"
          onClick={onCancel}
          disabled={loading}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          variant="contained"
        >
          {loading ? "Saving..." : isEditMode ? "Save Changes" : "Create Configuration"}
        </Button>
      </Box>
    </Box>
  );
}

export default ConfigForm;
