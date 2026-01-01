"""
AI Configuration Validators

Validation functions for AI configuration settings.
Updated to use ai_models table with JSONB capabilities.
"""

import json
import logging
from typing import Tuple, Optional
from .types import DeploymentCapability

logger = logging.getLogger()


def validate_model_id(
    supabase_client,
    model_id: str
) -> Tuple[bool, Optional[str], Optional[dict]]:
    """
    Validate that a model ID exists in the ai_models table.
    
    Args:
        supabase_client: Supabase client instance
        model_id: UUID of the model to validate
        
    Returns:
        Tuple of (is_valid, error_message, model_data)
    """
    try:
        result = supabase_client.table("ai_models").select(
            "id, display_name, model_id, provider_id, capabilities, status"
        ).eq("id", model_id).limit(1).execute()
        
        if not result.data or len(result.data) == 0:
            return False, f"Model ID {model_id} not found", None
        
        model = result.data[0]
        
        # Check model status
        status = model.get("status", "unknown")
        if status not in ["available", "testing"]:
            logger.warning(
                f"Model {model_id} has status '{status}' but allowing configuration"
            )
        
        return True, None, model
        
    except Exception as e:
        logger.error(f"Error validating model ID {model_id}: {str(e)}")
        return False, f"Error validating model: {str(e)}", None


def validate_model_capabilities(
    model_data: dict,
    required_capability: DeploymentCapability
) -> Tuple[bool, Optional[str]]:
    """
    Validate that a model has the required capabilities.
    
    Args:
        model_data: Model data from ai_models table with JSONB capabilities
        required_capability: Required capability (embedding, chat, or both)
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        # Parse capabilities from JSONB field
        capabilities_raw = model_data.get("capabilities", {})
        if isinstance(capabilities_raw, str):
            capabilities = json.loads(capabilities_raw)
        else:
            capabilities = capabilities_raw
        
        supports_embeddings = capabilities.get("embedding", False)
        supports_chat = capabilities.get("chat", False)
        model_name = model_data.get("display_name", "Unknown")
        
        if required_capability == DeploymentCapability.EMBEDDING:
            if not supports_embeddings:
                return False, f"Model '{model_name}' does not support embeddings"
        
        elif required_capability == DeploymentCapability.CHAT:
            if not supports_chat:
                return False, f"Model '{model_name}' does not support chat"
        
        elif required_capability == DeploymentCapability.BOTH:
            if not (supports_embeddings and supports_chat):
                return False, f"Model '{model_name}' does not support both embeddings and chat"
        
        return True, None
        
    except Exception as e:
        logger.error(f"Error validating model capabilities: {str(e)}")
        return False, f"Error validating capabilities: {str(e)}"


def validate_platform_config(
    supabase_client,
    embedding_model_id: str,
    chat_model_id: str
) -> Tuple[bool, Optional[str]]:
    """
    Validate complete platform configuration.
    
    Ensures both embedding and chat models exist and have correct capabilities.
    
    Args:
        supabase_client: Supabase client instance
        embedding_model_id: UUID of embedding model
        chat_model_id: UUID of chat model
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Validate embedding model
    is_valid, error_msg, embedding_model = validate_model_id(
        supabase_client, embedding_model_id
    )
    if not is_valid:
        return False, f"Invalid embedding model: {error_msg}"
    
    is_valid, error_msg = validate_model_capabilities(
        embedding_model, DeploymentCapability.EMBEDDING
    )
    if not is_valid:
        return False, error_msg
    
    # Validate chat model
    is_valid, error_msg, chat_model = validate_model_id(
        supabase_client, chat_model_id
    )
    if not is_valid:
        return False, f"Invalid chat model: {error_msg}"
    
    is_valid, error_msg = validate_model_capabilities(
        chat_model, DeploymentCapability.CHAT
    )
    if not is_valid:
        return False, error_msg
    
    return True, None


# Backwards compatibility aliases
validate_deployment_id = validate_model_id
validate_deployment_capabilities = validate_model_capabilities
