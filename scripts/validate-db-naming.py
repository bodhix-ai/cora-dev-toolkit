#!/usr/bin/env python3
"""
Database Naming Standards Validator

Validates SQL schema files against CORA database naming standards.
See: docs/standards/cora/standard_DATABASE-NAMING.md

Usage:
    python3 scripts/validate-db-naming.py <schema-file-or-directory>
    python3 scripts/validate-db-naming.py templates/_modules-core/module-ws/db/schema/
"""

import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple, Optional

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

# Documented prefix abbreviations (Rule 6)
DOCUMENTED_PREFIXES = {
    'ws_': 'workspace',
    'wf_': 'workflow',
    'cert_': 'certification',
    'org_': 'organization',
    'kb_': 'knowledge base',
    'chat_': 'chat',
    'ai_': 'AI provider',
    'sys_': 'system/management',
    'user_': 'user foundation',
}

# Specialized table infix patterns (Rule 8)
SPECIALIZED_TABLE_INFIXES = {
    '_cfg_': 'configuration',
    '_log_': 'log/audit',
    '_hist_': 'history',
    '_usage_': 'usage tracking',
    '_state_': 'state/progress',
    '_queue_': 'queue/job',
}

# Deprecated: Old namespace prefixes (Rule 7 - replaced by Rule 8)
# These are now handled by the _cfg_ infix pattern
DEPRECATED_NAMESPACE_PREFIXES = {
    'platform_': 'DEPRECATED - use sys_cfg_ instead',
    'app_': 'DEPRECATED - use {module}_cfg_ instead',
}

# Deprecated: Old suffix patterns (to be replaced by infix patterns)
DEPRECATED_SUFFIX_PATTERNS = {
    '_log': 'DEPRECATED - use {module}_log_{purpose} infix pattern instead',
    '_history': 'DEPRECATED - use {module}_hist_{entity} infix pattern instead',
    '_progress': 'DEPRECATED - use {module}_state_{process} infix pattern instead',
}

# Core tables that are allowed to be plural without prefixes
CORE_TABLES = {
    'orgs', 'users', 'profiles', 'resumes', 'workspaces', 'workflows',
    'certifications', 'campaigns', 'commitments', 'documents', 'conversations'
}

class ValidationResult:
    def __init__(self):
        self.errors: List[Tuple[str, int, str]] = []
        self.warnings: List[Tuple[str, int, str]] = []
        self.info: List[str] = []
        
    def add_error(self, file: str, line_num: int, message: str):
        self.errors.append((file, line_num, message))
        
    def add_warning(self, file: str, line_num: int, message: str):
        self.warnings.append((file, line_num, message))
        
    def add_info(self, message: str):
        self.info.append(message)
        
    def has_errors(self) -> bool:
        return len(self.errors) > 0
        
    def print_report(self):
        """Print validation report"""
        if self.info:
            print("\n" + "="*60)
            print("INFO")
            print("="*60)
            for msg in self.info:
                print(f"  {msg}")
        
        if self.warnings:
            print("\n" + "="*60)
            print(f"{YELLOW}WARNINGS{RESET}")
            print("="*60)
            for file, line, msg in self.warnings:
                print(f"  {YELLOW}⚠{RESET}  {file}:{line} - {msg}")
        
        if self.errors:
            print("\n" + "="*60)
            print(f"{RED}ERRORS{RESET}")
            print("="*60)
            for file, line, msg in self.errors:
                print(f"  {RED}❌{RESET} {file}:{line} - {msg}")
        
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        print(f"  Errors:   {len(self.errors)}")
        print(f"  Warnings: {len(self.warnings)}")
        
        if not self.errors and not self.warnings:
            print(f"\n{GREEN}✅ All checks passed!{RESET}\n")
            return 0
        elif not self.errors:
            print(f"\n{YELLOW}⚠  Validation passed with warnings{RESET}\n")
            return 0
        else:
            print(f"\n{RED}❌ Validation failed{RESET}\n")
            return 1


def is_plural(word: str) -> bool:
    """Check if a word is likely plural"""
    # Simple heuristic - words ending in 's', 'es', 'ies'
    if word.endswith('ies'):
        return True
    if word.endswith('es'):
        return True
    if word.endswith('s') and not word.endswith('ss'):
        return True
    return False


def extract_table_name(line: str) -> Optional[str]:
    """Extract table name from CREATE TABLE statement"""
    # Match: CREATE TABLE IF NOT EXISTS public.table_name
    # or: CREATE TABLE public.table_name
    # or: CREATE TABLE table_name
    match = re.search(
        r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_]+)',
        line,
        re.IGNORECASE
    )
    return match.group(1) if match else None


