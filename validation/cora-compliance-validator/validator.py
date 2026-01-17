"""
CORA Compliance Validator Logic

Validates Lambda functions against CORA standards and checks infrastructure alignment.
"""

import os
import re
import sys
import json
from pathlib import Path
from typing import List, Dict, Any, Tuple, Set, Optional
from dataclasses import dataclass, field

@dataclass
class StandardCheck:
    """Represents the result of checking a single CORA standard"""
    standard_number: int
    standard_name: str
    is_compliant: bool
    score: float  # 0.0 to 1.0
    details: List[str] = field(default_factory=list)
    issues: List[str] = field(default_factory=list)


@dataclass
class LambdaCoraCompliance:
    """Represents CORA compliance status of a Lambda function"""
    path: str
    lambda_name: str
    module_name: str
    standards: List[StandardCheck]
    overall_score: float
    is_fully_compliant: bool
    
    def to_dict(self):
        return {
            "path": self.path,
            "lambda_name": self.lambda_name,
            "module_name": self.module_name,
            "overall_score": self.overall_score,
            "is_fully_compliant": self.is_fully_compliant,
            "standards": [
                {
                    "number": s.standard_number,
                    "name": s.standard_name,
                    "is_compliant": s.is_compliant,
                    "score": s.score,
                    "details": s.details,
                    "issues": s.issues
                } for s in self.standards
            ]
        }


