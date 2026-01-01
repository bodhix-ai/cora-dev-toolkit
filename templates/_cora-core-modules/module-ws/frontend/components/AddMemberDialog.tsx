/**
 * AddMemberDialog Component
 *
 * Dialog for adding new members to a workspace.
 * Includes user search/selection and role assignment.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Autocomplete,
} from "@mui/material";
import { PersonAdd } from "@mui/icons-material";
import type { WorkspaceRole, UserProfile } from "../types";
import { ROLE_DISPLAY_NAMES, ROLE_DESCRIPTIONS } from "../types";

export interface AddMemberDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Workspace ID to add member to */
  workspaceId: string;
  /** Callback to add member (returns promise) */
  onAddMember?: (userId: string, role: WorkspaceRole) => Promise<void>;
  /** Callback when member is successfully added */
  onSuccess?: () => void;
  /** Available users to add (optional - for user search) */
  availableUsers?: UserProfile[];
  /** Whether to show loading state during user search */
  loadingUsers?: boolean;
  /** Callback to search for users */
  onSearchUsers?: (query: string) => Promise<UserProfile[]>;
}

export function AddMemberDialog({
  open,
  onClose,
  workspaceId,
  onAddMember,
  onSuccess,
  availableUsers = [],
  loadingUsers = false,
  onSearchUsers,
}: AddMemberDialogProps): React.ReactElement {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>("ws_user");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>(availableUsers);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle user search
  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query);
    
    if (!query || query.length < 2) {
      setSearchResults(availableUsers);
      return;
    }

    if (onSearchUsers) {
      setIsSearching(true);
      try {
        const results = await onSearchUsers(query);
        setSearchResults(results);
      } catch (err) {
        console.error("Failed to search users:", err);
        setError("Failed to search for users");
      } finally {
        setIsSearching(false);
      }
    } else {
      // Client-side filtering if no search callback provided
      const filtered = availableUsers.filter(
        (user) =>
          user.email.toLowerCase().includes(query.toLowerCase()) ||
          user.display_name?.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      setError("Please select a user to add");
      return;
    }

    if (!onAddMember) {
      console.warn("No onAddMember callback provided");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onAddMember(selectedUser.id, selectedRole);
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error("Failed to add member:", err);
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedUser(null);
    setSelectedRole("ws_user");
    setUserSearchQuery("");
    setSearchResults(availableUsers);
    setError(null);
    onClose();
  };

  const roles: WorkspaceRole[] = ["ws_owner", "ws_admin", "ws_user"];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PersonAdd />
          <Typography variant="h6">Add Member to Workspace</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* User Selection */}
        <Box sx={{ mb: 3 }}>
          <Autocomplete
            options={searchResults}
            value={selectedUser}
            onChange={(_, newValue) => setSelectedUser(newValue)}
            onInputChange={(_, newInputValue) => handleUserSearch(newInputValue)}
            getOptionLabel={(option) =>
              option.display_name
                ? `${option.display_name} (${option.email})`
                : option.email
            }
            loading={isSearching || loadingUsers}
            disabled={isSubmitting}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Users"
                placeholder="Enter name or email"
                helperText="Search for a user to add to this workspace"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isSearching || loadingUsers ? (
                        <CircularProgress size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box>
                  <Typography variant="body2">
                    {option.display_name || option.email}
                  </Typography>
                  {option.display_name && (
                    <Typography variant="caption" color="text.secondary">
                      {option.email}
                    </Typography>
                  )}
                </Box>
              </li>
            )}
            noOptionsText={
              userSearchQuery.length < 2
                ? "Type to search for users"
                : "No users found"
            }
          />
        </Box>

        {/* Role Selection */}
        <FormControl fullWidth disabled={isSubmitting}>
          <InputLabel>Role</InputLabel>
          <Select
            value={selectedRole}
            label="Role"
            onChange={(e) => setSelectedRole(e.target.value as WorkspaceRole)}
          >
            {roles.map((role) => (
              <MenuItem key={role} value={role}>
                <Box>
                  <Typography variant="body2">
                    {ROLE_DISPLAY_NAMES[role]}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ROLE_DESCRIPTIONS[role]}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!selectedUser || isSubmitting}
          startIcon={
            isSubmitting ? <CircularProgress size={20} /> : <PersonAdd />
          }
        >
          {isSubmitting ? "Adding..." : "Add Member"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddMemberDialog;
