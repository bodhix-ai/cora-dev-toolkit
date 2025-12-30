/**
 * Performance Tab Component
 *
 * Displays Lambda functions inventory with configuration details.
 * Provides insight into platform Lambda functions for warming configuration.
 */

import React from "react";
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
} from "@mui/material";
import { Info as InfoIcon } from "@mui/icons-material";
import { useUser } from "@ai-sec/module-access";
import { useLambdaFunctions } from "../../hooks/useLambdaFunctions";

/**
 * Format date string to readable format
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
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

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Lambda Functions Inventory
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Platform Lambda functions available for warming and optimization.
      </Typography>

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

      {/* Functions Table */}
      {!loading && !error && functions.length > 0 && (
        <>
          <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
            Found {functions.length} Lambda function
            {functions.length !== 1 ? "s" : ""} in the platform. Configure
            warming for these functions in the Schedule tab.
          </Alert>

          <TableContainer component={Paper} elevation={2}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Function Name</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Memory</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Timeout</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Runtime</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Last Modified</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Description</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {functions.map((fn) => (
                  <TableRow
                    key={fn.arn}
                    hover
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                    }}
                  >
                    {/* Function Name */}
                    <TableCell component="th" scope="row">
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
                    <TableCell align="right">
                      <Typography variant="body2">
                        {fn.memory_mb} MB
                      </Typography>
                    </TableCell>

                    {/* Timeout */}
                    <TableCell align="right">
                      <Typography variant="body2">
                        {fn.timeout_seconds}s
                      </Typography>
                    </TableCell>

                    {/* Runtime */}
                    <TableCell>
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
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(fn.last_modified)}
                      </Typography>
                    </TableCell>

                    {/* Description */}
                    <TableCell>
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
              {functions.reduce((sum, fn) => sum + fn.memory_mb, 0)} MB
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
