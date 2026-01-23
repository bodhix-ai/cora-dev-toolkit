"""
CORA Validation Shared Components

Shared utilities and parsers used across multiple validators.

Components:
- schema_types: Common dataclasses for schema representation
- static_schema_parser: SQL file parser for schema extraction
"""

__version__ = "1.0.0"

from .schema_types import ColumnInfo, TableInfo
from .static_schema_parser import StaticSchemaParser, find_schema_sql_files, load_static_schema

__all__ = [
    'ColumnInfo',
    'TableInfo',
    'StaticSchemaParser',
    'find_schema_sql_files',
    'load_static_schema',
]
