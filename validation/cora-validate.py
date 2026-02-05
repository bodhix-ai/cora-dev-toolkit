#!/usr/bin/env python3
"""
CORA Unified Validation Orchestrator

Unified CLI for running all CORA validation tools:
- structure-validator: Project/module structure validation
- portability-validator: Hardcoded value detection
- a11y-validator: Accessibility validation
- api-tracer: API contract validation
- import-validator: Import path validation
- schema-validator: Database schema validation
- cora-compliance-validator: CORA standards validation
- frontend-compliance-validator: Frontend standards validation

Usage:
    python cora-validate.py --help
    python cora-validate.py project /path/to/project
    python cora-validate.py module /path/to/module
    python cora-validate.py report /path/to/results
"""

import sys
import json
import argparse
import subprocess
import os
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any
from enum import Enum


class ValidationLevel(Enum):
    """Validation certification levels."""
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"


class OutputFormat(Enum):
    """Output format options."""
    TEXT = "text"
    JSON = "json"
    MARKDOWN = "markdown"


@dataclass
class ValidationResult:
    """Result from a single validator."""
    validator: str
    passed: bool
    errors: list = field(default_factory=list)
    warnings: list = field(default_factory=list)
    info: list = field(default_factory=list)
    details: dict = field(default_factory=dict)  # Detailed results (e.g. lists of files)
    duration_ms: int = 0
    skipped: bool = False
    skip_reason: str = ""


@dataclass
class ValidationReport:
    """Complete validation report."""
    target_path: str
    validation_type: str  # "project" or "module"
    timestamp: str
    validators_run: list = field(default_factory=list)
    results: dict = field(default_factory=dict)
    overall_passed: bool = True
    total_errors: int = 0
    total_warnings: int = 0
    certification_level: Optional[str] = None
    duration_ms: int = 0

    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        return {
            "target_path": self.target_path,
            "validation_type": self.validation_type,
            "timestamp": self.timestamp,
            "validators_run": self.validators_run,
            "results": {k: asdict(v) for k, v in self.results.items()},
            "overall_passed": self.overall_passed,
            "total_errors": self.total_errors,
            "total_warnings": self.total_warnings,
            "certification_level": self.certification_level,
            "duration_ms": self.duration_ms,
        }
    
    def save_results(self, output_dir: Path):
        """Save individual validator results and summary to output directory."""
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Save summary
        with open(output_dir / "summary.json", "w") as f:
            json.dump(self.to_dict(), f, indent=2)
            
        # Save individual results
        for key, result in self.results.items():
            result_dict = asdict(result)
            with open(output_dir / f"{key}.json", "w") as f:
                json.dump(result_dict, f, indent=2)


