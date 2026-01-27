"use client";

import { useEffect, useState, useCallback } from "react";
import { Box } from "@mui/material";

interface ResizeHandleProps {
  onResize: (width: number) => void;
  minWidth: number;
  maxWidth: number;
  isResizing: boolean;
  setIsResizing: (resizing: boolean) => void;
}

/**
 * ResizeHandle Component
 *
 * Draggable handle for resizing the sidebar width.
 * Appears on the right edge of the sidebar.
 */
export function ResizeHandle({
  onResize,
  minWidth,
  maxWidth,
  isResizing,
  setIsResizing,
}: ResizeHandleProps) {
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, [setIsResizing]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, [setIsResizing]);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          onResize(newWidth);
        }
      }
    },
    [isResizing, minWidth, maxWidth, onResize]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);

      // Prevent text selection while resizing
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      return () => {
        window.removeEventListener("mousemove", resize);
        window.removeEventListener("mouseup", stopResizing);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };
    }
  }, [isResizing, resize, stopResizing]);

  return (
    <Box
      onMouseDown={startResizing}
      sx={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "4px",
        height: "100%",
        cursor: "col-resize",
        bgcolor: "transparent",
        transition: "all 0.2s",
        zIndex: 10,
        "&:hover": {
          width: "6px",
          bgcolor: "primary.main",
        },
      }}
    >
      {/* Visual indicator on hover */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: "4px",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "#3f3f46" : "#d1d5db",
          opacity: 0,
          transition: "opacity 0.2s",
          "parentHover": {
            opacity: 1,
          },
        }}
      />
    </Box>
  );
}