"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { Profile } from "../../types";
import { getRoleDisplayName } from "../../lib/permissions";

interface ProfileCardProps {
  profile: Profile;
  showEdit?: boolean;
  onEdit?: () => void;
}

/**
 * ProfileCard Component
 *
 * Displays user profile information in a card format
 * - Avatar with user initials
 * - Name, email, role
 * - Phone and member since date
 * - Optional edit button
 */
export function ProfileCard({
  profile,
  showEdit = false,
  onEdit,
}: ProfileCardProps) {
  // Get user initials
  const getUserInitials = () => {
    if (profile.firstName && profile.lastName) {
      return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
    }
    if (profile.email) {
      return profile.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  // Get full user name
  const getUserName = () => {
    if (profile.firstName && profile.lastName) {
      return `${profile.firstName} ${profile.lastName}`;
    }
    if (profile.name) {
      return profile.name;
    }
    return profile.email;
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card
      sx={{
        bgcolor: "background.paper",
        borderRadius: "12px",
        boxShadow: 3,
        border: 1,
        borderColor: (theme) =>
          theme.palette.mode === "dark" ? "grey.700" : "grey.200",
      }}
    >
      <CardContent sx={{ p: 6 }}>
        {/* Header with Avatar and Edit Button */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            mb: 6,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                fontSize: "1.5rem",
                bgcolor: "rgb(59, 130, 246)",
                color: "white",
              }}
            >
              {getUserInitials()}
            </Avatar>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "white" : "grey.900",
                }}
              >
                {getUserName()}
              </Typography>
              {/* Role Badge */}
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  px: 3,
                  py: 1,
                  mt: 2,
                  borderRadius: "9999px",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(30, 64, 175, 0.2)"
                      : "rgba(219, 234, 254, 1)",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "primary.light" : "primary.main",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                {profile.sysRole === "sys_owner"
                  ? "System Owner"
                  : getRoleDisplayName(profile.sysRole)}
              </Box>
            </Box>
          </Box>
          {showEdit && onEdit && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={onEdit}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
              }}
            >
              Edit
            </Button>
          )}
        </Box>

        {/* Profile Details */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Email */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <EmailIcon
              fontSize="small"
              sx={{
                color: (theme) =>
                  theme.palette.mode === "dark" ? "grey.500" : "grey.400",
              }}
            />
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.75rem",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "grey.400" : "grey.500",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 600,
                }}
              >
                Email
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: "0.875rem",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "white" : "grey.900",
                }}
              >
                {profile.email}
              </Typography>
            </Box>
          </Box>

          {/* Phone */}
          {profile.phone && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <PhoneIcon
                fontSize="small"
                sx={{
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "grey.500" : "grey.400",
                }}
              />
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.75rem",
                    color: (theme) =>
                      theme.palette.mode === "dark" ? "grey.400" : "grey.500",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  Phone
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: "0.875rem",
                    color: (theme) =>
                      theme.palette.mode === "dark" ? "white" : "grey.900",
                  }}
                >
                  {profile.phone}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Member Since */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <CalendarTodayIcon
              fontSize="small"
              sx={{
                color: (theme) =>
                  theme.palette.mode === "dark" ? "grey.500" : "grey.400",
              }}
            />
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.75rem",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "grey.400" : "grey.500",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 600,
                }}
              >
                Member Since
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: "0.875rem",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "white" : "grey.900",
                }}
              >
                {formatDate(profile.createdAt)}
              </Typography>
            </Box>
          </Box>

          {/* Organizations Count */}
          {profile.organizations && profile.organizations.length > 0 && (
            <Box
              sx={{
                pt: 4,
                borderTop: 1,
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "grey.700" : "grey.200",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.75rem",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "grey.400" : "grey.500",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 600,
                  mb: 2,
                  display: "block",
                }}
              >
                Organizations
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: "0.875rem",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "white" : "grey.900",
                }}
              >
                Member of {profile.organizations.length}{" "}
                {profile.organizations.length === 1
                  ? "organization"
                  : "organizations"}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}