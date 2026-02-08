"""
Eval Optimization Orchestrator Lambda - Automated Prompt Optimization

Handles optimization runs that automatically generate and test domain-aware prompts.
Uses RAG + LLM meta-prompting to generate prompts, tests multiple variations,
and provides recommendations for improvement.

Routes - Optimization API:
- POST   /api/workspaces/{wsId}/runs                - Start optimization run
- GET    /api/workspaces/{wsId}/runs                - List optimization runs
- GET    /api/workspaces/{wsId}/runs/{runId}        - Get run status/results
- GET    /api/workspaces/{wsId}/runs/{runId}/results - Get detailed results
- DELETE /api/workspaces/{wsId}/runs/{runId}        - Cancel/delete run

Architecture:
- RAG Pipeline: Uses existing module-kb (NO new vector infrastructure)
- Meta-Prompter: LLM generates domain-aware prompts (configurable model)
- Variation Generator: Creates 5-12 prompt variations based on thoroughness
- Comparison Engine: Compares AI results to truth keys
- Recommendation Engine: Generates actionable insights
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from decimal import Decimal

# Add the layer to path
import sys
sys.path.insert(0, '/opt/python')

import org_common as common

# Import permission functions from module layer (ADR-019c)
from eval_opt_common import (
    can_access_opt_ws,
    can_access_opt_run,
    can_manage_opt_run,
)

# Import local modules
from rag_pipeline import RAGPipeline
from meta_prompter import MetaPrompter
from variation_generator import VariationGenerator
from recommendation_engine import RecommendationEngine

# Configure logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logger = logging.getLogger()
logger.setLevel(LOG_LEVEL)

# Lambda function name for async invocation
LAMBDA_FUNCTION_NAME = os.environ.get('AWS_LAMBDA_FUNCTION_NAME', 'eval-opt-orchestrator')


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for optimization orchestrator.
    
    Routes - Optimization API:
    - POST   /api/workspaces/{wsId}/runs                - Start optimization run
    - GET    /api/workspaces/{wsId}/runs                - List optimization runs
    - GET    /api/workspaces/{wsId}/runs/{runId}        - Get run status/results
    - GET    /api/workspaces/{wsId}/runs/{runId}/results - Get detailed results
    - DELETE /api/workspaces/{wsId}/runs/{runId}        - Cancel/delete run
    """
    logger.info(f"Optimization Orchestrator event: {json.dumps(event, default=str)}")
    
    # Check if this is an async worker invocation
    if event.get('source') == 'async-optimization-worker':
        return handle_async_optimization_worker(event)
    
    try:
        # Get user info from event
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        supabase_user_id = common.get_supabase_user_id_from_external_uid(okta_uid)
        
        # Get HTTP method and path
        http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod')
        if not http_method:
            return common.bad_request_response('HTTP method not found in request')
        
        path_params = event.get('pathParameters', {}) or {}
        path = event.get('requestContext', {}).get('http', {}).get('path') or event.get('path', '')
        
        # Extract workspace ID from path
        ws_id = path_params.get('wsId')
        run_id = path_params.get('runId')
        
        # Authorization: Check workspace membership (ADR-019c)
        if ws_id:
            ws_id = common.validate_uuid(ws_id, 'wsId')
            if not can_access_opt_ws(supabase_user_id, ws_id):
                return common.forbidden_response('Access denied to this workspace')
        
        # Route to appropriate handler
        # Order matters - more specific routes first
        
        # Sections routes
        if '/sections' in path and run_id:
            if http_method == 'GET':
                return handle_get_sections(supabase_user_id, ws_id, run_id)
            elif http_method == 'PUT':
                return handle_update_sections(event, supabase_user_id, ws_id, run_id)
        
        # Truth sets routes
        elif '/truth-sets' in path and run_id:
            ts_id = path_params.get('tsId')
            if ts_id:
                if http_method == 'GET':
                    return handle_get_truth_set(supabase_user_id, ws_id, run_id, ts_id)
                elif http_method == 'PUT':
                    return handle_update_truth_set(event, supabase_user_id, ws_id, run_id, ts_id)
                elif http_method == 'DELETE':
                    return handle_delete_truth_set(supabase_user_id, ws_id, run_id, ts_id)
            else:
                if http_method == 'GET':
                    return handle_list_truth_sets(supabase_user_id, ws_id, run_id)
                elif http_method == 'POST':
                    return handle_create_truth_set(event, supabase_user_id, ws_id, run_id)
        
        # Optimize trigger route
        elif '/optimize' in path and run_id and http_method == 'POST':
            return handle_trigger_optimization(event, supabase_user_id, ws_id, run_id)
        
        # Results route
        elif '/results' in path and run_id and http_method == 'GET':
            return handle_get_detailed_results(supabase_user_id, ws_id, run_id)
        
        # Single run routes
        elif run_id and http_method == 'GET':
            return handle_get_run(supabase_user_id, ws_id, run_id)
        
        elif run_id and http_method == 'DELETE':
            return handle_delete_run(supabase_user_id, ws_id, run_id)
        
        # Runs collection routes
        elif http_method == 'POST' and not run_id:
            return handle_start_run(event, supabase_user_id, ws_id)
        
        elif http_method == 'GET' and not run_id:
            return handle_list_runs(event, supabase_user_id, ws_id)
        
        elif http_method == 'OPTIONS':
            return common.success_response({})
        
        else:
            return common.method_not_allowed_response()
    
    except KeyError as e:
        logger.error(f'KeyError: {str(e)}')
        return common.unauthorized_response(f'Missing user information: {str(e)}')
    except common.NotFoundError as e:
        return common.not_found_response(str(e))
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        logger.exception(f'Error: {str(e)}')
        return common.internal_error_response('Internal server error')


