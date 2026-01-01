/**
 * Session Tracking Component
 * 
 * Tracks user login/logout events and creates session records for audit trail.
 * Works with both Clerk and NextAuth (Okta) authentication providers.
 * 
 * Features:
 * - Calls POST /profiles/me/login when user successfully authenticates
 * - Calls POST /profiles/me/logout when user signs out
 * - Prevents duplicate login calls with tracking
 * - Handles both Clerk and NextAuth logout flows
 * 
 * @example
 * ```tsx
 * // In app/layout.tsx (inside UserProvider)
 * <UserProvider>
 *   <SessionTracking />
 *   {children}
 * </UserProvider>
 * ```
 */

"use client";

import { useEffect, useRef } from "react";
import { useUser } from "../contexts/UserContext";
import { createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";

/**
 * SessionTracking Component
 * 
 * Must be placed inside UserProvider to access user context.
 * Automatically tracks login/logout events without requiring user interaction.
 */
export function SessionTracking() {
  const { profile, isAuthenticated, authAdapter } = useUser();
  const loginTrackedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  
  // Store authAdapter in a ref to avoid re-render loops from dependency changes
  // This ensures stable references for the async tracking functions
  const authAdapterRef = useRef(authAdapter);
  authAdapterRef.current = authAdapter;

  // Track login when profile is successfully loaded
  useEffect(() => {
    async function trackLogin() {
      // Only track once per session
      if (loginTrackedRef.current) return;
      
      // Require authentication and profile
      if (!isAuthenticated || !profile) return;

      try {
        // Use ref to get current authAdapter without dependency
        const token = await authAdapterRef.current.getToken();
        if (!token) {
          console.warn("[SessionTracking] No auth token available for login tracking");
          return;
        }

        const client = createCoraAuthenticatedClient(token);
        
        // Call login endpoint
        const response = (await client.post("/profiles/me/login", {})) as any;

        if (response?.success && response?.data) {
          sessionIdRef.current = response.data.sessionId;
          loginTrackedRef.current = true;
          console.log("[SessionTracking] Login tracked, session ID:", response.data.sessionId);
        } else {
          console.warn("[SessionTracking] Failed to track login:", response?.error);
        }
      } catch (error) {
        console.error("[SessionTracking] Error tracking login:", error);
      }
    }

    trackLogin();
  }, [isAuthenticated, profile]); // Removed authAdapter from dependencies

  // Track logout on unmount (user navigates away or closes browser)
  // Note: This only works reliably on explicit logout, not on browser close
  useEffect(() => {
    return () => {
      // Only track logout if we previously tracked a login
      if (!loginTrackedRef.current) return;

      // Use sendBeacon for reliable logout tracking on page unload
      const trackLogout = async () => {
        try {
          // Use ref to get current authAdapter without dependency
          const token = await authAdapterRef.current.getToken();
          if (!token) return;

          const client = createCoraAuthenticatedClient(token);
          
          // Call logout endpoint
          await client.post("/profiles/me/logout", {});
          
          console.log("[SessionTracking] Logout tracked");
        } catch (error) {
          // Silently fail - user is leaving anyway
          console.debug("[SessionTracking] Error tracking logout:", error);
        }
      };

      trackLogout();
    };
  }, []); // Empty dependency array - cleanup only runs on unmount

  // This component doesn't render anything
  return null;
}
