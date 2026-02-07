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
  Chip,
  Alert,
  AlertTitle,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Search, Person, Edit, Delete } from "@mui/icons-material";
import { useUser, useRole } from "@{{PROJECT_NAME}}/module-access";
import { createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";

/**
 * Organization Access Admin Component
 * Allows org admins to view users, org owners to manage roles and access.
 *
 * @component OrgAccessAdmin
 * @routes
 * - GET /admin/org/access/users - List organization users
 * - PUT /admin/org/access/users/{userId} - Update user role
 * - DELETE /admin/org/access/users/{userId} - Remove user from organization
 */

interface OrgUser {
  userId: string;
  email: string;
  fullName?: string;
  orgRole: string;
  createdAt: string;
  lastSigninAt?: string;
}

export const OrgAccessAdmin = () => {
  const { authAdapter, loading: authLoading, isAuthenticated, profile } = useUser();
  const { isOrgAdmin, hasPermission } = useRole();
  const isOrgOwner = hasPermission('org_owner');
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<OrgUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<OrgUser | null>(null);

  useEffect(() => {
    if (!authLoading && profile) {
      fetchUsers();
    }
  }, [authLoading, profile]);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!authAdapter) {
        setError("Authentication required");
        return;
      }

      const token = await authAdapter.getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const apiClient = createCoraAuthenticatedClient(token);
      const response = await apiClient.get<{ success: boolean; data: OrgUser[] }>(
        "/admin/org/access/users"
      );

      if (response.success) {
        setUsers(response.data || []);
      } else {
        setError("Failed to load users");
      }
    } catch (err) {
      setError("Failed to load users");
      console.error("Error fetching org users:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.fullName?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      if (!authAdapter) return;

      const token = await authAdapter.getToken();
      if (!token) return;

      const apiClient = createCoraAuthenticatedClient(token);
      await apiClient.put(`/admin/org/access/users/${userId}`, {
        org_role: newRole,
      });

      await fetchUsers();
      setEditingUser(null);
    } catch (err) {
      setError("Failed to update user role");
      console.error("Error updating user role:", err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      if (!authAdapter) return;

      const token = await authAdapter.getToken();
      if (!token) return;

      const apiClient = createCoraAuthenticatedClient(token);
      await apiClient.delete(`/admin/org/access/users/${userId}`);

      await fetchUsers();
      setDeletingUser(null);
    } catch (err) {
      setError("Failed to remove user");
      console.error("Error removing user:", err);
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

  if (authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated || !profile) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <AlertTitle>Access Denied</AlertTitle>
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }

  if (!isOrgAdmin && !isOrgOwner) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <AlertTitle>Access Denied</AlertTitle>
          Organization admin access required.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Organization Access Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isOrgOwner
            ? "Manage user roles and access in your organization."
            : "View users in your organization. Contact an org owner to modify roles."}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
          aria-label="Search users"
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {filteredUsers.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {searchQuery ? "No users match your search." : "No users found."}
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Last Sign In</TableCell>
                <TableCell>Joined</TableCell>
                {isOrgOwner && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((orgUser) => (
                <TableRow key={orgUser.userId} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Person fontSize="small" color="action" />
                      <Typography variant="subtitle2">
                        {orgUser.fullName || "No name"}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {orgUser.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={orgUser.orgRole.replace("org_", "")}
                      size="small"
                      color={getRoleColor(orgUser.orgRole)}
                    />
                  </TableCell>
                  <TableCell>
                    {orgUser.lastSigninAt ? (
                      <Typography variant="body2">
                        {new Date(orgUser.lastSigninAt).toLocaleDateString()}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Never
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(orgUser.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  {isOrgOwner && (
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => setEditingUser(orgUser)}
                        aria-label="Edit user role"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setDeletingUser(orgUser)}
                        disabled={orgUser.userId === profile.id}
                        aria-label="Remove user"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredUsers.length} of {users.length} users
        </Typography>
      </Box>

      {editingUser && (
        <EditRoleDialog
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleUpdateRole}
        />
      )}

      {deletingUser && (
        <DeleteUserDialog
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onConfirm={() => handleDeleteUser(deletingUser.userId)}
        />
      )}
    </Box>
  );
};

function EditRoleDialog({
  user,
  onClose,
  onSave,
}: {
  user: OrgUser;
  onClose: () => void;
  onSave: (userId: string, newRole: string) => void;
}) {
  const [newRole, setNewRole] = useState(user.orgRole);

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit User Role</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography variant="body2" gutterBottom>
            User: <strong>{user.fullName || user.email}</strong>
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Organization Role</InputLabel>
            <Select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              label="Organization Role"
            >
              <MenuItem value="org_member">Member</MenuItem>
              <MenuItem value="org_admin">Admin</MenuItem>
              <MenuItem value="org_owner">Owner</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(user.userId, newRole)} variant="contained">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DeleteUserDialog({
  user,
  onClose,
  onConfirm,
}: {
  user: OrgUser;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Remove User from Organization?</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Warning</AlertTitle>
          This action will remove the user from your organization. They will lose access to all
          organization resources.
        </Alert>
        <Typography variant="body2">
          User: <strong>{user.fullName || user.email}</strong>
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="error">
          Remove User
        </Button>
      </DialogActions>
    </Dialog>
  );
}