-- ============================================================================
-- CORA Module Registry - Usage Tracking
-- Schema: 004-platform-module-usage.sql
-- Purpose: Track module usage for analytics and billing
-- ============================================================================

-- ============================================================================
-- Table: platform_module_usage
-- Purpose: Track usage events for each module
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_module_usage (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Module Reference
    module_id UUID NOT NULL REFERENCES platform_module_registry(id) ON DELETE CASCADE,
    module_name VARCHAR(100) NOT NULL,  -- Denormalized for query performance
    
    -- Organization Context
    org_id UUID NOT NULL,
    
    -- User Context (optional - for user-level tracking)
    user_id UUID,
    
    -- Usage Event Details
    event_type VARCHAR(50) NOT NULL DEFAULT 'api_call'
        CHECK (event_type IN ('api_call', 'page_view', 'feature_use', 'error', 'export', 'import')),
    event_action VARCHAR(100),           -- e.g., 'kb.document.create', 'chat.message.send'
    event_metadata JSONB DEFAULT '{}'::jsonb,  -- Additional event-specific data
    
    -- Request Context
    request_id UUID,                     -- Correlation ID for tracing
    endpoint VARCHAR(255),               -- API endpoint or page route
    http_method VARCHAR(10),             -- GET, POST, PUT, DELETE, etc.
    
    -- Performance Metrics
    duration_ms INTEGER,                 -- Request duration in milliseconds
    
    -- Status
    status VARCHAR(20) DEFAULT 'success'
        CHECK (status IN ('success', 'failure', 'partial')),
    error_code VARCHAR(50),              -- Error code if status is failure
    error_message TEXT,                  -- Error message if status is failure
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Partitioning Support (for future time-based partitioning)
    event_date DATE
);

-- ============================================================================
-- Trigger to auto-populate event_date
-- ============================================================================

CREATE OR REPLACE FUNCTION set_event_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.event_date := NEW.created_at::DATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TRIGGER set_platform_module_usage_event_date
    BEFORE INSERT ON platform_module_usage
    FOR EACH ROW
    EXECUTE FUNCTION set_event_date();

-- ============================================================================
-- Indexes for platform_module_usage
-- ============================================================================

-- Primary lookup by module and time
CREATE INDEX IF NOT EXISTS idx_module_usage_module_time 
    ON platform_module_usage(module_id, created_at DESC);

-- Organization-level queries
CREATE INDEX IF NOT EXISTS idx_module_usage_org 
    ON platform_module_usage(org_id, created_at DESC);

-- User-level queries (when user_id is present)
CREATE INDEX IF NOT EXISTS idx_module_usage_user 
    ON platform_module_usage(user_id, created_at DESC) 
    WHERE user_id IS NOT NULL;

-- Event type filtering
CREATE INDEX IF NOT EXISTS idx_module_usage_event_type 
    ON platform_module_usage(event_type, created_at DESC);

-- Date-based partitioning support
CREATE INDEX IF NOT EXISTS idx_module_usage_date 
    ON platform_module_usage(event_date);

-- Module name lookup (for cross-module queries)
CREATE INDEX IF NOT EXISTS idx_module_usage_module_name 
    ON platform_module_usage(module_name, created_at DESC);

-- ============================================================================
-- Table: platform_module_usage_daily
-- Purpose: Aggregated daily usage statistics (materialized for performance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_module_usage_daily (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dimensions
    module_id UUID NOT NULL REFERENCES platform_module_registry(id) ON DELETE CASCADE,
    module_name VARCHAR(100) NOT NULL,
    org_id UUID NOT NULL,
    usage_date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    
    -- Metrics
    total_events INTEGER NOT NULL DEFAULT 0,
    successful_events INTEGER NOT NULL DEFAULT 0,
    failed_events INTEGER NOT NULL DEFAULT 0,
    unique_users INTEGER NOT NULL DEFAULT 0,
    total_duration_ms BIGINT DEFAULT 0,
    avg_duration_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for upsert operations
    CONSTRAINT unique_daily_usage UNIQUE (module_id, org_id, usage_date, event_type)
);

-- ============================================================================
-- Indexes for platform_module_usage_daily
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_usage_daily_module_date 
    ON platform_module_usage_daily(module_id, usage_date DESC);

CREATE INDEX IF NOT EXISTS idx_usage_daily_org_date 
    ON platform_module_usage_daily(org_id, usage_date DESC);

CREATE INDEX IF NOT EXISTS idx_usage_daily_date 
    ON platform_module_usage_daily(usage_date DESC);

-- ============================================================================
-- Function: Aggregate Usage to Daily Table
-- ============================================================================

CREATE OR REPLACE FUNCTION aggregate_module_usage_daily(
    p_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS INTEGER AS $$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    INSERT INTO platform_module_usage_daily (
        module_id,
        module_name,
        org_id,
        usage_date,
        event_type,
        total_events,
        successful_events,
        failed_events,
        unique_users,
        total_duration_ms,
        avg_duration_ms
    )
    SELECT 
        module_id,
        module_name,
        org_id,
        event_date,
        event_type,
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE status = 'success') as successful_events,
        COUNT(*) FILTER (WHERE status = 'failure') as failed_events,
        COUNT(DISTINCT user_id) as unique_users,
        COALESCE(SUM(duration_ms), 0) as total_duration_ms,
        CASE WHEN COUNT(*) > 0 THEN (COALESCE(SUM(duration_ms), 0) / COUNT(*))::INTEGER ELSE 0 END as avg_duration_ms
    FROM platform_module_usage
    WHERE event_date = p_date
    GROUP BY module_id, module_name, org_id, event_date, event_type
    ON CONFLICT (module_id, org_id, usage_date, event_type)
    DO UPDATE SET
        total_events = EXCLUDED.total_events,
        successful_events = EXCLUDED.successful_events,
        failed_events = EXCLUDED.failed_events,
        unique_users = EXCLUDED.unique_users,
        total_duration_ms = EXCLUDED.total_duration_ms,
        avg_duration_ms = EXCLUDED.avg_duration_ms,
        updated_at = CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE platform_module_usage IS 'Raw usage events for all modules - used for detailed analytics';
COMMENT ON TABLE platform_module_usage_daily IS 'Aggregated daily usage statistics for dashboard display';
COMMENT ON FUNCTION aggregate_module_usage_daily IS 'Aggregates raw usage data into daily summaries. Run daily via cron/scheduler.';

COMMENT ON COLUMN platform_module_usage.event_type IS 'Type of usage event: api_call, page_view, feature_use, error, export, import';
COMMENT ON COLUMN platform_module_usage.event_action IS 'Specific action within the module, e.g., kb.document.create';
COMMENT ON COLUMN platform_module_usage.request_id IS 'Correlation ID for distributed tracing';
COMMENT ON COLUMN platform_module_usage.event_date IS 'Generated column for efficient date-based partitioning';
