/**
 * Organization Analytics Tab - Organization Chat Analytics
 *
 * Displays organization-level chat usage statistics including:
 * - Total sessions and messages
 * - Most active users
 * - Most active workspaces
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";
import {
  getOrgAdminAnalytics,
  getOrgAdminUserStats,
  getOrgAdminWorkspaceStats,
} from "../../lib/api";

/**
 * Props for OrgAnalyticsTab
 * ADR-019: orgId and authAdapter passed from parent page
 */
interface OrgAnalyticsTabProps {
  orgId: string;
  authAdapter: CoraAuthAdapter;
}

interface AnalyticsData {
  totalSessions: number;
  totalMessages: number;
}

interface UserStats {
  mostActiveUsers: Array<{
    userId: string;
    userName: string;
    sessionCount: number;
  }>;
}

interface WorkspaceStats {
  mostActiveWorkspaces: Array<{
    workspaceId: string;
    workspaceName: string;
    sessionCount: number;
  }>;
}

export function OrgAnalyticsTab({ orgId, authAdapter }: OrgAnalyticsTabProps): React.ReactElement {
  const { isAuthenticated } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceStats | null>(null);

  // Load analytics data
  useEffect(() => {
    if (!isAuthenticated || !authAdapter) return;

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const token = await authAdapter.getToken();
        if (!token) {
          setError("Failed to get authentication token");
          setLoading(false);
          return;
        }
        
        const [analyticsData, userData, workspaceData] = await Promise.all([
          getOrgAdminAnalytics(token, orgId),
          getOrgAdminUserStats(token, orgId),
          getOrgAdminWorkspaceStats(token, orgId),
        ]);

        setAnalytics(analyticsData);
        setUserStats(userData);
        setWorkspaceStats(workspaceData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Organization Analytics
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Overview of chat usage in your organization
      </Typography>

      <Grid container spacing={3}>
        {/* Total Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Total Sessions
              </Typography>
              <Typography sx={{ fontSize: '2.125rem', fontWeight: 400 }} color="primary">
                {(analytics?.totalSessions ?? 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Total Messages
              </Typography>
              <Typography sx={{ fontSize: '2.125rem', fontWeight: 400 }} color="primary">
                {(analytics?.totalMessages ?? 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Most Active Users */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Most Active Users
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell align="right">Sessions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {userStats?.mostActiveUsers && userStats.mostActiveUsers.length > 0 ? (
                      userStats.mostActiveUsers.map((user) => (
                        <TableRow key={user.userId}>
                          <TableCell>{user.userName}</TableCell>
                          <TableCell align="right">{user.sessionCount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center">
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Most Active Workspaces */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Most Active Workspaces
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Workspace</TableCell>
                      <TableCell align="right">Sessions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {workspaceStats?.mostActiveWorkspaces &&
                    workspaceStats.mostActiveWorkspaces.length > 0 ? (
                      workspaceStats.mostActiveWorkspaces.map((workspace) => (
                        <TableRow key={workspace.workspaceId}>
                          <TableCell>{workspace.workspaceName}</TableCell>
                          <TableCell align="right">
                            {workspace.sessionCount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center">
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default OrgAnalyticsTab;