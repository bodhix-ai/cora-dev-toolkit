/**
 * Organization Sessions Tab - Organization Session Management
 *
 * Allows org admins to view and manage chat sessions in their organization:
 * - List organization chat sessions
 * - Search and filter sessions
 * - View session details
 * - Delete/restore sessions
 * - View message content for auditing
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
  Chip,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Restore as RestoreIcon,
} from "@mui/icons-material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import {
  listOrgAdminSessions,
  getOrgAdminSession,
  deleteOrgAdminSession,
  restoreOrgAdminSession,
} from "../../lib/api";

interface Session {
  id: string;
  title: string;
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

export function OrgSessionsTab(): React.ReactElement {
  const { isAuthenticated } = useUser();
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
    if (!isAuthenticated) return;

    const loadSessions = async () => {
      try {
        setLoading(true);
        const data = await listOrgAdminSessions({ limit: 100 });
        setSessions(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [isAuthenticated]);

  const handleViewDetails = async (sessionId: string) => {
    if (!isAuthenticated) return;

    try {
      const details = await getOrgAdminSession(sessionId);
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
    if (!isAuthenticated || !sessionToDelete) return;

    try {
      await deleteOrgAdminSession(sessionToDelete);
      // Update session in list to show deleted status
      setSessions(
        sessions.map((s) =>
          s.id === sessionToDelete ? { ...s, isDeleted: true } : s
        )
      );
      setSuccess("Session deleted successfully");
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
      if (selectedSession?.id === sessionToDelete) {
        setSelectedSession({ ...selectedSession, isDeleted: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
    }
  };

  const handleRestore = async (sessionId: string) => {
    if (!isAuthenticated) return;

    try {
      await restoreOrgAdminSession(sessionId);
      // Reload sessions to update status
      const data = await listOrgAdminSessions({ limit: 100 });
      setSessions(data);
      setSuccess("Session restored successfully");
      if (selectedSession?.id === sessionId) {
        const details = await getOrgAdminSession(sessionId);
        setSelectedSession(details);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore session");
    }
  };

  const filteredSessions = sessions.filter(
    (session) =>
      session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.id.includes(searchTerm) ||
      (session.workspaceId && session.workspaceId.includes(searchTerm))
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
            Organization Chat Sessions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            View and manage chat sessions in your organization
          </Typography>

          <TextField
            fullWidth
            label="Search sessions"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, ID, or workspace ID"
            sx={{ mb: 3 }}
          />

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Workspace</TableCell>
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
                      <TableCell>{session.workspaceId || "Personal"}</TableCell>
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
                        {(session as any).isDeleted ? (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleRestore(session.id)}
                            aria-label="Restore session"
                          >
                            <RestoreIcon />
                          </IconButton>
                        ) : (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(session.id)}
                            aria-label="Delete session"
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
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
                <strong>Workspace ID:</strong> {selectedSession.workspaceId || "Personal"}
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
                <strong>Status:</strong>{" "}
                {selectedSession.isDeleted ? (
                  <Chip label="Deleted" color="error" size="small" />
                ) : (
                  <Chip label="Active" color="success" size="small" />
                )}
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
            Are you sure you want to delete this chat session? The session can be restored later if needed.
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

export default OrgSessionsTab;