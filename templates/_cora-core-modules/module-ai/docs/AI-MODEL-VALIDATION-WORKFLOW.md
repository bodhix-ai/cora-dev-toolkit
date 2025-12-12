# AI Model Validation Workflow - Implementation Guide

**Created:** 2025-11-17  
**Status:** Complete  
**Version:** 1.0

## Overview

This document describes the complete AI Model Validation Workflow implementation, including database enhancements, backend API updates, and frontend UX improvements with real-time progress tracking.

## Features Implemented

### Core Features

- ✅ Model count summary by status (discovered, testing, available, unavailable, deprecated)
- ✅ Validate Models button with enable/disable logic
- ✅ View Models modal with search, filter, and sort capabilities
- ✅ Real-time validation progress tracking
- ✅ Last validated timestamp display
- ✅ Validation history tracking in database

### UX Enhancements

- ✅ Color-coded status chips with icons
- ✅ Progress bar during validation
- ✅ Live success/failure counts during validation
- ✅ Disabled states for buttons during operations
- ✅ Tooltips for better user guidance
- ✅ Responsive layout with mobile support

## Architecture

### Database Layer

**New Table: `ai_model_validation_history`**

```sql
CREATE TABLE public.ai_model_validation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.ai_providers(id),
    model_id UUID REFERENCES public.ai_models(id),
    status TEXT NOT NULL,
    error_message TEXT,
    latency_ms INTEGER,
    validated_at TIMESTAMPTZ DEFAULT NOW(),
    validated_by UUID REFERENCES auth.users(id)
);
```

**New View: `ai_provider_model_summary`**

```sql
CREATE VIEW ai_provider_model_summary AS
SELECT
    p.id as provider_id,
    COUNT(m.id) as total_models,
    COUNT(CASE WHEN m.status = 'discovered' THEN 1 END) as discovered_count,
    COUNT(CASE WHEN m.status = 'testing' THEN 1 END) as testing_count,
    COUNT(CASE WHEN m.status = 'available' THEN 1 END) as available_count,
    COUNT(CASE WHEN m.status = 'unavailable' THEN 1 END) as unavailable_count,
    MAX(vh.validated_at) as last_validated_at,
    ...
FROM ai_providers p
LEFT JOIN ai_models m ON m.provider_id = p.id
LEFT JOIN ai_model_validation_history vh ON vh.provider_id = p.id
GROUP BY p.id;
```

### Backend API

**Updated Endpoint: `GET /providers`**

- Now includes model counts and last_validated_at by default
- Uses efficient database view for aggregation
- Optional `?include_model_counts=false` to disable

**Enhanced Endpoint: `POST /providers/:id/validate-models`**

- Validates all "discovered" models
- Logs each validation attempt to history table
- Returns detailed results with latency metrics
- Sets model status to "available" or "unavailable"

### Frontend Components

**Updated Components:**

1. `ProviderCard.tsx` - Enhanced with model counts, validate button, progress tracking
2. `ViewModelsModal.tsx` - New modal for viewing all models with search/filter
3. `useModels.ts` hook - Added `validateModels()` method
4. Type definitions - Added `ValidationProgress`, `ValidationHistoryEntry`, `ModelCounts`

## Implementation Steps

### 1. Database Migration

Run the migration to create the view and history table:

```bash
# Connect to your database
psql -h <host> -U <user> -d <database>

# Run the migration
\i ${project}-stack/packages/ai-enablement-module/db/migrations/003-add-model-summary-view-and-validation-history.sql
```

**Verification:**

```sql
-- Check view exists
SELECT * FROM ai_provider_model_summary;

-- Check history table exists
SELECT * FROM ai_model_validation_history LIMIT 1;
```

### 2. Backend Deployment

Deploy the updated Lambda function:

```bash
cd ${project}-infra
./scripts/build-lambdas.sh ai-enablement-module
terraform apply
```

**Files Modified:**

- `backend/lambdas/provider/lambda_function.py`

### 3. Frontend Integration

The frontend components are ready but need to be integrated into your providers page.

**Example Integration:**

