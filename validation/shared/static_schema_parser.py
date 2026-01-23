"""
Static Schema Parser

Parses SQL schema files to extract table and column definitions.
Used for template validation when no live database is available.

This is a shared component used by:
- schema-validator (for template validation)
- audit-column-validator (for ADR-015 compliance checking)
"""

import re
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any

from .schema_types import ColumnInfo, TableInfo

logger = logging.getLogger(__name__)


class StaticSchemaParser:
    """Parses SQL files to extract schema information."""
    
    def __init__(self):
        """Initialize static schema parser."""
        self._schema_cache: Optional[Dict[str, TableInfo]] = None
    
    def parse_sql_files(self, sql_paths: List[Path]) -> Dict[str, TableInfo]:
        """
        Parse multiple SQL files and extract schema.
        
        Args:
            sql_paths: List of paths to SQL files
            
        Returns:
            Dictionary mapping table names to TableInfo objects
        """
        schema: Dict[str, TableInfo] = {}
        
        for sql_path in sql_paths:
            if sql_path.is_file() and sql_path.suffix == '.sql':
                try:
                    tables = self._parse_sql_file(sql_path)
                    schema.update(tables)
                except Exception as e:
                    logger.warning(f"Failed to parse {sql_path}: {e}")
        
        self._schema_cache = schema
        logger.info(f"Static schema parsed: {len(schema)} tables found")
        return schema
    
    def parse_directory(self, directory: Path, recursive: bool = True) -> Dict[str, TableInfo]:
        """
        Parse all SQL files in a directory.
        
        Args:
            directory: Directory containing SQL files
            recursive: Whether to search recursively
            
        Returns:
            Dictionary mapping table names to TableInfo objects
        """
        sql_files = []
        
        if recursive:
            sql_files = list(directory.rglob('*.sql'))
        else:
            sql_files = list(directory.glob('*.sql'))
        
        # Sort files to ensure consistent order (numbered files like 001-, 002-)
        sql_files.sort()
        
        return self.parse_sql_files(sql_files)
    
    def _parse_sql_file(self, sql_path: Path) -> Dict[str, TableInfo]:
        """
        Parse a single SQL file.
        
        Args:
            sql_path: Path to SQL file
            
        Returns:
            Dictionary of tables found in the file
        """
        with open(sql_path, 'r') as f:
            content = f.read()
        
        tables = {}
        
        # Find all CREATE TABLE statements
        # Pattern handles: CREATE TABLE [IF NOT EXISTS] [schema.]table_name (...)
        create_table_pattern = re.compile(
            r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?'
            r'(?:(\w+)\.)?(\w+)\s*\('
            r'(.*?)'
            r'\)\s*;',
            re.IGNORECASE | re.DOTALL
        )
        
        for match in create_table_pattern.finditer(content):
            schema_name = match.group(1) or 'public'
            table_name = match.group(2)
            columns_str = match.group(3)
            
            # Skip non-public schema tables for simplicity
            # (CORA uses public schema)
            if schema_name.lower() != 'public':
                continue
            
            columns = self._parse_columns(columns_str)
            
            if columns:
                tables[table_name] = TableInfo(
                    name=table_name,
                    columns=columns
                )
                logger.debug(f"Parsed table '{table_name}' with {len(columns)} columns")
        
        return tables
    
    def _parse_columns(self, columns_str: str) -> Dict[str, ColumnInfo]:
        """
        Parse column definitions from CREATE TABLE body.
        
        Args:
            columns_str: String containing column definitions
            
        Returns:
            Dictionary mapping column names to ColumnInfo
        """
        columns = {}
        
        # Split by commas, but handle nested parentheses (for constraints)
        column_defs = self._split_column_definitions(columns_str)
        
        for col_def in column_defs:
            col_def = col_def.strip()
            
            # Skip constraints (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK, CONSTRAINT)
            if self._is_constraint(col_def):
                continue
            
            # Parse column definition
            col_info = self._parse_column_definition(col_def)
            if col_info:
                columns[col_info.name] = col_info
        
        return columns
    
    def _split_column_definitions(self, columns_str: str) -> List[str]:
        """
        Split column definitions by comma, respecting parentheses.
        
        Args:
            columns_str: String containing all column definitions
            
        Returns:
            List of individual column definition strings
        """
        definitions = []
        current = []
        paren_depth = 0
        
        for char in columns_str:
            if char == '(':
                paren_depth += 1
                current.append(char)
            elif char == ')':
                paren_depth -= 1
                current.append(char)
            elif char == ',' and paren_depth == 0:
                definitions.append(''.join(current))
                current = []
            else:
                current.append(char)
        
        # Don't forget the last one
        if current:
            definitions.append(''.join(current))
        
        return definitions
    
    def _is_constraint(self, col_def: str) -> bool:
        """
        Check if a definition is a constraint rather than a column.
        
        Args:
            col_def: Column or constraint definition
            
        Returns:
            True if it's a constraint
        """
        col_def_upper = col_def.strip().upper()
        
        constraint_keywords = [
            'PRIMARY KEY',
            'FOREIGN KEY',
            'UNIQUE',
            'CHECK',
            'CONSTRAINT',
            'EXCLUDE',
        ]
        
        for keyword in constraint_keywords:
            if col_def_upper.startswith(keyword):
                return True
        
        return False
    
    def _parse_column_definition(self, col_def: str) -> Optional[ColumnInfo]:
        """
        Parse a single column definition.
        
        Args:
            col_def: Column definition string (e.g., "id UUID NOT NULL DEFAULT gen_random_uuid()")
            
        Returns:
            ColumnInfo or None if parsing failed
        """
        # Clean up the definition
        col_def = col_def.strip()
        if not col_def:
            return None
        
        # Remove line comments
        col_def = re.sub(r'--.*$', '', col_def, flags=re.MULTILINE).strip()
        
        # Pattern to extract column name and type
        # Handles: column_name TYPE [NULL|NOT NULL] [DEFAULT ...] [CONSTRAINT ...]
        pattern = re.compile(
            r'^(\w+)\s+'  # Column name
            r'([A-Za-z_][A-Za-z0-9_\[\]\(\),\s]*?)'  # Data type (with optional params like VARCHAR(255))
            r'(?:\s+(NOT\s+NULL|NULL))?'  # Nullable
            r'(?:\s+DEFAULT\s+(.+?))?'  # Default value
            r'(?:\s+(?:CONSTRAINT|PRIMARY|UNIQUE|REFERENCES|CHECK).*)?$',  # Trailing constraints
            re.IGNORECASE
        )
        
        match = pattern.match(col_def)
        if not match:
            # Try simpler pattern for basic columns
            simple_pattern = re.compile(r'^(\w+)\s+(\w+)', re.IGNORECASE)
            simple_match = simple_pattern.match(col_def)
            if simple_match:
                col_name = simple_match.group(1)
                data_type = simple_match.group(2)
                
                # Check for NOT NULL in the rest
                is_nullable = 'NOT NULL' not in col_def.upper()
                
                # Extract default if present
                default_match = re.search(r'DEFAULT\s+(.+?)(?:\s+(?:NOT\s+)?NULL|\s*$)', col_def, re.IGNORECASE)
                default_value = default_match.group(1).strip() if default_match else None
                
                return ColumnInfo(
                    name=col_name,
                    data_type=data_type.upper(),
                    is_nullable=is_nullable,
                    column_default=default_value
                )
            return None
        
        col_name = match.group(1)
        data_type = match.group(2).strip().upper()
        nullable_str = match.group(3)
        default_value = match.group(4)
        
        # Determine nullability (default is nullable unless NOT NULL specified)
        is_nullable = True
        if nullable_str and 'NOT' in nullable_str.upper():
            is_nullable = False
        
        # Clean up default value
        if default_value:
            default_value = default_value.strip().rstrip(',')
        
        return ColumnInfo(
            name=col_name,
            data_type=data_type,
            is_nullable=is_nullable,
            column_default=default_value
        )
    
    def get_table(self, table_name: str) -> Optional[TableInfo]:
        """
        Get information about a specific table.
        
        Args:
            table_name: Name of the table
            
        Returns:
            TableInfo if table exists, None otherwise
        """
        if self._schema_cache is None:
            return None
        return self._schema_cache.get(table_name)
    
    def table_exists(self, table_name: str) -> bool:
        """Check if a table exists in the schema."""
        if self._schema_cache is None:
            return False
        return table_name in self._schema_cache
    
    def column_exists(self, table_name: str, column_name: str) -> bool:
        """Check if a column exists in a table."""
        table = self.get_table(table_name)
        if not table:
            return False
        return column_name in table.columns
    
    def get_all_tables(self) -> List[str]:
        """Get list of all table names."""
        if self._schema_cache is None:
            return []
        return list(self._schema_cache.keys())
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Export schema as dictionary (for JSON serialization).
        AI-friendly format for programmatic access.
        """
        if self._schema_cache is None:
            return {}
        
        return {
            table_name: {
                'name': table.name,
                'columns': {
                    col_name: {
                        'name': col.name,
                        'data_type': col.data_type,
                        'is_nullable': col.is_nullable,
                        'column_default': col.column_default
                    }
                    for col_name, col in table.columns.items()
                }
            }
            for table_name, table in self._schema_cache.items()
        }


def find_schema_sql_files(base_path: Path) -> List[Path]:
    """
    Find all schema SQL files in a CORA project or toolkit.
    
    Args:
        base_path: Base path to search from
        
    Returns:
        List of SQL file paths
    """
    sql_files = []
    
    # Search patterns for CORA schema files
    search_patterns = [
        # Real projects: packages/*/db/schema/*.sql
        'packages/*/db/schema/*.sql',
        # Toolkit templates: templates/_modules-*/*/db/schema/*.sql
        'templates/_modules-core/*/db/schema/*.sql',
        'templates/_modules-functional/*/db/schema/*.sql',
    ]
    
    for pattern in search_patterns:
        found = list(base_path.glob(pattern))
        sql_files.extend(found)
    
    # Remove duplicates and sort
    sql_files = sorted(set(sql_files))
    
    logger.info(f"Found {len(sql_files)} schema SQL files")
    return sql_files


def load_static_schema(base_path: str) -> Dict[str, TableInfo]:
    """
    Convenience function to load schema from SQL files.
    
    Args:
        base_path: Base path to project or toolkit
        
    Returns:
        Dictionary of table schemas
    """
    base_path = Path(base_path)
    sql_files = find_schema_sql_files(base_path)
    
    if not sql_files:
        logger.warning(f"No schema SQL files found in {base_path}")
        return {}
    
    parser = StaticSchemaParser()
    return parser.parse_sql_files(sql_files)


if __name__ == '__main__':
    # Test static schema parsing
    import sys
    
    logging.basicConfig(level=logging.DEBUG)
    
    if len(sys.argv) > 1:
        path = Path(sys.argv[1])
    else:
        # Default to toolkit root
        path = Path(__file__).parent.parent.parent
    
    print(f"\nParsing schema from: {path}\n")
    
    schema = load_static_schema(str(path))
    
    print(f"Found {len(schema)} tables:\n")
    
    for table_name, table_info in sorted(schema.items()):
        print(f"  {table_name}:")
        for col_name, col_info in table_info.columns.items():
            nullable = "NULL" if col_info.is_nullable else "NOT NULL"
            default = f" DEFAULT {col_info.column_default}" if col_info.column_default else ""
            print(f"    - {col_name}: {col_info.data_type} {nullable}{default}")
        print()