class CoraValidator:
    """Main CORA validation orchestrator."""

    def __init__(self, verbose: bool = False, template_mode: bool = False):
        self.verbose = verbose
        self.template_mode = template_mode
        self.validation_dir = Path(__file__).parent

    def clear_cache(self):
        """Clear Python bytecode cache to ensure fresh validation results."""
        import shutil
        
        self.log("Clearing Python cache files...")
        
        # Remove .pyc files and __pycache__ directories
        for root, dirs, files in os.walk(self.validation_dir):
            # Remove __pycache__ directories
            if '__pycache__' in dirs:
                pycache_path = os.path.join(root, '__pycache__')
                try:
                    shutil.rmtree(pycache_path)
                    self.log(f"Removed {pycache_path}")
                except Exception as e:
                    self.log(f"Failed to remove {pycache_path}: {e}")
            
            # Remove .pyc files
            for file in files:
                if file.endswith('.pyc'):
                    pyc_path = os.path.join(root, file)
                    try:
                        os.remove(pyc_path)
                        self.log(f"Removed {pyc_path}")
                    except Exception as e:
                        self.log(f"Failed to remove {pyc_path}: {e}")
        
        self.log("Cache cleared")

    VALIDATORS = {
        "structure": {
            "name": "Structure Validator",
            "description": "Validates project/module structure",
            "module": "structure-validator",
            "supports": ["project", "module"],
            "cli_style": "argparse",  # path --format json
        },
        "portability": {
            "name": "Portability Validator", 
            "description": "Detects hardcoded values",
            "module": "portability-validator",
            "supports": ["project", "module"],
            "cli_style": "argparse",  # path --format json
        },
        "a11y": {
            "name": "Accessibility Validator",
            "description": "Section 508 accessibility validation",
            "module": "a11y-validator",
            "supports": ["project", "module"],
            "cli_style": "argparse",  # path --format json (assumed)
        },
        "api": {
            "name": "API Tracer",
            "description": "API contract validation",
            "module": "api-tracer",
            "supports": ["project"],
            "cli_style": "click",  # --path /path --output json
        },
        "import": {
            "name": "Import Validator",
            "description": "Import path validation",
            "module": "import_validator",
            "supports": ["project", "module"],
            "cli_style": "click",  # --path /path --output json
        },
        "schema": {
            "name": "Schema Validator",
            "description": "Database schema validation",
            "module": "schema-validator",
            "supports": ["project"],
            "cli_style": "click_env",  # --path /path --output json + requires .env
        },
        "external_uid": {
            "name": "External UID Validator",
            "description": "Validates proper external UID to Supabase UUID conversion",
            "module": "external-uid-validator",
            "supports": ["project", "module"],
            "cli_style": "argparse",  # path --format json
        },
        "cora": {
            "name": "CORA Compliance",
            "description": "Checks backend compliance with CORA standards",
            "module": "cora-compliance-validator",
            "supports": ["project", "module"],
            "cli_style": "argparse",
        },
        "frontend": {
            "name": "Frontend Compliance",
            "description": "Checks frontend compliance with CORA standards",
            "module": "frontend-compliance-validator",
            "supports": ["project", "module"],
            "cli_style": "argparse",
        },
        "api_response": {
            "name": "API Response Validator",
            "description": "Validates API responses use camelCase keys",
            "module": "api-response-validator",
            "supports": ["project", "module"],
            "cli_style": "argparse",
        },
        # NOTE: role_naming is now integrated into API-Tracer's code_quality_validator
        # "role_naming": {
        #     "name": "Role Naming Validator",
        #     "description": "Validates role naming standards (sys_role, sys_admin, etc.)",
        #     "module": "role-naming-validator",
        #     "supports": ["project", "module"],
        #     "cli_style": "argparse",
        # },
        "rpc_function": {
            "name": "RPC Function Validator",
            "description": "Validates Lambda RPC calls match database function definitions",
            "module": "rpc-function-validator",
            "supports": ["project", "module"],
            "cli_style": "argparse",
        },
        "db_naming": {
            "name": "Database Naming Validator",
            "description": "Validates database naming standards compliance (Rules 1, 2, 6, 8)",
            "module": "db-naming-validator",
            "supports": ["project", "module"],
            "cli_style": "argparse",
        },
        "ui_library": {
            "name": "UI Library Validator",
            "description": "Validates Material-UI usage and detects Tailwind CSS, Shadcn, styled-components violations",
            "module": "ui-library-validator",
            "supports": ["project", "module"],
            "cli_style": "argparse",
        },
        "typescript": {
            "name": "TypeScript Type Check",
            "description": "Validates TypeScript type correctness across all packages",
            "module": "typescript-validator",
            "supports": ["project", "module"],
            "cli_style": "argparse",
        },
        "nextjs_routing": {
            "name": "Next.js Routing Validator",
            "description": "Validates Next.js App Router routes against CORA routing standards (parent routes, route groups, placeholders)",
            "module": "nextjs-routing-validator",
            "supports": ["project"],
            "cli_style": "argparse",
        },
        # NOTE: admin_auth (frontend admin pages) is now integrated into API-Tracer's auth_validator
        # "admin_auth": {
        #     "name": "Admin Auth Validator",
        #     "description": "Validates admin pages follow ADR-015 Pattern A authentication",
        #     "module": "admin-auth-validator",
        #     "supports": ["project", "module"],
        #     "cli_style": "argparse",
        # },
        "audit_columns": {
            "name": "Audit Column Validator",
            "description": "Validates module entity tables have required audit columns (ADR-015: created_at, created_by, updated_at, updated_by, is_deleted, deleted_at, deleted_by)",
            "module": "audit-column-validator",
            "supports": ["project", "module"],
            "cli_style": "argparse",
        },
        "module_toggle": {
            "name": "Module Toggle Validator",
            "description": "Validates module toggle compliance (core/functional classification, admin cards, navigation)",
            "module": "module-toggle-validator",
            "supports": ["project", "module"],
        "workspace_plugin": {
        },            "name": "Workspace Plugin Architecture",
            "description": "Validates modules follow ADR-017 workspace plugin architecture (no direct module-ws imports, use shared/workspace-plugin)",
            "module": "workspace-plugin-validator",
            "supports": ["project"],
            "cli_style": "argparse",
        },
        "admin_routes": {
            "name": "Admin Route Validator",
            "description": "Validates API Gateway routes follow ADR-018b route standards (scope prefixes, module shortnames, context passing)",
            "module": "admin-route-validator",
            "supports": ["project", "module"],
            "cli_style": "argparse",
        },
    }


    def log(self, message: str):
        """Log message if verbose mode enabled."""
        if self.verbose:
            print(f"[DEBUG] {message}")

    def run_validator(
        self,
        validator_key: str,
        target_path: str,
        validation_type: str,
    ) -> ValidationResult:
        """
        Run a single validator and return results.
        
        Args:
            validator_key: Key from VALIDATORS dict
            target_path: Path to validate
            validation_type: "project" or "module"
            
        Returns:
            ValidationResult with outcomes
        """
        import time
        start_time = time.time()
        
        validator_info = self.VALIDATORS.get(validator_key)
        if not validator_info:
            return ValidationResult(
                validator=validator_key,
                passed=False,
                errors=[f"Unknown validator: {validator_key}"],
                skipped=True,
                skip_reason="Unknown validator"
            )

        # Check if validator supports this validation type
        if validation_type not in validator_info["supports"]:
            return ValidationResult(
                validator=validator_key,
                passed=True,
                skipped=True,
                skip_reason=f"Validator does not support {validation_type} validation"
            )

        module_path = self.validation_dir / validator_info["module"]
        
        # Check if validator exists
        if not module_path.exists():
            return ValidationResult(
                validator=validator_key,
                passed=True,
                skipped=True,
                skip_reason=f"Validator not installed: {module_path}"
            )

        self.log(f"Running {validator_info['name']}...")

        try:
            # Build CLI command based on validator's CLI style
            cli_style = validator_info.get("cli_style", "argparse")
            # Keep hyphenated module names - Python -m supports directory names with hyphens
            module_name = validator_info["module"] + ".cli"
            
            if cli_style == "argparse":
                # Standard argparse: path --format json
                cmd = [
                    sys.executable, "-m", module_name,
                    target_path,
                    "--format", "json"
                ]
            elif cli_style == "click":
                # Click-based with --path flag: validate --path /path --output json
                cmd = [
                    sys.executable, "-m", module_name,
                    "validate",
                    "--path", target_path,
                    "--output", "json"
                ]
            elif cli_style == "click_env":
                # Click-based with --path flag and .env file: --path /path --output json
                # Note: schema-validator requires .env file in its directory
                # In template mode, use --static flag for schema validation
                cmd = [
                    sys.executable, "-m", module_name,
                    "--path", target_path,
                    "--output", "json"
                ]
                if self.template_mode:
                    cmd.append("--static")
            else:
                # Default to argparse style
                cmd = [
                    sys.executable, "-m", module_name,
                    target_path,
                    "--format", "json"
                ]
            
            self.log(f"Command: {' '.join(cmd)}")
            
            # Set PYTHONPATH to include validation directory so Python can import validator modules
            env = os.environ.copy()
            env['PYTHONPATH'] = str(self.validation_dir) + os.pathsep + env.get('PYTHONPATH', '')
            
            # Run the validator's CLI with JSON output
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=str(self.validation_dir),
                env=env,  # Pass modified environment
                timeout=300  # 5 minute timeout
            )

            duration_ms = int((time.time() - start_time) * 1000)

            # Try to parse JSON output
            try:
                output = json.loads(result.stdout) if result.stdout else {}
            except json.JSONDecodeError:
                # Fallback: capture both stdout and stderr
                output = {"raw_output": result.stdout}
                if result.stderr:
                    output["raw_error"] = result.stderr

            # Determine pass/fail from return code or output
            passed = result.returncode == 0
            
            # Get lists of actual error/warning objects
            # Some validators (like import_validator) nest errors in a summary object
            errors = output.get("errors", [])
            if not errors and "summary" in output:
                summary_errors = output.get("summary", {}).get("errors", [])
                # Convert integer counts to empty lists (validators that return {"summary": {"errors": 0}})
                errors = summary_errors if isinstance(summary_errors, list) else []
            
            warnings = output.get("warnings", [])
            if not warnings and "summary" in output:
                summary_warnings = output.get("summary", {}).get("warnings", [])
                # Convert integer counts to empty lists
                warnings = summary_warnings if isinstance(summary_warnings, list) else []
            
            info = output.get("info", [])
            details = output.get("details", {})
            
            # If validator failed but didn't provide errors, capture stderr
            if not passed and not errors:
                if result.stderr:
                    # Convert stderr to error messages
                    stderr_lines = [line.strip() for line in result.stderr.split('\n') if line.strip()]
                    if stderr_lines:
                        errors = stderr_lines[:10]  # Limit to first 10 lines
                elif output.get("raw_output"):
                    # Use stdout as error message if no stderr
                    errors = [f"Validator failed with output: {output['raw_output'][:200]}"]
                else:
                    # No output at all
                    errors = [f"Validator failed with exit code {result.returncode} but provided no output"]
            
            # Ensure errors and warnings are proper lists, not counts or [0] format
            # If a validator returned a count instead of a list, convert to empty list if 0
            if isinstance(errors, (int, float)):
                errors = [] if errors == 0 else [f"{int(errors)} errors (details not provided)"]
            elif isinstance(errors, list) and len(errors) > 0:
                # Check if list contains only numeric values (e.g. [0] or [5])
                if all(isinstance(e, (int, float)) for e in errors):
                    error_count = sum(int(e) for e in errors)
                    errors = [] if error_count == 0 else [f"{error_count} errors (details not provided)"]
            
            if isinstance(warnings, (int, float)):
                warnings = [] if warnings == 0 else [f"{int(warnings)} warnings (details not provided)"]
            elif isinstance(warnings, list) and len(warnings) > 0:
                # Check if list contains only numeric values
                if all(isinstance(w, (int, float)) for w in warnings):
                    warning_count = sum(int(w) for w in warnings)
                    warnings = [] if warning_count == 0 else [f"{warning_count} warnings (details not provided)"]
                
            return ValidationResult(
                validator=validator_key,
                passed=passed,
                errors=errors if isinstance(errors, list) else [str(errors)],
                warnings=warnings if isinstance(warnings, list) else [str(warnings)],
                info=info if isinstance(info, list) else [str(info)],
                details=details,
                duration_ms=duration_ms
            )

        except subprocess.TimeoutExpired:
            return ValidationResult(
                validator=validator_key,
                passed=False,
                errors=["Validator timed out after 300 seconds"],
                duration_ms=300000
            )
        except Exception as e:
            return ValidationResult(
                validator=validator_key,
                passed=False,
                errors=[f"Validator error: {str(e)}"],
                duration_ms=int((time.time() - start_time) * 1000)
            )

    def validate_project(
        self,
        project_path: str,
        validators: Optional[list] = None,
    ) -> ValidationReport:
        """
        Validate a CORA project.
        
        Args:
            project_path: Path to project root
            validators: List of validator keys to run, or None for all
            
        Returns:
            ValidationReport with all results
        """
        import time
        start_time = time.time()
        
        # Clear cache to ensure fresh results
        self.clear_cache()
        
        # Default to all validators that support project validation
        if validators is None:
            validators = [
                k for k, v in self.VALIDATORS.items() 
                if "project" in v["supports"]
            ]

        report = ValidationReport(
            target_path=project_path,
            validation_type="project",
            timestamp=datetime.now().isoformat(),
            validators_run=validators,
        )

        for validator_key in validators:
            result = self.run_validator(validator_key, project_path, "project")
            report.results[validator_key] = result
            
            if not result.skipped:
                if not result.passed:
                    report.overall_passed = False
                report.total_errors += len(result.errors)
                report.total_warnings += len(result.warnings)

        report.duration_ms = int((time.time() - start_time) * 1000)
        report.certification_level = self._determine_certification(report)
        
        return report

    def validate_module(
        self,
        module_path: str,
        validators: Optional[list] = None,
    ) -> ValidationReport:
        """
        Validate a CORA module.
        
        Args:
            module_path: Path to module directory
            validators: List of validator keys to run, or None for all
            
        Returns:
            ValidationReport with all results
        """
        import time
        start_time = time.time()
        
        # Clear cache to ensure fresh results
        self.clear_cache()
        
        # Default to all validators that support module validation
        if validators is None:
            validators = [
                k for k, v in self.VALIDATORS.items() 
                if "module" in v["supports"]
            ]

        report = ValidationReport(
            target_path=module_path,
            validation_type="module",
            timestamp=datetime.now().isoformat(),
            validators_run=validators,
        )

        for validator_key in validators:
            result = self.run_validator(validator_key, module_path, "module")
            report.results[validator_key] = result
            
            if not result.skipped:
                if not result.passed:
                    report.overall_passed = False
                report.total_errors += len(result.errors)
                report.total_warnings += len(result.warnings)

        report.duration_ms = int((time.time() - start_time) * 1000)
        report.certification_level = self._determine_certification(report)
        
        return report

    def _determine_certification(self, report: ValidationReport) -> str:
        """
        Determine certification level based on validation results.
        
        Bronze: Structure passes, no critical errors
        Silver: Bronze + portability passes
        Gold: Silver + all validators pass
        """
        results = report.results
        
        # Check structure validator
        structure_result = results.get("structure")
        if not structure_result or not structure_result.passed:
            return None  # No certification
        
        # Bronze: Structure passes
        if report.total_errors > 0:
            return ValidationLevel.BRONZE.value
        
        # Check portability validator
        portability_result = results.get("portability")
        if not portability_result or not portability_result.passed:
            return ValidationLevel.BRONZE.value
        
        # Silver: Structure + portability pass
        if report.total_warnings > 0:
            return ValidationLevel.SILVER.value
        
        # Gold: All validators pass with no warnings
        if report.overall_passed:
            return ValidationLevel.GOLD.value
        
        return ValidationLevel.SILVER.value