# =============================================================================
# AUTHORIZATION (ADR-019c)
# =============================================================================
# Permission functions imported from eval_opt_common layer:
# - can_access_opt_ws() - Check workspace membership
# - can_access_opt_run() - Check run access (owner or ws member)
# - can_manage_opt_run() - Check run management (owner or ws owner)


# =============================================================================
# API HANDLERS
# =============================================================================

def handle_start_run(event: Dict[str, Any], user_id: str, ws_id: str) -> Dict[str, Any]:
    """
    Create a new optimization run (does NOT start optimization).
    
    Per spec, the workflow is:
    1. Create run with doc_type_id + criteria_set_id
    2. User defines response sections on Run Details page
    3. User creates truth sets (uploads docs + manual evaluation)
    4. User triggers optimization via POST /runs/{runId}/optimize
    
    Request body:
    {
        "name": "Run name",
        "doc_type_id": "uuid",
        "criteria_set_id": "uuid"
    }
    """
    body = json.loads(event.get('body', '{}'))
    
    # Validate required fields
    name = common.validate_required(body.get('name'), 'name')
    doc_type_id = common.validate_required(body.get('doc_type_id'), 'doc_type_id')
    criteria_set_id = common.validate_required(body.get('criteria_set_id'), 'criteria_set_id')
    
    # Validate UUIDs
    doc_type_id = common.validate_uuid(doc_type_id, 'doc_type_id')
    criteria_set_id = common.validate_uuid(criteria_set_id, 'criteria_set_id')
    
    # Create run record in 'draft' status
    # User will configure response sections and truth sets before triggering optimization
    run_data = {
        'ws_id': ws_id,
        'name': name,
        'doc_type_id': doc_type_id,
        'criteria_set_id': criteria_set_id,
        'status': 'draft',
        'progress': 0,
        'created_by': user_id
    }
    
    run = common.insert_one('eval_opt_runs', run_data)
    run_id = run['id']
    
    logger.info(f"Created optimization run {run_id} for workspace {ws_id}")
    
    return common.created_response({
        'id': run_id,
        'name': name,
        'status': 'draft',
        'message': 'Optimization run created. Define response sections and add truth sets before running optimization.',
        'docTypeId': doc_type_id,
        'criteriaSetId': criteria_set_id
    })


def handle_list_runs(event: Dict[str, Any], user_id: str, ws_id: str) -> Dict[str, Any]:
    """List optimization runs for a workspace."""
    query_params = event.get('queryStringParameters', {}) or {}
    
    # Get runs for this workspace
    runs = common.find_many(
        'eval_opt_runs',
        {'ws_id': ws_id},
        order='created_at.desc',
        limit=50
    )
    
    return common.success_response(common.format_records(runs))


def handle_get_run(user_id: str, ws_id: str, run_id: str) -> Dict[str, Any]:
    """Get optimization run status and results."""
    run_id = common.validate_uuid(run_id, 'runId')
    
    # Check run access permission (ADR-019c)
    if not can_access_opt_run(user_id, run_id):
        raise common.ForbiddenError('Access denied to this optimization run')
    
    run = common.find_one('eval_opt_runs', {'id': run_id, 'ws_id': ws_id})
    if not run:
        raise common.NotFoundError(f"Optimization run {run_id} not found")
    
    # Format response
    response = {
        'id': run['id'],
        'name': run.get('name'),
        'status': run.get('status'),
        'progress': run.get('progress', 0),
        'progressMessage': run.get('progress_message'),
        'thoroughness': run.get('thoroughness'),
        'totalSamples': run.get('total_samples'),
        'docTypeId': run.get('doc_type_id'),
        'criteriaSetId': run.get('criteria_set_id'),
        'responseStructureId': run.get('response_structure_id'),
        'createdAt': run.get('created_at'),
        'startedAt': run.get('started_at'),
        'completedAt': run.get('completed_at'),
        'errorMessage': run.get('error_message')
    }
    
    # Include response sections inline
    response_structure_id = run.get('response_structure_id')
    if response_structure_id:
        structure = common.find_one('eval_opt_response_structures', {'id': response_structure_id})
        if structure:
            sections = structure.get('structure_schema', {}).get('sections', [])
            response['responseSections'] = sections
    
    # Include results if completed
    if run.get('status') == 'completed':
        response['bestVariation'] = run.get('best_variation')
        response['overallAccuracy'] = float(run.get('overall_accuracy', 0))
        response['recommendations'] = run.get('recommendations')
        response['variationSummary'] = run.get('variation_summary')
    
    return common.success_response(response)


