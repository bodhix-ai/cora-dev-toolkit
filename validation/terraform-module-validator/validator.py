"""
Terraform Module Validator Logic

Validates Terraform modules against CORA standards.
"""

import os
import re
from pathlib import Path
from typing import List, Dict, Any, Set, Optional
from dataclasses import dataclass, field

@dataclass
class ValidationIssue:
    """Represents a single validation issue"""
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    rule: str
    message: str
    file: str
    line: Optional[int] = None

@dataclass
class ModuleValidationResult:
    """Represents the result of validating a Terraform module"""
    path: str
    passed: bool
    issues: List[ValidationIssue] = field(default_factory=list)
    
    @property
    def error_count(self) -> int:
        return len([i for i in self.issues if i.severity in ['CRITICAL', 'HIGH']])
        
    @property
    def warning_count(self) -> int:
        return len([i for i in self.issues if i.severity in ['MEDIUM', 'LOW']])

class TerraformModuleValidator:
    """Validates Terraform modules against CORA standards"""
    
    # Rule 1: Standard Variables Contract
    REQUIRED_VARIABLES = {'project_name', 'environment'}
    ALLOWED_VARIABLES = {
        'module_name', 'aws_region', 'supabase_secret_arn', 
        'org_common_layer_arn', 'sns_topic_arn', 'log_level', 'common_tags',
        # Allow module-specific vars that aren't infrastructure-binding
        'openai_api_key', 'anthropic_api_key', 'create_export_bucket',
        'export_bucket_name', 'export_bucket_arn'
    }
    
    FORBIDDEN_VARIABLES = {
        'api_gateway_id': 'Inversion of Control violation - modules should not attach to API Gateway directly',
        'api_gateway_execution_arn': 'Inversion of Control violation',
        'authorizer_id': 'Inversion of Control violation',
        'subnet_ids': 'Functional modules should not be VPC-bound unless strictly necessary',
        'security_group_ids': 'Functional modules should not be VPC-bound',
        'vpc_config': 'Functional modules should not be VPC-bound',
        'supabase_url': 'Use SUPABASE_SECRET_ARN instead to prevent leaking secrets',
        'supabase_key_secret_name': 'Use SUPABASE_SECRET_ARN instead'
    }
    
    # Rule 3: Inversion of Control Pattern
    FORBIDDEN_RESOURCES = {
        'aws_apigatewayv2_route': 'Modules must export routes via outputs, not create them directly',
        'aws_apigatewayv2_integration': 'Modules must export invoke ARNs, not integrate directly',
    }
    
    # Rule 4: Required Outputs
    REQUIRED_OUTPUTS = {'api_routes', 'lambda_invoke_arns'}
    
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        
    def validate(self) -> ModuleValidationResult:
        """Run all validation checks"""
        result = ModuleValidationResult(path=str(self.root_dir), passed=True)
        
        # Files to check
        variables_file = self.root_dir / 'variables.tf'
        main_file = self.root_dir / 'main.tf'
        outputs_file = self.root_dir / 'outputs.tf'
        
        # 1. Parse files
        defined_vars = self._parse_variables(variables_file)
        defined_outputs = self._parse_outputs(outputs_file)
        main_content = self._read_file(main_file)
        
        # 2. Check Standard Variables Contract (Rule 1)
        self._check_variable_definitions(defined_vars, result)
        
        # 3. Check Variable Reference Integrity (Rule 2)
        if main_content:
            self._check_variable_references(main_content, defined_vars, result)
            
            # 4. Check Inversion of Control Pattern (Rule 3)
            self._check_forbidden_resources(main_content, result)
            
            # 5. Check Standard Patterns (Rule 5)
            self._check_standard_patterns(main_content, result)
            
        # 6. Check Required Outputs (Rule 4)
        self._check_required_outputs(defined_outputs, result)
        
        result.passed = result.error_count == 0
        return result
        
    def _read_file(self, path: Path) -> Optional[str]:
        """Read file content safely"""
        if not path.exists():
            return None
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception:
            return None

    def _parse_variables(self, path: Path) -> Set[str]:
        """Extract defined variable names from variables.tf"""
        content = self._read_file(path)
        if not content:
            return set()
            
        # Regex to find: variable "name" {
        pattern = re.compile(r'variable\s+"([^"]+)"\s+\{')
        return set(pattern.findall(content))

    def _parse_outputs(self, path: Path) -> Set[str]:
        """Extract defined output names from outputs.tf"""
        content = self._read_file(path)
        if not content:
            return set()
            
        # Regex to find: output "name" {
        pattern = re.compile(r'output\s+"([^"]+)"\s+\{')
        return set(pattern.findall(content))

    def _check_variable_definitions(self, defined_vars: Set[str], result: ModuleValidationResult):
        """Check if variables.tf follows the contract"""
        # Check required variables
        for req in self.REQUIRED_VARIABLES:
            if req not in defined_vars:
                result.issues.append(ValidationIssue(
                    severity='HIGH',
                    rule='Standard Variables Contract',
                    message=f"Missing required variable: '{req}'",
                    file='variables.tf'
                ))
                
        # Check forbidden variables
        for var in defined_vars:
            if var in self.FORBIDDEN_VARIABLES:
                result.issues.append(ValidationIssue(
                    severity='CRITICAL',
                    rule='Standard Variables Contract',
                    message=f"Forbidden variable '{var}' detected: {self.FORBIDDEN_VARIABLES[var]}",
                    file='variables.tf'
                ))

    def _check_variable_references(self, content: str, defined_vars: Set[str], result: ModuleValidationResult):
        """Check if main.tf uses undefined variables"""
        # Find all var.usage
        # Regex matches var.something (excluding quotes/comments conceptually)
        pattern = re.compile(r'var\.([a-zA-Z0-9_-]+)')
        references = set(pattern.findall(content))
        
        for ref in references:
            if ref not in defined_vars:
                result.issues.append(ValidationIssue(
                    severity='CRITICAL',
                    rule='Variable Reference Integrity',
                    message=f"Variable 'var.{ref}' used but not defined in variables.tf",
                    file='main.tf'
                ))

    def _check_forbidden_resources(self, content: str, result: ModuleValidationResult):
        """Check for forbidden resources in main.tf"""
        for resource, reason in self.FORBIDDEN_RESOURCES.items():
            if f'resource "{resource}"' in content:
                result.issues.append(ValidationIssue(
                    severity='HIGH',
                    rule='Inversion of Control Pattern',
                    message=f"Forbidden resource '{resource}' detected: {reason}",
                    file='main.tf'
                ))
        
        # Check for apigateway permission specifically
        if 'aws_lambda_permission' in content and 'apigateway.amazonaws.com' in content:
            # Simple heuristic - could be improved with better parsing
            result.issues.append(ValidationIssue(
                severity='HIGH',
                rule='Inversion of Control Pattern',
                message="Lambda permission for API Gateway detected. Modules should rely on main infra for permissions.",
                file='main.tf'
            ))

    def _check_required_outputs(self, defined_outputs: Set[str], result: ModuleValidationResult):
        """Check if outputs.tf exports required values"""
        for req in self.REQUIRED_OUTPUTS:
            if req not in defined_outputs:
                result.issues.append(ValidationIssue(
                    severity='HIGH',
                    rule='Required Outputs',
                    message=f"Missing required output: '{req}'",
                    file='outputs.tf'
                ))

    def _check_standard_patterns(self, content: str, result: ModuleValidationResult):
        """Check for coding standards in main.tf"""
        
        # Check for tags usage
        if 'var.tags' in content:
            result.issues.append(ValidationIssue(
                severity='MEDIUM',
                rule='Standard Patterns',
                message="Use 'var.common_tags' instead of 'var.tags'",
                file='main.tf'
            ))
            
        # Check for build dir pattern
        if 'filename' in content and 'zip' in content:
            if 'locals.build_dir' not in content and '${path.module}/../backend/.build' not in content:
                # This is a bit loose, but catches obvious hardcoding
                pass # Skipping strict check for now as implementation varies slightly
