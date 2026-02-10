/**
 * Client Providers
 * 
 * Client-side provider component that initializes user authentication and profile fetching.
 * This matches the production pattern where a provider component (like UserProvider)
 * handles profile initialization automatically on sign-in.
 * 
 * Based on production patterns from career and policy stacks.
 */

'use client';
import * as React from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  // Call useAuth to fetch user profile and trigger auto-provisioning
  // This matches the production pattern where UserProvider calls profile fetching logic
  const { profile, isLoading, error } = useAuth();

  // Log auth state for debugging
  if (error) {
    console.error('[ClientProviders] Error:', error);
  }

  if (profile) {
    console.log('[ClientProviders] Profile loaded:', profile.email);
  }

  // Always render children - don't block on loading
  // Components can use useAuth hook directly if they need the profile data
  return <>{children}</>;
}
