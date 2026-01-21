# AI Operations Logging and Monitoring System

**Status**: 🆕 NOT STARTED  
**Priority**: 🟡 MEDIUM (Foundation exists, implementation pending)  
**Estimated Duration**: 8-12 hours  
**Created**: January 20, 2026  
**Parent Plan**: `plan_eval-inference-profile-fix.md` (monitoring scope extracted)  
**Related Plans**: 
- `plan_eval-validation-category-implementation.md` (uses error logging)
- `plan_module-ai-vendor-detection.md` (provides model metadata)

**Branch**: `ai-ops-monitoring`  
**Test Project**: `test-optim`  
**Test Stack**: `~/code/bodhix/testing/test-optim/ai-sec-stack`  
**Test Infra**: `~/code/bodhix/testing/test-optim/ai-sec-infra`

---

## Executive Summary

**Objective:** Build a comprehensive AI operations monitoring system that provides visibility into AI model usage, errors, and performance across all CORA modules (eval, chat, kb-processor).

**Current State:**
- ✅ `ai_log_error` table exists (created in eval-inference-profile-fix)
- ✅ Error logging integrated in eval-processor Lambda
- ❌ `log_ai_error()` function not fully implemented in org_common
- ❌ No usage/metrics tracking
- ❌ No admin dashboard for visualization
- ❌ Error logging not integrated in chat and kb-processor

**Target State:**
- ✅ Complete error logging system across all modules
- ✅ Usage metrics tracking (requests, tokens, costs)
- ✅ Sys admin AI operations dashboard
- ✅ Real-time error triage and resolution workflow
- ✅ Pattern detection and alerting

---

## Architecture Overview

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Operations System                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Data Collection │     │  Data Storage    │     │  Visualization   │
└──────────────────┘     └──────────────────┘     └──────────────────┘

1. org_common.log_ai_error()   ai_log_error          Admin Dashboard
   - Error logging             - Error records        - Error triage
   - Context capture           - Timestamps           - Charts/graphs
   - Auto-categorization       - Resolution tracking  - Filtering
                                                       
2. org_common.log_ai_usage()   ai_log_usage          Analytics
   - Request tracking          - Usage metrics        - Cost tracking
   - Token counting            - Model performance    - Trend analysis
   - Cost calculation          - Rate limiting data   - Optimization
                                                       
3. CloudWatch Integration      CloudWatch Logs       Alerts
   - Lambda logs               - Structured logs      - Error spikes
   - Metrics                   - Searchable           - Cost anomalies
   - Alarms                    - Retention            - SLA violations
```

### Data Flow

```
┌─────────────┐
│  User Request│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Lambda      │──────────────┐
│ (eval/chat/ │              │
│  kb)        │              │ 1. Before AI call:
└──────┬──────┘              │    log_ai_usage(start)
       │                     │
       ▼                     │
┌─────────────┐              │
│ AI Provider │              │
│ API Call    │              │ 2. After AI call:
└──────┬──────┘              │    log_ai_usage(end, tokens, cost)
       │                     │
       ▼                     │ 3. On error:
┌─────────────┐              │    log_ai_error(exception)
│ Response or │              │
│ Error       │              │
└──────┬──────┘              │
       │                     │
       ▼                     ▼
