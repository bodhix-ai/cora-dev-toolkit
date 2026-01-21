/**
 * TagInput Component
 *
 * Input component for managing workspace tags with add/remove functionality.
 */

import React, { useState, KeyboardEvent } from "react";
import {
  Box,
  TextField,
  Chip,
  Typography,
  FormHelperText,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Add, Close } from "@mui/icons-material";

export interface TagInputProps {
  /** Current tags */
  value: string[];
  /** Callback when tags change */
  onChange: (tags: string[]) => void;
  /** Optional label */
  label?: string;
  /** Optional placeholder */
  placeholder?: string;
  /** Optional error message */
  error?: string;
  /** Maximum number of tags allowed */
  maxTags?: number;
  /** Maximum length per tag */
  maxTagLength?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
}

export function TagInput({
  value,
  onChange,
  label = "Tags",
  placeholder = "Add a tag...",
  error,
  maxTags = 10,
  maxTagLength = 30,
  disabled = false,
}: TagInputProps): React.ReactElement {
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const validateTag = (tag: string): string | null => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed) return "Tag cannot be empty";
    if (trimmed.length > maxTagLength) {
      return `Tag must be ${maxTagLength} characters or less`;
    }
    if (value.includes(trimmed)) {
      return "Tag already exists";
    }
    if (!/^[a-z0-9-]+$/.test(trimmed)) {
      return "Tags can only contain letters, numbers, and hyphens";
    }
    return null;
  };

  const addTag = () => {
    const trimmed = inputValue.trim().toLowerCase();
    const validationError = validateTag(trimmed);
    
    if (validationError) {
      setInputError(validationError);
      return;
    }

    if (value.length >= maxTags) {
      setInputError(`Maximum ${maxTags} tags allowed`);
      return;
    }

    onChange([...value, trimmed]);
    setInputValue("");
    setInputError(null);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    } else if (event.key === "Backspace" && !inputValue && value.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(value[value.length - 1]);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    setInputError(null);
  };

  const displayError = error || inputError;
  const canAddMore = value.length < maxTags;

  return (
    <Box>
      {label && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 0.5 }}
        >
          {label}
        </Typography>
      )}

      {/* Tag chips */}
      {value.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
          {value.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              onDelete={disabled ? undefined : () => removeTag(tag)}
              deleteIcon={<Close fontSize="small" />}
              sx={{ height: 24 }}
            />
          ))}
        </Box>
      )}

      {/* Input field */}
      {canAddMore && (
        <TextField
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Add new tag"
          disabled={disabled}
          size="small"
          fullWidth
          error={Boolean(displayError)}
          InputProps={{
            endAdornment: inputValue && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={addTag}
                  disabled={disabled}
                  edge="end"
                  aria-label="Add tag"
                >
                  <Add fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 300 }}
        />
      )}

      {/* Helper text */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
        {displayError ? (
          <FormHelperText error>{displayError}</FormHelperText>
        ) : (
          <FormHelperText>
            Press Enter to add a tag
          </FormHelperText>
        )}
        <Typography variant="caption" color="text.secondary">
          {value.length}/{maxTags}
        </Typography>
      </Box>
    </Box>
  );
}

export default TagInput;
