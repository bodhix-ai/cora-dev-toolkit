"use client";

import { useState, useMemo } from "react";
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
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useOrgMembers } from "../../hooks/useOrgMembers";
import { validateEmail } from "../../lib/validation";
import { getRoleDisplayName } from "../../lib/permissions";

/**
 * Get a date 7 days in the future (default expiration)
 */
function getDefaultExpirationDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  // Format as YYYY-MM-DD for input[type="date"]
  return date.toISOString().split("T")[0];
}

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
  const [expiresAt, setExpiresAt] = useState(getDefaultExpirationDate());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Calculate minimum date (today) for the date picker
  const minDate = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

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
      // Convert date to ISO 8601 format with end-of-day time
      const expiresAtISO = expiresAt
        ? new Date(expiresAt + "T23:59:59").toISOString()
        : undefined;

      await inviteMember({ email, role, expiresAt: expiresAtISO });
      // Success - reset form and close
      setEmail("");
      setRole("org_user");
      setExpiresAt(getDefaultExpirationDate());
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
      setExpiresAt(getDefaultExpirationDate());
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
          <Typography variant="h6" component="span" fontWeight="semibold">
            Invite New Member
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
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
                  borderRadius: 2,
                }}
              >
                {roles.map((roleValue) => (
                  <MenuItem key={roleValue} value={roleValue}>
                    <Box>
                      <Typography fontWeight="medium">
                        {getRoleDisplayName(roleValue)}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'text.secondary',
                          display: 'block'
                        }}
                      >
                        {roleValue === "org_owner" &&
                          "Full control over organization"}
                        {roleValue === "org_admin" &&
                          "Can manage members and settings"}
                        {roleValue === "org_user" && "Basic member access"}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Expiration Date */}
            <TextField
              label="Invitation Expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              fullWidth
              disabled={submitting}
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                min: minDate,
              }}
              helperText="Invitation will expire at end of day (default: 7 days)"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                },
              }}
            />

            {/* Info Box */}
            <Box
              sx={{
                borderRadius: 2,
                bgcolor: (theme) => 
                  theme.palette.mode === 'dark' 
                    ? 'rgba(33, 150, 243, 0.15)' 
                    : 'rgba(33, 150, 243, 0.08)',
                border: 1,
                borderColor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(33, 150, 243, 0.3)'
                    : 'rgba(33, 150, 243, 0.2)',
                p: 1.5,
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  color: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(33, 150, 243, 0.9)'
                      : 'rgba(25, 118, 210, 1)'
                }}
              >
                💡 An invitation email will be sent to the specified address.
              </Typography>
            </Box>
          </Box>
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
