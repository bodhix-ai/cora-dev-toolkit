# Optimization Run Orchestrator - Backend Logic

**Status:** 📋 DESIGN DOCUMENT - Implementation Pending

This document describes the backend orchestrator logic that will execute optimization runs. This will be implemented as a Lambda function (or set of Lambda functions) in a future sprint.

---

## Overview

The optimization orchestrator is responsible for:
1. Loading evaluated document groups (with truth keys)
2. Calling module-eval to run AI evaluations with custom prompts
3. Comparing AI results to truth keys
4. Calculating accuracy metrics (TP/TN/FP/FN)
5. Storing results and updating run status

---

## Trigger

The orchestrator is triggered when:
- **Event:** `POST /api/eval-opt/projects/:id/runs` creates a new run record
- **Status:** Run record created with `status = 'pending'`
- **Method:** SQS message (async processing) or direct Lambda invocation

---

## Main Orchestration Flow

```python
def process_optimization_run(run_id: str):
    """
    Main orchestration function for optimization runs.
    
    This function coordinates the entire optimization pipeline:
    1. Load run configuration
    2. Process each document group
    3. Calculate overall metrics
    4. Update run status
    """
    
    try:
        # Step 1: Get run and project details
        run = get_run(run_id)
        project = get_project(run['project_id'])
        
        # Validate run can be executed
        validate_run_executable(run, project)
        
        # Update status to 'running'
        update_run_status(run_id, 'running', 0)
        
        # Step 2: Get all evaluated document groups
        doc_groups = get_evaluated_document_groups(project['id'])
        
        if len(doc_groups) == 0:
            raise Exception("No evaluated samples found. Create truth keys first.")
        
        total_groups = len(doc_groups)
        
        # Step 3: Process each document group
        all_results = []
        
        for idx, doc_group in enumerate(doc_groups):
            # Calculate progress: (current / total) * 100
            progress = int((idx / total_groups) * 100)
            update_run_status(run_id, 'running', progress)
            
            try:
                # Process single document group
                results = process_document_group(
                    run_id=run_id,
                    project=project,
                    doc_group=doc_group,
                    prompt_config={
                        'system_prompt': run['system_prompt'],
                        'user_prompt_template': run['user_prompt_template'],
                        'temperature': run['temperature'],
                        'max_tokens': run['max_tokens']
                    }
                )
                
                all_results.extend(results)
                
            except Exception as e:
                # Log error but continue with other documents
                log_error(f"Error processing doc group {doc_group['id']}: {e}")
                # Store error result for this document
                store_error_result(run_id, doc_group['id'], str(e))
        
        # Step 4: Calculate overall accuracy
        overall_accuracy = calculate_overall_accuracy(all_results)
        
        # Step 5: Update run status to completed
        update_run_status(
            run_id, 
            'completed', 
            100, 
            overall_accuracy=overall_accuracy
        )
        
        return {
            'status': 'success',
            'run_id': run_id,
            'total_samples': total_groups,
            'overall_accuracy': overall_accuracy
        }
        
    except Exception as e:
        # Mark run as failed
        update_run_status(run_id, 'failed', 0, error_message=str(e))
        raise
```

---

## Document Group Processing

```python
def process_document_group(
    run_id: str,
    project: dict,
    doc_group: dict,
    prompt_config: dict
) -> list:
    """
    Process a single document group:
    1. Create workspace (or reuse project workspace)
    2. Get document from module-kb
    3. Call module-eval with custom prompt
    4. Compare AI results to truth keys
    5. Store results
    
    Returns:
        List of result records (one per criterion)
    """
    
    # Step 1: Get or create workspace for this optimization project
    workspace_id = get_or_create_workspace(project)
    
    # Step 2: Get truth keys for this document group
    truth_keys = get_truth_keys(doc_group['id'])
    
    if len(truth_keys) == 0:
        raise Exception(f"No truth keys found for document group {doc_group['id']}")
    
    # Step 3: Get document content from module-kb
    primary_doc_id = doc_group['primary_doc_id']
    
    # Document should already be in module-kb from sample upload
    # Verify it exists
    doc_exists = verify_document_exists(workspace_id, primary_doc_id)
    
    if not doc_exists:
        raise Exception(f"Document {primary_doc_id} not found in workspace {workspace_id}")
    
    # Step 4: Call module-eval to create evaluation
    eval_id = create_module_eval_evaluation(
        workspace_id=workspace_id,
        doc_ids=[primary_doc_id],
        doc_type_id=project['doc_type_id'],
        criteria_set_id=project['criteria_set_id'],
        prompt_override=prompt_config,
        name=f"Optimization Run - {doc_group['name']}"
    )
    
    # Step 5: Poll for evaluation completion
    eval_result = poll_evaluation_completion(workspace_id, eval_id)
    
    if eval_result['status'] == 'failed':
        raise Exception(f"Evaluation failed: {eval_result.get('error_message')}")
    
    # Step 6: Get evaluation results from module-eval
    eval_data = get_evaluation_results(workspace_id, eval_id)
    
    # Step 7: Compare AI results to truth keys
    results = compare_ai_to_truth_keys(
        run_id=run_id,
        doc_group_id=doc_group['id'],
        truth_keys=truth_keys,
        ai_results=eval_data['criteria_results']
    )
    
    # Step 8: Store results in database
    for result in results:
        store_run_result(result)
    
    return results
```

