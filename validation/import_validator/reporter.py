"""
Reporter
Formats validation results in different output formats
"""
import json
from typing import Dict, Any, List
from colorama import Fore, Style, init

# Initialize colorama
init(autoreset=True)


class Reporter:
    """Format and display validation results"""
    
    def __init__(self, results: Dict[str, Any]):
        """
        Initialize reporter
        
        Args:
            results: Validation results dictionary
        """
        self.results = results
    
    def format_text(self, verbose: bool = False) -> str:
        """
        Format results as colored text for terminal
        
        Args:
            verbose: Include detailed information
            
        Returns:
            Formatted text string
        """
        output = []
        
        # Header
        output.append(f"\n{Fore.CYAN}{'='*70}")
        output.append(f"{Fore.CYAN}Module Import Validation Report")
        output.append(f"{Fore.CYAN}{'='*70}\n")
        
        errors = self.results['summary']['errors']
        warnings = self.results['summary']['warnings']
        
        # Summary
        total_errors = len(errors)
        total_warnings = len(warnings)
        
        if total_errors == 0 and total_warnings == 0:
            output.append(f"{Fore.GREEN}✅ All imports are valid!\n")
            return '\n'.join(output)
        
        # Error summary
        if total_errors > 0:
            output.append(f"{Fore.RED}❌ {total_errors} error(s) found\n")
        
        if total_warnings > 0:
            output.append(f"{Fore.YELLOW}⚠️  {total_warnings} warning(s) found\n")
        
        # Detailed errors
        if errors:
            output.append(f"{Fore.RED}{'─'*70}")
            output.append(f"{Fore.RED}ERRORS:")
            output.append(f"{Fore.RED}{'─'*70}\n")
            
            for i, error in enumerate(errors, 1):
                output.append(f"{Fore.RED}Error #{i}:")
                output.append(f"  File: {error['file']}")
                output.append(f"  Line: {error['line']}")
                
                if 'function' in error:
                    output.append(f"  Function: {error['function']}")
                
                output.append(f"  Issue: {error['issue']}")
                
                if 'your_call' in error:
                    output.append(f"  Your call: {Fore.WHITE}{error['your_call']}")
                
                if 'actual_signature' in error:
                    output.append(f"  Expected: {Fore.GREEN}{error['actual_signature']}")
                
                output.append(f"  {Fore.YELLOW}💡 Suggestion: {error['suggestion']}")
                output.append("")
        
        # Detailed warnings
        if warnings:
            output.append(f"{Fore.YELLOW}{'─'*70}")
            output.append(f"{Fore.YELLOW}WARNINGS:")
            output.append(f"{Fore.YELLOW}{'─'*70}\n")
            
            for i, warning in enumerate(warnings, 1):
                output.append(f"{Fore.YELLOW}Warning #{i}:")
                output.append(f"  File: {warning['file']}")
                output.append(f"  Line: {warning['line']}")
                output.append(f"  Issue: {warning['issue']}")
                output.append(f"  {Fore.CYAN}💡 Suggestion: {warning['suggestion']}")
                output.append("")
        
        # File summary
        if verbose:
            output.append(f"{Fore.CYAN}{'─'*70}")
            output.append(f"{Fore.CYAN}FILES SCANNED:")
            output.append(f"{Fore.CYAN}{'─'*70}\n")
            
            for file_result in self.results['files']:
                file_errors = len(file_result['errors'])
                file_warnings = len(file_result['warnings'])
                
                if file_errors > 0:
                    status = f"{Fore.RED}✗"
                elif file_warnings > 0:
                    status = f"{Fore.YELLOW}⚠"
                else:
                    status = f"{Fore.GREEN}✓"
                
                output.append(f"{status} {file_result['file']}")
                
                if file_result['imports']:
                    output.append(f"    Imports: {', '.join(file_result['imports'].keys())}")
                
                output.append(f"    Calls: {file_result['calls']}, Errors: {file_errors}, Warnings: {file_warnings}")
                output.append("")
        
        # Footer
        output.append(f"{Fore.CYAN}{'='*70}")
        
        if total_errors > 0:
            output.append(f"{Fore.RED}Status: FAILED")
        elif total_warnings > 0:
            output.append(f"{Fore.YELLOW}Status: WARNINGS")
        else:
            output.append(f"{Fore.GREEN}Status: PASSED")
        
        output.append(f"{Fore.CYAN}{'='*70}\n")
        
        return '\n'.join(output)
    
    def format_json(self) -> str:
        """
        Format results as JSON
        
        Returns:
            JSON string
        """
        return json.dumps(self.results, indent=2)
    
    def format_markdown(self) -> str:
        """
        Format results as Markdown (for PR comments)
        
        Returns:
            Markdown string
        """
        output = []
        
        # Header
        output.append("# Module Import Validation Report\n")
        
        errors = self.results['summary']['errors']
        warnings = self.results['summary']['warnings']
        
        total_errors = len(errors)
        total_warnings = len(warnings)
        
        # Summary
        if total_errors == 0 and total_warnings == 0:
            output.append("✅ **All imports are valid!**\n")
            return '\n'.join(output)
        
        output.append("## Summary\n")
        
        if total_errors > 0:
            output.append(f"- ❌ **{total_errors} error(s) found**")
        
        if total_warnings > 0:
            output.append(f"- ⚠️ {total_warnings} warning(s) found")
        
        output.append("")
        
        # Errors
        if errors:
            output.append("## ❌ Errors\n")
            
            for i, error in enumerate(errors, 1):
                output.append(f"### Error #{i}\n")
                output.append(f"**File:** `{error['file']}`  ")
                output.append(f"**Line:** {error['line']}  ")
                
                if 'function' in error:
                    output.append(f"**Function:** `{error['function']}`  ")
                
                output.append(f"**Issue:** {error['issue']}\n")
                
                if 'your_call' in error:
                    output.append("**Your call:**")
                    output.append("```python")
                    output.append(error['your_call'])
                    output.append("```\n")
                
                if 'actual_signature' in error:
                    output.append("**Expected signature:**")
                    output.append("```python")
                    output.append(error['actual_signature'])
                    output.append("```\n")
                
                output.append(f"**💡 Suggestion:** {error['suggestion']}\n")
                output.append("---\n")
        
        # Warnings
        if warnings:
            output.append("## ⚠️ Warnings\n")
            
            for i, warning in enumerate(warnings, 1):
                output.append(f"### Warning #{i}\n")
                output.append(f"**File:** `{warning['file']}`  ")
                output.append(f"**Line:** {warning['line']}  ")
                output.append(f"**Issue:** {warning['issue']}\n")
                output.append(f"**💡 Suggestion:** {warning['suggestion']}\n")
                output.append("---\n")
        
        # Files scanned
        output.append("## Files Scanned\n")
        
        for file_result in self.results['files']:
            file_errors = len(file_result['errors'])
            file_warnings = len(file_result['warnings'])
            
            if file_errors > 0:
                status = "❌"
            elif file_warnings > 0:
                status = "⚠️"
            else:
                status = "✅"
            
            output.append(f"- {status} `{file_result['file']}` - {file_result['calls']} calls, {file_errors} errors, {file_warnings} warnings")
        
        output.append("")
        
        return '\n'.join(output)
    
    def format_summary(self) -> str:
        """
        Format brief summary
        
        Returns:
            Summary string
        """
        errors = self.results['summary']['errors']
        warnings = self.results['summary']['warnings']
        
        total_errors = len(errors)
        total_warnings = len(warnings)
        total_files = len(self.results['files'])
        
        if total_errors == 0 and total_warnings == 0:
            return f"{Fore.GREEN}✅ Validation passed: {total_files} files scanned, 0 issues"
        else:
            return f"{Fore.RED}❌ Validation failed: {total_files} files scanned, {total_errors} errors, {total_warnings} warnings"


def print_results(results: Dict[str, Any], output_format: str = 'text', 
                 verbose: bool = False) -> str:
    """
    Print validation results in specified format
    
    Args:
        results: Validation results dictionary
        output_format: Output format ('text', 'json', 'markdown', 'summary')
        verbose: Include detailed information (text format only)
        
    Returns:
        Formatted output string
    """
    reporter = Reporter(results)
    
    if output_format == 'json':
        return reporter.format_json()
    elif output_format == 'markdown':
        return reporter.format_markdown()
    elif output_format == 'summary':
        return reporter.format_summary()
    else:
        return reporter.format_text(verbose=verbose)
