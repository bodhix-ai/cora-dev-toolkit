-- =============================================
-- MODULE-AI: AI Provider Model Summary View
-- =============================================
-- Purpose: Aggregation view for efficient provider/model count queries
-- Version: 2.0 (December 2025 - Aligned with pm-app production)
-- Note: View for dashboard displays and provider overview

-- =============================================
-- AI_PROVIDER_MODEL_SUMMARY VIEW
-- =============================================
-- This view provides aggregated counts of models per provider by status,
-- useful for dashboard displays and quick provider overviews.

CREATE OR REPLACE VIEW public.ai_provider_model_summary AS
SELECT
    p.id as provider_id,
    p.name as provider_name,
    p.display_name as provider_display_name,
    p.provider_type,
    p.is_active,
    COUNT(m.id) as total_models,
    COUNT(CASE WHEN m.status = 'discovered' THEN 1 END) as discovered_count,
    COUNT(CASE WHEN m.status = 'testing' THEN 1 END) as testing_count,
    COUNT(CASE WHEN m.status = 'available' THEN 1 END) as available_count,
    COUNT(CASE WHEN m.status = 'unavailable' THEN 1 END) as unavailable_count,
    COUNT(CASE WHEN m.status = 'deprecated' THEN 1 END) as deprecated_count,
    MAX(vh.validated_at) as last_validated_at,
    p.created_at,
    p.updated_at
FROM public.ai_providers p
LEFT JOIN public.ai_models m ON m.provider_id = p.id
LEFT JOIN public.ai_model_validation_history vh ON vh.provider_id = p.id
GROUP BY p.id, p.name, p.display_name, p.provider_type, p.is_active, p.created_at, p.updated_at;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON VIEW public.ai_provider_model_summary IS 'Aggregated view of provider model counts by status. Used for dashboards and provider listings.';
