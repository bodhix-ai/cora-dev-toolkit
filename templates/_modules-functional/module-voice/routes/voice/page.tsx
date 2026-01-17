'use client';

/**
 * Voice Sessions List Page
 * 
 * Displays a list of voice interview sessions for the current organization.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useOrgContext } from '@/contexts/OrgContext';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useVoiceSessions, SessionCard } from '../../frontend';
import type { VoiceSessionStatus } from '../../frontend/types';

const STATUS_OPTIONS: { value: VoiceSessionStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'ready', label: 'Ready' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function VoiceSessionsPage() {
  const router = useRouter();
  const { currentOrg } = useOrgContext();
  const { currentWorkspace } = useWorkspaceContext();
  
  // Local filter state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Use the voice sessions hook
  const {
    sessions,
    loading,
    error,
    hasMore,
    refresh,
    loadMore,
    create,
    remove,
    setStatusFilter,
  } = useVoiceSessions({
    orgId: currentOrg?.id ?? '',
    workspaceId: currentWorkspace?.id,
    autoLoad: !!currentOrg?.id,
  });
  
  const handleCreateSession = () => {
    router.push('/voice/new');
  };
  
  const handleSessionClick = (sessionId: string) => {
    router.push(`/voice/${sessionId}`);
  };
  
  const handleStatusChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const value = event.target.value as string;
    setStatusFilter(value || undefined);
  };
  
  // Filter sessions by search term (client-side)
  const filteredSessions = sessions.filter((session) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      session.candidateName?.toLowerCase().includes(term) ||
      session.interviewType?.toLowerCase().includes(term)
    );
  });
  
  if (!currentOrg) {
    return (
      <Box p={3}>
        <Alert severity="info">
          Please select an organization to view voice interviews.
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Voice Interviews
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateSession}
          >
            New Interview
          </Button>
        </Box>
      </Box>
      
      {/* Filters */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Search by name or type..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 280 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            defaultValue=""
            onChange={handleStatusChange as any}
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Loading state */}
      {loading && sessions.length === 0 && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      )}
      
      {/* Empty state */}
      {!loading && filteredSessions.length === 0 && (
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center"
          minHeight="300px"
          bgcolor="background.paper"
          borderRadius={2}
          p={4}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm ? 'No matching interviews' : 'No voice interviews yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {searchTerm 
              ? 'Try adjusting your search criteria'
              : 'Create your first AI-powered voice interview session'
            }
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateSession}
            >
              Create Interview
            </Button>
          )}
        </Box>
      )}
      
      {/* Sessions grid */}
      {filteredSessions.length > 0 && (
        <>
          <Grid container spacing={2}>
            {filteredSessions.map((session) => (
              <Grid item xs={12} sm={6} md={4} key={session.id}>
                <SessionCard
                  session={session}
                  onClick={() => handleSessionClick(session.id)}
                  onDelete={async () => {
                    if (confirm('Are you sure you want to delete this session?')) {
                      await remove(session.id);
                    }
                  }}
                />
              </Grid>
            ))}
          </Grid>
          
          {/* Load more */}
          {hasMore && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Button
                variant="outlined"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? <CircularProgress size={20} /> : 'Load More'}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
