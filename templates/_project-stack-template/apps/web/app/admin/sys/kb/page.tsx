/**
 * System KB Configuration Page
 * 
 * Platform admin page for configuring system-wide KB settings.
 * Uses ai_cfg_sys_rag table for RAG configuration.
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
} from "@mui/material";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface KBSystemConfig {
  system_prompt: string;
  default_embedding_model_id: string;
  default_chat_model_id: string;
  default_chunk_size: number;
  default_chunk_overlap: number;
  default_top_k: number;
  default_similarity_threshold: number;
  vector_index_type: "ivfflat" | "hnsw";
}

export default function SystemKBConfigPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [config, setConfig] = useState<KBSystemConfig | null>(null);

  // Permission check
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (status === "authenticated") {
      const sysRole = session?.user?.sys_role;
      if (!["sys_owner", "sys_admin"].includes(sysRole || "")) {
        router.push("/");
      }
    }
  }, [status, session, router]);

  // Load config from ai_cfg_sys_rag
  useEffect(() => {
    if (status === "authenticated") {
      loadConfig();
    }
  }, [status]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with actual API call to fetch ai_cfg_sys_rag
      // const response = await fetch('/api/admin/sys/kb/config');
      // const data = await response.json();
      
      // Mock data for now
      const mockConfig: KBSystemConfig = {
        system_prompt: "You are a helpful AI assistant that provides accurate, well-sourced answers based on the knowledge base. Always cite your sources and acknowledge when you don't have enough information to answer a question.",
        default_embedding_model_id: "amazon.titan-embed-text-v1",
        default_chat_model_id: "anthropic.claude-3-sonnet-20240229-v1:0",
        default_chunk_size: 1000,
        default_chunk_overlap: 200,
        default_top_k: 5,
        default_similarity_threshold: 0.7,
        vector_index_type: "hnsw",
      };
      
      setConfig(mockConfig);
    } catch (err) {
      setError("Failed to load system KB configuration");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      // TODO: Replace with actual API call to update ai_cfg_sys_rag
      // const response = await fetch('/api/admin/sys/kb/config', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(config),
      // });
      
      // Mock success for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Failed to save system KB configuration");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!config) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Failed to load configuration</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        System KB Configuration
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Configure system-wide knowledge base settings and RAG defaults
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Configuration saved successfully
        </Alert>
      )}

      <Card>
        <CardContent>
          {/* System Prompt */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Prompt
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={config.system_prompt}
              onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
              placeholder="Enter system prompt for RAG responses"
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Model Configuration */}
          <Typography variant="h6" gutterBottom>
            Model Configuration
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Default Embedding Model ID"
              value={config.default_embedding_model_id}
              onChange={(e) => setConfig({ ...config, default_embedding_model_id: e.target.value })}
              helperText="Model used for generating document embeddings"
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Default Chat Model ID"
              value={config.default_chat_model_id}
              onChange={(e) => setConfig({ ...config, default_chat_model_id: e.target.value })}
              helperText="Model used for generating chat responses"
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Chunking Configuration */}
          <Typography variant="h6" gutterBottom>
            Document Chunking
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Default Chunk Size: {config.default_chunk_size}
            </Typography>
            <Slider
              value={config.default_chunk_size}
              onChange={(_, value) => setConfig({ ...config, default_chunk_size: value as number })}
              min={500}
              max={2000}
              step={100}
              marks
              valueLabelDisplay="auto"
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Default Chunk Overlap: {config.default_chunk_overlap}
            </Typography>
            <Slider
              value={config.default_chunk_overlap}
              onChange={(_, value) => setConfig({ ...config, default_chunk_overlap: value as number })}
              min={0}
              max={500}
              step={50}
              marks
              valueLabelDisplay="auto"
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Search Configuration */}
          <Typography variant="h6" gutterBottom>
            Search Configuration
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Default Top K Results: {config.default_top_k}
            </Typography>
            <Slider
              value={config.default_top_k}
              onChange={(_, value) => setConfig({ ...config, default_top_k: value as number })}
              min={1}
              max={20}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Default Similarity Threshold: {config.default_similarity_threshold.toFixed(2)}
            </Typography>
            <Slider
              value={config.default_similarity_threshold}
              onChange={(_, value) => setConfig({ ...config, default_similarity_threshold: value as number })}
              min={0.0}
              max={1.0}
              step={0.05}
              marks
              valueLabelDisplay="auto"
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Vector Index Type</InputLabel>
              <Select
                value={config.vector_index_type}
                label="Vector Index Type"
                onChange={(e) => setConfig({ ...config, vector_index_type: e.target.value as "ivfflat" | "hnsw" })}
              >
                <MenuItem value="ivfflat">IVFFlat (Faster index, approximate)</MenuItem>
                <MenuItem value="hnsw">HNSW (More accurate, slower)</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Save Button */}
          <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
