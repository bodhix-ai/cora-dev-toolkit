"use client";

import { useRouter } from "next/navigation";
import { Box, Typography, CircularProgress, Grid, Button } from "@mui/material";
import { useUser } from "../../contexts/UserContext";
import { useOrganizationContext } from "../../hooks/useOrganizationContext";
import { useRole } from "../../hooks/useRole";
import { getRoleDisplayName } from "../../lib/permissions";

interface DashboardProps {
  features?: string[];
  showAdminSection?: boolean;
  showGettingStarted?: boolean;
}

interface NavigationCard {
  title: string;
  description: string;
  icon: string;
  href: string;
  colorScheme: {
    light: { bg: string; hover: string; border: string };
    dark: { bg: string; hover: string; border: string };
  };
}

/**
 * Dashboard Component
 *
 * Main dashboard layout for organization-based applications
 * - Welcome message with user name
 * - Current organization display
 * - Feature cards grid (customizable)
 * - Admin section (conditional)
 * - Getting started guide
 */
export function Dashboard({
  features = ["resume", "certifications", "campaigns", "documents"],
  showAdminSection = true,
  showGettingStarted = true,
}: DashboardProps) {
  const { profile } = useUser();
  const { currentOrganization, organizations, isLoading } =
    useOrganizationContext();
  const { role } = useRole();
  const router = useRouter();

  // Default feature cards configuration
  const featureCardConfigs: Record<string, NavigationCard> = {
    resume: {
      title: "Resume Management",
      description: "Create, update, and manage your professional resume",
      icon: "📄",
      href: "/resume",
      colorScheme: {
        light: { bg: "#eff6ff", hover: "#dbeafe", border: "#bfdbfe" },
        dark: { bg: "rgba(30, 64, 175, 0.2)", hover: "rgba(30, 64, 175, 0.3)", border: "rgba(59, 130, 246, 0.3)" },
      },
    },
    certifications: {
      title: "Certifications",
      description: "Track your professional certifications and achievements",
      icon: "🎓",
      href: "/certifications",
      colorScheme: {
        light: { bg: "#f0fdf4", hover: "#dcfce7", border: "#bbf7d0" },
        dark: { bg: "rgba(21, 128, 61, 0.2)", hover: "rgba(21, 128, 61, 0.3)", border: "rgba(34, 197, 94, 0.3)" },
      },
    },
    campaigns: {
      title: "Campaigns",
      description: "View and manage certification campaigns",
      icon: "🎯",
      href: "/campaigns",
      colorScheme: {
        light: { bg: "#faf5ff", hover: "#f3e8ff", border: "#e9d5ff" },
        dark: { bg: "rgba(107, 33, 168, 0.2)", hover: "rgba(107, 33, 168, 0.3)", border: "rgba(168, 85, 247, 0.3)" },
      },
    },
    documents: {
      title: "Documents",
      description: "Upload and manage your career documents",
      icon: "📁",
      href: "/documents",
      colorScheme: {
        light: { bg: "#fefce8", hover: "#fef9c3", border: "#fef08a" },
        dark: { bg: "rgba(133, 77, 14, 0.2)", hover: "rgba(133, 77, 14, 0.3)", border: "rgba(234, 179, 8, 0.3)" },
      },
    },
  };

  // Admin cards configuration
  const adminCards: NavigationCard[] = [
    {
      title: "Organization Settings",
      description: "Manage organization members and settings",
      icon: "⚙️",
      href: "/admin/organization",
      colorScheme: {
        light: { bg: "#f9fafb", hover: "#f3f4f6", border: "#e5e7eb" },
        dark: { bg: "rgba(63, 63, 70, 0.2)", hover: "rgba(63, 63, 70, 0.3)", border: "rgba(113, 113, 122, 0.3)" },
      },
    },
    {
      title: "User Management",
      description: "Manage users and permissions",
      icon: "👥",
      href: "/admin/users",
      colorScheme: {
        light: { bg: "#eef2ff", hover: "#e0e7ff", border: "#c7d2fe" },
        dark: { bg: "rgba(67, 56, 202, 0.2)", hover: "rgba(67, 56, 202, 0.3)", border: "rgba(99, 102, 241, 0.3)" },
      },
    },
  ];

  // Filter feature cards based on props
  const navigationCards = features
    .map((feature) => featureCardConfigs[feature])
    .filter(Boolean);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "#18181b" : "grey.50",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress size={48} />
          <Typography
            sx={{
              color: (theme) =>
                theme.palette.mode === "dark" ? "grey.400" : "grey.600",
              mt: 4,
            }}
          >
            Loading dashboard...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!profile || !currentOrganization) {
    return null;
  }

  const isAdmin = role === "org_owner" || role === "org_admin";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "#18181b" : "grey.50",
      }}
    >
      <Box
        sx={{
          mx: "auto",
          maxWidth: "1280px",
          px: { xs: 4, sm: 6, lg: 8 },
          py: 8,
        }}
      >
        {/* Welcome Header */}
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="h3"
            sx={{
              fontSize: "1.875rem",
              fontWeight: "bold",
              color: (theme) =>
                theme.palette.mode === "dark" ? "white" : "grey.900",
              mb: 2,
            }}
          >
            Welcome back
            {profile.firstName ? `, ${profile.firstName}` : ""}!
          </Typography>
          <Typography
            sx={{
              color: (theme) =>
                theme.palette.mode === "dark" ? "grey.400" : "grey.600",
            }}
          >
            Here's an overview of your career management dashboard
          </Typography>
        </Box>

        {/* Organization Info Card */}
        <Box
          sx={{
            mb: 8,
            borderRadius: "12px",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "#27272a" : "white",
            boxShadow: 3,
            p: 6,
            border: 1,
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "grey.700" : "grey.200",
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontSize: "1.125rem",
              fontWeight: 600,
              color: (theme) =>
                theme.palette.mode === "dark" ? "white" : "grey.900",
              mb: 4,
            }}
          >
            Current Organization
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "grey.400" : "grey.500",
                }}
              >
                Organization
              </Typography>
              <Typography
                sx={{
                  fontSize: "1rem",
                  fontWeight: 500,
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "white" : "grey.900",
                }}
              >
                {currentOrganization.orgName}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "grey.400" : "grey.500",
                }}
              >
                Your Role
              </Typography>
              <Typography
                sx={{
                  fontSize: "1rem",
                  fontWeight: 500,
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "white" : "grey.900",
                  textTransform: "capitalize",
                }}
              >
                {role ? getRoleDisplayName(role) : "Member"}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "grey.400" : "grey.500",
                }}
              >
                Email
              </Typography>
              <Typography
                sx={{
                  fontSize: "1rem",
                  fontWeight: 500,
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "white" : "grey.900",
                }}
              >
                {profile.email}
              </Typography>
            </Grid>
          </Grid>
          {organizations.length > 1 && (
            <Box
              sx={{
                mt: 4,
                pt: 4,
                borderTop: 1,
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "grey.700" : "grey.200",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "grey.400" : "grey.600",
                }}
              >
                💡 You belong to {organizations.length} organizations. Use the
                organization switcher in the header to switch between them.
              </Typography>
            </Box>
          )}
        </Box>

        {/* Navigation Cards */}
        {navigationCards.length > 0 && (
          <Box sx={{ mb: 8 }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: (theme) =>
                  theme.palette.mode === "dark" ? "white" : "grey.900",
                mb: 4,
              }}
            >
              Quick Access
            </Typography>
            <Grid container spacing={4}>
              {navigationCards.map((card) => (
                <Grid item xs={12} sm={6} md={3} key={card.href}>
                  <Button
                    onClick={() => router.push(card.href as any)}
                    sx={{
                      width: "100%",
                      textAlign: "left",
                      display: "block",
                      p: 6,
                      borderRadius: "12px",
                      border: 1,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? card.colorScheme.dark.bg
                          : card.colorScheme.light.bg,
                      borderColor: (theme) =>
                        theme.palette.mode === "dark"
                          ? card.colorScheme.dark.border
                          : card.colorScheme.light.border,
                      transition: "all 0.2s",
                      textTransform: "none",
                      "&:hover": {
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? card.colorScheme.dark.hover
                            : card.colorScheme.light.hover,
                        boxShadow: 3,
                      },
                    }}
                  >
                    <Box sx={{ fontSize: "1.875rem", mb: 3 }}>
                      {card.icon}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "1.125rem",
                        fontWeight: 600,
                        color: (theme) =>
                          theme.palette.mode === "dark" ? "white" : "grey.900",
                        mb: 2,
                      }}
                    >
                      {card.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        color: (theme) =>
                          theme.palette.mode === "dark"
                            ? "grey.400"
                            : "grey.600",
                      }}
                    >
                      {card.description}
                    </Typography>
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Admin Section - Only visible to org admins/owners */}
        {showAdminSection && isAdmin && (
          <Box sx={{ mb: 8 }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: (theme) =>
                  theme.palette.mode === "dark" ? "white" : "grey.900",
                mb: 4,
              }}
            >
              Administration
            </Typography>
            <Grid container spacing={4}>
              {adminCards.map((card) => (
                <Grid item xs={12} sm={6} md={4} key={card.href}>
                  <Button
                    onClick={() => router.push(card.href as any)}
                    sx={{
                      width: "100%",
                      textAlign: "left",
                      display: "block",
                      p: 6,
                      borderRadius: "12px",
                      border: 1,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? card.colorScheme.dark.bg
                          : card.colorScheme.light.bg,
                      borderColor: (theme) =>
                        theme.palette.mode === "dark"
                          ? card.colorScheme.dark.border
                          : card.colorScheme.light.border,
                      transition: "all 0.2s",
                      textTransform: "none",
                      "&:hover": {
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? card.colorScheme.dark.hover
                            : card.colorScheme.light.hover,
                        boxShadow: 3,
                      },
                    }}
                  >
                    <Box sx={{ fontSize: "1.875rem", mb: 3 }}>
                      {card.icon}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "1.125rem",
                        fontWeight: 600,
                        color: (theme) =>
                          theme.palette.mode === "dark" ? "white" : "grey.900",
                        mb: 2,
                      }}
                    >
                      {card.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        color: (theme) =>
                          theme.palette.mode === "dark"
                            ? "grey.400"
                            : "grey.600",
                      }}
                    >
                      {card.description}
                    </Typography>
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Getting Started Section */}
        {showGettingStarted && (
          <Box
            sx={{
              borderRadius: "12px",
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(30, 64, 175, 0.2)"
                  : "#eff6ff",
              border: 1,
              borderColor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(59, 130, 246, 0.5)"
                  : "#bfdbfe",
              p: 6,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: (theme) =>
                  theme.palette.mode === "dark" ? "#dbeafe" : "#1e3a8a",
                mb: 3,
              }}
            >
              🚀 Getting Started
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                fontSize: "0.875rem",
                color: (theme) =>
                  theme.palette.mode === "dark" ? "#93c5fd" : "#1e40af",
              }}
            >
              <Typography>
                • <strong>Upload your resume</strong> to get started with
                resume management
              </Typography>
              <Typography>
                • <strong>Add certifications</strong> to track your
                professional development
              </Typography>
              <Typography>
                • <strong>Explore campaigns</strong> to discover new
                certification opportunities
              </Typography>
              {isAdmin && (
                <Typography>
                  • <strong>Invite team members</strong> to collaborate within
                  your organization
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}