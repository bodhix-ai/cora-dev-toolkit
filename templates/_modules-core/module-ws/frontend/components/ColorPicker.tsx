/**
 * ColorPicker Component
 *
 * A color picker for selecting workspace colors from a predefined palette.
 */

import React from "react";
import {
  Box,
  Button,
  Popover,
  Typography,
  FormHelperText,
} from "@mui/material";
import { Check } from "@mui/icons-material";
import { WORKSPACE_COLORS } from "../types";

export interface ColorPickerProps {
  /** Currently selected color */
  value: string;
  /** Callback when color changes */
  onChange: (color: string) => void;
  /** Optional label */
  label?: string;
  /** Optional error message */
  error?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Custom colors (defaults to WORKSPACE_COLORS) */
  colors?: readonly string[];
}

export function ColorPicker({
  value,
  onChange,
  label = "Color",
  error,
  disabled = false,
  colors = WORKSPACE_COLORS,
}: ColorPickerProps): React.ReactElement {
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleColorSelect = (color: string) => {
    onChange(color);
    handleClose();
  };

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
      <Button
        onClick={handleClick}
        disabled={disabled}
        variant="outlined"
        sx={{
          minWidth: 120,
          justifyContent: "flex-start",
          borderColor: error ? "error.main" : undefined,
          "&:hover": {
            borderColor: error ? "error.main" : undefined,
          },
        }}
      >
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: 1,
            backgroundColor: value,
            mr: 1,
            border: "1px solid rgba(0,0,0,0.1)",
          }}
        />
        <Typography variant="body2" sx={{ textTransform: "none" }}>
          {value}
        </Typography>
      </Button>
      {error && (
        <FormHelperText error sx={{ mt: 0.5 }}>
          {error}
        </FormHelperText>
      )}

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Select a color
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 1,
            }}
          >
            {colors.map((color) => (
              <Box
                key={color}
                onClick={() => handleColorSelect(color)}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  backgroundColor: color,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: value === color ? "2px solid #000" : "2px solid transparent",
                  transition: "transform 0.1s",
                  "&:hover": {
                    transform: "scale(1.1)",
                  },
                }}
              >
                {value === color && (
                  <Check sx={{ color: "#fff", fontSize: 20 }} />
                )}
              </Box>
            ))}
          </Box>
        </Box>
      </Popover>
    </Box>
  );
}

export default ColorPicker;