```tsx
import { useState } from "react";
import { useModels } from "@${project}/ai-enablement-module/hooks/useModels";
import { ProviderCard } from "@${project}/ai-enablement-module/components/providers/ProviderCard";
import { ViewModelsModal } from "@${project}/ai-enablement-module/components/models/ViewModelsModal";
import { ValidationProgress } from "@${project}/ai-enablement-module/types";

function ProvidersPage() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [viewModelsOpen, setViewModelsOpen] = useState(false);
  const [validationProgress, setValidationProgress] = useState<
    Record<string, ValidationProgress>
  >({});

  const {
    models,
    validateModels,
    refetch: refetchModels,
  } = useModels(authAdapter, selectedProvider);
  const {
    providers,
    discoverModels,
    refetch: refetchProviders,
  } = useProviders(authAdapter);

  const handleValidateModels = async (providerId: string) => {
    // Initialize progress tracking
    setValidationProgress((prev) => ({
      ...prev,
      [providerId]: {
        isValidating: true,
        validated: 0,
        total: 0,
        available: 0,
        unavailable: 0,
      },
    }));

    try {
      const result = await validateModels(providerId);

      if (result) {
        // Update progress with final results
        setValidationProgress((prev) => ({
          ...prev,
          [providerId]: {
            isValidating: false,
            validated: result.validated,
            total: result.validated,
            available: result.available,
            unavailable: result.unavailable,
          },
        }));

        // Refresh provider list to update counts
        await refetchProviders();
      }
    } finally {
      // Clear progress after a delay
      setTimeout(() => {
        setValidationProgress((prev) => {
          const newState = { ...prev };
          delete newState[providerId];
          return newState;
        });
      }, 3000);
    }
  };

  const handleViewModels = async (providerId: string) => {
    setSelectedProvider(providerId);
    await refetchModels();
    setViewModelsOpen(true);
  };

  return (
    <>
      {providers.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          onValidateModels={handleValidateModels}
          onViewModels={handleViewModels}
          onDiscoverModels={discoverModels}
          validationProgress={validationProgress[provider.id]}
        />
      ))}

      <ViewModelsModal
        open={viewModelsOpen}
        onClose={() => setViewModelsOpen(false)}
        models={models}
        providerName={
          providers.find((p) => p.id === selectedProvider)?.displayName
        }
      />
    </>
  );
}
```

## Testing Guide

### Test 1: Database Migration

**Steps:**

1. Run migration script
2. Verify view and table creation
3. Check RLS policies are applied

**Expected Results:**

```sql
-- Should return provider summaries with counts
SELECT * FROM ai_provider_model_summary;

-- Should have proper indexes
\di ai_model_validation_history*
```

### Test 2: Model Discovery & Validation Flow

**Steps:**

1. Navigate to AI Enablement → Providers
2. Click "Discover Models" on a provider with credentials
3. Wait for discovery to complete
4. Verify model count chips appear (e.g., "X Discovered")
5. Click "Validate Models" button
6. Observe real-time progress bar and counts
7. Wait for validation to complete
8. Verify counts update (e.g., "X Available", "Y Unavailable")

**Expected Results:**

- Discover button disabled during discovery
- Validate button enabled only when discovered models > 0
- Progress bar shows percentage and current status
- Model counts update after validation
- "Last validated" timestamp appears

### Test 3: View Models Modal

**Steps:**

1. Click "View Models" button
2. Try searching for a model by name
3. Filter by different statuses
4. Sort by different columns
5. Verify model details display correctly

**Expected Results:**

- Search filters models in real-time
- Status filter shows counts for each status
- Sorting works for all columns
- Status badges show correct colors
- Cost information displays properly

### Test 4: Validation History Tracking

**Steps:**

1. Validate models for a provider
2. Query validation history table

**Verification:**

```sql
SELECT
  vh.*,
  m.model_id,
  p.name as provider_name
FROM ai_model_validation_history vh
JOIN ai_models m ON m.id = vh.model_id
JOIN ai_providers p ON p.id = vh.provider_id
ORDER BY vh.validated_at DESC
LIMIT 10;
```

**Expected Results:**

- One entry per validated model
- Status correctly recorded
- Latency metrics captured
- Error messages for failed validations

### Test 5: Button Enable/Disable Logic

**Test Cases:**
| Scenario | Discover Button | Validate Button | View Models Button |
|----------|----------------|-----------------|-------------------|
| No credentials | Disabled | Disabled | Disabled (0 models) |
| With credentials, 0 models | Enabled | Disabled | Disabled |
| Discovering... | Disabled | Disabled | Disabled |
| X discovered models | Enabled | Enabled | Enabled |
| Validating... | Disabled | Disabled | Enabled |
| All validated | Enabled | Disabled | Enabled |

### Test 6: Error Handling

**Test Cases:**

