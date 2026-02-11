import { NextResponse } from 'next/server';

/**
 * Health check endpoint for container orchestration (App Runner, ECS, etc.)
 * Returns 200 OK if the application is running
 * 
 * Path: /api/healthcheck (matches working deployments)
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'web',
    },
    { status: 200 }
  );
}
