/**
 * @component SysMgmtAdmin
 * @description System Management Admin Component - Main admin page for System Management module
 * 
 * Provides tabbed interface for:
 * - Lambda warming schedule management
 * - Platform performance monitoring
 * - Storage management
 * - Cost tracking
 * 
 * @routes
 * - GET /admin/sys/mgmt/schedule - List all warming schedule configurations
 * - GET /admin/sys/mgmt/schedule/{configKey} - Get specific schedule config
 * - PUT /admin/sys/mgmt/schedule/{configKey} - Update schedule config (triggers EventBridge sync)
 * - GET /admin/sys/mgmt/functions - List Lambda functions
 * - POST /admin/sys/mgmt/schedule/sync - Manual EventBridge synchronization
 * - GET /admin/sys/mgmt/modules - List all modules (via ModuleConfigTab)
 * - POST /admin/sys/mgmt/modules/{name}/enable - Enable module (via ModuleConfigTab)
 * - POST /admin/sys/mgmt/modules/{name}/disable - Disable module (via ModuleConfigTab)
 */

import React, { useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
} from "@mui/material";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import { useUser, useRole } from "@{{PROJECT_NAME}}/module-access";
import { ScheduleTab } from "./ScheduleTab";
import { PerformanceTab } from "./PerformanceTab";
import { StorageTab } from "./StorageTab";
import { CostTab } from "./CostTab";
import { ModuleConfigTab } from "./ModuleConfigTab";

/**
 * Platform Management Admin Page
 *
 * Platform admins can manage platform operations including:
 * - Lambda function warming schedules
 * - Performance monitoring (planned)
 * - Storage management (planned)
 * - Cost tracking (planned)
 *
 * @example
 * ```tsx
 * <PlatformMgmtAdmin />
 * ```
 */
export function SysMgmtAdmin(): React.ReactElement {
  // Auth hooks (ADR-019a compliance)
  const { loading, isAuthenticated, profile } = useUser();
  const { isSysAdmin } = useRole();
  
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // Authentication check
  if (!isAuthenticated || !profile) {
    return (
      <Box p={3}>
        <Alert severity="error">
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }

  // Authorization check - system admins only
  if (!isSysAdmin) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Access denied. System administrator role required.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", p: 3 }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{ mb: 2 }}
      >
        <Link
          underline="hover"
          color="inherit"
          href="/admin/sys"
          sx={{ display: "flex", alignItems: "center" }}
          aria-label="Navigate to Sys Admin"
        >
          Sys Admin
        </Link>
        <Typography color="text.primary">Mgmt</Typography>
      </Breadcrumbs>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Platform Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage Lambda functions, performance, storage, and platform operations
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="platform management tabs"
        >
          <Tab label="Modules" id="tab-modules" aria-controls="tabpanel-modules" />
          <Tab label="Cost" id="tab-cost" aria-controls="tabpanel-cost" />
          <Tab label="AI" id="tab-ai" aria-controls="tabpanel-ai" />
          <Tab label="Data" id="tab-data" aria-controls="tabpanel-data" />
          <Tab label="Compute" id="tab-compute" aria-controls="tabpanel-compute" />
          <Tab label="Schedule" id="tab-schedule" aria-controls="tabpanel-schedule" />
        </Tabs>
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 0} id="tabpanel-modules" aria-labelledby="tab-modules">
        {activeTab === 0 && <ModuleConfigTab />}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 1} id="tabpanel-cost" aria-labelledby="tab-cost">
        {activeTab === 1 && <CostTab />}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 2} id="tabpanel-ai" aria-labelledby="tab-ai">
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>AI Configuration</Typography>
            <Typography variant="body2" color="text.secondary">
              AI provider and model configuration coming soon.
            </Typography>
          </Box>
        )}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 3} id="tabpanel-data" aria-labelledby="tab-data">
        {activeTab === 3 && <StorageTab />}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 4} id="tabpanel-compute" aria-labelledby="tab-compute">
        {activeTab === 4 && <PerformanceTab />}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 5} id="tabpanel-schedule" aria-labelledby="tab-schedule">
        {activeTab === 5 && <ScheduleTab />}
      </Box>
    </Box>
  );
}

export default SysMgmtAdmin;
