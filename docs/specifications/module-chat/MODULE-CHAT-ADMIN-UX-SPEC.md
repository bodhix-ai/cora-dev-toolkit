# Chat Module - Admin UX Specification

**Module Name:** module-chat  
**Module Type:** Functional Module  
**Version:** 1.0  
**Status:** Draft  
**Created:** January 15, 2026  
**Last Updated:** January 15, 2026

**Parent Specification:** [MODULE-CHAT-SPEC.md](./MODULE-CHAT-SPEC.md)

---

## 1. Admin Overview

### 1.1 Admin Scope for Chat Module

Unlike module-kb which has dedicated admin pages for KB management, **module-chat does NOT have dedicated admin pages**. Chat is a user-centric feature where:

- Users create and own their chats
- Users control sharing and KB grounding
- Admins monitor usage but don't manage individual chats

### 1.2 Admin Access Points

| Admin Role | Access Point | Capabilities |
|------------|--------------|--------------|
| Platform Admin | module-mgmt dashboard | View platform-wide chat analytics |
| Org Admin | module-mgmt dashboard | View org-level chat analytics |
| Workspace Admin | Workspace settings | No chat-specific settings |

---

## 2. Analytics Integration (via module-mgmt)

### 2.1 Platform Admin Analytics

**Location:** `/admin/sys/analytics` (within module-mgmt)

```
┌──────────────────────────────────────────────────────────────────┐
│ PLATFORM ANALYTICS                                                │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Overview │ Users │ Chat │ KB │ AI Usage                      │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ CHAT TAB                                                          │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Chat Usage Overview                           Last 30 Days ▼ │ │
│ │                                                              │ │
│ │ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐     │ │
│ │ │ Total Sessions │ │ Total Messages │ │ Active Users   │     │ │
│ │ │     1,234      │ │     15,678     │ │      234       │     │ │
│ │ │   ↑ 12%        │ │   ↑ 8%         │ │   ↑ 5%         │     │ │
│ │ └────────────────┘ └────────────────┘ └────────────────┘     │ │
│ │                                                              │ │
│ │ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐     │ │
│ │ │ Avg Session    │ │ KB-Grounded    │ │ Shared Chats   │     │ │
│ │ │ 12.7 messages  │ │     78%        │ │      156       │     │ │
│ │ └────────────────┘ └────────────────┘ └────────────────┘     │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Chat Sessions Over Time                                      │ │
│ │ ┌────────────────────────────────────────────────────────┐   │ │
│ │ │                                            ╭──────╮    │   │ │
│ │ │                                      ╭────╯      │    │   │ │
│ │ │                              ╭──────╯            │    │   │ │
│ │ │                        ╭────╯                    │    │   │ │
│ │ │  ╭──────────────────────                         │    │   │ │
│ │ │──                                                ╰────│   │ │
│ │ └────────────────────────────────────────────────────────┘   │ │
│ │    Jan 1    Jan 7    Jan 14    Jan 21    Jan 28             │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Top Organizations by Chat Usage                              │ │
│ │                                                              │ │
│ │ 1. Acme Corp              456 sessions    5,678 messages    │ │
│ │ 2. TechStart Inc          234 sessions    3,456 messages    │ │
│ │ 3. Global Solutions       189 sessions    2,345 messages    │ │
│ │ 4. Innovation Labs        156 sessions    1,890 messages    │ │
│ │ 5. DataDrive Co           123 sessions    1,456 messages    │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Org Admin Analytics

**Location:** `/admin/org/analytics` (within module-mgmt)

```
┌──────────────────────────────────────────────────────────────────┐
│ ORGANIZATION ANALYTICS                                            │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Overview │ Members │ Chat │ KB │ AI Usage                    │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ CHAT TAB                                                          │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Organization Chat Usage                       Last 30 Days ▼ │ │
│ │                                                              │ │
│ │ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐     │ │
│ │ │ Total Sessions │ │ Total Messages │ │ Active Users   │     │ │
│ │ │      456       │ │     5,678      │ │       45       │     │ │
│ │ │   ↑ 15%        │ │   ↑ 10%        │ │   ↑ 8%         │     │ │
│ │ └────────────────┘ └────────────────┘ └────────────────┘     │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Top Users by Chat Activity                                   │ │
│ │                                                              │ │
│ │ 1. Jane Smith             67 sessions     890 messages      │ │
│ │ 2. Bob Jones              45 sessions     567 messages      │ │
│ │ 3. Alice Chen             34 sessions     456 messages      │ │
│ │ 4. David Kim              28 sessions     345 messages      │ │
│ │ 5. Sarah Lee              23 sessions     234 messages      │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Popular KB Sources in Chats                                  │ │
│ │                                                              │ │
│ │ 1. Company Policies           Used in 78% of chats          │ │
│ │ 2. Engineering Standards      Used in 45% of chats          │ │
│ │ 3. HR Guidelines              Used in 34% of chats          │ │
│ │ 4. Product Documentation      Used in 28% of chats          │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Token Usage Monitoring

