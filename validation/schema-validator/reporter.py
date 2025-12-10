"""
Validation Reporter

Formats validation reports in multiple output formats.
Supports text, JSON, and markdown output for AI consumption.
"""

import json
import logging
from typing import Dict, Any, List
from colorama import Fore, Style, init

from validator import ValidationReport, ValidationError
from fix_proposer import ProposedFix

# Initialize colorama
init(autoreset=True)

logger = logging.getLogger(__name__)


class Reporter:
    """Formats validation reports for different output types."""
    
    def __init__(self):
        """Initialize reporter."""
        pass
    
    def format_report(
        self, 
        report: ValidationReport, 
        fixes: List[ProposedFix] = None, 
        output_format: str = 'text'
    ) -> str:
        """
        Format validation report.
        
        Args:
            report: ValidationReport to format
            fixes: Optional list of proposed fixes
            output_format: 'text', 'json', or 'markdown'
            
        Returns:
            Formatted report string
        """
        if output_format == 'json':
            return self._format_json(report, fixes)
        elif output_format == 'markdown':
            return self._format_markdown(report, fixes)
        else:
            return self._format_text(report, fixes)
    
    def _format_text(self, report: ValidationReport, fixes: List[ProposedFix] = None) -> str:
        """Format report as human-readable text with colors."""
        lines = []
        
        # Header
        lines.append("")
        lines.append("=" * 80)
        lines.append(f"{Fore.CYAN}SCHEMA VALIDATION REPORT{Style.RESET_ALL}")
        lines.append("=" * 80)
        lines.append("")
        
        # Summary
        status_color = Fore.GREEN if report.status == 'passed' else Fore.RED
        lines.append(f"Status: {status_color}{report.status.upper()}{Style.RESET_ALL}")
        lines.append(f"Total Queries Checked: {report.summary.get('total_queries', 0)}")
        lines.append(f"Tables Checked: {report.summary.get('tables_checked', 0)}")
        lines.append(f"Errors: {Fore.RED}{len(report.errors)}{Style.RESET_ALL}")
        lines.append(f"Warnings: {Fore.YELLOW}{len(report.warnings)}{Style.RESET_ALL}")
        lines.append("")
        
        # Errors
        if report.errors:
            lines.append("-" * 80)
            lines.append(f"{Fore.RED}ERRORS{Style.RESET_ALL}")
            lines.append("-" * 80)
            for i, error in enumerate(report.errors, 1):
                lines.append("")
                lines.append(f"{Fore.RED}[{i}] {error.issue}{Style.RESET_ALL}")
                lines.append(f"    File: {error.file}")
                lines.append(f"    Line: {error.line}")
                if error.table:
                    lines.append(f"    Table: {error.table}")
                if error.column:
                    lines.append(f"    Column: {error.column}")
                if error.suggestion:
                    lines.append(f"    {Fore.CYAN}Suggestion: {error.suggestion}{Style.RESET_ALL}")
            lines.append("")
        
        # Warnings
        if report.warnings:
            lines.append("-" * 80)
            lines.append(f"{Fore.YELLOW}WARNINGS{Style.RESET_ALL}")
            lines.append("-" * 80)
            for i, warning in enumerate(report.warnings, 1):
                lines.append("")
                lines.append(f"{Fore.YELLOW}[{i}] {warning.issue}{Style.RESET_ALL}")
                lines.append(f"    File: {warning.file}")
                lines.append(f"    Line: {warning.line}")
                if warning.suggestion:
                    lines.append(f"    {Fore.CYAN}Suggestion: {warning.suggestion}{Style.RESET_ALL}")
            lines.append("")
        
        # Proposed Fixes
        if fixes:
            lines.append("-" * 80)
            lines.append(f"{Fore.GREEN}PROPOSED FIXES{Style.RESET_ALL}")
            lines.append("-" * 80)
            lines.append("")
            for i, fix in enumerate(fixes, 1):
                confidence_color = Fore.GREEN if fix.confidence >= 0.7 else Fore.YELLOW
                lines.append(f"[{i}] {fix.fix_type.upper()} (confidence: {confidence_color}{fix.confidence:.2f}{Style.RESET_ALL})")
                lines.append(f"    {fix.rationale}")
                lines.append("")
                lines.append("    Fix Content:")
                for line in fix.fix_content.split('\n'):
                    lines.append(f"    {line}")
                lines.append("")
        
        # Footer
        lines.append("=" * 80)
        if report.status == 'passed':
            lines.append(f"{Fore.GREEN}✓ All schema validations passed!{Style.RESET_ALL}")
        else:
            lines.append(f"{Fore.RED}✗ Schema validation failed. Please review errors above.{Style.RESET_ALL}")
        lines.append("=" * 80)
        lines.append("")
        
        return '\n'.join(lines)
    
    def _format_json(self, report: ValidationReport, fixes: List[ProposedFix] = None) -> str:
        """
        Format report as JSON (AI-friendly format).
        
        This is the primary format for AI agents to consume validation results.
        """
        data = {
            'status': report.status,
            'summary': report.summary,
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
                for err in report.errors
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
                for warn in report.warnings
            ]
        }
        
        if fixes:
            data['proposed_fixes'] = [
                {
                    'fix_type': fix.fix_type,
                    'confidence': fix.confidence,
                    'rationale': fix.rationale,
                    'fix_content': fix.fix_content,
                    'error': {
                        'file': fix.error.file,
                        'line': fix.error.line,
                        'table': fix.error.table,
                        'column': fix.error.column,
                        'issue': fix.error.issue
                    }
                }
                for fix in fixes
            ]
        
        return json.dumps(data, indent=2)
    
    def _format_markdown(self, report: ValidationReport, fixes: List[ProposedFix] = None) -> str:
        """Format report as markdown (for GitHub PR comments)."""
        lines = []
        
        # Header
        lines.append("# Schema Validation Report")
        lines.append("")
        
        # Summary
        status_emoji = "✅" if report.status == 'passed' else "❌"
        lines.append(f"**Status:** {status_emoji} {report.status.upper()}")
        lines.append(f"**Total Queries Checked:** {report.summary.get('total_queries', 0)}")
        lines.append(f"**Tables Checked:** {report.summary.get('tables_checked', 0)}")
        lines.append(f"**Errors:** {len(report.errors)}")
        lines.append(f"**Warnings:** {len(report.warnings)}")
        lines.append("")
        
        # Errors
        if report.errors:
            lines.append("## ❌ Errors")
            lines.append("")
            for i, error in enumerate(report.errors, 1):
                lines.append(f"### Error {i}: {error.issue}")
                lines.append("")
                lines.append(f"- **File:** `{error.file}`")
                lines.append(f"- **Line:** {error.line}")
                if error.table:
                    lines.append(f"- **Table:** `{error.table}`")
                if error.column:
                    lines.append(f"- **Column:** `{error.column}`")
                if error.suggestion:
                    lines.append(f"- **Suggestion:** {error.suggestion}")
                lines.append("")
        
        # Warnings
        if report.warnings:
            lines.append("## ⚠️ Warnings")
            lines.append("")
            for i, warning in enumerate(report.warnings, 1):
                lines.append(f"### Warning {i}: {warning.issue}")
                lines.append("")
                lines.append(f"- **File:** `{warning.file}`")
                lines.append(f"- **Line:** {warning.line}")
                if warning.suggestion:
                    lines.append(f"- **Suggestion:** {warning.suggestion}")
                lines.append("")
        
        # Proposed Fixes
        if fixes:
            lines.append("## 🔧 Proposed Fixes")
            lines.append("")
            for i, fix in enumerate(fixes, 1):
                confidence_emoji = "🟢" if fix.confidence >= 0.7 else "🟡"
                lines.append(f"### Fix {i}: {fix.fix_type.upper()} {confidence_emoji}")
                lines.append("")
                lines.append(f"**Confidence:** {fix.confidence:.2f}")
                lines.append(f"**Rationale:** {fix.rationale}")
                lines.append("")
                lines.append("**Fix Content:**")
                lines.append("```sql" if fix.fix_type == 'sql_migration' else "```diff")
                lines.append(fix.fix_content)
                lines.append("```")
                lines.append("")
        
        # Footer
        if report.status == 'passed':
            lines.append("---")
            lines.append("✅ **All schema validations passed!**")
        else:
            lines.append("---")
            lines.append("❌ **Schema validation failed.** Please review errors above.")
        
        return '\n'.join(lines)
