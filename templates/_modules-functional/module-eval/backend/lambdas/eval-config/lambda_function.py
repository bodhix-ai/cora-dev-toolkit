"""
Eval Config Lambda - Configuration, Doc Types, Criteria Sets, Status Options

Handles all evaluation configuration management including system-wide defaults,
organization overrides, document types, and criteria sets with import support.

Routes - System Admin:
- GET /admin/sys/eval/config - Get sys config
- PATCH /admin/sys/eval/config - Update sys config
- GET /admin/sys/eval/status-options - List sys status options
- POST /admin/sys/eval/status-options - Create status option
- PATCH /admin/sys/eval/status-options/{id} - Update status option
- DELETE /admin/sys/eval/status-options/{id} - Delete status option
- GET /admin/sys/eval/prompts - List sys prompts
- PATCH /admin/sys/eval/prompts/{type} - Update prompt config
- POST /admin/sys/eval/prompts/{type}/test - Test prompt
- GET /admin/sys/eval/orgs - List orgs with delegation status
- PATCH /admin/sys/eval/orgs/{orgId}/delegation - Toggle delegation

Routes - Org Admin:
- GET /admin/org/eval/config - Get org config (merged with sys)
- PATCH /admin/org/eval/config - Update org config
- GET /admin/org/eval/status-options - List org status options
- POST /admin/org/eval/status-options - Create status option
- PATCH /admin/org/eval/status-options/{id} - Update status option
- DELETE /admin/org/eval/status-options/{id} - Delete status option
- GET /admin/org/eval/prompts - List org prompts (if delegated)
- PATCH /admin/org/eval/prompts/{type} - Update prompt (if delegated)
- POST /admin/org/eval/prompts/{type}/test - Test prompt (if delegated)

Routes - Doc Types:
- GET /admin/org/eval/doc-types - List doc types
- POST /admin/org/eval/doc-types - Create doc type
- PATCH /admin/org/eval/doc-types/{id} - Update doc type
- DELETE /admin/org/eval/doc-types/{id} - Delete doc type

Routes - Criteria Sets:
- GET /admin/org/eval/criteria-sets - List criteria sets
- POST /admin/org/eval/criteria-sets - Create criteria set
- GET /admin/org/eval/criteria-sets/{id} - Get criteria set with items
- PATCH /admin/org/eval/criteria-sets/{id} - Update criteria set
- DELETE /admin/org/eval/criteria-sets/{id} - Delete criteria set
- POST /admin/org/eval/criteria-sets/import - Import from spreadsheet

Routes - Criteria Items:
- GET /admin/org/eval/criteria-sets/{id}/items - List criteria items
- POST /admin/org/eval/criteria-sets/{id}/items - Add criteria item
- PATCH /admin/org/eval/criteria-items/{id} - Update criteria item
- DELETE /admin/org/eval/criteria-items/{id} - Delete criteria item
"""

import json
import logging
import os
import csv
import io
import base64
from typing import Any, Dict, List, Optional

# Add the layer to path
import sys
sys.path.insert(0, '/opt/python')

import org_common as common

# Configure logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logger = logging.getLogger()
logger.setLevel(LOG_LEVEL)

