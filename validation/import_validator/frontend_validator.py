#!/usr/bin/env python3
"""
Frontend Validator - Validates auth independence in React/TypeScript modules
Ensures CORA modules don't import auth providers directly
"""
import re
import os
from pathlib import Path
from typing import Dict, List, Set, Optional, Tuple


# Prohibited auth provider imports for CORA modules
PROHIBITED_IMPORTS = {
    '@clerk/nextjs': 'Clerk SDK',
    '@clerk/react': 'Clerk React components',
    'next-auth': 'NextAuth.js',
    'next-auth/react': 'NextAuth React hooks',
    '@okta/okta-react': 'Okta React SDK',
    '@okta/okta-auth-js': 'Okta Auth SDK',
}

# Prohibited auth hooks that indicate direct auth provider usage
PROHIBITED_HOOKS = {
    'useAuth': 'Clerk/Auth0 auth hook',
    'useSession': 'NextAuth session hook',
    'useOkta': 'Okta auth hook',
    'useUser': 'Clerk user hook (use org-module UserContext instead)',
    'useClerk': 'Clerk client hook',
    'useSignIn': 'Clerk sign-in hook',
    'useSignUp': 'Clerk sign-up hook',
}

# Anti-patterns: Accessing user data from NextAuth session instead of backend Profile
# NextAuth session contains minimal auth info (tokens), NOT user profile data
SESSION_ANTIPATTERNS = {
    r'session.*\.global_role': {
        'message': 'Accessing global_role from NextAuth session',
        'suggestion': 'Use profile.globalRole from useUser() hook instead. NextAuth session does not contain user profile data.',
        'severity': 'error'
    },
    r'session.*\.globalRole': {
        'message': 'Accessing globalRole from NextAuth session',
        'suggestion': 'Use profile.globalRole from useUser() hook instead. NextAuth session does not contain user profile data.',
        'severity': 'error'
    },
    r'session.*\.current_org_id': {
        'message': 'Accessing current_org_id from NextAuth session',
        'suggestion': 'Use profile.currentOrgId from useUser() hook instead. NextAuth session does not contain user profile data.',
        'severity': 'error'
    },
    r'session.*\.currentOrgId': {
        'message': 'Accessing currentOrgId from NextAuth session',
        'suggestion': 'Use profile.currentOrgId from useUser() hook instead. NextAuth session does not contain user profile data.',
        'severity': 'error'
    },
    r'session.*\.organizations': {
        'message': 'Accessing organizations from NextAuth session',
        'suggestion': 'Use organizations from useOrganizationContext() hook instead. NextAuth session does not contain user profile data.',
        'severity': 'error'
    },
}

# Files that are exempted from auth independence checks
# These are the ONLY files allowed to import auth providers directly
EXEMPTED_FILES = [
    'apps/web/components/ClientProviders.tsx',
    'apps/web/app/sign-in/[[...sign-in]]/page.tsx',
    'apps/web/app/sign-up/[[...sign-up]]/page.tsx',
    'apps/web/lib/auth.ts',
    'apps/web/middleware.ts',
]

# CORA recommended patterns
CORA_PATTERNS = {
    'useUser': 'Use useUser() from org-module UserContext for auth state',
    'authAdapter': 'Use authAdapter.getToken() for token retrieval',
    'UserContext': 'Import from @pm-app/org-module for user state',
}


