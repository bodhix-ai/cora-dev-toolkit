"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
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
  Avatar,
} from "@mui/material";
import {
  PersonAdd,
  Delete,
  Person,
} from "@mui/icons-material";
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";

/**
 * Organization Member type
 */
interface OrgMember {
  id: string;
  user_id: string;
  org_id: string;
  role: "org_user" | "org_admin" | "org_owner";
  user?: {
    email: string;
    name?: string;
  };
  created_at: string;
}

interface OrgMembersTabProps {
  orgId: string;
  authAdapter: CoraAuthAdapter;
}

/**
 * Organization Members Tab
 * 
 * Manages organization membership, including:
 * - Viewing all members
 * - Removing members
 * - Inviting new members
 */
export function OrgMembersTab({ orgId, authAdapter }: OrgMembersTabProps) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [orgId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAdapter.get(`/orgs/${orgId}/members`);
      if (response.success) {
        setMembers(response.data || []);
      } else {
        setError("Failed to load members");
      }
    } catch (err) {
      setError("Failed to load members");
      console.error("Error fetching members:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) {
      return;
    }

    try {
      setRemovingMemberId(memberId);
      const response = await authAdapter.delete(
        `/orgs/${orgId}/members/${memberId}`
      );
      if (response.success) {
        fetchMembers();
      } else {
        setError("Failed to remove member");
      }
    } catch (err) {
      setError("Failed to remove member");
      console.error("Error removing member:", err);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const getUserInitials = (email: string, name?: string) => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">
          Organization Members ({members.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => {
            // TODO: Implement invite member dialog
            alert("Invite member functionality coming soon");
          }}
        >
          Invite Member
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {members.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No members found in this organization.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Invite members to get started.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Member</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          fontSize: "0.875rem",
                          bgcolor: "primary.main",
                        }}
                      >
                        {getUserInitials(
                          member.user?.email || "Unknown",
                          member.user?.name
                        )}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {member.user?.name || "Unknown User"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {member.user?.email || "No email"}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={member.role.replace("org_", "")}
                      size="small"
                      color={getRoleColor(member.role)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(member.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {member.role !== "org_owner" && (
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingMemberId === member.id}
                        color="error"
                        title="Remove member"
                        aria-label={`Remove member ${member.user?.email || "Unknown"}`}
                      >
                        {removingMemberId === member.id ? (
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
    </Box>
  );
}
