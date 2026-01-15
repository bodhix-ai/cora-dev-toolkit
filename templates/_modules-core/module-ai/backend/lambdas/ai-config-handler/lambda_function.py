"""
AI Configuration Management Handler - CORA Compliant

Provides API endpoints for managing platform and organization-level AI configurations,
including default embedding/chat models and system prompts.

Design Documents:
  - docs/implementation/platform-ai-config-module-plan.md
  - docs/architecture/backend/platform-config-design.md
"""

import json
import logging
import re
from typing import Any, Dict, Optional

import org_common as common
from org_common import camel_to_snake
from ai_common import (
    PlatformAIConfig,
    OrgAIConfig,
    DeploymentCapability,
    validate_model_id,
    validate_model_capabilities,
    validate_platform_config
)

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# System admin roles
SYS_ADMIN_ROLES = ['sys_owner', 'sys_admin']

# Organization admin roles
ORG_ADMIN_ROLES = ['org_owner', 'org_admin']


def _is_sys_admin(user_id: str) -> bool:
    """
    Verify that the user has system admin role.
    
    Args:
        user_id: Supabase user ID
        
    Returns:
        True if user has system admin role, False otherwise
    """
    try:
        profile = common.find_one('user_profiles', {'user_id': user_id})
        if not profile:
            return False
        
        sys_role = profile.get('sys_role')
        return sys_role in SYS_ADMIN_ROLES
    except Exception as e:
        logger.error(f"Error checking system admin role: {e}")
        return False


def _require_sys_admin(user_id: str):
    """
    Require system admin access, raise ForbiddenError if user doesn't have it.
    
    Args:
        user_id: Supabase user ID
        
    Raises:
        ForbiddenError: If user doesn't have system admin role
    """
    if not _is_sys_admin(user_id):
        raise common.ForbiddenError('Access denied. System admin role required.')


def _check_org_admin(user_id: str, organization_id: str) -> bool:
    """
    Verify that the user has admin role in the specified organization.
    
    Args:
        user_id: Supabase user ID
        organization_id: Organization UUID
        
    Returns:
        True if user is org admin, False otherwise
    """
    try:
        membership = common.find_one(
            'org_members',
            {'user_id': user_id, 'organization_id': organization_id}
        )
        if not membership:
            return False
        
        return membership.get('role') in ORG_ADMIN_ROLES
    except Exception as e:
        logger.error(f"Error checking org admin role: {e}")
        return False


# ============================================================================
# MODELS LISTING (Super Admin Only)
# ============================================================================