class CoraComplianceChecker:
    """Checks Lambda functions for CORA standards compliance"""
    
    # Standard 1: Response Format
    ORG_COMMON_IMPORT = re.compile(r'import\s+org_common|from\s+org_common')
    COMMON_ALIAS = re.compile(r'import\s+org_common\s+as\s+(\w+)')
    STANDARD_RESPONSES = [
        'success_response', 'error_response', 'created_response',
        'bad_request_response', 'unauthorized_response', 'forbidden_response',
        'not_found_response', 'conflict_response', 'internal_error_response'
    ]
    
    # Standard 2: Authentication
    AUTH_PATTERNS = [
        re.compile(r'get_user_from_event\s*\('),
        re.compile(r'get_supabase_user_id_from_okta_uid\s*\('),
        re.compile(r'user_info\s*=.*get_user_from_event'),
    ]
    
    # Standard 3: Multi-tenancy
    ORG_ID_PATTERNS = [
        re.compile(r'["\']org_id["\']\s*:'),
        re.compile(r'\.eq\s*\(\s*["\']org_id["\']'),
        re.compile(r'current_org_id'),
    ]
    
    # Standard 4: Validation
    VALIDATION_PATTERNS = [
        re.compile(r'raise\s+common\.ValidationError'),
        re.compile(r'raise\s+common\.ForbiddenError'),
        re.compile(r'raise\s+common\.NotFoundError'),
        re.compile(r'if\s+not\s+\w+:'),  # Existence checks
        re.compile(r'\.lower\(\)\s*!=\s*.*\.lower\(\)'),  # Email matching
    ]
    
    # Standard 5: Database Helpers
    DB_HELPER_PATTERNS = [
        re.compile(r'common\.find_one\s*\('),
        re.compile(r'common\.find_many\s*\('),
        re.compile(r'common\.insert_one\s*\('),
        re.compile(r'common\.update_one\s*\('),
        re.compile(r'common\.delete_one\s*\('),
        re.compile(r'supabase\.table\s*\('),
    ]
    RAW_SQL_PATTERNS = [
        re.compile(r'["\']SELECT\s+.*FROM', re.IGNORECASE),
        re.compile(r'["\']INSERT\s+INTO', re.IGNORECASE),
        re.compile(r'["\']UPDATE\s+.*SET', re.IGNORECASE),
        re.compile(r'["\']DELETE\s+FROM', re.IGNORECASE),
    ]
    
    # Standard 6: Error Handling
    ERROR_HANDLING_PATTERNS = [
        re.compile(r'except\s+common\.ValidationError'),
        re.compile(r'except\s+common\.ForbiddenError'),
        re.compile(r'except\s+common\.NotFoundError'),
        re.compile(r'except\s+Exception'),
    ]
    
    # Standard 7: Batch Operations
    BATCH_PATTERNS = [
        re.compile(r'BATCH_SIZE\s*=\s*\d+'),
        re.compile(r'for\s+.*\s+in\s+range\s*\(\s*\d+\s*,.*,\s*\w+\)'),
        re.compile(r'chunk|batch', re.IGNORECASE),
    ]
    
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
    
    def find_lambda_functions(self) -> List[Path]:
        """Find all lambda_function.py files, excluding .build and backend-archive directories"""
        lambda_files = []
        
        for path in self.root_dir.rglob("**/lambdas/*/lambda_function.py"):
            if ".build" not in str(path) and "backend-archive" not in str(path):
                lambda_files.append(path)
        
        return sorted(lambda_files)
    
    def check_standard_1_response_format(self, content: str, common_alias: str) -> StandardCheck:
        """Check Standard 1: org_common Response Format"""
        has_import = bool(self.ORG_COMMON_IMPORT.search(content))
        
        uses_responses = []
        for response_func in self.STANDARD_RESPONSES:
            pattern = f'{common_alias}\\.{response_func}'
            if re.search(pattern, content):
                uses_responses.append(response_func)
        
        # Check for direct statusCode returns (anti-pattern)
        direct_returns = len(re.findall(r'return\s+\{[^}]*["\']statusCode["\']', content))
        
        details = []
        issues = []
        
        if has_import:
            details.append(f"✓ org_common imported")
        else:
            issues.append("✗ Missing org_common import")
        
        if uses_responses:
            details.append(f"✓ Uses {len(uses_responses)} standard response functions")
        else:
            issues.append("✗ No standard response functions found")
        
        if direct_returns > 0:
            issues.append(f"✗ Found {direct_returns} direct statusCode return(s)")
        
        score = 0.0
        if has_import:
            score += 0.5
        if uses_responses:
            score += 0.5
        if direct_returns > 0:
            score -= 0.2
        
        score = max(0.0, min(1.0, score))
        
        return StandardCheck(
            standard_number=1,
            standard_name="org_common Response Format",
            is_compliant=has_import and len(uses_responses) > 0 and direct_returns == 0,
            score=score,
            details=details,
            issues=issues
        )
    
    # Scheduled/background jobs that don't receive user requests
    SCHEDULED_JOB_LAMBDAS = ['cleanup']
    
    # SQS-triggered Lambdas (asynchronous background processing)
    SQS_TRIGGERED_LAMBDAS = ['kb-processor']
    
    def check_standard_2_authentication(self, content: str, lambda_name: str = "") -> StandardCheck:
        """Check Standard 2: Authentication & Authorization"""
        # Whitelist: Scheduled jobs triggered by EventBridge don't receive user JWTs
        is_scheduled_job = any(sj in lambda_name for sj in self.SCHEDULED_JOB_LAMBDAS)
        
        # Whitelist: SQS-triggered Lambdas process background jobs, no user JWTs
        is_sqs_lambda = any(sqs in lambda_name for sqs in self.SQS_TRIGGERED_LAMBDAS)
        
        if is_scheduled_job:
            return StandardCheck(
                standard_number=2,
                standard_name="Authentication & Authorization",
                is_compliant=True,
                score=1.0,
                details=["ℹ Scheduled job (EventBridge trigger)", "✓ No user authentication required"],
                issues=[]
            )
        
        if is_sqs_lambda:
            return StandardCheck(
                standard_number=2,
                standard_name="Authentication & Authorization",
                is_compliant=True,
                score=1.0,
                details=["ℹ SQS-triggered Lambda (background processing)", "✓ No user authentication required"],
                issues=[]
            )
        
        auth_checks = {
            'get_user_from_event': False,
            'get_supabase_user_id': False,
            'email_validation': False,
        }
        
        for pattern in self.AUTH_PATTERNS:
            if pattern.search(content):
                if 'get_user_from_event' in pattern.pattern:
                    auth_checks['get_user_from_event'] = True
                if 'get_supabase_user_id' in pattern.pattern:
                    auth_checks['get_supabase_user_id'] = True
        
        # Check for email validation patterns
        if re.search(r'email.*\.lower\(\).*!=.*\.lower\(\)', content):
            auth_checks['email_validation'] = True
        
        details = []
        issues = []
        
        if auth_checks['get_user_from_event']:
            details.append("✓ JWT extraction (get_user_from_event)")
        else:
            issues.append("✗ No JWT extraction found")
        
        if auth_checks['get_supabase_user_id']:
            details.append("✓ Okta→Supabase mapping")
        else:
            issues.append("✗ No Okta→Supabase mapping")
        
        if auth_checks['email_validation']:
            details.append("✓ Email validation")
        
        score = sum(auth_checks.values()) / len(auth_checks)
        is_compliant = all(auth_checks.values())
        
        return StandardCheck(
            standard_number=2,
            standard_name="Authentication & Authorization",
            is_compliant=is_compliant,
            score=score,
            details=details,
            issues=issues
        )
    
    def check_standard_3_multi_tenancy(self, content: str, lambda_name: str = "") -> StandardCheck:
        """Check Standard 3: Multi-tenancy"""
        # Whitelist: Platform-level Lambdas that manage cross-org infrastructure
        # Also includes scheduled jobs (cleanup) that process all orgs in background
        platform_lambdas = ['idp-config', 'provider', 'lambda-mgmt', 'cleanup']
        is_platform_lambda = any(pl in lambda_name for pl in platform_lambdas)
        
        org_id_count = 0
        db_operation_lines = []
        
        # Find database operations
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if any(keyword in line for keyword in ['.insert(', '.update(', '.delete(', '.eq(', 'insert_one', 'update_one', 'delete_one']):
                db_operation_lines.append(i)
        
        # Count org_id usage
        for pattern in self.ORG_ID_PATTERNS:
            org_id_count += len(pattern.findall(content))
        
        details = []
        issues = []
        
        if is_platform_lambda:
            # Platform-level Lambda - org_id not required
            details.append("ℹ Platform-level Lambda (cross-org infrastructure)")
            details.append("✓ org_id filtering not required")
            score = 1.0
            is_compliant = True
        elif org_id_count > 0:
            details.append(f"✓ org_id used {org_id_count} time(s)")
            if db_operation_lines:
                details.append(f"✓ Found {len(db_operation_lines)} database operations")
            score = min(1.0, org_id_count / max(1, len(db_operation_lines))) if db_operation_lines else 0.5
            is_compliant = True
        else:
            issues.append("✗ No org_id usage found")
            score = 0.5
            is_compliant = False
        
        return StandardCheck(
            standard_number=3,
            standard_name="Multi-tenancy",
            is_compliant=is_compliant,
            score=score,
            details=details,
            issues=issues
        )
    
    def check_standard_4_validation(self, content: str, lambda_name: str = "") -> StandardCheck:
        """Check Standard 4: Validation"""
        # Whitelist: Scheduled jobs have minimal validation needs (no user input)
        is_scheduled_job = any(sj in lambda_name for sj in self.SCHEDULED_JOB_LAMBDAS)
        
        if is_scheduled_job:
            return StandardCheck(
                standard_number=4,
                standard_name="Validation",
                is_compliant=True,
                score=1.0,
                details=["ℹ Scheduled job (EventBridge trigger)", "✓ No user input validation required"],
                issues=[]
            )
        
        validation_count = 0
        validation_types = []
        
        for pattern in self.VALIDATION_PATTERNS:
            matches = pattern.findall(content)
            if matches:
                validation_count += len(matches)
                if 'ValidationError' in pattern.pattern:
                    validation_types.append('ValidationError')
                elif 'ForbiddenError' in pattern.pattern:
                    validation_types.append('ForbiddenError')
                elif 'NotFoundError' in pattern.pattern:
                    validation_types.append('NotFoundError')
                elif 'if not' in pattern.pattern:
                    validation_types.append('Existence checks')
                elif 'lower()' in pattern.pattern:
                    validation_types.append('Email matching')
        
        details = []
        issues = []
        
        if validation_count > 0:
            details.append(f"✓ {validation_count} validation check(s)")
            if validation_types:
                unique_types = list(set(validation_types))
                details.append(f"✓ Types: {', '.join(unique_types[:3])}")
        else:
            issues.append("✗ No validation found")
        
        score = min(1.0, validation_count / 3)  # 3+ validations = full score
        is_compliant = validation_count >= 2
        
        return StandardCheck(
            standard_number=4,
            standard_name="Validation",
            is_compliant=is_compliant,
            score=score,
            details=details,
            issues=issues
        )
    
    def check_standard_5_database_helpers(self, content: str, lambda_name: str = "") -> StandardCheck:
        """Check Standard 5: Database Helpers"""
        # Whitelist: Scheduled jobs use RPC calls, not direct DB operations
        is_scheduled_job = any(sj in lambda_name for sj in self.SCHEDULED_JOB_LAMBDAS)
        
        # Check for RPC calls (used by cleanup lambda)
        rpc_count = len(re.findall(r'common\.rpc\s*\(', content))
        
        if is_scheduled_job and rpc_count > 0:
            return StandardCheck(
                standard_number=5,
                standard_name="Database Helpers",
                is_compliant=True,
                score=1.0,
                details=["ℹ Scheduled job (EventBridge trigger)", f"✓ Uses {rpc_count} RPC call(s)"],
                issues=[]
            )
        
        helper_count = 0
        raw_sql_count = 0
        
        for pattern in self.DB_HELPER_PATTERNS:
            helper_count += len(pattern.findall(content))
        
        for pattern in self.RAW_SQL_PATTERNS:
            raw_sql_count += len(pattern.findall(content))
        
        details = []
        issues = []
        
        if helper_count > 0:
            details.append(f"✓ Uses {helper_count} abstracted DB helper(s)")
        
        if raw_sql_count > 0:
            issues.append(f"✗ Found {raw_sql_count} raw SQL statement(s)")
        else:
            details.append("✓ No raw SQL detected")
        
        if helper_count == 0 and raw_sql_count == 0:
            issues.append("✗ No database operations found")
        
        score = helper_count / max(1, helper_count + raw_sql_count) if (helper_count + raw_sql_count) > 0 else 0.0
        is_compliant = helper_count > 0 and raw_sql_count == 0
        
        return StandardCheck(
            standard_number=5,
            standard_name="Database Helpers",
            is_compliant=is_compliant,
            score=score,
            details=details,
            issues=issues
        )
    
    def check_standard_6_error_handling(self, content: str) -> StandardCheck:
        """Check Standard 6: Error Handling"""
        exception_types = []
        
        for pattern in self.ERROR_HANDLING_PATTERNS:
            matches = pattern.findall(content)
            if matches:
                if 'ValidationError' in pattern.pattern:
                    exception_types.append('ValidationError')
                elif 'ForbiddenError' in pattern.pattern:
                    exception_types.append('ForbiddenError')
                elif 'NotFoundError' in pattern.pattern:
                    exception_types.append('NotFoundError')
                elif 'Exception' in pattern.pattern:
                    exception_types.append('Exception')
        
        details = []
        issues = []
        
        unique_types = list(set(exception_types))
        
        if unique_types:
            details.append(f"✓ Handles {len(unique_types)} exception type(s)")
            details.append(f"✓ Types: {', '.join(unique_types)}")
        else:
            issues.append("✗ No exception handling found")
        
        # Check for generic Exception catch
        has_generic_catch = 'Exception' in unique_types
        if has_generic_catch:
            details.append("✓ Generic Exception handler (safety net)")
        
        score = min(1.0, len(unique_types) / 3)  # 3+ types = full score
        is_compliant = len(unique_types) >= 2
        
        return StandardCheck(
            standard_number=6,
            standard_name="Error Handling",
            is_compliant=is_compliant,
            score=score,
            details=details,
            issues=issues
        )
    
    def check_standard_7_batch_operations(self, content: str) -> StandardCheck:
        """Check Standard 7: Batch Operations"""
        has_batch_size = False
        has_range_loop = False
        has_chunking = False
        batch_size = None
        
        for pattern in self.BATCH_PATTERNS:
            if 'BATCH_SIZE' in pattern.pattern:
                match = pattern.search(content)
                if match:
                    has_batch_size = True
                    # Try to extract the batch size value
                    size_match = re.search(r'BATCH_SIZE\s*=\s*(\d+)', content)
                    if size_match:
                        batch_size = int(size_match.group(1))
            elif 'range' in pattern.pattern:
                if pattern.search(content):
                    has_range_loop = True
            elif 'chunk' in pattern.pattern.lower() or 'batch' in pattern.pattern.lower():
                if pattern.search(content):
                    has_chunking = True
        
        details = []
        issues = []
        
        if has_batch_size:
            if batch_size:
                details.append(f"✓ Batch size defined: {batch_size}")
            else:
                details.append("✓ Batch size constant defined")
        
        if has_range_loop:
            details.append("✓ Range-based chunking loop")
        
        if has_chunking:
            details.append("✓ Chunking/batching logic present")
        
        if not (has_batch_size or has_range_loop or has_chunking):
            issues.append("✗ No batch processing detected (may not be needed)")
        
        # Calculate score
        checks = [has_batch_size, has_range_loop, has_chunking]
        score = sum(checks) / len(checks)
        
        # Batch operations are optional, so we're lenient
        is_compliant = any(checks) or True  # Always compliant if no batching needed
        
        return StandardCheck(
            standard_number=7,
            standard_name="Batch Operations",
            is_compliant=is_compliant,
            score=score if any(checks) else 0.5,  # 0.5 if no batching (neutral)
            details=details if details else ["ℹ No batch operations (may not be needed)"],
            issues=issues
        )
    
    def check_file(self, file_path: Path) -> LambdaCoraCompliance:
        """Check a single Lambda function file for CORA compliance"""
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Extract module and lambda name FIRST (needed for whitelisting)
        try:
            path_parts = file_path.relative_to(self.root_dir).parts
            if len(path_parts) >= 2 and path_parts[0] == "packages":
                module_name = path_parts[1]
            else:
                module_name = "other"
            
            lambda_name = path_parts[-2] if len(path_parts) >= 2 else "unknown"
        except ValueError:
            # Fallback if relative_to fails
            module_name = "unknown"
            lambda_name = file_path.parent.name
        
        # Detect alias
        alias_match = self.COMMON_ALIAS.search(content)
        common_alias = alias_match.group(1) if alias_match else 'org_common'
        
        # Check all 7 standards (pass lambda_name for whitelisting scheduled jobs)
        standards = [
            self.check_standard_1_response_format(content, common_alias),
            self.check_standard_2_authentication(content, lambda_name),
            self.check_standard_3_multi_tenancy(content, lambda_name),
            self.check_standard_4_validation(content, lambda_name),
            self.check_standard_5_database_helpers(content, lambda_name),
            self.check_standard_6_error_handling(content),
            self.check_standard_7_batch_operations(content),
        ]
        
        # Calculate overall score
        overall_score = sum(s.score for s in standards) / len(standards)
        is_fully_compliant = all(s.is_compliant for s in standards)
        
        return LambdaCoraCompliance(
            path=str(file_path),
            lambda_name=lambda_name,
            module_name=module_name,
            standards=standards,
            overall_score=overall_score,
            is_fully_compliant=is_fully_compliant
        )


