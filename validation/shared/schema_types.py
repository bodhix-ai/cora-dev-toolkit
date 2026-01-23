"""
CORA Validation Schema Types

Common dataclasses used across validators for schema representation.
These types are shared between:
- schema-validator (live DB introspection)
- audit-column-validator (ADR-015 compliance)
- Any future validators that need schema information
"""

from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class ColumnInfo:
    """Information about a database column."""
    name: str
    data_type: str
    is_nullable: bool
    column_default: Optional[str]


@dataclass
class TableInfo:
    """Information about a database table."""
    name: str
    columns: Dict[str, ColumnInfo]
