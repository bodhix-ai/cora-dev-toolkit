"""
Reporter for Section 508 Accessibility Validator
Generates output in text, JSON, and markdown formats
"""

import json
from typing import List, Dict, Any, Optional
from pathlib import Path
try:
    from colorama import Fore, Style, init
    init(autoreset=True)
    COLORS_AVAILABLE = True
except ImportError:
    COLORS_AVAILABLE = False
    # Fallback if colorama not installed
    class Fore:
        RED = ""
        YELLOW = ""
        CYAN = ""
        GREEN = ""
        WHITE = ""
    
    class Style:
        BRIGHT = ""
        RESET_ALL = ""


class Reporter:
    """Generates validation reports in various formats."""
    
    def __init__(self, use_colors: bool = True):
        self.use_colors = use_colors and COLORS_AVAILABLE
    
    def generate_report(
        self, 
        results: Dict[str, Any], 
        output_format: str = 'text',
        output_file: Optional[str] = None
    ) -> str:
        """
        Generate validation report.
        
        Args:
            results: Validation results dictionary
            output_format: Format ('text', 'json', 'markdown')
            output_file: Optional file path to write output
            
        Returns:
            Report content as string
        """
        if output_format == 'json':
            report = self._generate_json_report(results)
        elif output_format == 'markdown':
            report = self._generate_markdown_report(results)
        else:  # text
            report = self._generate_text_report(results)
        
        # Write to file if specified
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(report)
        
        return report
    
    def _generate_json_report(self, results: Dict[str, Any]) -> str:
        """Generate JSON format report."""
        return json.dumps(results, indent=2)
    
    def _generate_text_report(self, results: Dict[str, Any]) -> str:
        """Generate human-readable text report."""
        lines = []
        
        # Header
        lines.append("=" * 80)
        lines.append("Section 508 Accessibility Validation Report")
        lines.append("=" * 80)
        lines.append("")
        
        # Summary
        summary = results.get('summary', {})
        status = results.get('status', 'unknown')
        
        status_color = Fore.GREEN if status == 'passed' else Fore.RED
        if self.use_colors:
            lines.append(f"Status: {status_color}{status.upper()}{Style.RESET_ALL}")
        else:
            lines.append(f"Status: {status.upper()}")
        
        lines.append(f"Files Scanned: {summary.get('files_scanned', 0)}")
        lines.append(f"Components Analyzed: {summary.get('components_analyzed', 0)}")
        lines.append("")
        
        # Issue counts
        errors = summary.get('errors', 0)
        warnings = summary.get('warnings', 0)
        manual_review = summary.get('manual_review_required', 0)
        
        if self.use_colors:
            lines.append(f"{Fore.RED}Errors: {errors}{Style.RESET_ALL}")
            lines.append(f"{Fore.YELLOW}Warnings: {warnings}{Style.RESET_ALL}")
            lines.append(f"{Fore.CYAN}Manual Review Required: {manual_review}{Style.RESET_ALL}")
        else:
            lines.append(f"Errors: {errors}")
            lines.append(f"Warnings: {warnings}")
            lines.append(f"Manual Review Required: {manual_review}")
        
        lines.append("")
        lines.append("=" * 80)
        lines.append("")
        
        # Errors
        if results.get('errors'):
            lines.append(f"{Fore.RED}ERRORS{Style.RESET_ALL}" if self.use_colors else "ERRORS")
            lines.append("-" * 80)
            for error in results['errors']:
                lines.extend(self._format_issue(error, 'error'))
                lines.append("")
        
        # Warnings
        if results.get('warnings'):
            lines.append(f"{Fore.YELLOW}WARNINGS{Style.RESET_ALL}" if self.use_colors else "WARNINGS")
            lines.append("-" * 80)
            for warning in results['warnings']:
                lines.extend(self._format_issue(warning, 'warning'))
                lines.append("")
        
        # Manual review items
        if results.get('manual_review'):
            lines.append(f"{Fore.CYAN}MANUAL REVIEW REQUIRED{Style.RESET_ALL}" if self.use_colors else "MANUAL REVIEW REQUIRED")
            lines.append("-" * 80)
            for item in results['manual_review']:
                lines.extend(self._format_manual_review(item))
                lines.append("")
        
        return "\n".join(lines)
    
    def _format_issue(self, issue: Dict[str, Any], severity: str) -> List[str]:
        """Format a single issue for text output."""
        lines = []
        
        # Issue header
        baseline_id = issue.get('baseline_test_id', 'Unknown')
        wcag_sc = issue.get('wcag_sc', 'Unknown')
        
        if self.use_colors:
            color = Fore.RED if severity == 'error' else Fore.YELLOW
            lines.append(f"{color}[{baseline_id}] WCAG {wcag_sc}{Style.RESET_ALL}")
        else:
            lines.append(f"[{baseline_id}] WCAG {wcag_sc}")
        
        # File location
        file_path = issue.get('file')
        if file_path:
            line = issue.get('line', '?')
            column = issue.get('column', '?')
            lines.append(f"  File: {file_path}:{line}:{column}")
        
        # Element type
        element_type = issue.get('element_type', issue.get('element', 'unknown'))
        lines.append(f"  Element: <{element_type}>")
        
        # Issue description
        message = issue.get('issue', issue.get('message', 'No description'))
        lines.append(f"  Issue: {message}")
        
        # Suggestion
        suggestion = issue.get('suggestion', '')
        if suggestion:
            lines.append(f"  Fix: {suggestion}")
        
        # Code snippet
        code = issue.get('code_snippet', '')
        if code:
            lines.append(f"  Code: {code}")
        
        return lines
    
    def _format_manual_review(self, item: Dict[str, Any]) -> List[str]:
        """Format a manual review item for text output."""
        lines = []
        
        baseline_id = item.get('baseline_test_id', 'Unknown')
        wcag_sc = item.get('wcag_sc', 'Unknown')
        
        if self.use_colors:
            lines.append(f"{Fore.CYAN}[{baseline_id}] WCAG {wcag_sc}{Style.RESET_ALL}")
        else:
            lines.append(f"[{baseline_id}] WCAG {wcag_sc}")
        
        file_path = item.get('file')
        if file_path:
            lines.append(f"  File: {file_path}")
        
        note = item.get('note', '')
        if note:
            lines.append(f"  Note: {note}")
        
        return lines
    
    def _generate_markdown_report(self, results: Dict[str, Any]) -> str:
        """Generate markdown format report."""
        lines = []
        
        # Header
        lines.append("# Section 508 Accessibility Validation Report")
        lines.append("")
        
        # Summary
        summary = results.get('summary', {})
        status = results.get('status', 'unknown')
        
        status_emoji = "✅" if status == 'passed' else "❌"
        lines.append(f"## Summary")
        lines.append("")
        lines.append(f"**Status:** {status_emoji} {status.upper()}")
        lines.append(f"- Files Scanned: {summary.get('files_scanned', 0)}")
        lines.append(f"- Components Analyzed: {summary.get('components_analyzed', 0)}")
        lines.append(f"- ❌ Errors: {summary.get('errors', 0)}")
        lines.append(f"- ⚠️ Warnings: {summary.get('warnings', 0)}")
        lines.append(f"- 📋 Manual Review Required: {summary.get('manual_review_required', 0)}")
        lines.append("")
        
        # Errors
        if results.get('errors'):
            lines.append("## ❌ Errors")
            lines.append("")
            for error in results['errors']:
                lines.extend(self._format_issue_markdown(error))
                lines.append("")
        
        # Warnings
        if results.get('warnings'):
            lines.append("## ⚠️ Warnings")
            lines.append("")
            for warning in results['warnings']:
                lines.extend(self._format_issue_markdown(warning))
                lines.append("")
        
        # Manual review
        if results.get('manual_review'):
            lines.append("## 📋 Manual Review Required")
            lines.append("")
            for item in results['manual_review']:
                lines.extend(self._format_manual_review_markdown(item))
                lines.append("")
        
        return "\n".join(lines)
    
    def _format_issue_markdown(self, issue: Dict[str, Any]) -> List[str]:
        """Format a single issue for markdown output."""
        lines = []
        
        baseline_id = issue.get('baseline_test_id', 'Unknown')
        wcag_sc = issue.get('wcag_sc', 'Unknown')
        baseline_name = issue.get('baseline_name', '')
        
        lines.append(f"### [{baseline_id}] {baseline_name}")
        lines.append("")
        lines.append(f"**WCAG SC:** {wcag_sc} (Level {issue.get('wcag_level', 'A')})")
        lines.append("")
        
        file_path = issue.get('file')
        if file_path:
            line = issue.get('line', '?')
            column = issue.get('column', '?')
            lines.append(f"**Location:** `{file_path}:{line}:{column}`")
            lines.append("")
        
        element_type = issue.get('element_type', issue.get('element', 'unknown'))
        lines.append(f"**Element:** `<{element_type}>`")
        lines.append("")
        
        message = issue.get('issue', issue.get('message', 'No description'))
        lines.append(f"**Issue:** {message}")
        lines.append("")
        
        suggestion = issue.get('suggestion', '')
        if suggestion:
            lines.append(f"**Suggestion:** {suggestion}")
            lines.append("")
        
        code = issue.get('code_snippet', '')
        if code:
            lines.append(f"**Code:**")
            lines.append(f"```tsx")
            lines.append(code)
            lines.append(f"```")
            lines.append("")
        
        return lines
    
    def _format_manual_review_markdown(self, item: Dict[str, Any]) -> List[str]:
        """Format a manual review item for markdown output."""
        lines = []
        
        baseline_id = item.get('baseline_test_id', 'Unknown')
        wcag_sc = item.get('wcag_sc', 'Unknown')
        
        lines.append(f"### [{baseline_id}] WCAG {wcag_sc}")
        lines.append("")
        
        file_path = item.get('file')
        if file_path:
            lines.append(f"**File:** `{file_path}`")
            lines.append("")
        
        note = item.get('note', '')
        if note:
            lines.append(f"**Note:** {note}")
            lines.append("")
        
        return lines


def create_summary(issues: List[Dict[str, Any]], files_scanned: int, components_analyzed: int) -> Dict[str, Any]:
    """
    Create summary statistics from validation issues.
    
    Args:
        issues: List of all validation issues
        files_scanned: Number of files scanned
        components_analyzed: Number of components analyzed
        
    Returns:
        Summary dictionary
    """
    errors = [issue for issue in issues if issue.get('severity') == 'error']
    warnings = [issue for issue in issues if issue.get('severity') == 'warning']
    info = [issue for issue in issues if issue.get('severity') == 'info']
    
    return {
        'files_scanned': files_scanned,
        'components_analyzed': components_analyzed,
        'errors': len(errors),
        'warnings': len(warnings),
        'info': len(info),
        'manual_review_required': 0,  # Will be added by orchestrator
        'total_issues': len(issues)
    }
