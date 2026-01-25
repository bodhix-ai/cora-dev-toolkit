"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Edit, Delete, PersonAdd } from "@mui/icons-material";
import { useOrgMembers } from "../../hooks/useOrgMembers";

interface OrgAccessPageProps {
  orgId: string;
  isOwner: boolean;
}

interface Member {
  id: string;
  email: string;
  name: string;
  orgRole: "org_owner" | "org_admin" | "org_member";
  createdAt: string;
}

/**
 * Organization Access Management Page
 * 
 * Allows org owners to manage users in their organization.
 * Org admins have read-only access.
 * 
 * Features:
 * - View all users in current organization
 * - Edit user details (org owner only)
 * - Delete users (org owner only)
 * - Invite new users (org owner only)
 */
export function OrgAccessPage({ orgId, isOwner }: OrgAccessPageProps) {
  const { members, loading, error, refetch } = useOrgMembers(orgId);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"org_admin" | "org_member">("org_member");

  const handleEdit = (member: Member) => {
    setSelectedMember(member);
    setEditDialogOpen(true);
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this user from the organization?")) {
      return;
    }

    try {
      // TODO: Implement delete user API call
      // await deleteOrgMember(orgId, memberId);
      await refetch();
    } catch (err) {
      console.error("Failed to delete member:", err);
    }
  };

  const handleInvite = async () => {
    try {
      // TODO: Implement invite user API call
      // await inviteOrgMember(orgId, inviteEmail, inviteRole);
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("org_member");
      await refetch();
    } catch (err) {
      console.error("Failed to invite member:", err);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedMember) return;

    try {
      // TODO: Implement update user API call
      // await updateOrgMember(orgId, selectedMember.id, selectedMember);
      setEditDialogOpen(false);
      setSelectedMember(null);
      await refetch();
    } catch (err) {
      console.error("Failed to update member:", err);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "org_owner":
        return "Owner";
      case "org_admin":
        return "Admin";
      case "org_member":
        return "Member";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string): "primary" | "secondary" | "default" => {
    switch (role) {
      case "org_owner":
        return "primary";
      case "org_admin":
        return "secondary";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading organization members...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load organization members: {error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Typography variant="h4" component="h1" gutterBottom>
            Access Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage users in your organization
          </Typography>
        </div>
        {isOwner && (
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setInviteDialogOpen(true)}
            aria-label="Invite new user"
          >
            Invite User
          </Button>
        )}
      </Box>

      {/* Read-only notice for org admins */}
      {!isOwner && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You have view-only access. Contact your organization owner to manage users.
        </Alert>
      )}

      {/* Members Table */}
      <TableContainer component={Paper}>
        <Table aria-label="Organization members table">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Joined</TableCell>
              {isOwner && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isOwner ? 5 : 4} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No members found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => {
                const email = member.profile?.email || member.user?.email || '';
                const name = member.profile?.fullName || member.user?.name || member.user?.fullName || 'Unknown';
                
                return (
                  <TableRow key={member.id} hover>
                    <TableCell>{email}</TableCell>
                    <TableCell>{name}</TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(member.orgRole)}
                        color={getRoleColor(member.orgRole)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(member.createdAt).toLocaleDateString()}
                    </TableCell>
                    {isOwner && (
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit({ ...member, email, name } as Member)}
                          aria-label={`Edit ${name}`}
                          disabled={member.orgRole === "org_owner"}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(member.id)}
                          aria-label={`Delete ${name}`}
                          disabled={member.orgRole === "org_owner"}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Member Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Member</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Email"
              value={selectedMember?.email || ""}
              onChange={(e) =>
                setSelectedMember(
                  selectedMember ? { ...selectedMember, email: e.target.value } : null
                )
              }
              fullWidth
              disabled
            />
            <TextField
              label="Name"
              value={selectedMember?.name || ""}
              onChange={(e) =>
                setSelectedMember(
                  selectedMember ? { ...selectedMember, name: e.target.value } : null
                )
              }
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={selectedMember?.orgRole || "org_member"}
                label="Role"
                onChange={(e) =>
                  setSelectedMember(
                    selectedMember
                      ? {
                          ...selectedMember,
                          orgRole: e.target.value as "org_admin" | "org_member",
                        }
                      : null
                  )
                }
              >
                <MenuItem value="org_member">Member</MenuItem>
                <MenuItem value="org_admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Email Address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              fullWidth
              placeholder="user@example.com"
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={inviteRole}
                label="Role"
                onChange={(e) => setInviteRole(e.target.value as "org_admin" | "org_member")}
              >
                <MenuItem value="org_member">Member</MenuItem>
                <MenuItem value="org_admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleInvite}
            variant="contained"
            disabled={!inviteEmail}
          >
            Send Invite
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
