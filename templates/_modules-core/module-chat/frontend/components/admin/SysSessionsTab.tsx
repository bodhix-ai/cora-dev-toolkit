/**
 * System Sessions Tab - Platform-Wide Session Management
 *
 * Allows system admins to view and manage chat sessions across all organizations:
 * - List all chat sessions (all orgs)
 * - Search and filter sessions
 * - View session details
 * - Force delete sessions
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
} from "@mui/material";
import { Delete as DeleteIcon, Visibility as VisibilityIcon } from "@mui/icons-material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import {
  listSysAdminSessions,
  getSysAdminSession,
  deleteSysAdminSession,
} from "../../lib/api";

interface Session {
  id: string;
  title: string;
  orgId: string;
  workspaceId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionDetails extends Session {
  isDeleted: boolean;
  deletedAt?: string;
  messageCount: number;
}

/**
 * ✅ CORRECT: No token prop - gets authAdapter from useUser hook
 */
export function SysSessionsTab(): React.ReactElement {
  const { isAuthenticated, authAdapter } = useUser();  // ✅ Get authAdapter here
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSession, setSelectedSession] = useState<SessionDetails | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Load sessions
  useEffect(() => {
    if (!isAuthenticated || !authAdapter) return;

    const loadSessions = async () => {
      try {
        setLoading(true);
        const data = await listSysAdminSessions(authAdapter, { limit: 100 });  // ✅ Pass authAdapter
        setSessions(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [isAuthenticated, authAdapter]);  // ✅ Updated dependency

  const handleViewDetails = async (sessionId: string) => {
    if (!isAuthenticated || !authAdapter) return;

    try {
      const details = await getSysAdminSession(authAdapter, sessionId);  // ✅ Pass authAdapter
      setSelectedSession(details);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session details");
    }
  };

  const handleDeleteClick = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!isAuthenticated || !authAdapter || !sessionToDelete) return;

    try {
      await deleteSysAdminSession(authAdapter, sessionToDelete);  // ✅ Pass authAdapter
      setSessions(sessions.filter((s) => s.id !== sessionToDelete));
      setSuccess("Session deleted successfully");
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
      if (selectedSession?.id === sessionToDelete) {
        setSelectedSession(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
    }
  };

  const filteredSessions = sessions.filter(
    (session) =>
      session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.id.includes(searchTerm) ||
      session.orgId.includes(searchTerm)
  );

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Chat Sessions (All Organizations)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            View and manage chat sessions across the platform
          </Typography>

          <TextField
            fullWidth
            label="Search sessions"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, ID, or org ID"
            sx={{ mb: 3 }}
          />

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Organization ID</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSessions.length > 0 ? (
                  filteredSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{session.title}</TableCell>
                      <TableCell>{session.orgId}</TableCell>
                      <TableCell>{session.createdBy}</TableCell>
                      <TableCell>
                        {new Date(session.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(session.id)}
                          aria-label="View details"
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(session.id)}
                          aria-label="Delete session"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      {searchTerm ? "No sessions match your search" : "No sessions found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Session Details Dialog */}
      <Dialog
        open={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Session Details</DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>ID:</strong> {selectedSession.id}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Title:</strong> {selectedSession.title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Organization ID:</strong> {selectedSession.orgId}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Workspace ID:</strong> {selectedSession.workspaceId || "N/A"}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Created By:</strong> {selectedSession.createdBy}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Message Count:</strong> {selectedSession.messageCount}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Created:</strong>{" "}
                {new Date(selectedSession.createdAt).toLocaleString()}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Updated:</strong>{" "}
                {new Date(selectedSession.updatedAt).toLocaleString()}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Status:</strong> {selectedSession.isDeleted ? "Deleted" : "Active"}
              </Typography>
              {selectedSession.deletedAt && (
                <Typography variant="body2" gutterBottom>
                  <strong>Deleted At:</strong>{" "}
                  {new Date(selectedSession.deletedAt).toLocaleString()}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedSession(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete this chat session? This action cannot
            be undone and will remove all associated messages.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SysSessionsTab;