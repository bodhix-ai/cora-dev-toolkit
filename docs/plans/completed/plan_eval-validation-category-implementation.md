# Evaluation validation_category Implementation

**Status**: ✅ COMPLETE (User testing pending)
**Priority**: 🔴 CRITICAL  
**Estimated Duration**: 2-3 hours  
**Created**: January 20, 2026  
**Completed**: January 20, 2026
**Parent Plan**: `plan_eval-inference-profile-fix.md`  
**Branch**: `eval-optimization`  
**Test Project**: `test-optim`  
**Test Stack**: `~/code/bodhix/testing/test-optim/ai-sec-stack`  
**Test Infra**: `~/code/bodhix/testing/test-optim/ai-sec-infra`

---

## Context

This plan continues the work started in `plan_eval-inference-profile-fix.md`. 

**What was already completed:**
- ✅ Session 1: Simple "us." prefix bandaid
- ✅ Session 2: Enhanced vendor-aware logic with `model_vendor` column
- ✅ Lambda code built and uploaded to S3
- ✅ Database migrations created and applied

**What this plan covers:**
- Terraform deployment of staged Lambda code
- Implementing proper validation_category-based model substitution
- AI error logging integration
- End-to-end testing
- Template synchronization

---

## Objective

Replace the current vendor-aware prefix logic with **proper validation_category checking** that:
1. Checks `validation_category` field BEFORE calling any provider API
2. Branches to different processing paths based on validation_category value
3. Searches database for inference profile variants when needed
4. Logs substitution events to CloudWatch
5. Is extensible for future validation categories

---

## Task Breakdown

### Task 1: Deploy Current Lambda Code (5 minutes)

**Why First:** The vendor-aware logic is already an improvement over Session 1's simple bandaid. Deploy it first so we can test progressively.

```bash
cd ~/code/bodhix/testing/test-optim/ai-sec-infra
./scripts/deploy-terraform.sh dev
```

**Verify deployment:**
```bash
AWS_PROFILE=ai-sec-nonprod aws lambda get-function-configuration \
  --function-name ai-sec-dev-eval-eval-processor \
  --query '[LastModified,CodeSize,Runtime]'
```

**Expected result:** Lambda LastModified timestamp updates, CodeSize = ~11M

---

### Task 2: Implement validation_category Logic (1-2 hours)

**File**: `templates/_modules-functional/module-eval/backend/lambdas/eval-processor/lambda_function.py`

**Location**: In `call_ai_provider()` function, after loading model from database

**Implementation:**

