#!/usr/bin/env python3
"""
CORA Structure Validator

Validates project and module structure against CORA standards defined in:
- cora-project-boilerplate.md
- cora-core-modules.md
- cora-module-definition-of-done.md
"""

import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ValidationIssue:
    """A single validation issue."""
    severity: str  # "error", "warning", "info"
    message: str
    path: str
    rule: str
    suggestion: Optional[str] = None


@dataclass
class ValidationResult:
    """Results from structure validation."""
    target_path: str
    validation_type: str  # "project" or "module"
    passed: bool = True
    errors: list = field(default_factory=list)
    warnings: list = field(default_factory=list)
    info: list = field(default_factory=list)

    def add_issue(self, issue: ValidationIssue):
        """Add an issue to the appropriate list."""
        issue_dict = {
            "message": issue.message,
            "path": issue.path,
            "rule": issue.rule,
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
            "validation_type": self.validation_type,
            "passed": self.passed,
            "status": "passed" if self.passed else "failed",
            "errors": self.errors,
            "warnings": self.warnings,
            "info": self.info,
            "summary": {
                "errors": len(self.errors),
                "warnings": len(self.warnings),
                "info": len(self.info),
                "total_issues": len(self.errors) + len(self.warnings) + len(self.info),
            }
        }


class StructureValidator:
    """Validates CORA project and module structure."""

    # Required directories for stack repo
    STACK_REQUIRED_DIRS = [
        "apps",
        "packages",
        "scripts",
    ]

    # Required files for stack repo
    STACK_REQUIRED_FILES = [
        "pnpm-workspace.yaml",
        "package.json",
        "README.md",
    ]

    # Optional but recommended stack files
    STACK_RECOMMENDED_FILES = [
        ".clinerules",
        "tsconfig.json",
        ".gitignore",
    ]

    # Required directories for infra repo
    INFRA_REQUIRED_DIRS = [
        "envs",
        "modules",
        "lambdas",
        "scripts",
    ]

    # Required files for infra repo
    INFRA_REQUIRED_FILES = [
        "README.md",
    ]

    # Environment directories
    INFRA_ENVIRONMENTS = ["dev", "stg", "prd"]

    # Required module structure
    MODULE_REQUIRED_STRUCTURE = {
        "backend": {
            "dirs": [],
            "files": [],
            "optional_dirs": ["layers"],
        },
        "frontend": {
            "dirs": ["src"],
            "files": ["package.json"],
            "optional_dirs": ["src/components", "src/hooks", "src/contexts"],
        },
    }

    # Required module files
    MODULE_REQUIRED_FILES = [
        "package.json",
        "README.md",
    ]

    # Recommended module files
    MODULE_RECOMMENDED_FILES = [
        "module.json",
        "tsconfig.json",
    ]

    def __init__(self, verbose: bool = False):
        self.verbose = verbose

    def log(self, message: str):
        """Log if verbose mode enabled."""
        if self.verbose:
            print(f"[DEBUG] {message}")

    def validate_project(self, project_path: str) -> ValidationResult:
        """
        Validate a CORA project (either stack or infra repo).
        
        Args:
            project_path: Path to project root
            
        Returns:
            ValidationResult with findings
        """
        path = Path(project_path)
        result = ValidationResult(
            target_path=project_path,
            validation_type="project"
        )

        if not path.exists():
            result.add_issue(ValidationIssue(
                severity="error",
                message=f"Project path does not exist: {project_path}",
                path=project_path,
                rule="path-exists"
            ))
            return result

        # Determine project type
        project_type = self._detect_project_type(path)
        
        if project_type == "stack":
            self._validate_stack_project(path, result)
        elif project_type == "infra":
            self._validate_infra_project(path, result)
        else:
            result.add_issue(ValidationIssue(
                severity="error",
                message="Cannot determine project type. Expected stack or infra repo structure.",
                path=project_path,
                rule="project-type",
                suggestion="Ensure project follows CORA two-repo pattern ({project}-stack or {project}-infra)"
            ))

        # Validate project.json if exists
        self._validate_project_json(path, result)

        return result

    def validate_module(self, module_path: str) -> ValidationResult:
        """
        Validate a CORA module structure.
        
        Args:
            module_path: Path to module directory
            
        Returns:
            ValidationResult with findings
        """
        path = Path(module_path)
        result = ValidationResult(
            target_path=module_path,
            validation_type="module"
        )

        if not path.exists():
            result.add_issue(ValidationIssue(
                severity="error",
                message=f"Module path does not exist: {module_path}",
                path=module_path,
                rule="path-exists"
            ))
            return result

        # Check module naming convention
        self._validate_module_name(path, result)

        # Check required files
        for required_file in self.MODULE_REQUIRED_FILES:
            file_path = path / required_file
            if not file_path.exists():
                result.add_issue(ValidationIssue(
                    severity="error",
                    message=f"Missing required file: {required_file}",
                    path=str(file_path),
                    rule="module-required-file",
                    suggestion=f"Create {required_file} for the module"
                ))

        # Check recommended files
        for recommended_file in self.MODULE_RECOMMENDED_FILES:
            file_path = path / recommended_file
            if not file_path.exists():
                result.add_issue(ValidationIssue(
                    severity="warning",
                    message=f"Missing recommended file: {recommended_file}",
                    path=str(file_path),
                    rule="module-recommended-file",
                    suggestion=f"Consider adding {recommended_file}"
                ))

        # Validate module.json if exists
        self._validate_module_json(path, result)

        # Validate package.json
        self._validate_module_package_json(path, result)

        # Check src directory structure
        src_path = path / "src"
        if src_path.exists():
            self._validate_module_src_structure(src_path, result)

        return result

    def _detect_project_type(self, path: Path) -> Optional[str]:
        """Detect if project is stack or infra type."""
        # Check for stack indicators
        has_pnpm_workspace = (path / "pnpm-workspace.yaml").exists()
        has_packages = (path / "packages").exists()
        has_apps = (path / "apps").exists()

        # Check for infra indicators
        has_envs = (path / "envs").exists()
        has_modules = (path / "modules").exists()
        has_lambdas = (path / "lambdas").exists()

        stack_score = sum([has_pnpm_workspace, has_packages, has_apps])
        infra_score = sum([has_envs, has_modules, has_lambdas])

        if stack_score >= 2:
            return "stack"
        elif infra_score >= 2:
            return "infra"
        
        # Check name suffix
        if path.name.endswith("-stack"):
            return "stack"
        elif path.name.endswith("-infra"):
            return "infra"
        
        return None

    def _validate_stack_project(self, path: Path, result: ValidationResult):
        """Validate stack repo structure."""
        self.log(f"Validating stack project: {path}")

        # Check required directories
        for required_dir in self.STACK_REQUIRED_DIRS:
            dir_path = path / required_dir
            if not dir_path.exists():
                result.add_issue(ValidationIssue(
                    severity="error",
                    message=f"Missing required directory: {required_dir}/",
                    path=str(dir_path),
                    rule="stack-required-dir",
                    suggestion=f"Create {required_dir}/ directory"
                ))

        # Check required files
        for required_file in self.STACK_REQUIRED_FILES:
            file_path = path / required_file
            if not file_path.exists():
                result.add_issue(ValidationIssue(
                    severity="error",
                    message=f"Missing required file: {required_file}",
                    path=str(file_path),
                    rule="stack-required-file",
                    suggestion=f"Create {required_file}"
                ))

        # Check recommended files
        for recommended_file in self.STACK_RECOMMENDED_FILES:
            file_path = path / recommended_file
            if not file_path.exists():
                result.add_issue(ValidationIssue(
                    severity="warning",
                    message=f"Missing recommended file: {recommended_file}",
                    path=str(file_path),
                    rule="stack-recommended-file"
                ))

        # Validate pnpm-workspace.yaml
        workspace_file = path / "pnpm-workspace.yaml"
        if workspace_file.exists():
            self._validate_pnpm_workspace(workspace_file, result)

        # Validate packages directory structure
        packages_path = path / "packages"
        if packages_path.exists():
            self._validate_packages_structure(packages_path, result)

        # Validate apps directory structure
        apps_path = path / "apps"
        if apps_path.exists():
            self._validate_apps_structure(apps_path, result)

    def _validate_infra_project(self, path: Path, result: ValidationResult):
        """Validate infra repo structure."""
        self.log(f"Validating infra project: {path}")

        # Check required directories
        for required_dir in self.INFRA_REQUIRED_DIRS:
            dir_path = path / required_dir
            if not dir_path.exists():
                result.add_issue(ValidationIssue(
                    severity="error",
                    message=f"Missing required directory: {required_dir}/",
                    path=str(dir_path),
                    rule="infra-required-dir",
                    suggestion=f"Create {required_dir}/ directory"
                ))

        # Check required files
        for required_file in self.INFRA_REQUIRED_FILES:
            file_path = path / required_file
            if not file_path.exists():
                result.add_issue(ValidationIssue(
                    severity="error",
                    message=f"Missing required file: {required_file}",
                    path=str(file_path),
                    rule="infra-required-file"
                ))

        # Check environments
        envs_path = path / "envs"
        if envs_path.exists():
            for env in self.INFRA_ENVIRONMENTS:
                env_path = envs_path / env
                if not env_path.exists():
                    result.add_issue(ValidationIssue(
                        severity="warning",
                        message=f"Missing environment directory: envs/{env}/",
                        path=str(env_path),
                        rule="infra-environment",
                        suggestion=f"Create envs/{env}/ for {env} environment"
                    ))
                else:
                    # Check for required terraform files
                    self._validate_terraform_env(env_path, env, result)

        # Check modules directory
        modules_path = path / "modules"
        if modules_path.exists():
            self._validate_infra_modules(modules_path, result)

        # Check lambdas directory
        lambdas_path = path / "lambdas"
        if lambdas_path.exists():
            self._validate_lambdas_structure(lambdas_path, result)

    def _validate_project_json(self, path: Path, result: ValidationResult):
        """Validate project.json file."""
        project_json_path = path / "project.json"
        
        if not project_json_path.exists():
            result.add_issue(ValidationIssue(
                severity="warning",
                message="Missing project.json file",
                path=str(project_json_path),
                rule="project-json",
                suggestion="Create project.json with project metadata"
            ))
            return

        try:
            with open(project_json_path) as f:
                project_data = json.load(f)
            
            # Check required fields
            required_fields = ["name", "version"]
            for field in required_fields:
                if field not in project_data:
                    result.add_issue(ValidationIssue(
                        severity="error",
                        message=f"project.json missing required field: {field}",
                        path=str(project_json_path),
                        rule="project-json-field"
                    ))

            # Check recommended fields
            recommended_fields = ["description", "type"]
            for field in recommended_fields:
                if field not in project_data:
                    result.add_issue(ValidationIssue(
                        severity="info",
                        message=f"project.json missing recommended field: {field}",
                        path=str(project_json_path),
                        rule="project-json-recommended"
                    ))

        except json.JSONDecodeError as e:
            result.add_issue(ValidationIssue(
                severity="error",
                message=f"Invalid JSON in project.json: {e}",
                path=str(project_json_path),
                rule="project-json-valid"
            ))

    def _validate_module_name(self, path: Path, result: ValidationResult):
        """Validate module follows naming convention."""
        module_name = path.name
        
        # Check if follows module-{purpose} pattern
        if not module_name.startswith("module-"):
            result.add_issue(ValidationIssue(
                severity="warning",
                message=f"Module name '{module_name}' doesn't follow 'module-{{purpose}}' convention",
                path=str(path),
                rule="module-naming",
                suggestion="Rename to module-{purpose} format"
            ))
        else:
            # Check purpose is single word
            purpose = module_name.replace("module-", "")
            if "-" in purpose:
                result.add_issue(ValidationIssue(
                    severity="warning",
                    message=f"Module purpose '{purpose}' should be a single word",
                    path=str(path),
                    rule="module-naming-purpose",
                    suggestion="Use a single word for module purpose (e.g., module-kb, module-chat)"
                ))

    def _validate_module_json(self, path: Path, result: ValidationResult):
        """Validate module.json file."""
        module_json_path = path / "module.json"
        
        if not module_json_path.exists():
            return

        try:
            with open(module_json_path) as f:
                module_data = json.load(f)
            
            # Check required fields
            required_fields = ["name", "version", "tier"]
            for field in required_fields:
                if field not in module_data:
                    result.add_issue(ValidationIssue(
                        severity="error",
                        message=f"module.json missing required field: {field}",
                        path=str(module_json_path),
                        rule="module-json-field"
                    ))

            # Validate tier value
            if "tier" in module_data:
                tier = module_data["tier"]
                if tier not in [1, 2, 3]:
                    result.add_issue(ValidationIssue(
                        severity="error",
                        message=f"Invalid tier value: {tier}. Must be 1, 2, or 3.",
                        path=str(module_json_path),
                        rule="module-tier"
                    ))

            # Check recommended fields
            recommended_fields = ["description", "dependencies", "provides"]
            for field in recommended_fields:
                if field not in module_data:
                    result.add_issue(ValidationIssue(
                        severity="info",
                        message=f"module.json missing recommended field: {field}",
                        path=str(module_json_path),
                        rule="module-json-recommended"
                    ))

        except json.JSONDecodeError as e:
            result.add_issue(ValidationIssue(
                severity="error",
                message=f"Invalid JSON in module.json: {e}",
                path=str(module_json_path),
                rule="module-json-valid"
            ))

    def _validate_module_package_json(self, path: Path, result: ValidationResult):
        """Validate module package.json."""
        package_json_path = path / "package.json"
        
        if not package_json_path.exists():
            return

        try:
            with open(package_json_path) as f:
                package_data = json.load(f)
            
            # Check name matches directory
            if "name" in package_data:
                package_name = package_data["name"]
                # Handle scoped packages
                if "/" in package_name:
                    package_name = package_name.split("/")[-1]
                
                if package_name != path.name:
                    result.add_issue(ValidationIssue(
                        severity="warning",
                        message=f"Package name '{package_name}' doesn't match directory name '{path.name}'",
                        path=str(package_json_path),
                        rule="package-name-match"
                    ))

        except json.JSONDecodeError as e:
            result.add_issue(ValidationIssue(
                severity="error",
                message=f"Invalid JSON in package.json: {e}",
                path=str(package_json_path),
                rule="package-json-valid"
            ))

    def _validate_module_src_structure(self, src_path: Path, result: ValidationResult):
        """Validate module src directory structure."""
        # Check for index.ts/tsx entry point
        has_index = (
            (src_path / "index.ts").exists() or 
            (src_path / "index.tsx").exists()
        )
        if not has_index:
            result.add_issue(ValidationIssue(
                severity="warning",
                message="Missing src/index.ts or src/index.tsx entry point",
                path=str(src_path),
                rule="module-entry-point",
                suggestion="Create src/index.ts to export module public API"
            ))

    def _validate_pnpm_workspace(self, workspace_path: Path, result: ValidationResult):
        """Validate pnpm-workspace.yaml configuration."""
        try:
            import yaml
            with open(workspace_path) as f:
                workspace_data = yaml.safe_load(f)
            
            if not workspace_data or "packages" not in workspace_data:
                result.add_issue(ValidationIssue(
                    severity="error",
                    message="pnpm-workspace.yaml missing 'packages' field",
                    path=str(workspace_path),
                    rule="pnpm-workspace-packages"
                ))
            else:
                packages = workspace_data["packages"]
                if "packages/*" not in packages:
                    result.add_issue(ValidationIssue(
                        severity="warning",
                        message="pnpm-workspace.yaml should include 'packages/*'",
                        path=str(workspace_path),
                        rule="pnpm-workspace-convention"
                    ))

        except ImportError:
            result.add_issue(ValidationIssue(
                severity="info",
                message="PyYAML not installed - skipping pnpm-workspace.yaml validation",
                path=str(workspace_path),
                rule="pnpm-workspace-skip"
            ))
        except Exception as e:
            result.add_issue(ValidationIssue(
                severity="error",
                message=f"Error reading pnpm-workspace.yaml: {e}",
                path=str(workspace_path),
                rule="pnpm-workspace-valid"
            ))

    def _validate_packages_structure(self, packages_path: Path, result: ValidationResult):
        """Validate packages directory structure."""
        # Count modules
        modules = [d for d in packages_path.iterdir() if d.is_dir() and not d.name.startswith("_")]
        
        if len(modules) == 0:
            result.add_issue(ValidationIssue(
                severity="warning",
                message="No packages found in packages/ directory",
                path=str(packages_path),
                rule="packages-empty"
            ))
            return

        # Check each package has package.json
        # CORA modules can have package.json either at root OR in frontend/ subdirectory
        for module in modules:
            has_root_package_json = (module / "package.json").exists()
            has_frontend_package_json = (module / "frontend" / "package.json").exists()
            
            if not has_root_package_json and not has_frontend_package_json:
                result.add_issue(ValidationIssue(
                    severity="error",
                    message=f"Package missing package.json: {module.name}",
                    path=str(module),
                    rule="package-json-required",
                    suggestion="Create package.json at module root or in frontend/ subdirectory"
                ))

    def _validate_apps_structure(self, apps_path: Path, result: ValidationResult):
        """Validate apps directory structure."""
        # Check for web app
        web_app = apps_path / "web"
        if not web_app.exists():
            result.add_issue(ValidationIssue(
                severity="warning",
                message="Missing apps/web/ directory (expected for Next.js app)",
                path=str(web_app),
                rule="apps-web",
                suggestion="Create apps/web/ for Next.js application"
            ))

    def _validate_terraform_env(self, env_path: Path, env_name: str, result: ValidationResult):
        """Validate terraform environment directory."""
        required_tf_files = ["main.tf", "variables.tf"]
        
        for tf_file in required_tf_files:
            if not (env_path / tf_file).exists():
                result.add_issue(ValidationIssue(
                    severity="warning",
                    message=f"Missing {tf_file} in envs/{env_name}/",
                    path=str(env_path / tf_file),
                    rule="terraform-files"
                ))

    def _validate_infra_modules(self, modules_path: Path, result: ValidationResult):
        """Validate infrastructure modules directory."""
        # Check for recommended modules
        recommended_modules = ["modular-api-gateway", "secrets"]
        
        for module_name in recommended_modules:
            if not (modules_path / module_name).exists():
                result.add_issue(ValidationIssue(
                    severity="info",
                    message=f"Missing recommended infra module: {module_name}",
                    path=str(modules_path / module_name),
                    rule="infra-module-recommended"
                ))

    def _validate_lambdas_structure(self, lambdas_path: Path, result: ValidationResult):
        """Validate lambdas directory structure."""
        # Check for authorizer lambda
        authorizer = lambdas_path / "api-gateway-authorizer"
        if not authorizer.exists():
            result.add_issue(ValidationIssue(
                severity="warning",
                message="Missing api-gateway-authorizer lambda",
                path=str(authorizer),
                rule="authorizer-lambda",
                suggestion="Create lambdas/api-gateway-authorizer/ for API Gateway authorization"
            ))


def validate_project(path: str, verbose: bool = False) -> ValidationResult:
    """Convenience function to validate a project."""
    validator = StructureValidator(verbose=verbose)
    return validator.validate_project(path)


def validate_module(path: str, verbose: bool = False) -> ValidationResult:
    """Convenience function to validate a module."""
    validator = StructureValidator(verbose=verbose)
    return validator.validate_module(path)