# Role constants
SYS_ADMIN_ROLES = ['sys_owner', 'sys_admin']
ORG_ADMIN_ROLES = ['org_owner', 'org_admin']


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main Lambda handler for eval configuration operations."""
    
    logger.info(f"Eval Config event: {json.dumps(event, default=str)}")
    
    try:
        # Extract user info from authorizer
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        
        # Convert Okta UID to Supabase UUID
        supabase_user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
        
        # Extract HTTP method and path
        http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod')
        if not http_method:
            return common.bad_request_response('HTTP method not found in request')
        
        path = event.get('rawPath', '') or event.get('path', '')
        path_params = event.get('pathParameters', {}) or {}
        
        # Handle OPTIONS for CORS
        if http_method == 'OPTIONS':
            return common.success_response({})
        
        # Route to appropriate handler based on path
        
        # =================================================================
        # SYSTEM ADMIN ROUTES: /admin/sys/eval/...
        # =================================================================
        if '/admin/sys/eval/' in path:
            # Verify sys admin access
            if not is_sys_admin(supabase_user_id):
                return common.forbidden_response('System admin access required')
            
            # Sys config routes
            if '/admin/sys/eval/config' in path and '/orgs' not in path:
                if http_method == 'GET':
                    return handle_get_sys_config()
                elif http_method == 'PATCH':
                    return handle_update_sys_config(event, supabase_user_id)
            
            # Sys status options routes
            elif '/admin/sys/eval/status-options' in path:
                status_id = path_params.get('statusOptionId')
                if http_method == 'GET':
                    return handle_list_sys_status_options(event)
                elif http_method == 'POST':
                    return handle_create_sys_status_option(event, supabase_user_id)
                elif http_method == 'PATCH' and status_id:
                    return handle_update_sys_status_option(event, status_id, supabase_user_id)
                elif http_method == 'DELETE' and status_id:
                    return handle_delete_sys_status_option(status_id)
            
            # Sys prompts routes
            elif '/admin/sys/eval/prompts' in path:
                prompt_type = path_params.get('type')
                if '/test' in path and http_method == 'POST':
                    return handle_test_sys_prompt(event, prompt_type, supabase_user_id)
                elif http_method == 'GET':
                    return handle_list_sys_prompts()
                elif http_method == 'PATCH' and prompt_type:
                    return handle_update_sys_prompt(event, prompt_type, supabase_user_id)
            
            # Org delegation routes
            elif '/admin/sys/eval/orgs' in path:
                org_id = path_params.get('orgId')
                if '/delegation' in path and http_method == 'PATCH':
                    return handle_toggle_delegation(event, org_id, supabase_user_id)
                elif http_method == 'GET':
                    return handle_list_orgs_delegation(event)
        
        # =================================================================
        # ORG ADMIN ROUTES: /admin/org/eval/...
        # =================================================================
        elif '/admin/org/eval/' in path:
            # Get org_id from query params or user context
            query_params = event.get('queryStringParameters', {}) or {}
            org_id = query_params.get('orgId') or user_info.get('org_id')
            
            if not org_id:
                return common.bad_request_response('orgId is required')
            
            org_id = common.validate_uuid(org_id, 'orgId')
            
            # Verify org admin access
            if not is_org_admin(supabase_user_id, org_id):
                return common.forbidden_response('Organization admin access required')
            
            # Org config routes
            if '/admin/org/eval/config' in path and '/doc-types' not in path and '/criteria' not in path:
                if http_method == 'GET':
                    return handle_get_org_config(org_id)
                elif http_method == 'PATCH':
                    return handle_update_org_config(event, org_id, supabase_user_id)
            
            # Org status options routes
            elif '/admin/org/eval/status-options' in path:
                status_id = path_params.get('statusOptionId')
                if http_method == 'GET':
                    return handle_list_org_status_options(event, org_id)
                elif http_method == 'POST':
                    return handle_create_org_status_option(event, org_id, supabase_user_id)
                elif http_method == 'PATCH' and status_id:
                    return handle_update_org_status_option(event, status_id, org_id, supabase_user_id)
                elif http_method == 'DELETE' and status_id:
                    return handle_delete_org_status_option(status_id, org_id)
            
            # Org prompts routes
            elif '/admin/org/eval/prompts' in path:
                prompt_type = path_params.get('type')
                
                # Check delegation before prompt operations
                org_config = get_or_create_org_config(org_id, supabase_user_id)
                if not org_config.get('ai_config_delegated'):
                    return common.forbidden_response('AI config is not delegated to this organization')
                
                if '/test' in path and http_method == 'POST':
                    return handle_test_org_prompt(event, prompt_type, org_id, supabase_user_id)
                elif http_method == 'GET':
                    return handle_list_org_prompts(org_id)
                elif http_method == 'PATCH' and prompt_type:
                    return handle_update_org_prompt(event, prompt_type, org_id, supabase_user_id)
            
            # Doc types routes
            elif '/admin/org/eval/doc-types' in path:
                doc_type_id = path_params.get('docTypeId')
                if http_method == 'GET':
                    if doc_type_id:
                        return handle_get_doc_type(doc_type_id, org_id)
                    return handle_list_doc_types(event, org_id)
                elif http_method == 'POST':
                    return handle_create_doc_type(event, org_id, supabase_user_id)
                elif http_method == 'PATCH' and doc_type_id:
                    return handle_update_doc_type(event, doc_type_id, org_id, supabase_user_id)
                elif http_method == 'DELETE' and doc_type_id:
                    return handle_delete_doc_type(doc_type_id, org_id, supabase_user_id)
            
            # Criteria sets routes
            elif '/admin/org/eval/criteria-sets' in path:
                criteria_set_id = path_params.get('criteriaSetId')
                
                # Import route
                if '/import' in path and http_method == 'POST':
                    return handle_import_criteria_set(event, org_id, supabase_user_id)
                
                # Items routes
                if criteria_set_id and '/items' in path:
                    if http_method == 'GET':
                        return handle_list_criteria_items(event, criteria_set_id, org_id)
                    elif http_method == 'POST':
                        return handle_add_criteria_item(event, criteria_set_id, org_id, supabase_user_id)
                
                # Criteria set CRUD
                if http_method == 'GET':
                    if criteria_set_id:
                        return handle_get_criteria_set(criteria_set_id, org_id)
                    return handle_list_criteria_sets(event, org_id)
                elif http_method == 'POST':
                    return handle_create_criteria_set(event, org_id, supabase_user_id)
                elif http_method == 'PATCH' and criteria_set_id:
                    return handle_update_criteria_set(event, criteria_set_id, org_id, supabase_user_id)
                elif http_method == 'DELETE' and criteria_set_id:
                    return handle_delete_criteria_set(criteria_set_id, org_id, supabase_user_id)
            
            # Criteria items routes (individual item operations)
            elif '/admin/org/eval/criteria-items' in path:
                item_id = path_params.get('criteriaItemId')
                if http_method == 'PATCH' and item_id:
                    return handle_update_criteria_item(event, item_id, org_id, supabase_user_id)
                elif http_method == 'DELETE' and item_id:
                    return handle_delete_criteria_item(item_id, org_id, supabase_user_id)
        
        return common.not_found_response('Route not found')
        
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
# AUTHORIZATION HELPERS
# =============================================================================

def is_sys_admin(user_id: str) -> bool:
    """Check if user has sys admin role."""
    try:
        profile = common.find_one('user_profiles', {'user_id': user_id})
        if profile:
            return profile.get('sys_role') in SYS_ADMIN_ROLES
        return False
    except Exception as e:
        logger.error(f"Error checking sys admin status: {e}")
        return False


def is_org_admin(user_id: str, org_id: str) -> bool:
    """Check if user has org admin role for the specified organization."""
    try:
        # First check if sys admin (has access to all orgs)
        if is_sys_admin(user_id):
            return True
        
        # Check org membership
        membership = common.find_one(
            'org_members',
            {'user_id': user_id, 'org_id': org_id}
        )
        if membership:
            return membership.get('org_role') in ORG_ADMIN_ROLES
        return False
    except Exception as e:
        logger.error(f"Error checking org admin status: {e}")
        return False


def get_or_create_org_config(org_id: str, user_id: str) -> Dict[str, Any]:
    """Get org config, creating if it doesn't exist."""
    config = common.find_one('eval_cfg_org', {'org_id': org_id})
    
    if not config:
        # Create default org config
        config = common.insert_one(
            'eval_cfg_org',
            {
                'org_id': org_id,
                'ai_config_delegated': False,
                'created_by': user_id,
                'updated_by': user_id
            }
        )
    
    return config


# =============================================================================
# SYSTEM CONFIG HANDLERS
# =============================================================================

def handle_get_sys_config() -> Dict[str, Any]:
    """Get platform-wide evaluation configuration."""
    # Get single row config (create if not exists)
    config = common.find_one('eval_cfg_sys', {})
    
    if not config:
        # Create default config
        config = common.insert_one(
            'eval_cfg_sys',
            {
                'categorical_mode': 'detailed',
                'show_numerical_score': True
            }
        )
    
    return common.success_response(common.format_record(config))


