-- =============================================
-- MODULE-WS: Activity Log Table
-- =============================================
-- Purpose: Track workspace actions for audit trail and activity history
-- Source: Created for CORA toolkit Jan 2026
-- Updated: Feb 2026 - Renamed to ws_log_activity per ADR-011 naming standards

-- =============================================
-- TABLE: ws_log_activity - Workspace activity log
-- =============================================
-- Naming: ADR-011 Rule 8.2 - Log tables use _log_ pattern
-- Previous name: ws_activity_log (deprecated)

CREATE TABLE IF NOT EXISTS ws_log_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ws_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Activity details
    action VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ws_log_activity_ws_id ON ws_log_activity(ws_id);
CREATE INDEX IF NOT EXISTS idx_ws_log_activity_user_id ON ws_log_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_log_activity_created_at ON ws_log_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ws_log_activity_ws_id_created_at ON ws_log_activity(ws_id, created_at DESC);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE ws_log_activity IS 
'Audit trail of workspace actions. Tracks all significant workspace events for compliance and activity history. ADR-011 compliant naming.';

COMMENT ON COLUMN ws_log_activity.action IS 
'Human-readable description of the action (e.g., "Workspace created", "Member added", "Ownership transferred")';

COMMENT ON COLUMN ws_log_activity.metadata IS 
'Additional contextual information about the action (e.g., changed fields, member IDs, role changes)';

-- =============================================
-- EXAMPLE METADATA FORMATS
-- =============================================

-- Workspace created:
-- { }

-- Workspace updated:
-- { "fields": ["name", "description", "color"] }

-- Member added:
-- { "member_user_id": "uuid", "role": "ws_admin" }

-- Member role updated:
-- { "member_id": "uuid", "new_role": "ws_owner" }

-- Member removed:
-- { "member_id": "uuid" }

-- Ownership transferred:
-- { "new_owner_id": "uuid" }

-- =============================================
-- DATA RETENTION
-- =============================================

-- Activity logs should be retained according to organization's compliance requirements.
-- Consider implementing a cleanup function for logs older than retention period.

-- Example cleanup function (run periodically):
-- CREATE OR REPLACE FUNCTION cleanup_old_activity_logs(p_retention_days INTEGER DEFAULT 365)
-- RETURNS INTEGER AS $$
-- DECLARE
--     v_deleted_count INTEGER;
-- BEGIN
--     DELETE FROM ws_log_activity
--     WHERE created_at < NOW() - INTERVAL '1 day' * p_retention_days;
--     
--     GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
--     RETURN v_deleted_count;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;