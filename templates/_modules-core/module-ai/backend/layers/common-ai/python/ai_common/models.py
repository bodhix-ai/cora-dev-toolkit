"""
AI Configuration Models

Pydantic models for AI configuration validation and serialization.
"""

from typing import Optional
from pydantic import BaseModel, Field, UUID4


class PlatformAIConfig(BaseModel):
    """
    Platform-level AI configuration.
    
    This configuration defines the default AI models and system prompts
    used across the entire platform.
    """
    
    default_embedding_model_id: UUID4 = Field(
        ...,
        description="UUID of the default embedding model from ai_models table"
    )
    
    default_chat_model_id: UUID4 = Field(
        ...,
        description="UUID of the default chat model from ai_models table"
    )
    
    system_prompt: Optional[str] = Field(
        None,
        description="Platform-wide system prompt for chat interactions"
    )
    
    class Config:
        """Pydantic configuration."""
        json_schema_extra = {
            "example": {
                "default_embedding_model_id": "123e4567-e89b-12d3-a456-426614174000",
                "default_chat_model_id": "123e4567-e89b-12d3-a456-426614174001",
                "system_prompt": "You are PolicyMind AI, an intelligent assistant..."
            }
        }


class OrgAIConfig(BaseModel):
    """
    Organization-level AI configuration.
    
    This configuration allows organizations to override certain platform-level
    settings, such as adding custom system prompts.
    """
    
    org_id: UUID4 = Field(
        ...,
        description="UUID of the organization"
    )
    
    org_system_prompt: Optional[str] = Field(
        None,
        description="Organization-specific system prompt to append to platform prompt"
    )
    
    class Config:
        """Pydantic configuration."""
        json_schema_extra = {
            "example": {
                "org_id": "123e4567-e89b-12d3-a456-426614174002",
                "org_system_prompt": "Additional context specific to this organization..."
            }
        }


class ModelInfo(BaseModel):
    """
    Model information from ai_models table.
    
    Used for validation and display purposes.
    """
    
    id: UUID4
    display_name: str
    model_id: str
    provider_id: UUID4
    capabilities: dict
    status: str = "available"
    
    class Config:
        """Pydantic configuration."""
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "display_name": "Text Embedding 3 Small (OpenAI)",
                "model_id": "text-embedding-3-small",
                "provider_id": "123e4567-e89b-12d3-a456-426614174003",
                "capabilities": {
                    "embedding": True,
                    "chat": False,
                    "embedding_dimensions": 1536
                },
                "status": "available"
            }
        }


# Backwards compatibility alias
DeploymentInfo = ModelInfo
