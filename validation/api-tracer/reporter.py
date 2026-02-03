"""
API Tracer Reporter

Formats API validation reports in multiple output formats.
Supports text, JSON, and markdown output for AI consumption.
"""

import json
import logging
from typing import Dict, Any, List, Optional
from colorama import Fore, Style, init
from dataclasses import dataclass, field

# Initialize colorama
init(autoreset=True)

logger = logging.getLogger(__name__)


@dataclass
class APIMismatch:
    """Represents an API contract mismatch."""
    severity: str  # 'error' or 'warning'
    mismatch_type: str  # 'route_not_found', 'method_mismatch', 'parameter_mismatch', etc.
    frontend_file: Optional[str] = None
    frontend_line: Optional[int] = None
    gateway_file: Optional[str] = None
    lambda_file: Optional[str] = None
    lambda_line: Optional[int] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    issue: str = ""
    suggestion: Optional[str] = None


@dataclass
class ValidationReport:
    """API validation report containing all mismatches."""
    status: str  # 'passed' or 'failed'
    mismatches: List[APIMismatch] = field(default_factory=list)
    summary: Dict[str, Any] = field(default_factory=dict)


class Reporter:
    """Formats API validation reports for different output types."""
    
    def __init__(self):
        """Initialize reporter."""
        pass
    
    def format_report(
        self, 
        report: ValidationReport, 
        output_format: str = 'text',
        verbose: bool = False
    ) -> str:
        """
        Format validation report.
        
        Args:
            report: ValidationReport to format
            output_format: 'text', 'json', or 'markdown'
            verbose: If True, include detailed error list. If False, show only module summaries.
            
        Returns:
            Formatted report string
        """
        if output_format == 'json':
            return self._format_json(report)
        elif output_format == 'markdown':
            return self._format_markdown(report)
        else:
            return self._format_text(report, verbose)
    
    def _format_text(self, report: ValidationReport, verbose: bool = False) -> str:
        """Format report as human-readable text with colors."""
        lines = []
        
        # Header
        lines.append("")
        lines.append("=" * 80)
        lines.append(f"{Fore.CYAN}API FULL STACK VALIDATION REPORT{Style.RESET_ALL}")
        lines.append("=" * 80)
        lines.append("")
        
        # Group errors and warnings by module
        errors = [m for m in report.mismatches if m.severity == 'error']
        warnings = [m for m in report.mismatches if m.severity == 'warning']
        
        # Extract module name from file path
        def get_module(mismatch):
            """Extract module name from file paths."""
            # Try lambda file first
            if mismatch.lambda_file:
                # Pattern: packages/module-name/... or lambdas/module-name/...
                parts = mismatch.lambda_file.split('/')
                for i, part in enumerate(parts):
                    if part.startswith('module-') or part == 'lambdas':
                        if part == 'lambdas' and i + 1 < len(parts):
                            return parts[i + 1]
                        elif part.startswith('module-'):
                            return part
            
            # Try frontend file
            if mismatch.frontend_file:
                parts = mismatch.frontend_file.split('/')
                for part in parts:
                    if part.startswith('module-'):
                        return part
            
            # Try gateway file
            if mismatch.gateway_file:
                parts = mismatch.gateway_file.split('/')
                for part in parts:
                    if part.startswith('module-'):
                        return part
            
            return "general"  # Fallback for non-module errors
        
        # Group by module
        errors_by_module = {}
        warnings_by_module = {}
        
        for error in errors:
            module = get_module(error)
            if module not in errors_by_module:
                errors_by_module[module] = []
            errors_by_module[module].append(error)
        
        for warning in warnings:
            module = get_module(warning)
            if module not in warnings_by_module:
                warnings_by_module[module] = []
            warnings_by_module[module].append(warning)
        
        # Display errors and warnings grouped by module
        all_modules = sorted(set(list(errors_by_module.keys()) + list(warnings_by_module.keys())))
        
        for module in all_modules:
            module_errors = errors_by_module.get(module, [])
            module_warnings = warnings_by_module.get(module, [])
            
            if not module_errors and not module_warnings:
                continue
            
            lines.append("-" * 80)
            lines.append(f"{Fore.CYAN}{module.upper()}{Style.RESET_ALL}")
            lines.append("-" * 80)
            
            # Module errors
            if module_errors:
                lines.append(f"{Fore.RED}Errors ({len(module_errors)}):{Style.RESET_ALL}")
                
                if verbose:
                    # Verbose mode: Show all details
                    for i, mismatch in enumerate(module_errors, 1):
                        lines.append("")
                        lines.append(f"  {Fore.RED}[{i}] {mismatch.mismatch_type.upper()}: {mismatch.issue}{Style.RESET_ALL}")
                        if mismatch.endpoint:
                            lines.append(f"      Endpoint: {mismatch.method} {mismatch.endpoint}")
                        if mismatch.frontend_file:
                            lines.append(f"      Frontend: {mismatch.frontend_file}:{mismatch.frontend_line}")
                        if mismatch.gateway_file:
                            lines.append(f"      Gateway: {mismatch.gateway_file}")
                        if mismatch.lambda_file:
                            lines.append(f"      Lambda: {mismatch.lambda_file}:{mismatch.lambda_line}")
                        if mismatch.suggestion:
                            lines.append(f"      {Fore.CYAN}Suggestion: {mismatch.suggestion}{Style.RESET_ALL}")
                    lines.append("")
                else:
                    # Summary mode: Show counts by error type
                    error_types = {}
                    for m in module_errors:
                        mtype = m.mismatch_type.upper()
                        error_types[mtype] = error_types.get(mtype, 0) + 1
                    
                    for mtype, count in sorted(error_types.items()):
                        lines.append(f"  - {mtype}: {count}")
                    
                    lines.append("")
                    lines.append(f"{Fore.CYAN}  (Use --verbose to see detailed error list){Style.RESET_ALL}")
                    lines.append("")
            
            # Module warnings
            if module_warnings:
                lines.append(f"{Fore.YELLOW}Warnings ({len(module_warnings)}):{Style.RESET_ALL}")
                
                if verbose:
                    # Verbose mode: Show all details
                    for i, mismatch in enumerate(module_warnings, 1):
                        lines.append("")
                        lines.append(f"  {Fore.YELLOW}[{i}] {mismatch.mismatch_type.upper()}: {mismatch.issue}{Style.RESET_ALL}")
                        if mismatch.endpoint:
                            lines.append(f"      Endpoint: {mismatch.method} {mismatch.endpoint}")
                        if mismatch.suggestion:
                            lines.append(f"      {Fore.CYAN}Suggestion: {mismatch.suggestion}{Style.RESET_ALL}")
                    lines.append("")
                else:
                    # Summary mode: Show counts by warning type
                    warning_types = {}
                    for m in module_warnings:
                        mtype = m.mismatch_type.upper()
                        warning_types[mtype] = warning_types.get(mtype, 0) + 1
                    
                    for mtype, count in sorted(warning_types.items()):
                        lines.append(f"  - {mtype}: {count}")
                    lines.append("")
        
        # Summary (at end for easy visibility without scrolling)
        lines.append("-" * 80)
        lines.append(f"{Fore.CYAN}SUMMARY{Style.RESET_ALL}")
        lines.append("-" * 80)
        lines.append("")
        status_color = Fore.GREEN if report.status == 'passed' else Fore.RED
        lines.append(f"Status: {status_color}{report.status.upper()}{Style.RESET_ALL}")
        lines.append(f"Frontend API Calls: {report.summary.get('frontend_calls', 0)}")
        lines.append(f"API Gateway Routes: {report.summary.get('gateway_routes', 0)}")
        lines.append(f"Lambda Handlers: {report.summary.get('lambda_handlers', 0)}")
        lines.append(f"Errors: {Fore.RED}{len([m for m in report.mismatches if m.severity == 'error'])}{Style.RESET_ALL}")
        lines.append(f"Warnings: {Fore.YELLOW}{len([m for m in report.mismatches if m.severity == 'warning'])}{Style.RESET_ALL}")
        lines.append("")
        
        # Auth validation summary (with 3-layer breakdown)
        if 'auth_validation' in report.summary:
            auth = report.summary['auth_validation']
            if auth.get('enabled'):
                # Check if layer breakdown is available
                if 'frontend' in auth or 'layer1' in auth or 'layer2' in auth:
                    lines.append(f"{Fore.CYAN}Auth Validation (ADR-019):{Style.RESET_ALL}")
                    
                    # Frontend: Admin page auth patterns (TypeScript/TSX)
                    if 'frontend' in auth:
                        frontend = auth['frontend']
                        
                        # Breakdown by scope (Sys, Org, Ws)
                        sys_count = frontend.get('sys_errors', 0) + frontend.get('sys_warnings', 0)
                        org_count = frontend.get('org_errors', 0) + frontend.get('org_warnings', 0)
                        ws_count = frontend.get('ws_errors', 0) + frontend.get('ws_warnings', 0)
                        
                        frontend_errors = frontend.get('errors', 0)
                        frontend_warnings = frontend.get('warnings', 0)
                        frontend_color = Fore.GREEN if frontend_errors == 0 else Fore.RED
                        
                        lines.append(f"  Frontend (Admin Pages): {frontend_color}{frontend_errors} errors{Style.RESET_ALL}, {Fore.YELLOW}{frontend_warnings} warnings{Style.RESET_ALL}")
                        
                        # Add scope breakdown if there are issues
                        if sys_count > 0 or org_count > 0 or ws_count > 0:
                            if sys_count > 0:
                                sys_color = Fore.GREEN if frontend.get('sys_errors', 0) == 0 else Fore.RED
                                lines.append(f"    - Sys Admin: {sys_color}{frontend.get('sys_errors', 0)} errors{Style.RESET_ALL}, {Fore.YELLOW}{frontend.get('sys_warnings', 0)} warnings{Style.RESET_ALL}")
                            if org_count > 0:
                                org_color = Fore.GREEN if frontend.get('org_errors', 0) == 0 else Fore.RED
                                lines.append(f"    - Org Admin: {org_color}{frontend.get('org_errors', 0)} errors{Style.RESET_ALL}, {Fore.YELLOW}{frontend.get('org_warnings', 0)} warnings{Style.RESET_ALL}")
                            if ws_count > 0:
                                ws_color = Fore.GREEN if frontend.get('ws_errors', 0) == 0 else Fore.RED
                                lines.append(f"    - Workspace: {ws_color}{frontend.get('ws_errors', 0)} errors{Style.RESET_ALL}, {Fore.YELLOW}{frontend.get('ws_warnings', 0)} warnings{Style.RESET_ALL}")
                    
                    # Backend Layer 1: Admin Authorization (Lambda)
                    if 'layer1' in auth:
                        l1 = auth['layer1']
                        l1_errors = l1.get('errors', 0)
                        l1_warnings = l1.get('warnings', 0)
                        l1_color = Fore.GREEN if l1_errors == 0 else Fore.RED
                        lines.append(f"  Backend Layer 1 (Admin Auth): {l1_color}{l1_errors} errors{Style.RESET_ALL}, {Fore.YELLOW}{l1_warnings} warnings{Style.RESET_ALL}")
                    
                    # Backend Layer 2: Resource Permissions (Lambda)
                    if 'layer2' in auth:
                        l2 = auth['layer2']
                        l2_errors = l2.get('errors', 0)
                        l2_warnings = l2.get('warnings', 0)
                        l2_color = Fore.GREEN if l2_errors == 0 else Fore.RED
                        lines.append(f"  Backend Layer 2 (Resource Permissions): {l2_color}{l2_errors} errors{Style.RESET_ALL}, {Fore.YELLOW}{l2_warnings} warnings{Style.RESET_ALL}")
                else:
                    # Fallback to simple summary if layer breakdown unavailable
                    auth_errors = auth.get('total_errors', auth.get('errors', 0))
                    auth_warnings = auth.get('total_warnings', auth.get('warnings', 0))
                    auth_color = Fore.GREEN if auth_errors == 0 else Fore.RED
                    lines.append(f"Auth Validation (ADR-019): {auth_color}{auth_errors} errors{Style.RESET_ALL}, {Fore.YELLOW}{auth_warnings} warnings{Style.RESET_ALL}")
        
        # Code quality validation summary
        if 'code_quality_validation' in report.summary:
            quality = report.summary['code_quality_validation']
            if quality.get('enabled'):
                quality_errors = quality.get('errors', 0)
                quality_warnings = quality.get('warnings', 0)
                quality_color = Fore.GREEN if quality_errors == 0 else Fore.RED
                lines.append(f"Code Quality Validation: {quality_color}{quality_errors} errors{Style.RESET_ALL}, {Fore.YELLOW}{quality_warnings} warnings{Style.RESET_ALL}")
                by_category = quality.get('by_category', {})
                if by_category:
                    for category, count in by_category.items():
                        lines.append(f"  - {category}: {count}")
        lines.append("")
        
        # Footer
        lines.append("=" * 80)
        if report.status == 'passed':
            lines.append(f"{Fore.GREEN}✓ All API contracts validated successfully!{Style.RESET_ALL}")
        else:
            lines.append(f"{Fore.RED}✗ API validation failed. Please review mismatches above.{Style.RESET_ALL}")
        lines.append("=" * 80)
        lines.append("")
        
        return '\n'.join(lines)
    
    def _format_json(self, report: ValidationReport) -> str:
        """
        Format report as JSON (AI-friendly format).
        
        This is the primary format for AI agents to consume validation results.
        """
        data = {
            'status': report.status,
            'summary': report.summary,
            'errors': [
                {
                    'severity': m.severity,
                    'mismatch_type': m.mismatch_type,
                    'endpoint': m.endpoint,
                    'method': m.method,
                    'frontend_file': m.frontend_file,
                    'frontend_line': m.frontend_line,
                    'gateway_file': m.gateway_file,
                    'lambda_file': m.lambda_file,
                    'lambda_line': m.lambda_line,
                    'issue': m.issue,
                    'suggestion': m.suggestion
                }
                for m in report.mismatches if m.severity == 'error'
            ],
            'warnings': [
                {
                    'severity': m.severity,
                    'mismatch_type': m.mismatch_type,
                    'endpoint': m.endpoint,
                    'method': m.method,
                    'issue': m.issue,
                    'suggestion': m.suggestion
                }
                for m in report.mismatches if m.severity == 'warning'
            ]
        }
        
        return json.dumps(data, indent=2)
    
    def _format_markdown(self, report: ValidationReport) -> str:
        """Format report as markdown (for GitHub PR comments)."""
        lines = []
        
        # Header
        lines.append("# API Full Stack Validation Report")
        lines.append("")
        
        # Summary
        status_emoji = "✅" if report.status == 'passed' else "❌"
        lines.append(f"**Status:** {status_emoji} {report.status.upper()}")
        lines.append(f"**Frontend API Calls:** {report.summary.get('frontend_calls', 0)}")
        lines.append(f"**API Gateway Routes:** {report.summary.get('gateway_routes', 0)}")
        lines.append(f"**Lambda Handlers:** {report.summary.get('lambda_handlers', 0)}")
        
        error_count = len([m for m in report.mismatches if m.severity == 'error'])
        warning_count = len([m for m in report.mismatches if m.severity == 'warning'])
        lines.append(f"**Errors:** {error_count}")
        lines.append(f"**Warnings:** {warning_count}")
        lines.append("")
        
        # Auth validation summary
        if 'auth_validation' in report.summary:
            auth = report.summary['auth_validation']
            if auth.get('enabled'):
                lines.append(f"**Auth Validation (ADR-019):** {auth.get('errors', 0)} errors, {auth.get('warnings', 0)} warnings")
        
        # Code quality validation summary
        if 'code_quality_validation' in report.summary:
            quality = report.summary['code_quality_validation']
            if quality.get('enabled'):
                lines.append(f"**Code Quality Validation:** {quality.get('errors', 0)} errors, {quality.get('warnings', 0)} warnings")
                by_category = quality.get('by_category', {})
                if by_category:
                    category_str = ", ".join([f"{cat}: {cnt}" for cat, cnt in by_category.items()])
                    lines.append(f"  - Categories: {category_str}")
        lines.append("")
        
        # Errors
        errors = [m for m in report.mismatches if m.severity == 'error']
        if errors:
            lines.append("## ❌ Errors")
            lines.append("")
            for i, mismatch in enumerate(errors, 1):
                lines.append(f"### Error {i}: {mismatch.mismatch_type.replace('_', ' ').title()}")
                lines.append("")
                lines.append(f"**Issue:** {mismatch.issue}")
                lines.append("")
                if mismatch.endpoint:
                    lines.append(f"- **Endpoint:** `{mismatch.method} {mismatch.endpoint}`")
                if mismatch.frontend_file:
                    lines.append(f"- **Frontend:** `{mismatch.frontend_file}:{mismatch.frontend_line}`")
                if mismatch.gateway_file:
                    lines.append(f"- **Gateway:** `{mismatch.gateway_file}`")
                if mismatch.lambda_file:
                    lines.append(f"- **Lambda:** `{mismatch.lambda_file}:{mismatch.lambda_line}`")
                if mismatch.suggestion:
                    lines.append(f"- **Suggestion:** {mismatch.suggestion}")
                lines.append("")
        
        # Warnings
        warnings = [m for m in report.mismatches if m.severity == 'warning']
        if warnings:
            lines.append("## ⚠️ Warnings")
            lines.append("")
            for i, mismatch in enumerate(warnings, 1):
                lines.append(f"### Warning {i}: {mismatch.mismatch_type.replace('_', ' ').title()}")
                lines.append("")
                lines.append(f"**Issue:** {mismatch.issue}")
                lines.append("")
                if mismatch.suggestion:
                    lines.append(f"- **Suggestion:** {mismatch.suggestion}")
                lines.append("")
        
        # Footer
        if report.status == 'passed':
            lines.append("---")
            lines.append("✅ **All API contracts validated successfully!**")
        else:
            lines.append("---")
            lines.append("❌ **API validation failed.** Please review mismatches above.")
        
        return '\n'.join(lines)
