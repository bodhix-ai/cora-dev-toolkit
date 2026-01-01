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
      <div className="flex items-center justify-center py-12">
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
        <p className="text-red-800 dark:text-red-200">Error: {error}</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          No members found in this organization
        </p>
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Invite Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Organization Members ({members.length})
        </h2>
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
      </div>

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
                  <div className="flex items-center gap-3">
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        fontSize: "0.875rem",
                        bgcolor: "rgb(59, 130, 246)",
                        color: "white",
                      }}
                    >
                      {getUserInitials(
                        member.user?.email || "Unknown",
                        member.user?.name
                      )}
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {member.user?.name || "Unknown User"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {member.user?.email || "No email"}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getRoleDisplayName(member.roleName)}
                    size="small"
                    color={
                      member.roleName === "org_owner"
                        ? "primary"
                        : member.roleName === "org_admin"
                        ? "secondary"
                        : "default"
                    }
                    sx={{ borderRadius: "6px" }}
                  />
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(member.joinedAt)}
                  </span>
                </TableCell>
                {canManage && (
                  <TableCell align="right">
                    {member.roleName !== "org_owner" && (
                      <IconButton aria-label="Action button"
                        size="small"
                        color="error"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingMemberId === member.id}
                        aria-label={`Remove ${member.user?.email}`}
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
    </div>
  );
}