---

## Module-Eval Integration

### Create Evaluation

```python
def create_module_eval_evaluation(
    workspace_id: str,
    doc_ids: list,
    doc_type_id: str,
    criteria_set_id: str,
    prompt_override: dict,
    name: str
) -> str:
    """
    Call module-eval API to create evaluation.
    
    NOTE: This assumes module-eval supports prompt override.
    If not, we need to temporarily update org-level prompts.
    """
    
    # Call module-eval API
    response = call_api(
        method='POST',
        url=f'/ws/{workspace_id}/eval',
        body={
            'docIds': doc_ids,
            'docTypeId': doc_type_id,
            'criteriaSetId': criteria_set_id,
            'name': name,
            # TODO: Verify if module-eval supports prompt override
            # If not, we need a different approach (see alternatives below)
            'promptOverride': prompt_override
        }
    )
    
    return response['id']
```

**Alternative if prompt override not supported:**

```python
def create_module_eval_evaluation_with_temp_prompt(
    workspace_id: str,
    org_id: str,
    doc_ids: list,
    doc_type_id: str,
    criteria_set_id: str,
    prompt_override: dict,
    name: str
) -> str:
    """
    Alternative approach if module-eval doesn't support prompt override:
    1. Save current org-level prompts
    2. Temporarily set org-level prompts to test configuration
    3. Run evaluation
    4. Restore original org-level prompts
    
    NOTE: This approach has race condition risk if multiple runs execute concurrently.
    """
    
    # Save current org prompts
    original_prompts = get_org_prompts(org_id)
    
    try:
        # Temporarily update org prompts
        update_org_prompts(org_id, prompt_override)
        
        # Create evaluation (will use updated prompts)
        response = call_api(
            method='POST',
            url=f'/ws/{workspace_id}/eval',
            body={
                'docIds': doc_ids,
                'docTypeId': doc_type_id,
                'criteriaSetId': criteria_set_id,
                'name': name
            }
        )
        
        eval_id = response['id']
        
        # Poll for completion before restoring prompts
        poll_evaluation_completion(workspace_id, eval_id)
        
        return eval_id
        
    finally:
        # Always restore original prompts
        update_org_prompts(org_id, original_prompts)
```

### Poll Evaluation Status

```python
def poll_evaluation_completion(
    workspace_id: str,
    eval_id: str,
    max_wait_seconds: int = 600,  # 10 minutes
    poll_interval: int = 5  # 5 seconds
) -> dict:
    """
    Poll module-eval until evaluation completes.
    
    Returns:
        Evaluation status dict with status and error_message
    """
    
    start_time = time.time()
    
    while True:
        # Check if we've exceeded max wait time
        if time.time() - start_time > max_wait_seconds:
            raise Exception(f"Evaluation {eval_id} timed out after {max_wait_seconds}s")
        
        # Get status
        response = call_api(
            method='GET',
            url=f'/ws/{workspace_id}/eval/{eval_id}/status'
        )
        
        status = response['status']
        
        if status == 'completed':
            return response
        
        elif status == 'failed':
            return response
        
        elif status in ['pending', 'processing']:
            # Continue polling
            time.sleep(poll_interval)
        
        else:
            raise Exception(f"Unknown evaluation status: {status}")
```

### Get Evaluation Results