class ReportFormatter:
    """Format validation reports for output."""

    def __init__(self, use_colors: bool = True):
        self.use_colors = use_colors

    def _color(self, text: str, color_code: str) -> str:
        """Apply ANSI color if colors enabled."""
        if not self.use_colors:
            return text
        return f"\033[{color_code}m{text}\033[0m"

    def _green(self, text: str) -> str:
        return self._color(text, "32")

    def _red(self, text: str) -> str:
        return self._color(text, "31")

    def _yellow(self, text: str) -> str:
        return self._color(text, "33")

    def _blue(self, text: str) -> str:
        return self._color(text, "34")

    def _bold(self, text: str) -> str:
        return self._color(text, "1")
    
    def _extract_module(self, item) -> str:
        """Extract module name from error/warning item."""
        if isinstance(item, dict):
            # Try direct module field
            if item.get('module'):
                return item['module']
            
            # Try lambda file path
            if item.get('lambda_file'):
                parts = item['lambda_file'].split('/')
                for part in parts:
                    if part.startswith('module-'):
                        return part
            
            # Try frontend file path
            if item.get('frontend_file'):
                parts = item['frontend_file'].split('/')
                for part in parts:
                    if part.startswith('module-'):
                        return part
            
            # Try gateway file path
            if item.get('gateway_file'):
                parts = item['gateway_file'].split('/')
                for part in parts:
                    if part.startswith('module-'):
                        return part
            
            # Try generic file field
            if item.get('file'):
                parts = item['file'].split('/')
                for part in parts:
                    if part.startswith('module-'):
                        return part
        
        # Try to extract from string representation
        if isinstance(item, str):
            parts = item.split('/')
            for part in parts:
                if part.startswith('module-'):
                    # Extract just the module name (e.g., "module-kb")
                    module_part = part.split('/')[0].split(':')[0]
                    if module_part.startswith('module-'):
                        return module_part
        
        return "general"  # Fallback for non-module-specific issues
    
    def _extract_category(self, item, validator_key: str) -> str:
        """Extract error category from item."""
        if isinstance(item, dict):
            # Use mismatch_type if available (api-tracer)
            if item.get('mismatch_type'):
                mtype = item['mismatch_type']
                # Simplify category names
                if mtype.startswith('auth_'):
                    return 'Auth'
                elif mtype.startswith('quality_'):
                    return 'Code Quality'
                elif mtype in ['route_not_found', 'method_mismatch', 'parameter_mismatch']:
                    return 'Route Matching'
                else:
                    return mtype.replace('_', ' ').title()
            
            # Use category field if available
            if item.get('category'):
                return item['category']
        
        # Use validator name as fallback
        validator_names = {
            'a11y': 'Accessibility',
            'api': 'API Tracer',
            'structure': 'Structure',
            'portability': 'Portability',
            'frontend': 'Frontend Compliance',
            'typescript': 'TypeScript',
            'import': 'Import',
            'schema': 'Schema',
            'cora': 'CORA Compliance',
            'db_naming': 'Database Naming',
            'ui_library': 'UI Library',
            'nextjs_routing': 'Next.js Routing',
            'audit_columns': 'Audit Columns',
            'workspace_plugin': 'Workspace Plugin',
            'admin_routes': 'Admin Routes',
            'rpc_function': 'RPC Function',
            'external_uid': 'External UID',
            'api_response': 'API Response',
        }
        return validator_names.get(validator_key, validator_key.replace('_', ' ').title())
    
    def _aggregate_by_module(self, report: ValidationReport) -> dict:
        """Aggregate all validator results by module."""
        modules = {}
        
        for validator_key, result in report.results.items():
            if result.skipped:
                continue
            
            # Process errors
            for error in result.errors:
                module = self._extract_module(error)
                category = self._extract_category(error, validator_key)
                
                if module not in modules:
                    modules[module] = {'errors': {}, 'warnings': {}}
                
                if category not in modules[module]['errors']:
                    modules[module]['errors'][category] = []
                
                modules[module]['errors'][category].append({
                    'validator': validator_key,
                    'item': error
                })
            
            # Process warnings
            for warning in result.warnings:
                module = self._extract_module(warning)
                category = self._extract_category(warning, validator_key)
                
                if module not in modules:
                    modules[module] = {'errors': {}, 'warnings': {}}
                
                if category not in modules[module]['warnings']:
                    modules[module]['warnings'][category] = []
                
                modules[module]['warnings'][category].append({
                    'validator': validator_key,
                    'item': warning
                })
        
        return modules
    
    def _get_top_issues(self, modules: dict) -> list:
        """Get top issues across all modules."""
        issue_counts = {}
        
        for module, data in modules.items():
            # Count errors by category
            for category, errors in data['errors'].items():
                if category not in issue_counts:
                    issue_counts[category] = {'count': 0, 'type': 'error'}
                issue_counts[category]['count'] += len(errors)
            
            # Count warnings by category
            for category, warnings in data['warnings'].items():
                if category not in issue_counts:
                    issue_counts[category] = {'count': 0, 'type': 'warning'}
                issue_counts[category]['count'] += len(warnings)
        
        # Sort by count descending
        sorted_issues = sorted(
            issue_counts.items(),
            key=lambda x: x[1]['count'],
            reverse=True
        )
        
        return sorted_issues[:10]  # Top 10

    def _generate_module_stats(self, modules_data: dict) -> dict:
        """Generate statistics for module summary table."""
        stats = {}
        
        for module, data in modules_data.items():
            mod_stats = {
                "errors": 0, "warnings": 0,
                "critical": 0, "high": 0, "medium": 0, "low": 0
            }
            
            # Count errors
            for category, items in data['errors'].items():
                mod_stats["errors"] += len(items)
                for item in items:
                    # Extract severity from nested item structure
                    # Structure is {'validator': key, 'item': error_dict or str}
                    # But item itself might be a string if validator returned simple errors
                    if isinstance(item, dict) and 'item' in item:
                        error_item = item['item']
                        if isinstance(error_item, dict):
                            severity = error_item.get('severity', 'high').lower()
                        else:
                            severity = 'high'
                    else:
                        # item is a string or doesn't have expected structure
                        severity = 'high'
                        
                    if severity in mod_stats:
                        mod_stats[severity] += 1
                    else:
                        mod_stats['high'] += 1 # Default to high for errors
            
            # Count warnings
            for category, items in data['warnings'].items():
                mod_stats["warnings"] += len(items)
                for item in items:
                    # Handle both dict and string items
                    if isinstance(item, dict) and 'item' in item:
                        warning_item = item['item']
                        if isinstance(warning_item, dict):
                            severity = warning_item.get('severity', 'medium').lower()
                        else:
                            severity = 'medium'
                    else:
                        # item is a string or doesn't have expected structure
                        severity = 'medium'
                        
                    if severity in mod_stats:
                        mod_stats[severity] += 1
                    else:
                        mod_stats['medium'] += 1 # Default to medium for warnings
            
            stats[module] = mod_stats
            
        return stats

    def _format_module_table(self, module_stats: dict) -> list:
        """Format module statistics as an ASCII table."""
        lines = []
        
        if not module_stats:
            return lines

        # Headers
        headers = ["Module", "Errors", "Warnings", "Critical", "High", "Medium", "Low"]
        
        # Prepare rows
        rows = []
        # Sort modules: general last, others alpha
        sorted_modules = sorted([m for m in module_stats.keys() if m != "general"]) + (["general"] if "general" in module_stats else [])
        
        totals = {k: 0 for k in ["errors", "warnings", "critical", "high", "medium", "low"]}
        
        for module in sorted_modules:
            s = module_stats[module]
            row = [
                module,
                str(s["errors"]),
                str(s["warnings"]),
                str(s["critical"]),
                str(s["high"]),
                str(s["medium"]),
                str(s["low"])
            ]
            rows.append(row)
            for k in totals:
                totals[k] += s[k]
        
        # Add totals row
        total_row = ["TOTAL"] + [str(totals[k]) for k in ["errors", "warnings", "critical", "high", "medium", "low"]]
        
        # Calculate column widths
        col_widths = [len(h) for h in headers]
        for row in rows + [total_row]:
            for i, cell in enumerate(row):
                col_widths[i] = max(col_widths[i], len(cell))
        
        # Add padding
        col_widths = [w + 2 for w in col_widths]
        
        # Helper to format row
        def format_row(items, align="right"):
            line = "│"
            for i, item in enumerate(items):
                # First column (Module) left aligned, others right aligned
                w = col_widths[i]
                if i == 0:
                    line += f" {item:<{w-1}}│"
                else:
                    line += f" {item:>{w-1}}│"
            return line

        # Separator line
        def separator(left="├", mid="┼", right="┤", fill="─"):
            line = left
            for i, w in enumerate(col_widths):
                line += fill * w
                if i < len(col_widths) - 1:
                    line += mid
            line += right
            return line

        # Build table
        lines.append(separator("┌", "┬", "┐"))
        lines.append(format_row(headers))
        lines.append(separator())
        
        for row in rows:
            lines.append(format_row(row))
            
        lines.append(separator("╞", "╪", "╡", "═"))
        lines.append(format_row(total_row))
        lines.append(separator("└", "┴", "┘"))
        
        return lines

    def format(self, report: ValidationReport, output_format: OutputFormat, detailed: bool = False) -> str:
        """Format report in specified format."""
        if output_format == OutputFormat.JSON:
            return self.format_json(report)
        elif output_format == OutputFormat.MARKDOWN:
            if detailed:
                return self.format_detailed_markdown(report)
            return self.format_markdown(report)
        else:
            return self.format_text(report)

    def _format_api_tracer_summary(self, result: ValidationResult) -> list:
        """Format API-Tracer results with module grouping (matches direct CLI output)."""
        lines = []
        
        # Group errors and warnings by module
        def get_module(item):
            """Extract module name from error/warning dict."""
            if isinstance(item, dict):
                # Try lambda file first
                if item.get('lambda_file'):
                    parts = item['lambda_file'].split('/')
                    for i, part in enumerate(parts):
                        if part.startswith('module-'):
                            return part
                
                # Try frontend file
                if item.get('frontend_file'):
                    parts = item['frontend_file'].split('/')
                    for part in parts:
                        if part.startswith('module-'):
                            return part
                
                # Try gateway file
                if item.get('gateway_file'):
                    parts = item['gateway_file'].split('/')
                    for part in parts:
                        if part.startswith('module-'):
                            return part
            
            return "general"  # Fallback
        
        # Group by module
        errors_by_module = {}
        warnings_by_module = {}
        
        for error in result.errors:
            if isinstance(error, dict):
                module = get_module(error)
                if module not in errors_by_module:
                    errors_by_module[module] = []
                errors_by_module[module].append(error)
        
        for warning in result.warnings:
            if isinstance(warning, dict):
                module = get_module(warning)
                if module not in warnings_by_module:
                    warnings_by_module[module] = []
                warnings_by_module[module].append(warning)
        
        # Display module summaries
        all_modules = sorted(set(list(errors_by_module.keys()) + list(warnings_by_module.keys())))
        
        for module in all_modules:
            module_errors = errors_by_module.get(module, [])
            module_warnings = warnings_by_module.get(module, [])
            
            if not module_errors and not module_warnings:
                continue
            
            lines.append(f"  {self._bold(module.upper())}:")
            
            if module_errors:
                # Categorize by mismatch_type
                route_errors = []
                auth_errors = []
                quality_errors = []
                other_errors = []
                
                for err in module_errors:
                    mtype = err.get('mismatch_type', '')
                    if mtype.startswith('auth_'):
                        auth_errors.append(err)
                    elif mtype.startswith('quality_'):
                        quality_errors.append(err)
                    elif mtype in ['route_not_found', 'method_mismatch', 'parameter_mismatch', 
                                   'missing_lambda_handler', 'orphaned_route', 'path_parameter_naming',
                                   'lambda_path_param_extraction']:
                        route_errors.append(err)
                    else:
                        other_errors.append(err)
                
                lines.append(f"    {self._red('Errors')} ({len(module_errors)}):")
                
                if route_errors:
                    lines.append(f"      {self._blue('Route Matching')}: {len(route_errors)} errors")
                    route_types = {}
                    for e in route_errors:
                        mtype = e.get('mismatch_type', 'unknown')
                        route_types[mtype] = route_types.get(mtype, 0) + 1
                    for mtype, count in sorted(route_types.items()):
                        lines.append(f"        - {mtype}: {count}")
                
                if auth_errors:
                    lines.append(f"      {self._blue('Auth Validation')}: {len(auth_errors)} errors")
                
                if quality_errors:
                    lines.append(f"      {self._blue('Code Quality')}: {len(quality_errors)} errors")
                    quality_types = {}
                    for e in quality_errors:
                        mtype = e.get('mismatch_type', '').replace('quality_', '')
                        quality_types[mtype] = quality_types.get(mtype, 0) + 1
                    for mtype, count in sorted(quality_types.items()):
                        lines.append(f"        - {mtype}: {count}")
                
                if other_errors:
                    lines.append(f"      {self._blue('Other')}: {len(other_errors)} errors")
            
            if module_warnings:
                lines.append(f"    {self._yellow('Warnings')} ({len(module_warnings)}):")
                warning_types = {}
                for w in module_warnings:
                    mtype = w.get('mismatch_type', 'unknown')
                    warning_types[mtype] = warning_types.get(mtype, 0) + 1
                for mtype, count in sorted(warning_types.items()):
                    lines.append(f"      - {mtype}: {count}")
            
            lines.append("")
        
        return lines
    
    def format_json(self, report: ValidationReport) -> str:
        """Format as JSON."""
        return json.dumps(report.to_dict(), indent=2)

    def format_text(self, report: ValidationReport) -> str:
        """Format as colored text with integrated module-level reporting."""
        lines = []
        
        # Header
        lines.append("=" * 80)
        lines.append(self._bold("CORA Validation Report"))
        lines.append("=" * 80)
        lines.append("")
        
        # Aggregate by module
        modules = self._aggregate_by_module(report)
        
        # MODULE SUMMARY - Primary focus
        if modules:
            lines.append(self._bold("MODULE SUMMARY:"))
            
            # Generate and add stats table
            module_stats = self._generate_module_stats(modules)
            table_lines = self._format_module_table(module_stats)
            lines.extend(table_lines)
            lines.append("")
            
            lines.append(self._bold("DETAILED BREAKDOWN:"))
            lines.append("-" * 80)
            
            # Sort modules: "general" last, others alphabetically
            sorted_modules = sorted(
                [m for m in modules.keys() if m != "general"]
            ) + (["general"] if "general" in modules else [])
            
            for module in sorted_modules:
                data = modules[module]
                error_count = sum(len(errs) for errs in data['errors'].values())
                warning_count = sum(len(warns) for warns in data['warnings'].values())
                
                if error_count == 0 and warning_count == 0:
                    continue
                
                # Module header
                module_display = module.upper() if module != "general" else "GENERAL (Non-Module Issues)"
                lines.append(f"\n{self._bold(module_display)}:")
                
                # Show errors by category
                if data['errors']:
                    for category in sorted(data['errors'].keys()):
                        errors = data['errors'][category]
                        count = len(errors)
                        lines.append(f"  {self._red('✗')} {category}: {self._red(str(count))} error{'s' if count != 1 else ''}")
                
                # Show warnings by category
                if data['warnings']:
                    for category in sorted(data['warnings'].keys()):
                        warnings = data['warnings'][category]
                        count = len(warnings)
                        lines.append(f"  {self._yellow('⚠')} {category}: {self._yellow(str(count))} warning{'s' if count != 1 else ''}")
                
                # Module total
                total_issues = error_count + warning_count
                lines.append(f"  {self._bold('Total')}: {self._red(str(error_count))} error{'s' if error_count != 1 else ''}, {self._yellow(str(warning_count))} warning{'s' if warning_count != 1 else ''}")
            
            lines.append("")
        
        # TOP ISSUES - Aggregate across all modules
        if modules:
            top_issues = self._get_top_issues(modules)
            
            if top_issues:
                lines.append(self._bold("TOP ISSUES (Across All Validators):"))
                lines.append("-" * 80)
                
                for i, (category, info) in enumerate(top_issues, 1):
                    count = info['count']
                    issue_type = info['type']
                    
                    if issue_type == 'error':
                        lines.append(f"{i:2}. {category}: {self._red(str(count))} occurrences")
                    else:
                        lines.append(f"{i:2}. {category}: {self._yellow(str(count))} occurrences")
                
                lines.append("")
        
        # VALIDATION SUMMARY
        lines.append(self._bold("VALIDATION SUMMARY:"))
        lines.append("-" * 80)
        lines.append(f"Target: {report.target_path}")
        lines.append(f"Type: {report.validation_type}")
        lines.append(f"Timestamp: {report.timestamp}")
        lines.append(f"Duration: {report.duration_ms}ms")
        lines.append("")
        
        # Overall status
        status = self._green("✓ PASSED") if report.overall_passed else self._red("✗ FAILED")
        lines.append(f"Overall Status: {status}")
        
        if report.certification_level:
            cert_colors = {
                "bronze": self._yellow,
                "silver": lambda x: self._color(x, "37"),  # White/silver
                "gold": self._yellow,
            }
            cert_fn = cert_colors.get(report.certification_level, str)
            lines.append(f"Certification: {cert_fn(report.certification_level.upper())}")
        
        lines.append(f"Total Errors: {self._red(str(report.total_errors)) if report.total_errors else '0'}")
        lines.append(f"Total Warnings: {self._yellow(str(report.total_warnings)) if report.total_warnings else '0'}")
        
        # Validators run
        lines.append(f"Validators Run: {len([r for r in report.results.values() if not r.skipped])}/{len(report.results)}")
        
        # Show which validators passed/failed
        passed_validators = [k for k, r in report.results.items() if r.passed and not r.skipped]
        failed_validators = [k for k, r in report.results.items() if not r.passed and not r.skipped]
        
        if passed_validators:
            lines.append(f"Passed: {', '.join(passed_validators)}")
        if failed_validators:
            lines.append(f"Failed: {', '.join(failed_validators)}")
        
        lines.append("")
        lines.append("=" * 80)
        
        return "\n".join(lines)

    def format_markdown(self, report: ValidationReport) -> str:
        """Format as Markdown."""
        lines = []
        
        # Header
        lines.append("# CORA Validation Report")
        lines.append("")
        
        # Summary table
        status_emoji = "✅" if report.overall_passed else "❌"
        lines.append("## Summary")
        lines.append("")
        lines.append("| Property | Value |")
        lines.append("|----------|-------|")
        lines.append(f"| Target | `{report.target_path}` |")
        lines.append(f"| Type | {report.validation_type} |")
        lines.append(f"| Status | {status_emoji} {'PASSED' if report.overall_passed else 'FAILED'} |")
        lines.append(f"| Certification | {report.certification_level or 'None'} |")
        lines.append(f"| Errors | {report.total_errors} |")
        lines.append(f"| Warnings | {report.total_warnings} |")
        lines.append(f"| Duration | {report.duration_ms}ms |")
        lines.append(f"| Timestamp | {report.timestamp} |")
        lines.append("")
        
        # Validator results
        lines.append("## Validator Results")
        lines.append("")
        
        for validator_key, result in report.results.items():
            validator_info = CoraValidator.VALIDATORS.get(validator_key, {})
            name = validator_info.get("name", validator_key)
            
            if result.skipped:
                status = f"⏭️ Skipped ({result.skip_reason})"
            elif result.passed:
                status = "✅ Passed"
            else:
                status = "❌ Failed"
            
            lines.append(f"### {name}")
            lines.append("")
            lines.append(f"**Status:** {status}")
            lines.append(f"**Duration:** {result.duration_ms}ms")
            lines.append("")
            
            if result.errors:
                lines.append("**Errors:**")
                for error in result.errors:
                    if isinstance(error, dict):
                        lines.append(f"- {error.get('message', str(error))}")
                    else:
                        lines.append(f"- {error}")
                lines.append("")
            
            if result.warnings:
                lines.append("**Warnings:**")
                for warning in result.warnings:
                    if isinstance(warning, dict):
                        lines.append(f"- {warning.get('message', str(warning))}")
                    else:
                        lines.append(f"- {warning}")
                lines.append("")
        
        return "\n".join(lines)
    
    def format_detailed_markdown(self, report: ValidationReport) -> str:
        """Format as Detailed Markdown with grouped errors."""
        lines = []
        
        # Header
        lines.append("# Detailed Validation Report")
        lines.append(f"**Generated:** {report.timestamp}")
        lines.append(f"**Target:** `{report.target_path}`")
        lines.append("")
        
        # Table of Contents
        lines.append("## Table of Contents")
        for key in report.results.keys():
            validator_info = CoraValidator.VALIDATORS.get(key, {})
            name = validator_info.get("name", key)
            lines.append(f"- [{name}](#{key.replace('_', '-')})")
        lines.append("")
        
        lines.append("---")
        lines.append("")

        for validator_key, result in report.results.items():
            validator_info = CoraValidator.VALIDATORS.get(validator_key, {})
            name = validator_info.get("name", validator_key)
            
            lines.append(f"## {name} <a name=\"{validator_key.replace('_', '-')}\"></a>")
            lines.append("")
            
            if result.skipped:
                lines.append(f"⏭️ **Skipped:** {result.skip_reason}")
                lines.append("")
                continue
                
            if result.passed:
                lines.append("✅ **Passed**")
            else:
                lines.append(f"❌ **Failed** ({len(result.errors)} errors)")
            
            lines.append("")
            
            # Special handling for certain validators that provide structured details
            if validator_key == "schema" and result.details:
                # Schema errors often have specific structure
                if "errors" in result.details:
                     # Group errors by file if possible, or just list them
                     lines.append("### Schema Errors")
                     for err in result.details.get("errors", []):
                        lines.append(f"- **Issue:** {err.get('issue', 'Unknown')}")
                        lines.append(f"  - Table: {err.get('table', 'N/A')}")
                        lines.append(f"  - Severity: {err.get('severity', 'N/A')}")
                        lines.append("")
            
            elif result.errors:
                lines.append("### Errors")
                # Group by file if possible (simple heuristic)
                errors_by_file = {}
                general_errors = []
                
                for error in result.errors:
                    err_str = str(error)
                    # Look for file paths at start of error message
                    parts = err_str.split(':', 1)
                    if len(parts) > 1 and (parts[0].endswith('.py') or parts[0].endswith('.ts') or parts[0].endswith('.tsx') or '/' in parts[0]):
                        file = parts[0]
                        msg = parts[1].strip()
                        if file not in errors_by_file:
                            errors_by_file[file] = []
                        errors_by_file[file].append(msg)
                    else:
                        general_errors.append(err_str)
                
                if errors_by_file:
                    for file, errs in errors_by_file.items():
                        lines.append(f"#### `{file}`")
                        for err in errs:
                            lines.append(f"- {err}")
                        lines.append("")
                
                if general_errors:
                    if errors_by_file:
                        lines.append("#### General Errors")
                    for err in general_errors:
                         lines.append(f"- {err}")
                    lines.append("")
            
            if result.warnings:
                lines.append("### Warnings")
                for warning in result.warnings:
                     lines.append(f"- {str(warning)}")
                lines.append("")

            lines.append("---")
            lines.append("")
            
        return "\n".join(lines)


