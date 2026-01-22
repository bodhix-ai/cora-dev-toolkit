-- Migration: Add soft delete consistency trigger to voice_sessions
-- Date: 2026-01-22
-- Purpose: Ensure is_deleted and deleted_at stay in sync (ADR-015 compliance)

-- Trigger function for soft delete consistency
CREATE OR REPLACE FUNCTION sync_voice_sessions_is_deleted()
RETURNS TRIGGER AS $$
BEGIN
    -- When deleted_at is set, ensure is_deleted is true
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        NEW.is_deleted := true;
    END IF;
    
    -- When deleted_at is cleared (restore), ensure is_deleted is false
    IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
        NEW.is_deleted := false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for soft delete consistency
DROP TRIGGER IF EXISTS voice_sessions_sync_is_deleted ON public.voice_sessions;
CREATE TRIGGER voice_sessions_sync_is_deleted
    BEFORE UPDATE ON public.voice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION sync_voice_sessions_is_deleted();

-- Verify trigger exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'voice_sessions_sync_is_deleted'
    ) THEN
        RAISE EXCEPTION 'Trigger voice_sessions_sync_is_deleted was not created successfully';
    END IF;
    
    RAISE NOTICE 'Trigger voice_sessions_sync_is_deleted created successfully';
END $$;