1. **Network Error:** Disconnect network during validation
2. **Invalid Credentials:** Use provider with bad credentials
3. **Model Failure:** Validate model that doesn't exist

**Expected Results:**

- Graceful error messages displayed
- Progress tracking stops
- Buttons re-enable appropriately
- Error logged to validation history

## Performance Considerations

### Database View Performance

- View uses indexed columns for efficient aggregation
- Consider materializing view for large deployments (>1000 providers)
- Indexes on `provider_id` and `validated_at` optimize queries

### Validation Performance

- Validates models sequentially to avoid rate limits
- Each validation test uses minimal prompt ("Test")
- Latency tracked for performance monitoring

### Frontend Performance

- Model counts cached in provider objects
- Modal uses virtualization for large model lists (consider if >1000 models)
- Search and filter operations use memoization

## Troubleshooting

### Models Not Validating

**Symptoms:** Validate button does nothing or fails silently

**Checks:**

1. Verify credentials are configured correctly
2. Check provider has "discovered" status models
3. Review Lambda logs for errors
4. Verify AWS Bedrock permissions

**Solution:**

```bash
# Check Lambda logs
aws logs tail /aws/lambda/ai-providers-function --follow

# Test provider credentials manually
aws bedrock list-foundation-models --region us-east-1
```

### Model Counts Not Updating

**Symptoms:** Counts remain at 0 or don't update after validation

**Checks:**

1. Verify database view exists
2. Check backend returns `include_model_counts=true`
3. Verify frontend transforms response correctly

**Solution:**

```sql
-- Manually check counts
SELECT
  p.name,
  COUNT(m.id) as total,
  COUNT(CASE WHEN m.status = 'available' THEN 1 END) as available
FROM ai_providers p
LEFT JOIN ai_models m ON m.provider_id = p.id
GROUP BY p.id, p.name;
```

### View Models Modal Empty

**Symptoms:** Modal opens but shows "No models"

**Checks:**

1. Verify models exist in database
2. Check API response includes models
3. Verify modal receives correct provider ID

**Solution:**

```tsx
// Add debugging
const handleViewModels = async (providerId: string) => {
  console.log("Fetching models for provider:", providerId);
  const result = await getModels(providerId);
  console.log("Models fetched:", result);
};
```

## Future Enhancements

### Planned Features

- [ ] Batch validation with concurrent requests
- [ ] Retry failed validations button
- [ ] Validation scheduling (cron jobs)
- [ ] Model performance metrics dashboard
- [ ] Cost estimation based on usage
- [ ] Model recommendation engine
- [ ] Bulk model management (enable/disable multiple)
- [ ] Export validation reports

### Performance Improvements

- [ ] Materialize database view for faster queries
- [ ] Add Redis caching for model counts
- [ ] Implement WebSocket for real-time progress
- [ ] Add pagination for large model lists

## API Reference

### Backend Endpoints

**GET `/providers?include_model_counts=true`**

```json
[
  {
    "id": "uuid",
    "name": "aws-bedrock-us-east-1",
    "provider_type": "aws_bedrock",
    "model_counts": {
      "total": 45,
      "discovered": 5,
      "testing": 0,
      "available": 38,
      "unavailable": 2
    },
    "last_validated_at": "2025-11-17T22:15:00Z"
  }
]
```

**POST `/providers/:id/validate-models`**

```json
{
  "message": "Successfully validated 5 models",
  "validated": 5,
  "available": 4,
  "unavailable": 1,
  "results": [
    {
      "model_id": "anthropic.claude-3-sonnet-20240229-v1:0",
      "status": "available",
      "latency_ms": 1234
    },
    {
      "model_id": "amazon.titan-embed-text-v1",
      "status": "unavailable",
      "error": "Model not available in region",
      "latency_ms": 456
    }
  ]
}
```

## Migration Checklist

- [ ] Run database migration
- [ ] Deploy updated backend Lambda
- [ ] Update frontend components in parent page
- [ ] Test discovery workflow
- [ ] Test validation workflow
- [ ] Test view models modal
- [ ] Verify button states
- [ ] Check error handling
- [ ] Review validation history
- [ ] Performance testing with multiple providers
- [ ] Document for team

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review Lambda logs in CloudWatch
3. Check database query performance
4. Verify frontend console for errors
5. Review validation history table for patterns

## Change Log

### Version 1.0 (2025-11-17)

- Initial implementation
- Database view and validation history
- Enhanced ProviderCard component
- ViewModelsModal component
- Real-time validation progress
- Complete UX enhancements