┌─────────────────────────────┐
│   ai_log_usage             │
│   ai_log_error             │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Admin Dashboard            │
│  - Error Triage             │
│  - Usage Analytics          │
│  - Cost Tracking            │
└─────────────────────────────┘
```

---

## Part 1: Error Logging System (4 hours)

### Task 1.1: Implement org_common.log_ai_error()

**File**: `templates/_modules-core/module-access/backend/layers/org-common/python/org_common/__init__.py`

**Status**: PARTIAL (stub exists, full implementation needed)

**Implementation:**

```python
def log_ai_error(
    provider_id: str,
    model_id: str,
    request_source: str,
    operation_type: str,
    error: Exception,
    model_id_attempted: str,
    validation_category: Optional[str] = None,
    request_params: Optional[Dict] = None,
    user_id: Optional[str] = None,
    org_id: Optional[str] = None,
    ws_id: Optional[str] = None
) -> None:
    """
    Log AI API error for operations tracking.
    
    Args:
        provider_id: AI provider UUID
        model_id: AI model UUID
        request_source: Source Lambda/service (e.g., 'eval-processor')
        operation_type: Type of operation (e.g., 'text_generation')
        error: The exception that occurred
        model_id_attempted: The model_id that was attempted
        validation_category: Validation category from ai_models table
        request_params: Sanitized request parameters (no sensitive data)
        user_id: User who triggered the request (if applicable)
        org_id: Organization context (if applicable)
        ws_id: Workspace context (if applicable)
    """
    import traceback
    
    # Categorize error type
    error_message = str(error)
    error_type = _categorize_ai_error_type(error_message)
    
    # Sanitize request params (remove sensitive data)
    sanitized_params = None
    if request_params:
        sanitized_params = {
            'temperature': request_params.get('temperature'),
            'max_tokens': request_params.get('max_tokens'),
            'prompt_length': len(request_params.get('prompt', '')) if 'prompt' in request_params else None
        }
    
    try:
        insert_one(
            table='ai_log_error',
            data={
                'provider_id': provider_id,
                'model_id': model_id,
                'request_source': request_source,
                'operation_type': operation_type,
                'error_type': error_type,
                'error_message': error_message[:1000],  # Truncate long messages
                'error_raw': {
                    'type': type(error).__name__,
                    'message': error_message,
                    'traceback': traceback.format_exc()[:2000]
                },
                'model_id_attempted': model_id_attempted,
                'validation_category': validation_category,
                'request_params': sanitized_params,
                'user_id': user_id,
                'org_id': org_id,
                'ws_id': ws_id,
                'retry_count': 0
            }
        )
        print(f"✅ Logged AI error: {error_type} for model {model_id_attempted}")
    except Exception as log_error:
        # Don't fail the main operation if logging fails
        print(f"⚠️ Failed to log AI error: {log_error}")


def _categorize_ai_error_type(error_message: str) -> str:
    """Categorize error for easier filtering."""
    if not error_message:
        return 'unknown_error'
    
    error_lower = error_message.lower()
    
    if 'inference profile' in error_lower:
        return 'inference_profile_required'
    elif 'rate limit' in error_lower or 'throttl' in error_lower:
        return 'rate_limit_exceeded'
    elif 'not found' in error_lower or 'does not exist' in error_lower:
        return 'model_not_found'
    elif 'access denied' in error_lower or 'unauthorized' in error_lower:
        return 'access_denied'
    elif 'timeout' in error_lower:
        return 'timeout'
    elif 'quota' in error_lower:
        return 'quota_exceeded'
    elif 'marketplace' in error_lower:
        return 'marketplace_subscription_required'
    else:
        return 'unknown_error'
```

**Test:**
```python
# In eval-processor or other Lambda:
try:
    response = call_ai_provider(...)
except Exception as e:
    common.log_ai_error(
        provider_id=provider_id,
        model_id=model_id,
        request_source='eval-processor',
        operation_type='text_generation',
        error=e,
        model_id_attempted=model.get('model_id')
    )
```

---

### Task 1.2: Integrate Error Logging in All AI Modules

**Modules to update:**
1. ✅ `module-eval/backend/lambdas/eval-processor/` (DONE in validation_category plan)
2. ❌ `module-chat/backend/lambdas/chat-stream/`
3. ❌ `module-kb/backend/lambdas/kb-processor/`

**Pattern for integration:**

```python
# Wrap all AI API calls
try:
    response = call_ai_provider(
        provider_id=provider_id,
        model_id=model_id,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=temperature,
        max_tokens=max_tokens
    )
    return response
    
except Exception as e:
    # Log the error
    common.log_ai_error(
        provider_id=provider_id,
        model_id=model_id,
        request_source='chat-stream',  # Or 'kb-processor'
        operation_type='text_generation',  # Or 'embedding'
        error=e,
        model_id_attempted=model.get('model_id'),
        validation_category=model.get('validation_category'),
        user_id=user_id,
        org_id=org_id,
        ws_id=ws_id
    )
    raise  # Re-raise to maintain existing error handling
