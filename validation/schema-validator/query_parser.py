"""
Lambda Query Parser

Parses Python Lambda files using AST to extract Supabase queries.
Identifies table names, column references, and query operations.
"""

import ast
import logging
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class QueryReference:
    """Reference to a database query in code."""
    file: str
    line: int
    table: Optional[str]
    columns: List[str] = field(default_factory=list)
    operation: str = ""  # select, insert, update, delete, filter
    query_string: str = ""


class QueryParser:
    """Parses Lambda Python files to extract Supabase queries."""
    
    def __init__(self):
        """Initialize query parser."""
        self.queries: List[QueryReference] = []
        self.current_file: str = ""
    
    def parse_file(self, file_path: str) -> List[QueryReference]:
        """
        Parse a Python file to extract Supabase queries.
        
        Args:
            file_path: Path to the Python file
            
        Returns:
            List of QueryReference objects
        """
        self.current_file = file_path
        self.queries = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                source = f.read()
            
            tree = ast.parse(source, filename=file_path)
            self._visit_node(tree)
            
            logger.info(f"Parsed {file_path}: found {len(self.queries)} queries")
            return self.queries
            
        except SyntaxError as e:
            logger.error(f"Syntax error in {file_path}: {e}")
            return []
        except Exception as e:
            logger.error(f"Failed to parse {file_path}: {e}")
            return []
    
    def parse_directory(self, directory: str, pattern: str = "**/*.py") -> List[QueryReference]:
        """
        Parse all Python files in a directory.
        
        Args:
            directory: Directory path
            pattern: Glob pattern for files (default: **/*.py)
            
        Returns:
            List of all QueryReference objects found
        """
        all_queries = []
        path = Path(directory)
        ignored_dirs = {'.build', 'dist', 'node_modules', '.venv', '__pycache__', 'backend-archive'}
        
        for file_path in path.glob(pattern):
            # Check if file is in an ignored directory
            if any(part in ignored_dirs for part in file_path.parts):
                continue
                
            if file_path.is_file():
                queries = self.parse_file(str(file_path))
                all_queries.extend(queries)
        
        logger.info(f"Parsed directory {directory}: found {len(all_queries)} total queries")
        return all_queries
    
    def _visit_node(self, node: ast.AST):
        """Visit AST node and extract query information."""
        if isinstance(node, ast.Call):
            self._handle_call(node)
        
        # Recursively visit child nodes
        for child in ast.iter_child_nodes(node):
            self._visit_node(child)
    
    def _handle_call(self, node: ast.Call):
        """Handle function/method call node."""
        # Check if this is a Supabase client method call
        if isinstance(node.func, ast.Attribute):
            method_name = node.func.attr
            
            # Detect org_common abstraction layer methods (PRIORITY - most Lambda functions use this)
            if method_name in ['find_one', 'find_many', 'update_one', 'insert_one', 'delete_one']:
                self._handle_org_common_method(node, method_name)
            # Detect Supabase query methods (legacy/direct usage)
            elif method_name in ['select', 'insert', 'update', 'delete', 'upsert']:
                self._handle_query_method(node, method_name)
            elif method_name in ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'filter']:
                self._handle_filter_method(node, method_name)
    
    def _handle_query_method(self, node: ast.Call, method_name: str):
        """Handle Supabase query methods (select, insert, update, delete)."""
        # Try to extract table name from the chain
        table_name = self._extract_table_name(node.func)
        
        # Extract columns based on method
        columns = []
        if method_name == 'select':
            columns = self._extract_select_columns(node)
        elif method_name in ['insert', 'update', 'upsert']:
            columns = self._extract_insert_update_columns(node)
        
        query_ref = QueryReference(
            file=self.current_file,
            line=node.lineno,
            table=table_name,
            columns=columns,
            operation=method_name,
            query_string=ast.unparse(node) if hasattr(ast, 'unparse') else ""
        )
        
        self.queries.append(query_ref)
        logger.debug(f"Found {method_name} query: table={table_name}, columns={columns}")
    
    def _handle_filter_method(self, node: ast.Call, method_name: str):
        """Handle Supabase filter methods (eq, neq, filter, etc.)."""
        # Extract column name from first argument
        column_name = None
        if node.args and len(node.args) > 0:
            if isinstance(node.args[0], ast.Constant):
                column_name = node.args[0].value
            elif isinstance(node.args[0], ast.Str):  # Python 3.7 compatibility
                column_name = node.args[0].s
        
        # Try to extract table name from the chain
        table_name = self._extract_table_name(node.func)
        
        if column_name:
            query_ref = QueryReference(
                file=self.current_file,
                line=node.lineno,
                table=table_name,
                columns=[column_name],
                operation=method_name,
                query_string=ast.unparse(node) if hasattr(ast, 'unparse') else ""
            )
            
            self.queries.append(query_ref)
            logger.debug(f"Found {method_name} filter: table={table_name}, column={column_name}")
    
    def _handle_org_common_method(self, node: ast.Call, method_name: str):
        """
        Handle org_common function calls (find_one, find_many, etc.)
        
        Examples:
            common.find_one('profiles', {'user_id': user_id})
            common.find_many('ai_models', filters={'status': 'available'})
            common.update_one(table='sys_rag', filters={...}, data={...})
            common.insert_one(table='org_prompt_engineering', data={...})
            common.delete_one(table='profiles', filters={...})
        """
        # Extract table name from first positional arg or 'table' keyword
        table_name = None
        
        # Check first positional argument
        if node.args and len(node.args) > 0:
            arg = node.args[0]
            if isinstance(arg, ast.Constant):
                table_name = arg.value
            elif isinstance(arg, ast.Str):  # Python 3.7 compatibility
                table_name = arg.s
        
        # Check for 'table' keyword argument (overrides positional)
        for keyword in node.keywords:
            if keyword.arg == 'table':
                if isinstance(keyword.value, ast.Constant):
                    table_name = keyword.value.value
                elif isinstance(keyword.value, ast.Str):  # Python 3.7 compatibility
                    table_name = keyword.value.s
        
        # Extract columns if available
        columns = []
        
        # For find_many, check 'select' parameter
        if method_name == 'find_many':
            for keyword in node.keywords:
                if keyword.arg == 'select':
                    if isinstance(keyword.value, ast.Constant):
                        select_str = keyword.value.value
                        if isinstance(select_str, str):
                            # Skip wildcard, filter out * from comma-separated lists
                            if select_str.strip() == '*':
                                columns = []
                            else:
                                columns = [col.strip() for col in select_str.split(',') if col.strip() != '*']
                    elif isinstance(keyword.value, ast.Str):  # Python 3.7 compatibility
                        select_str = keyword.value.s
                        # Skip wildcard, filter out * from comma-separated lists
                        if select_str.strip() == '*':
                            columns = []
                        else:
                            columns = [col.strip() for col in select_str.split(',') if col.strip() != '*']
        
        # For insert_one/update_one, extract columns from 'data' parameter
        elif method_name in ['insert_one', 'update_one']:
            for keyword in node.keywords:
                if keyword.arg == 'data':
                    if isinstance(keyword.value, ast.Dict):
                        for key in keyword.value.keys:
                            if isinstance(key, ast.Constant):
                                columns.append(key.value)
                            elif isinstance(key, ast.Str):  # Python 3.7 compatibility
                                columns.append(key.s)
        
        # ENHANCEMENT: Extract columns from 'filters' parameter for ALL methods
        # This catches column mismatches in WHERE clauses (e.g., invite_id vs id)
        
        # Check keyword argument: common.find_many('table', filters={'col': val})
        for keyword in node.keywords:
            if keyword.arg == 'filters':
                if isinstance(keyword.value, ast.Dict):
                    for key in keyword.value.keys:
                        if isinstance(key, ast.Constant):
                            columns.append(key.value)
                        elif isinstance(key, ast.Str):  # Python 3.7 compatibility
                            columns.append(key.s)
        
        # CRITICAL FIX: Also check SECOND positional argument for filters dict
        # Pattern: common.find_many('table', {'col': val})
        # This is the most common pattern in CORA Lambda code
        if len(node.args) > 1:
            arg = node.args[1]
            if isinstance(arg, ast.Dict):
                for key in arg.keys:
                    if isinstance(key, ast.Constant):
                        columns.append(key.value)
                    elif isinstance(key, ast.Str):  # Python 3.7 compatibility
                        columns.append(key.s)
        
        # Create query reference
        if table_name:
            query_ref = QueryReference(
                file=self.current_file,
                line=node.lineno,
                table=table_name,
                columns=columns,
                operation=method_name,
                query_string=ast.unparse(node) if hasattr(ast, 'unparse') else ""
            )
            
            self.queries.append(query_ref)
            logger.debug(f"Found org_common {method_name}: table={table_name}, columns={columns}")
    
    def _extract_table_name(self, node: ast.AST) -> Optional[str]:
        """
        Extract table name from method chain.
        
        Example: supabase.table('users').select()
        We want to extract 'users'
        """
        # Walk up the attribute chain to find .table() call
        current = node
        while isinstance(current, ast.Attribute):
            if current.attr in ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'filter']:
                # Keep going up
                current = current.value
            elif isinstance(current.value, ast.Call):
                # This might be the .table() call
                call_node = current.value
                if isinstance(call_node.func, ast.Attribute) and call_node.func.attr == 'table':
                    # Extract table name from first argument
                    if call_node.args and len(call_node.args) > 0:
                        arg = call_node.args[0]
                        if isinstance(arg, ast.Constant):
                            return arg.value
                        elif isinstance(arg, ast.Str):  # Python 3.7 compatibility
                            return arg.s
                break
            else:
                break
        
        return None
    
    def _extract_select_columns(self, node: ast.Call) -> List[str]:
        """
        Extract column names from .select() call.
        
        Examples:
        - .select('*')  -> [] (wildcard, skip validation)
        - .select('id', 'name')  -> ['id', 'name']
        - .select('id, name')  -> ['id', 'name']
        """
        columns = []
        
        for arg in node.args:
            if isinstance(arg, ast.Constant):
                value = arg.value
            elif isinstance(arg, ast.Str):  # Python 3.7 compatibility
                value = arg.s
            else:
                continue
            
            # Handle comma-separated columns in a single string
            if isinstance(value, str):
                # Skip wildcard - it means "select all columns" and doesn't need validation
                if value.strip() == '*':
                    continue
                    
                if ',' in value:
                    # Filter out wildcard from comma-separated list
                    cols = [col.strip() for col in value.split(',') if col.strip() != '*']
                    columns.extend(cols)
                else:
                    columns.append(value.strip())
        
        return columns
    
    def _extract_insert_update_columns(self, node: ast.Call) -> List[str]:
        """
        Extract column names from .insert() or .update() call.
        
        Example:
        - .insert({'name': 'John', 'email': 'john@example.com'})
        """
        columns = []
        
        for arg in node.args:
            if isinstance(arg, ast.Dict):
                for key in arg.keys:
                    if isinstance(key, ast.Constant):
                        columns.append(key.value)
                    elif isinstance(key, ast.Str):  # Python 3.7 compatibility
                        columns.append(key.s)
        
        return columns
    
    def get_tables_used(self) -> Set[str]:
        """Get set of all table names referenced in queries."""
        return {q.table for q in self.queries if q.table}
    
    def get_columns_for_table(self, table_name: str) -> Set[str]:
        """Get set of all columns referenced for a specific table."""
        columns = set()
        for query in self.queries:
            if query.table == table_name:
                columns.update(query.columns)
        return columns
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Export queries as dictionary (for JSON serialization).
        AI-friendly format for programmatic access.
        """
        return {
            'total_queries': len(self.queries),
            'tables_used': list(self.get_tables_used()),
            'queries': [
                {
                    'file': q.file,
                    'line': q.line,
                    'table': q.table,
                    'columns': q.columns,
                    'operation': q.operation,
                    'query_string': q.query_string
                }
                for q in self.queries
            ]
        }
