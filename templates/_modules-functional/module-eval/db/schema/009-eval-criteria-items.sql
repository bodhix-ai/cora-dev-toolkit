-- ============================================================================
-- Module: module-eval
-- Migration: 009-eval-criteria-items
-- Description: Individual evaluation criteria within a criteria set
-- ============================================================================

-- Create eval_criteria_items table
CREATE TABLE IF NOT EXISTS eval_criteria_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    criteria_set_id UUID NOT NULL REFERENCES eval_criteria_sets(id) ON DELETE CASCADE,
    criteria_id TEXT NOT NULL,
    requirement TEXT NOT NULL,
    description TEXT,
    category TEXT,
    weight DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT eval_criteria_items_set_criteria_unique 
        UNIQUE (criteria_set_id, criteria_id),
    CONSTRAINT eval_criteria_items_weight_check CHECK (weight > 0)
);

-- Add table comment
COMMENT ON TABLE eval_criteria_items IS 'Individual evaluation criteria within a criteria set';
COMMENT ON COLUMN eval_criteria_items.criteria_set_id IS 'Criteria set this item belongs to';
COMMENT ON COLUMN eval_criteria_items.criteria_id IS 'External identifier (from import)';
COMMENT ON COLUMN eval_criteria_items.requirement IS 'The requirement text to evaluate';
COMMENT ON COLUMN eval_criteria_items.description IS 'Additional context/guidance';
COMMENT ON COLUMN eval_criteria_items.category IS 'Grouping category';
COMMENT ON COLUMN eval_criteria_items.weight IS 'Weight for scoring (if weighted)';
COMMENT ON COLUMN eval_criteria_items.order_index IS 'Display order';
COMMENT ON COLUMN eval_criteria_items.is_active IS 'Soft delete flag';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eval_criteria_items_set 
    ON eval_criteria_items(criteria_set_id);
CREATE INDEX IF NOT EXISTS idx_eval_criteria_items_category 
    ON eval_criteria_items(criteria_set_id, category);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_eval_criteria_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eval_criteria_items_updated_at ON eval_criteria_items;
CREATE TRIGGER eval_criteria_items_updated_at
    BEFORE UPDATE ON eval_criteria_items
    FOR EACH ROW
    EXECUTE FUNCTION update_eval_criteria_items_updated_at();

-- ============================================================================
-- End of migration
-- ============================================================================
