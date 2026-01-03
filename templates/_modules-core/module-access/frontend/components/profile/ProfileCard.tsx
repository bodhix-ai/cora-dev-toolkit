"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
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
      className="shadow-md border border-gray-200 dark:border-gray-700"
      sx={{
        bgcolor: "background.paper",
        borderRadius: "12px",
      }}
    >
      <CardContent className="p-6">
        {/* Header with Avatar and Edit Button */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
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
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {getUserName()}
              </h2>
              {/* Role Badge */}
              <div className="inline-flex items-center px-3 py-1 mt-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium">
                {profile.globalRole === "platform_owner" 
                  ? "Platform Owner" 
                  : getRoleDisplayName(profile.globalRole)}
              </div>
            </div>
          </div>
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
        </div>

        {/* Profile Details */}
        <div className="space-y-4">
          {/* Email */}
          <div className="flex items-center gap-3">
            <EmailIcon
              className="text-gray-400 dark:text-gray-500"
              fontSize="small"
            />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">
                Email
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {profile.email}
              </p>
            </div>
          </div>

          {/* Phone */}
          {profile.phone && (
            <div className="flex items-center gap-3">
              <PhoneIcon
                className="text-gray-400 dark:text-gray-500"
                fontSize="small"
              />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">
                  Phone
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {profile.phone}
                </p>
              </div>
            </div>
          )}

          {/* Member Since */}
          <div className="flex items-center gap-3">
            <CalendarTodayIcon
              className="text-gray-400 dark:text-gray-500"
              fontSize="small"
            />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">
                Member Since
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {formatDate(profile.createdAt)}
              </p>
            </div>
          </div>

          {/* Organizations Count */}
          {profile.organizations && profile.organizations.length > 0 && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-2">
                Organizations
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                Member of {profile.organizations.length}{" "}
                {profile.organizations.length === 1
                  ? "organization"
                  : "organizations"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