```

---

## Part 2: Usage Metrics System (4 hours)

### Task 2.1: Create Usage Tracking Table

**Migration**: `scripts/migrations/2026-01-20_ai-usage-logging.sql`

```sql
-- AI Usage Tracking for Cost and Performance Monitoring
CREATE TABLE ai_log_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Context
    provider_id UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
    model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    request_source VARCHAR(100) NOT NULL,  -- e.g., 'eval-processor', 'chat-stream'
    operation_type VARCHAR(50) NOT NULL,    -- e.g., 'text_generation', 'embedding'
    
    -- Request Details
    model_id_used VARCHAR(255) NOT NULL,    -- Actual model_id called (may be substituted)
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    
    -- Performance
    latency_ms INTEGER,                     -- Response time
    success BOOLEAN NOT NULL,               -- Did the call succeed?
    
    -- Cost (calculated)
    estimated_cost_usd DECIMAL(10, 6),     -- Estimated cost based on token count
    
    -- Metadata
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    org_id UUID,
    ws_id UUID,
    
    -- Additional context
    request_metadata JSONB,                 -- e.g., temperature, max_tokens, use_case
    
    -- Timestamps
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX idx_ai_log_usage_model ON ai_log_usage(model_id, started_at DESC);
CREATE INDEX idx_ai_log_usage_org ON ai_log_usage(org_id, started_at DESC);
CREATE INDEX idx_ai_log_usage_user ON ai_log_usage(user_id, started_at DESC);
CREATE INDEX idx_ai_log_usage_source ON ai_log_usage(request_source, started_at DESC);
CREATE INDEX idx_ai_log_usage_time ON ai_log_usage(started_at DESC);

-- Partial index for failed requests
CREATE INDEX idx_ai_log_usage_failed ON ai_log_usage(started_at DESC) 
    WHERE success = false;

COMMENT ON TABLE ai_log_usage IS 'AI API usage tracking for cost monitoring and performance analysis';
```

---

### Task 2.2: Implement org_common.log_ai_usage()

**File**: `templates/_modules-core/module-access/backend/layers/org-common/python/org_common/__init__.py`

```python
def log_ai_usage(
    provider_id: str,
    model_id: str,
    request_source: str,
    operation_type: str,
    model_id_used: str,
    success: bool,
    started_at: datetime,
    completed_at: Optional[datetime] = None,
    prompt_tokens: Optional[int] = None,
    completion_tokens: Optional[int] = None,
    total_tokens: Optional[int] = None,
    latency_ms: Optional[int] = None,
    user_id: Optional[str] = None,
    org_id: Optional[str] = None,
    ws_id: Optional[str] = None,
    request_metadata: Optional[Dict] = None
) -> None:
    """
    Log AI API usage for cost and performance tracking.
    
    Args:
        provider_id: AI provider UUID
        model_id: AI model UUID (what we intended to use)
        request_source: Source Lambda/service
        operation_type: Type of operation
        model_id_used: Actual model_id used (may be substituted)
        success: Did the request succeed?
        started_at: When the request started
        completed_at: When the request completed (if known)
        prompt_tokens: Input token count
        completion_tokens: Output token count
        total_tokens: Total token count
        latency_ms: Response time in milliseconds
        user_id: User context
        org_id: Organization context
        ws_id: Workspace context
        request_metadata: Additional context (temperature, use_case, etc.)
    """
    # Calculate estimated cost
    estimated_cost = None
    if total_tokens and provider_id and model_id:
        estimated_cost = _estimate_ai_cost(
            provider_id=provider_id,
            model_id=model_id,
            prompt_tokens=prompt_tokens or 0,
            completion_tokens=completion_tokens or 0
        )
    
    try:
        insert_one(
            table='ai_log_usage',
            data={
                'provider_id': provider_id,
                'model_id': model_id,
                'request_source': request_source,
                'operation_type': operation_type,
                'model_id_used': model_id_used,
                'prompt_tokens': prompt_tokens,
                'completion_tokens': completion_tokens,
                'total_tokens': total_tokens,
                'latency_ms': latency_ms,
                'success': success,
                'estimated_cost_usd': estimated_cost,
                'user_id': user_id,
                'org_id': org_id,
                'ws_id': ws_id,
                'request_metadata': request_metadata,
                'started_at': started_at,
                'completed_at': completed_at or datetime.now(timezone.utc)
            }
        )
    except Exception as log_error:
        print(f"⚠️ Failed to log AI usage: {log_error}")


