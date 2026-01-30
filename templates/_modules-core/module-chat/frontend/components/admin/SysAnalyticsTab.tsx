/**
 * System Analytics Tab - Platform-Wide Chat Analytics
 *
 * Displays platform-wide chat usage statistics including:
 * - Total sessions and messages
 * - Active sessions by time period
 * - Most active organizations
 * - Token usage statistics
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
import {
  getSysAdminAnalytics,
  getSysAdminUsageStats,
  getSysAdminTokenStats,
} from "../../lib/api";

interface AnalyticsData {
  totalSessions: number;
  totalMessages: number;
  activeSessions: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
}

interface UsageData {
  mostActiveOrgs: Array<{
    orgId: string;
    orgName: string;
    sessionCount: number;
  }>;
}

interface TokenData {
  totalTokensUsed: number;
  averageTokensPerMessage: number;
}

/**
 * ✅ CORRECT: No token prop - gets authAdapter from useUser hook
 */
export function SysAnalyticsTab(): React.ReactElement {
  const { isAuthenticated, authAdapter } = useUser();  // ✅ Get authAdapter here
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [tokens, setTokens] = useState<TokenData | null>(null);

  // Load analytics data
  useEffect(() => {
    if (!isAuthenticated || !authAdapter) return;

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const [analyticsData, usageData, tokenData] = await Promise.all([
          getSysAdminAnalytics(authAdapter),  // ✅ Pass authAdapter
          getSysAdminUsageStats(authAdapter),
          getSysAdminTokenStats(authAdapter),
        ]);

        setAnalytics(analyticsData);
        setUsage(usageData);
        setTokens(tokenData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [isAuthenticated, authAdapter]);  // ✅ Updated dependency

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
        Platform Analytics
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Overview of chat usage across all organizations
      </Typography>

      <Grid container spacing={3}>
        {/* Total Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Total Sessions
              </Typography>
              <Typography variant="h3" color="primary">
                {analytics?.totalSessions.toLocaleString() || 0}
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
              <Typography variant="h3" color="primary">
                {analytics?.totalMessages.toLocaleString() || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Sessions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Active Sessions
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Last 24 Hours
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {analytics?.activeSessions.last24Hours.toLocaleString() || 0}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Last 7 Days
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {analytics?.activeSessions.last7Days.toLocaleString() || 0}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Last 30 Days
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {analytics?.activeSessions.last30Days.toLocaleString() || 0}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Token Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Total Tokens Used
              </Typography>
              <Typography variant="h3" color="primary">
                {tokens?.totalTokensUsed.toLocaleString() || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Avg Tokens/Message
              </Typography>
              <Typography variant="h3" color="primary">
                {tokens?.averageTokensPerMessage.toLocaleString() || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Most Active Organizations */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Most Active Organizations
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Organization</TableCell>
                      <TableCell align="right">Sessions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {usage?.mostActiveOrgs && usage.mostActiveOrgs.length > 0 ? (
                      usage.mostActiveOrgs.map((org) => (
                        <TableRow key={org.orgId}>
                          <TableCell>{org.orgName}</TableCell>
                          <TableCell align="right">{org.sessionCount.toLocaleString()}</TableCell>
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

export default SysAnalyticsTab;