def extract_column_name(line: str) -> Optional[str]:
    """Extract column name from column definition"""
    # Match column definitions like: column_name TYPE
    # Skip constraints and other non-column lines
    if any(keyword in line.upper() for keyword in ['CONSTRAINT', 'PRIMARY KEY', 'FOREIGN KEY', 'CHECK', 'UNIQUE']):
        return None
    if line.strip().startswith('--'):
        return None
    
    match = re.match(r'\s+([a-z_][a-z0-9_]*)\s+', line, re.IGNORECASE)
    return match.group(1) if match else None


def extract_index_name(line: str) -> Optional[str]:
    """Extract index name from CREATE INDEX statement"""
    match = re.search(
        r'CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_]+)',
        line,
        re.IGNORECASE
    )
    return match.group(1) if match else None


def validate_table_name(table_name: str, result: ValidationResult, file: str, line_num: int):
    """Validate table naming (Rule 1, 2, 6, 8)"""
    # Check if it's a core table (allowed)
    if table_name in CORE_TABLES:
        return
    
    # Check for deprecated namespace prefixes (Rule 7)
    for deprecated_prefix, message in DEPRECATED_NAMESPACE_PREFIXES.items():
        if table_name.startswith(deprecated_prefix):
            result.add_error(
                file, line_num,
                f"Table '{table_name}': uses deprecated prefix '{deprecated_prefix}' - {message} (See ADR-011)"
            )
            return
    
    # Check for deprecated suffix patterns
    for deprecated_suffix, message in DEPRECATED_SUFFIX_PATTERNS.items():
        if table_name.endswith(deprecated_suffix):
            result.add_warning(
                file, line_num,
                f"Table '{table_name}': uses deprecated suffix pattern '{deprecated_suffix}' - {message} (See ADR-011)"
            )
            # Continue checking - this is a warning, not an error
    
    # Check if it's a specialized table (config, log, history, usage, state, queue)
    for infix, table_type in SPECIALIZED_TABLE_INFIXES.items():
        if infix in table_name:
            validate_specialized_table(table_name, infix, table_type, result, file, line_num)
            return
    
    # Check if it has a documented prefix
    has_prefix = False
    for prefix in DOCUMENTED_PREFIXES.keys():
        if table_name.startswith(prefix):
            has_prefix = True
            # Extract the main noun after prefix
            main_noun = table_name[len(prefix):]
            if not is_plural(main_noun):
                result.add_error(
                    file, line_num,
                    f"Table '{table_name}': main noun '{main_noun}' should be plural (Rule 2)"
                )
            return
    
    # No prefix - check if main table name is plural
    if not is_plural(table_name):
        result.add_error(
            file, line_num,
            f"Table '{table_name}': single-word table must be plural (Rule 1)"
        )


def validate_specialized_table(table_name: str, infix: str, table_type: str, result: ValidationResult, file: str, line_num: int):
    """Validate specialized table naming (Rule 8 - ADR-011)
    
    Patterns:
    - Config: {module}_cfg_{scope}_{purpose?}
    - Log: {module}_log_{purpose}
    - History: {module}_hist_{entity}_{detail?}
    - Usage: {module}_usage_{entity}_{granularity?}
    - State: {module}_state_{process}
    - Queue: {module}_queue_{purpose}
    """
    # Split on infix to get module and suffix parts
    parts = table_name.split(infix)
    
    if len(parts) != 2:
        result.add_error(
            file, line_num,
            f"{table_type.capitalize()} table '{table_name}': malformed {infix} pattern (Rule 8, ADR-011)"
        )
        return
    
    module_prefix = parts[0] + '_'  # Add back the underscore
    suffix = parts[1]
    
    # Validate module prefix is documented
    if module_prefix not in DOCUMENTED_PREFIXES:
        result.add_warning(
            file, line_num,
            f"{table_type.capitalize()} table '{table_name}': module prefix '{module_prefix}' not documented in Rule 6"
        )
    
    # Validate suffix is present
    if not suffix:
        result.add_error(
            file, line_num,
            f"{table_type.capitalize()} table '{table_name}': missing suffix after {infix}"
        )
        return
    
    # Special validation for config tables (has scope requirement)
    if infix == '_cfg_':
        # Extract scope (first part after _cfg_)
        scope_parts = suffix.split('_')
        scope = scope_parts[0] if scope_parts else ''
        
        # Validate scope is one of the allowed values
        valid_scopes = {'sys', 'org', 'ws', 'user'}
        if scope not in valid_scopes:
            result.add_error(
                file, line_num,
                f"Config table '{table_name}': invalid scope '{scope}' (must be one of: {', '.join(valid_scopes)})"
            )