class FrontendValidator:
    """Validates frontend modules for auth independence"""
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.errors: List[Dict] = []
        self.warnings: List[Dict] = []
        self.files_scanned = 0
        self.exempted_files_scanned = 0
    
    def is_exempted(self, file_path: str) -> bool:
        """Check if file is exempted from auth independence checks"""
        relative_path = self._get_relative_path(file_path)
        
        # Normalize paths for comparison
        normalized_path = str(relative_path).replace('\\', '/')
        
        for exempted in EXEMPTED_FILES:
            exempted_normalized = exempted.replace('\\', '/')
            if normalized_path.endswith(exempted_normalized) or exempted_normalized in normalized_path:
                return True
        
        return False
    
    def _get_relative_path(self, file_path: str) -> Path:
        """Get path relative to base_path"""
        file_path_obj = Path(file_path)
        try:
            return file_path_obj.relative_to(self.base_path)
        except ValueError:
            return file_path_obj
    
    def is_cora_module(self, file_path: str) -> bool:
        """Check if file is part of a CORA module"""
        relative_path = str(self._get_relative_path(file_path))
        
        # CORA modules are in packages/*-module/frontend/
        return 'packages/' in relative_path and '-module/frontend' in relative_path
    
    def validate_file(self, file_path: str) -> Dict:
        """Validate a single TypeScript/React file"""
        self.files_scanned += 1
        
        file_path_obj = Path(file_path)
        relative_path = self._get_relative_path(file_path)
        
        # Check if exempted
        is_exempted = self.is_exempted(file_path)
        is_cora = self.is_cora_module(file_path)
        
        if is_exempted:
            self.exempted_files_scanned += 1
        
        result = {
            'file': str(relative_path),
            'is_cora_module': is_cora,
            'is_exempted': is_exempted,
            'errors': [],
            'warnings': [],
            'info': []
        }
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse imports
            imports = self._extract_imports(content)
            
            # Parse hook usages
            hook_usages = self._extract_hook_usages(content)
            
            # Validate for CORA modules (if not exempted)
            if is_cora and not is_exempted:
                # Check for prohibited imports
                for line_num, import_stmt, module_name in imports:
                    if module_name in PROHIBITED_IMPORTS:
                        error = {
                            'line': line_num,
                            'severity': 'error',
                            'issue': f"Direct auth provider import detected: {module_name}",
                            'import': import_stmt,
                            'provider': PROHIBITED_IMPORTS[module_name],
                            'suggestion': self._get_cora_suggestion(module_name),
                            'rationale': 'CORA modules must be auth-provider-agnostic'
                        }
                        result['errors'].append(error)
                        self.errors.append({**error, 'file': str(relative_path)})
                
                # Check for prohibited hook usages
                # BUT: Exclude org-module's own useUser() usage (it's the source of truth)
                is_org_module = self._is_org_module_file(file_path)
                
                for line_num, hook_name, usage in hook_usages:
                    if hook_name in PROHIBITED_HOOKS:
                        # Special case: Allow useUser() in org-module itself
                        if is_org_module and hook_name == 'useUser':
                            continue  # Skip - this is org-module's own implementation
                        
                        error = {
                            'line': line_num,
                            'severity': 'error',
                            'issue': f"Direct auth hook usage detected: {hook_name}()",
                            'usage': usage,
                            'hook_type': PROHIBITED_HOOKS[hook_name],
                            'suggestion': "Use useUser() from org-module UserContext instead",
                            'rationale': 'CORA modules must not use auth provider hooks directly'
                        }
                        result['errors'].append(error)
                        self.errors.append({**error, 'file': str(relative_path)})
            
            # Check for session anti-patterns (applies to apps/web files)
            # These are NOT CORA module violations, but incorrect usage patterns
            if 'apps/web' in str(relative_path) and not is_exempted:
                for line_num, line in enumerate(content.split('\n'), start=1):
                    for pattern, config in SESSION_ANTIPATTERNS.items():
                        if re.search(pattern, line):
                            error = {
                                'line': line_num,
                                'severity': config['severity'],
                                'issue': config['message'],
                                'code': line.strip(),
                                'suggestion': config['suggestion'],
                                'rationale': 'NextAuth session only contains authentication tokens, not user profile data from backend'
                            }
                            result['errors'].append(error)
                            self.errors.append({**error, 'file': str(relative_path)})
            
            # Add exemption info if applicable
            if is_exempted:
                result['info'].append({
                    'message': 'File is exempted from auth independence checks',
                    'reason': 'This file is designated as an auth provider integration point'
                })
        
        except Exception as e:
            result['errors'].append({
                'line': 0,
                'severity': 'error',
                'issue': f"Failed to parse file: {str(e)}"
            })
        
        return result
    
    def _extract_imports(self, content: str) -> List[Tuple[int, str, str]]:
        """
        Extract import statements from TypeScript/React file
        Returns: List of (line_number, import_statement, module_name)
        """
        imports = []
        
        # Match various import patterns:
        # import { useAuth } from '@clerk/nextjs'
        # import * as Clerk from '@clerk/react'
        # import Clerk from '@clerk/nextjs'
        import_pattern = r"import\s+(?:(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*)?)+\s+from\s+['\"]([^'\"]+)['\"]"
        
        # Remove all comments first (single-line and multi-line)
        content_no_comments = self._remove_comments(content)
        
        lines = content_no_comments.split('\n')
        for line_num, line in enumerate(lines, start=1):
            matches = re.finditer(import_pattern, line)
            for match in matches:
                module_name = match.group(1)
                import_stmt = match.group(0)
                imports.append((line_num, import_stmt, module_name))
        
        return imports
    
    def _extract_hook_usages(self, content: str) -> List[Tuple[int, str, str]]:
        """
        Extract React hook usages from file
        Returns: List of (line_number, hook_name, usage_statement)
        """
        usages = []
        
        # Match hook usages: const { user } = useAuth()
        # Also match: useAuth(), useSession(), etc.
        hook_pattern = r'\b(use[A-Z]\w*)\s*\('
        
        # Remove all comments first (single-line and multi-line)
        content_no_comments = self._remove_comments(content)
        
        lines = content_no_comments.split('\n')
        for line_num, line in enumerate(lines, start=1):
            matches = re.finditer(hook_pattern, line)
            for match in matches:
                hook_name = match.group(1)
                usage = line.strip()
                usages.append((line_num, hook_name, usage))
        
        return usages
    
    def _remove_comments(self, content: str) -> str:
        """
        Remove all comments from TypeScript/React code
        Handles single-line (//) and multi-line (/* */, /** */) comments
        """
        # Remove multi-line comments (/* ... */ and /** ... */)
        content = re.sub(r'/\*[\s\S]*?\*/', '', content)
        
        # Remove single-line comments (// ...)
        lines = content.split('\n')
        cleaned_lines = []
        for line in lines:
            # Remove everything after // (but preserve strings)
            # Simple approach: remove // comments not in strings
            if '//' in line:
                # Basic check: if // appears before any string quotes, remove it
                comment_idx = line.find('//')
                # Check if it's inside a string (basic check)
                before_comment = line[:comment_idx]
                single_quotes = before_comment.count("'")
                double_quotes = before_comment.count('"')
                # If odd number of quotes, we're inside a string
                if single_quotes % 2 == 0 and double_quotes % 2 == 0:
                    line = line[:comment_idx]
            cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    def _is_org_module_file(self, file_path: str) -> bool:
        """Check if file is part of org-module itself"""
        relative_path = str(self._get_relative_path(file_path))
        return 'packages/org-module/frontend' in relative_path
    
    def _get_cora_suggestion(self, module_name: str) -> str:
        """Get CORA-compliant suggestion for prohibited import"""
        if 'clerk' in module_name.lower() or 'auth' in module_name.lower():
            return (
                "Use useUser() from org-module UserContext for auth state. "
                "For token retrieval, use authAdapter.getToken()."
            )
        
        return (
            "CORA modules must be auth-provider-agnostic. "
            "Use org-module UserContext and authAdapter patterns instead."
        )
    
    def get_results(self) -> Dict:
        """Get validation results summary"""
        return {
            'status': 'failed' if self.errors else 'passed',
            'files_scanned': self.files_scanned,
            'exempted_files': self.exempted_files_scanned,
            'errors': self.errors,
            'warnings': self.warnings,
            'error_count': len(self.errors),
            'warning_count': len(self.warnings),
        }