### 3.1 Platform Token Usage

**Integrated with module-ai usage tracking**

```
┌──────────────────────────────────────────────────────────────────┐
│ AI TOKEN USAGE                                     Last 30 Days ▼│
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Chat Token Usage                                             │ │
│ │                                                              │ │
│ │ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐     │ │
│ │ │ Prompt Tokens  │ │ Completion     │ │ Estimated Cost │     │ │
│ │ │   2.5M         │ │   1.8M         │ │   $485.00      │     │ │
│ │ │   ↑ 12%        │ │   ↑ 15%        │ │   ↑ 14%        │     │ │
│ │ └────────────────┘ └────────────────┘ └────────────────┘     │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Token Usage by Organization                                  │ │
│ │                                                              │ │
│ │ Organization          Prompt      Completion    Cost         │ │
│ │ ─────────────────────────────────────────────────────────    │ │
│ │ Acme Corp             890K        650K          $156.00      │ │
│ │ TechStart Inc         567K        430K          $98.00       │ │
│ │ Global Solutions      456K        320K          $78.00       │ │
│ │ Innovation Labs       345K        245K          $59.00       │ │
│ │ DataDrive Co          242K        155K          $40.00       │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ⚠️ Budget Alerts                                             │ │
│ │                                                              │ │
│ │ • Acme Corp is at 85% of monthly budget                      │ │
│ │ • TechStart Inc approaching rate limit (90% of daily quota)  │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Rate Limiting Configuration

### 4.1 Platform-Level Rate Limits

**Location:** `/admin/sys/settings` → AI Configuration

```
┌──────────────────────────────────────────────────────────────────┐
│ CHAT RATE LIMITING                                                │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Default Rate Limits                                          │ │
│ │                                                              │ │
│ │ Messages per minute (per user):                              │ │
│ │ [   10   ] messages                                          │ │
│ │                                                              │ │
│ │ Messages per hour (per user):                                │ │
│ │ [   100  ] messages                                          │ │
│ │                                                              │ │
│ │ Daily token limit (per org):                                 │ │
│ │ [  500000 ] tokens                                           │ │
│ │                                                              │ │
│ │ Monthly token budget (per org):                              │ │
│ │ [ 5000000 ] tokens                                           │ │
│ │                                                              │ │
│ │ [x] Enable rate limit warnings at 80%                        │ │
│ │ [x] Send email alerts when limits exceeded                   │ │
│ │                                                              │ │
│ │                              [Cancel] [Save Configuration]   │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Org-Level Rate Limit Override

**Location:** `/admin/org/settings` → AI Configuration

