#!/usr/bin/env python3
"""
CORA Audit Column Compliance Validator
======================================

Validates that module entity tables comply with ADR-015:
Module Entity Audit Columns and Soft Delete Standard

Usage:
    python scripts/validate-audit-columns.py

Checks:
- Required audit columns present (created_at, created_by, updated_at, updated_by)
- Required soft delete columns present (is_deleted, deleted_at, deleted_by)
- Correct data types and constraints
- Required indexes exist
- Consistency triggers exist

See: docs/arch decisions/ADR-015-MODULE-ENTITY-AUDIT-COLUMNS.md
"""

import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Set, Optional

# Import shared schema parser
sys.path.insert(0, str(Path(__file__).parent.parent))
from shared.static_schema_parser import StaticSchemaParser, find_schema_sql_files
from shared.schema_types import ColumnInfo, TableInfo

# Import shared output format utilities (with fallback for backward compatibility)
try:
    from validation.shared.output_format import (
        create_error,
        create_warning,
        extract_module_from_path,
        SEVERITY_HIGH,
        SEVERITY_MEDIUM,
    )
    SHARED_FORMAT_AVAILABLE = True
except ImportError:
    SHARED_FORMAT_AVAILABLE = False
    
    # Fallback functions for backward compatibility
    def create_error(file, line, message, category="Audit Columns", suggestion=None, module=None):
        return {
            "file": file,
            "line": line,
            "message": message,
            "severity": "high",
            "category": category,
            "suggestion": suggestion,
            "module": module,
        }
    
    def create_warning(file, line, message, category="Audit Columns", suggestion=None, module=None):
        return {
            "file": file,
            "line": line,
            "message": message,
            "severity": "medium",
            "category": category,
            "suggestion": suggestion,
            "module": module,
        }
    
    def extract_module_from_path(file_path):
        """Extract module name from file path."""
        if not file_path:
            return None
        
        # Try to extract module name from path
        match = re.search(r'module-([a-z]+)', str(file_path))
        if match:
            return f"module-{match.group(1)}"
        return None
    
    SEVERITY_HIGH = "high"
    SEVERITY_MEDIUM = "medium"

# ANSI color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

# Required audit columns per ADR-015
REQUIRED_AUDIT_COLUMNS = {
    'created_at': {
        'type': 'TIMESTAMPTZ',
        'nullable': False,
        'default': 'NOW()'
    },
    'created_by': {
        'type': 'UUID',
        'nullable': False,
        'references': 'auth.users(id)'
    },
    'updated_at': {
        'type': 'TIMESTAMPTZ',
        'nullable': False,
        'default': 'NOW()'
    },
    'updated_by': {
        'type': 'UUID',
        'nullable': True,
        'references': 'auth.users(id)'
    },
    'is_deleted': {
        'type': 'BOOLEAN',
        'nullable': False,
        'default': 'false'
    },
    'deleted_at': {
        'type': 'TIMESTAMPTZ',
        'nullable': True
    },
    'deleted_by': {
        'type': 'UUID',
        'nullable': True,
        'references': 'auth.users(id)'
    }
}

# Tables that should be EXCLUDED from audit column requirements
# (junction tables, log tables, config tables, etc.)
EXCLUDED_TABLE_PATTERNS = [
    r'_log_',           # Log tables
    r'_cfg_',           # Config tables
    r'_hist_',          # History tables
    r'_usage_',         # Usage tracking tables
    r'_state_',         # State/progress tables
    r'_queue_',         # Queue tables
    r'.*_.*_.*',        # Junction tables (3+ underscores, likely many-to-many)
    r'.*_favorites$',   # Favorites/bookmarks (simple relations)
    r'.*_shares$',      # Share relations
]

# Module entity tables that MUST have audit columns
# (Core module entity tables representing primary business objects)
ENTITY_TABLE_PATTERNS = [
    r'workspaces$',
    r'.*_sessions$',     # voice_sessions, chat_sessions, etc.
    r'.*_docs$',         # kb_docs, etc.
    r'.*_bases$',        # kb_bases, etc.
    r'.*_summaries$',    # eval_doc_summaries, etc.
    r'orgs$',
    r'.*_members$',      # org_members, ws_members, etc.
]


