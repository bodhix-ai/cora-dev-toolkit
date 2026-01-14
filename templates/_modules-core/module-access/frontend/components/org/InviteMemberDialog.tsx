"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { useOrgMembers } from "../../hooks/useOrgMembers";
import { validateEmail } from "../../lib/validation";
import { getRoleDisplayName } from "../../lib/permissions";

interface InviteMemberDialogProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
}

/**
 * InviteMemberDialog Component
 *
 * Modal/dialog for inviting new members
 * - Email input with validation
 * - Role selector dropdown (org_user, org_admin, org_owner)
 * - Submit/Cancel buttons
 */
export function InviteMemberDialog({
  open,
  onClose,
  orgId,
}: InviteMemberDialogProps) {
  const { inviteMember } = useOrgMembers(orgId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"org_user" | "org_admin" | "org_owner">(
    "org_user"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!email) {
      setEmailError("Email is required");
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setEmailError(emailError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await inviteMember({ email, role });
      // Success - reset form and close
      setEmail("");
      setRole("org_user");
      setEmailError(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setEmail("");
      setRole("org_user");
      setEmailError(null);
      setError(null);
      onClose();
    }
  };

  const roles: Array<"org_user" | "org_admin" | "org_owner"> = [
    "org_user",
    "org_admin",
    "org_owner",
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <span className="text-xl font-semibold text-gray-900 dark:text-white">
            Invite New Member
          </span>
        </DialogTitle>

        <DialogContent>
          <div className="space-y-4 pt-2">
            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ borderRadius: "8px" }}>
                {error}
              </Alert>
            )}

            {/* Email Field */}
            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => {
                if (email) {
                  const error = validateEmail(email);
                  if (error) {
                    setEmailError(error);
                  }
                }
              }}
              error={!!emailError}
              helperText={
                emailError || "Enter the email of the person to invite"
              }
              fullWidth
              required
              disabled={submitting}
              autoFocus
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                },
              }}
            />

            {/* Role Selector */}
            <FormControl fullWidth required disabled={submitting}>
              <InputLabel>Role</InputLabel>
              <Select
                value={role}
                label="Role"
                onChange={(e) =>
                  setRole(
                    e.target.value as "org_user" | "org_admin" | "org_owner"
                  )
                }
                sx={{
                  borderRadius: "8px",
                }}
              >
                {roles.map((roleValue) => (
                  <MenuItem key={roleValue} value={roleValue}>
                    <div>
                      <div className="font-medium">
                        {getRoleDisplayName(roleValue)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {roleValue === "org_owner" &&
                          "Full control over organization"}
                        {roleValue === "org_admin" &&
                          "Can manage members and settings"}
                        {roleValue === "org_user" && "Basic member access"}
                      </div>
                    </div>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Info Box */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 An invitation email will be sent to the specified address.
              </p>
            </div>
          </div>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleClose}
            disabled={submitting}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || !!emailError || !email}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              minWidth: 120,
            }}
          >
            {submitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Send Invite"
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
