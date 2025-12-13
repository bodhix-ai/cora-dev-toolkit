"""
AI Configuration Types

Defines enums and type definitions for AI configuration.
"""

from enum import Enum


class DeploymentCapability(str, Enum):
    """Model deployment capabilities."""
    
    EMBEDDING = "embedding"
    CHAT = "chat"
    BOTH = "both"
