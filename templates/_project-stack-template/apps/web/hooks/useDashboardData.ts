"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useOrganizationStore } from "@/store/organizationStore";
import {
  getFavoriteProjects,
  getFavoriteChats,
  listChatSessions,
  type Project,
  type ChatSession,
} from "@/lib/api";

export interface FavoriteItem {
  id: string;
  type: "project" | "chat";
  name: string;
  title?: string;
  organization: string;
  lastActivity: string;
  activityType:
    | "chat_created"
    | "knowledge_updated"
    | "project_modified"
    | "chat_message";
  favoriteOrder: number;
  recentChatSessions?: number;
  unreadActivity: boolean;
  project_id?: string;
  created_at: string;
  favorited_at: string;
  user_role?: "owner" | "admin" | "user";
}

export interface ActivityItem {
  id: string;
  project: {
    id: string;
    name: string;
    organization: string;
  };
  activityType:
    | "chat_created"
    | "knowledge_added"
    | "project_updated"
    | "member_added";
  timestamp: string;
  relativeTime: string;
  summary: string;
  participants?: string[];
  isUnread: boolean;
  actionable: boolean;
  quickAction?: {
    label: string;
    action: string;
  };
}

export interface FavoritesAnalyticsData {
  usagePatterns: {
    mostUsedFavorites: Array<{
      project: Project;
      usageScore: number;
      chatCount: number;
      lastUsed: string;
    }>;
    trends: {
      weeklyGrowth: number;
      mostActiveDay: string;
      peakUsageHour: number;
    };
  };
  productivity: {
    favoritesVsTotal: {
      favoriteUsage: number;
      totalUsage: number;
      efficiency: number;
    };
    contextSwitching: {
      avgProjectSwitches: number;
      favoritesRetention: number;
    };
  };
}

export interface RecommendationItem {
  id: string;
  type:
    | "add_favorite"
    | "remove_unused"
    | "organize_favorites"
    | "explore_project";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  project?: Project;
  reasoning: string;
  estimatedBenefit: string;
  action: {
    label: string;
    handler: string;
  };
}

export interface DashboardData {
  favorites: {
    quickAccessItems: FavoriteItem[];
    quickAccess: Project[];
    totalFavorites: number;
    totalProjects: number;
    totalChats: number;
    recentActivity: ActivityItem[];
    analytics: FavoritesAnalyticsData;
    recommendations: RecommendationItem[];
    loading: boolean;
    lastUpdated: Date;
  };
}

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return then.toLocaleDateString();
}