def handle_get_detailed_results(user_id: str, ws_id: str, run_id: str) -> Dict[str, Any]:
    """Get detailed results for an optimization run."""
    run_id = common.validate_uuid(run_id, 'runId')
    
    # Check run access permission (ADR-019c)
    if not can_access_opt_run(user_id, run_id):
        raise common.ForbiddenError('Access denied to this optimization run')
    
    run = common.find_one('eval_opt_runs', {'id': run_id, 'ws_id': ws_id})
    if not run:
        raise common.NotFoundError(f"Optimization run {run_id} not found")
    
    if run.get('status') != 'completed':
        return common.bad_request_response(
            f"Run is not complete. Current status: {run.get('status')}"
        )
    
    # Get all results for this run
    results = common.find_many(
        'eval_opt_run_results',
        {'run_id': run_id}
    )
    
    # Group results by variation
    variations = {}
    for result in results:
        var_name = result.get('variation_name')
        if var_name not in variations:
            variations[var_name] = {
                'name': var_name,
                'strategy': result.get('strategy'),
                'results': [],
                'metrics': {
                    'truePositives': 0,
                    'falsePositives': 0,
                    'trueNegatives': 0,
                    'falseNegatives': 0
                }
            }
        
        variations[var_name]['results'].append({
            'docGroupId': result.get('doc_group_id'),
            'criteriaItemId': result.get('criteria_item_id'),
            'expected': result.get('truth_status'),
            'actual': result.get('ai_status'),
            'match': result.get('status_match'),
            'resultType': result.get('result_type')
        })
        
        # Accumulate metrics
        result_type = result.get('result_type', '').lower()
        if result_type == 'true_positive':
            variations[var_name]['metrics']['truePositives'] += 1
        elif result_type == 'false_positive':
            variations[var_name]['metrics']['falsePositives'] += 1
        elif result_type == 'true_negative':
            variations[var_name]['metrics']['trueNegatives'] += 1
        elif result_type == 'false_negative':
            variations[var_name]['metrics']['falseNegatives'] += 1
    
    # Calculate accuracy for each variation
    for var_name, var_data in variations.items():
        metrics = var_data['metrics']
        total = sum(metrics.values())
        correct = metrics['truePositives'] + metrics['trueNegatives']
        var_data['accuracy'] = (correct / total * 100) if total > 0 else 0
        
        # Calculate precision, recall, F1
        tp = metrics['truePositives']
        fp = metrics['falsePositives']
        fn = metrics['falseNegatives']
        
        var_data['precision'] = (tp / (tp + fp) * 100) if (tp + fp) > 0 else 0
        var_data['recall'] = (tp / (tp + fn) * 100) if (tp + fn) > 0 else 0
        
        if var_data['precision'] + var_data['recall'] > 0:
            var_data['f1Score'] = 2 * (var_data['precision'] * var_data['recall']) / (var_data['precision'] + var_data['recall'])
        else:
            var_data['f1Score'] = 0
    
    return common.success_response({
        'runId': run_id,
        'status': run.get('status'),
        'bestVariation': run.get('best_variation'),
        'overallAccuracy': float(run.get('overall_accuracy', 0)),
        'variations': list(variations.values()),
        'recommendations': run.get('recommendations'),
        'generatedPrompts': run.get('generated_prompts')
    })


def handle_delete_run(user_id: str, ws_id: str, run_id: str) -> Dict[str, Any]:
    """Delete or cancel an optimization run."""
    run_id = common.validate_uuid(run_id, 'runId')
    
    # Check run management permission (ADR-019c) - requires owner or ws owner
    if not can_manage_opt_run(user_id, run_id):
        raise common.ForbiddenError('Permission denied to delete/cancel this run')
    
    run = common.find_one('eval_opt_runs', {'id': run_id, 'ws_id': ws_id})
    if not run:
        raise common.NotFoundError(f"Optimization run {run_id} not found")
    
    # If run is in progress, mark as cancelled
    if run.get('status') in ['pending', 'processing']:
        common.update_one(
            'eval_opt_runs',
            {'id': run_id},
            {
                'status': 'cancelled',
                'completed_at': datetime.now(timezone.utc).isoformat()
            }
        )
        return common.success_response({'message': 'Run cancelled', 'id': run_id})
    
    # Delete run and results
    common.delete_many('eval_opt_run_results', {'run_id': run_id})
    common.delete_one('eval_opt_runs', {'id': run_id})
    
    return common.success_response({'message': 'Run deleted', 'id': run_id})


# =============================================================================
# RESPONSE SECTIONS HANDLERS
# =============================================================================

def handle_get_sections(user_id: str, ws_id: str, run_id: str) -> Dict[str, Any]:
    """Get response sections for an optimization run."""
    run_id = common.validate_uuid(run_id, 'runId')
    
    # Check run access
    if not can_access_opt_run(user_id, run_id):
        raise common.ForbiddenError('Access denied to this optimization run')
    
    run = common.find_one('eval_opt_runs', {'id': run_id, 'ws_id': ws_id})
    if not run:
        raise common.NotFoundError(f"Optimization run {run_id} not found")
    
    # Get response structure if exists
    response_structure_id = run.get('response_structure_id')
    if not response_structure_id:
        return common.success_response([])
    
    structure = common.find_one('eval_opt_response_structures', {'id': response_structure_id})
    if not structure:
        return common.success_response([])
    
    sections = structure.get('structure_schema', {}).get('sections', [])
    return common.success_response(sections)


