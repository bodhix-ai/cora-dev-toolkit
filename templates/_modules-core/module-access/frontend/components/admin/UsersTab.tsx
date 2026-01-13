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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Search, Person } from "@mui/icons-material";
import { CoraAuthAdapter, createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";

/**
 * User type
 */
interface User {
  id: string;
  email: string;
  name?: string;
  sysRole?: string;
  orgMemberships?: {
    orgId: string;
    orgName: string;
    orgRole: string;
  }[];
  createdAt: string;
  lastSignInAt?: string;
}

interface UsersTabProps {
  authAdapter: CoraAuthAdapter;
}

/**
 * Users Tab Component
 * 
 * Displays platform-wide user list for platform admins.
 * Includes search, filtering by role and organization.
 */
export function UsersTab({ authAdapter }: UsersTabProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await authAdapter.getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }
      const apiClient = createCoraAuthenticatedClient(token);
      const response = await apiClient.get<{ success: boolean; data: User[] }>("/admin/users");
      if (response.success) {
        setUsers(response.data || []);
      } else {
        setError("Failed to load users");
      }
    } catch (err) {
      setError("Failed to load users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.name?.toLowerCase().includes(query)
      );
    }

    // Filter by role
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.sysRole === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case "sys_owner":
        return "error";
      case "sys_admin":
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
        <Typography variant="h6">Platform Users</Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
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
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Role Filter</InputLabel>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              label="Role Filter"
              aria-label="Filter by role"
            >
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="sys_owner">System Owner</MenuItem>
              <MenuItem value="sys_admin">System Admin</MenuItem>
              <MenuItem value="">No System Role</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {filteredUsers.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {searchQuery || roleFilter !== "all"
              ? "No users match your filters."
              : "No users found."}
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>System Role</TableCell>
                <TableCell>Organizations</TableCell>
                <TableCell>Last Sign In</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Person fontSize="small" color="action" />
                      <Typography variant="subtitle2">
                        {user.name || "No name"}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {user.sysRole ? (
                      <Chip
                        label={user.sysRole.replace("_", " ")}
                        size="small"
                        color={getRoleColor(user.sysRole)}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        None
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.orgMemberships && user.orgMemberships.length > 0 ? (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                        {user.orgMemberships.map((membership, idx) => (
                          <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="body2">
                              {membership.orgName}
                            </Typography>
                            <Chip
                              label={membership.orgRole.replace("org_", "")}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No organizations
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.lastSignInAt ? (
                      <Typography variant="body2">
                        {new Date(user.lastSignInAt).toLocaleDateString()}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Never
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
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
    </Box>
  );
}
