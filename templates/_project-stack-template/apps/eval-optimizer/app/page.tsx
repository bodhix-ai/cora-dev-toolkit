"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

/**
 * Landing Page for Eval Optimizer - Sprint 1 Prototype
 * 
 * Purpose: Prove authentication integration works with shared Okta/Cognito.
 * 
 * Demonstrates:
 * - useSession() hook retrieves session from NextAuth
 * - Access token is available for API calls
 * - User can navigate to optimizer workflow
 */
export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>CORA Eval Optimizer</h1>
        <p>Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>CORA Eval Optimizer</h1>
        <p>Please sign in to continue.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>CORA Eval Optimizer</h1>
      <p>Welcome, {session.user?.name || session.user?.email}!</p>
      
      <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
        <h2>Sprint 1 Prototype</h2>
        <p>This minimal prototype demonstrates:</p>
        <ul>
          <li>✅ Shared authentication with main CORA app</li>
          <li>✅ Session management via NextAuth</li>
          <li>✅ Access token available for API calls</li>
          <li>⏳ API integration with CORA modules (next step)</li>
        </ul>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h3>Session Information</h3>
        <pre style={{ backgroundColor: "#f5f5f5", padding: "1rem", borderRadius: "8px", overflow: "auto" }}>
          {JSON.stringify({
            user: session.user,
            hasAccessToken: !!session.accessToken,
            expiresAt: session.expiresAt,
          }, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <Link 
          href="/optimizer" 
          style={{ 
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            backgroundColor: "#007bff",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
          }}
        >
          Go to Optimizer Workflow →
        </Link>
      </div>
    </div>
  );
}