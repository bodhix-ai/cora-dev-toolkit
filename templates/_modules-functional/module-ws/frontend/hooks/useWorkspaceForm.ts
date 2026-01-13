/**
 * useWorkspaceForm Hook
 *
 * Manages form state for creating and editing workspaces.
 * Provides validation, dirty checking, and submission handling.
 */

import { useState, useCallback, useMemo } from "react";
import type {
  WorkspaceFormValues,
  WorkspaceFormErrors,
  WorkspaceConfig,
  DEFAULT_WORKSPACE_FORM,
} from "../types";

export interface UseWorkspaceFormOptions {
  /** Initial form values */
  initialValues?: Partial<WorkspaceFormValues>;
  /** Workspace config for validation */
  config?: WorkspaceConfig | null;
  /** Callback when form is submitted */
  onSubmit?: (values: WorkspaceFormValues) => Promise<void>;
}

export interface UseWorkspaceFormReturn {
  /** Current form values */
  values: WorkspaceFormValues;
  /** Form validation errors */
  errors: WorkspaceFormErrors;
  /** Which fields have been touched */
  touched: Record<keyof WorkspaceFormValues, boolean>;
  /** Whether form has unsaved changes */
  isDirty: boolean;
  /** Whether form is currently submitting */
  isSubmitting: boolean;
  /** Whether form is valid */
  isValid: boolean;
  /** Update a single field */
  setFieldValue: <K extends keyof WorkspaceFormValues>(
    field: K,
    value: WorkspaceFormValues[K]
  ) => void;
  /** Mark a field as touched */
  setFieldTouched: (field: keyof WorkspaceFormValues) => void;
  /** Handle input change event */
  handleChange: (
    field: keyof WorkspaceFormValues
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** Handle blur event */
  handleBlur: (field: keyof WorkspaceFormValues) => () => void;
  /** Submit the form */
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  /** Reset form to initial values */
  reset: () => void;
  /** Validate all fields */
  validateAll: () => boolean;
  /** Add a tag */
  addTag: (tag: string) => void;
  /** Remove a tag */
  removeTag: (tag: string) => void;
}

const DEFAULT_VALUES: WorkspaceFormValues = {
  name: "",
  description: "",
  color: "#1976d2",
  icon: "Workspaces",
  tags: [],
};

export function useWorkspaceForm(
  options: UseWorkspaceFormOptions = {}
): UseWorkspaceFormReturn {
  const { initialValues, config, onSubmit } = options;

  // Merge initial values with defaults
  const defaultValues = useMemo(
    () => ({
      ...DEFAULT_VALUES,
      ...initialValues,
      color: initialValues?.color || config?.defaultColor || DEFAULT_VALUES.color,
    }),
    [initialValues, config]
  );

  const [values, setValues] = useState<WorkspaceFormValues>(defaultValues);
  const [errors, setErrors] = useState<WorkspaceFormErrors>({});
  const [touched, setTouched] = useState<Record<keyof WorkspaceFormValues, boolean>>({
    name: false,
    description: false,
    color: false,
    icon: false,
    tags: false,
    status: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate a single field
  const validateField = useCallback(
    (field: keyof WorkspaceFormValues, value: unknown): string | undefined => {
      switch (field) {
        case "name":
          if (!value || (typeof value === "string" && value.trim() === "")) {
            return "Name is required";
          }
          if (typeof value === "string" && value.length > 255) {
            return "Name must be 255 characters or less";
          }
          break;

        case "description":
          if (typeof value === "string" && value.length > 5000) {
            return "Description must be 5000 characters or less";
          }
          break;

        case "color":
          if (value && typeof value === "string") {
            const hexRegex = /^#[0-9A-Fa-f]{6}$/;
            if (!hexRegex.test(value)) {
              return "Invalid color format (use #RRGGBB)";
            }
          }
          break;

        case "tags":
          if (Array.isArray(value)) {
            const maxTags = config?.maxTagsPerWorkspace || 20;
            const maxTagLength = config?.maxTagLength || 50;

            if (value.length > maxTags) {
              return `Maximum ${maxTags} tags allowed`;
            }

            for (const tag of value) {
              if (typeof tag === "string" && tag.length > maxTagLength) {
                return `Tags must be ${maxTagLength} characters or less`;
              }
            }
          }
          break;
      }
      return undefined;
    },
    [config]
  );

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    const newErrors: WorkspaceFormErrors = {};
    let isValid = true;

    for (const field of Object.keys(values) as Array<keyof WorkspaceFormValues>) {
      const error = validateField(field, values[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [values, validateField]);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    return (
      values.name !== defaultValues.name ||
      values.description !== defaultValues.description ||
      values.color !== defaultValues.color ||
      values.icon !== defaultValues.icon ||
      JSON.stringify(values.tags) !== JSON.stringify(defaultValues.tags) ||
      values.status !== defaultValues.status
    );
  }, [values, defaultValues]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0 && (values.name || "").trim() !== "";
  }, [errors, values.name]);

  // Set a single field value
  const setFieldValue = useCallback(
    <K extends keyof WorkspaceFormValues>(field: K, value: WorkspaceFormValues[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));

      // Validate on change
      const error = validateField(field, value);
      setErrors((prev) => {
        if (error) {
          return { ...prev, [field]: error };
        }
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    },
    [validateField]
  );

  // Mark a field as touched
  const setFieldTouched = useCallback((field: keyof WorkspaceFormValues) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // Handle input change event
  const handleChange = useCallback(
    (field: keyof WorkspaceFormValues) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFieldValue(field, event.target.value as WorkspaceFormValues[typeof field]);
      },
    [setFieldValue]
  );

  // Handle blur event
  const handleBlur = useCallback(
    (field: keyof WorkspaceFormValues) => () => {
      setFieldTouched(field);
      validateField(field, values[field]);
    },
    [setFieldTouched, validateField, values]
  );

  // Submit handler
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      // Mark all fields as touched
      setTouched({
        name: true,
        description: true,
        color: true,
        icon: true,
        tags: true,
        status: true,
      });

      // Validate all fields
      if (!validateAll()) {
        return;
      }

      setIsSubmitting(true);

      try {
        if (onSubmit) {
          await onSubmit(values);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [validateAll, onSubmit, values]
  );

  // Reset form
  const reset = useCallback(() => {
    setValues(defaultValues);
    setErrors({});
    setTouched({
      name: false,
      description: false,
      color: false,
      icon: false,
      tags: false,
      status: false,
    });
    setIsSubmitting(false);
  }, [defaultValues]);

  // Add a tag
  const addTag = useCallback(
    (tag: string) => {
      const trimmedTag = tag.trim().toLowerCase();
      if (!trimmedTag) return;

      if (values.tags.includes(trimmedTag)) {
        return; // Already exists
      }

      const maxTags = config?.maxTagsPerWorkspace || 20;
      if (values.tags.length >= maxTags) {
        setErrors((prev) => ({ ...prev, tags: `Maximum ${maxTags} tags allowed` }));
        return;
      }

      const maxTagLength = config?.maxTagLength || 50;
      if (trimmedTag.length > maxTagLength) {
        setErrors((prev) => ({
          ...prev,
          tags: `Tags must be ${maxTagLength} characters or less`,
        }));
        return;
      }

      setFieldValue("tags", [...values.tags, trimmedTag]);
    },
    [values.tags, config, setFieldValue]
  );

  // Remove a tag
  const removeTag = useCallback(
    (tag: string) => {
      setFieldValue(
        "tags",
        values.tags.filter((t) => t !== tag)
      );
    },
    [values.tags, setFieldValue]
  );

  return {
    values,
    errors,
    touched,
    isDirty,
    isSubmitting,
    isValid,
    setFieldValue,
    setFieldTouched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    validateAll,
    addTag,
    removeTag,
  };
}

export default useWorkspaceForm;