```python
def get_evaluation_results(workspace_id: str, eval_id: str) -> dict:
    """
    Get full evaluation results from module-eval.
    
    Returns:
        {
            'id': eval_id,
            'status': 'completed',
            'criteria_results': [
                {
                    'criteriaItem': { 'id': '...', ... },
                    'aiResult': {
                        'statusId': '...',
                        'confidence': 85,
                        'result': 'explanation...',
                        'citations': ['...']
                    }
                }
            ]
        }
    """
    
    response = call_api(
        method='GET',
        url=f'/ws/{workspace_id}/eval/{eval_id}'
    )
    
    return response
```

---

## AI Results Comparison

```python
def compare_ai_to_truth_keys(
    run_id: str,
    doc_group_id: str,
    truth_keys: list,
    ai_results: list
) -> list:
    """
    Compare AI evaluation results to truth keys.
    
    For each criterion:
    1. Match AI result to truth key
    2. Compare status (match/mismatch)
    3. Calculate confidence difference
    4. Classify result type (TP/TN/FP/FN)
    
    Returns:
        List of comparison results
    """
    
    # Build lookup map: criteria_item_id -> truth_key
    truth_map = {tk['criteria_item_id']: tk for tk in truth_keys}
    
    # Build lookup map: criteria_item_id -> ai_result
    ai_map = {}
    for ai_result in ai_results:
        criteria_id = ai_result['criteriaItem']['id']
        ai_map[criteria_id] = ai_result['aiResult']
    
    results = []
    
    for criteria_id, truth_key in truth_map.items():
        ai_result = ai_map.get(criteria_id)
        
        if not ai_result:
            # AI result missing (shouldn't happen)
            log_warning(f"Missing AI result for criterion {criteria_id}")
            continue
        
        # Compare status
        status_match = (ai_result['statusId'] == truth_key['truth_status_id'])
        
        # Calculate confidence difference
        confidence_diff = abs(
            ai_result.get('confidence', 0) - truth_key['truth_confidence']
        )
        
        # Classify result type (TP/TN/FP/FN)
        result_type = classify_result(
            truth_status_id=truth_key['truth_status_id'],
            ai_status_id=ai_result['statusId']
        )
        
        # Create result record
        result = {
            'run_id': run_id,
            'document_group_id': doc_group_id,
            'criteria_item_id': criteria_id,
            'truth_key_id': truth_key['id'],
            
            # AI results
            'ai_status_id': ai_result['statusId'],
            'ai_confidence': ai_result.get('confidence'),
            'ai_explanation': ai_result.get('result'),
            'ai_citations': ai_result.get('citations', []),
            
            # Comparison
            'status_match': status_match,
            'confidence_diff': confidence_diff,
            'result_type': result_type
        }
        
        results.append(result)
    
    return results
```

### Result Classification (TP/TN/FP/FN)

```python
def classify_result(truth_status_id: str, ai_status_id: str) -> str:
    """
    Classify result as true positive, true negative, false positive, or false negative.
    
    Logic:
    - Positive = "Compliant" or "Fully Compliant"
    - Negative = "Non-compliant", "Partially Compliant", "Not Applicable"
    
    Classifications:
    - TP: Truth positive, AI positive (both say compliant)
    - TN: Truth negative, AI negative (both say non-compliant)
    - FP: Truth negative, AI positive (AI says compliant but shouldn't)
    - FN: Truth positive, AI negative (AI says non-compliant but shouldn't)
    """
    
    # Get status names from database
    truth_status = get_status_name(truth_status_id)
    ai_status = get_status_name(ai_status_id)
    
    # Define positive statuses
    positive_statuses = ['compliant', 'fully compliant']
    
    # Determine if each is positive or negative
    truth_is_positive = truth_status.lower() in positive_statuses
    ai_is_positive = ai_status.lower() in positive_statuses
    
    # Classify
    if truth_is_positive and ai_is_positive:
        return 'true_positive'
    elif not truth_is_positive and not ai_is_positive:
        return 'true_negative'
    elif not truth_is_positive and ai_is_positive:
        return 'false_positive'
    elif truth_is_positive and not ai_is_positive:
        return 'false_negative'
    else:
        raise Exception(f"Unexpected classification: truth={truth_status}, ai={ai_status}")
```

---

## Metrics Calculation

