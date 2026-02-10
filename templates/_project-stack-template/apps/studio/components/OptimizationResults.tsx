"use client";

/**
 * OptimizationResults Component
 * 
 * Displays detailed optimization results including:
 * - Summary statistics
 * - Prompt variations tested
 * - Truth set accuracy breakdown
 * - Recommendations for improvement
 */

import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  ExpandMore,
  CheckCircle,
  TrendingUp,
  Lightbulb,
  Description,
} from "@mui/icons-material";

// ============================================================================
// TYPES
// ============================================================================

interface PromptVariation {
  name: string;
  accuracy: number;
  temperature: number;
  max_tokens: number;
  true_positive: number;
  true_negative: number;
  false_positive: number;
  false_negative: number;
}

interface TruthSetResult {
  document_name: string;
  document_id: string;
  accuracy: number;
  total_criteria: number;
  correct_evaluations: number;
}

interface Recommendation {
  type: string;
  message: string;
  priority: "high" | "medium" | "low";
}

interface OptimizationResultsData {
  overall_accuracy: number;
  best_variation: string;
  total_variations_tested: number;
  recommendations: Recommendation[];
  prompt_variations: PromptVariation[];
  truth_set_results: TruthSetResult[];
}

interface OptimizationResultsProps {
  runId: string;
  workspaceId: string;
  onLoadResults: () => Promise<OptimizationResultsData>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAccuracyColor(accuracy: number): "success" | "warning" | "error" {
  if (accuracy >= 0.8) return "success";
  if (accuracy >= 0.6) return "warning";
  return "error";
}

function getPriorityColor(priority: string): "error" | "warning" | "info" {
  switch (priority) {
    case "high":
      return "error";
    case "medium":
      return "warning";
    default:
      return "info";
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OptimizationResults({
  runId,
  workspaceId,
  onLoadResults,
}: OptimizationResultsProps) {
  const [results, setResults] = useState<OptimizationResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  // Load results on mount
  useEffect(() => {
    loadResults();
  }, [runId]);

  const loadResults = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await onLoadResults();
      setResults(data);
    } catch (err: any) {
      console.error("Error loading optimization results:", err);
      setError(err.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !results) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error || "Failed to load optimization results"}
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
            <TrendingUp color="success" />
            <Typography variant="h6">Optimization Results</Typography>
            <Chip
              label={`${Math.round(results.overall_accuracy * 100)}% Accuracy`}
              color={getAccuracyColor(results.overall_accuracy)}
              size="small"
            />
            <Chip
              label={`${results.total_variations_tested} Variations Tested`}
              variant="outlined"
              size="small"
            />
          </Box>
        </AccordionSummary>

        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Summary Cards */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Best Configuration
                  </Typography>
                  <Typography variant="h5" component="div" gutterBottom>
                    {results.best_variation}
                  </Typography>
                  <Typography variant="h3" color="success.main">
                    {Math.round(results.overall_accuracy * 100)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overall Accuracy
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Variations Tested
                  </Typography>
                  <Typography variant="h3" component="div">
                    {results.total_variations_tested}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Prompt configurations evaluated
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Truth Sets
                  </Typography>
                  <Typography variant="h3" component="div">
                    {results.truth_set_results.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Documents evaluated
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Recommendations */}
            {results.recommendations && results.recommendations.length > 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <Lightbulb color="primary" />
                    <Typography variant="h6">Recommendations</Typography>
                  </Box>
                  <List>
                    {results.recommendations.map((rec, idx) => (
                      <ListItem key={idx}>
                        <ListItemIcon>
                          <Chip
                            label={rec.priority.toUpperCase()}
                            size="small"
                            color={getPriorityColor(rec.priority)}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={rec.message}
                          secondary={`Type: ${rec.type}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>
            )}

            {/* Prompt Variations Table */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Prompt Variations
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Variation</TableCell>
                        <TableCell align="right">Accuracy</TableCell>
                        <TableCell align="right">Temperature</TableCell>
                        <TableCell align="right">Max Tokens</TableCell>
                        <TableCell align="right">True +</TableCell>
                        <TableCell align="right">True -</TableCell>
                        <TableCell align="right">False +</TableCell>
                        <TableCell align="right">False -</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.prompt_variations
                        .sort((a, b) => b.accuracy - a.accuracy)
                        .map((variation, idx) => (
                          <TableRow
                            key={idx}
                            sx={{
                              bgcolor:
                                variation.name === results.best_variation
                                  ? "success.lighter"
                                  : "inherit",
                            }}
                          >
                            <TableCell>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                {variation.name}
                                {variation.name === results.best_variation && (
                                  <CheckCircle color="success" fontSize="small" />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={`${Math.round(variation.accuracy * 100)}%`}
                                size="small"
                                color={getAccuracyColor(variation.accuracy)}
                              />
                            </TableCell>
                            <TableCell align="right">{variation.temperature}</TableCell>
                            <TableCell align="right">{variation.max_tokens}</TableCell>
                            <TableCell align="right">{variation.true_positive}</TableCell>
                            <TableCell align="right">{variation.true_negative}</TableCell>
                            <TableCell align="right">{variation.false_positive}</TableCell>
                            <TableCell align="right">{variation.false_negative}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Truth Set Results */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <Description color="primary" />
                  <Typography variant="h6">Truth Set Performance</Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Document</TableCell>
                        <TableCell align="right">Accuracy</TableCell>
                        <TableCell align="right">Correct</TableCell>
                        <TableCell align="right">Total Criteria</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.truth_set_results
                        .sort((a, b) => b.accuracy - a.accuracy)
                        .map((result, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{result.document_name}</TableCell>
                            <TableCell align="right">
                              <Chip
                                label={`${Math.round(result.accuracy * 100)}%`}
                                size="small"
                                color={getAccuracyColor(result.accuracy)}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {result.correct_evaluations}
                            </TableCell>
                            <TableCell align="right">{result.total_criteria}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}