```python
def call_ai_provider(
    provider_id: str,
    model_id: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int
) -> Optional[str]:
    """
    Call AI provider API to generate response.
    
    Integrates with module-ai for provider management.
    Automatically handles models requiring inference profiles.
    """
    # Get provider and model from database
    provider = common.find_one('ai_providers', {'id': provider_id})
    if not provider:
        logger.error(f"AI provider not found: {provider_id}")
        return None

    model = common.find_one('ai_models', {'id': model_id})
    if not model:
        logger.error(f"AI model not found: {model_id}")
        return None

    # ===== VALIDATION CATEGORY HANDLING =====
    validation_category = model.get('validation_category')
    
    if validation_category == 'requires_inference_profile':
        base_model_id = model.get('model_id')
        model_vendor = model.get('model_vendor', 'unknown')
        
        logger.info(f"Model {base_model_id} requires inference profile, searching for substitute...")
        
        # Get appropriate region for this vendor
        region = get_inference_profile_region(model_vendor)
        
        # Search for inference profile version
        all_models = common.find_many('ai_models', {
            'provider_id': provider['id'],
            'status': 'available'
        })
        
        inference_profile_found = False
        for candidate in all_models:
            candidate_model_id = candidate.get('model_id', '')
            
            # Check if this is an inference profile for the same base model
            # Format: {region}.{base_model_id}
            expected_profile_id = f"{region}.{base_model_id}"
            
            if candidate_model_id == expected_profile_id:
                # Found exact match
                old_model_id = model.get('model_id')
                model = candidate
                new_model_id = model.get('model_id')
                logger.info(f"✅ Substituted {old_model_id} with inference profile: {new_model_id}")
                inference_profile_found = True
                break
            elif candidate_model_id.startswith(f"{region}.") and base_model_id in candidate_model_id:
                # Found regional variant (fallback)
                old_model_id = model.get('model_id')
                model = candidate
                new_model_id = model.get('model_id')
                logger.info(f"✅ Substituted {old_model_id} with inference profile: {new_model_id}")
                inference_profile_found = True
                break
        
        if not inference_profile_found:
            error_msg = f"Model {base_model_id} requires inference profile but none found in database"
            logger.error(error_msg)
            
            # Log the error for ops team
            try:
                common.log_ai_error(
                    provider_id=provider_id,
                    model_id=model_id,
                    request_source='eval-processor',
                    operation_type='text_generation',
                    error=Exception(error_msg),
                    model_id_attempted=base_model_id,
                    validation_category=validation_category
                )
            except Exception as log_err:
                logger.error(f"Failed to log error: {log_err}")
            
            return None
    
    # Future validation categories can be added here:
    # elif validation_category == 'requires_marketplace_subscription':
    #     # Handle marketplace subscription requirement
    #     pass
    
    # ===== END VALIDATION CATEGORY HANDLING =====

    # Get model_vendor for API format selection
    model_vendor = model.get('model_vendor', 'anthropic')
    
    # Route to appropriate provider
    provider_type = provider.get('provider_type', '').lower()
    
    try:
        if provider_type == 'openai':
            response = call_openai(
                api_key=provider.get('api_key'),
                model_name=model.get('model_name'),
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )
        elif provider_type == 'anthropic':
            response = call_anthropic(
                api_key=provider.get('api_key'),
                model_name=model.get('model_name'),
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )
        elif provider_type in ['bedrock', 'aws_bedrock']:
            response = call_bedrock(
                model_id=model.get('model_id'),  # Now possibly substituted
                model_vendor=model_vendor,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )
        else:
            logger.error(f"Unsupported provider type: {provider_type}")
            return None
        
        return response
        
    except Exception as e:
        # Log the error for ops team
        try:
            common.log_ai_error(
                provider_id=provider_id,
                model_id=model_id,
                request_source='eval-processor',
                operation_type='text_generation',
                error=e,
                model_id_attempted=model.get('model_id'),
                validation_category=validation_category,
                request_params={
                    'temperature': temperature,
                    'max_tokens': max_tokens
                }
            )
        except Exception as log_err:
            logger.error(f"Failed to log error: {log_err}")
        
        logger.error(f"AI API error: {e}")
        return None
```

**Key changes:**
1. ✅ Checks `validation_category` BEFORE calling provider API
2. ✅ Branches based on validation_category value (extensible)
3. ✅ Searches database for inference profile variants
4. ✅ Logs substitution events to CloudWatch
5. ✅ Wraps API calls with error logging

---

### Task 3: Update call_bedrock() (30 minutes)

**Remove the prefix logic** since validation_category now handles it:

```python
def call_bedrock(
    model_id: str,
    model_vendor: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int
) -> Optional[str]:
    """
    Call AWS Bedrock API with vendor-aware formatting.
    
    Args:
        model_id: Bedrock model ID (may already have region prefix from substitution)
        model_vendor: Model vendor for API format selection
        ...
    """
    # DON'T add region prefix here - validation_category already handled it
    bedrock_model_id = model_id
    
    # Use model_vendor for API format selection
    if model_vendor in ['anthropic', 'ai21']:
        # Anthropic/AI21 format
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [
                {"role": "user", "content": [
                    {"type": "text", "text": f"{system_prompt}\n\n{user_prompt}"}
                ]}
            ]
        })
    elif model_vendor in ['amazon', 'meta', 'mistral']:
        # Amazon Nova/Meta Llama/Mistral format
        body = json.dumps({
            "messages": [
                {"role": "user", "content": f"{system_prompt}\n\n{user_prompt}"}
            ],
            "inferenceConfig": {
                "temperature": temperature,
                "max_new_tokens": max_tokens
            }
        })
    else:
        # Fallback to Anthropic format
        logger.warning(f"Unknown vendor {model_vendor}, using Anthropic format")
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [
                {"role": "user", "content": [
                    {"type": "text", "text": f"{system_prompt}\n\n{user_prompt}"}
                ]}
            ]
        })
    
    # Call Bedrock API
    # ... rest of implementation
```

