# AI Model Validation - Async Pattern Implementation

## Problem Summary

The AI Model Validation workflow experienced two critical issues:

1. **API Gateway Timeout**: Validation took ~33 seconds for 110+ models, but API Gateway has a hard 30-second limit
2. **No User Feedback**: Progress bar and model counts didn't update during validation, leaving users in the dark

## Solution: Async Pattern with Real-Time Progress Updates

### Architecture Overview

```
User clicks "Validate Models"
  ↓
POST /providers/:id/validate-models → Returns 202 Accepted immediately
  ↓
Lambda continues processing in background, updating progress in database
  ↓
Frontend polls GET /providers/:id/validation-status every 2 seconds
  ↓
Progress bar and counts update in real-time
  ↓
Validation completes → Frontend shows final results
```

## Implementation Details

### 1. Database Layer (NEW)

**Migration**: `004-add-validation-progress-tracking.sql`

Created `ai_model_validation_progress` table to track real-time validation state:

```sql
CREATE TABLE ai_model_validation_progress (
    id UUID PRIMARY KEY,
    provider_id UUID NOT NULL,
    total_models INTEGER NOT NULL,
    validated_count INTEGER NOT NULL,
    available_count INTEGER NOT NULL,
    unavailable_count INTEGER NOT NULL,
    current_model_id TEXT,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ
);
```

### 2. Backend Layer (MODIFIED)

**File**: `backend/lambdas/provider/lambda_function.py`

#### New Endpoints

1. **POST /providers/:id/validate-models** (Modified)
   - Returns `202 Accepted` immediately (< 1 second)
   - Initializes progress tracking in database
   - Spawns async validation via `_process_validation_async()`
   - Avoids API Gateway timeout

2. **GET /providers/:id/validation-status** (NEW)
   - Returns current validation progress
   - Polled by frontend every 2 seconds
   - Response includes:
     ```json
     {
       "status": "in_progress",
       "total": 110,
       "validated": 45,
       "available": 40,
       "unavailable": 5,
       "current_model_id": "anthropic.claude-v3-sonnet"
     }
     ```

#### Key Functions

**`handle_validate_models()`**

- Creates progress record with `status='in_progress'`
- Returns 202 immediately
- Calls `_process_validation_async()` to continue in background

**`_process_validation_async()`**

- Iterates through all models
- Tests each model with `_test_bedrock_model()`
- Updates progress after each model:
  ```python
  common.update_one(
      table='ai_model_validation_progress',
      filters={'id': progress_id},
      data={
          'validated_count': validated_count,
          'available_count': available_count,
          'unavailable_count': unavailable_count,
          'current_model_id': bedrock_model_id,
          'last_updated_at': datetime.utcnow().isoformat()
      }
  )
  ```
- Marks as `completed` when done

**`handle_get_validation_status()`**

- Retrieves latest progress record for provider
- Returns formatted progress data

### 3. Frontend Layer (MODIFIED)

#### API Client (`frontend/lib/api.ts`)

Added `getValidationStatus()` method:

```typescript
getValidationStatus: async (providerId: string) => {
  const responseData = await authenticatedClient.get(
    `/providers/${providerId}/validation-status`
  );
  return {
    success: true,
    data: {
      isValidating: responseData.status === "in_progress",
      currentModel: responseData.current_model_id,
      validated: responseData.validated,
      total: responseData.total,
      available: responseData.available,
      unavailable: responseData.unavailable,
    },
  };
};
```

#### Hooks (`frontend/hooks/useModels.ts`)

Modified `validateModels()` to support progress callback:

```typescript
const validateModels = useCallback(
  async (
    targetProviderId: string,
    onProgress?: (progress: {
      validated: number;
      total: number;
      available: number;
      unavailable: number;
      currentModel?: string;
    }) => void
  ) => {
    // Start validation (returns 202 immediately)
    const response = await api.validateModels(targetProviderId);

    if (response.success) {
      // Start polling for progress every 2 seconds
      const pollInterval = setInterval(async () => {
        const statusResponse = await api.getValidationStatus(targetProviderId);

        if (statusResponse.success) {
          const progress = statusResponse.data;

          // Update UI via callback
          if (onProgress) {
            onProgress({
              validated: progress.validated,
              total: progress.total,
              available: progress.available,
              unavailable: progress.unavailable,
              currentModel: progress.currentModel,
            });
          }

          // Stop polling when complete
          if (!progress.isValidating) {
            clearInterval(pollInterval);
            await fetchModels(); // Refresh final state
          }
        }
      }, 2000);
    }
  },
  [api, providerId, fetchModels]
);
```

#### Components (`frontend/components/providers/ProviderList.tsx`)

Updated `handleValidateModels()` to use progress callback:

```typescript
const handleValidateModels = async (providerId: string) => {
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

  await validateModels(providerId, (progress) => {
    // Update progress in real-time
    setValidationProgress((prev) => ({
      ...prev,
      [providerId]: {
        isValidating: true,
        validated: progress.validated,
        total: progress.total,
        available: progress.available,
        unavailable: progress.unavailable,
        currentModel: progress.currentModel,
      },
    }));
  });

  await refetch(); // Refresh provider counts
};
```

#### UI Component (`frontend/components/providers/ProviderCard.tsx`)

Already supports `validationProgress` prop, displays:

- Animated progress bar
- Current model being validated
- Real-time counts (validated/total, available, unavailable)

## Benefits

✅ **No Timeouts**: 202 response in <1 second, validation continues in background
✅ **Real-Time Feedback**: Progress bar and counts update every 2 seconds
✅ **User Experience**: Users see exactly what's happening during validation
✅ **Scalability**: Can validate 1000+ models without timeout issues
✅ **Reliability**: Failed validations tracked in database with error messages

## Testing Checklist

- [ ] Run database migration 004
- [ ] Deploy updated Lambda function
- [ ] Click "Validate Models" on a provider
- [ ] Verify 202 response (immediate return)
- [ ] Observe progress bar updating every 2 seconds
- [ ] Verify model counts update in real-time
- [ ] Confirm no 503 timeout errors
- [ ] Validate Claude Opus 4.1 and Sonnet 4.5 are discovered and validated
- [ ] Test with 110+ models (full validation completes in ~33 seconds)

## Future Enhancements

- Add WebSocket support for instant updates (instead of polling)
- Add notification when validation completes
- Add validation history view to see past validations
- Add ability to cancel in-progress validation
- Add retry failed models only