def _standardize_non_compliant_table(result: Dict, project_root: Path):
    """
    Convert a non-compliant table result to standard format error.
    
    Args:
        result: Non-compliant table result dict
        project_root: Base path for making relative paths
        
    Returns:
        Dict in standard format
    """
    module = extract_module_from_path(result['file'])
    
    # Build comprehensive message
    issues = []
    if result.get('missing_columns'):
        issues.append(f"Missing columns: {', '.join(result['missing_columns'])}")
    if result.get('incorrect_columns'):
        for col_info in result['incorrect_columns']:
            issues.append(f"{col_info['column']}: {'; '.join(col_info['issues'])}")
    if result.get('missing_indexes'):
        issues.append(f"Missing indexes: {', '.join(result['missing_indexes'])}")
    if result.get('missing_triggers'):
        issues.append(f"Missing triggers: {', '.join(result['missing_triggers'])}")
    
    message = f"{result['table']}: {'; '.join(issues)}"
    
    return create_error(
        file=result['file'],
        line=0,
        message=message,
        category="Audit Columns",
        suggestion="Review ADR-015 for audit column requirements",
        module=module,
    )


def _standardize_warning(warning_msg: str):
    """Convert warning string to standard format."""
    return create_warning(
        file="",
        line=0,
        message=warning_msg,
        category="Audit Columns",
        module=None,
    )