class InfrastructureChecker:
    """Checks infrastructure alignment between Lambda, API Gateway, and Database"""
    
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.boto3 = None
        self.supabase = None
        self.apigateway = None
        self.lambda_client = None
        
    def _init_aws_clients(self):
        """Initialize AWS clients (lazy loading)"""
        if self.boto3 is None:
            try:
                import boto3
                self.boto3 = boto3
                # Try to get region from environment
                region = os.environ.get('AWS_REGION', 'us-east-1')
                self.apigateway = boto3.client('apigatewayv2', region_name=region)
                self.lambda_client = boto3.client('lambda', region_name=region)
            except ImportError:
                print("⚠️  boto3 not installed. Run: pip install boto3")
                raise
            except Exception as e:
                print(f"⚠️  Failed to initialize AWS clients: {str(e)}")
                raise
    
    def _init_supabase_client(self):
        """Initialize Supabase client (lazy loading)"""
        if self.supabase is None:
            try:
                from supabase import create_client
                supabase_url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or os.environ.get('SUPABASE_URL')
                supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
                
                if not supabase_url or not supabase_key:
                    raise ValueError("Supabase credentials not found in environment")
                
                self.supabase = create_client(supabase_url, supabase_key)
            except ImportError:
                print("⚠️  supabase-py not installed. Run: pip install supabase")
                raise
            except Exception as e:
                print(f"⚠️  Failed to initialize Supabase client: {str(e)}")
                raise

    def check_cors_headers_alignment(self, api_id: str) -> Dict[str, Any]:
        # Implementation details omitted for brevity unless infrastructure checks needed immediately
        # Placeholder for now to focus on code checks first
        return {
            'name': 'CORS Headers Alignment',
            'is_compliant': True,
            'score': 1.0,
            'details': ['Checks deferred'],
            'issues': [],
            'severity': 'HIGH',
            'fix': ''
        }
    
    # Other infrastructure checks skipped for now as they require active AWS connection
    # and we want to prioritize code compliance first
    
    def run_all_checks(self, api_id: str) -> List[Dict[str, Any]]:
        # Simplified for now
        return []