---

### Task 4: Test End-to-End (10 minutes)

1. **Sync to test project:**
   ```bash
   cd ~/code/bodhix/cora-dev-toolkit
   ./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-optim/ai-sec-stack "eval-processor/lambda_function.py"
   ```

2. **Rebuild Lambda:**
   ```bash
   cd ~/code/bodhix/testing/test-optim/ai-sec-stack/packages/module-eval/backend
   ./build.sh
   ```

3. **Deploy:**
   ```bash
   cp .build/eval-processor.zip ~/code/bodhix/testing/test-optim/ai-sec-infra/build/module-eval/
   cd ~/code/bodhix/testing/test-optim/ai-sec-infra
   ./scripts/deploy-cora-modules.sh dev
   ./scripts/deploy-terraform.sh dev
   ```

4. **Create test evaluation** using Claude Sonnet 4.5

5. **Monitor CloudWatch logs:**
   ```bash
   AWS_PROFILE=ai-sec-nonprod aws logs tail \
     /aws/lambda/ai-sec-dev-eval-eval-processor \
     --since 5m --follow
   ```

6. **Expected logs:**
   ```
   Model anthropic.claude-sonnet-4-5-20250929-v1:0 requires inference profile, searching for substitute...
   ✅ Substituted anthropic.claude-sonnet-4-5... with inference profile: us.anthropic.claude-sonnet-4-5...
   [INFO] Phase 1: Generating document summaries...
   [INFO] Phase 2: Evaluating criteria...
   [INFO] Evaluation completed successfully. Score: XX%
   ```

---

### Task 5: Sync to Templates (15 minutes)

1. **Sync eval-processor:**
   Already in template (we've been working in templates)

2. **Verify org_common has log_ai_error():**
   Check `templates/_modules-core/module-access/backend/layers/org-common/python/org_common/__init__.py`

3. **Commit changes:**
   ```bash
   cd ~/code/bodhix/cora-dev-toolkit
   git add templates/_modules-functional/module-eval/backend/lambdas/eval-processor/lambda_function.py
   git commit -m "feat(eval): Implement proper validation_category-based model substitution

   - Check validation_category BEFORE calling provider API
   - Search database for inference profile variants
   - Log substitution events to CloudWatch
   - Extensible design for future validation categories
   - Remove prefix bandaid from call_bedrock()
   
   Closes validation_category implementation requirement from plan_eval-inference-profile-fix.md"
   ```

4. **Update plan status:**
   Mark this plan as ✅ COMPLETE

---

## Success Criteria

- [x] Task 1: Current Lambda deployed via Terraform
- [x] Task 2: validation_category logic implemented
- [x] Task 3: call_bedrock() updated (prefix logic removed)
- [ ] Task 4: End-to-end test passes (delegated to user for manual testing)
  - [ ] Evaluation creates successfully
  - [ ] CloudWatch logs show substitution
  - [ ] No "on-demand throughput" errors
  - [ ] Evaluation completes with score
- [x] Task 5: Changes synced to templates

---

## Rollback Plan

If issues arise:

```bash
# Revert to Session 2 code (vendor-aware prefix)
cd ~/code/bodhix/cora-dev-toolkit
git checkout HEAD~1 templates/_modules-functional/module-eval/backend/lambdas/eval-processor/lambda_function.py

# Redeploy
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-optim/ai-sec-stack "eval-processor/lambda_function.py"
cd ~/code/bodhix/testing/test-optim/ai-sec-stack/packages/module-eval/backend && ./build.sh
# ... deploy steps
```

---

## Related Plans

1. **plan_eval-inference-profile-fix.md** (Parent) - Original problem and Session 1-2 work
2. **plan_module-ai-vendor-detection.md** - Populate model_vendor column in database
3. **plan_schema-naming-compliance-audit.md** - Database naming standard fixes

---

**Document Status:** ✅ Implementation complete - awaiting user testing
**Branch:** `eval-optimization`  
**Priority:** 🔴 CRITICAL  
**Actual Duration:** ~2 hours
**Next Steps:** User to test evaluation with Claude Sonnet 4.5 and verify CloudWatch logs