def validate_frontend_directory(directory: str, base_path: str) -> Dict:
    """
    Validate all TypeScript/React files in directory
    
    Args:
        directory: Directory to scan
        base_path: Base path to pm-app-stack
    
    Returns:
        Validation results dictionary
    """
    validator = FrontendValidator(base_path)
    
    dir_path = Path(directory)
    
    # Find all TypeScript/React files
    ts_files = []
    for ext in ['*.ts', '*.tsx']:
        ts_files.extend(dir_path.rglob(ext))
    
    # Filter to only CORA module files and apps/web files
    relevant_files = []
    for file in ts_files:
        file_str = str(file)
        # Include CORA module frontend files
        if 'packages/' in file_str and '-module/frontend' in file_str:
            relevant_files.append(file)
        # Include apps/web files (to check exemptions)
        elif 'apps/web' in file_str:
            relevant_files.append(file)
    
    # Validate each file
    file_results = []
    for file_path in relevant_files:
        # Skip node_modules, .next, dist, build directories
        if any(part in str(file_path).split(os.sep) for part in ['node_modules', '.next', 'dist', 'build', '__tests__', 'test', 'tests']):
            continue
        
        result = validator.validate_file(str(file_path))
        file_results.append(result)
    
    return {
        'files': file_results,
        'summary': validator.get_results()
    }


def print_frontend_results(results: Dict, output_format: str = 'text', verbose: bool = False) -> str:
    """
    Format frontend validation results
    
    Args:
        results: Validation results from validate_frontend_directory
        output_format: Output format ('text', 'json', 'markdown', 'summary')
        verbose: Show detailed information
    
    Returns:
        Formatted output string
    """
    from reporter import print_results
    
    # Use the same reporter as backend validator for consistency
    return print_results(results, output_format, verbose)


if __name__ == '__main__':
    # Test the validator
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python frontend_validator.py <directory>")
        sys.exit(1)
    
    directory = sys.argv[1]
    base_path = Path(__file__).parent.parent.parent  # pm-app-stack
    
    print(f"Validating frontend files in: {directory}\n")
    
    results = validate_frontend_directory(directory, str(base_path))
    
    output = print_frontend_results(results, output_format='text', verbose=True)
    print(output)
    
    # Exit with error code if validation failed
    if results['summary']['error_count'] > 0:
        sys.exit(1)
