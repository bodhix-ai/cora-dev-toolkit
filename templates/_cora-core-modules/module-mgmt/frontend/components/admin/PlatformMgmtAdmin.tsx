/**
 * Platform Management Admin Component
 *
 * Main admin page for Platform Management module.
 * Provides tabbed interface for:
 * - Lambda warming schedule management
 * - Platform performance monitoring (future)
 * - Storage management (future)
 * - Cost tracking (future)
 */

import React, { useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import { ScheduleTab } from "./ScheduleTab";
import { PerformanceTab } from "./PerformanceTab";
import { StorageTab } from "./StorageTab";
import { CostTab } from "./CostTab";

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
export function PlatformMgmtAdmin(): React.ReactElement {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

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
          href="/admin/platform"
          sx={{ display: "flex", alignItems: "center" }}
          aria-label="Navigate to Admin Dashboard"
        >
          Admin Dashboard
        </Link>
        <Typography color="text.primary">Platform Management</Typography>
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
          <Tab label="Schedule" id="tab-schedule" aria-controls="tabpanel-schedule" />
          <Tab label="Performance" id="tab-performance" aria-controls="tabpanel-performance" />
          <Tab label="Storage" id="tab-storage" aria-controls="tabpanel-storage" />
          <Tab label="Cost" id="tab-cost" aria-controls="tabpanel-cost" />
        </Tabs>
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 0} id="tabpanel-schedule" aria-labelledby="tab-schedule">
        {activeTab === 0 && <ScheduleTab />}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 1} id="tabpanel-performance" aria-labelledby="tab-performance">
        {activeTab === 1 && <PerformanceTab />}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 2} id="tabpanel-storage" aria-labelledby="tab-storage">
        {activeTab === 2 && <StorageTab />}
      </Box>

      <Box role="tabpanel" hidden={activeTab !== 3} id="tabpanel-cost" aria-labelledby="tab-cost">
        {activeTab === 3 && <CostTab />}
      </Box>
    </Box>
  );
}

export default PlatformMgmtAdmin;
