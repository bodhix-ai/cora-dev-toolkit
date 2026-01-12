#!/usr/bin/env python3
"""
CORA Portability Validator

Detects hardcoded values that would prevent project portability:
- Hardcoded project names (e.g., "pm-app")
- Hardcoded AWS regions (e.g., "us-east-1")
- Hardcoded AWS account IDs
- Hardcoded URLs/domains
- Hardcoded environment-specific values
"""

import re
import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class PortabilityIssue:
    """A single portability issue."""
    severity: str  # "error", "warning", "info"
    message: str
    file_path: str
    line_number: int
    line_content: str
    pattern_name: str
    matched_value: str
    suggestion: Optional[str] = None


@dataclass
class ValidationResult:
    """Results from portability validation."""
    target_path: str
    passed: bool = True
    errors: list = field(default_factory=list)
    warnings: list = field(default_factory=list)
    info: list = field(default_factory=list)
    files_scanned: int = 0
    
    def add_issue(self, issue: PortabilityIssue):
        """Add an issue to the appropriate list."""
        issue_dict = {
            "message": issue.message,
            "file": issue.file_path,
            "line": issue.line_number,
            "line_content": issue.line_content[:100] + "..." if len(issue.line_content) > 100 else issue.line_content,
            "pattern": issue.pattern_name,
            "matched_value": issue.matched_value,
            "suggestion": issue.suggestion,
        }
        if issue.severity == "error":
            self.errors.append(issue_dict)
            self.passed = False
        elif issue.severity == "warning":
            self.warnings.append(issue_dict)
        else:
            self.info.append(issue_dict)

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "target_path": self.target_path,
            "passed": self.passed,
            "status": "passed" if self.passed else "failed",
            "errors": self.errors,
            "warnings": self.warnings,
            "info": self.info,
            "files_scanned": self.files_scanned,
            "summary": {
                "errors": len(self.errors),
                "warnings": len(self.warnings),
                "info": len(self.info),
                "total_issues": len(self.errors) + len(self.warnings) + len(self.info),
            }
        }