def create_parser() -> argparse.ArgumentParser:
    """Create argument parser."""
    parser = argparse.ArgumentParser(
        prog="cora-validate",
        description="CORA Unified Validation Orchestrator",
        epilog="""
Examples:
  # Validate a project with all validators
  python cora-validate.py project /path/to/my-project-stack

  # Validate and save results
  python cora-validate.py project /path/to/project --save-results --detailed-report

  # Generate report from existing results
  python cora-validate.py report validation-results/ --format markdown --output report.md
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    subparsers = parser.add_subparsers(dest="command", help="Validation commands")

    # Common arguments
    def add_common_args(p):
        p.add_argument(
            "--validators",
            nargs="+",
            choices=list(CoraValidator.VALIDATORS.keys()),
            help="Specific validators to run (default: all)"
        )
        p.add_argument(
            "--format", "-f",
            choices=["text", "json", "markdown"],
            default="text",
            help="Output format"
        )
        p.add_argument(
            "--output", "-o",
            help="Write report to file"
        )
        p.add_argument(
            "--certify",
            action="store_true",
            help="Generate certification report"
        )
        p.add_argument(
            "--detailed-report",
            action="store_true",
            help="Generate detailed report (Markdown only)"
        )
        p.add_argument(
            "--save-results",
            action="store_true",
            help="Save individual validator results to validation-results/ directory"
        )
        p.add_argument(
            "--verbose", "-v",
            action="store_true",
            help="Verbose output"
        )
        p.add_argument(
            "--no-color",
            action="store_true",
            help="Disable colored output"
        )
        p.add_argument(
            "--template-mode",
            action="store_true",
            help="Template validation mode (no live database required). Uses static schema parsing."
        )

    # Project validation
    project_parser = subparsers.add_parser("project", help="Validate a CORA project")
    project_parser.add_argument("path", help="Path to project root")
    add_common_args(project_parser)

    # Module validation
    module_parser = subparsers.add_parser("module", help="Validate a CORA module")
    module_parser.add_argument("path", help="Path to module directory")
    add_common_args(module_parser)

    # Report generation command
    report_parser = subparsers.add_parser("report", help="Generate report from existing results")
    report_parser.add_argument("results_dir", help="Directory containing JSON results")
    report_parser.add_argument("--format", "-f", choices=["text", "json", "markdown"], default="markdown", help="Output format")
    report_parser.add_argument("--output", "-o", help="Write report to file")
    report_parser.add_argument("--detailed-report", action="store_true", help="Generate detailed report")

    # List validators
    list_parser = subparsers.add_parser("list", help="List available validators")
    list_parser.add_argument("--format", "-f", choices=["text", "json"], default="text", help="Output format")

    return parser


def load_report_from_results(results_dir: str) -> ValidationReport:
    """Load ValidationReport from a directory of JSON results."""
    path = Path(results_dir)
    if not path.exists():
        raise FileNotFoundError(f"Results directory not found: {results_dir}")
        
    summary_path = path / "summary.json"
    if not summary_path.exists():
        raise FileNotFoundError(f"Summary file not found: {summary_path}")
        
    with open(summary_path, "r") as f:
        data = json.load(f)
        
    # Reconstruct ValidationResult objects
    results = {}
    for key, val in data.get("results", {}).items():
        results[key] = ValidationResult(**val)
    
    # Reconstruct ValidationReport
    report = ValidationReport(
        target_path=data.get("target_path", ""),
        validation_type=data.get("validation_type", "project"),
        timestamp=data.get("timestamp", ""),
        validators_run=data.get("validators_run", []),
        results=results,
        overall_passed=data.get("overall_passed", False),
        total_errors=data.get("total_errors", 0),
        total_warnings=data.get("total_warnings", 0),
        certification_level=data.get("certification_level"),
        duration_ms=data.get("duration_ms", 0)
    )
    return report


def main():
    """Main entry point."""
    parser = create_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    # List validators
    if args.command == "list":
        if args.format == "json":
            print(json.dumps(CoraValidator.VALIDATORS, indent=2))
        else:
            print("\nAvailable Validators:")
            print("-" * 60)
            for key, info in CoraValidator.VALIDATORS.items():
                supports = ", ".join(info["supports"])
                print(f"  {key:<12} - {info['name']}")
                print(f"               {info['description']}")
                print(f"               Supports: {supports}")
                print()
        return 0
        
    # Report generation command
    if args.command == "report":
        try:
            report = load_report_from_results(args.results_dir)
            
            output_format = OutputFormat(args.format)
            formatter = ReportFormatter(use_colors=True)
            formatted_report = formatter.format(report, output_format, detailed=args.detailed_report)
            
            if args.output:
                with open(args.output, "w") as f:
                    f.write(formatted_report)
                print(f"Report written to: {args.output}")
            else:
                print(formatted_report)
            return 0
        except Exception as e:
            print(f"Error generating report: {e}", file=sys.stderr)
            return 1

    # Validate path exists
    path = Path(args.path)
    if not path.exists():
        print(f"Error: Path not found: {args.path}", file=sys.stderr)
        return 1

    # Run validation
    template_mode = getattr(args, 'template_mode', False)
    validator = CoraValidator(verbose=args.verbose, template_mode=template_mode)
    
    if args.command == "project":
        report = validator.validate_project(
            str(path.resolve()),
            validators=args.validators
        )
    elif args.command == "module":
        report = validator.validate_module(
            str(path.resolve()),
            validators=args.validators
        )
    else:
        parser.print_help()
        return 1
        
    # Save results if requested
    if args.save_results:
        results_dir = Path("validation-results")
        report.save_results(results_dir)
        print(f"Results saved to: {results_dir.absolute()}")

    # Format output
    output_format = OutputFormat(args.format)
    formatter = ReportFormatter(use_colors=not getattr(args, 'no_color', False))
    formatted_report = formatter.format(report, output_format, detailed=args.detailed_report)

    # Write to file or stdout
    if args.output:
        with open(args.output, "w") as f:
            f.write(formatted_report)
        print(f"Report written to: {args.output}")
    else:
        print(formatted_report)

    # Return exit code
    return 0 if report.overall_passed else 1


if __name__ == "__main__":
    sys.exit(main())