class AuditColumnValidator:
    """Validates CORA module tables for audit column compliance."""
    
    def __init__(self, templates_dir: str = "templates"):
        self.templates_dir = Path(templates_dir)
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.compliant_tables: List[str] = []
        self.non_compliant_tables: List[Dict] = []
        
    def is_excluded_table(self, table_name: str) -> bool:
        """Check if table should be excluded from audit column requirements."""
        for pattern in EXCLUDED_TABLE_PATTERNS:
            if re.match(pattern, table_name):
                return True
        return False
    
    def is_entity_table(self, table_name: str) -> bool:
        """Check if table is a module entity table that requires audit columns."""
        for pattern in ENTITY_TABLE_PATTERNS:
            if re.match(pattern, table_name):
                return True
        return False
    
    def extract_table_definitions(self, sql_file: Path) -> List[Dict]:
        """Extract CREATE TABLE statements from SQL file using shared parser."""
        try:
            content = sql_file.read_text()
        except Exception as e:
            self.warnings.append(f"Could not read {sql_file}: {e}")
            return []
        
        # Use shared static schema parser
        parser = StaticSchemaParser()
        schema = parser._parse_sql_file(sql_file)
        
        tables = []
        
        for table_name, table_info in schema.items():
            # Convert shared schema types to audit validator format
            columns = {}
            for col_name, col_info in table_info.columns.items():
                # Extract REFERENCES if present - escape data_type for regex safety
                references = None
                # Escape the data_type to handle parentheses in types like VARCHAR(255)
                escaped_type = re.escape(col_info.data_type)
                ref_pattern = rf'{col_name}\s+{escaped_type}.*?REFERENCES\s+([\w\.]+\(\w+\))'
                ref_match = re.search(ref_pattern, content, re.IGNORECASE | re.DOTALL)
                if ref_match:
                    references = ref_match.group(1).strip()
                
                columns[col_name] = {
                    'type': col_info.data_type,
                    'nullable': col_info.is_nullable,
                    'default': col_info.column_default,
                    'references': references
                }
            
            # Extract indexes from file
            indexes = self._extract_indexes(content, table_name)
            
            # Extract triggers from file
            triggers = self._extract_triggers(content, table_name)
            
            tables.append({
                'name': table_name,
                'file': str(sql_file),
                'columns': columns,
                'indexes': indexes,
                'triggers': triggers
            })
        
        return tables
    
    def _extract_indexes(self, content: str, table_name: str) -> List[str]:
        """Extract index names for a table."""
        indexes = []
        pattern = rf'CREATE\s+INDEX\s+(\w+)\s+ON\s+(?:public\.)?{table_name}'
        matches = re.finditer(pattern, content, re.IGNORECASE)
        for match in matches:
            indexes.append(match.group(1))
        return indexes
    
    def _extract_triggers(self, content: str, table_name: str) -> List[str]:
        """Extract trigger names for a table."""
        triggers = []
        pattern = rf'CREATE\s+TRIGGER\s+(\w+)\s+.*\s+ON\s+(?:public\.)?{table_name}'
        matches = re.finditer(pattern, content, re.IGNORECASE)
        for match in matches:
            triggers.append(match.group(1))
        return triggers
    
    def validate_table(self, table: Dict) -> Dict:
        """Validate a single table for audit column compliance."""
        table_name = table['name']
        columns = table['columns']
        
        # Check if table should be excluded
        if self.is_excluded_table(table_name):
            return {
                'compliant': True,
                'reason': 'excluded',
                'table': table_name
            }
        
        # Check if it's an entity table that requires audit columns
        if not self.is_entity_table(table_name):
            return {
                'compliant': True,
                'reason': 'not_entity_table',
                'table': table_name
            }
        
        # Validate required columns
        missing_columns = []
        incorrect_columns = []
        
        for col_name, requirements in REQUIRED_AUDIT_COLUMNS.items():
            if col_name not in columns:
                missing_columns.append(col_name)
                continue
            
            col_def = columns[col_name]
            issues = []
            
            # Check type
            if col_def['type'] != requirements['type']:
                issues.append(f"type: expected {requirements['type']}, got {col_def['type']}")
            
            # Check nullable
            if col_def['nullable'] != requirements['nullable']:
                nullable_str = "NULL" if requirements['nullable'] else "NOT NULL"
                issues.append(f"nullable: expected {nullable_str}")
            
            # Check references (if applicable)
            if 'references' in requirements:
                if not col_def['references'] or requirements['references'] not in col_def['references']:
                    issues.append(f"references: expected {requirements['references']}")
            
            if issues:
                incorrect_columns.append({
                    'column': col_name,
                    'issues': issues
                })
        
        # Check for required indexes
        missing_indexes = []
        expected_indexes = [
            f'idx_{table_name}_is_deleted',
            f'idx_{table_name}_ws_not_deleted'  # If table has ws_id
        ]
        
        if 'ws_id' in columns:
            for idx in expected_indexes:
                if idx not in table['indexes']:
                    missing_indexes.append(idx)
        else:
            # Only check basic is_deleted index
            if expected_indexes[0] not in table['indexes']:
                missing_indexes.append(expected_indexes[0])
        
        # Check for consistency trigger
        missing_triggers = []
        expected_trigger = f'{table_name}_sync_is_deleted'
        if expected_trigger not in table['triggers'] and f'sync_{table_name}_is_deleted' not in table['triggers']:
            missing_triggers.append(expected_trigger)
        
        # Determine compliance
        is_compliant = (
            not missing_columns and 
            not incorrect_columns and
            not missing_indexes and
            not missing_triggers
        )
        
        return {
            'compliant': is_compliant,
            'table': table_name,
            'file': table['file'],
            'missing_columns': missing_columns,
            'incorrect_columns': incorrect_columns,
            'missing_indexes': missing_indexes,
            'missing_triggers': missing_triggers
        }
    
    def scan_module_schemas(self) -> None:
        """Scan all module schema files for compliance."""
        print(f"{BLUE}Scanning module schema files for audit column compliance...{RESET}\n")
        
        # Determine if we're scanning templates (toolkit) or packages (project)
        is_project = False
        schema_dirs = []
        
        # Check if this is a project directory with packages
        packages_dir = self.templates_dir.parent / "packages" if self.templates_dir.name == "templates" else self.templates_dir / "packages"
        if packages_dir.exists():
            # This is a project - scan packages
            is_project = True
            for module_dir in packages_dir.glob("module-*"):
                if module_dir.is_dir():
                    schema_path = module_dir / "db" / "schema"
                    if schema_path.exists():
                        schema_dirs.append(schema_path)
        else:
            # This is the toolkit - scan template modules
            schema_dirs = [
                self.templates_dir / "_modules-core",
                self.templates_dir / "_modules-functional"
            ]
        
        if not schema_dirs:
            self.warnings.append("No module schema directories found")
            return
        
        # Scan schema directories
        for schema_dir in schema_dirs:
            if not schema_dir.exists():
                self.warnings.append(f"Schema directory not found: {schema_dir}")
                continue
            
            if is_project:
                # Project mode: schema_dir is already packages/module-*/db/schema
                for sql_file in schema_dir.glob("*.sql"):
                    tables = self.extract_table_definitions(sql_file)
                    
                    for table in tables:
                        result = self.validate_table(table)
                        
                        if result['compliant']:
                            if result.get('reason') != 'excluded' and result.get('reason') != 'not_entity_table':
                                self.compliant_tables.append(result['table'])
                        else:
                            self.non_compliant_tables.append(result)
            else:
                # Toolkit mode: schema_dir is templates/_modules-core or _modules-functional
                # Find all SQL files in module schema directories
                for module_dir in schema_dir.iterdir():
                    if not module_dir.is_dir():
                        continue
                    
                    schema_path = module_dir / "db" / "schema"
                    if not schema_path.exists():
                        continue
                    
                    for sql_file in schema_path.glob("*.sql"):
                        tables = self.extract_table_definitions(sql_file)
                        
                        for table in tables:
                            result = self.validate_table(table)
                            
                            if result['compliant']:
                                if result.get('reason') != 'excluded' and result.get('reason') != 'not_entity_table':
                                    self.compliant_tables.append(result['table'])
                            else:
                                self.non_compliant_tables.append(result)
    
    def print_report(self) -> None:
        """Print validation report."""
        print(f"\n{'='*70}")
        print(f"{BLUE}CORA Audit Column Compliance Report{RESET}")
        print(f"{'='*70}\n")
        
        # Compliant tables
        if self.compliant_tables:
            print(f"{GREEN}✅ COMPLIANT TABLES ({len(self.compliant_tables)}):{ RESET}")
            for table in sorted(self.compliant_tables):
                print(f"  ✓ {table}")
            print()
        
        # Non-compliant tables
        if self.non_compliant_tables:
            print(f"{RED}❌ NON-COMPLIANT TABLES ({len(self.non_compliant_tables)}):{ RESET}\n")
            
            for result in self.non_compliant_tables:
                print(f"{YELLOW}Table: {result['table']}{RESET}")
                print(f"File: {result['file']}")
                
                if result['missing_columns']:
                    print(f"  {RED}Missing columns:{RESET}")
                    for col in result['missing_columns']:
                        req = REQUIRED_AUDIT_COLUMNS[col]
                        print(f"    - {col} ({req['type']})")
                
                if result['incorrect_columns']:
                    print(f"  {RED}Incorrect columns:{RESET}")
                    for col_info in result['incorrect_columns']:
                        print(f"    - {col_info['column']}:")
                        for issue in col_info['issues']:
                            print(f"        {issue}")
                
                if result['missing_indexes']:
                    print(f"  {YELLOW}Missing indexes:{RESET}")
                    for idx in result['missing_indexes']:
                        print(f"    - {idx}")
                
                if result['missing_triggers']:
                    print(f"  {YELLOW}Missing triggers:{RESET}")
                    for trigger in result['missing_triggers']:
                        print(f"    - {trigger}")
                
                print()
        
        # Warnings
        if self.warnings:
            print(f"{YELLOW}⚠️  WARNINGS ({len(self.warnings)}):{ RESET}")
            for warning in self.warnings:
                print(f"  ! {warning}")
            print()
        
        # Summary
        print(f"{'='*70}")
        total = len(self.compliant_tables) + len(self.non_compliant_tables)
        compliance_rate = (len(self.compliant_tables) / total * 100) if total > 0 else 0
        
        print(f"Total Entity Tables: {total}")
        print(f"Compliant: {GREEN}{len(self.compliant_tables)}{RESET}")
        print(f"Non-Compliant: {RED}{len(self.non_compliant_tables)}{RESET}")
        print(f"Compliance Rate: {compliance_rate:.1f}%")
        print(f"{'='*70}\n")
        
        # Reference
        print(f"{BLUE}Reference:{RESET}")
        print(f"  ADR-015: docs/arch decisions/ADR-015-MODULE-ENTITY-AUDIT-COLUMNS.md")
        print(f"  Standard: docs/standards/standard_DATABASE-NAMING.md (Rule 8)")
        print()
    
    def get_exit_code(self) -> int:
        """Return appropriate exit code."""
        if self.non_compliant_tables:
            return 1
        return 0


