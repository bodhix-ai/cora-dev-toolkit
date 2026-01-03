"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  AlertTitle,
  CircularProgress,
} from "@mui/material";
import {
  Delete,
  Mail,
  Schedule,
} from "@mui/icons-material";
import { CoraAuthAdapter, createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";

/**
 * Invitation type
 */
interface Invitation {
  id: string;
  email: string;
  role: "org_user" | "org_admin" | "org_owner";
  status: "pending" | "accepted" | "expired";
  invited_by?: {
    name?: string;
    email: string;
  };
  created_at: string;
  expires_at?: string;
}

interface OrgInvitesTabProps {
  orgId: string;
  authAdapter: CoraAuthAdapter;
}

/**
 * Organization Invites Tab
 * 
 * Manages pending invitations, including:
 * - Viewing all pending invites
 * - Revoking invites
 * - Resending invites
 */
export function OrgInvitesTab({ orgId, authAdapter }: OrgInvitesTabProps) {
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvites();
  }, [orgId]);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await authAdapter.getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }
      const apiClient = createCoraAuthenticatedClient(token);
      const response = await apiClient.get<{ success: boolean; data: Invitation[] }>(`/orgs/${orgId}/invites`);
      if (response.success) {
        setInvites(response.data || []);
      } else {
        setError("Failed to load invitations");
      }
    } catch (err) {
      setError("Failed to load invitations");
      console.error("Error fetching invites:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) {
      return;
    }

    try {
      setRevokingInviteId(inviteId);
      const token = await authAdapter.getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }
      const apiClient = createCoraAuthenticatedClient(token);
      const response = await apiClient.delete<{ success: boolean }>(
        `/orgs/${orgId}/invites/${inviteId}`
      );
      if (response.success) {
        fetchInvites();
      } else {
        setError("Failed to revoke invitation");
      }
    } catch (err) {
      setError("Failed to revoke invitation");
      console.error("Error revoking invite:", err);
    } finally {
      setRevokingInviteId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "success";
      case "expired":
        return "error";
      default:
        return "warning";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "org_owner":
        return "error";
      case "org_admin":
        return "warning";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Pending Invitations
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage pending invitations to this organization.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {invites.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No pending invitations.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Invite new members from the Members tab.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Invited By</TableCell>
                <TableCell>Sent</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invites.map((invite) => (
                <TableRow key={invite.id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Mail fontSize="small" color="action" />
                      <Typography variant="body2" fontFamily="monospace">
                        {invite.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={invite.role.replace("org_", "")}
                      size="small"
                      color={getRoleColor(invite.role)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={invite.status}
                      size="small"
                      color={getStatusColor(invite.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {invite.invited_by?.name || invite.invited_by?.email || "Unknown"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Schedule fontSize="small" color="action" />
                      <Typography variant="body2">
                        {new Date(invite.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {invite.expires_at ? (
                      <Typography variant="body2">
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Never
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {invite.status === "pending" && (
                      <IconButton
                        size="small"
                        onClick={() => handleRevokeInvite(invite.id)}
                        disabled={revokingInviteId === invite.id}
                        color="error"
                        title="Revoke invitation"
                        aria-label={`Revoke invitation to ${invite.email}`}
                      >
                        {revokingInviteId === invite.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <Delete fontSize="small" />
                        )}
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {invites.length} invitation{invites.length !== 1 ? "s" : ""}
        </Typography>
      </Box>
    </Box>
  );
}
