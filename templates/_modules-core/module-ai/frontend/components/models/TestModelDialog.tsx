"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { useState } from "react";
import { AIModel, TestModelInput, TestModelResponse } from "../../types";

interface TestModelDialogProps {
  open: boolean;
  model: AIModel;
  onTest: (data: TestModelInput) => Promise<TestModelResponse | null>;
  onClose: () => void;
}

export function TestModelDialog({
  open,
  model,
  onTest,
  onClose,
}: TestModelDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [maxTokens, setMaxTokens] = useState(1000);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestModelResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!prompt.trim()) {
      setError("Prompt is required");
      return;
    }

    setTesting(true);
    setError(null);
    setResult(null);

    try {
      const response = await onTest({ prompt, maxTokens });
      if (response) {
        setResult(response);
      } else {
        setError("Failed to test model");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to test model");
    } finally {
      setTesting(false);
    }
  };

  const handleClose = () => {
    setPrompt("");
    setMaxTokens(1000);
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Test Model: {model.displayName || model.modelId}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            multiline
            rows={4}
            placeholder="Enter your test prompt here..."
            fullWidth
            required
          />

          <TextField
            label="Max Tokens"
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value) || 1000)}
            fullWidth
            inputProps={{ min: 1, max: 4096 }}
          />

          {error && <Alert severity="error">{error}</Alert>}

          {result && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Response:
              </Typography>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {result.response}
                </Typography>
              </Alert>

              <Stack direction="row" spacing={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Latency
                  </Typography>
                  <Typography variant="body2">
                    {result.latencyMs.toFixed(0)} ms
                  </Typography>
                </Box>
                {result.tokenCount && (
                  <>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Input Tokens
                      </Typography>
                      <Typography variant="body2">
                        {result.tokenCount.input}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Output Tokens
                      </Typography>
                      <Typography variant="body2">
                        {result.tokenCount.output}
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button
          variant="contained"
          onClick={handleTest}
          disabled={testing || !prompt.trim()}
        >
          {testing ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              Testing...
            </>
          ) : (
            "Test Model"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
