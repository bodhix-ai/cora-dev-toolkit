"use client";

import { useRouter } from "next/navigation";
import CircularProgress from "@mui/material/CircularProgress";
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
  color: string;
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
      color: "bg-blue-50 hover:bg-blue-100 border-blue-200",
    },
    certifications: {
      title: "Certifications",
      description: "Track your professional certifications and achievements",
      icon: "🎓",
      href: "/certifications",
      color: "bg-green-50 hover:bg-green-100 border-green-200",
    },
    campaigns: {
      title: "Campaigns",
      description: "View and manage certification campaigns",
      icon: "🎯",
      href: "/campaigns",
      color: "bg-purple-50 hover:bg-purple-100 border-purple-200",
    },
    documents: {
      title: "Documents",
      description: "Upload and manage your career documents",
      icon: "📁",
      href: "/documents",
      color: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200",
    },
  };

  // Admin cards configuration
  const adminCards: NavigationCard[] = [
    {
      title: "Organization Settings",
      description: "Manage organization members and settings",
      icon: "⚙️",
      href: "/admin/organization",
      color: "bg-gray-50 hover:bg-gray-100 border-gray-200",
    },
    {
      title: "User Management",
      description: "Manage users and permissions",
      icon: "👥",
      href: "/admin/users",
      color: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200",
    },
  ];

  // Filter feature cards based on props
  const navigationCards = features
    .map((feature) => featureCardConfigs[feature])
    .filter(Boolean);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-900">
        <div className="text-center">
          <CircularProgress size={48} />
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!profile || !currentOrganization) {
    return null;
  }

  const isAdmin = role === "org_owner" || role === "org_admin";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back
            {profile.firstName ? `, ${profile.firstName}` : ""}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here's an overview of your career management dashboard
          </p>
        </div>

        {/* Organization Info Card */}
        <div className="mb-8 rounded-lg bg-white dark:bg-zinc-800 shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Organization
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Organization
              </p>
              <p className="text-base font-medium text-gray-900 dark:text-white">
                {currentOrganization.orgName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your Role
              </p>
              <p className="text-base font-medium text-gray-900 dark:text-white capitalize">
                {role ? getRoleDisplayName(role) : "Member"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">
                {profile.email}
              </p>
            </div>
          </div>
          {organizations.length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                💡 You belong to {organizations.length} organizations. Use the
                organization switcher in the header to switch between them.
              </p>
            </div>
          )}
        </div>

        {/* Navigation Cards */}
        {navigationCards.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Access
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {navigationCards.map((card) => (
                <button
                  key={card.href}
                  onClick={() => router.push(card.href as any)}
                  className={`${card.color} border rounded-lg p-6 text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700`}
                >
                  <div className="text-3xl mb-3">{card.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {card.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Admin Section - Only visible to org admins/owners */}
        {showAdminSection && isAdmin && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Administration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adminCards.map((card) => (
                <button
                  key={card.href}
                  onClick={() => router.push(card.href as any)}
                  className={`${card.color} border rounded-lg p-6 text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700`}
                >
                  <div className="text-3xl mb-3">{card.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {card.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Getting Started Section */}
        {showGettingStarted && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              🚀 Getting Started
            </h2>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p>
                • <strong>Upload your resume</strong> to get started with resume
                management
              </p>
              <p>
                • <strong>Add certifications</strong> to track your professional
                development
              </p>
              <p>
                • <strong>Explore campaigns</strong> to discover new
                certification opportunities
              </p>
              {isAdmin && (
                <p>
                  • <strong>Invite team members</strong> to collaborate within
                  your organization
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
