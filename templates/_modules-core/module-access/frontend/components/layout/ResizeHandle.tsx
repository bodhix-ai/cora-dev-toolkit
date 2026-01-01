"use client";

import { useEffect, useState, useCallback } from "react";

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
    <div
      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:w-1.5 hover:bg-blue-500 bg-transparent transition-all group"
      onMouseDown={startResizing}
      style={{ zIndex: 10 }}
    >
      {/* Visual indicator on hover */}
      <div className="absolute inset-y-0 right-0 w-1 bg-gray-300 dark:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
