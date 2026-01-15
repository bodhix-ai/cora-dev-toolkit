-- ============================================================================
-- Module: module-eval
-- Migration: 003-eval-sys-status-options
-- Description: Default status options for evaluation results
-- ============================================================================

-- Create eval_sys_status_options table
CREATE TABLE IF NOT EXISTS eval_sys_status_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#9e9e9e',
    score_value DECIMAL(5,2),
    order_index INTEGER NOT NULL DEFAULT 0,
    mode TEXT NOT NULL DEFAULT 'detailed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT eval_sys_status_options_name_mode_unique UNIQUE (name, mode),
    CONSTRAINT eval_sys_status_options_mode_check 
        CHECK (mode IN ('boolean', 'detailed', 'both'))
);

-- Add table comment
COMMENT ON TABLE eval_sys_status_options IS 'Default status options for evaluation results';
COMMENT ON COLUMN eval_sys_status_options.name IS 'Status display name';
COMMENT ON COLUMN eval_sys_status_options.color IS 'Hex color code for UI display';
COMMENT ON COLUMN eval_sys_status_options.score_value IS 'Numerical score (0-100) for aggregation';
COMMENT ON COLUMN eval_sys_status_options.order_index IS 'Display order (lower = first)';
COMMENT ON COLUMN eval_sys_status_options.mode IS 'Which scoring mode uses this option: boolean, detailed, or both';

-- Create index for mode filtering
CREATE INDEX IF NOT EXISTS idx_eval_sys_status_options_mode 
    ON eval_sys_status_options(mode);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_eval_sys_status_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eval_sys_status_options_updated_at ON eval_sys_status_options;
CREATE TRIGGER eval_sys_status_options_updated_at
    BEFORE UPDATE ON eval_sys_status_options
    FOR EACH ROW
    EXECUTE FUNCTION update_eval_sys_status_options_updated_at();

-- Insert seed data for boolean mode options (idempotent)
INSERT INTO eval_sys_status_options (name, color, score_value, order_index, mode)
SELECT 'Non-Compliant', '#f44336', 0, 1, 'boolean'
WHERE NOT EXISTS (
    SELECT 1 FROM eval_sys_status_options 
    WHERE name = 'Non-Compliant' AND mode = 'boolean'
);

INSERT INTO eval_sys_status_options (name, color, score_value, order_index, mode)
SELECT 'Compliant', '#4caf50', 100, 2, 'boolean'
WHERE NOT EXISTS (
    SELECT 1 FROM eval_sys_status_options 
    WHERE name = 'Compliant' AND mode = 'boolean'
);

-- Insert seed data for detailed mode options (idempotent)
INSERT INTO eval_sys_status_options (name, color, score_value, order_index, mode)
SELECT 'Non-Compliant', '#f44336', 0, 1, 'detailed'
WHERE NOT EXISTS (
    SELECT 1 FROM eval_sys_status_options 
    WHERE name = 'Non-Compliant' AND mode = 'detailed'
);

INSERT INTO eval_sys_status_options (name, color, score_value, order_index, mode)
SELECT 'Major Issues', '#ff9800', 25, 2, 'detailed'
WHERE NOT EXISTS (
    SELECT 1 FROM eval_sys_status_options 
    WHERE name = 'Major Issues' AND mode = 'detailed'
);

INSERT INTO eval_sys_status_options (name, color, score_value, order_index, mode)
SELECT 'Minor Issues', '#ffeb3b', 50, 3, 'detailed'
WHERE NOT EXISTS (
    SELECT 1 FROM eval_sys_status_options 
    WHERE name = 'Minor Issues' AND mode = 'detailed'
);

INSERT INTO eval_sys_status_options (name, color, score_value, order_index, mode)
SELECT 'Partial', '#8bc34a', 75, 4, 'detailed'
WHERE NOT EXISTS (
    SELECT 1 FROM eval_sys_status_options 
    WHERE name = 'Partial' AND mode = 'detailed'
);

INSERT INTO eval_sys_status_options (name, color, score_value, order_index, mode)
SELECT 'Compliant', '#4caf50', 100, 5, 'detailed'
WHERE NOT EXISTS (
    SELECT 1 FROM eval_sys_status_options 
    WHERE name = 'Compliant' AND mode = 'detailed'
);

INSERT INTO eval_sys_status_options (name, color, score_value, order_index, mode)
SELECT 'Exceeds', '#2196f3', 100, 6, 'detailed'
WHERE NOT EXISTS (
    SELECT 1 FROM eval_sys_status_options 
    WHERE name = 'Exceeds' AND mode = 'detailed'
);

-- ============================================================================
-- End of migration
-- ============================================================================
