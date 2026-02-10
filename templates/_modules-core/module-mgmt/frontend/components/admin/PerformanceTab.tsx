/**
 * Performance Tab Component
 *
 * Displays Lambda functions inventory with configuration details.
 * Provides insight into platform Lambda functions for warming configuration.
 */

import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tooltip,
  TextField,
  InputAdornment,
  TableSortLabel,
} from "@mui/material";
import {
  Info as InfoIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { useLambdaFunctions } from "../../hooks/useLambdaFunctions";
import type { LambdaFunctionInfo } from "../../types";

/**
 * Sort direction type
 */
type SortDirection = "asc" | "desc";

/**
 * Sortable column keys
 */
type SortableColumn = "name" | "memoryMb" | "timeoutSeconds" | "runtime" | "lastModified" | "description";

/**
 * Format date string to readable format
 */
function formatDate(dateString: string): string {
  try {
    // Normalize timezone format: +0000 -> Z (or add colon: +00:00)
    const normalizedDate = dateString.replace(/\+0000$/, 'Z');
    const date = new Date(normalizedDate);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

/**
 * Get color for runtime
 */
function getRuntimeColor(runtime: string): "primary" | "secondary" | "default" {
  if (runtime.startsWith("python")) return "primary";
  if (runtime.startsWith("nodejs")) return "secondary";
  return "default";
}

/**
 * Performance Tab - Lambda Functions Inventory
 *
 * Displays a comprehensive list of all Lambda functions in the platform with:
 * - Function name and ARN
 * - Memory allocation (MB)
 * - Timeout configuration (seconds)
 * - Runtime environment
 * - Last modified timestamp
 * - Description (if available)
 *
 * This inventory helps platform administrators:
 * - Understand which functions exist in the platform
 * - Configure Lambda warming schedules
 * - Monitor function configurations
 * - Identify optimization opportunities
 *
 * @example
 * ```tsx
 * <PerformanceTab />
 * ```
 */
export function PerformanceTab(): React.ReactElement {
  const { authAdapter } = useUser();
  const { functions, loading, error } = useLambdaFunctions(authAdapter);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortableColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Column width state
  const [columnWidths, setColumnWidths] = useState({
    name: 250,
    memoryMb: 100,
    timeoutSeconds: 100,
    runtime: 120,
    lastModified: 180,
    description: 300,
  });

  // Resize state
  const [resizingColumn, setResizingColumn] = useState<keyof typeof columnWidths | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  /**
   * Handle column resize start
   */
  const handleResizeStart = (
    column: keyof typeof columnWidths,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(column);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[column]);
  };

  /**
   * Handle column resize move
   */
  const handleResizeMove = (e: MouseEvent) => {
    if (resizingColumn) {
      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(50, resizeStartWidth + diff); // Minimum 50px
      setColumnWidths((prev: typeof columnWidths) => ({
        ...prev,
        [resizingColumn]: newWidth,
      }));
    }
  };

  /**
   * Handle column resize end
   */
  const handleResizeEnd = () => {
    setResizingColumn(null);
  };

  // Add/remove mouse event listeners for resizing
  React.useEffect(() => {
    if (resizingColumn) {
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
      return () => {
        document.removeEventListener("mousemove", handleResizeMove);
        document.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [resizingColumn, resizeStartX, resizeStartWidth, columnWidths]);

  /**
   * Handle sort column click
   */
  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column with ascending direction
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  /**
   * Filter and sort functions
   */
  const filteredAndSortedFunctions = useMemo(() => {
    let result = [...functions];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (fn) =>
          fn.name.toLowerCase().includes(query) ||
          fn.runtime.toLowerCase().includes(query) ||
          fn.description?.toLowerCase().includes(query) ||
          fn.handler?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: string | number = a[sortColumn] as string | number;
      let bValue: string | number = b[sortColumn] as string | number;

      // Handle undefined values
      if (aValue === undefined) aValue = "";
      if (bValue === undefined) bValue = "";

      // Compare values
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Numeric comparison
      return sortDirection === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return result;
  }, [functions, searchQuery, sortColumn, sortDirection]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Lambda Functions Inventory
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Platform Lambda functions available for warming and optimization.
      </Typography>

      {/* Search Bar */}
      {!loading && !error && functions.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            label="Search functions"
            placeholder="Search by function name, runtime, description, or handler..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load Lambda functions: {error}
        </Alert>
      )}

      {/* No Functions State */}
      {!loading && !error && functions.length === 0 && (
        <Alert severity="info">
          No Lambda functions found in this environment.
        </Alert>
      )}

      {/* No Search Results */}
      {!loading &&
        !error &&
        functions.length > 0 &&
        filteredAndSortedFunctions.length === 0 && (
          <Alert severity="info">
            No functions match your search query. Try a different search term.
          </Alert>
        )}

      {/* Functions Table */}
      {!loading && !error && filteredAndSortedFunctions.length > 0 && (
        <>
          <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
            Showing {filteredAndSortedFunctions.length} of {functions.length}{" "}
            Lambda function{functions.length !== 1 ? "s" : ""} in the platform.
            Configure warming for these functions in the Schedule tab.
          </Alert>

          <TableContainer component={Paper} elevation={2}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      width: columnWidths.name,
                      minWidth: 50,
                      position: "relative",
                      userSelect: resizingColumn === "name" ? "none" : "auto",
                    }}
                  >
                    <TableSortLabel
                      active={sortColumn === "name"}
                      direction={sortColumn === "name" ? sortDirection : "asc"}
                      onClick={() => handleSort("name")}
                    >
                      <strong>Function Name</strong>
                    </TableSortLabel>
                    <Box
                      onMouseDown={(e) => handleResizeStart("name", e)}
                      sx={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: "8px",
                        cursor: "col-resize",
                        userSelect: "none",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.1)",
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      width: columnWidths.memoryMb,
                      minWidth: 50,
                      position: "relative",
                      userSelect: resizingColumn === "memoryMb" ? "none" : "auto",
                    }}
                  >
                    <TableSortLabel
                      active={sortColumn === "memoryMb"}
                      direction={sortColumn === "memoryMb" ? sortDirection : "asc"}
                      onClick={() => handleSort("memoryMb")}
                    >
                      <strong>Memory</strong>
                    </TableSortLabel>
                    <Box
                      onMouseDown={(e) => handleResizeStart("memoryMb", e)}
                      sx={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: "8px",
                        cursor: "col-resize",
                        userSelect: "none",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.1)",
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      width: columnWidths.timeoutSeconds,
                      minWidth: 50,
                      position: "relative",
                      userSelect:
                        resizingColumn === "timeoutSeconds" ? "none" : "auto",
                    }}
                  >
                    <TableSortLabel
                      active={sortColumn === "timeoutSeconds"}
                      direction={
                        sortColumn === "timeoutSeconds" ? sortDirection : "asc"
                      }
                      onClick={() => handleSort("timeoutSeconds")}
                    >
                      <strong>Timeout</strong>
                    </TableSortLabel>
                    <Box
                      onMouseDown={(e) => handleResizeStart("timeoutSeconds", e)}
                      sx={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: "8px",
                        cursor: "col-resize",
                        userSelect: "none",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.1)",
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      width: columnWidths.runtime,
                      minWidth: 50,
                      position: "relative",
                      userSelect: resizingColumn === "runtime" ? "none" : "auto",
                    }}
                  >
                    <TableSortLabel
                      active={sortColumn === "runtime"}
                      direction={sortColumn === "runtime" ? sortDirection : "asc"}
                      onClick={() => handleSort("runtime")}
                    >
                      <strong>Runtime</strong>
                    </TableSortLabel>
                    <Box
                      onMouseDown={(e) => handleResizeStart("runtime", e)}
                      sx={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: "8px",
                        cursor: "col-resize",
                        userSelect: "none",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.1)",
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      width: columnWidths.lastModified,
                      minWidth: 50,
                      position: "relative",
                      userSelect:
                        resizingColumn === "lastModified" ? "none" : "auto",
                    }}
                  >
                    <TableSortLabel
                      active={sortColumn === "lastModified"}
                      direction={
                        sortColumn === "lastModified" ? sortDirection : "asc"
                      }
                      onClick={() => handleSort("lastModified")}
                    >
                      <strong>Last Modified</strong>
                    </TableSortLabel>
                    <Box
                      onMouseDown={(e) => handleResizeStart("lastModified", e)}
                      sx={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: "8px",
                        cursor: "col-resize",
                        userSelect: "none",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.1)",
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      width: columnWidths.description,
                      minWidth: 50,
                      position: "relative",
                      userSelect:
                        resizingColumn === "description" ? "none" : "auto",
                    }}
                  >
                    <TableSortLabel
                      active={sortColumn === "description"}
                      direction={
                        sortColumn === "description" ? sortDirection : "asc"
                      }
                      onClick={() => handleSort("description")}
                    >
                      <strong>Description</strong>
                    </TableSortLabel>
                    <Box
                      onMouseDown={(e) => handleResizeStart("description", e)}
                      sx={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: "8px",
                        cursor: "col-resize",
                        userSelect: "none",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.1)",
                        },
                      }}
                    />
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAndSortedFunctions.map((fn) => (
                  <TableRow
                    key={fn.arn}
                    hover
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                    }}
                  >
                    {/* Function Name */}
                    <TableCell
                      component="th"
                      scope="row"
                      sx={{ width: columnWidths.name }}
                    >
                      <Tooltip title={fn.arn} placement="top-start">
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: "monospace",
                            cursor: "help",
                          }}
                        >
                          {fn.name}
                        </Typography>
                      </Tooltip>
                      {fn.handler && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {fn.handler}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Memory */}
                    <TableCell align="right" sx={{ width: columnWidths.memoryMb }}>
                      <Typography variant="body2">
                        {fn.memoryMb} MB
                      </Typography>
                    </TableCell>

                    {/* Timeout */}
                    <TableCell
                      align="right"
                      sx={{ width: columnWidths.timeoutSeconds }}
                    >
                      <Typography variant="body2">
                        {fn.timeoutSeconds}s
                      </Typography>
                    </TableCell>

                    {/* Runtime */}
                    <TableCell sx={{ width: columnWidths.runtime }}>
                      <Chip
                        label={fn.runtime}
                        color={getRuntimeColor(fn.runtime)}
                        size="small"
                        sx={{ fontFamily: "monospace" }}
                      />
                      {fn.version && fn.version !== "$LATEST" && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          v{fn.version}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Last Modified */}
                    <TableCell sx={{ width: columnWidths.lastModified }}>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(fn.lastModified)}
                      </Typography>
                    </TableCell>

                    {/* Description */}
                    <TableCell sx={{ width: columnWidths.description }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          maxWidth: 300,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fn.description || (
                          <em style={{ opacity: 0.6 }}>No description</em>
                        )}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Summary */}
          <Box sx={{ mt: 2, p: 2, bgcolor: "background.default", borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Total Functions:</strong> {functions.length}
              {" • "}
              <strong>Total Memory:</strong>{" "}
              {functions.reduce((sum, fn) => sum + fn.memoryMb, 0)} MB
              {" • "}
              <strong>Runtimes:</strong>{" "}
              {Array.from(new Set(functions.map((fn) => fn.runtime))).join(
                ", "
              )}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
}

export default PerformanceTab;
