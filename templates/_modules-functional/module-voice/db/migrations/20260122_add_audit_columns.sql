-- =============================================
-- MIGRATION: Add Audit Columns to Voice Sessions
-- =============================================
-- Created: 2026-01-22
-- Purpose: Add standard CORA audit columns to voice_sessions table
--          to ensure consistency across all module entity tables
--
-- Standard CORA Audit Columns:
--   - is_deleted (boolean) - Soft delete flag
--   - deleted_at (timestamp) - When was it deleted
--   - deleted_by (uuid) - Who deleted it
--   - updated_by (uuid) - Who last updated it (if missing)
--
-- This migration is NON-BREAKING:
--   - New columns are nullable
--   - Existing data is preserved
--   - Triggers auto-populate future changes
-- =============================================

-- Add audit columns to voice_sessions
ALTER TABLE voice_sessions
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID NULL;

-- Add foreign key constraint for deleted_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'voice_sessions_deleted_by_fkey'
  ) THEN
    ALTER TABLE voice_sessions
      ADD CONSTRAINT voice_sessions_deleted_by_fkey 
      FOREIGN KEY (deleted_by) REFERENCES auth.users(id);
  END IF;
END $$;

-- Add index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_voice_sessions_is_deleted 
  ON voice_sessions(is_deleted) 
  WHERE is_deleted = false;

-- Add composite index for workspace + not deleted
CREATE INDEX IF NOT EXISTS idx_voice_sessions_ws_not_deleted
  ON voice_sessions(ws_id, is_deleted)
  WHERE is_deleted = false;

-- Create trigger function to sync is_deleted with deleted_at
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

-- Attach trigger to voice_sessions
DROP TRIGGER IF EXISTS voice_sessions_sync_is_deleted ON voice_sessions;
CREATE TRIGGER voice_sessions_sync_is_deleted
  BEFORE UPDATE ON voice_sessions
  FOR EACH ROW
  EXECUTE FUNCTION sync_voice_sessions_is_deleted();

-- Add comment
COMMENT ON COLUMN voice_sessions.is_deleted IS 
  'Soft delete flag - automatically synced with deleted_at via trigger';
COMMENT ON COLUMN voice_sessions.deleted_at IS 
  'Timestamp when the record was soft deleted';
COMMENT ON COLUMN voice_sessions.deleted_by IS 
  'User who soft deleted this record';

-- Verification query (optional - comment out for production)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'voice_sessions' 
-- AND column_name IN ('is_deleted', 'deleted_at', 'deleted_by')
-- ORDER BY column_name;
