'use client';

/**
 * Voice Session Detail Page
 * 
 * Displays a single voice interview session with Daily.co room,
 * live transcript, and session controls.
 */

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { useOrgContext } from '@/contexts/OrgContext';
import { useVoiceSession, TranscriptViewer, KbSelector } from '@{{PROJECT_NAME}}/module-voice';
import type { VoiceSessionStatus } from '@{{PROJECT_NAME}}/module-voice';

const statusColors: Record<VoiceSessionStatus, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
  pending: 'default',
  ready: 'primary',
  active: 'warning',
  completed: 'success',
  failed: 'error',
  cancelled: 'default',
};

const statusLabels: Record<VoiceSessionStatus, string> = {
  pending: 'Pending',
  ready: 'Ready',
  active: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export default function VoiceSessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.id as string;
  const { currentOrg } = useOrgContext();
  
  // Use the voice session hook
  const {
    session,
    loading,
    error,
    status,
    liveSegments,
    transcript,
    groundedKbs,
    availableKbs,
    kbsLoading,
    isConnected,
    refresh,
    start,
    remove,
    addKb,
    removeKb,
    toggleKb,
    connect,
    disconnect,
  } = useVoiceSession({
    sessionId,
    orgId: currentOrg?.id ?? '',
    autoLoad: !!sessionId && !!currentOrg?.id,
    loadTranscript: true,
    loadKbs: true,
    enableRealTime: true,
  });
  
  // Connect to WebSocket when session is active
  useEffect(() => {
    if (status === 'active' && !isConnected) {
      connect();
    }
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [status, isConnected, connect, disconnect]);
  
  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this session?')) {
      await remove();
      router.push('/voice');
    }
  };
  
  const handleCopyRoomUrl = () => {
    if (session?.dailyRoomUrl) {
      navigator.clipboard.writeText(session.dailyRoomUrl);
    }
  };
  
  const handleStart = async () => {
    try {
      await start();
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error || !session) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {error || 'Session not found or you don\'t have access.'}
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.push('/voice')}
          sx={{ mt: 2 }}
        >
          Back to Sessions
        </Button>
      </Box>
    );
  }
  
  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.push('/voice')}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1" flexGrow={1}>
          {session.candidateName || 'Voice Interview'}
        </Typography>
        <Chip 
          label={statusLabels[session.status]} 
          color={statusColors[session.status]}
        />
        <Tooltip title="Refresh">
          <IconButton onClick={refresh} disabled={loading} aria-label="Refresh session">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        {(session.status === 'pending' || session.status === 'completed' || session.status === 'cancelled') && (
          <Tooltip title="Delete">
            <IconButton onClick={handleDelete} color="error" aria-label="Delete session">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '2fr 1fr' }} gap={3}>
        {/* Main content - Interview room or status */}
        <Paper sx={{ p: 3, minHeight: 400 }}>
          {session.status === 'pending' && (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
              <Typography variant="h2" fontSize="1.25rem" gutterBottom>
                Session Ready
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3} textAlign="center">
                Click Start to create the interview room and launch the AI bot.
                <br />
                The candidate will receive a link to join the interview.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<PlayIcon />}
                onClick={handleStart}
              >
                Start Interview
              </Button>
            </Box>
          )}
          
          {session.status === 'ready' && session.dailyRoomUrl && (
            <Box>
              <Typography variant="h2" fontSize="1.25rem" gutterBottom>
                Interview Room Ready
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                The AI interview bot is ready. Share the room link with the candidate.
              </Typography>
              
              <Box 
                bgcolor="grey.100" 
                borderRadius={1} 
                p={2}
                display="flex"
                alignItems="center"
                gap={1}
                mb={3}
              >
                <Typography 
                  variant="body2" 
                  sx={{ 
                    flexGrow: 1, 
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {session.dailyRoomUrl}
                </Typography>
                <Tooltip title="Copy link">
                  <IconButton size="small" onClick={handleCopyRoomUrl} aria-label="Copy room link">
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              
              {/* Daily.co Room Embed Placeholder */}
              <Box 
                bgcolor="grey.900" 
                borderRadius={1} 
                minHeight={350}
                display="flex"
                justifyContent="center"
                alignItems="center"
              >
                <Typography color="white" variant="body2">
                  Daily.co Video Room
                  <br />
                  (Integration pending)
                </Typography>
              </Box>
            </Box>
          )}
          
          {session.status === 'active' && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h2" fontSize="1.25rem">
                  Interview In Progress
                </Typography>
                <Chip 
                  label={isConnected ? 'Live' : 'Connecting...'}
                  color={isConnected ? 'success' : 'default'}
                  size="small"
                />
              </Box>
              
              {/* Daily.co Room Embed Placeholder */}
              <Box 
                bgcolor="grey.900" 
                borderRadius={1} 
                minHeight={400}
                display="flex"
                justifyContent="center"
                alignItems="center"
              >
                <Typography color="white" variant="body2">
                  Daily.co Video Room (Active)
                </Typography>
              </Box>
            </Box>
          )}
          
          {(session.status === 'completed' || session.status === 'failed' || session.status === 'cancelled') && (
            <Box>
              <Typography variant="h2" fontSize="1.25rem" gutterBottom>
                {session.status === 'completed' ? 'Interview Completed' : 
                 session.status === 'failed' ? 'Interview Failed' : 'Interview Cancelled'}
              </Typography>
              
              {session.durationSeconds && (
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Duration: {Math.floor(session.durationSeconds / 60)} minutes {session.durationSeconds % 60} seconds
                </Typography>
              )}
              
              {transcript && (
                <Box mt={2}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Transcript
                  </Typography>
                  <TranscriptViewer
                    transcript={transcript}
                    showTimestamps
                    autoScroll={false}
                    height="300px"
                  />
                </Box>
              )}
            </Box>
          )}
        </Paper>
        
        {/* Sidebar - Session info and live transcript */}
        <Box display="flex" flexDirection="column" gap={2}>
          {/* Session Details */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Session Details
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Typography variant="body2">
                <strong>Type:</strong> {session.interviewType}
              </Typography>
              {session.candidateEmail && (
                <Typography variant="body2">
                  <strong>Email:</strong> {session.candidateEmail}
                </Typography>
              )}
              <Typography variant="body2">
                <strong>Created:</strong> {new Date(session.createdAt).toLocaleString()}
              </Typography>
              {session.startedAt && (
                <Typography variant="body2">
                  <strong>Started:</strong> {new Date(session.startedAt).toLocaleString()}
                </Typography>
              )}
              {session.completedAt && (
                <Typography variant="body2">
                  <strong>Completed:</strong> {new Date(session.completedAt).toLocaleString()}
                </Typography>
              )}
            </Box>
          </Paper>
          
          {/* KB Grounding */}
          {(session.status === 'pending' || session.status === 'ready') && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Knowledge Bases
              </Typography>
              <KbSelector
                groundedKbs={groundedKbs}
                availableKbs={availableKbs}
                loading={kbsLoading}
                onAdd={addKb}
                onRemove={removeKb}
                onToggle={toggleKb}
                disabled={session.status !== 'pending'}
              />
            </Paper>
          )}
          
          {/* Live Transcript */}
          {(session.status === 'active' || session.status === 'ready') && (
            <Paper sx={{ p: 2, flexGrow: 1, maxHeight: 400, overflow: 'auto' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Live Transcript
                </Typography>
                {isConnected && (
                  <Chip label="Live" color="success" size="small" />
                )}
              </Box>
              
              {liveSegments.length === 0 ? (
                <Box 
                  bgcolor="grey.50" 
                  borderRadius={1} 
                  p={2}
                  minHeight={150}
                >
                  <Typography variant="body2" color="text.secondary">
                    Transcript will appear here during the interview...
                  </Typography>
                </Box>
              ) : (
                <Box display="flex" flexDirection="column" gap={1}>
                  {liveSegments.map((segment, index) => (
                    <Box 
                      key={index}
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        bgcolor: segment.speaker === 'bot' ? 'primary.50' : 'grey.100',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {segment.speaker === 'bot' ? 'AI Bot' : 'Candidate'}
                      </Typography>
                      <Typography variant="body2">
                        {segment.text}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}
