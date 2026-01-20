"use client";

import { useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteIcon from "@mui/icons-material/Delete";
import { useOrgMembers } from "../../hooks/useOrgMembers";
import { useRole } from "../../hooks/useRole";
import { getRoleDisplayName } from "../../lib/permissions";
import { canManageMembers } from "../../lib/permissions";
import { InviteMemberDialog } from "./InviteMemberDialog";

interface OrgMembersListProps {
  orgId: string;
}

/**
 * OrgMembersList Component
 *
 * Table/list of all organization members
 * - Columns: Email, Role, Joined Date, Actions
 * - "Remove Member" button (if user is owner)
 * - "Invite Member" button (if user is owner)
 */
export function OrgMembersList({ orgId }: OrgMembersListProps) {
  const { members, loading, error, removeMember } = useOrgMembers(orgId);
  const { role } = useRole();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const canManage = role ? canManageMembers(role) : false;

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) {
      return;
    }

    setRemovingMemberId(memberId);
    try {
      await removeMember(memberId);
    } catch (error) {
      console.error("Failed to remove member:", error);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getUserInitials = (email: string, name?: string | null) => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Error: {error}
      </Alert>
    );
  }

  if (members.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          No members found in this organization
        </Typography>
        {canManage && (
          <>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setInviteDialogOpen(true)}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
              }}
            >
              Invite Member
            </Button>
            <InviteMemberDialog
              open={inviteDialogOpen}
              onClose={() => setInviteDialogOpen(false)}
              orgId={orgId}
            />
          </>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header with Invite Button */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight="semibold">
          Organization Members ({members.length})
        </Typography>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviteDialogOpen(true)}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
            }}
          >
            Invite Member
          </Button>
        )}
      </Box>

      {/* Members Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: "12px",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Member</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Joined</TableCell>
              {canManage && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((member) => (
              <TableRow
                key={member.id}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        fontSize: "0.875rem",
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                    >
                      {getUserInitials(
                        member.profile?.email || "Unknown",
                        member.profile?.fullName
                      )}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {member.profile?.fullName || "Unknown User"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {member.profile?.email || "No email"}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getRoleDisplayName(member.orgRole)}
                    size="small"
                    color={
                      member.orgRole === "org_owner"
                        ? "primary"
                        : member.orgRole === "org_admin"
                        ? "secondary"
                        : "default"
                    }
                    sx={{ borderRadius: "6px" }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(member.joinedAt || member.createdAt)}
                  </Typography>
                </TableCell>
                {canManage && (
                  <TableCell align="right">
                    {member.orgRole !== "org_owner" && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingMemberId === member.id}
                        aria-label={`Remove ${member.profile?.email || "member"}`}
                      >
                        {removingMemberId === member.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )}
                      </IconButton>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        orgId={orgId}
      />
    </Box>
  );
}