class PortabilityValidator:
    """Validates code for hardcoded values that prevent portability."""

    # Default patterns to detect
    DEFAULT_PATTERNS = {
        # AWS Account IDs (12 digit numbers)
        "aws_account_id": {
            "pattern": r'\b\d{12}\b',
            "severity": "error",
            "message": "Hardcoded AWS account ID detected",
            "suggestion": "Use environment variable or Terraform variable for account ID",
            "exclude_contexts": ["phone", "timestamp", "version"],
        },
        # AWS Regions (explicit region strings)
        "aws_region": {
            "pattern": r'["\'](?:us|eu|ap|sa|ca|me|af)-(?:east|west|north|south|central|northeast|southeast)-[1-3]["\']',
            "severity": "warning",
            "message": "Hardcoded AWS region detected",
            "suggestion": "Use environment variable AWS_REGION or configurable variable",
            "exclude_files": ["*.tf", "*.tfvars"],  # Terraform files may legitimately specify regions
        },
        # Hardcoded URLs with specific domains
        "hardcoded_url": {
            "pattern": r'https?://(?!localhost|127\.0\.0\.1|example\.com|placeholder)[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}[^\s"\']*',
            "severity": "info",
            "message": "Hardcoded URL detected",
            "suggestion": "Consider using environment variable for URLs",
            "exclude_files": ["*.md", "*.txt", "package.json", "package-lock.json", "pnpm-lock.yaml"],
        },
        # API Keys (common patterns)
        "api_key_pattern": {
            "pattern": r'(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?key)\s*[=:]\s*["\'][a-zA-Z0-9_-]{20,}["\']',
            "severity": "error",
            "message": "Potential hardcoded API key detected",
            "suggestion": "Use environment variable or secrets manager for API keys",
            "case_insensitive": True,
        },
        # ARN patterns with account IDs
        "arn_with_account": {
            "pattern": r'arn:aws:[a-z0-9-]+:[a-z0-9-]*:\d{12}:',
            "severity": "error",
            "message": "Hardcoded ARN with account ID detected",
            "suggestion": "Use Terraform data sources or variables for ARNs",
        },
        # S3 bucket names (specific naming patterns)
        "s3_bucket_specific": {
            "pattern": r's3://[a-z0-9][-a-z0-9]*-(?:dev|stg|prd|prod|staging|production)[a-z0-9-]*',
            "severity": "warning",
            "message": "Environment-specific S3 bucket name detected",
            "suggestion": "Use environment variable for bucket name",
            "case_insensitive": True,
        },
    }

    # File extensions to scan
    SCANNABLE_EXTENSIONS = {
        ".ts", ".tsx", ".js", ".jsx", ".json", ".yaml", ".yml",
        ".py", ".tf", ".tfvars", ".sh", ".env", ".sql",
    }

    # Directories to skip
    SKIP_DIRECTORIES = {
        "node_modules", ".git", "dist", "build", ".next", "__pycache__",
        ".terraform", "coverage", ".cache", "vendor",
    }

    # Files to skip
    SKIP_FILES = {
        "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
        ".env.example", ".env.template",
    }
    
    # Whitelist: File patterns that are allowed to have "hardcoded" values
    # These are typically seed data, examples, or validation tools themselves
    WHITELIST_PATTERNS = [
        "*/seed-*.sql",           # Database seed files
        "*/setup-database.sql",   # Database setup files
        "**/validation/**/*.py",  # Validation scripts themselves
        "**/validation/**/*.ts",  # Validation scripts
        "**/**/models.py",        # Model files with example data structures
        "**/example*.yaml",       # Example configuration files
        "**/example*.json",       # Example configuration files
        "**/.config.*.yaml",      # User-specific config files
        "**/tsconfig.json",       # TypeScript config (may reference schema URLs)
        "**/*_old.yaml",          # Backup/old config files
    ]

    def __init__(
        self,
        verbose: bool = False,
        custom_patterns: dict = None,
        project_name_pattern: str = None,
    ):
        self.verbose = verbose
        self.patterns = {**self.DEFAULT_PATTERNS}
        self.gitignore_patterns = []
        
        if custom_patterns:
            self.patterns.update(custom_patterns)
        
        # Add project-specific pattern if provided
        if project_name_pattern:
            self.patterns["project_name"] = {
                "pattern": project_name_pattern,
                "severity": "warning",
                "message": f"Hardcoded project identifier detected",
                "suggestion": "Use {project} placeholder or environment variable",
            }

    def log(self, message: str):
        """Log if verbose mode enabled."""
        if self.verbose:
            print(f"[DEBUG] {message}")

    def _load_gitignore(self, project_root: Path):
        """Load and parse .gitignore file from project root."""
        gitignore_path = project_root / ".gitignore"
        
        if not gitignore_path.exists():
            self.log("No .gitignore file found")
            return
        
        try:
            with open(gitignore_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            
            for line in lines:
                line = line.strip()
                # Skip empty lines and comments
                if not line or line.startswith("#"):
                    continue
                
                # Simple gitignore pattern - convert to regex-like pattern
                # This is a simplified implementation that handles common cases
                self.gitignore_patterns.append(line)
            
            self.log(f"Loaded {len(self.gitignore_patterns)} patterns from .gitignore")
        except Exception as e:
            self.log(f"Error reading .gitignore: {e}")
    
    def _is_gitignored(self, file_path: Path, project_root: Path) -> bool:
        """Check if a file matches any gitignore pattern."""
        if not self.gitignore_patterns:
            return False
        
        # Get relative path from project root
        try:
            rel_path = file_path.relative_to(project_root)
        except ValueError:
            # File is not under project root
            return False
        
        rel_path_str = str(rel_path)
        file_name = file_path.name
        
        for pattern in self.gitignore_patterns:
            # Simple pattern matching
            # Handle common gitignore patterns:
            # - Exact filename match
            # - Wildcard patterns (*.ext)
            # - Directory patterns (dir/)
            # - Path patterns (path/to/file)
            
            if pattern == rel_path_str or pattern == file_name:
                return True
            
            # Wildcard patterns (e.g., *.env, setup.config.*.yaml)
            if "*" in pattern:
                import fnmatch
                if fnmatch.fnmatch(file_name, pattern):
                    return True
                if fnmatch.fnmatch(rel_path_str, pattern):
                    return True
            
            # Directory patterns (e.g., node_modules/)
            if pattern.endswith("/"):
                dir_pattern = pattern.rstrip("/")
                if str(rel_path).startswith(dir_pattern + "/") or str(rel_path) == dir_pattern:
                    return True
            
            # Path patterns (e.g., .env.local)
            if "/" in pattern:
                if rel_path_str.startswith(pattern) or rel_path_str == pattern:
                    return True
        
        return False

    def validate_path(self, target_path: str) -> ValidationResult:
        """
        Validate a path (file or directory) for portability issues.
        
        Args:
            target_path: Path to file or directory
            
        Returns:
            ValidationResult with findings
        """
        path = Path(target_path)
        result = ValidationResult(target_path=target_path)

        if not path.exists():
            result.add_issue(PortabilityIssue(
                severity="error",
                message=f"Path does not exist: {target_path}",
                file_path=target_path,
                line_number=0,
                line_content="",
                pattern_name="path-exists",
                matched_value=""
            ))
            return result

        # Load gitignore if validating a directory (project root)
        if path.is_dir():
            self._load_gitignore(path)

        if path.is_file():
            self._validate_file(path, result, path.parent if path.is_file() else path)
            result.files_scanned = 1
        else:
            self._validate_directory(path, result, path)

        return result

    def _validate_directory(self, dir_path: Path, result: ValidationResult, project_root: Path):
        """Recursively validate all files in a directory."""
        for item in dir_path.iterdir():
            # Skip hidden files/directories
            if item.name.startswith(".") and item.name not in [".env"]:
                continue
            
            # Skip configured directories
            if item.is_dir() and item.name in self.SKIP_DIRECTORIES:
                self.log(f"Skipping directory: {item}")
                continue
            
            # Skip configured files
            if item.is_file() and item.name in self.SKIP_FILES:
                self.log(f"Skipping file: {item}")
                continue
            
            # Skip gitignored files/directories
            if self._is_gitignored(item, project_root):
                self.log(f"Skipping gitignored: {item}")
                continue
            
            if item.is_dir():
                self._validate_directory(item, result, project_root)
            elif item.is_file():
                self._validate_file(item, result, project_root)

    def _validate_file(self, file_path: Path, result: ValidationResult, project_root: Path):
        """Validate a single file for portability issues."""
        # Check file extension
        if file_path.suffix not in self.SCANNABLE_EXTENSIONS:
            return
        
        # Check if gitignored (skip validation for gitignored files)
        if self._is_gitignored(file_path, project_root):
            self.log(f"Skipping gitignored file: {file_path}")
            return
        
        # Check whitelist patterns
        for whitelist_pattern in self.WHITELIST_PATTERNS:
            if file_path.match(whitelist_pattern):
                self.log(f"Skipping whitelisted file: {file_path}")
                return
        
        self.log(f"Scanning: {file_path}")
        result.files_scanned += 1

        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except Exception as e:
            self.log(f"Error reading {file_path}: {e}")
            return

        for line_num, line in enumerate(lines, start=1):
            self._check_line(file_path, line_num, line, result)

    def _check_line(
        self,
        file_path: Path,
        line_num: int,
        line: str,
        result: ValidationResult
    ):
        """Check a single line against all patterns."""
        # Skip comment lines
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("#") or stripped.startswith("*"):
            return

        for pattern_name, pattern_config in self.patterns.items():
            # Check file exclusions
            exclude_files = pattern_config.get("exclude_files", [])
            if any(file_path.match(ef) for ef in exclude_files):
                continue

            # Compile pattern
            flags = re.IGNORECASE if pattern_config.get("case_insensitive") else 0
            regex = re.compile(pattern_config["pattern"], flags)

            # Find matches
            for match in regex.finditer(line):
                matched_value = match.group()
                
                # Check context exclusions
                exclude_contexts = pattern_config.get("exclude_contexts", [])
                if any(ctx.lower() in line.lower() for ctx in exclude_contexts):
                    continue

                # Skip if looks like a version number or UUID
                if pattern_name == "aws_account_id":
                    # Skip if part of a UUID pattern
                    # UUIDs: 8-4-4-4-12 format (e.g., 123e4567-e89b-12d3-a456-426614174000)
                    if re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\d{12}', line.lower()):
                        continue
                    # Skip version-like patterns
                    if re.search(r'["\']\?\d+\.\d+\.\d+["\']?', line):
                        continue
                    # Skip obvious non-account-id contexts
                    if any(x in line.lower() for x in ["version", "port", "year", "date", "time", "uuid", "guid", "id\":"]):
                        continue

                result.add_issue(PortabilityIssue(
                    severity=pattern_config["severity"],
                    message=pattern_config["message"],
                    file_path=str(file_path),
                    line_number=line_num,
                    line_content=line.rstrip(),
                    pattern_name=pattern_name,
                    matched_value=matched_value,
                    suggestion=pattern_config.get("suggestion"),
                ))

    def add_project_name_pattern(self, project_name: str):
        """Add a pattern to detect hardcoded project name."""
        if not project_name:
            return
        
        # Escape special regex characters
        escaped_name = re.escape(project_name)
        
        self.patterns["project_name_exact"] = {
            "pattern": rf'\b{escaped_name}\b',
            "severity": "warning",
            "message": f"Hardcoded project name '{project_name}' detected",
            "suggestion": "Use {{project}} placeholder or environment variable",
            "exclude_files": ["*.md", "*.txt", "README*", "CHANGELOG*"],
        }


def validate_path(
    path: str,
    verbose: bool = False,
    project_name: str = None,
) -> ValidationResult:
    """Convenience function to validate a path."""
    validator = PortabilityValidator(verbose=verbose)
    if project_name:
        validator.add_project_name_pattern(project_name)
    return validator.validate_path(path)
