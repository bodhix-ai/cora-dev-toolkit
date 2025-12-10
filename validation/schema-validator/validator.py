"""
Schema Validator

Validates Lambda queries against actual Supabase schema.
Detects mismatches and generates validation reports.
"""

import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from difflib import SequenceMatcher

from schema_inspector import SchemaInspector, TableInfo
from query_parser import QueryParser, QueryReference

logger = logging.getLogger(__name__)


@dataclass
class ValidationError:
    """Represents a validation error."""
    severity: str  # 'error' or 'warning'
    file: str
    line: int
    table: Optional[str]
    column: Optional[str]
    issue: str
    suggestion: Optional[str] = None


@dataclass
class ValidationReport:
    """Validation report containing all errors and warnings."""
    status: str  # 'passed' or 'failed'
    errors: List[ValidationError] = field(default_factory=list)
    warnings: List[ValidationError] = field(default_factory=list)
    summary: Dict[str, Any] = field(default_factory=dict)


class Validator:
    """Validates Lambda queries against database schema."""
    
    def __init__(self, schema_inspector: SchemaInspector, query_parser: QueryParser):
        """
        Initialize validator.
        
        Args:
            schema_inspector: SchemaInspector instance
            query_parser: QueryParser instance
        """
        self.schema_inspector = schema_inspector
        self.query_parser = query_parser
        self.errors: List[ValidationError] = []
        self.warnings: List[ValidationError] = []
    
    def validate(self, file_or_directory: str) -> ValidationReport:
        """
        Validate Lambda files against schema.
        
        Args:
            file_or_directory: Path to file or directory to validate
            
        Returns:
            ValidationReport with all errors and warnings
        """
        logger.info(f"Starting validation for: {file_or_directory}")
        
        # Reset errors and warnings
        self.errors = []
        self.warnings = []
        
        # Parse queries from files
        import os
        if os.path.isfile(file_or_directory):
            queries = self.query_parser.parse_file(file_or_directory)
        else:
            queries = self.query_parser.parse_directory(file_or_directory)
        
        # Load schema
        schema = self.schema_inspector.introspect_schema()
        
        # Validate each query
        for query in queries:
            self._validate_query(query, schema)
        
        # Generate report
        report = ValidationReport(
            status='failed' if self.errors else 'passed',
            errors=self.errors,
            warnings=self.warnings,
            summary={
                'total_queries': len(queries),
                'error_count': len(self.errors),
                'warning_count': len(self.warnings),
                'tables_checked': len(self.query_parser.get_tables_used())
            }
        )
        
        logger.info(f"Validation complete: {len(self.errors)} errors, {len(self.warnings)} warnings")
        return report
    
    def _validate_query(self, query: QueryReference, schema: Dict[str, TableInfo]):
        """
        Validate a single query reference.
        
        Args:
            query: QueryReference to validate
            schema: Database schema
        """
        # Skip if table name couldn't be extracted
        if not query.table:
            self.warnings.append(ValidationError(
                severity='warning',
                file=query.file,
                line=query.line,
                table=None,
                column=None,
                issue="Could not extract table name from query",
                suggestion="Ensure query uses .table('table_name') pattern"
            ))
            return
        
        # Check if table exists
        if not self._validate_table_exists(query, schema):
            return  # Error already added
        
        # Check columns
        if query.columns and query.columns != ['*']:
            self._validate_columns_exist(query, schema)
    
    def _validate_table_exists(self, query: QueryReference, schema: Dict[str, TableInfo]) -> bool:
        """
        Validate that the table exists in the schema.
        
        Returns:
            True if table exists, False otherwise
        """
        if query.table not in schema:
            # Find similar table names
            similar_tables = self._find_similar_names(query.table, list(schema.keys()))
            
            suggestion = None
            if similar_tables:
                suggestion = f"Did you mean '{similar_tables[0]}'?"
            
            self.errors.append(ValidationError(
                severity='error',
                file=query.file,
                line=query.line,
                table=query.table,
                column=None,
                issue=f"Table '{query.table}' does not exist in schema",
                suggestion=suggestion
            ))
            return False
        
        return True
    
    def _validate_columns_exist(self, query: QueryReference, schema: Dict[str, TableInfo]):
        """
        Validate that all columns exist in the table.
        
        Args:
            query: QueryReference to validate
            schema: Database schema
        """
        table = schema.get(query.table)
        if not table:
            return  # Table error already handled
        
        for column in query.columns:
            if column not in table.columns:
                # Find similar column names
                similar_columns = self._find_similar_names(column, list(table.columns.keys()))
                
                suggestion = None
                if similar_columns:
                    suggestion = f"Did you mean '{similar_columns[0]}'?"
                else:
                    suggestion = f"Available columns: {', '.join(sorted(table.columns.keys())[:5])}"
                
                self.errors.append(ValidationError(
                    severity='error',
                    file=query.file,
                    line=query.line,
                    table=query.table,
                    column=column,
                    issue=f"Column '{column}' does not exist in table '{query.table}'",
                    suggestion=suggestion
                ))
    
    def _find_similar_names(self, target: str, candidates: List[str], threshold: float = 0.6) -> List[str]:
        """
        Find similar names using fuzzy matching.
        
        Args:
            target: Target name to match
            candidates: List of candidate names
            threshold: Similarity threshold (0-1)
            
        Returns:
            List of similar names, sorted by similarity
        """
        similarities = []
        
        for candidate in candidates:
            ratio = SequenceMatcher(None, target.lower(), candidate.lower()).ratio()
            if ratio >= threshold:
                similarities.append((candidate, ratio))
        
        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return [name for name, _ in similarities]
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Export validation results as dictionary (for JSON serialization).
        AI-friendly format for programmatic access.
        """
        return {
            'status': 'failed' if self.errors else 'passed',
            'error_count': len(self.errors),
            'warning_count': len(self.warnings),
            'errors': [
                {
                    'severity': err.severity,
                    'file': err.file,
                    'line': err.line,
                    'table': err.table,
                    'column': err.column,
                    'issue': err.issue,
                    'suggestion': err.suggestion
                }
                for err in self.errors
            ],
            'warnings': [
                {
                    'severity': warn.severity,
                    'file': warn.file,
                    'line': warn.line,
                    'table': warn.table,
                    'column': warn.column,
                    'issue': warn.issue,
                    'suggestion': warn.suggestion
                }
                for warn in self.warnings
            ]
        }
