#!/usr/bin/env python3
"""
API Response Standard Compliance Checker

Scans all Lambda functions and checks for compliance with the org_common response standard.
Reports compliant and non-compliant Lambda functions with fix suggestions.
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class ComplianceIssue:
    """Represents a compliance issue found in a Lambda function"""
    line_number: int
    line_content: str
    issue_type: str
    suggestion: str


@dataclass
class LambdaCompliance:
    """Represents compliance status of a Lambda function"""
    path: str
    is_compliant: bool
    has_org_common_import: bool
    uses_standard_responses: bool
    has_user_context_extraction: bool
    has_org_id_filtering: bool
    has_error_handling: bool
    issues: List[ComplianceIssue]


class ComplianceChecker:
    """Checks Lambda functions for API response standard compliance"""
    
    # Patterns to detect
    ORG_COMMON_IMPORT = re.compile(r'import\s+org_common|from\s+org_common')
    COMMON_ALIAS = re.compile(r'import\s+org_common\s+as\s+(\w+)')
    STANDARD_RESPONSES = [
        'success_response',
        'error_response',
        'created_response',
        'no_content_response',
        'bad_request_response',
        'unauthorized_response',
        'forbidden_response',
        'not_found_response',
        'conflict_response',
        'internal_error_response',
        'method_not_allowed_response'
    ]
    
    # Non-compliant patterns
    DIRECT_RETURN_PATTERN = re.compile(
        r'return\s+\{[^}]*["\']statusCode["\']\s*:\s*\d+',
        re.MULTILINE
    )
    
    # CORA compliance patterns
    USER_CONTEXT_PATTERN = re.compile(r'get_user_from_event\(event\)')
    ORG_ID_FILTER_PATTERN = re.compile(r'["\']org_id["\']\s*:\s*org_id')
    ERROR_HANDLING_PATTERN = re.compile(r'except\s+(common\.)?(\w*Error|Exception)')
    
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        
    def find_lambda_functions(self) -> List[Path]:
        """Find all lambda_function.py files, excluding .build directories"""
        lambda_files = []
        
        for path in self.root_dir.rglob("**/lambdas/*/lambda_function.py"):
            # Skip .build directories
            if ".build" in str(path):
                continue
            lambda_files.append(path)
            
        return sorted(lambda_files)
    
    def check_file(self, file_path: Path) -> LambdaCompliance:
        """Check a single Lambda function file for compliance"""
        with open(file_path, 'r') as f:
            content = f.read()
            lines = content.split('\n')
        
        # Check for org_common import
        has_org_common_import = bool(self.ORG_COMMON_IMPORT.search(content))
        
        # Detect alias (e.g., "import org_common as common")
        alias_match = self.COMMON_ALIAS.search(content)
        common_alias = alias_match.group(1) if alias_match else 'org_common'
        
        # Check for use of standard response functions
        uses_standard_responses = False
        for response_func in self.STANDARD_RESPONSES:
            pattern = f'{common_alias}\\.{response_func}'
            if re.search(pattern, content):
                uses_standard_responses = True
                break
        
        # Check for CORA compliance patterns
        has_user_context_extraction = bool(self.USER_CONTEXT_PATTERN.search(content))
        has_org_id_filtering = bool(self.ORG_ID_FILTER_PATTERN.search(content))
        has_error_handling = bool(self.ERROR_HANDLING_PATTERN.search(content))
        
        # Find non-compliant direct return statements and other issues
        issues = []
        
        # Check for direct statusCode returns
        for i, line in enumerate(lines, 1):
            # Check for direct statusCode returns (potential non-compliance)
            if re.search(r'return\s+\{[^}]*["\']statusCode["\']\s*:', line):
                # Check if this is within a response helper function (which is OK)
                is_in_helper = False
                for j in range(max(0, i - 10), i):
                    if 'def response(' in lines[j] or 'def error_response(' in lines[j] or 'def success_response(' in lines[j]:
                        is_in_helper = True
                        break
                
                if not is_in_helper:
                    # Provide specific suggestion based on status code
                    status_match = re.search(r'statusCode["\']\s*:\s*(\d+)', line)
                    status_code = status_match.group(1) if status_match else "200"
                    
                    suggestion_map = {
                        "200": f"Use: return {common_alias}.success_response(data)",
                        "201": f"Use: return {common_alias}.created_response(data)",
                        "204": f"Use: return {common_alias}.no_content_response()",
                        "400": f"Use: return {common_alias}.bad_request_response(message)",
                        "401": f"Use: return {common_alias}.unauthorized_response(message)",
                        "403": f"Use: return {common_alias}.forbidden_response(message)",
                        "404": f"Use: return {common_alias}.not_found_response(message)",
                        "409": f"Use: return {common_alias}.conflict_response(message)",
                        "500": f"Use: return {common_alias}.internal_error_response(message)"
                    }
                    suggestion = suggestion_map.get(status_code, f"Use: return {common_alias}.success_response(data)")
                    
                    issues.append(ComplianceIssue(
                        line_number=i,
                        line_content=line.strip(),
                        issue_type="direct_return",
                        suggestion=suggestion
                    ))
        
        # Check for missing user context extraction
        if has_org_common_import and not has_user_context_extraction:
            # Check if lambda_handler exists
            if 'def lambda_handler' in content:
                for i, line in enumerate(lines, 1):
                    if 'def lambda_handler' in line:
                        issues.append(ComplianceIssue(
                            line_number=i,
                            line_content=line.strip(),
                            issue_type="missing_user_context",
                            suggestion=f"Add user context extraction: user_info = {common_alias}.get_user_from_event(event)"
                        ))
                        break
        
        # Check for missing org_id filtering in queries
        if 'SELECT' in content.upper() and not has_org_id_filtering:
            for i, line in enumerate(lines, 1):
                if 'SELECT' in line.upper() and 'FROM' in line.upper():
                    # Check if this is a multi-tenant query (should filter by org_id)
                    if 'WHERE' in line.upper():
                        issues.append(ComplianceIssue(
                            line_number=i,
                            line_content=line.strip()[:80],
                            issue_type="missing_org_filter",
                            suggestion="Ensure query filters by org_id for multi-tenant data isolation"
                        ))
                        break
        
        # Check for missing error handling
        if has_org_common_import and not has_error_handling:
            issues.append(ComplianceIssue(
                line_number=0,
                line_content="",
                issue_type="missing_error_handling",
                suggestion=f"Add error handling: except {common_alias}.ValidationError, {common_alias}.NotFoundError, etc."
            ))
        
        # Determine overall compliance
        is_compliant = (
            has_org_common_import and 
            uses_standard_responses and 
            len([i for i in issues if i.issue_type == "direct_return"]) == 0
        )
        
        return LambdaCompliance(
            path=str(file_path.relative_to(self.root_dir)),
            is_compliant=is_compliant,
            has_org_common_import=has_org_common_import,
            uses_standard_responses=uses_standard_responses,
            has_user_context_extraction=has_user_context_extraction,
            has_org_id_filtering=has_org_id_filtering,
            has_error_handling=has_error_handling,
            issues=issues
        )
    
    def group_by_module(self, results: List[LambdaCompliance]) -> Dict[str, List[LambdaCompliance]]:
        """Group results by CORA module"""
        modules = {}
        for result in results:
            # Extract module name from path (e.g., "packages/certification-module/..." -> "certification-module")
            path_parts = Path(result.path).parts
            if len(path_parts) >= 2 and path_parts[0] == "packages":
                module_name = path_parts[1]
            else:
                module_name = "other"
            
            if module_name not in modules:
                modules[module_name] = []
            modules[module_name].append(result)
        
        return modules
    
    def generate_report(self, results: List[LambdaCompliance]) -> str:
        """Generate a compliance report"""
        compliant = [r for r in results if r.is_compliant]
        non_compliant = [r for r in results if not r.is_compliant]
        
        # Group by module
        modules = self.group_by_module(results)
        
        report = []
        report.append("=" * 80)
        report.append("API Response Standard Compliance Report")
        report.append("=" * 80)
        report.append("")
        report.append(f"Total Lambda Functions: {len(results)}")
        report.append(f"✅ Compliant: {len(compliant)}")
        report.append(f"❌ Non-Compliant: {len(non_compliant)}")
        report.append("")
        report.append(f"Scanned Modules: {', '.join(sorted(modules.keys()))}")
        report.append("")
        
        if compliant:
            report.append("-" * 80)
            report.append("✅ COMPLIANT LAMBDA FUNCTIONS")
            report.append("-" * 80)
            
            # Group compliant by module
            compliant_by_module = self.group_by_module(compliant)
            for module_name in sorted(compliant_by_module.keys()):
                module_results = compliant_by_module[module_name]
                report.append(f"  📦 {module_name} ({len(module_results)} Lambda{'s' if len(module_results) != 1 else ''})")
                for result in module_results:
                    # Show relative path within module
                    lambda_name = Path(result.path).parts[-2]  # Get lambda directory name
                    report.append(f"     ✓ {lambda_name}")
            report.append("")
        
        if non_compliant:
            report.append("-" * 80)
            report.append("❌ NON-COMPLIANT LAMBDA FUNCTIONS")
            report.append("-" * 80)
            
            # Group non-compliant by module
            non_compliant_by_module = self.group_by_module(non_compliant)
            for module_name in sorted(non_compliant_by_module.keys()):
                module_results = non_compliant_by_module[module_name]
                report.append(f"  📦 {module_name} ({len(module_results)} non-compliant)")
                
                for result in module_results:
                    lambda_name = Path(result.path).parts[-2]
                    report.append(f"     ✗ {lambda_name}")
                    report.append(f"       📄 {result.path}")
                    
                    if not result.has_org_common_import:
                        report.append(f"       ⚠️  Missing org_common import")
                        report.append(f"       💡 Add: import org_common as common")
                        report.append(f"")
                    
                    if not result.uses_standard_responses:
                        report.append(f"       ⚠️  Not using standard response functions")
                        report.append(f"       💡 Use: common.success_response(), common.error_response(), etc.")
                        report.append(f"")
                    
                    # Group issues by type
                    direct_return_issues = [i for i in result.issues if i.issue_type == "direct_return"]
                    user_context_issues = [i for i in result.issues if i.issue_type == "missing_user_context"]
                    org_filter_issues = [i for i in result.issues if i.issue_type == "missing_org_filter"]
                    error_handling_issues = [i for i in result.issues if i.issue_type == "missing_error_handling"]
                    
                    if direct_return_issues:
                        report.append(f"       ⚠️  Found {len(direct_return_issues)} direct statusCode return(s)")
                        for issue in direct_return_issues[:3]:  # Show first 3
                            report.append(f"          Line {issue.line_number}: {issue.line_content[:60]}")
                            report.append(f"          💡 {issue.suggestion}")
                        if len(direct_return_issues) > 3:
                            report.append(f"          ... and {len(direct_return_issues) - 3} more")
                        report.append(f"")
                    
                    if user_context_issues:
                        report.append(f"       ⚠️  Missing user context extraction")
                        for issue in user_context_issues[:1]:
                            report.append(f"          💡 {issue.suggestion}")
                        report.append(f"")
                    
                    if org_filter_issues:
                        report.append(f"       ⚠️  Potential missing org_id filtering (multi-tenancy)")
                        for issue in org_filter_issues[:1]:
                            report.append(f"          Line {issue.line_number}: {issue.line_content}")
                            report.append(f"          💡 {issue.suggestion}")
                        report.append(f"")
                    
                    if error_handling_issues:
                        report.append(f"       ⚠️  Missing standard error handling")
                        for issue in error_handling_issues[:1]:
                            report.append(f"          💡 {issue.suggestion}")
                        report.append(f"")
                    
                    # Additional CORA pattern checks
                    if not result.has_user_context_extraction and result.has_org_common_import:
                        report.append(f"       ℹ️  Tip: Use get_user_from_event() for user context")
                    
                    if not result.has_org_id_filtering and result.has_org_common_import:
                        report.append(f"       ℹ️  Tip: Ensure all queries filter by org_id for multi-tenancy")
                    
                    if not result.has_error_handling and result.has_org_common_import:
                        report.append(f"       ℹ️  Tip: Use org_common error classes (ValidationError, NotFoundError, etc.)")
                    
                    report.append("")
        
        report.append("-" * 80)
        report.append("SUMMARY")
        report.append("-" * 80)
        if non_compliant:
            report.append("⚠️  Action Required: Fix non-compliant Lambda functions")
            report.append("")
            report.append("Quick Fix Guide:")
            report.append("1. Add org_common import: import org_common as common")
            report.append("2. Replace direct returns with standard responses:")
            report.append("   - return {'statusCode': 200, ...} → common.success_response(data)")
            report.append("   - return {'statusCode': 400, ...} → common.bad_request_response(message)")
            report.append("   - return {'statusCode': 404, ...} → common.not_found_response(message)")
            report.append("   - return {'statusCode': 500, ...} → common.internal_error_response(message)")
            report.append("")
            report.append("See: docs/architecture/API_RESPONSE_STANDARD.md")
        else:
            report.append("✅ All Lambda functions are compliant!")
        
        report.append("=" * 80)
        
        return "\n".join(report)


def main():
    """Main entry point"""
    # Get the root directory (assuming script is in scripts/ directory)
    script_dir = Path(__file__).parent
    root_dir = script_dir.parent
    
    # Allow override via command line
    if len(sys.argv) > 1:
        root_dir = Path(sys.argv[1])
    
    print(f"Scanning Lambda functions in: {root_dir}")
    print()
    
    checker = ComplianceChecker(root_dir)
    
    # Find all Lambda functions
    lambda_files = checker.find_lambda_functions()
    
    if not lambda_files:
        print("❌ No Lambda functions found!")
        sys.exit(1)
    
    print(f"Found {len(lambda_files)} Lambda function(s)")
    print()
    
    # Check each file
    results = []
    for file_path in lambda_files:
        result = checker.check_file(file_path)
        results.append(result)
    
    # Generate and print report
    report = checker.generate_report(results)
    print(report)
    
    # Exit with error code if any non-compliant functions found
    non_compliant_count = sum(1 for r in results if not r.is_compliant)
    if non_compliant_count > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