```python
def calculate_overall_accuracy(results: list) -> float:
    """
    Calculate overall accuracy across all results.
    
    Accuracy = (TP + TN) / (TP + TN + FP + FN)
    
    Returns:
        Accuracy as percentage (0-100)
    """
    
    if len(results) == 0:
        return 0.0
    
    # Count matches
    correct = sum(1 for r in results if r['status_match'])
    total = len(results)
    
    accuracy = (correct / total) * 100
    return round(accuracy, 2)


def calculate_precision_recall_f1(results: list) -> dict:
    """
    Calculate precision, recall, and F1 score.
    
    Precision = TP / (TP + FP)
    Recall = TP / (TP + FN)
    F1 = 2 * (Precision * Recall) / (Precision + Recall)
    
    Returns:
        {
            'precision': float,
            'recall': float,
            'f1_score': float,
            'true_positives': int,
            'true_negatives': int,
            'false_positives': int,
            'false_negatives': int
        }
    """
    
    # Count classifications
    tp = sum(1 for r in results if r['result_type'] == 'true_positive')
    tn = sum(1 for r in results if r['result_type'] == 'true_negative')
    fp = sum(1 for r in results if r['result_type'] == 'false_positive')
    fn = sum(1 for r in results if r['result_type'] == 'false_negative')
    
    # Calculate precision
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    
    # Calculate recall
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    
    # Calculate F1
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    
    return {
        'precision': round(precision, 4),
        'recall': round(recall, 4),
        'f1_score': round(f1, 4),
        'true_positives': tp,
        'true_negatives': tn,
        'false_positives': fp,
        'false_negatives': fn
    }
```

---

## Database Operations

```python
def store_run_result(result: dict):
    """
    Store optimization run result in database.
    """
    
    insert_record('eval_opt_run_results', {
        'run_id': result['run_id'],
        'document_group_id': result['document_group_id'],
        'criteria_item_id': result['criteria_item_id'],
        'truth_key_id': result['truth_key_id'],
        'ai_status_id': result['ai_status_id'],
        'ai_confidence': result['ai_confidence'],
        'ai_explanation': result['ai_explanation'],
        'ai_citations': json.dumps(result['ai_citations']),
        'status_match': result['status_match'],
        'confidence_diff': result['confidence_diff'],
        'result_type': result['result_type']
    })


def update_run_status(
    run_id: str,
    status: str,
    progress: int,
    overall_accuracy: float = None,
    error_message: str = None
):
    """
    Update run status in database.
    """
    
    update_data = {
        'status': status,
        'progress': progress
    }
    
    if status == 'running' and progress == 0:
        update_data['started_at'] = datetime.now()
    
    if status in ['completed', 'failed']:
        update_data['completed_at'] = datetime.now()
    
    if overall_accuracy is not None:
        update_data['overall_accuracy'] = overall_accuracy
    
    if error_message is not None:
        update_data['error_message'] = error_message
    
    update_record('eval_opt_runs', {'id': run_id}, update_data)
```

---

## Error Handling

```python
def store_error_result(run_id: str, doc_group_id: str, error: str):
    """
    Store error when document group processing fails.
    
    This allows the run to continue with other documents
    even if one fails.
    """
    
    # Log error
    log_error(f"Document group {doc_group_id} failed: {error}")
    
    # Could store in a separate error table if needed
    # For now, just log it
```

---

## Implementation Notes

### Lambda Architecture

**Option 1: Single Lambda (Synchronous)**
- Single Lambda function handles entire run
- Simple but may timeout for large runs (> 15 min)
- Best for: < 20 samples

**Option 2: SQS + Lambda (Asynchronous)**
- Main Lambda creates run record and sends SQS messages
- Worker Lambda processes each document group
- Progress tracked in database
- Best for: 20+ samples

**Option 3: Step Functions (Orchestrated)**
- Step Functions orchestrate the workflow
- Better visibility and error handling
- More complex setup
- Best for: Production (future)

### Performance Considerations

- **Parallel Processing:** Process multiple document groups in parallel (with Lambda concurrency)
- **Caching:** Cache workspace/doc lookups
- **Timeout Handling:** Implement retry logic for module-eval API calls
- **Progress Updates:** Update progress every N documents (not every document)

### Testing Strategy

1. **Unit Tests:** Test classification logic, metrics calculation
2. **Integration Tests:** Test module-eval API integration (mocked)
3. **End-to-End Tests:** Full run with 1-2 sample documents

---

**Document Status:** 📋 Design Complete - Pending Implementation  
**Next Steps:** Implement as Lambda function(s) in Sprint 3+  
**Last Updated:** February 5, 2026