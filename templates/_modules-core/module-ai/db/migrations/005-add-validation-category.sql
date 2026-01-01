-- Migration: Add validation_category to ai_models table
-- Purpose: Track specific error categories instead of generic "unavailable" status
-- This helps distinguish between:
--   - Models that work via inference profiles (available)
--   - Models that need marketplace subscriptions
--   - Models with integration errors (code needs fixing)
--   - Models that are truly deprecated/unavailable

-- Add validation_category column
ALTER TABLE ai_models
ADD COLUMN validation_category VARCHAR(50);

-- Add comment explaining the field
COMMENT ON COLUMN ai_models.validation_category IS 'Categorizes validation results: available, requires_inference_profile, requires_marketplace, invalid_request_format, access_denied, deprecated, timeout, unknown_error';

-- Update existing models with default category based on status
UPDATE ai_models
SET validation_category = CASE
    WHEN status = 'available' THEN 'available'
    WHEN status = 'unavailable' THEN 'unknown_error'
    ELSE NULL
END
WHERE validation_category IS NULL;

-- Add validation_category to validation history table for tracking
ALTER TABLE ai_model_validation_history
ADD COLUMN validation_category VARCHAR(50);

COMMENT ON COLUMN ai_model_validation_history.validation_category IS 'Category of validation result for this specific validation run';
