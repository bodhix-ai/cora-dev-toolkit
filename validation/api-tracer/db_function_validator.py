"""
Database Function Validator

Validates database RPC functions for CORA standards compliance (ADR-020):
1. Parameter naming (p_ prefix requirement)
2. Function naming patterns (is_*, can_*, get_*, create_*, update_*, delete_*)
3. Table references exist in schema
4. Table naming follows ADR-011 (plural, snake_case)
5. Schema organization (functions in correct files)
6. Python helper function location (auth.py, not __init__.py)
"""

import re
import logging
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class DBFunctionIssue:
    """Represents a database function validation issue."""
    severity: str  # 'error' or 'warning'
    category: str  # 'parameter_naming', 'function_naming', 'table_reference', etc.
    file: str
    line: int
    function_name: str
    issue: str
    suggestion: str
    standard_ref: str = "ADR-020"


class DBFunctionValidator:
    """Validates database RPC functions against CORA standards."""
    
    # Function naming patterns (ADR-020 Part 2)
    VALID_FUNCTION_PREFIXES = {
        'is_',      # Boolean membership/role checks
        'can_',     # Boolean permission checks
        'get_',     # Data retrieval
        'create_',  # Insert operations
        'update_',  # Update operations
        'delete_',  # Delete operations
    }
    
    # Invalid patterns that should be replaced
    INVALID_FUNCTION_PREFIXES = {
        'check_': 'is_',      # check_sys_admin -> is_sys_admin
        'validate_': 'is_',   # validate_org_membership -> is_org_member
        'has_': 'can_',       # has_access -> can_access
    }
    
    def __init__(self):
        self.schema_tables: Set[str] = set()
        self.schema_columns: Dict[str, Set[str]] = {}  # table_name -> set of column names
        self.rpc_functions: Dict[str, Dict] = {}  # function_name -> function_info
        
    def validate_module(self, module_path: Path) -> List[DBFunctionIssue]:
        """
        Validate all database functions in a CORA module.
        
        Args:
            module_path: Path to module (e.g., packages/module-kb/)
            
        Returns:
            List of validation issues
        """
        issues = []
        
        # Find schema directory
        schema_dir = module_path / 'db' / 'schema'
        if not schema_dir.exists():
            logger.debug(f"No schema directory found in {module_path}")
            return issues
        
        # Step 1: Load schema (tables and columns)
        self._load_schema(schema_dir)
        
        # Step 2: Validate RPC functions
        issues.extend(self._validate_rpc_functions(schema_dir))
        
        # Step 3: Validate Python helper functions
        backend_dir = module_path / 'backend'
        if backend_dir.exists():
            issues.extend(self._validate_python_helpers(backend_dir))
        
        return issues
    
    def _load_schema(self, schema_dir: Path):
        """Load table and column definitions from schema files."""
        logger.info(f"Loading schema from {schema_dir}")
        
        # Look for table definition files
        # Pattern 1: Files with "tables" in name (001-tables.sql)
        # Pattern 2: Numbered files without "rpc" or "rls" (001-eval-opt-doc-groups.sql)
        for sql_file in schema_dir.glob('*.sql'):
            file_name_lower = sql_file.name.lower()
            
            # Skip RPC and RLS files
            if 'rpc' in file_name_lower or 'rls' in file_name_lower:
                continue
            
            # Include if:
            # - Has "tables" in name, OR
            # - Starts with number pattern (e.g., 001-, 002-)
            if 'tables' in file_name_lower or re.match(r'^\d{3}-', sql_file.name):
                logger.debug(f"Parsing table definitions from {sql_file.name}")
                self._parse_table_definitions(sql_file)
        
        logger.info(f"Loaded {len(self.schema_tables)} tables from schema")
    
    def _parse_table_definitions(self, sql_file: Path):
        """Parse CREATE TABLE statements to extract table and column names."""
        try:
            with open(sql_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract CREATE TABLE statements
            # Pattern: CREATE TABLE table_name ( ... )
            table_pattern = re.compile(
                r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_]+)\s*\(',
                re.IGNORECASE
            )
            
            for match in table_pattern.finditer(content):
                table_name = match.group(1).lower()
                self.schema_tables.add(table_name)
                
                # Extract column names from this table
                # Find the closing parenthesis
                start = match.end()
                depth = 1
                end = start
                while end < len(content) and depth > 0:
                    if content[end] == '(':
                        depth += 1
                    elif content[end] == ')':
                        depth -= 1
                    end += 1
                
                table_def = content[start:end]
                
                # Extract column names
                # Pattern: column_name TYPE [constraints]
                column_pattern = re.compile(r'^\s*([a-z_]+)\s+\w+', re.MULTILINE)
                columns = set()
                for col_match in column_pattern.finditer(table_def):
                    col_name = col_match.group(1).lower()
                    # Skip SQL keywords and constraints
                    if col_name not in ['constraint', 'foreign', 'primary', 'unique', 'check']:
                        columns.add(col_name)
                
                self.schema_columns[table_name] = columns
                logger.debug(f"Table {table_name}: {len(columns)} columns")
        
        except Exception as e:
            logger.warning(f"Failed to parse table definitions from {sql_file}: {e}")
    
    def _validate_rpc_functions(self, schema_dir: Path) -> List[DBFunctionIssue]:
        """Validate RPC function files in schema directory."""
        issues = []
        
        # Find RPC function files
        rpc_files = []
        for sql_file in schema_dir.glob('*-rpc.sql'):
            rpc_files.append(sql_file)
        
        for sql_file in rpc_files:
            try:
                with open(sql_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Extract function definitions
                functions = self._extract_functions(content)
                
                for func_info in functions:
                    # Validate parameter naming
                    issues.extend(self._validate_parameter_naming(
                        sql_file, func_info
                    ))
                    
                    # Validate function naming
                    issues.extend(self._validate_function_naming(
                        sql_file, func_info
                    ))
                    
                    # Validate table references in function body
                    issues.extend(self._validate_table_references(
                        sql_file, func_info
                    ))
                    
                    # Validate schema organization
                    issues.extend(self._validate_schema_organization(
                        sql_file, func_info
                    ))
                    
                    # Store function info for Python validation
                    self.rpc_functions[func_info['name']] = func_info
            
            except Exception as e:
                logger.warning(f"Failed to validate {sql_file}: {e}")
        
        return issues
    
    def _extract_functions(self, sql_content: str) -> List[Dict]:
        """Extract CREATE FUNCTION statements and their details."""
        functions = []
        
        # Pattern: CREATE [OR REPLACE] FUNCTION function_name(params) RETURNS type AS $$ body $$ LANGUAGE plpgsql;
        func_pattern = re.compile(
            r'CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([a-z_]+)\s*\((.*?)\)\s+RETURNS\s+(.*?)\s+AS\s+\$\$\s*(.*?)\s*\$\$\s+LANGUAGE',
            re.IGNORECASE | re.DOTALL
        )
        
        for match in func_pattern.finditer(sql_content):
            func_name = match.group(1).lower()
            params_str = match.group(2).strip()
            returns = match.group(3).strip()
            body = match.group(4)
            
            # Parse parameters
            params = []
            if params_str:
                for param in params_str.split(','):
                    param = param.strip()
                    if param:
                        # Extract param name and type
                        parts = param.split()
                        if len(parts) >= 2:
                            param_name = parts[0].lower()
                            param_type = parts[1].upper()
                            params.append({'name': param_name, 'type': param_type})
            
            functions.append({
                'name': func_name,
                'params': params,
                'returns': returns,
                'body': body,
                'line': sql_content[:match.start()].count('\n') + 1
            })
        
        return functions
    
    def _validate_parameter_naming(
        self, 
        sql_file: Path, 
        func_info: Dict
    ) -> List[DBFunctionIssue]:
        """Validate that all parameters use p_ prefix (ADR-020 Part 1)."""
        issues = []
        
        for param in func_info['params']:
            param_name = param['name']
            if not param_name.startswith('p_'):
                issues.append(DBFunctionIssue(
                    severity='error',
                    category='parameter_naming',
                    file=str(sql_file),
                    line=func_info['line'],
                    function_name=func_info['name'],
                    issue=f"Parameter '{param_name}' missing p_ prefix",
                    suggestion=f"Rename to 'p_{param_name}' (ADR-020 Part 1: All RPC parameters must use p_ prefix)",
                    standard_ref="ADR-020"
                ))
        
        return issues
    
    def _validate_function_naming(
        self, 
        sql_file: Path, 
        func_info: Dict
    ) -> List[DBFunctionIssue]:
        """Validate function naming follows patterns (ADR-020 Part 2)."""
        issues = []
        
        func_name = func_info['name']
        
        # Check if function uses valid prefix
        has_valid_prefix = any(func_name.startswith(prefix) for prefix in self.VALID_FUNCTION_PREFIXES)
        
        if not has_valid_prefix:
            # Check if it uses an invalid prefix we can suggest replacement for
            for invalid, valid in self.INVALID_FUNCTION_PREFIXES.items():
                if func_name.startswith(invalid):
                    suggested_name = func_name.replace(invalid, valid, 1)
                    issues.append(DBFunctionIssue(
                        severity='error',
                        category='function_naming',
                        file=str(sql_file),
                        line=func_info['line'],
                        function_name=func_name,
                        issue=f"Function uses invalid prefix '{invalid}'",
                        suggestion=f"Rename to '{suggested_name}' (ADR-020 Part 2: Use {valid}* for {self._get_function_purpose(valid)})",
                        standard_ref="ADR-020"
                    ))
                    return issues
            
            # No invalid prefix found, just flag as non-standard
            issues.append(DBFunctionIssue(
                severity='warning',
                category='function_naming',
                file=str(sql_file),
                line=func_info['line'],
                function_name=func_name,
                issue=f"Function doesn't follow standard naming pattern",
                suggestion=f"Use one of: {', '.join(self.VALID_FUNCTION_PREFIXES)} (ADR-020 Part 2)",
                standard_ref="ADR-020"
            ))
        
        return issues
    
    def _get_function_purpose(self, prefix: str) -> str:
        """Get human-readable purpose for function prefix."""
        purposes = {
            'is_': 'membership/role checks',
            'can_': 'permission checks',
            'get_': 'data retrieval',
            'create_': 'insert operations',
            'update_': 'update operations',
            'delete_': 'delete operations',
        }
        return purposes.get(prefix, 'unknown')
    
    def _validate_table_references(
        self, 
        sql_file: Path, 
        func_info: Dict
    ) -> List[DBFunctionIssue]:
        """Validate table references in function body exist in schema."""
        issues = []
        
        body = func_info['body']
        
        # Extract table references from SQL statements
        # Patterns: FROM table_name, JOIN table_name, INSERT INTO table_name, UPDATE table_name, DELETE FROM table_name
        table_patterns = [
            r'FROM\s+([a-z_]+)',
            r'JOIN\s+([a-z_]+)',
            r'INSERT\s+INTO\s+([a-z_]+)',
            r'UPDATE\s+([a-z_]+)',
            r'DELETE\s+FROM\s+([a-z_]+)',
        ]
        
        referenced_tables = set()
        for pattern in table_patterns:
            matches = re.finditer(pattern, body, re.IGNORECASE)
            for match in matches:
                table_name = match.group(1).lower()
                referenced_tables.add(table_name)
        
        # Validate each referenced table
        for table_name in referenced_tables:
            # Check if table exists in schema
            if table_name not in self.schema_tables:
                issues.append(DBFunctionIssue(
                    severity='error',
                    category='table_not_found',
                    file=str(sql_file),
                    line=func_info['line'],
                    function_name=func_info['name'],
                    issue=f"Function references non-existent table '{table_name}'",
                    suggestion=f"Table not found in schema. Check for typos or create table definition in 001-tables.sql",
                    standard_ref="ADR-020"
                ))
            
            # Check if table name is plural (ADR-011)
            if not table_name.endswith('s') or table_name.endswith('ss'):
                # Likely singular - flag as ADR-011 violation
                if table_name.endswith('ss'):
                    # 'ss' ending is valid plural (e.g., 'address' -> 'addresses')
                    pass
                else:
                    issues.append(DBFunctionIssue(
                        severity='error',
                        category='table_naming',
                        file=str(sql_file),
                        line=func_info['line'],
                        function_name=func_info['name'],
                        issue=f"Table '{table_name}' uses singular name (violates ADR-011)",
                        suggestion=f"Rename table to '{table_name}s' (ADR-011: Tables must use plural names)",
                        standard_ref="ADR-011"
                    ))
        
        return issues
    
    def _validate_schema_organization(
        self, 
        sql_file: Path, 
        func_info: Dict
    ) -> List[DBFunctionIssue]:
        """Validate functions are in correct schema files (ADR-020 Part 3)."""
        issues = []
        
        func_name = func_info['name']
        file_name = sql_file.name.lower()
        
        # Determine expected file based on function prefix
        if func_name.startswith('is_') or func_name.startswith('can_'):
            # Auth functions should be in 003-auth-rpc.sql
            if '003' not in file_name or 'auth' not in file_name:
                issues.append(DBFunctionIssue(
                    severity='warning',
                    category='schema_organization',
                    file=str(sql_file),
                    line=func_info['line'],
                    function_name=func_name,
                    issue=f"Auth function '{func_name}' not in auth-rpc file",
                    suggestion=f"Move to 003-auth-rpc.sql (ADR-020 Part 3: Auth functions belong in 003-auth-rpc.sql)",
                    standard_ref="ADR-020"
                ))
        
        elif func_name.startswith(('get_', 'create_', 'update_', 'delete_')):
            # Table operation functions should be in 002-tables-rpc.sql
            if '002' not in file_name or 'tables' not in file_name:
                issues.append(DBFunctionIssue(
                    severity='warning',
                    category='schema_organization',
                    file=str(sql_file),
                    line=func_info['line'],
                    function_name=func_name,
                    issue=f"Table operation function '{func_name}' not in tables-rpc file",
                    suggestion=f"Move to 002-tables-rpc.sql (ADR-020 Part 3: CRUD functions belong in 002-tables-rpc.sql)",
                    standard_ref="ADR-020"
                ))
        
        return issues
    
    def _validate_python_helpers(self, backend_dir: Path) -> List[DBFunctionIssue]:
        """Validate Python helper function location (ADR-020 Part 4)."""
        issues = []
        
        # Check if functions are in __init__.py instead of logical files
        layers_dir = backend_dir / 'layers'
        if not layers_dir.exists():
            return issues
        
        # Look for org-common or similar layers
        for layer_dir in layers_dir.iterdir():
            if layer_dir.is_dir():
                init_file = layer_dir / 'python' / 'org_common' / '__init__.py'
                if init_file.exists():
                    issues.extend(self._check_init_file_implementations(init_file))
        
        return issues
    
    def _check_init_file_implementations(self, init_file: Path) -> List[DBFunctionIssue]:
        """Check if __init__.py contains implementations instead of exports."""
        issues = []
        
        try:
            with open(init_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Look for function definitions (not just imports)
            # Pattern: def function_name(...):
            func_pattern = re.compile(r'^def\s+(is_|can_|get_|check_)([a-z_]+)\s*\(', re.MULTILINE)
            
            for match in func_pattern.finditer(content):
                func_name = match.group(1) + match.group(2)
                line_num = content[:match.start()].count('\n') + 1
                
                # Check if this is more than just a stub (has implementation)
                # Look for the function body (indented lines after def)
                func_start = match.end()
                func_lines = []
                for line in content[func_start:].split('\n'):
                    if line and not line[0].isspace():
                        break  # End of function
                    func_lines.append(line)
                
                # If function has more than 2 lines, it's likely an implementation
                if len(func_lines) > 2:
                    issues.append(DBFunctionIssue(
                        severity='warning',
                        category='python_helper_location',
                        file=str(init_file),
                        line=line_num,
                        function_name=func_name,
                        issue=f"Auth helper '{func_name}' implemented in __init__.py",
                        suggestion=f"Move implementation to auth.py, keep only exports in __init__.py (ADR-020 Part 4)",
                        standard_ref="ADR-020"
                    ))
        
        except Exception as e:
            logger.warning(f"Failed to check {init_file}: {e}")
        
        return issues
    
    def get_issue_summary(self, issues: List[DBFunctionIssue]) -> Dict:
        """Generate summary statistics for issues."""
        summary = {
            'total': len(issues),
            'errors': len([i for i in issues if i.severity == 'error']),
            'warnings': len([i for i in issues if i.severity == 'warning']),
            'by_category': {}
        }
        
        for issue in issues:
            if issue.category not in summary['by_category']:
                summary['by_category'][issue.category] = 0
            summary['by_category'][issue.category] += 1
        
        return summary