def main():
    """Main entry point."""
    import argparse
    import json
    
    parser = argparse.ArgumentParser(
        description="CORA Audit Column Compliance Validator"
    )
    parser.add_argument(
        "path",
        nargs="?",
        help="Path to validate (project or module directory)"
    )
    parser.add_argument(
        "--format",
        choices=["text", "json"],
        default="text",
        help="Output format"
    )
    
    args = parser.parse_args()
    
    # Determine templates directory or project directory
    if args.path:
        # Path provided - check if it's a project or module
        target_path = Path(args.path)
        if not target_path.exists():
            print(f"{RED}Error: Path not found: {args.path}{RESET}")
            sys.exit(1)
        
        # Check if it's the templates directory itself
        if target_path.name == "templates":
            templates_dir = target_path
        # Check if it's a module directory
        elif (target_path / "db" / "schema").exists():
            # This is a module - not yet supported for individual validation
            print(f"{RED}Error: Module-level validation not yet implemented{RESET}")
            sys.exit(1)
        # Check if it's a project directory with packages
        elif (target_path / "packages").exists():
            # This is a project - use it directly
            # The validator will detect packages and scan them
            templates_dir = target_path
        # Check if it's a toolkit directory with templates
        elif (target_path / "templates").exists():
            templates_dir = target_path / "templates"
        else:
            print(f"{RED}Error: Could not find templates or packages directory in {args.path}{RESET}")
            sys.exit(1)
    else:
        # No path provided - find templates relative to script location
        script_dir = Path(__file__).parent
        project_root = script_dir.parent.parent  # audit-column-validator -> validation -> project root
        templates_dir = project_root / "templates"
    
    # Validate the path exists
    # For toolkit: templates_dir should be the templates directory
    # For project: templates_dir should be the project root (which has packages/)
    if not templates_dir.exists():
        print(f"{RED}Error: Directory not found: {templates_dir}{RESET}")
        sys.exit(1)
    
    # Create validator and run
    validator = AuditColumnValidator(str(templates_dir))
    validator.scan_module_schemas()
    
    # Output results
    if args.format == "json":
        # Standardize to new format
        standardized_errors = [
            _standardize_non_compliant_table(r, templates_dir)
            for r in validator.non_compliant_tables
        ]
        
        standardized_warnings = [
            _standardize_warning(w)
            for w in validator.warnings
        ]
        
        result = {
            "passed": validator.get_exit_code() == 0,
            "errors": standardized_errors,
            "warnings": standardized_warnings,
            "summary": {
                "total_tables": len(validator.compliant_tables) + len(validator.non_compliant_tables),
                "compliant": len(validator.compliant_tables),
                "non_compliant": len(validator.non_compliant_tables),
                "compliance_rate": (len(validator.compliant_tables) / (len(validator.compliant_tables) + len(validator.non_compliant_tables)) * 100)
                if (len(validator.compliant_tables) + len(validator.non_compliant_tables)) > 0 else 0
            }
        }
        print(json.dumps(result, indent=2))
    else:
        # Text output (colored report)
        validator.print_report()
    
    sys.exit(validator.get_exit_code())


if __name__ == "__main__":
    main()