def _estimate_ai_cost(
    provider_id: str,
    model_id: str,
    prompt_tokens: int,
    completion_tokens: int
) -> Optional[float]:
    """
    Estimate cost based on token counts.
    
    Uses pricing data from ai_models table (future enhancement).
    For now, uses hardcoded estimates.
    """
    # TODO: Get pricing from ai_models table
    # For now, use rough estimates (per 1M tokens)
    
    # Bedrock pricing (approximate)
    pricing_map = {
        'anthropic.claude-3': {
            'input': 3.00,   # $3 per 1M input tokens
            'output': 15.00  # $15 per 1M output tokens
        },
        'anthropic.claude-sonnet': {
            'input': 3.00,
            'output': 15.00
        },
        'amazon.nova': {
            'input': 0.60,
            'output': 2.40
        }
    }
    
    # Try to match model to pricing
    model = find_one('ai_models', {'id': model_id})
    if not model:
        return None
    
    model_id_str = model.get('model_id', '')
    
    # Find matching pricing
    pricing = None
    for key, value in pricing_map.items():
        if key in model_id_str:
            pricing = value
            break
    
    if not pricing:
        return None
    
    # Calculate cost
    input_cost = (prompt_tokens / 1_000_000) * pricing['input']
    output_cost = (completion_tokens / 1_000_000) * pricing['output']
    
    return round(input_cost + output_cost, 6)
```

---

## Part 3: Admin Dashboard UI (6-8 hours)

### Task 3.1: Error Triage Dashboard

**Page**: `/admin/sys/ai/errors`

**Features:**
1. Error list with filtering
2. Error details modal
3. Resolve/Re-validate actions
4. Charts showing error trends

**Implementation:**

```typescript
// apps/web/app/admin/sys/ai/errors/page.tsx

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'

interface AIError {
  id: string
  error_type: string
  error_message: string
  model_id_attempted: string
  request_source: string
  occurred_at: string
  resolved_at: string | null
  provider?: { name: string }
  model?: { display_name: string }
}