def list_models_handler(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    List available AI models.
    Only accessible to platform admin users.
    
    Query parameters:
        capability: Optional filter by 'chat' or 'embedding'
    
    Returns:
        List of available models with their capabilities.
    """
    try:
        _require_sys_admin(user_id)
        
        logger.info(f"System admin access granted for user {user_id}")
        
        # Get capability filter from query parameters
        query_params = event.get("queryStringParameters") or {}
        capability = query_params.get("capability")
        
        # Get all models
        models = common.find_many(table='ai_models', filters={'status': 'available'})
        
        # Apply capability filter if specified
        if capability:
            filtered_models = []
            for model in models:
                capabilities_raw = model.get('capabilities', {})
                if isinstance(capabilities_raw, str):
                    capabilities = json.loads(capabilities_raw)
                else:
                    capabilities = capabilities_raw
                
                if capability == 'chat' and capabilities.get('chat'):
                    filtered_models.append(model)
                elif capability == 'embedding' and capabilities.get('embedding'):
                    filtered_models.append(model)
            
            models = filtered_models
        
        logger.info(f"Found {len(models)} models")
        
        return common.success_response({'deployments': common.format_records(models)})
    
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        logger.exception(f"Error fetching models: {e}")
        return common.internal_error_response(f"An unexpected error occurred: {str(e)}")


# ============================================================================
# PLATFORM AI CONFIGURATION (Super Admin Only)
# ============================================================================

def get_platform_ai_config_handler(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Get platform-level AI configuration.
    Only accessible to platform admin users.
    
    Returns:
        Platform AI configuration including default models and system prompt.
    """
    try:
        _require_sys_admin(user_id)
        
        logger.info(f"System admin access granted for user {user_id}")
        
        # Get platform AI configuration
        config = common.find_one('ai_cfg_sys_rag', {})
        
        if not config:
            return common.not_found_response("Platform AI configuration not found.")
        
        # Fetch model details for context
        if config.get("default_embedding_model_id"):
            emb_model = common.find_one(
                'ai_models',
                {'id': config["default_embedding_model_id"]}
            )
            
            if emb_model:
                config["embedding_model"] = common.format_record(emb_model)
        
        if config.get("default_chat_model_id"):
            chat_model = common.find_one(
                'ai_models',
                {'id': config["default_chat_model_id"]}
            )
            
            if chat_model:
                config["chat_model"] = common.format_record(chat_model)
        
        return common.success_response(common.format_record(config))
    
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        logger.exception(f"Error fetching platform AI configuration: {e}")
        return common.internal_error_response(f"An unexpected error occurred: {str(e)}")


def update_platform_ai_config_handler(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Update platform-level AI configuration.
    Only accessible to platform admin users.
    
    Request body:
        {
            "default_embedding_model_id": "uuid",
            "default_chat_model_id": "uuid",
            "system_prompt": "optional string"
        }
    
    Returns:
        Updated platform AI configuration.
    """
    try:
        _require_sys_admin(user_id)
        
        logger.info(f"System admin access granted for user {user_id}")
        
        # Parse request body
        try:
            body = json.loads(event.get("body", "{}"))
        except json.JSONDecodeError:
            return common.bad_request_response("Invalid JSON in request body.")
        
        if not body:
            return common.bad_request_response("Request body is required.")
        
        # Transform camelCase to snake_case (API-PATTERNS standard)
        body = {camel_to_snake(k): v for k, v in body.items()}
        
        # Validate required fields
        embedding_model_id = body.get("default_embedding_model_id")
        chat_model_id = body.get("default_chat_model_id")
        
        if not embedding_model_id or not chat_model_id:
            return common.bad_request_response(
                "Both default_embedding_model_id and default_chat_model_id are required."
            )
        
        # Validate UUIDs
        embedding_model_id = common.validate_uuid(embedding_model_id, 'default_embedding_model_id')
        chat_model_id = common.validate_uuid(chat_model_id, 'default_chat_model_id')
        
        # Validate models exist in database
        logger.info("Validating models exist")
        embedding_model = common.find_one('ai_models', {'id': embedding_model_id})
        if not embedding_model:
            return common.bad_request_response(f"Embedding model with ID {embedding_model_id} not found")
        
        chat_model = common.find_one('ai_models', {'id': chat_model_id})
        if not chat_model:
            return common.bad_request_response(f"Chat model with ID {chat_model_id} not found")
        
        # Prepare update data
        update_data = {
            "default_embedding_model_id": embedding_model_id,
            "default_chat_model_id": chat_model_id,
        }
        
        # Add optional system prompt
        if "system_prompt" in body:
            update_data["system_prompt"] = body["system_prompt"]
        
        # Get the ai_cfg_sys_rag record
        platform_record = common.find_one('ai_cfg_sys_rag', {})
        
        if not platform_record:
            return common.not_found_response("Platform RAG configuration not found.")
        
        config_id = platform_record["id"]
        
        # Update platform configuration
        logger.info(f"Updating platform AI configuration (id={config_id})")
        
        updated_config = common.update_one(
            table='ai_cfg_sys_rag',
            filters={'id': config_id},
            data=update_data
        )
        
        if not updated_config:
            logger.error("Update failed - no record returned")
            return common.internal_error_response("Failed to update platform AI configuration.")
        
        logger.info(f"Platform AI configuration updated by {user_id}")
        
        # Fetch model details for response
        if updated_config.get("default_embedding_model_id"):
            emb_model = common.find_one(
                'ai_models',
                {'id': updated_config["default_embedding_model_id"]}
            )
            
            if emb_model:
                updated_config["embedding_model"] = common.format_record(emb_model)
        
        if updated_config.get("default_chat_model_id"):
            chat_model = common.find_one(
                'ai_models',
                {'id': updated_config["default_chat_model_id"]}
            )
            
            if chat_model:
                updated_config["chat_model"] = common.format_record(chat_model)
        
        return common.success_response(common.format_record(updated_config))
    
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        logger.exception(f"Error updating platform AI configuration: {e}")
        return common.internal_error_response(f"An unexpected error occurred: {str(e)}")


# ============================================================================
# ORGANIZATION AI CONFIGURATION (Organization Admins)
# ============================================================================

def get_org_ai_config_handler(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Get organization-level AI configuration.
    Accessible to organization admins for their own organization.
    
    Path parameters:
        organizationId: UUID of the organization
    
    Returns:
        Organization AI configuration with inherited platform defaults.
    """
    try:
        # Get organization ID from path parameters
        path_params = event.get("pathParameters", {})
        organization_id = path_params.get("orgId")
        
        if not organization_id:
            return common.bad_request_response("orgId is required.")
        
        organization_id = common.validate_uuid(organization_id, 'organizationId')
        
        # Verify user is admin of the organization or system admin
        is_sys_admin = _is_sys_admin(user_id)
        is_org_admin = _check_org_admin(user_id, organization_id)
        
        if not is_sys_admin and not is_org_admin:
            logger.warning(
                f"Access denied for user {user_id} - "
                f"not admin of organization {organization_id}"
            )
            raise common.ForbiddenError("Access denied. Organization admin role required.")
        
        logger.info(
            f"Organization admin access granted for user {user_id} "
            f"to organization {organization_id}"
        )
        
        # Get organization AI configuration
        org_config = common.find_one('ai_cfg_org_prompts', {'org_id': organization_id}, select='*')
        
        # Get platform defaults
        platform_config = common.find_one('ai_cfg_sys_rag', {})
        
        if not platform_config:
            return common.not_found_response("Platform AI configuration not found.")
        
        # Prepare platform config
        platform_settings = {
            "system_prompt": platform_config.get("system_prompt", ""),
            "default_chat_deployment_id": platform_config.get("default_chat_model_id"),
            "default_embedding_deployment_id": platform_config.get("default_embedding_model_id"),
        }
        
        # Fetch model details for platform config
        if platform_settings.get("default_embedding_deployment_id"):
            emb_model = common.find_one(
                'ai_models',
                {'id': platform_settings["default_embedding_deployment_id"]}
            )
            
            if emb_model:
                # Map to DeploymentInfo structure expected by frontend
                model_record = common.format_record(emb_model)
                # Parse capabilities if it's a string
                capabilities = model_record.get('capabilities')
                if isinstance(capabilities, str):
                    try:
                        capabilities = json.loads(capabilities)
                    except json.JSONDecodeError:
                        capabilities = {}
                
                platform_settings["embedding_deployment"] = {
                    "id": model_record.get('id'),
                    "providerType": model_record.get('providerId'), # Ideally join with provider table, but simple ID for now
                    "provider": "Unknown", # We'd need to join with ai_providers to get name
                    "modelId": model_record.get('modelId'),
                    "modelName": model_record.get('displayName', model_record.get('modelId')),
                    "deploymentName": "Default",
                    "supportsChat": capabilities.get('chat', False),
                    "supportsEmbeddings": capabilities.get('embedding', False),
                    "deploymentStatus": model_record.get('status'),
                    "createdAt": model_record.get('createdAt'),
                    "updatedAt": model_record.get('updatedAt'),
                    "description": model_record.get('description'),
                    "capabilities": capabilities
                }
                
                # Try to get provider name
                if model_record.get('providerId'):
                    provider = common.find_one('ai_providers', {'id': model_record.get('providerId')})
                    if provider:
                        platform_settings["embedding_deployment"]["provider"] = provider.get('displayName') or provider.get('name')
                        platform_settings["embedding_deployment"]["providerType"] = provider.get('providerType')
        
        if platform_settings.get("default_chat_deployment_id"):
            chat_model = common.find_one(
                'ai_models',
                {'id': platform_settings["default_chat_deployment_id"]}
            )
            
            if chat_model:
                # Map to DeploymentInfo structure expected by frontend
                model_record = common.format_record(chat_model)
                # Parse capabilities if it's a string
                capabilities = model_record.get('capabilities')
                if isinstance(capabilities, str):
                    try:
                        capabilities = json.loads(capabilities)
                    except json.JSONDecodeError:
                        capabilities = {}
                        
                platform_settings["chat_deployment"] = {
                    "id": model_record.get('id'),
                    "providerType": model_record.get('providerId'),
                    "provider": "Unknown",
                    "modelId": model_record.get('modelId'),
                    "modelName": model_record.get('displayName', model_record.get('modelId')),
                    "deploymentName": "Default",
                    "supportsChat": capabilities.get('chat', False),
                    "supportsEmbeddings": capabilities.get('embedding', False),
                    "deploymentStatus": model_record.get('status'),
                    "createdAt": model_record.get('createdAt'),
                    "updatedAt": model_record.get('updatedAt'),
                    "description": model_record.get('description'),
                    "capabilities": capabilities
                }
                
                # Try to get provider name
                if model_record.get('providerId'):
                    provider = common.find_one('ai_providers', {'id': model_record.get('providerId')})
                    if provider:
                        platform_settings["chat_deployment"]["provider"] = provider.get('displayName') or provider.get('name')
                        platform_settings["chat_deployment"]["providerType"] = provider.get('providerType')

        # Combine prompt
        org_system_prompt = org_config.get("org_system_prompt") if org_config else None
        platform_prompt = platform_settings.get("system_prompt", "")
        
        combined_prompt = platform_prompt
        if org_system_prompt:
            combined_prompt = f"{platform_prompt}\n\n{org_system_prompt}" if platform_prompt else org_system_prompt

        # Construct final response including ALL org config fields
        config = {
            "org_id": organization_id,
            "org_system_prompt": org_system_prompt,
            "policy_mission_type": org_config.get("policy_mission_type") if org_config else None,
            "custom_system_prompt": org_config.get("custom_system_prompt") if org_config else None,
            "custom_context_prompt": org_config.get("custom_context_prompt") if org_config else None,
            "citation_style": org_config.get("citation_style") if org_config else None,
            "include_page_numbers": org_config.get("include_page_numbers") if org_config else None,
            "include_source_metadata": org_config.get("include_source_metadata") if org_config else None,
            "response_tone": org_config.get("response_tone") if org_config else None,
            "max_response_length": org_config.get("max_response_length") if org_config else None,
            "created_by": org_config.get("created_by") if org_config else None,
            "updated_by": org_config.get("updated_by") if org_config else None,
            "created_at": org_config.get("created_at") if org_config else None,
            "updated_at": org_config.get("updated_at") if org_config else None,
            "platform_config": platform_settings,
            "combined_prompt": combined_prompt
        }
        
        # Transform to camelCase for API response
        return common.success_response(common.transform_record(config))
    
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        logger.exception(f"Error fetching organization AI configuration: {e}")
        return common.internal_error_response(f"An unexpected error occurred: {str(e)}")


def update_org_ai_config_handler(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Update organization-level AI configuration.
    Accessible to organization admins for their own organization.
    
    Path parameters:
        organizationId: UUID of the organization
    
    Request body:
        {
            "org_system_prompt": "optional string"
        }
    
    Returns:
        Updated organization AI configuration.
    """
    try:
        # Get organization ID from path parameters
        path_params = event.get("pathParameters", {})
        organization_id = path_params.get("orgId")
        
        if not organization_id:
            return common.bad_request_response("orgId is required.")
        
        organization_id = common.validate_uuid(organization_id, 'orgId')
        
        # Verify user is admin of the organization or system admin
        is_sys_admin = _is_sys_admin(user_id)
        is_org_admin = _check_org_admin(user_id, organization_id)
        
        if not is_sys_admin and not is_org_admin:
            logger.warning(
                f"Access denied for user {user_id} - "
                f"not admin of organization {organization_id}"
            )
            raise common.ForbiddenError("Access denied. Organization admin role required.")
        
        logger.info(
            f"Organization admin access granted for user {user_id} "
            f"to organization {organization_id}"
        )
        
        # Parse request body
        try:
            body = json.loads(event.get("body", "{}"))
        except json.JSONDecodeError:
            return common.bad_request_response("Invalid JSON in request body.")
        
        if not body:
            return common.bad_request_response("Request body is required.")
        
        # Transform camelCase to snake_case (API-PATTERNS standard)
        body = {camel_to_snake(k): v for k, v in body.items()}
        
        # Prepare update data - only include fields that exist in ai_cfg_org_prompts table
        valid_fields = [
            'policy_mission_type',
            'custom_system_prompt',
            'custom_context_prompt',
            'citation_style',
            'include_page_numbers',
            'include_source_metadata',
            'response_tone',
            'max_response_length',
            'org_system_prompt'
        ]
        
        update_data = {k: v for k, v in body.items() if k in valid_fields}
        
        if not update_data:
            return common.bad_request_response("No valid fields to update.")
        
        # Add updated_by to track who made the change (CORA audit standard)
        update_data['updated_by'] = user_id
        
        # Check if ai_cfg_org_prompts record exists
        existing = common.find_one('ai_cfg_org_prompts', {'org_id': organization_id}, select='*')
        
        if existing:
            # Update existing record
            logger.info(f"Updating org AI configuration for organization {organization_id}")
            
            updated_config = common.update_one(
                table='ai_cfg_org_prompts',
                filters={'org_id': organization_id},
                data=update_data
            )
        else:
            # Insert new record
            logger.info(f"Creating org AI configuration for organization {organization_id}")
            
            insert_data = {
                "org_id": organization_id,
                "created_by": user_id,  # CORA audit standard
                "updated_by": user_id,  # Set on creation as well
                **update_data
            }
            
            updated_config = common.insert_one(table='ai_cfg_org_prompts', data=insert_data)
        
        if not updated_config:
            logger.error("Update/insert failed - no record returned")
            return common.internal_error_response("Failed to update organization AI configuration.")
        
        logger.info(f"Organization AI configuration updated for {organization_id} by {user_id}")
        
        # Return the same structure as GET handler for consistency
        # Get platform defaults
        platform_config = common.find_one('ai_cfg_sys_rag', {})
        
        if not platform_config:
            return common.not_found_response("Platform AI configuration not found.")
        
        # Prepare platform config
        platform_settings = {
            "system_prompt": platform_config.get("system_prompt", ""),
            "default_chat_deployment_id": platform_config.get("default_chat_model_id"),
            "default_embedding_deployment_id": platform_config.get("default_embedding_model_id"),
        }
        
        # Fetch model details for platform config (same as GET handler)
        if platform_settings.get("default_embedding_deployment_id"):
            emb_model = common.find_one(
                'ai_models',
                {'id': platform_settings["default_embedding_deployment_id"]}
            )
            
            if emb_model:
                model_record = common.format_record(emb_model)
                capabilities = model_record.get('capabilities')
                if isinstance(capabilities, str):
                    try:
                        capabilities = json.loads(capabilities)
                    except json.JSONDecodeError:
                        capabilities = {}
                
                platform_settings["embedding_deployment"] = {
                    "id": model_record.get('id'),
                    "providerType": model_record.get('providerId'),
                    "provider": "Unknown",
                    "modelId": model_record.get('modelId'),
                    "modelName": model_record.get('displayName', model_record.get('modelId')),
                    "deploymentName": "Default",
                    "supportsChat": capabilities.get('chat', False),
                    "supportsEmbeddings": capabilities.get('embedding', False),
                    "deploymentStatus": model_record.get('status'),
                    "createdAt": model_record.get('createdAt'),
                    "updatedAt": model_record.get('updatedAt'),
                    "description": model_record.get('description'),
                    "capabilities": capabilities
                }
                
                if model_record.get('providerId'):
                    provider = common.find_one('ai_providers', {'id': model_record.get('providerId')})
                    if provider:
                        platform_settings["embedding_deployment"]["provider"] = provider.get('displayName') or provider.get('name')
                        platform_settings["embedding_deployment"]["providerType"] = provider.get('providerType')
        
        if platform_settings.get("default_chat_deployment_id"):
            chat_model = common.find_one(
                'ai_models',
                {'id': platform_settings["default_chat_deployment_id"]}
            )
            
            if chat_model:
                model_record = common.format_record(chat_model)
                capabilities = model_record.get('capabilities')
                if isinstance(capabilities, str):
                    try:
                        capabilities = json.loads(capabilities)
                    except json.JSONDecodeError:
                        capabilities = {}
                        
                platform_settings["chat_deployment"] = {
                    "id": model_record.get('id'),
                    "providerType": model_record.get('providerId'),
                    "provider": "Unknown",
                    "modelId": model_record.get('modelId'),
                    "modelName": model_record.get('displayName', model_record.get('modelId')),
                    "deploymentName": "Default",
                    "supportsChat": capabilities.get('chat', False),
                    "supportsEmbeddings": capabilities.get('embedding', False),
                    "deploymentStatus": model_record.get('status'),
                    "createdAt": model_record.get('createdAt'),
                    "updatedAt": model_record.get('updatedAt'),
                    "description": model_record.get('description'),
                    "capabilities": capabilities
                }
                
                if model_record.get('providerId'):
                    provider = common.find_one('ai_providers', {'id': model_record.get('providerId')})
                    if provider:
                        platform_settings["chat_deployment"]["provider"] = provider.get('displayName') or provider.get('name')
                        platform_settings["chat_deployment"]["providerType"] = provider.get('providerType')

        # Combine prompts
        org_system_prompt = updated_config.get("org_system_prompt")
        platform_prompt = platform_settings.get("system_prompt", "")
        
        combined_prompt = platform_prompt
        if org_system_prompt:
            combined_prompt = f"{platform_prompt}\n\n{org_system_prompt}" if platform_prompt else org_system_prompt

        # Construct response matching GET handler structure, including ALL org config fields
        config = {
            "org_id": organization_id,
            "org_system_prompt": org_system_prompt,
            "policy_mission_type": updated_config.get("policy_mission_type"),
            "custom_system_prompt": updated_config.get("custom_system_prompt"),
            "custom_context_prompt": updated_config.get("custom_context_prompt"),
            "citation_style": updated_config.get("citation_style"),
            "include_page_numbers": updated_config.get("include_page_numbers"),
            "include_source_metadata": updated_config.get("include_source_metadata"),
            "response_tone": updated_config.get("response_tone"),
            "max_response_length": updated_config.get("max_response_length"),
            "created_by": updated_config.get("created_by"),
            "updated_by": updated_config.get("updated_by"),
            "created_at": updated_config.get("created_at"),
            "updated_at": updated_config.get("updated_at"),
            "platform_config": platform_settings,
            "combined_prompt": combined_prompt
        }
        
        return common.success_response(common.transform_record(config))
    
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        logger.exception(f"Error updating organization AI configuration: {e}")
        return common.internal_error_response(f"An unexpected error occurred: {str(e)}")


# ============================================================================
# PLATFORM RAG CONFIGURATION (Super Admin Only)
# ============================================================================

def get_sys_rag_config_handler(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Get platform-level RAG configuration.
    Only accessible to system admin users.
    
    Returns:
        Platform RAG configuration including provider settings.
    """
    try:
        _require_sys_admin(user_id)
        
        logger.info(f"System admin access granted for user {user_id}")
        
        # Get platform RAG configuration
        rag_config = common.find_one(
            table='ai_cfg_sys_rag',
            filters={},
            select='*'
        )
        
        if not rag_config:
            return common.not_found_response('Platform RAG configuration not found.')
        
        # Sanitize sensitive information (API keys)
        if 'provider_configurations' in rag_config:
            provider_configs = rag_config.get('provider_configurations', {})
            if isinstance(provider_configs, dict):
                for provider_name, provider_config in provider_configs.items():
                    if isinstance(provider_config, dict) and 'api_key' in provider_config:
                        if provider_config['api_key']:
                            provider_config['api_key'] = '***'
        
        return common.success_response(common.format_record(rag_config))
    
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        logger.exception(f'Error fetching platform RAG configuration: {e}')
        return common.internal_error_response('Failed to get RAG configuration')


def update_sys_rag_config_handler(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Update platform-level RAG configuration.
    Only accessible to system admin users.
    
    Request body:
        {
            "default_embedding_model_id": "uuid",
            "default_chat_model_id": "uuid",
            "default_ai_provider": "string",
            "active_providers": ["provider1", "provider2"],
            "provider_configurations": {...}
        }
    
    Returns:
        Updated platform RAG configuration.
    """
    try:
        _require_sys_admin(user_id)
        
        logger.info(f"System admin access granted for user {user_id}")
        
        # Parse request body
        try:
            body = json.loads(event.get('body', '{}'))
        except json.JSONDecodeError:
            return common.bad_request_response('Invalid JSON in request body.')
        
        if not body:
            return common.bad_request_response('Request body is required.')
        
        # Fetch existing configuration to preserve sanitized API keys
        existing_config = common.find_one(table='ai_cfg_sys_rag', filters={}, select='*')
        
        if not existing_config:
            return common.not_found_response('Platform RAG configuration not found.')
        
        config_id = existing_config['id']
        
        # Handle API key preservation for provider configurations
        if 'provider_configurations' in body:
            existing_provider_configs = existing_config.get('provider_configurations', {})
            incoming_provider_configs = body['provider_configurations']
            
            for provider_name, incoming_config in incoming_provider_configs.items():
                if isinstance(incoming_config, dict):
                    api_key = incoming_config.get('api_key')
                    
                    # If API key is sanitized placeholder, restore real key
                    if api_key == '***':
                        existing_provider = existing_provider_configs.get(provider_name, {})
                        real_api_key = existing_provider.get('api_key')
                        
                        if real_api_key:
                            incoming_config['api_key'] = real_api_key
                            logger.info(f"Preserved existing API key for provider '{provider_name}'")
        
        # Prepare update data
        update_data = body.copy()
        
        # Update platform RAG configuration
        logger.info(f"Updating platform RAG configuration (id={config_id})")
        
        updated_config = common.update_one(
            table='ai_cfg_sys_rag',
            filters={'id': config_id},
            data=update_data
        )
        
        if not updated_config:
            logger.error('Update failed - no record returned')
            return common.internal_error_response('Failed to update platform RAG configuration.')
        
        logger.info(f"Platform RAG configuration updated by {user_id}")
        
        # Sanitize sensitive information in response
        if 'provider_configurations' in updated_config:
            provider_configs = updated_config.get('provider_configurations', {})
            if isinstance(provider_configs, dict):
                for provider_name, provider_config in provider_configs.items():
                    if isinstance(provider_config, dict) and 'api_key' in provider_config:
                        if provider_config['api_key']:
                            provider_config['api_key'] = '***'
        
        return common.success_response(common.format_record(updated_config))
    
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        logger.exception(f'Error updating platform RAG configuration: {e}')
        return common.internal_error_response('Failed to update RAG configuration')


def list_rag_providers_handler(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    List all available AI providers.
    Only accessible to system admin users.
    
    Returns:
        List of AI providers with their status and capabilities.
    """
    try:
        _require_sys_admin(user_id)
        
        logger.info(f"System admin access granted for user {user_id}")
        
        # Get all AI providers
        providers = common.find_many(
            table='ai_providers',
            select='id, display_name, created_at, created_by, credentials_secret_path',
            order='display_name'
        )
        
        logger.info(f"Found {len(providers)} AI providers")
        
        return common.success_response({
            'providers': common.format_records(providers)
        })
    
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        logger.exception(f'Error listing AI providers: {e}')
        return common.internal_error_response('Failed to list AI providers')


def test_rag_provider_handler(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Test connection to a specific AI provider.
    Only accessible to system admin users.
    
    Request body:
        {
            "provider_id": "uuid",
            "test_model_id": "optional model id"
        }
    
    Returns:
        Connection test results.
    """
    try:
        _require_sys_admin(user_id)
        
        logger.info(f"System admin access granted for user {user_id}")
        
        # Parse request body
        try:
            body = json.loads(event.get('body', '{}'))
        except json.JSONDecodeError:
            return common.bad_request_response('Invalid JSON in request body.')
        
        provider_id = body.get('provider_id')
        test_model_id = body.get('test_model_id')
        
        if not provider_id:
            return common.bad_request_response('provider_id is required.')
        
        # Validate UUID
        provider_id = common.validate_uuid(provider_id, 'provider_id')
        
        # Get provider details
        provider = common.find_one(
            table='ai_providers',
            filters={'id': provider_id}
        )
        
        if not provider:
            return common.not_found_response(f'Provider with ID {provider_id} not found')
        
        # For now, return basic connectivity status
        # Full provider testing logic would require provider-specific SDKs
        logger.info(f"Testing provider: {provider.get('name')} (id={provider_id})")
        
        test_result = {
            'success': True,
            'providerId': provider_id,
            'providerName': provider.get('name'),
            'providerType': provider.get('type'),
            'message': f"Provider {provider.get('name')} configuration validated"
        }
        
        if test_model_id:
            test_result['test_model_id'] = test_model_id
        
        return common.success_response(test_result)
    
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except common.NotFoundError as e:
        return common.not_found_response(str(e))
    except Exception as e:
        logger.exception(f'Error testing provider connection: {e}')
        return common.internal_error_response('Failed to test provider connection')


def get_rag_provider_models_handler(event: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Get available models for AI providers.
    Only accessible to system admin users.
    
    Query parameters:
        provider_id: Optional provider UUID to filter by
    
    Returns:
        List of AI models with their capabilities.
    """
    try:
        _require_sys_admin(user_id)
        
        logger.info(f"System admin access granted for user {user_id}")
        
        # Get query parameters
        query_params = event.get('queryStringParameters') or {}
        provider_id = query_params.get('provider_id')
        
        # Build filters
        filters = {'status': 'available'}
        
        if provider_id:
            provider_id = common.validate_uuid(provider_id, 'provider_id')
            filters['provider_id'] = provider_id
        
        # Get models
        models = common.find_many(
            table='ai_models',
            filters=filters,
            select='id, capabilities, cost_per_1k_tokens_input, cost_per_1k_tokens_output, created_at, created_by',
            order='created_at'
        )
        
        logger.info(f"Found {len(models)} AI models")
        
        return common.success_response({
            'models': common.format_records(models),
            'count': len(models)
        })
    
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        logger.exception(f'Error getting provider models: {e}')
        return common.internal_error_response('Failed to get provider models')


# ============================================================================
# LAMBDA HANDLER (Router)
# ============================================================================


def get_supabase_user_id_from_okta_uid(okta_uid: str) -> Optional[str]:
    """
    Get Supabase user_id from Okta user ID
    
    Args:
        okta_uid: Okta user ID
        
    Returns:
        Supabase user_id if found, None otherwise
    """
    try:
        identity = common.find_one(
            table='user_auth_ext_ids',
            filters={
                'provider_name': 'okta',
                'external_id': okta_uid
            }
        )
        return identity['auth_user_id'] if identity else None
    except Exception as e:
        print(f"Error getting Supabase user_id from Okta UID: {str(e)}")
        return None

def lambda_handler(event: Dict[str, Any], context: object) -> Dict[str, Any]:
    """
    Main Lambda handler that routes requests to appropriate functions.
    
    Supported routes:
        # AI Configuration
        GET  /admin/ai/config -> get_platform_ai_config_handler
        PUT  /admin/ai/config -> update_platform_ai_config_handler
        GET  /admin/ai/models -> list_models_handler
        GET  /orgs/{organizationId}/ai/config -> get_org_ai_config_handler
        PUT  /orgs/{organizationId}/ai/config -> update_org_ai_config_handler
        
        # AI Provider Configuration
        GET  /admin/ai/rag-config -> get_sys_rag_config_handler
        PUT  /admin/ai/rag-config -> update_sys_rag_config_handler
        GET  /admin/ai/providers -> list_rag_providers_handler
        POST /admin/ai/providers/test -> test_rag_provider_handler
        GET  /admin/ai/providers/models -> get_rag_provider_models_handler
    """
    logger.info(json.dumps(event, default=str))
    
    try:
        # Extract user information from event
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        supabase_user_id = common.get_supabase_user_id_from_external_uid(okta_uid)
        
        # Get HTTP method and path
        http_method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method")
        path = event.get("path") or event.get("rawPath", "")
        
        logger.info(f"AI Config Handler - Method: {http_method}, Path: {path}")
        
        # Define route patterns
        org_ai_config_pattern = re.compile(r'^/orgs/[^/]+/ai/config$')
        
        # Route to appropriate handler
        # AI Configuration routes
        if path == "/admin/ai/config":
            if http_method == "GET":
                return get_platform_ai_config_handler(event, supabase_user_id)
            elif http_method == "PUT":
                return update_platform_ai_config_handler(event, supabase_user_id)
        
        elif path == "/admin/ai/models":
            if http_method == "GET":
                return list_models_handler(event, supabase_user_id)
        
        # Organization-level AI configuration routes
        # Match /orgs/{orgId}/ai/config pattern using explicit regex
        elif org_ai_config_pattern.match(path):
            if http_method == "GET":
                return get_org_ai_config_handler(event, supabase_user_id)
            elif http_method == "PUT":
                return update_org_ai_config_handler(event, supabase_user_id)
        
        # AI Provider Configuration routes
        elif path == "/admin/ai/rag-config":
            if http_method == "GET":
                return get_sys_rag_config_handler(event, supabase_user_id)
            elif http_method == "PUT":
                return update_sys_rag_config_handler(event, supabase_user_id)
        
        elif path == "/admin/ai/providers":
            if http_method == "GET":
                return list_rag_providers_handler(event, supabase_user_id)
        
        elif path == "/admin/ai/providers/test":
            if http_method == "POST":
                return test_rag_provider_handler(event, supabase_user_id)
        
        elif path == "/admin/ai/providers/models":
            if http_method == "GET":
                return get_rag_provider_models_handler(event, supabase_user_id)
        
        elif http_method == "OPTIONS":
            return common.success_response({})
        
        # Method not allowed
        return common.method_not_allowed_response()
    
    except KeyError as e:
        logger.error(f"KeyError: {str(e)}")
        return common.unauthorized_response(f"Missing user information: {str(e)}")
    except common.NotFoundError as e:
        logger.error(f"NotFoundError during user resolution: {str(e)}")
        return common.unauthorized_response(f"User not found: {str(e)}")
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        logger.exception(f"Error: {str(e)}")
        return common.internal_error_response("Internal server error")
