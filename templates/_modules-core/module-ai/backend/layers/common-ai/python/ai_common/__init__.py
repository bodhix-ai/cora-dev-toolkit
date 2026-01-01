"""
AI Configuration Module - Shared Layer

Provides common models, validators, and utilities for AI configuration management.
"""

from .models import PlatformAIConfig, OrgAIConfig
from .validators import (
    validate_model_id, 
    validate_model_capabilities, 
    validate_platform_config,
    validate_deployment_id,  # Backwards compatibility
    validate_deployment_capabilities  # Backwards compatibility
)
from .types import DeploymentCapability

__all__ = [
    "PlatformAIConfig",
    "OrgAIConfig",
    "validate_model_id",
    "validate_model_capabilities",
    "validate_platform_config",
    "validate_deployment_id",  # Backwards compatibility
    "validate_deployment_capabilities",  # Backwards compatibility
    "DeploymentCapability",
]