export default function AIErrorsPage() {
  const [errors, setErrors] = useState<AIError[]>([])
  const [filter, setFilter] = useState({
    status: 'unresolved',
    error_type: 'all',
    timeRange: '24h'
  })

  useEffect(() => {
    fetchErrors()
  }, [filter])

  const fetchErrors = async () => {
    const response = await fetch('/api/admin/sys/ai/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filter)
    })
    const data = await response.json()
    setErrors(data.errors)
  }

  const resolveError = async (errorId: string) => {
    await fetch(`/api/admin/sys/ai/errors/${errorId}/resolve`, {
      method: 'POST'
    })
    fetchErrors()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">AI Operations - Error Triage</h1>
      
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select
              value={filter.status}
              onValueChange={(value) => setFilter({...filter, status: value})}
            >
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
              <option value="all">All</option>
            </Select>
            
            <Select
              value={filter.error_type}
              onValueChange={(value) => setFilter({...filter, error_type: value})}
            >
              <option value="all">All Types</option>
              <option value="inference_profile_required">Inference Profile</option>
              <option value="rate_limit_exceeded">Rate Limit</option>
              <option value="model_not_found">Model Not Found</option>
            </Select>
            
            <Select
              value={filter.timeRange}
              onValueChange={(value) => setFilter({...filter, timeRange: value})}
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error List */}
      <Card>
        <CardHeader>
          <CardTitle>Errors ({errors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {errors.map(error => (
              <div key={error.id} className="border rounded p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="destructive">{error.error_type}</Badge>
                      <span className="text-sm text-gray-500">{error.request_source}</span>
                    </div>
                    <p className="font-medium">{error.error_message}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Model: {error.model?.display_name || error.model_id_attempted}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(error.occurred_at).toLocaleString()}
                    </p>
                  </div>
                  
                  {!error.resolved_at && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => resolveError(error.id)}>
                        Resolve
                      </Button>
                      <Button size="sm" variant="outline">
                        Re-validate
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### Task 3.2: Usage Analytics Dashboard

**Page**: `/admin/sys/ai/analytics`

**Features:**
1. Usage charts (requests over time)
2. Token consumption by model
3. Cost tracking and forecasting
4. Performance metrics (latency, success rate)

**Queries for charts:**

```sql
-- Requests per day (last 30 days)
SELECT 
    DATE(started_at) as date,
    COUNT(*) as request_count,
    SUM(total_tokens) as total_tokens,
    SUM(estimated_cost_usd) as total_cost,
    AVG(latency_ms) as avg_latency
FROM ai_log_usage
WHERE started_at > now() - interval '30 days'
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- Top models by usage
SELECT 
    m.display_name,
    m.model_id,
    COUNT(*) as request_count,
    SUM(u.total_tokens) as total_tokens,
    SUM(u.estimated_cost_usd) as total_cost,
    AVG(u.latency_ms) as avg_latency,
    (COUNT(*) FILTER (WHERE u.success = true)::FLOAT / COUNT(*) * 100) as success_rate
FROM ai_log_usage u
JOIN ai_models m ON u.model_id = m.id
WHERE u.started_at > now() - interval '7 days'
GROUP BY m.id, m.display_name, m.model_id
ORDER BY request_count DESC
LIMIT 10;

-- Cost by organization
SELECT 
    o.name as org_name,
    COUNT(*) as request_count,
    SUM(u.total_tokens) as total_tokens,
    SUM(u.estimated_cost_usd) as total_cost
FROM ai_log_usage u
LEFT JOIN orgs o ON u.org_id = o.id
WHERE u.started_at > now() - interval '30 days'
GROUP BY o.id, o.name
ORDER BY total_cost DESC;
```

---

### Task 3.3: Backend API Routes

**File**: `apps/web/app/api/admin/sys/ai/errors/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { status, error_type, timeRange } = await request.json()

  // Build query
  let query = supabase
    .from('ai_log_error')
    .select(`
      *,
      provider:ai_providers(name, provider_type),
      model:ai_models(display_name, model_id)
    `)
    .order('occurred_at', { ascending: false })

  // Apply filters
  if (status === 'unresolved') {
    query = query.is('resolved_at', null)
  } else if (status === 'resolved') {
    query = query.not('resolved_at', 'is', null)
  }

  if (error_type !== 'all') {
    query = query.eq('error_type', error_type)
  }

  // Time range
  const timeRangeMap = {
    '1h': '1 hour',
    '24h': '24 hours',
    '7d': '7 days',
    '30d': '30 days'
  }
  const interval = timeRangeMap[timeRange] || '24 hours'
  query = query.gte('occurred_at', `now() - interval '${interval}'`)

  const { data: errors, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ errors })
}
```

**File**: `apps/web/app/api/admin/sys/ai/analytics/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const timeRange = searchParams.get('timeRange') || '7d'

  // Fetch usage data
  const { data, error } = await supabase
    .rpc('get_ai_usage_analytics', { time_range: timeRange })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

---

## Part 4: Alerting and Automation (2 hours)

### Task 4.1: CloudWatch Alarms

**Create alarms for:**
1. Error rate spike (>10 errors/hour)
2. Cost anomaly (>2x average daily cost)
3. Model failure (same model fails >5 times in 1 hour)

**Implementation**: Use AWS CDK or Terraform

```hcl
# In module-ai infrastructure
resource "aws_cloudwatch_metric_alarm" "ai_error_spike" {
  alarm_name          = "${var.project}-${var.env}-ai-error-spike"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "AIErrorCount"
  namespace           = "CORA/AI"
  period              = "3600"  # 1 hour
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "Alert when AI errors exceed 10 per hour"
  
  alarm_actions = [aws_sns_topic.ops_alerts.arn]
}
```

---

### Task 4.2: Auto Re-Validation Trigger

**Lambda**: `module-ai/backend/lambdas/auto-revalidate/`

**Trigger**: CloudWatch EventBridge rule (runs every hour)

**Logic:**
1. Query models with recent errors (last 24h)
2. Filter where validation is stale (>30 days old)
3. Trigger validation for each stale model
4. Log results

---

## Success Criteria

### Part 1: Error Logging
- [ ] `log_ai_error()` fully implemented in org_common
- [ ] Error logging integrated in eval-processor ✅ (done)
- [ ] Error logging integrated in chat-stream
- [ ] Error logging integrated in kb-processor
- [ ] Test error logging by triggering failures
- [ ] Verify errors appear in ai_log_error table

### Part 2: Usage Metrics
- [ ] ai_log_usage table created and migrated
- [ ] `log_ai_usage()` implemented in org_common
- [ ] Usage logging integrated in all AI modules
- [ ] Cost estimation function working
- [ ] Query usage data successfully

### Part 3: Admin Dashboard
- [ ] Error triage page implemented
- [ ] Usage analytics page implemented
- [ ] Charts rendering correctly
- [ ] Filtering working
- [ ] Resolve/Re-validate actions functional

### Part 4: Alerting
- [ ] CloudWatch alarms configured
- [ ] Auto re-validation Lambda created
- [ ] Alerts tested and verified

---

## Deployment Checklist

### Phase 1: Foundation (2 hours)
- [ ] Implement `log_ai_error()` in org_common
- [ ] Implement `log_ai_usage()` in org_common
- [ ] Create ai_log_usage migration
- [ ] Run migrations on test database
- [ ] Rebuild org_common layer
- [ ] Deploy updated org_common to test environment

### Phase 2: Integration (2 hours)
- [ ] Integrate error logging in chat-stream
- [ ] Integrate error logging in kb-processor
- [ ] Integrate usage logging in all modules
- [ ] Deploy all updated Lambdas
- [ ] Test logging by making AI requests
- [ ] Verify data in both tables

### Phase 3: Dashboard (4 hours)
- [ ] Create error triage page UI
- [ ] Create analytics page UI
- [ ] Implement backend API routes
- [ ] Test dashboard with real data
- [ ] Deploy to test environment

### Phase 4: Alerting (2 hours)
- [ ] Configure CloudWatch alarms
- [ ] Create auto re-validation Lambda
- [ ] Set up SNS notifications
- [ ] Test alerts by triggering conditions

---

## Testing Plan

### Unit Tests
```python
# Test error logging
def test_log_ai_error():
    common.log_ai_error(
        provider_id='test-provider',
        model_id='test-model',
        request_source='test',
        operation_type='test',
        error=Exception('Test error'),
        model_id_attempted='test-model-id'
    )
    # Verify record created

# Test usage logging
def test_log_ai_usage():
    common.log_ai_usage(
        provider_id='test-provider',
        model_id='test-model',
        request_source='test',
        operation_type='test',
        model_id_used='test-model-id',
        success=True,
        started_at=datetime.now(),
        total_tokens=100
    )
    # Verify record created
```

### Integration Tests
1. Create evaluation → verify usage logged
2. Trigger error → verify error logged
3. Check dashboard → verify data displays
4. Resolve error → verify status updates

---

## Future Enhancements

1. **Cost Optimization Recommendations**
   - Identify expensive models
   - Suggest cheaper alternatives
   - Auto-switch to cost-effective models

2. **Performance Optimization**
   - Detect slow models
   - Recommend faster alternatives
   - Cache common responses

3. **Usage Quotas**
   - Set org-level quotas
   - Alert on quota violations
   - Auto-throttle if exceeded

4. **Advanced Analytics**
   - A/B testing different models
   - Quality metrics (user feedback)
   - ROI analysis

---

**Document Status:** 📋 Ready to execute  
**Branch:** `ai-ops-monitoring`  
**Priority:** 🟡 MEDIUM  
**Estimated Completion:** 8-12 hours
