"""
Frontend Compliance Validator Logic

Validates frontend code against CORA standards.
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Any, Tuple, Set, Optional
from dataclasses import dataclass, field

@dataclass
class ComplianceIssue:
    line_number: int
    line_content: str
    issue_type: str
    suggestion: str

@dataclass
class FileCompliance:
    path: str
    is_compliant: boolean
    issues: List[ComplianceIssue]

    def to_dict(self):
        return {
            "path": self.path,
            "is_compliant": self.is_compliant,
            "issues": [
                {
                    "line_number": i.line_number,
                    "line_content": i.line_content,
                    "issue_type": i.issue_type,
                    "suggestion": i.suggestion
                } for i in self.issues
            ]
        }

class FrontendComplianceChecker:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)

    def find_frontend_files(self) -> List[Path]:
        """Find all .ts and .tsx files in packages/[module]/frontend/ and apps/web"""
        frontend_files = []
        
        # Check packages/*/frontend
        packages_dir = self.root_dir / "packages"
        if packages_dir.exists():
            for pkg in packages_dir.iterdir():
                if pkg.is_dir():
                    frontend_dir = pkg / "frontend"
                    if frontend_dir.exists():
                        frontend_files.extend(self._find_ts_files(frontend_dir))
        
        # Check apps/web
        web_dir = self.root_dir / "apps" / "web"
        if web_dir.exists():
             frontend_files.extend(self._find_ts_files(web_dir))

        return sorted(frontend_files)

    def _find_ts_files(self, directory: Path) -> List[Path]:
        files = []
        for path in directory.rglob("*"):
            if path.is_file() and path.suffix in [".ts", ".tsx"]:
                # Skip node_modules, .build, dist, .next
                if any(part in path.parts for part in ["node_modules", ".build", "dist", ".next"]):
                    continue
                files.append(path)
        return files

    def check_file(self, file_path: Path) -> FileCompliance:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
        
        issues = []
        relative_path = str(file_path.relative_to(self.root_dir))
        
        is_api_file = "/lib/api.ts" in relative_path or "/api-client/" in relative_path
        is_type_file = "/types/" in relative_path or file_path.name.endswith(".d.ts")
        is_hook_file = "/hooks/" in relative_path
        is_component_file = file_path.name.endswith(".tsx")
        
        # Check 1: Direct fetch() calls
        if not is_api_file:
            for i, line in enumerate(lines):
                if re.search(r'\bfetch\s*\(', line):
                    issues.append(ComplianceIssue(
                        line_number=i+1,
                        line_content=line.strip(),
                        issue_type="direct_fetch",
                        suggestion="Use createAuthenticatedClient from @sts-career/api-client instead of direct fetch()"
                    ))

        # Check 2: useOrganizationContext in multi-tenant hooks
        if is_hook_file and not is_type_file:
            has_org_context = "useOrganizationContext" in content
            has_current_org = "currentOrg" in content
            has_org_id = "orgId" in content
            is_multi_tenant = has_current_org or has_org_id
            
            if is_multi_tenant and not has_org_context and "OrgContext" not in content:
                issues.append(ComplianceIssue(
                    line_number=1,
                    line_content="import { useOrganizationContext } ...",
                    issue_type="missing_org_context",
                    suggestion='Add: import { useOrganizationContext } from "@sts-career/org-module-frontend"'
                ))

        # Check 3: NextAuth session usage
        if is_hook_file and not is_type_file:
            has_auth_client = "createAuthenticatedClient" in content
            has_use_session = "useSession" in content
            
            if has_auth_client and not has_use_session:
                 issues.append(ComplianceIssue(
                    line_number=1,
                    line_content="import { useSession } ...",
                    issue_type="missing_use_session",
                    suggestion='Add: import { useSession } from "next-auth/react"'
                ))
        
        # Check 4: Styled-components usage
        if is_component_file:
            if "styled-components" in content or "styled(" in content:
                for i, line in enumerate(lines):
                    if "styled-components" in line or "styled(" in line:
                        issues.append(ComplianceIssue(
                            line_number=i+1,
                            line_content=line.strip(),
                            issue_type="styled_components",
                            suggestion="Use MUI sx prop instead of styled-components for consistent styling"
                        ))
                        break # Only report once per file

        # Check 5: TypeScript any types
        if not file_path.name.endswith(".d.ts"):
            for i, line in enumerate(lines):
                if re.search(r':\s*any\b', line) and not line.strip().startswith("//") and not line.strip().startswith("*"):
                     prev_line = lines[i-1] if i > 0 else ""
                     if "@ts-expect-error" not in prev_line and "eslint-disable" not in prev_line and "eslint-disable-line" not in line:
                         issues.append(ComplianceIssue(
                            line_number=i+1,
                            line_content=line.strip(),
                            issue_type="any_type",
                            suggestion="Replace 'any' with specific type. If necessary, document with @ts-expect-error comment"
                        ))

        # Check 6: Accessibility - aria-label on IconButton
        if is_component_file:
            for i, line in enumerate(lines):
                if "<IconButton" in line:
                    # Look ahead a few lines for aria-label
                    # This is a simple check, a full parser is better but this matches original script logic roughly
                    # Original script looked ahead 5 lines.
                    context = " ".join(lines[i:i+5])
                    if "aria-label" not in context:
                        issues.append(ComplianceIssue(
                            line_number=i+1,
                            line_content=line.strip(),
                            issue_type="missing_aria_label",
                            suggestion='Add aria-label to IconButton: <IconButton aria-label="description">'
                        ))

        # Check 7: Error boundaries
        if is_component_file and "useQuery" in content:
            has_error_boundary = "ErrorBoundary" in content or "error" in content.lower()
            if not has_error_boundary:
                issues.append(ComplianceIssue(
                    line_number=1,
                    line_content="Component with useQuery",
                    issue_type="missing_error_handling",
                    suggestion="Add error handling for data-fetching components (error state or ErrorBoundary)"
                ))

        # Check 8: Loading states
        if is_component_file and "useQuery" in content:
            has_loading = "isLoading" in content or "loading" in content.lower() or "Skeleton" in content
            if not has_loading:
                issues.append(ComplianceIssue(
                    line_number=1,
                    line_content="Component with useQuery",
                    issue_type="missing_loading_state",
                    suggestion="Add loading state with MUI Skeleton or loading indicator"
                ))

        return FileCompliance(
            path=relative_path,
            is_compliant=len(issues) == 0,
            issues=issues
        )