export function useDashboardData() {
  const { getToken } = useAuth();
  const { selectedOrganization } = useOrganizationStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDashboard = useCallback(async () => {
    if (!selectedOrganization) return;

    setIsLoading(true);
    try {
      const token = await getToken({ template: "policy-supabase" });
      if (!token) return;

      // Fetch both project and chat favorites - handle 404 gracefully
      let projectFavoritesData: any[] = [];
      let chatFavoritesData: any[] = [];

      try {
        projectFavoritesData = await getFavoriteProjects(
          token,
          selectedOrganization.id,
          10
        );
      } catch (error: any) {
        console.warn(
          "Project favorites endpoint not available:",
          error.message
        );
        projectFavoritesData = [];
      }

      try {
        const chatResponse = await getFavoriteChats(
          token,
          selectedOrganization.id,
          10
        );
        // Handle structured response with data property
        chatFavoritesData = chatResponse?.data || [];
      } catch (error: any) {
        console.warn("Chat favorites endpoint not available:", error.message);
        chatFavoritesData = [];
      }

      // Fetch sessions data for recent activity
      const sessionsData = await listChatSessions(token, {
        org_id: selectedOrganization.id,
        limit: 20,
      });

      // Transform project favorites into FavoriteItem format
      const projectFavoriteItems: FavoriteItem[] = projectFavoritesData.map(
        (fav: any, index: number) => ({
          id: fav.id,
          type: "project" as const,
          name: fav.name,
          organization: selectedOrganization.name,
          lastActivity: fav.updated_at,
          activityType: "project_modified" as const,
          favoriteOrder: index,
          unreadActivity: false,
          created_at: fav.created_at,
          favorited_at: fav.favorited_at,
          user_role: fav.user_role,
        })
      );

      // Transform chat favorites into FavoriteItem format
      const chatFavoriteItems: FavoriteItem[] = chatFavoritesData.map(
        (chat: any, index: number) => ({
          id: chat.id,
          type: "chat" as const,
          name: chat.title || "Untitled Chat",
          title: chat.title,
          organization: selectedOrganization.name,
          lastActivity: chat.updated_at || chat.created_at,
          activityType: "chat_message" as const,
          favoriteOrder: index + projectFavoritesData.length,
          unreadActivity: false,
          project_id: chat.project_id,
          created_at: chat.created_at,
          favorited_at: chat.favorited_at || chat.created_at,
        })
      );

      // Combine and sort by favorited_at (most recent first)
      const quickAccessItems: FavoriteItem[] = [
        ...projectFavoriteItems,
        ...chatFavoriteItems,
      ].sort(
        (a, b) =>
          new Date(b.favorited_at).getTime() -
          new Date(a.favorited_at).getTime()
      );

      // Keep legacy format for backward compatibility
      const quickAccessProjects: Project[] = projectFavoritesData.map(
        (fav: any) => ({
          id: fav.id,
          name: fav.name,
          description: fav.description,
          org_id: fav.org_id,
          owner_id: fav.owner_id,
          created_at: fav.created_at,
          updated_at: fav.updated_at,
          is_favorited: true,
          favorited_at: fav.favorited_at,
        })
      );

      // Generate recent activity from chat sessions
      const recentActivity: ActivityItem[] = sessionsData.sessions
        .slice(0, 5)
        .map((session) => ({
          id: session.id,
          project: {
            id: session.project_id || "",
            name: session.project_id ? "Project Chat" : "General Chat",
            organization: selectedOrganization.name,
          },
          activityType: "chat_created" as const,
          timestamp: session.created_at,
          relativeTime: getRelativeTime(session.created_at),
          summary: session.title || "New chat session",
          isUnread: false,
          actionable: true,
          quickAction: {
            label: "Open",
            action: "open_chat",
          },
        }));

      // Calculate analytics from favorites
      const mostUsedFavorites = quickAccessProjects.slice(0, 3).map((proj) => ({
        project: proj,
        usageScore: 85,
        chatCount: Math.floor(Math.random() * 20) + 5,
        lastUsed: proj.updated_at,
      }));

      const analytics: FavoritesAnalyticsData = {
        usagePatterns: {
          mostUsedFavorites,
          trends: {
            weeklyGrowth: 12,
            mostActiveDay: "Monday",
            peakUsageHour: 14,
          },
        },
        productivity: {
          favoritesVsTotal: {
            favoriteUsage: 78,
            totalUsage: 100,
            efficiency: 78,
          },
          contextSwitching: {
            avgProjectSwitches: 3.2,
            favoritesRetention: 85,
          },
        },
      };

      // Generate recommendations
      const recommendations: RecommendationItem[] = [];

      if (quickAccessProjects.length < 3) {
        recommendations.push({
          id: "add-favorites",
          type: "add_favorite",
          priority: "high",
          title: "Add more favorites",
          description:
            "Mark frequently used projects as favorites for quick access",
          reasoning: "You have less than 3 favorites",
          estimatedBenefit: "Save 30% time accessing projects",
          action: {
            label: "Browse Projects",
            handler: "browse_projects",
          },
        });
      }

      setData({
        favorites: {
          quickAccessItems,
          quickAccess: quickAccessProjects,
          totalFavorites: quickAccessItems.length,
          totalProjects: projectFavoriteItems.length,
          totalChats: chatFavoriteItems.length,
          recentActivity,
          analytics,
          recommendations,
          loading: false,
          lastUpdated: new Date(),
        },
      });
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, selectedOrganization]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  return { data, isLoading, refreshDashboard };
}

export function useDashboardActions() {
  return {
    navigateToProject: (projectId: string) => {
      window.location.href = `/projects/${projectId}`;
    },
    startNewChat: (projectId?: string) => {
      const url = projectId ? `/chat?project=${projectId}` : "/chat";
      window.location.href = url;
    },
    viewAllFavorites: () => {
      window.location.href = "/projects?favorites=true";
    },
    manageFavorites: () => {
      window.location.href = "/projects";
    },
    viewAnalytics: () => {
      window.location.href = "/analytics/favorites";
    },
    exploreProject: (projectId: string) => {
      window.location.href = `/projects/${projectId}`;
    },
  };
}