def handle_update_sys_config(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Update platform-wide evaluation configuration."""
    body = json.loads(event.get('body', '{}'))
    
    update_data = {'updated_by': user_id}
    
    if 'categoricalMode' in body:
        mode = body['categoricalMode']
        if mode not in ['boolean', 'detailed']:
            raise common.ValidationError('categoricalMode must be "boolean" or "detailed"')
        update_data['categorical_mode'] = mode
    
    if 'showNumericalScore' in body:
        update_data['show_numerical_score'] = bool(body['showNumericalScore'])
    
    if len(update_data) == 1:  # Only updated_by
        raise common.ValidationError('No valid fields to update')
    
    # Get existing config
    config = common.find_one('eval_cfg_sys', {})
    
    if config:
        updated = common.update_one('eval_cfg_sys', {'id': config['id']}, update_data)
    else:
        # Create new config with provided values
        update_data.setdefault('categorical_mode', 'detailed')
        update_data.setdefault('show_numerical_score', True)
        update_data['created_by'] = user_id
        updated = common.insert_one('eval_cfg_sys', update_data)
    
    return common.success_response(common.format_record(updated))


# =============================================================================
# SYSTEM STATUS OPTIONS HANDLERS
# =============================================================================

def handle_list_sys_status_options(event: Dict[str, Any]) -> Dict[str, Any]:
    """List system status options, optionally filtered by mode."""
    query_params = event.get('queryStringParameters', {}) or {}
    mode = query_params.get('mode')
    
    filters = {}
    if mode and mode in ['boolean', 'detailed', 'both']:
        filters['mode'] = mode
    
    options = common.find_many(
        'eval_sys_status_options',
        filters,
        order='order_index.asc'
    )
    
    return common.success_response([common.format_record(o) for o in options])


def handle_create_sys_status_option(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Create a new system status option."""
    body = json.loads(event.get('body', '{}'))
    
    # Validate required fields
    name = body.get('name')
    if not name:
        raise common.ValidationError('name is required')
    name = common.validate_string_length(name, 'name', max_length=50)
    
    mode = body.get('mode', 'detailed')
    if mode not in ['boolean', 'detailed', 'both']:
        raise common.ValidationError('mode must be "boolean", "detailed", or "both"')
    
    # Check for duplicate
    existing = common.find_one(
        'eval_sys_status_options',
        {'name': name, 'mode': mode}
    )
    if existing:
        raise common.ValidationError(f'Status option "{name}" already exists for mode "{mode}"')
    
    # Get max order_index for new item
    options = common.find_many('eval_sys_status_options', {'mode': mode}, order='order_index.desc', limit=1)
    max_order = options[0]['order_index'] if options else 0
    
    option_data = {
        'name': name,
        'color': body.get('color', '#9e9e9e'),
        'score_value': body.get('scoreValue'),
        'order_index': body.get('orderIndex', max_order + 1),
        'mode': mode
    }
    
    option = common.insert_one('eval_sys_status_options', option_data)
    
    return common.created_response(common.format_record(option))


def handle_update_sys_status_option(
    event: Dict[str, Any],
    status_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Update a system status option."""
    status_id = common.validate_uuid(status_id, 'id')
    
    option = common.find_one('eval_sys_status_options', {'id': status_id})
    if not option:
        raise common.NotFoundError('Status option not found')
    
    body = json.loads(event.get('body', '{}'))
    update_data = {}
    
    if 'name' in body:
        update_data['name'] = common.validate_string_length(body['name'], 'name', max_length=50)
    
    if 'color' in body:
        update_data['color'] = body['color']
    
    if 'scoreValue' in body:
        update_data['score_value'] = body['scoreValue']
    
    if 'orderIndex' in body:
        update_data['order_index'] = int(body['orderIndex'])
    
    if not update_data:
        raise common.ValidationError('No valid fields to update')
    
    updated = common.update_one('eval_sys_status_options', {'id': status_id}, update_data)
    
    return common.success_response(common.format_record(updated))


def handle_delete_sys_status_option(status_id: str) -> Dict[str, Any]:
    """Delete a system status option."""
    status_id = common.validate_uuid(status_id, 'id')
    
    option = common.find_one('eval_sys_status_options', {'id': status_id})
    if not option:
        raise common.NotFoundError('Status option not found')
    
    common.delete_one('eval_sys_status_options', {'id': status_id})
    
    return common.success_response({
        'message': 'Status option deleted',
        'id': status_id
    })


# =============================================================================
# SYSTEM PROMPTS HANDLERS
# =============================================================================

def handle_list_sys_prompts() -> Dict[str, Any]:
    """List all system prompt configurations."""
    prompts = common.find_many('eval_cfg_sys_prompts', {}, order='prompt_type.asc')
    
    return common.success_response([common.format_record(p) for p in prompts])


def handle_update_sys_prompt(
    event: Dict[str, Any],
    prompt_type: str,
    user_id: str
) -> Dict[str, Any]:
    """Update a system prompt configuration."""
    if prompt_type not in ['doc_summary', 'evaluation', 'eval_summary']:
        raise common.ValidationError('Invalid prompt type')
    
    prompt = common.find_one('eval_cfg_sys_prompts', {'prompt_type': prompt_type})
    if not prompt:
        raise common.NotFoundError(f'Prompt config not found for type: {prompt_type}')
    
    body = json.loads(event.get('body', '{}'))
    update_data = {'updated_by': user_id}
    
    if 'aiProviderId' in body:
        update_data['ai_provider_id'] = body['aiProviderId']
    
    if 'aiModelId' in body:
        update_data['ai_model_id'] = body['aiModelId']
    
    if 'systemPrompt' in body:
        update_data['system_prompt'] = body['systemPrompt']
    
    if 'userPromptTemplate' in body:
        update_data['user_prompt_template'] = body['userPromptTemplate']
    
    if 'temperature' in body:
        temp = float(body['temperature'])
        if temp < 0 or temp > 1:
            raise common.ValidationError('temperature must be between 0 and 1')
        update_data['temperature'] = temp
    
    if 'maxTokens' in body:
        update_data['max_tokens'] = int(body['maxTokens'])
    
    if len(update_data) == 1:  # Only updated_by
        raise common.ValidationError('No valid fields to update')
    
    updated = common.update_one('eval_cfg_sys_prompts', {'id': prompt['id']}, update_data)
    
    return common.success_response(common.format_record(updated))


def handle_test_sys_prompt(
    event: Dict[str, Any],
    prompt_type: str,
    user_id: str
) -> Dict[str, Any]:
    """Test a system prompt with sample data."""
    if prompt_type not in ['doc_summary', 'evaluation', 'eval_summary']:
        raise common.ValidationError('Invalid prompt type')
    
    body = json.loads(event.get('body', '{}'))
    
    # Get prompt config
    prompt = common.find_one('eval_cfg_sys_prompts', {'prompt_type': prompt_type})
    if not prompt:
        raise common.NotFoundError(f'Prompt config not found for type: {prompt_type}')
    
    # Use provided prompts or defaults
    system_prompt = body.get('systemPrompt', prompt.get('system_prompt', ''))
    user_prompt = body.get('userPromptTemplate', prompt.get('user_prompt_template', ''))
    
    # Fill in test variables
    test_vars = body.get('testVariables', {})
    for key, value in test_vars.items():
        user_prompt = user_prompt.replace(f'{{{key}}}', str(value))
    
    # TODO: Call AI provider to test prompt
    # For now, return the rendered prompts
    return common.success_response({
        'promptType': prompt_type,
        'renderedSystemPrompt': system_prompt,
        'renderedUserPrompt': user_prompt,
        'message': 'Prompt test successful (AI call not implemented yet)'
    })


# =============================================================================
# DELEGATION HANDLERS
# =============================================================================

def handle_list_orgs_delegation(event: Dict[str, Any]) -> Dict[str, Any]:
    """List all organizations with their delegation status."""
    query_params = event.get('queryStringParameters', {}) or {}
    
    limit = common.validate_integer(
        query_params.get('limit', 50),
        'limit', min_value=1, max_value=100
    )
    offset = common.validate_integer(
        query_params.get('offset', 0),
        'offset', min_value=0
    )
    
    # Get all orgs
    orgs = common.find_many('orgs', {}, order='name.asc', limit=limit, offset=offset)
    
    # Get delegation status for each org
    result = []
    for org in orgs:
        config = common.find_one('eval_cfg_org', {'org_id': org['id']})
        result.append({
            'id': org['id'],
            'name': org['name'],
            'aiConfigDelegated': config.get('ai_config_delegated', False) if config else False,
            'hasOrgConfig': config is not None
        })
    
    return common.success_response(result)


def handle_toggle_delegation(
    event: Dict[str, Any],
    org_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Toggle AI config delegation for an organization."""
    org_id = common.validate_uuid(org_id, 'orgId')
    
    # Verify org exists
    org = common.find_one('orgs', {'id': org_id})
    if not org:
        raise common.NotFoundError('Organization not found')
    
    body = json.loads(event.get('body', '{}'))
    delegated = body.get('aiConfigDelegated')
    
    if delegated is None:
        raise common.ValidationError('aiConfigDelegated is required')
    
    # Get or create org config
    config = get_or_create_org_config(org_id, user_id)
    
    # Update delegation
    updated = common.update_one(
        'eval_cfg_org',
        {'id': config['id']},
        {
            'ai_config_delegated': bool(delegated),
            'updated_by': user_id
        }
    )
    
    return common.success_response({
        'orgId': org_id,
        'orgName': org['name'],
        'aiConfigDelegated': updated['ai_config_delegated'],
        'message': f'AI config delegation {"enabled" if delegated else "disabled"} for {org["name"]}'
    })


# =============================================================================
# ORG CONFIG HANDLERS
# =============================================================================

def handle_get_org_config(org_id: str) -> Dict[str, Any]:
    """Get organization evaluation config merged with system defaults."""
    # Get system config
    sys_config = common.find_one('eval_cfg_sys', {})
    
    # Get org config
    org_config = common.find_one('eval_cfg_org', {'org_id': org_id})
    
    # Merge configs (org overrides sys where not null)
    result = {
        'orgId': org_id,
        'aiConfigDelegated': org_config.get('ai_config_delegated', False) if org_config else False,
        'categoricalMode': (
            org_config.get('categorical_mode') if org_config and org_config.get('categorical_mode')
            else sys_config.get('categorical_mode', 'detailed') if sys_config else 'detailed'
        ),
        'showNumericalScore': (
            org_config.get('show_numerical_score') if org_config and org_config.get('show_numerical_score') is not None
            else sys_config.get('show_numerical_score', True) if sys_config else True
        ),
        'isOrgOverride': {
            'categoricalMode': org_config.get('categorical_mode') is not None if org_config else False,
            'showNumericalScore': org_config.get('show_numerical_score') is not None if org_config else False
        }
    }
    
    return common.success_response(result)


def handle_update_org_config(
    event: Dict[str, Any],
    org_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Update organization evaluation configuration."""
    body = json.loads(event.get('body', '{}'))
    
    # Get or create org config
    config = get_or_create_org_config(org_id, user_id)
    
    update_data = {'updated_by': user_id}
    
    if 'categoricalMode' in body:
        mode = body['categoricalMode']
        if mode is not None and mode not in ['boolean', 'detailed']:
            raise common.ValidationError('categoricalMode must be "boolean", "detailed", or null')
        update_data['categorical_mode'] = mode
    
    if 'showNumericalScore' in body:
        score = body['showNumericalScore']
        update_data['show_numerical_score'] = bool(score) if score is not None else None
    
    if len(update_data) == 1:  # Only updated_by
        raise common.ValidationError('No valid fields to update')
    
    updated = common.update_one('eval_cfg_org', {'id': config['id']}, update_data)
    
    # Return merged config
    return handle_get_org_config(org_id)


# =============================================================================
# ORG STATUS OPTIONS HANDLERS
# =============================================================================

def handle_list_org_status_options(event: Dict[str, Any], org_id: str) -> Dict[str, Any]:
    """List organization status options."""
    query_params = event.get('queryStringParameters', {}) or {}
    mode = query_params.get('mode')
    include_inactive = query_params.get('includeInactive', 'false').lower() == 'true'
    
    filters = {'org_id': org_id}
    if mode and mode in ['boolean', 'detailed', 'both']:
        filters['mode'] = mode
    if not include_inactive:
        filters['is_active'] = True
    
    options = common.find_many(
        'eval_org_status_options',
        filters,
        order='order_index.asc'
    )
    
    return common.success_response([common.format_record(o) for o in options])


def handle_create_org_status_option(
    event: Dict[str, Any],
    org_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Create an organization status option."""
    body = json.loads(event.get('body', '{}'))
    
    name = body.get('name')
    if not name:
        raise common.ValidationError('name is required')
    name = common.validate_string_length(name, 'name', max_length=50)
    
    mode = body.get('mode', 'detailed')
    if mode not in ['boolean', 'detailed', 'both']:
        raise common.ValidationError('mode must be "boolean", "detailed", or "both"')
    
    # Check for duplicate
    existing = common.find_one(
        'eval_org_status_options',
        {'org_id': org_id, 'name': name, 'mode': mode}
    )
    if existing:
        raise common.ValidationError(f'Status option "{name}" already exists for mode "{mode}"')
    
    # Get max order_index
    options = common.find_many(
        'eval_org_status_options',
        {'org_id': org_id, 'mode': mode},
        order='order_index.desc',
        limit=1
    )
    max_order = options[0]['order_index'] if options else 0
    
    option_data = {
        'org_id': org_id,
        'name': name,
        'color': body.get('color', '#9e9e9e'),
        'score_value': body.get('scoreValue'),
        'order_index': body.get('orderIndex', max_order + 1),
        'mode': mode,
        'is_active': True,
        'created_by': user_id,
        'updated_by': user_id
    }
    
    option = common.insert_one('eval_org_status_options', option_data)
    
    return common.created_response(common.format_record(option))


def handle_update_org_status_option(
    event: Dict[str, Any],
    status_id: str,
    org_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Update an organization status option."""
    status_id = common.validate_uuid(status_id, 'id')
    
    option = common.find_one('eval_org_status_options', {'id': status_id, 'org_id': org_id})
    if not option:
        raise common.NotFoundError('Status option not found')
    
    body = json.loads(event.get('body', '{}'))
    update_data = {'updated_by': user_id}
    
    if 'name' in body:
        update_data['name'] = common.validate_string_length(body['name'], 'name', max_length=50)
    
    if 'color' in body:
        update_data['color'] = body['color']
    
    if 'scoreValue' in body:
        update_data['score_value'] = body['scoreValue']
    
    if 'orderIndex' in body:
        update_data['order_index'] = int(body['orderIndex'])
    
    if 'isActive' in body:
        update_data['is_active'] = bool(body['isActive'])
    
    if len(update_data) == 1:  # Only updated_by
        raise common.ValidationError('No valid fields to update')
    
    updated = common.update_one('eval_org_status_options', {'id': status_id}, update_data)
    
    return common.success_response(common.format_record(updated))


def handle_delete_org_status_option(status_id: str, org_id: str) -> Dict[str, Any]:
    """Soft delete an organization status option."""
    status_id = common.validate_uuid(status_id, 'id')
    
    option = common.find_one('eval_org_status_options', {'id': status_id, 'org_id': org_id})
    if not option:
        raise common.NotFoundError('Status option not found')
    
    # Soft delete
    common.update_one('eval_org_status_options', {'id': status_id}, {'is_active': False})
    
    return common.success_response({
        'message': 'Status option deleted',
        'id': status_id
    })


# =============================================================================
# ORG PROMPTS HANDLERS
# =============================================================================

def handle_list_org_prompts(org_id: str) -> Dict[str, Any]:
    """List organization prompt configurations (with sys defaults)."""
    # Get sys prompts as base
    sys_prompts = common.find_many('eval_cfg_sys_prompts', {})
    
    # Get org overrides
    org_prompts = common.find_many('eval_cfg_org_prompts', {'org_id': org_id})
    org_prompt_map = {p['prompt_type']: p for p in org_prompts}
    
    result = []
    for sys_prompt in sys_prompts:
        prompt_type = sys_prompt['prompt_type']
        org_prompt = org_prompt_map.get(prompt_type)
        
        # Merge prompts
        merged = {
            'promptType': prompt_type,
            'aiProviderId': (org_prompt.get('ai_provider_id') if org_prompt else None) or sys_prompt.get('ai_provider_id'),
            'aiModelId': (org_prompt.get('ai_model_id') if org_prompt else None) or sys_prompt.get('ai_model_id'),
            'systemPrompt': (org_prompt.get('system_prompt') if org_prompt else None) or sys_prompt.get('system_prompt'),
            'userPromptTemplate': (org_prompt.get('user_prompt_template') if org_prompt else None) or sys_prompt.get('user_prompt_template'),
            'temperature': float((org_prompt.get('temperature') if org_prompt else None) or sys_prompt.get('temperature', 0.3)),
            'maxTokens': int((org_prompt.get('max_tokens') if org_prompt else None) or sys_prompt.get('max_tokens', 2000)),
            'hasOrgOverride': org_prompt is not None
        }
        result.append(merged)
    
    return common.success_response(result)


def handle_update_org_prompt(
    event: Dict[str, Any],
    prompt_type: str,
    org_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Update an organization prompt configuration."""
    if prompt_type not in ['doc_summary', 'evaluation', 'eval_summary']:
        raise common.ValidationError('Invalid prompt type')
    
    body = json.loads(event.get('body', '{}'))
    
    # Check if org prompt exists
    org_prompt = common.find_one(
        'eval_cfg_org_prompts',
        {'org_id': org_id, 'prompt_type': prompt_type}
    )
    
    update_data = {
        'org_id': org_id,
        'prompt_type': prompt_type,
        'updated_by': user_id
    }
    
    if 'aiProviderId' in body:
        update_data['ai_provider_id'] = body['aiProviderId']
    
    if 'aiModelId' in body:
        update_data['ai_model_id'] = body['aiModelId']
    
    if 'systemPrompt' in body:
        update_data['system_prompt'] = body['systemPrompt']
    
    if 'userPromptTemplate' in body:
        update_data['user_prompt_template'] = body['userPromptTemplate']
    
    if 'temperature' in body:
        temp = float(body['temperature'])
        if temp < 0 or temp > 1:
            raise common.ValidationError('temperature must be between 0 and 1')
        update_data['temperature'] = temp
    
    if 'maxTokens' in body:
        update_data['max_tokens'] = int(body['maxTokens'])
    
    if org_prompt:
        updated = common.update_one('eval_cfg_org_prompts', {'id': org_prompt['id']}, update_data)
    else:
        update_data['created_by'] = user_id
        updated = common.insert_one('eval_cfg_org_prompts', update_data)
    
    return common.success_response(common.format_record(updated))


def handle_test_org_prompt(
    event: Dict[str, Any],
    prompt_type: str,
    org_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Test an organization prompt with sample data."""
    if prompt_type not in ['doc_summary', 'evaluation', 'eval_summary']:
        raise common.ValidationError('Invalid prompt type')
    
    body = json.loads(event.get('body', '{}'))
    
    # Get merged prompt config
    sys_prompt = common.find_one('eval_cfg_sys_prompts', {'prompt_type': prompt_type})
    org_prompt = common.find_one('eval_cfg_org_prompts', {'org_id': org_id, 'prompt_type': prompt_type})
    
    # Use provided or merged prompts
    system_prompt = body.get('systemPrompt') or (
        org_prompt.get('system_prompt') if org_prompt else None
    ) or (sys_prompt.get('system_prompt') if sys_prompt else '')
    
    user_prompt = body.get('userPromptTemplate') or (
        org_prompt.get('user_prompt_template') if org_prompt else None
    ) or (sys_prompt.get('user_prompt_template') if sys_prompt else '')
    
    # Fill in test variables
    test_vars = body.get('testVariables', {})
    for key, value in test_vars.items():
        user_prompt = user_prompt.replace(f'{{{key}}}', str(value))
    
    return common.success_response({
        'promptType': prompt_type,
        'renderedSystemPrompt': system_prompt,
        'renderedUserPrompt': user_prompt,
        'message': 'Prompt test successful (AI call not implemented yet)'
    })


# =============================================================================
# DOC TYPES HANDLERS
# =============================================================================

def handle_list_doc_types(event: Dict[str, Any], org_id: str) -> Dict[str, Any]:
    """List document types for an organization."""
    query_params = event.get('queryStringParameters', {}) or {}
    include_inactive = query_params.get('includeInactive', 'false').lower() == 'true'
    
    filters = {'org_id': org_id}
    if not include_inactive:
        filters['is_active'] = True
    
    doc_types = common.find_many('eval_doc_types', filters, order='name.asc')
    
    # Get criteria set counts for each doc type
    result = []
    for dt in doc_types:
        criteria_sets = common.find_many(
            'eval_criteria_sets',
            {'doc_type_id': dt['id'], 'is_active': True},
            select='id'
        )
        
        formatted = common.format_record(dt)
        formatted['criteriaSetsCount'] = len(criteria_sets)
        result.append(formatted)
    
    return common.success_response(result)


def handle_get_doc_type(doc_type_id: str, org_id: str) -> Dict[str, Any]:
    """Get a single document type with criteria sets."""
    doc_type_id = common.validate_uuid(doc_type_id, 'id')
    
    doc_type = common.find_one('eval_doc_types', {'id': doc_type_id, 'org_id': org_id})
    if not doc_type:
        raise common.NotFoundError('Document type not found')
    
    # Get criteria sets
    criteria_sets = common.find_many(
        'eval_criteria_sets',
        {'doc_type_id': doc_type_id, 'is_active': True},
        order='name.asc'
    )
    
    result = common.format_record(doc_type)
    result['criteriaSets'] = [common.format_record(cs) for cs in criteria_sets]
    
    return common.success_response(result)


def handle_create_doc_type(
    event: Dict[str, Any],
    org_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Create a new document type."""
    body = json.loads(event.get('body', '{}'))
    
    name = body.get('name')
    if not name:
        raise common.ValidationError('name is required')
    name = common.validate_string_length(name, 'name', max_length=100)
    
    # Check for duplicate
    existing = common.find_one('eval_doc_types', {'org_id': org_id, 'name': name})
    if existing:
        raise common.ValidationError(f'Document type "{name}" already exists')
    
    doc_type_data = {
        'org_id': org_id,
        'name': name,
        'description': body.get('description'),
        'is_active': True,
        'created_by': user_id,
        'updated_by': user_id
    }
    
    doc_type = common.insert_one('eval_doc_types', doc_type_data)
    
    return common.created_response(common.format_record(doc_type))


def handle_update_doc_type(
    event: Dict[str, Any],
    doc_type_id: str,
    org_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Update a document type."""
    doc_type_id = common.validate_uuid(doc_type_id, 'id')
    
    doc_type = common.find_one('eval_doc_types', {'id': doc_type_id, 'org_id': org_id})
    if not doc_type:
        raise common.NotFoundError('Document type not found')
    
    body = json.loads(event.get('body', '{}'))
    update_data = {'updated_by': user_id}
    
    if 'name' in body:
        name = common.validate_string_length(body['name'], 'name', max_length=100)
        # Check for duplicate
        existing = common.find_one('eval_doc_types', {'org_id': org_id, 'name': name})
        if existing and existing['id'] != doc_type_id:
            raise common.ValidationError(f'Document type "{name}" already exists')
        update_data['name'] = name
    
    if 'description' in body:
        update_data['description'] = body['description']
    
    if 'isActive' in body:
        update_data['is_active'] = bool(body['isActive'])
    
    if len(update_data) == 1:  # Only updated_by
        raise common.ValidationError('No valid fields to update')
    
    updated = common.update_one('eval_doc_types', {'id': doc_type_id}, update_data)
    
    return common.success_response(common.format_record(updated))


def handle_delete_doc_type(doc_type_id: str, org_id: str, user_id: str) -> Dict[str, Any]:
    """Soft delete a document type."""
    doc_type_id = common.validate_uuid(doc_type_id, 'id')
    
    doc_type = common.find_one('eval_doc_types', {'id': doc_type_id, 'org_id': org_id})
    if not doc_type:
        raise common.NotFoundError('Document type not found')
    
    # Soft delete
    common.update_one(
        'eval_doc_types',
        {'id': doc_type_id},
        {'is_active': False, 'updated_by': user_id}
    )
    
    return common.success_response({
        'message': 'Document type deleted',
        'id': doc_type_id
    })


# =============================================================================
# CRITERIA SETS HANDLERS
# =============================================================================

def handle_list_criteria_sets(event: Dict[str, Any], org_id: str) -> Dict[str, Any]:
    """List criteria sets for an organization."""
    query_params = event.get('queryStringParameters', {}) or {}
    doc_type_id = query_params.get('docTypeId')
    include_inactive = query_params.get('includeInactive', 'false').lower() == 'true'
    
    # Build query via doc type
    if doc_type_id:
        doc_type_id = common.validate_uuid(doc_type_id, 'docTypeId')
        # Verify doc type belongs to org
        doc_type = common.find_one('eval_doc_types', {'id': doc_type_id, 'org_id': org_id})
        if not doc_type:
            raise common.NotFoundError('Document type not found')
        
        filters = {'doc_type_id': doc_type_id}
    else:
        # Get all doc types for org, then all criteria sets
        doc_types = common.find_many('eval_doc_types', {'org_id': org_id}, select='id')
        doc_type_ids = [dt['id'] for dt in doc_types]
        
        if not doc_type_ids:
            return common.success_response([])
        
        # Need to query by multiple doc type IDs
        # For now, query all and filter
        all_sets = []
        for dt_id in doc_type_ids:
            sets = common.find_many(
                'eval_criteria_sets',
                {'doc_type_id': dt_id},
                order='name.asc'
            )
            all_sets.extend(sets)
        
        if not include_inactive:
            all_sets = [s for s in all_sets if s.get('is_active', True)]
        
        # Get item counts
        result = []
        for cs in all_sets:
            items = common.find_many(
                'eval_criteria_items',
                {'criteria_set_id': cs['id'], 'is_active': True},
                select='id'
            )
            formatted = common.format_record(cs)
            formatted['itemCount'] = len(items)
            result.append(formatted)
        
        return common.success_response(result)
    
    if not include_inactive:
        filters['is_active'] = True
    
    criteria_sets = common.find_many('eval_criteria_sets', filters, order='name.asc')
    
    # Get item counts
    result = []
    for cs in criteria_sets:
        items = common.find_many(
            'eval_criteria_items',
            {'criteria_set_id': cs['id'], 'is_active': True},
            select='id'
        )
        formatted = common.format_record(cs)
        formatted['itemCount'] = len(items)
        result.append(formatted)
    
    return common.success_response(result)


def handle_get_criteria_set(criteria_set_id: str, org_id: str) -> Dict[str, Any]:
    """Get a criteria set with all items."""
    criteria_set_id = common.validate_uuid(criteria_set_id, 'id')
    
    criteria_set = common.find_one('eval_criteria_sets', {'id': criteria_set_id})
    if not criteria_set:
        raise common.NotFoundError('Criteria set not found')
    
    # Verify org ownership via doc type
    doc_type = common.find_one('eval_doc_types', {'id': criteria_set['doc_type_id']})
    if not doc_type or doc_type['org_id'] != org_id:
        raise common.NotFoundError('Criteria set not found')
    
    # Get items
    items = common.find_many(
        'eval_criteria_items',
        {'criteria_set_id': criteria_set_id},
        order='order_index.asc'
    )
    
    result = common.format_record(criteria_set)
    result['items'] = [common.format_record(i) for i in items]
    result['docType'] = common.format_record(doc_type)
    
    return common.success_response(result)


def handle_create_criteria_set(
    event: Dict[str, Any],
    org_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Create a new criteria set."""
    body = json.loads(event.get('body', '{}'))
    
    doc_type_id = body.get('docTypeId')
    if not doc_type_id:
        raise common.ValidationError('docTypeId is required')
    doc_type_id = common.validate_uuid(doc_type_id, 'docTypeId')
    
    # Verify doc type belongs to org
    doc_type = common.find_one('eval_doc_types', {'id': doc_type_id, 'org_id': org_id})
    if not doc_type:
        raise common.NotFoundError('Document type not found')
    
    name = body.get('name')
    if not name:
        raise common.ValidationError('name is required')
    name = common.validate_string_length(name, 'name', max_length=100)
    
    version = body.get('version', '1.0')
    
    # Check for duplicate
    existing = common.find_one(
        'eval_criteria_sets',
        {'doc_type_id': doc_type_id, 'name': name, 'version': version}
    )
    if existing:
        raise common.ValidationError(f'Criteria set "{name}" version "{version}" already exists')
    
    criteria_set_data = {
        'doc_type_id': doc_type_id,
        'name': name,
        'description': body.get('description'),
        'version': version,
        'use_weighted_scoring': body.get('useWeightedScoring', False),
        'is_active': True,
        'created_by': user_id,
        'updated_by': user_id
    }
    
    criteria_set = common.insert_one('eval_criteria_sets', criteria_set_data)
    
    return common.created_response(common.format_record(criteria_set))


def handle_update_criteria_set(
    event: Dict[str, Any],
    criteria_set_id: str,
    org_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Update a criteria set."""
    criteria_set_id = common.validate_uuid(criteria_set_id, 'id')
    
    criteria_set = common.find_one('eval_criteria_sets', {'id': criteria_set_id})
    if not criteria_set:
        raise common.NotFoundError('Criteria set not found')
    
    # Verify org ownership
    doc_type = common.find_one('eval_doc_types', {'id': criteria_set['doc_type_id']})
    if not doc_type or doc_type['org_id'] != org_id:
        raise common.NotFoundError('Criteria set not found')
    
    body = json.loads(event.get('body', '{}'))
    update_data = {'updated_by': user_id}
    
    if 'name' in body:
        update_data['name'] = common.validate_string_length(body['name'], 'name', max_length=100)
    
    if 'description' in body:
        update_data['description'] = body['description']
    
    if 'version' in body:
        update_data['version'] = body['version']
    
    if 'useWeightedScoring' in body:
        update_data['use_weighted_scoring'] = bool(body['useWeightedScoring'])
    
    if 'isActive' in body:
        update_data['is_active'] = bool(body['isActive'])
    
    if len(update_data) == 1:  # Only updated_by
        raise common.ValidationError('No valid fields to update')
    
    updated = common.update_one('eval_criteria_sets', {'id': criteria_set_id}, update_data)
    
    return common.success_response(common.format_record(updated))


def handle_delete_criteria_set(criteria_set_id: str, org_id: str, user_id: str) -> Dict[str, Any]:
    """Soft delete a criteria set."""
    criteria_set_id = common.validate_uuid(criteria_set_id, 'id')
    
    criteria_set = common.find_one('eval_criteria_sets', {'id': criteria_set_id})
    if not criteria_set:
        raise common.NotFoundError('Criteria set not found')
    
    # Verify org ownership
    doc_type = common.find_one('eval_doc_types', {'id': criteria_set['doc_type_id']})
    if not doc_type or doc_type['org_id'] != org_id:
        raise common.NotFoundError('Criteria set not found')
    
    # Soft delete
    common.update_one(
        'eval_criteria_sets',
        {'id': criteria_set_id},
        {'is_active': False, 'updated_by': user_id}
    )
    
    return common.success_response({
        'message': 'Criteria set deleted',
        'id': criteria_set_id
    })


# =============================================================================
# CRITERIA IMPORT HANDLER
# =============================================================================

def handle_import_criteria_set(
    event: Dict[str, Any],
    org_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Import criteria from CSV/XLSX file."""
    body = json.loads(event.get('body', '{}'))
    
    doc_type_id = body.get('docTypeId')
    if not doc_type_id:
        raise common.ValidationError('docTypeId is required')
    doc_type_id = common.validate_uuid(doc_type_id, 'docTypeId')
    
    # Verify doc type belongs to org
    doc_type = common.find_one('eval_doc_types', {'id': doc_type_id, 'org_id': org_id})
    if not doc_type:
        raise common.NotFoundError('Document type not found')
    
    name = body.get('name')
    if not name:
        raise common.ValidationError('name is required')
    
    file_content = body.get('fileContent')
    file_name = body.get('fileName', 'import.csv')
    file_type = body.get('fileType', 'csv')
    
    if not file_content:
        raise common.ValidationError('fileContent is required (base64 encoded)')
    
    try:
        # Decode base64 content
        decoded_content = base64.b64decode(file_content)
        
        # Parse file based on type
        if file_type.lower() == 'csv':
            items = parse_csv_criteria(decoded_content.decode('utf-8'))
        elif file_type.lower() in ['xlsx', 'xls']:
            items = parse_xlsx_criteria(decoded_content)
        else:
            raise common.ValidationError(f'Unsupported file type: {file_type}')
        
    except UnicodeDecodeError:
        raise common.ValidationError('Unable to decode file content. Ensure it is valid UTF-8.')
    except Exception as e:
        logger.exception(f'Error parsing import file: {e}')
        raise common.ValidationError(f'Error parsing file: {str(e)}')
    
    if not items:
        raise common.ValidationError('No valid criteria items found in file')
    
    # Create criteria set
    version = body.get('version', '1.0')
    
    # Check for duplicate
    existing = common.find_one(
        'eval_criteria_sets',
        {'doc_type_id': doc_type_id, 'name': name, 'version': version}
    )
    if existing:
        raise common.ValidationError(f'Criteria set "{name}" version "{version}" already exists')
    
    criteria_set_data = {
        'doc_type_id': doc_type_id,
        'name': name,
        'description': body.get('description'),
        'version': version,
        'use_weighted_scoring': body.get('useWeightedScoring', False),
        'source_file_name': file_name,
        'is_active': True,
        'created_by': user_id,
        'updated_by': user_id
    }
    
    criteria_set = common.insert_one('eval_criteria_sets', criteria_set_data)
    
    # Insert criteria items
    success_count = 0
    errors = []
    
    for idx, item in enumerate(items):
        try:
            item_data = {
                'criteria_set_id': criteria_set['id'],
                'criteria_id': item['criteria_id'],
                'requirement': item['requirement'],
                'description': item.get('description'),
                'category': item.get('category'),
                'weight': float(item.get('weight', 1.0)),
                'order_index': idx,
                'is_active': True
            }
            common.insert_one('eval_criteria_items', item_data)
            success_count += 1
        except Exception as e:
            errors.append({
                'row': idx + 2,  # +2 for header row and 0-index
                'criteriaId': item.get('criteria_id'),
                'error': str(e)
            })
    
    result = {
        'criteriaSetId': criteria_set['id'],
        'name': name,
        'version': version,
        'totalRows': len(items),
        'successCount': success_count,
        'errorCount': len(errors),
        'errors': errors[:10]  # Return first 10 errors
    }
    
    return common.created_response(result)


def parse_csv_criteria(content: str) -> List[Dict[str, Any]]:
    """Parse CSV content into criteria items."""
    items = []
    
    reader = csv.DictReader(io.StringIO(content))
    
    # Normalize column names
    fieldnames = reader.fieldnames or []
    column_map = {}
    for field in fieldnames:
        normalized = field.lower().strip().replace(' ', '_')
        if normalized in ['criteria_id', 'criteriaid', 'id']:
            column_map[field] = 'criteria_id'
        elif normalized in ['requirement', 'req']:
            column_map[field] = 'requirement'
        elif normalized in ['description', 'desc']:
            column_map[field] = 'description'
        elif normalized in ['category', 'cat']:
            column_map[field] = 'category'
        elif normalized in ['weight', 'wt']:
            column_map[field] = 'weight'
    
    for row in reader:
        item = {}
        for original_col, normalized_col in column_map.items():
            item[normalized_col] = row.get(original_col, '').strip()
        
        # Validate required fields
        if item.get('criteria_id') and item.get('requirement'):
            items.append(item)
    
    return items


def parse_xlsx_criteria(content: bytes) -> List[Dict[str, Any]]:
    """Parse XLSX content into criteria items."""
    try:
        import openpyxl
        from io import BytesIO
        
        wb = openpyxl.load_workbook(BytesIO(content), read_only=True)
        ws = wb.active
        
        items = []
        headers = []
        column_map = {}
        
        for row_idx, row in enumerate(ws.iter_rows(values_only=True)):
            if row_idx == 0:
                # Header row
                for col_idx, cell in enumerate(row):
                    if cell:
                        header = str(cell).lower().strip().replace(' ', '_')
                        headers.append(header)
                        
                        if header in ['criteria_id', 'criteriaid', 'id']:
                            column_map['criteria_id'] = col_idx
                        elif header in ['requirement', 'req']:
                            column_map['requirement'] = col_idx
                        elif header in ['description', 'desc']:
                            column_map['description'] = col_idx
                        elif header in ['category', 'cat']:
                            column_map['category'] = col_idx
                        elif header in ['weight', 'wt']:
                            column_map['weight'] = col_idx
            else:
                # Data row
                item = {}
                for field, col_idx in column_map.items():
                    if col_idx < len(row) and row[col_idx]:
                        item[field] = str(row[col_idx]).strip()
                
                if item.get('criteria_id') and item.get('requirement'):
                    items.append(item)
        
        return items
        
    except ImportError:
        raise common.ValidationError('XLSX parsing requires openpyxl library')


# =============================================================================
# CRITERIA ITEMS HANDLERS
# =============================================================================

def handle_list_criteria_items(
    event: Dict[str, Any],
    criteria_set_id: str,
    org_id: str
) -> Dict[str, Any]:
    """List criteria items for a criteria set."""
    criteria_set_id = common.validate_uuid(criteria_set_id, 'id')
    
    # Verify ownership
    criteria_set = common.find_one('eval_criteria_sets', {'id': criteria_set_id})
    if not criteria_set:
        raise common.NotFoundError('Criteria set not found')
    
    doc_type = common.find_one('eval_doc_types', {'id': criteria_set['doc_type_id']})
    if not doc_type or doc_type['org_id'] != org_id:
        raise common.NotFoundError('Criteria set not found')
    
    query_params = event.get('queryStringParameters', {}) or {}
    include_inactive = query_params.get('includeInactive', 'false').lower() == 'true'
    category = query_params.get('category')
    
    filters = {'criteria_set_id': criteria_set_id}
    if not include_inactive:
        filters['is_active'] = True
    if category:
        filters['category'] = category
    
    items = common.find_many('eval_criteria_items', filters, order='order_index.asc')
    
    return common.success_response([common.format_record(i) for i in items])


def handle_add_criteria_item(
    event: Dict[str, Any],
    criteria_set_id: str,
    org_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Add a criteria item to a criteria set."""
    criteria_set_id = common.validate_uuid(criteria_set_id, 'id')
    
    # Verify ownership
    criteria_set = common.find_one('eval_criteria_sets', {'id': criteria_set_id})
    if not criteria_set:
        raise common.NotFoundError('Criteria set not found')
    
    doc_type = common.find_one('eval_doc_types', {'id': criteria_set['doc_type_id']})
    if not doc_type or doc_type['org_id'] != org_id:
        raise common.NotFoundError('Criteria set not found')
    
    body = json.loads(event.get('body', '{}'))
    
    criteria_id = body.get('criteriaId')
    if not criteria_id:
        raise common.ValidationError('criteriaId is required')
    
    requirement = body.get('requirement')
    if not requirement:
        raise common.ValidationError('requirement is required')
    
    # Check for duplicate
    existing = common.find_one(
        'eval_criteria_items',
        {'criteria_set_id': criteria_set_id, 'criteria_id': criteria_id}
    )
    if existing:
        raise common.ValidationError(f'Criteria ID "{criteria_id}" already exists in this set')
    
    # Get max order_index
    items = common.find_many(
        'eval_criteria_items',
        {'criteria_set_id': criteria_set_id},
        order='order_index.desc',
        limit=1
    )
    max_order = items[0]['order_index'] if items else 0
    
    item_data = {
        'criteria_set_id': criteria_set_id,
        'criteria_id': criteria_id,
        'requirement': requirement,
        'description': body.get('description'),
        'category': body.get('category'),
        'weight': float(body.get('weight', 1.0)),
        'order_index': body.get('orderIndex', max_order + 1),
        'is_active': True
    }
    
    item = common.insert_one('eval_criteria_items', item_data)
    
    return common.created_response(common.format_record(item))


def handle_update_criteria_item(
    event: Dict[str, Any],
    item_id: str,
    org_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Update a criteria item."""
    item_id = common.validate_uuid(item_id, 'id')
    
    item = common.find_one('eval_criteria_items', {'id': item_id})
    if not item:
        raise common.NotFoundError('Criteria item not found')
    
    # Verify ownership via criteria set -> doc type -> org
    criteria_set = common.find_one('eval_criteria_sets', {'id': item['criteria_set_id']})
    if not criteria_set:
        raise common.NotFoundError('Criteria item not found')
    
    doc_type = common.find_one('eval_doc_types', {'id': criteria_set['doc_type_id']})
    if not doc_type or doc_type['org_id'] != org_id:
        raise common.NotFoundError('Criteria item not found')
    
    body = json.loads(event.get('body', '{}'))
    update_data = {}
    
    if 'criteriaId' in body:
        # Check for duplicate
        existing = common.find_one(
            'eval_criteria_items',
            {'criteria_set_id': item['criteria_set_id'], 'criteria_id': body['criteriaId']}
        )
        if existing and existing['id'] != item_id:
            raise common.ValidationError(f'Criteria ID "{body["criteriaId"]}" already exists')
        update_data['criteria_id'] = body['criteriaId']
    
    if 'requirement' in body:
        update_data['requirement'] = body['requirement']
    
    if 'description' in body:
        update_data['description'] = body['description']
    
    if 'category' in body:
        update_data['category'] = body['category']
    
    if 'weight' in body:
        weight = float(body['weight'])
        if weight <= 0:
            raise common.ValidationError('weight must be greater than 0')
        update_data['weight'] = weight
    
    if 'orderIndex' in body:
        update_data['order_index'] = int(body['orderIndex'])
    
    if 'isActive' in body:
        update_data['is_active'] = bool(body['isActive'])
    
    if not update_data:
        raise common.ValidationError('No valid fields to update')
    
    updated = common.update_one('eval_criteria_items', {'id': item_id}, update_data)
    
    return common.success_response(common.format_record(updated))


def handle_delete_criteria_item(item_id: str, org_id: str, user_id: str) -> Dict[str, Any]:
    """Soft delete a criteria item."""
    item_id = common.validate_uuid(item_id, 'id')
    
    item = common.find_one('eval_criteria_items', {'id': item_id})
    if not item:
        raise common.NotFoundError('Criteria item not found')
    
    # Verify ownership
    criteria_set = common.find_one('eval_criteria_sets', {'id': item['criteria_set_id']})
    if not criteria_set:
        raise common.NotFoundError('Criteria item not found')
    
    doc_type = common.find_one('eval_doc_types', {'id': criteria_set['doc_type_id']})
    if not doc_type or doc_type['org_id'] != org_id:
        raise common.NotFoundError('Criteria item not found')
    
    # Soft delete
    common.update_one('eval_criteria_items', {'id': item_id}, {'is_active': False})
    
    return common.success_response({
        'message': 'Criteria item deleted',
        'id': item_id
    })