```
┌──────────────────────────────────────────────────────────────────┐
│ ORGANIZATION CHAT LIMITS                                          │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Current Limits                                               │ │
│ │                                                              │ │
│ │ Monthly token budget:  5,000,000 tokens                      │ │
│ │ Used this month:       3,245,678 tokens (65%)                │ │
│ │                                                              │ │
│ │ ████████████████████░░░░░░░░░░░░░░░░░░░░░░░  65%            │ │
│ │                                                              │ │
│ │ Projected usage:       4,890,000 tokens (98%)                │ │
│ │ Days remaining:        12                                    │ │
│ │                                                              │ │
│ │ ⚠️ Projected to reach 98% of budget by end of month          │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Request Limit Increase                                       │ │
│ │                                                              │ │
│ │ To request a higher token budget, contact your platform      │ │
│ │ administrator.                                               │ │
│ │                                                              │ │
│ │                                     [Request Increase]       │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Model for Analytics

### 5.1 Analytics Aggregation Tables

Note: These tables are part of module-mgmt, not module-chat.

```sql
-- Daily chat usage aggregation (in module-mgmt)
CREATE TABLE mgmt_chat_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  session_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  kb_grounded_sessions INTEGER DEFAULT 0,
  prompt_tokens BIGINT DEFAULT 0,
  completion_tokens BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, org_id)
);

-- Monthly chat usage aggregation (in module-mgmt)
CREATE TABLE mgmt_chat_usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month VARCHAR(7) NOT NULL, -- '2026-01'
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  session_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  prompt_tokens BIGINT DEFAULT 0,
  completion_tokens BIGINT DEFAULT 0,
  estimated_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year_month, org_id)
);
```

### 5.2 Integration with module-chat

The chat-stream Lambda reports usage to module-mgmt:

```python
# After each chat completion
async def report_chat_usage(org_id: str, session_id: str, token_usage: dict):
    await mgmt_client.post(
        f"/orgs/{org_id}/chat-usage",
        json={
            "sessionId": session_id,
            "promptTokens": token_usage["prompt_tokens"],
            "completionTokens": token_usage["completion_tokens"],
            "model": token_usage.get("model", "unknown"),
            "kbGrounded": token_usage.get("kb_grounded", False)
        }
    )
```

---

## 6. Admin API Endpoints

### 6.1 Analytics Endpoints (via module-mgmt)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/sys/analytics/chat` | GET | Platform-wide chat analytics |
| `/admin/sys/analytics/chat/orgs` | GET | Chat usage by organization |
| `/admin/org/analytics/chat` | GET | Org-level chat analytics |
| `/admin/org/analytics/chat/users` | GET | Chat usage by user |
| `/admin/org/analytics/chat/kbs` | GET | KB usage in chats |

### 6.2 Rate Limit Endpoints (via module-mgmt)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/sys/rate-limits/chat` | GET/PATCH | Platform chat rate limits |
| `/admin/org/rate-limits/chat` | GET | Org chat rate limit status |
| `/admin/org/rate-limits/chat/request` | POST | Request limit increase |

---

## 7. Admin Personas

### 7.1 Platform Administrator

**Description:** System administrator responsible for overall platform health and cost management.

**Chat-Related Goals:**
- Monitor overall chat usage and costs
- Set appropriate rate limits
- Identify organizations with unusual usage patterns
- Manage AI provider configurations

**Chat-Related Actions:**
- View platform-wide chat analytics
- Configure default rate limits
- Review and approve limit increase requests
- Set budget alerts

### 7.2 Organization Administrator

**Description:** Org admin responsible for their organization's usage and member management.

**Chat-Related Goals:**
- Monitor organization's chat usage
- Stay within token budget
- Understand how team uses AI chat
- Identify popular KB sources

**Chat-Related Actions:**
- View org-level chat analytics
- Monitor token budget usage
- Request limit increases if needed
- Review top users and KB usage

---

## 8. No Admin Cards Required

Unlike module-kb, **module-chat does NOT require admin cards** on the admin dashboard.

**Reasoning:**
1. Chat is user-driven, not admin-managed
2. Analytics are integrated into module-mgmt
3. No dedicated admin CRUD operations for chats
4. Rate limits are part of AI configuration

**Admin Dashboard Cards (from other modules):**
- module-access: User management card
- module-kb: Knowledge Base card
- module-mgmt: Platform settings card
- module-ai: AI configuration card (includes chat rate limits)

---

**Document Version:** 1.0  
**Last Updated:** January 15, 2026
