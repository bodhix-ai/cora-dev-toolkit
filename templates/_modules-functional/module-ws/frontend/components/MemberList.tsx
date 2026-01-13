/**
 * MemberList Component
 *
 * Displays and manages workspace members with role management.
 */

import React, { useState } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Typography,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  MoreVert,
  PersonRemove,
  AdminPanelSettings,
  Person,
  PersonAdd,
} from "@mui/icons-material";
import type { WorkspaceMember, WorkspaceRole } from "../types";
import { WORKSPACE_ROLE_DISPLAY_NAMES, WORKSPACE_ROLE_DESCRIPTIONS } from "../types";

export interface MemberListProps {
  /** List of workspace members */
  members: WorkspaceMember[];
  /** Current user's role in the workspace */
  currentUserRole?: WorkspaceRole;
  /** Current user's ID */
  currentUserId?: string;
  /** Callback when member role is updated */
  onUpdateRole?: (memberId: string, newRole: WorkspaceRole) => void;
  /** Callback when member is removed */
  onRemoveMember?: (memberId: string) => void;
  /** Callback when add member is clicked */
  onAddMember?: () => void;
  /** Whether actions are loading */
  loading?: boolean;
  /** Whether to show the add member button */
  showAddButton?: boolean;
}

/**
 * Get initials from display name or email
 */
function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return "??";
}

/**
 * Get role icon component
 */
function getRoleIcon(role: WorkspaceRole): React.ReactNode {
  switch (role) {
    case "ws_owner":
      return <AdminPanelSettings fontSize="small" color="primary" />;
    case "ws_admin":
      return <AdminPanelSettings fontSize="small" color="action" />;
    default:
      return <Person fontSize="small" color="action" />;
  }
}

export function MemberList({
  members = [],
  currentUserRole,
  currentUserId,
  onUpdateRole,
  onRemoveMember,
  onAddMember,
  loading = false,
  showAddButton = true,
}: MemberListProps): React.ReactElement {
  // Defensive check - ensure members is always an array
  const membersList = Array.isArray(members) ? members : [];
  
  const [menuAnchor, setMenuAnchor] = useState<{
    element: HTMLElement;
    memberId: string;
  } | null>(null);
  const [removeDialogMember, setRemoveDialogMember] = useState<WorkspaceMember | null>(null);

  const canManageMembers = currentUserRole === "ws_owner";
  const canUpdateRoles = currentUserRole === "ws_owner";

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, memberId: string) => {
    event.stopPropagation();
    setMenuAnchor({ element: event.currentTarget, memberId });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleRoleChange = (newRole: WorkspaceRole) => {
    if (menuAnchor && onUpdateRole) {
      onUpdateRole(menuAnchor.memberId, newRole);
    }
    handleMenuClose();
  };

  const handleRemoveClick = (member: WorkspaceMember) => {
    setRemoveDialogMember(member);
    handleMenuClose();
  };

  const handleRemoveConfirm = () => {
    if (removeDialogMember && onRemoveMember) {
      onRemoveMember(removeDialogMember.id);
    }
    setRemoveDialogMember(null);
  };

  const handleRemoveCancel = () => {
    setRemoveDialogMember(null);
  };

  const getMember = (memberId: string): WorkspaceMember | undefined => {
    return membersList.find((m) => m.id === memberId);
  };

  const currentMenuMember = menuAnchor ? getMember(menuAnchor.memberId) : null;

  // Sort members: owners first, then admins, then users
  const sortedMembers = [...membersList].sort((a, b) => {
    const roleOrder: Record<WorkspaceRole, number> = {
      ws_owner: 0,
      ws_admin: 1,
      ws_user: 2,
    };
    return roleOrder[a.wsRole] - roleOrder[b.wsRole];
  });

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Members ({membersList.length})
        </Typography>
        {showAddButton && canManageMembers && onAddMember && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<PersonAdd />}
            onClick={onAddMember}
            disabled={loading}
          >
            Add Member
          </Button>
        )}
      </Box>

      {/* Member list */}
      <List disablePadding>
        {sortedMembers.map((member, index) => {
          const isCurrentUser = member.userId === currentUserId;
          const isOwner = member.wsRole === "ws_owner";
          const canModify = canManageMembers && !isOwner && !isCurrentUser;
          const displayName = member.profile?.displayName || member.profile?.email || "Unknown User";

          return (
            <React.Fragment key={member.id}>
              {index > 0 && <Divider component="li" />}
              <ListItem
                sx={{
                  py: 1.5,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    src={member.profile?.avatarUrl}
                    sx={{ width: 40, height: 40 }}
                  >
                    {getInitials(member.profile?.displayName, member.profile?.email)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {displayName}
                      </Typography>
                      {isCurrentUser && (
                        <Chip
                          label="You"
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ height: 18, fontSize: "0.65rem" }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                      {getRoleIcon(member.wsRole)}
                      <Typography variant="caption" color="text.secondary">
                        {WORKSPACE_ROLE_DISPLAY_NAMES[member.wsRole]}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  {canModify && (
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => handleMenuOpen(e, member.id)}
                      disabled={loading}
                      aria-label="Member actions"
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            </React.Fragment>
          );
        })}
      </List>

      {/* Empty state */}
      {membersList.length === 0 && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            No members in this workspace
          </Typography>
        </Box>
      )}

      {/* Role menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem disabled>
          <Typography variant="caption" color="text.secondary">
            Change Role
          </Typography>
        </MenuItem>
        {canUpdateRoles && currentMenuMember?.wsRole !== "ws_admin" && (
          <MenuItem onClick={() => handleRoleChange("ws_admin")}>
            <Tooltip title={WORKSPACE_ROLE_DESCRIPTIONS.ws_admin} placement="left">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AdminPanelSettings fontSize="small" />
                <Typography variant="body2">Make Admin</Typography>
              </Box>
            </Tooltip>
          </MenuItem>
        )}
        {canUpdateRoles && currentMenuMember?.wsRole !== "ws_user" && (
          <MenuItem onClick={() => handleRoleChange("ws_user")}>
            <Tooltip title={WORKSPACE_ROLE_DESCRIPTIONS.ws_user} placement="left">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Person fontSize="small" />
                <Typography variant="body2">Make Member</Typography>
              </Box>
            </Tooltip>
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={() => currentMenuMember && handleRemoveClick(currentMenuMember)}
          sx={{ color: "error.main" }}
        >
          <PersonRemove fontSize="small" sx={{ mr: 1 }} />
          <Typography variant="body2">Remove</Typography>
        </MenuItem>
      </Menu>

      {/* Remove confirmation dialog */}
      <Dialog open={Boolean(removeDialogMember)} onClose={handleRemoveCancel}>
        <DialogTitle>Remove Member</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove{" "}
            <strong>
              {removeDialogMember?.profile?.displayName ||
                removeDialogMember?.profile?.email ||
                "this member"}
            </strong>{" "}
            from the workspace? They will lose access immediately.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRemoveCancel}>Cancel</Button>
          <Button onClick={handleRemoveConfirm} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MemberList;
