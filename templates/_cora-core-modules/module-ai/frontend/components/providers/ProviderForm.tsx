"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  MenuItem,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { useState, useEffect } from "react";
import { AIProvider, CreateProviderInput, ProviderType } from "../../types";

interface ProviderFormProps {
  open: boolean;
  initialData?: AIProvider;
  onSubmit: (data: CreateProviderInput | Partial<AIProvider>) => Promise<void>;
  onCancel: () => void;
}

export function ProviderForm({
  open,
  initialData,
  onSubmit,
  onCancel,
}: ProviderFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    providerType: "aws_bedrock" as ProviderType,
    credentialsSecretPath: "",
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        displayName: initialData.displayName || "",
        providerType: initialData.providerType as ProviderType,
        credentialsSecretPath: initialData.credentialsSecretPath || "",
        isActive: initialData.isActive,
      });
    }
  }, [initialData]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.providerType) {
      newErrors.providerType = "Provider type is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      displayName: "",
      providerType: "aws_bedrock",
      credentialsSecretPath: "",
      isActive: true,
    });
    setErrors({});
    onCancel();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initialData ? "Edit Provider" : "Add Provider"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              error={!!errors.name}
              helperText={errors.name}
              required
              fullWidth
              disabled={!!initialData}
            />

            <TextField
              label="Display Name"
              value={formData.displayName}
              onChange={(e) =>
                setFormData({ ...formData, displayName: e.target.value })
              }
              fullWidth
            />

            <TextField
              select
              label="Provider Type"
              value={formData.providerType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  providerType: e.target.value as ProviderType,
                })
              }
              error={!!errors.providerType}
              helperText={errors.providerType}
              required
              fullWidth
              disabled={!!initialData}
            >
              <MenuItem value="aws_bedrock">AWS Bedrock</MenuItem>
              <MenuItem value="azure_openai">Azure OpenAI</MenuItem>
              <MenuItem value="openai">OpenAI</MenuItem>
            </TextField>

            <TextField
              label="Credentials Secret Path"
              value={formData.credentialsSecretPath}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  credentialsSecretPath: e.target.value,
                })
              }
              helperText="Path to credentials in AWS Secrets Manager"
              fullWidth
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