def handle_update_sections(event: Dict[str, Any], user_id: str, ws_id: str, run_id: str) -> Dict[str, Any]:
    """Update response sections for an optimization run."""
    run_id = common.validate_uuid(run_id, 'runId')
    
    # Check run management permission
    if not can_manage_opt_run(user_id, run_id):
        raise common.ForbiddenError('Permission denied to update this run')
    
    run = common.find_one('eval_opt_runs', {'id': run_id, 'ws_id': ws_id})
    if not run:
        raise common.NotFoundError(f"Optimization run {run_id} not found")
    
    body = json.loads(event.get('body', '{}'))
    sections = body.get('sections', [])
    
    # Validate sections format
    for section in sections:
        if not section.get('name'):
            raise common.ValidationError('Each section must have a name')
        if section.get('type') not in ['text', 'list', 'number', 'boolean', 'object']:
            section['type'] = 'text'
    
    # Get or create response structure
    response_structure_id = run.get('response_structure_id')
    
    if response_structure_id:
        # Update existing
        common.update_one(
            'eval_opt_response_structures',
            {'id': response_structure_id},
            {
                'structure_schema': {'sections': sections},
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
        )
    else:
        # Create new (note: table uses structure_schema column, not 'name' or 'structure')
        new_structure = common.insert_one('eval_opt_response_structures', {
            'ws_id': ws_id,
            'structure_schema': {'sections': sections},
            'created_by': user_id
        })
        response_structure_id = new_structure['id']
        
        # Link to run
        common.update_one(
            'eval_opt_runs',
            {'id': run_id},
            {'response_structure_id': response_structure_id}
        )
    
    return common.success_response({
        'message': 'Sections updated',
        'sections': sections
    })


# =============================================================================
# TRUTH SETS HANDLERS
# =============================================================================

def handle_list_truth_sets(user_id: str, ws_id: str, run_id: str) -> Dict[str, Any]:
    """List truth sets for an optimization run."""
    run_id = common.validate_uuid(run_id, 'runId')
    
    if not can_access_opt_run(user_id, run_id):
        raise common.ForbiddenError('Access denied to this optimization run')
    
    # Get document groups (truth sets) linked to this run via workspace
    # Truth sets are doc_groups with evaluated truth keys
    run = common.find_one('eval_opt_runs', {'id': run_id, 'ws_id': ws_id})
    if not run:
        raise common.NotFoundError(f"Optimization run {run_id} not found")
    
    doc_groups = common.find_many(
        'eval_opt_doc_groups',
        {'ws_id': ws_id},
        order='created_at.desc'
    )
    
    # Enrich with truth key count
    result = []
    for group in doc_groups:
        truth_keys = common.find_many(
            'eval_opt_truth_keys',
            {'group_id': group['id']}
        )
        total_criteria = len(truth_keys) if truth_keys else 0
        completed_criteria = len([tk for tk in (truth_keys or []) if tk.get('truth_status_id')])
        
        result.append({
            'id': group['id'],
            'document_name': group.get('name', 'Untitled'),
            'document_id': group.get('primary_doc_id'),
            'progress_pct': int((completed_criteria / total_criteria * 100) if total_criteria > 0 else 0),
            'completed_criteria': completed_criteria,
            'total_criteria': total_criteria,
            'status': 'complete' if completed_criteria == total_criteria and total_criteria > 0 else 'incomplete',
            'created_at': group.get('created_at')
        })
    
    return common.success_response(result)


def handle_create_truth_set(event: Dict[str, Any], user_id: str, ws_id: str, run_id: str) -> Dict[str, Any]:
    """Create a new truth set (doc group) for an optimization run."""
    run_id = common.validate_uuid(run_id, 'runId')
    
    if not can_manage_opt_run(user_id, run_id):
        raise common.ForbiddenError('Permission denied to modify this run')
    
    body = json.loads(event.get('body', '{}'))
    
    name = common.validate_required(body.get('name'), 'name')
    document_id = common.validate_required(body.get('document_id'), 'document_id')
    
    # Create doc group
    doc_group = common.insert_one('eval_opt_doc_groups', {
        'ws_id': ws_id,
        'name': name,
        'primary_doc_id': document_id,
        'status': 'pending',
        'created_by': user_id
    })
    
    return common.created_response({
        'id': doc_group['id'],
        'name': name,
        'document_id': document_id,
        'message': 'Truth set created. Add criterion evaluations to complete.'
    })


def handle_get_truth_set(user_id: str, ws_id: str, run_id: str, ts_id: str) -> Dict[str, Any]:
    """Get a single truth set with its evaluations."""
    run_id = common.validate_uuid(run_id, 'runId')
    ts_id = common.validate_uuid(ts_id, 'tsId')
    
    if not can_access_opt_run(user_id, run_id):
        raise common.ForbiddenError('Access denied')
    
    doc_group = common.find_one('eval_opt_doc_groups', {'id': ts_id, 'ws_id': ws_id})
    if not doc_group:
        raise common.NotFoundError(f"Truth set {ts_id} not found")
    
    # Get truth keys
    truth_keys = common.find_many(
        'eval_opt_truth_keys',
        {'group_id': ts_id}
    )
    
    return common.success_response({
        'id': doc_group['id'],
        'name': doc_group.get('name'),
        'document_id': doc_group.get('primary_doc_id'),
        'status': doc_group.get('status'),
        'evaluations': common.format_records(truth_keys or [])
    })


def handle_update_truth_set(event: Dict[str, Any], user_id: str, ws_id: str, run_id: str, ts_id: str) -> Dict[str, Any]:
    """Update truth set evaluations."""
    run_id = common.validate_uuid(run_id, 'runId')
    ts_id = common.validate_uuid(ts_id, 'tsId')

    if not can_manage_opt_run(user_id, run_id):
        raise common.ForbiddenError('Permission denied')

    # Get run data to extract doc_type_id and criteria_set_id
    run = common.find_one('eval_opt_runs', {'id': run_id, 'ws_id': ws_id})
    if not run:
        raise common.NotFoundError(f"Optimization run {run_id} not found")
    
    doc_group = common.find_one('eval_opt_doc_groups', {'id': ts_id, 'ws_id': ws_id})
    if not doc_group:
        raise common.NotFoundError(f"Truth set {ts_id} not found")
    
    # Get criteria set to extract version
    criteria_set_id = run.get('criteria_set_id')
    doc_type_id = run.get('doc_type_id')
    
    if not criteria_set_id:
        raise common.BadRequestError("Run is missing criteria_set_id")
    if not doc_type_id:
        raise common.BadRequestError("Run is missing doc_type_id")
    
    criteria_set = common.find_one('eval_criteria_sets', {'id': criteria_set_id})
    if not criteria_set:
        raise common.NotFoundError(f"Criteria set {criteria_set_id} not found")
    
    # Convert version to integer (database column is INTEGER, not DECIMAL)
    # Use float() first to handle string "1.0", then int()
    criteria_set_version = int(float(criteria_set.get('version', 1)))

    body = json.loads(event.get('body', '{}'))
    evaluations = body.get('evaluations', [])

    # Upsert truth keys
    for eval_data in evaluations:
        criteria_item_id = eval_data.get('criteria_item_id')
        if not criteria_item_id:
            continue

        existing = common.find_one('eval_opt_truth_keys', {
            'group_id': ts_id,
            'criteria_item_id': criteria_item_id
        })
        
        # Extract section_responses (new format from frontend)
        section_responses = eval_data.get('section_responses', {})
        
        # Map new format to database fields
        # For now, map justification to truth_explanation
        truth_explanation = section_responses.get('justification', '') or section_responses.get('Justification', '')
        
        # If no justification, require at least some text
        if not truth_explanation:
            truth_explanation = 'Manual evaluation'

        truth_key_data = {
            'group_id': ts_id,
            'criteria_item_id': criteria_item_id,
            'doc_type_id': doc_type_id,
            'criteria_set_id': criteria_set_id,
            'criteria_set_version': criteria_set_version,
            'truth_status_id': eval_data.get('status_id'),  # May be None - will be handled below
            'truth_confidence': section_responses.get('score', eval_data.get('confidence')),
            'truth_explanation': truth_explanation,
            'truth_citations': json.dumps(section_responses.get('citations', [])) if section_responses.get('citations') else None,
            'evaluated_by': user_id
        }
        
        # If truth_status_id is None, use a default status (get first available status)
        if not truth_key_data['truth_status_id']:
            # Get first available status option as fallback (use find_many with limit)
            default_statuses = common.find_many('eval_sys_status_options', {}, order='score_value.asc', limit=1)
            if default_statuses and len(default_statuses) > 0:
                truth_key_data['truth_status_id'] = default_statuses[0]['id']
            else:
                raise common.BadRequestError("No status options available in system")

        if existing:
            truth_key_data['updated_by'] = user_id
            common.update_one('eval_opt_truth_keys', {'id': existing['id']}, truth_key_data)
        else:
            truth_key_data['created_by'] = user_id
            common.insert_one('eval_opt_truth_keys', truth_key_data)

    # Update doc group status if all criteria evaluated
    total_evaluated = len(evaluations)
    if total_evaluated > 0:
        common.update_one('eval_opt_doc_groups', {'id': ts_id}, {'status': 'evaluated'})

    return common.success_response({'message': 'Evaluations saved'})


def handle_delete_truth_set(user_id: str, ws_id: str, run_id: str, ts_id: str) -> Dict[str, Any]:
    """Delete a truth set."""
    run_id = common.validate_uuid(run_id, 'runId')
    ts_id = common.validate_uuid(ts_id, 'tsId')
    
    if not can_manage_opt_run(user_id, run_id):
        raise common.ForbiddenError('Permission denied')
    
    doc_group = common.find_one('eval_opt_doc_groups', {'id': ts_id, 'ws_id': ws_id})
    if not doc_group:
        raise common.NotFoundError(f"Truth set {ts_id} not found")
    
    # Delete truth keys first
    common.delete_many('eval_opt_truth_keys', {'group_id': ts_id})
    
    # Delete doc group
    common.delete_one('eval_opt_doc_groups', {'id': ts_id})
    
    return common.success_response({'message': 'Truth set deleted', 'id': ts_id})


# =============================================================================
# OPTIMIZATION TRIGGER HANDLER
# =============================================================================

def handle_trigger_optimization(event: Dict[str, Any], user_id: str, ws_id: str, run_id: str) -> Dict[str, Any]:
    """Trigger the optimization process for a run."""
    run_id = common.validate_uuid(run_id, 'runId')
    
    if not can_manage_opt_run(user_id, run_id):
        raise common.ForbiddenError('Permission denied to start optimization')
    
    run = common.find_one('eval_opt_runs', {'id': run_id, 'ws_id': ws_id})
    if not run:
        raise common.NotFoundError(f"Optimization run {run_id} not found")
    
    # Check preconditions
    if run.get('status') in ['processing', 'running']:
        return common.bad_request_response('Optimization is already in progress')
    
    # Check for response structure
    if not run.get('response_structure_id'):
        return common.bad_request_response('Define response sections before running optimization')
    
    # Check for truth sets
    doc_groups = common.find_many('eval_opt_doc_groups', {'ws_id': ws_id, 'status': 'evaluated'})
    if not doc_groups:
        return common.bad_request_response('Create at least one truth set before running optimization')
    
    # Update status to pending
    common.update_one(
        'eval_opt_runs',
        {'id': run_id},
        {
            'status': 'pending',
            'progress': 0,
            'progress_message': 'Queued for optimization...',
            'started_at': datetime.now(timezone.utc).isoformat()
        }
    )
    
    # Invoke async worker
    import boto3
    lambda_client = boto3.client('lambda')
    
    try:
        lambda_client.invoke(
            FunctionName=LAMBDA_FUNCTION_NAME,
            InvocationType='Event',  # Async
            Payload=json.dumps({
                'source': 'async-optimization-worker',
                'run_id': run_id,
                'ws_id': ws_id,
                'user_id': user_id
            })
        )
    except Exception as e:
        logger.error(f"Failed to invoke async worker: {e}")
        # Fall back to synchronous processing
        # (In production, use SQS or Step Functions)
        common.update_one(
            'eval_opt_runs',
            {'id': run_id},
            {
                'status': 'processing',
                'progress_message': 'Starting optimization...'
            }
        )
    
    return common.success_response({
        'message': 'Optimization started',
        'runId': run_id,
        'status': 'pending'
    })


# =============================================================================
# ASYNC WORKER
# =============================================================================

def handle_async_optimization_worker(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle async optimization worker invocation.
    This runs the actual optimization process in the background.
    """
    logger.info("Starting async optimization worker")
    
    try:
        run_id = event.get('run_id')
        ws_id = event.get('ws_id')
        user_id = event.get('user_id')
        
        if not all([run_id, ws_id, user_id]):
            logger.error(f"Missing required parameters: run_id={run_id}, ws_id={ws_id}, user_id={user_id}")
            return common.bad_request_response('Missing required parameters')
        
        # Get run record
        run = common.find_one('eval_opt_runs', {'id': run_id})
        if not run:
            logger.error(f"Run not found: {run_id}")
            return common.not_found_response('Run not found')
        
        # Check if run was cancelled
        if run.get('status') == 'cancelled':
            logger.info(f"Run {run_id} was cancelled, skipping")
            return common.success_response({'message': 'Run was cancelled'})
        
        # Run optimization
        process_optimization_run(
            run_id=run_id,
            ws_id=ws_id,
            user_id=user_id,
            run_config=run
        )
        
        return common.success_response({'message': 'Optimization completed'})
    
    except Exception as e:
        logger.exception(f'Error in async optimization worker: {str(e)}')
        return common.internal_error_response(f'Error: {str(e)}')


def process_optimization_run(
    run_id: str,
    ws_id: str,
    user_id: str,
    run_config: Dict[str, Any]
) -> None:
    """
    Process a complete optimization run.
    
    Pipeline:
    1. Extract domain knowledge from context docs (RAG)
    2. Generate base prompt via meta-prompter
    3. Generate prompt variations
    4. For each variation, evaluate all samples and compare to truth keys
    5. Identify best configuration
    6. Generate recommendations
    """
    try:
        # Update status
        update_run_status(run_id, 'processing', 0, 'Initializing...')
        
        # Get configuration
        thoroughness = run_config.get('thoroughness', 'balanced')
        context_doc_ids = run_config.get('context_doc_ids', [])
        response_structure_id = run_config.get('response_structure_id')
        
        # Get LLM configuration
        llm_config = get_llm_config(ws_id)
        meta_prompt_model_id = run_config.get('meta_prompt_model_id') or llm_config.get('meta_prompt_model_id')
        eval_model_id = run_config.get('eval_model_id') or llm_config.get('eval_model_id')
        
        # ============================================
        # PHASE 1: Domain Knowledge Extraction (0-10%)
        # ============================================
        update_run_status(run_id, 'processing', 5, 'Extracting domain knowledge from context documents...')
        
        rag_pipeline = RAGPipeline()
        domain_knowledge = rag_pipeline.extract_domain_knowledge(
            ws_id=ws_id,
            context_doc_ids=context_doc_ids,
            model_id=meta_prompt_model_id
        )
        
        logger.info(f"Domain knowledge extracted: {len(domain_knowledge.concepts)} concepts")
        
        # ============================================
        # PHASE 2: Prompt Generation (10-20%)
        # ============================================
        update_run_status(run_id, 'processing', 15, 'Generating domain-aware prompts...')
        
        # Get response structure
        response_structure = None
        if response_structure_id:
            rs = common.find_one('eval_opt_response_structures', {'id': response_structure_id})
            if rs:
                response_structure = rs.get('structure_schema', {})
        
        # Get criteria items from workspace (via doc groups)
        criteria_items = get_workspace_criteria(ws_id)
        
        # Generate base prompt
        meta_prompter = MetaPrompter(model_id=meta_prompt_model_id)
        base_prompt = meta_prompter.generate_base_prompt(
            domain_knowledge=domain_knowledge,
            response_structure=response_structure,
            criteria_items=criteria_items
        )
        
        logger.info(f"Base prompt generated: {len(base_prompt)} chars")
        
        # ============================================
        # PHASE 3: Variation Generation (20-25%)
        # ============================================
        update_run_status(run_id, 'processing', 22, 'Creating prompt variations...')
        
        variation_generator = VariationGenerator()
        variations = variation_generator.generate_variations(
            base_prompt=base_prompt,
            thoroughness=thoroughness
        )
        
        logger.info(f"Generated {len(variations)} prompt variations")
        
        # Save generated prompts
        common.update_one(
            'eval_opt_runs',
            {'id': run_id},
            {'generated_prompts': json.dumps([v.to_dict() for v in variations])}
        )
        
        # ============================================
        # PHASE 4: Evaluation Loop (25-85%)
        # ============================================
        # Get all sample document groups with truth keys
        doc_groups = common.find_many(
            'eval_opt_doc_groups',
            {'ws_id': ws_id, 'status': 'evaluated'}
        )
        
        if not doc_groups:
            raise OptimizationError("No evaluated samples found")
        
        total_evaluations = len(variations) * len(doc_groups)
        completed = 0
        
        variation_results = []
        
        for var_idx, variation in enumerate(variations):
            # Check if run was cancelled
            run_check = common.find_one('eval_opt_runs', {'id': run_id})
            if run_check.get('status') == 'cancelled':
                logger.info(f"Run {run_id} was cancelled, stopping")
                return
            
            var_result = {
                'variation_name': variation.name,
                'strategy': variation.strategy,
                'true_positives': 0,
                'false_positives': 0,
                'true_negatives': 0,
                'false_negatives': 0
            }
            
            for group in doc_groups:
                # Calculate progress
                progress = 25 + int((completed / total_evaluations) * 60)
                update_run_status(
                    run_id, 'processing', progress,
                    f'Testing {variation.name} on {group["name"]}...'
                )
                
                # Get truth keys for this document group
                truth_keys = common.find_many(
                    'eval_opt_truth_keys',
                    {'group_id': group['id']}
                )
                
                # Run evaluation with this variation's prompt
                ai_results = run_evaluation_with_prompt(
                    ws_id=ws_id,
                    doc_group=group,
                    variation=variation,
                    model_id=eval_model_id
                )
                
                # Compare results to truth keys
                for truth_key in truth_keys:
                    criteria_item_id = truth_key.get('criteria_item_id')
                    truth_status_id = truth_key.get('truth_status_id')
                    
                    # Find matching AI result
                    ai_result = next(
                        (r for r in ai_results if r.get('criteria_item_id') == criteria_item_id),
                        None
                    )
                    
                    ai_status_id = ai_result.get('status_id') if ai_result else None
                    status_match = (ai_status_id == truth_status_id)
                    
                    # Classify result type (simplified: match = positive, no match = negative)
                    # In production, this would be more nuanced based on status semantics
                    if status_match:
                        result_type = 'true_positive'
                        var_result['true_positives'] += 1
                    else:
                        result_type = 'false_positive'
                        var_result['false_positives'] += 1
                    
                    # Save individual result
                    common.insert_one('eval_opt_run_results', {
                        'run_id': run_id,
                        'group_id': group['id'],
                        'criteria_item_id': criteria_item_id,
                        'truth_key_id': truth_key['id'],
                        'ai_status_id': ai_status_id,
                        'status_match': status_match,
                        'result_type': result_type
                    })
                
                completed += 1
            
            # Calculate accuracy for this variation
            total = sum([
                var_result['true_positives'],
                var_result['false_positives'],
                var_result['true_negatives'],
                var_result['false_negatives']
            ])
            correct = var_result['true_positives'] + var_result['true_negatives']
            var_result['accuracy'] = (correct / total * 100) if total > 0 else 0
            
            variation_results.append(var_result)
        
        # ============================================
        # PHASE 5: Analysis & Recommendations (85-100%)
        # ============================================
        update_run_status(run_id, 'processing', 90, 'Analyzing results...')
        
        # Find best variation
        best_variation = max(variation_results, key=lambda x: x['accuracy'])
        
        # Generate recommendations
        recommendation_engine = RecommendationEngine()
        recommendations = recommendation_engine.generate(
            variation_results=variation_results,
            doc_groups=doc_groups,
            domain_knowledge=domain_knowledge
        )
        
        # ============================================
        # FINAL: Save Results
        # ============================================
        common.update_one(
            'eval_opt_runs',
            {'id': run_id},
            {
                'status': 'completed',
                'progress': 100,
                'progress_message': 'Optimization complete',
                'best_variation': best_variation['variation_name'],
                'overall_accuracy': Decimal(str(round(best_variation['accuracy'], 2))),
                'recommendations': json.dumps([r.to_dict() for r in recommendations]),
                'variation_summary': json.dumps(variation_results),
                'completed_at': datetime.now(timezone.utc).isoformat()
            }
        )
        
        logger.info(f"Optimization run {run_id} completed. Best: {best_variation['variation_name']} ({best_variation['accuracy']:.1f}%)")
    
    except OptimizationError as e:
        logger.error(f"Optimization error for run {run_id}: {e}")
        mark_run_failed(run_id, str(e))
    except Exception as e:
        logger.exception(f"Unexpected error for run {run_id}: {e}")
        mark_run_failed(run_id, f"Internal error: {str(e)}")


# =============================================================================
# EVALUATION
# =============================================================================

def run_evaluation_with_prompt(
    ws_id: str,
    doc_group: Dict[str, Any],
    variation,  # PromptVariation
    model_id: str
) -> List[Dict[str, Any]]:
    """
    Run evaluation on a document group using the specified prompt variation.
    
    Returns list of AI evaluation results.
    """
    results = []
    
    # Get document content
    primary_doc_id = doc_group.get('primary_doc_id')
    doc_content = get_document_content(primary_doc_id)
    
    if not doc_content:
        logger.warning(f"No content found for document {primary_doc_id}")
        return results
    
    # Get criteria items for this workspace
    criteria_items = get_workspace_criteria(ws_id)
    
    # Get status options
    status_options = get_status_options()
    
    # For each criteria item, run evaluation
    for criteria_item in criteria_items:
        try:
            ai_result = evaluate_single_criterion(
                doc_content=doc_content,
                criteria_item=criteria_item,
                status_options=status_options,
                variation=variation,
                model_id=model_id
            )
            results.append(ai_result)
        except Exception as e:
            logger.error(f"Error evaluating criterion {criteria_item.get('id')}: {e}")
            results.append({
                'criteria_item_id': criteria_item.get('id'),
                'status_id': None,
                'error': str(e)
            })
    
    return results


def evaluate_single_criterion(
    doc_content: str,
    criteria_item: Dict[str, Any],
    status_options: List[Dict[str, Any]],
    variation,  # PromptVariation
    model_id: str
) -> Dict[str, Any]:
    """Evaluate a single criterion against document content."""
    from meta_prompter import call_ai_for_evaluation
    
    # Build evaluation prompt using variation's system prompt
    user_prompt = f"""
{variation.user_prompt_prefix}

DOCUMENT CONTENT:
{doc_content[:30000]}

CRITERION TO EVALUATE:
ID: {criteria_item.get('criteria_id', 'N/A')}
Requirement: {criteria_item.get('requirement', '')}
Description: {criteria_item.get('description', '')}

AVAILABLE STATUS OPTIONS:
{format_status_options(status_options)}

Respond with JSON containing:
- "status": The status option name that best matches
- "confidence": Your confidence level (0-100)
- "explanation": Brief explanation
"""
    
    # Call AI
    response = call_ai_for_evaluation(
        system_prompt=variation.system_prompt,
        user_prompt=user_prompt,
        model_id=model_id,
        temperature=variation.temperature,
        max_tokens=variation.max_tokens
    )
    
    # Parse response to get status
    status_id = parse_status_from_response(response, status_options)
    
    return {
        'criteria_item_id': criteria_item.get('id'),
        'status_id': status_id,
        'response': response
    }


def format_status_options(status_options: List[Dict[str, Any]]) -> str:
    """Format status options for prompt."""
    lines = []
    for opt in status_options:
        score = opt.get('score_value', 'N/A')
        lines.append(f"- {opt['name']} (score: {score})")
    return '\n'.join(lines)


def parse_status_from_response(response: str, status_options: List[Dict[str, Any]]) -> Optional[str]:
    """Parse AI response to extract status option."""
    try:
        # Try to parse as JSON
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            parsed = json.loads(response[json_start:json_end])
            status_name = parsed.get('status', '')
            
            # Match to status option
            for opt in status_options:
                if opt['name'].lower() == status_name.lower():
                    return opt['id']
            
            # Fuzzy match
            for opt in status_options:
                if status_name.lower() in opt['name'].lower():
                    return opt['id']
    
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"Could not parse response as JSON: {e}")
    
    # Fallback: search for status name in response
    response_lower = response.lower()
    for opt in status_options:
        if opt['name'].lower() in response_lower:
            return opt['id']
    
    return None


# =============================================================================
# HELPERS
# =============================================================================

def get_llm_config(ws_id: str) -> Dict[str, Any]:
    """
    Get LLM configuration with inheritance.
    
    Priority:
    1. Workspace-level override
    2. System-level default
    3. Fallback defaults
    """
    # Try system config
    sys_config = common.find_one('eval_cfg_sys', {})
    
    if sys_config:
        return {
            'meta_prompt_provider_id': sys_config.get('meta_prompt_provider_id'),
            'meta_prompt_model_id': sys_config.get('meta_prompt_model_id'),
            'eval_provider_id': sys_config.get('eval_provider_id'),
            'eval_model_id': sys_config.get('eval_model_id'),
            'meta_prompt_temperature': float(sys_config.get('meta_prompt_temperature', 0.7)),
            'meta_prompt_max_tokens': int(sys_config.get('meta_prompt_max_tokens', 4000)),
            'eval_temperature': float(sys_config.get('eval_temperature', 0.2)),
            'eval_max_tokens': int(sys_config.get('eval_max_tokens', 2000))
        }
    
    # Fallback defaults
    return {
        'meta_prompt_provider_id': None,
        'meta_prompt_model_id': None,
        'eval_provider_id': None,
        'eval_model_id': None,
        'meta_prompt_temperature': 0.7,
        'meta_prompt_max_tokens': 4000,
        'eval_temperature': 0.2,
        'eval_max_tokens': 2000
    }


def get_workspace_criteria(ws_id: str) -> List[Dict[str, Any]]:
    """Get criteria items associated with workspace."""
    # For now, get all active criteria items
    # In production, this would be scoped to the workspace's doc type/criteria set
    criteria_items = common.find_many(
        'eval_criteria_items',
        {'is_active': True},
        order='order_index.asc',
        limit=100
    )
    return criteria_items


def get_status_options() -> List[Dict[str, Any]]:
    """Get evaluation status options."""
    # Get system status options
    status_options = common.find_many(
        'eval_sys_status_options',
        {},
        order='order_index.asc'
    )
    return status_options


def get_document_content(doc_id: str) -> Optional[str]:
    """Get document content from KB."""
    if not doc_id:
        return None
    
    doc = common.find_one('kb_docs', {'id': doc_id})
    if doc and doc.get('extracted_text'):
        return doc['extracted_text']
    
    # Try chunks
    chunks = common.find_many(
        'kb_chunks',
        {'document_id': doc_id},
        order='chunk_index.asc',
        limit=500
    )
    
    if chunks:
        return '\n\n'.join([c.get('content', '') for c in chunks if c.get('content')])
    
    return None


def update_run_status(run_id: str, status: str, progress: int, message: str = None) -> None:
    """Update optimization run status."""
    update_data = {
        'status': status,
        'progress': progress
    }
    
    if message:
        update_data['progress_message'] = message
    
    if status == 'processing' and progress == 0:
        update_data['started_at'] = datetime.now(timezone.utc).isoformat()
    
    common.update_one('eval_opt_runs', {'id': run_id}, update_data)


def mark_run_failed(run_id: str, error_message: str) -> None:
    """Mark optimization run as failed."""
    common.update_one(
        'eval_opt_runs',
        {'id': run_id},
        {
            'status': 'failed',
            'error_message': error_message[:2000],
            'completed_at': datetime.now(timezone.utc).isoformat()
        }
    )


# =============================================================================
# EXCEPTIONS
# =============================================================================

class OptimizationError(Exception):
    """Custom exception for optimization processing errors."""
    pass