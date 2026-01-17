# Voice Module - Admin UX Specification

**Module Name:** module-voice  
**Version:** 1.0  
**Status:** Draft  
**Created:** January 16, 2026

**Parent Specification:** [MODULE-VOICE-SPEC.md](./MODULE-VOICE-SPEC.md)

---

## Table of Contents

1. [Admin Personas](#1-admin-personas)
2. [Admin Use Cases](#2-admin-use-cases)
3. [Admin Configuration Flows](#3-admin-configuration-flows)
4. [Platform Admin UI](#4-platform-admin-ui)
5. [Organization Admin UI](#5-organization-admin-ui)
6. [Admin Card Design](#6-admin-card-design)
7. [Monitoring & Analytics](#7-monitoring--analytics)
8. [Admin Testing Requirements](#8-admin-testing-requirements)

---

## 1. Admin Personas

### 1.1 Platform Admin

**Role:** Platform Owner / Platform Admin

**Responsibilities:**
- Configure voice module at platform level
- Manage platform-wide voice service credentials (Daily.co, Deepgram, Cartesia)
- Configure ECS/Pipecat bot pool settings
- Monitor voice usage across all organizations
- Set default interview configurations
- Enable/disable voice module for organizations

**Access Level:** Full access to all organizations and settings

**Goals:**
- Maintain reliable voice infrastructure
- Ensure cost-effective service usage
- Configure optimal bot pool sizing
- Monitor for service issues proactively

**Technical Proficiency:** Advanced

### 1.2 Organization Admin

**Role:** Organization Owner / Organization Admin

**Responsibilities:**
- Create and manage interview configurations (Pipecat templates)
- Optionally configure org-specific voice credentials
- Monitor interview usage within their organization
- Set interview policies and defaults
- Manage access to voice features

**Access Level:** Organization-scoped only

**Goals:**
- Configure interview types for their hiring needs
- Ensure consistent interview quality
- Track usage and interview metrics
- Customize AI interviewer behavior

**Technical Proficiency:** Intermediate

---

## 2. Admin Use Cases

### 2.1 Use Case: Configure Platform Voice Credentials

**Actor:** Platform Admin

**Preconditions:**
- User is logged in as platform admin
- Voice module is installed

**Main Flow:**
1. Platform admin navigates to Platform Admin dashboard
2. Admin clicks on Voice Configuration card
3. System displays voice credentials configuration
4. Admin enters credentials for each service:
   - Daily.co API key
   - Deepgram API key
   - Cartesia API key
5. Admin clicks "Validate" for each credential
6. System validates credentials against respective APIs
7. Admin clicks "Save Credentials"
8. System stores credentials in AWS Secrets Manager
9. System displays success confirmation

**Alternative Flows:**
- **6a. Validation fails**
  - System displays specific error message
  - Admin corrects credentials
  - Resume at step 5

**Postconditions:**
- Platform-wide credentials are configured
- Voice module is operational for all organizations

### 2.2 Use Case: Configure Bot Pool Settings

**Actor:** Platform Admin

**Preconditions:**
- Voice credentials are configured
- ECS cluster is available

**Main Flow:**
1. Platform admin navigates to Voice Configuration
2. Admin selects "Bot Pool" tab
3. System displays current pool settings:
   - Standby pool size
   - Business hours
   - ECS cluster/task configuration
4. Admin adjusts settings:
   - Set standby pool size (0-10)
   - Define business hours (start/end UTC)
5. Admin clicks "Save Settings"
6. System updates pool configuration
7. System displays cost estimate based on settings

**Postconditions:**
- Bot pool configured for optimal performance/cost balance

### 2.3 Use Case: Create Interview Configuration

**Actor:** Organization Admin

**Preconditions:**
- User is org admin
- Voice module is enabled for organization

**Main Flow:**
1. Org admin navigates to Voice Settings
2. Admin clicks "Interview Configs" tab
3. Admin clicks "Create Config" button
4. System displays configuration form:
   - Name, interview type, description
   - Bot personality settings
   - Question templates
   - Scoring rubric
5. Admin fills in configuration
6. Admin optionally previews bot behavior
7. Admin clicks "Save Configuration"
8. System validates and saves config
9. Config appears in organization's config list

**Alternative Flows:**
- **6a. Preview interview**
  - Admin clicks "Preview"
  - System shows sample interview flow
  - Admin returns to editing

**Postconditions:**
- New interview configuration available
- Users can create sessions with this config

### 2.4 Use Case: View Voice Analytics Dashboard

**Actor:** Platform Admin or Org Admin

**Preconditions:**
- Voice interviews have been conducted
- Analytics data exists

**Main Flow:**
1. Admin navigates to Voice admin section
2. Admin clicks "Analytics" tab
3. System displays dashboard:
   - Total interviews (by period)
   - Average scores
   - Bot pool utilization
   - Service costs
4. Admin filters by date range
5. Admin can drill down into specific metrics
6. Admin can export reports

**Postconditions:**
- Admin has visibility into voice usage and performance

---

## 3. Admin Configuration Flows

### 3.1 Flow: Initial Voice Module Setup (Platform)

**Scenario:** Platform admin sets up voice module for first time

**Steps:**

1. **Navigate to Voice Config**
   - Entry: Platform Admin → Voice Configuration card
   - First-time state: Setup wizard

2. **Configure Credentials**
   - Required: Daily.co, Deepgram, Cartesia API keys
   - Validation: Test each service connection
   - Storage: AWS Secrets Manager

3. **Configure ECS/Bot Pool**
   - Select ECS cluster
   - Set task definition
   - Configure networking (subnets, security groups)

4. **Set Default Settings**
   - Default standby pool size
   - Business hours
   - Transcript retention policy

5. **Enable for Organizations**
   - Choose: Enable for all, specific orgs, or none
   - Set per-org limits if needed

6. **Verify Setup**
   - Run health check
   - Test interview creation
   - Confirm bot can start

**Flow Diagram:**

```
Credentials → ECS Config → Defaults → Enable → Verify
```

### 3.2 Flow: Interview Config Creation (Organization)

**Scenario:** Org admin creates new interview template

**Steps:**

1. **Basic Information**
   - Config name (unique per org)
   - Interview type (technical, behavioral, screening)
   - Description

2. **Bot Personality**
   - Bot name
   - System prompt
   - Initial greeting
   - Voice settings (speed, tone via Cartesia)

3. **Interview Structure**
   - Duration limit
   - Question list (can be dynamic)
   - Follow-up enabled/disabled

4. **Evaluation Criteria**
   - Scoring rubric
   - Category weights
   - Pass/fail thresholds

5. **Preview & Test**
   - Preview bot responses
   - Test sample questions
   - Adjust as needed

6. **Activate**
   - Set as active/draft
   - Make available for users

---

## 4. Platform Admin UI

### 4.1 Page: Platform Admin Dashboard

**Route:** `/admin`

**Voice Module Card:**

```
┌─────────────────────────────────────────────────────────────┐
│ Platform Administration                                      │
├─────────────────────────────────────────────────────────────┤
│ Core Modules:                                                │
│   [Access] [AI] [Management]                                │
├─────────────────────────────────────────────────────────────┤
│ Functional Modules:                                          │
│   ┌─────────────────────────────┐                           │
│   │ 🎙️ Voice Interviews         │                           │
│   │                             │                           │
│   │ Configure voice interview   │                           │
│   │ credentials and bot pool    │                           │
│   │                             │                           │
│   │ Status: ✓ Operational       │                           │
│   └─────────────────────────────┘                           │
│                                                              │
│   [Other modules...]                                         │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Page: Platform Voice Configuration

**Route:** `/admin/voice`

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumb: Admin > Voice Configuration                      │
├─────────────────────────────────────────────────────────────┤
│ Header:                                                      │
│   Voice Module Configuration                                 │
│   Status: [✓ Operational]                  [Health Check]   │
├─────────────────────────────────────────────────────────────┤
│ Tabs: [Credentials] [Bot Pool] [Organizations] [Analytics]  │
├─────────────────────────────────────────────────────────────┤
│ Credentials Tab:                                             │
│                                                              │
│ Daily.co                                                     │
│ ┌───────────────────────────────────────────────────────────┐
│ │ API Key: ••••••••••••sk-xxx        [Validate] [Edit]     │
│ │ Status: ✓ Valid                    Last checked: 5m ago  │
│ │ Region: us-west-2                                        │
│ └───────────────────────────────────────────────────────────┘
│                                                              │
│ Deepgram                                                     │
│ ┌───────────────────────────────────────────────────────────┐
│ │ API Key: ••••••••••••dg-xxx        [Validate] [Edit]     │
│ │ Status: ✓ Valid                    Last checked: 5m ago  │
│ │ Model: nova-2                                            │
│ └───────────────────────────────────────────────────────────┘
│                                                              │
│ Cartesia                                                     │
│ ┌───────────────────────────────────────────────────────────┐
│ │ API Key: ••••••••••••ct-xxx        [Validate] [Edit]     │
│ │ Status: ✓ Valid                    Last checked: 5m ago  │
│ │ Voice: en-US-Neural2-A                                   │
│ └───────────────────────────────────────────────────────────┘
│                                                              │
│ [Save All Changes]                                           │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Page: Bot Pool Configuration

**Route:** `/admin/voice?tab=bot-pool`

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Bot Pool Tab:                                                │
│                                                              │
│ ECS Configuration                                            │
│ ┌───────────────────────────────────────────────────────────┐
│ │ Cluster: cora-pipecat-cluster                            │
│ │ Task Definition: pipecat-bot:3                           │
│ │ Subnets: subnet-abc123, subnet-def456                    │
│ │ Security Groups: sg-xyz789                               │
│ │                                           [Update ECS]    │
│ └───────────────────────────────────────────────────────────┘
│                                                              │
│ Standby Pool                                                 │
│ ┌───────────────────────────────────────────────────────────┐
│ │ Current Pool Size:  [2] bots                             │
│ │                     └─ Running: 2  │  Idle: 2            │
│ │                                                          │
│ │ Business Hours (UTC):                                    │
│ │   Start: [09:00]    End: [17:00]                        │
│ │                                                          │
│ │ Outside Business Hours: Pool size 0 (on-demand only)    │
│ │                                                          │
│ │ Estimated Monthly Cost: ~$320/month                      │
│ │   (Based on 8 hrs/day × 22 days × 2 bots)               │
│ └───────────────────────────────────────────────────────────┘
│                                                              │
│ [Save Pool Settings]                                         │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Page: Organizations Tab

**Route:** `/admin/voice?tab=organizations`

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Organizations Tab:                                           │
│                                                              │
│ [Search organizations...] [Filter: All ▼]                   │
├─────────────────────────────────────────────────────────────┤
│ Organization      Enabled   Interviews   Own Creds   Actions│
│ ────────────────────────────────────────────────────────────│
│ Acme Corp         ✓         145          No          [⚙️]   │
│ TechStart Inc     ✓         89           Yes         [⚙️]   │
│ Global HR         ✓         312          No          [⚙️]   │
│ NewCo             ✗         -            -           [⚙️]   │
├─────────────────────────────────────────────────────────────┤
│ Totals:           3/4       546                             │
└─────────────────────────────────────────────────────────────┘
```

**Organization Settings Modal:**

```
┌─────────────────────────────────────────────────────────────┐
│ Voice Settings - Acme Corp                          [✕]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Enable Voice Module     [✓]                                 │
│                                                              │
│ Use Organization Credentials                                 │
│   [ ] Enable (falls back to platform if not set)            │
│                                                              │
│ Monthly Interview Limit                                      │
│   [0] (0 = unlimited)                                       │
│                                                              │
│ Bot Priority                                                 │
│   [Normal ▼]  (High = priority standby pool access)         │
│                                                              │
│ [Cancel]                              [Save]                │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Organization Admin UI

### 5.1 Page: Organization Admin Dashboard

**Route:** `/[org-slug]/admin`

**Voice Module Card:**

```
┌─────────────────────────────────────────────────────────────┐
│ Organization Administration: Acme Corp                       │
├─────────────────────────────────────────────────────────────┤
│ Organization Settings:                                       │
│   [General] [Members] [Billing]                             │
├─────────────────────────────────────────────────────────────┤
│ Module Settings:                                             │
│   ┌─────────────────────────────┐                           │
│   │ 🎙️ Voice Settings           │                           │
│   │                             │                           │
│   │ Manage interview configs    │                           │
│   │ and voice settings          │                           │
│   │                             │                           │
│   │ Configs: 5 active           │                           │
│   └─────────────────────────────┘                           │
│                                                              │
│   [Other module cards...]                                    │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Page: Organization Voice Settings

**Route:** `/[org-slug]/admin/voice`

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumb: Acme Corp > Admin > Voice Settings              │
├─────────────────────────────────────────────────────────────┤
│ Header:                                                      │
│   Voice Interview Settings                                   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ Tabs: [Interview Configs] [Credentials] [Usage]             │
├─────────────────────────────────────────────────────────────┤
│ Interview Configs Tab:                                       │
│                                                              │
│ [+ Create Config]                          [Search...]      │
│                                                              │
│ ┌───────────────────────────────────────────────────────────┐
│ │ Technical Interview v1                        [Active ✓] │
│ │ Type: technical | Created: Jan 10, 2026                  │
│ │ Questions: 8 | Avg Duration: 25 min                      │
│ │                                [Edit] [Duplicate] [⋮]   │
│ └───────────────────────────────────────────────────────────┘
│                                                              │
│ ┌───────────────────────────────────────────────────────────┐
│ │ Behavioral Interview                          [Active ✓] │
│ │ Type: behavioral | Created: Jan 8, 2026                  │
│ │ Questions: 6 | Avg Duration: 20 min                      │
│ │                                [Edit] [Duplicate] [⋮]   │
│ └───────────────────────────────────────────────────────────┘
│                                                              │
│ ┌───────────────────────────────────────────────────────────┐
│ │ Quick Screening                              [Draft]      │
│ │ Type: screening | Created: Jan 14, 2026                  │
│ │ Questions: 4 | Avg Duration: 10 min                      │
│ │                                [Edit] [Duplicate] [⋮]   │
│ └───────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Page: Config Editor

**Route:** `/[org-slug]/admin/voice/configs/[id]` or `/[org-slug]/admin/voice/configs/new`

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumb: Admin > Voice > Edit Config                      │
├─────────────────────────────────────────────────────────────┤
│ Header:                                                      │
│   Technical Interview v1                                     │
│   [Preview] [Save Draft] [Save & Activate]                  │
├─────────────────────────────────────────────────────────────┤
│ Sidebar:        │ Content:                                   │
│                 │                                            │
│ ☑ Basic Info   │ Basic Information                         │
│ ☐ Bot Settings │ ┌─────────────────────────────────────────┐│
│ ☐ Questions    │ │ Name *                                  ││
│ ☐ Scoring      │ │ [Technical Interview v1              ]  ││
│ ☐ Advanced     │ │                                         ││
│                 │ │ Interview Type *                        ││
│                 │ │ [Technical ▼]                           ││
│                 │ │                                         ││
│                 │ │ Description                             ││
│                 │ │ [Standard technical interview for      ]││
│                 │ │ [software engineering candidates...    ]││
│                 │ │                                         ││
│                 │ │ Duration Limit                          ││
│                 │ │ [30] minutes                            ││
│                 │ └─────────────────────────────────────────┘│
│                 │                                            │
│                 │ Bot Settings                               │
│                 │ ┌─────────────────────────────────────────┐│
│                 │ │ Bot Name                                ││
│                 │ │ [Alex - Technical Interviewer        ]  ││
│                 │ │                                         ││
│                 │ │ System Prompt                           ││
│                 │ │ [You are Alex, a friendly but          ]││
│                 │ │ [thorough technical interviewer...     ]││
│                 │ │                                         ││
│                 │ │ Voice Speed: [1.0 ───●─── 1.5]          ││
│                 │ └─────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Page: Organization Credentials (Optional)

**Route:** `/[org-slug]/admin/voice?tab=credentials`

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Credentials Tab:                                             │
│                                                              │
│ ⓘ Organization-specific credentials are optional.           │
│   If not set, platform credentials will be used.            │
│                                                              │
│ Daily.co                                                     │
│ ┌───────────────────────────────────────────────────────────┐
│ │ [✓] Use organization credentials                         │
│ │                                                          │
│ │ API Key: ••••••••••••sk-xxx        [Validate] [Edit]     │
│ │ Status: ✓ Valid                                          │
│ └───────────────────────────────────────────────────────────┘
│                                                              │
│ Deepgram                                                     │
│ ┌───────────────────────────────────────────────────────────┐
│ │ [ ] Use organization credentials (using platform)        │
│ └───────────────────────────────────────────────────────────┘
│                                                              │
│ Cartesia                                                     │
│ ┌───────────────────────────────────────────────────────────┐
│ │ [ ] Use organization credentials (using platform)        │
│ └───────────────────────────────────────────────────────────┘
│                                                              │
│ [Save Changes]                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Admin Card Design

### 6.1 Platform Admin Card

```typescript
// frontend/adminCard.tsx

import React from 'react';
import MicIcon from '@mui/icons-material/Mic';
import type { AdminCardConfig } from '@{project}/shared-types';

export const voicePlatformAdminCard: AdminCardConfig = {
  id: 'voice-platform-admin',
  title: 'Voice Interviews',
  description: 'Configure voice credentials, bot pool, and monitor usage',
  icon: <MicIcon sx={{ fontSize: 48 }} />,
  href: '/admin/voice',
  color: '#7c3aed',  // Purple for voice
  order: 110,
  context: 'platform',
  requiredRoles: ['platform_owner', 'platform_admin'],
  badge: null,
  statusIndicator: 'operational',  // operational, degraded, error
};
```

### 6.2 Organization Admin Card

```typescript
export const voiceOrgAdminCard: AdminCardConfig = {
  id: 'voice-org-admin',
  title: 'Voice Settings',
  description: 'Manage interview configurations and voice settings',
  icon: <MicIcon sx={{ fontSize: 48 }} />,
  href: '/{org-slug}/admin/voice',
  color: '#7c3aed',
  order: 110,
  context: 'organization',
  requiredRoles: ['org_owner', 'org_admin'],
  badge: null,
};
```

### 6.3 Card Component with Status

```typescript
interface VoiceAdminCardProps {
  config: AdminCardConfig;
  status?: 'operational' | 'degraded' | 'error';
  stats?: { interviews: number; configs: number };
}

export function VoiceAdminCard({ config, status, stats }: VoiceAdminCardProps) {
  const statusColors = {
    operational: 'success.main',
    degraded: 'warning.main',
    error: 'error.main'
  };
  
  return (
    <Card 
      sx={{ 
        cursor: 'pointer',
        '&:hover': { boxShadow: 4 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderTop: 4,
        borderColor: config.color
      }}
    >
      <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 3 }}>
        <Box sx={{ color: config.color, mb: 2 }}>
          {config.icon}
        </Box>
        <Typography variant="h6" gutterBottom>
          {config.title}
          {status && (
            <Box 
              component="span" 
              sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: statusColors[status],
                display: 'inline-block',
                ml: 1
              }} 
            />
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {config.description}
        </Typography>
        
        {stats && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Chip 
              label={`${stats.interviews} interviews`} 
              size="small" 
              variant="outlined" 
            />
            <Chip 
              label={`${stats.configs} configs`} 
              size="small" 
              variant="outlined" 
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 7. Monitoring & Analytics

### 7.1 Platform Analytics Dashboard

**Route:** `/admin/voice?tab=analytics`

**Metrics:**

| Metric | Description | Chart Type |
|--------|-------------|------------|
| Total Interviews | Count across all orgs | Number card |
| Active Interviews | Currently in progress | Number card |
| Bot Pool Utilization | % of standby bots in use | Gauge |
| Avg Interview Duration | Average time per interview | Number card |
| Service Costs | Daily.co/Deepgram/Cartesia | Stacked bar |
| Interviews by Org | Top organizations | Bar chart |
| Error Rate | Failed interviews % | Number card |
| Avg Score | Platform-wide average | Number card |

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Analytics                                   [Date Range ▼]  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │   546   │ │    3    │ │  75%    │ │ 24 min  │ │  0.5%   ││
│ │ Total   │ │ Active  │ │ Pool    │ │ Avg Dur │ │ Errors  ││
│ │ This Mo │ │ Now     │ │ Usage   │ │         │ │         ││
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘│
├─────────────────────────────────────────────────────────────┤
│ Interviews Over Time                                         │
│ ┌───────────────────────────────────────────────────────────┐
│ │ [Line chart showing daily interview count over 30 days]  │
│ └───────────────────────────────────────────────────────────┘
├─────────────────────────────────────────────────────────────┤
│ Service Costs This Month                                     │
│ ┌───────────────────────────────────────────────────────────┐
│ │ Daily.co     ████████████████████████  $245               │
│ │ Deepgram     ██████████████████        $189               │
│ │ Cartesia     ████████████              $156               │
│ │ ECS/Fargate  ██████████████████████████████  $320         │
│ │                                                           │
│ │ Total: $910/month                                         │
│ └───────────────────────────────────────────────────────────┘
├─────────────────────────────────────────────────────────────┤
│ Bot Pool Status                                              │
│ ┌───────────────────────────────────────────────────────────┐
│ │ Standby: 2/2  │  Active: 1  │  Starting: 0  │  Failed: 0 │
│ │                                                           │
│ │ Cold Start Rate: 15% (target: <20%)                      │
│ │ Avg Cold Start Time: 28s                                  │
│ └───────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Organization Usage Dashboard

**Route:** `/[org-slug]/admin/voice?tab=usage`

**Metrics:**

| Metric | Description | Chart Type |
|--------|-------------|------------|
| Total Interviews | Org interview count | Number card |
| This Month | Interviews this month | Number card |
| Avg Duration | Avg time per interview | Number card |
| Avg Score | Org average score | Number card |
| Top Configs | Most used configs | Bar chart |
| Score Distribution | Score histogram | Histogram |

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Usage                                       [Date Range ▼]  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │   145   │ │   42    │ │ 24 min  │ │   78    │            │
│ │ Total   │ │ This    │ │ Avg     │ │ Avg     │            │
│ │ All Time│ │ Month   │ │ Duration│ │ Score   │            │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
├─────────────────────────────────────────────────────────────┤
│ Interviews by Config                                         │
│ ┌───────────────────────────────────────────────────────────┐
│ │ Technical v1    ████████████████████████████  89 (61%)    │
│ │ Behavioral      ██████████████                 45 (31%)    │
│ │ Quick Screen    ████                           11 (8%)     │
│ └───────────────────────────────────────────────────────────┘
├─────────────────────────────────────────────────────────────┤
│ Score Distribution                                           │
│ ┌───────────────────────────────────────────────────────────┐
│ │      ██                                                   │
│ │      ██                                                   │
│ │   ██ ██ ██                                               │
│ │   ██ ██ ██ ██ ██                                         │
│ │ ██ ██ ██ ██ ██ ██ ██                                     │
│ │ 0-20 21-40 41-60 61-80 81-100                            │
│ └───────────────────────────────────────────────────────────┘
├─────────────────────────────────────────────────────────────┤
│ Recent Interviews                            [View All →]   │
│ ┌───────────────────────────────────────────────────────────┐
│ │ John Doe      Technical    Jan 16   25 min   Score: 85  │
│ │ Jane Smith    Behavioral   Jan 15   22 min   Score: 78  │
│ │ Bob Johnson   Technical    Jan 15   28 min   Score: 92  │
│ └───────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Admin Testing Requirements

### 8.1 Platform Admin Tests

```typescript
describe('Platform Voice Configuration', () => {
  beforeEach(() => {
    loginAsPlatformAdmin();
  });
  
  it('displays voice admin card on platform dashboard', () => {
    render(<PlatformAdminDashboard />);
    expect(screen.getByText('Voice Interviews')).toBeInTheDocument();
  });
  
  it('navigates to voice configuration', async () => {
    render(<PlatformAdminDashboard />);
    await userEvent.click(screen.getByText('Voice Interviews'));
    expect(screen.getByText('Voice Module Configuration')).toBeInTheDocument();
  });
  
  it('validates credentials successfully', async () => {
    render(<VoiceCredentialsPage />);
    
    await userEvent.click(screen.getByRole('button', { name: /validate daily/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/valid/i)).toBeInTheDocument();
    });
  });
  
  it('shows error for invalid credentials', async () => {
    mockApiError('daily', 'Invalid API key');
    render(<VoiceCredentialsPage />);
    
    await userEvent.click(screen.getByRole('button', { name: /validate daily/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid/i)).toBeInTheDocument();
    });
  });
  
  it('saves bot pool configuration', async () => {
    render(<BotPoolConfigPage />);
    
    const poolSizeInput = screen.getByLabelText(/pool size/i);
    await userEvent.clear(poolSizeInput);
    await userEvent.type(poolSizeInput, '3');
    
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
    });
  });
});
```

### 8.2 Organization Admin Tests

```typescript
describe('Organization Voice Settings', () => {
  beforeEach(() => {
    loginAsOrgAdmin('acme-corp');
  });
  
  it('displays voice admin card on org dashboard', () => {
    render(<OrgAdminDashboard orgSlug="acme-corp" />);
    expect(screen.getByText('Voice Settings')).toBeInTheDocument();
  });
  
  it('lists interview configs', async () => {
    render(<VoiceConfigsPage orgSlug="acme-corp" />);
    
    await waitFor(() => {
      expect(screen.getByText('Technical Interview v1')).toBeInTheDocument();
      expect(screen.getByText('Behavioral Interview')).toBeInTheDocument();
    });
  });
  
  it('creates new interview config', async () => {
    render(<VoiceConfigsPage orgSlug="acme-corp" />);
    
    await userEvent.click(screen.getByRole('button', { name: /create config/i }));
    
    await userEvent.type(
      screen.getByLabelText(/name/i),
      'New Technical Config'
    );
    await userEvent.click(screen.getByLabelText(/interview type/i));
    await userEvent.click(screen.getByText('Technical'));
    
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
    });
  });
  
  it('validates unique config name', async () => {
    render(<ConfigEditorPage orgSlug="acme-corp" />);
    
    await userEvent.type(
      screen.getByLabelText(/name/i),
      'Technical Interview v1'  // Existing name
    );
    
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
  });
  
  it('shows usage analytics', async () => {
    render(<VoiceUsagePage orgSlug="acme-corp" />);
    
    await waitFor(() => {
      expect(screen.getByText(/total interviews/i)).toBeInTheDocument();
      expect(screen.getByText('145')).toBeInTheDocument();
    });
  });
});
```

### 8.3 Admin Card Registration Tests

```typescript
describe('Voice Admin Card Registration', () => {
  it('registers platform admin card', () => {
    const cards = getRegisteredAdminCards('platform');
    const voiceCard = cards.find(c => c.id === 'voice-platform-admin');
    
    expect(voiceCard).toBeDefined();
    expect(voiceCard?.requiredRoles).toContain('platform_admin');
  });
  
  it('registers organization admin card', () => {
    const cards = getRegisteredAdminCards('organization');
    const voiceCard = cards.find(c => c.id === 'voice-org-admin');
    
    expect(voiceCard).toBeDefined();
    expect(voiceCard?.requiredRoles).toContain('org_admin');
  });
  
  it('hides voice card from non-admin users', () => {
    const userCards = getVisibleAdminCards({ role: 'org_user' });
    const voiceCard = userCards.find(c => c.id === 'voice-org-admin');
    
    expect(voiceCard).toBeUndefined();
  });
  
  it('shows voice card to org admins', () => {
    const adminCards = getVisibleAdminCards({ role: 'org_admin' });
    const voiceCard = adminCards.find(c => c.id === 'voice-org-admin');
    
    expect(voiceCard).toBeDefined();
  });
});
```

### 8.4 Test Coverage Requirements

| Area | Target Coverage |
|------|-----------------|
| Admin UI Components | ≥80% |
| Configuration Flows | 100% |
| Role-Based Access | 100% |
| Credential Validation | 100% |
| Analytics Display | ≥70% |

---

**Document Version:** 1.0  
**Last Updated:** January 16, 2026  
**Author:** AI (Claude)  
**Specification Type:** Admin UX