def validate_column_name(column_name: str, result: ValidationResult, file: str, line_num: int):
    """Validate column naming (snake_case)"""
    if not re.match(r'^[a-z][a-z0-9_]*$', column_name):
        result.add_error(
            file, line_num,
            f"Column '{column_name}': must use snake_case (lowercase with underscores)"
        )
    
    # Check for camelCase
    if re.search(r'[a-z][A-Z]', column_name):
        result.add_error(
            file, line_num,
            f"Column '{column_name}': contains camelCase, use snake_case instead"
        )


def validate_foreign_key(line: str, result: ValidationResult, file: str, line_num: int):
    """Validate foreign key naming pattern"""
    # Match: column_id UUID REFERENCES table(id)
    match = re.search(
        r'([a-z_]+)\s+UUID.*REFERENCES\s+(?:public\.)?([a-z_]+)\(',
        line,
        re.IGNORECASE
    )
    if not match:
        return
    
    fk_column = match.group(1)
    referenced_table = match.group(2)
    
    # Foreign key should be {table_singular}_id
    if not fk_column.endswith('_id'):
        result.add_error(
            file, line_num,
            f"Foreign key '{fk_column}': should end with '_id' (Rule 3)"
        )
    
    # Extract table part (without _id)
    table_part = fk_column[:-3] if fk_column.endswith('_id') else fk_column
    
    # Check if it references the correct table
    # For prefixed tables, check both prefixed and unprefixed forms
    expected_forms = [
        referenced_table.rstrip('s'),  # Remove plural
        table_part
    ]
    
    # For prefixed tables
    for prefix in DOCUMENTED_PREFIXES.keys():
        if referenced_table.startswith(prefix):
            # ws_members → ws_member_id or member_id both acceptable
            base = referenced_table[len(prefix):].rstrip('s')
            expected_forms.append(f"{prefix.rstrip('_')}_{base}")
            expected_forms.append(base)
    
    if table_part not in expected_forms and referenced_table.rstrip('s') != table_part:
        result.add_warning(
            file, line_num,
            f"Foreign key '{fk_column}': expected to reference '{referenced_table}' (found '{table_part}_id')"
        )


def validate_index_name(index_name: str, result: ValidationResult, file: str, line_num: int):
    """Validate index naming pattern"""
    if not index_name.startswith('idx_'):
        result.add_error(
            file, line_num,
            f"Index '{index_name}': should start with 'idx_' (standard pattern)"
        )


def validate_sql_file(file_path: Path, result: ValidationResult):
    """Validate a single SQL file"""
    result.add_info(f"Validating: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        result.add_error(str(file_path), 0, f"Failed to read file: {e}")
        return
    
    for line_num, line in enumerate(lines, 1):
        # Check for table creation
        table_name = extract_table_name(line)
        if table_name:
            validate_table_name(table_name, result, str(file_path), line_num)
        
        # Check for column definitions
        column_name = extract_column_name(line)
        if column_name:
            validate_column_name(column_name, result, str(file_path), line_num)
        
        # Check for foreign keys
        if 'REFERENCES' in line.upper():
            validate_foreign_key(line, result, str(file_path), line_num)
        
        # Check for indexes
        index_name = extract_index_name(line)
        if index_name:
            validate_index_name(index_name, result, str(file_path), line_num)


def find_sql_files(path: Path) -> List[Path]:
    """Find all SQL files in path (file or directory)"""
    if path.is_file():
        return [path] if path.suffix == '.sql' else []
    elif path.is_dir():
        return sorted(path.rglob('*.sql'))
    else:
        return []


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/validate-db-naming.py <schema-file-or-directory>")
        print("\nExamples:")
        print("  python3 scripts/validate-db-naming.py templates/_modules-core/module-ws/db/schema/")
        print("  python3 scripts/validate-db-naming.py templates/_modules-core/module-ws/db/schema/001-workspace.sql")
        sys.exit(1)
    
    path = Path(sys.argv[1])
    
    if not path.exists():
        print(f"{RED}Error: Path not found: {path}{RESET}")
        sys.exit(1)
    
    sql_files = find_sql_files(path)
    
    if not sql_files:
        print(f"{YELLOW}Warning: No SQL files found in {path}{RESET}")
        sys.exit(0)
    
    print(f"\n{GREEN}Database Naming Standards Validator{RESET}")
    print(f"Validating {len(sql_files)} SQL file(s)...\n")
    
    result = ValidationResult()
    
    for sql_file in sql_files:
        validate_sql_file(sql_file, result)
    
    exit_code = result.print_report()
    sys.exit(exit_code)


if __name__ == '__main__':
    main()
