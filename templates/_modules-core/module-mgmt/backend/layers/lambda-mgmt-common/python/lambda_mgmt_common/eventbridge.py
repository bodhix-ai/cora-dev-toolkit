"""
EventBridge rule management for Lambda warming.

This module provides the EventBridgeManager class for managing
EventBridge rules that trigger Lambda warming based on schedule
configurations.

Extracted from services/api/handlers/admin_config.py for lambda-mgmt-module.
"""

import os
import logging
from typing import Dict, Any, List, Optional

import boto3

from .schedule import generate_cron_expressions, validate_schedule_config

logger = logging.getLogger(__name__)


class EventBridgeManager:
    """
    Manages EventBridge rules for Lambda warming schedules.
    
    This class encapsulates all EventBridge operations needed for:
    - Creating and updating warming rules
    - Deleting obsolete rules
    - Configuring Lambda function targets
    - Synchronizing rules with configuration changes
    """
    
    def __init__(self, environment: str, name_prefix: Optional[str] = None):
        """
        Initialize EventBridge manager.
        
        Args:
            environment: Environment name (dev, stg, prd)
            name_prefix: Optional custom name prefix (defaults to "{{PROJECT_NAME}}-{environment}")
        """
        self.environment = environment
        self.name_prefix = name_prefix or f"{{PROJECT_NAME}}-{environment}"
        self.events = boto3.client('events')
        self.lambda_client = boto3.client('lambda')
        
        logger.info(f"EventBridgeManager initialized for environment: {environment}")
    
    def list_warmer_rules(self) -> Dict[str, dict]:
        """
        List all warmer rules for the environment.
        
        Returns:
            Dictionary mapping rule names to rule details
        """
        rules = {}
        try:
            paginator = self.events.get_paginator('list_rules')
            
            for page in paginator.paginate(NamePrefix=self.name_prefix):
                for rule in page['Rules']:
                    # Only include warmer rules
                    if 'warmer' in rule['Name']:
                        rules[rule['Name']] = rule
            
            logger.info(f"Found {len(rules)} warmer rule(s) with prefix {self.name_prefix}")
        except Exception as e:
            logger.error(f"Error listing warmer rules: {e}")
        
        return rules
    
    def delete_rule(self, rule_name: str) -> bool:
        """
        Delete an EventBridge rule and its targets.
        
        Args:
            rule_name: Name of the rule to delete
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # First, remove all targets
            targets_response = self.events.list_targets_by_rule(Rule=rule_name)
            if targets_response.get('Targets'):
                target_ids = [t['Id'] for t in targets_response['Targets']]
                self.events.remove_targets(Rule=rule_name, Ids=target_ids)
                logger.info(f"Removed {len(target_ids)} target(s) from rule {rule_name}")
            
            # Then delete the rule
            self.events.delete_rule(Name=rule_name)
            logger.info(f"Deleted EventBridge rule: {rule_name}")
            return True
        except Exception as e:
            logger.error(f"Error deleting rule {rule_name}: {e}")
            return False
    
    def ensure_rule_target(self, rule_name: str, function_arn: str) -> bool:
        """
        Ensure the Lambda function is configured as a target for the rule.
        
        Args:
            rule_name: Name of the EventBridge rule
            function_arn: ARN of the Lambda function
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Check if target already exists
            targets_response = self.events.list_targets_by_rule(Rule=rule_name)
            existing_targets = targets_response.get('Targets', [])
            
            # If target already exists, skip
            for target in existing_targets:
                if target['Arn'] == function_arn:
                    logger.info(f"Target already exists for rule {rule_name}")
                    return True
            
            # Add target
            self.events.put_targets(
                Rule=rule_name,
                Targets=[
                    {
                        'Id': 'WarmLambda',
                        'Arn': function_arn
                    }
                ]
            )
            logger.info(f"Added Lambda target to rule {rule_name}")
            return True
        except Exception as e:
            logger.error(f"Error configuring target for rule {rule_name}: {e}")
            return False
    
    def get_warmer_function_arn(self) -> Optional[str]:
        """
        Get the ARN of the Lambda warmer function for this environment.
        
        Returns:
            Function ARN or None if not found
        """
        warmer_function_name = f"{self.name_prefix}-lambda-warmer"
        
        try:
            # Get function configuration
            self.lambda_client.get_function_configuration(FunctionName=warmer_function_name)
            
            # Construct ARN
            account_id = boto3.client('sts').get_caller_identity()['Account']
            region = os.environ.get('AWS_REGION', 'us-east-1')
            function_arn = f"arn:aws:lambda:{region}:{account_id}:function:{warmer_function_name}"
            
            return function_arn
        except Exception as e:
            logger.error(f"Error getting warmer function ARN: {e}")
            return None
    
    def sync_rules(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Synchronize EventBridge rules with schedule configuration.
        
        Creates/updates/deletes rules as needed based on the weekly schedule.
        
        Args:
            config: Lambda warming configuration with weekly_schedule
        
        Returns:
            Dictionary with sync results including created, updated, and deleted rules
        """
        results = {
            "success": True,
            "created": [],
            "updated": [],
            "deleted": [],
            "errors": []
        }
        
        # Get Lambda function ARN
        warmer_function_arn = self.get_warmer_function_arn()
        if not warmer_function_arn:
            return {
                "success": False,
                "error": f"Could not find warmer function: {self.name_prefix}-lambda-warmer"
            }
        
        # Validate configuration
        is_valid, error_msg = validate_schedule_config(config)
        if not is_valid:
            logger.error(f"Invalid schedule configuration: {error_msg}")
            return {
                "success": False,
                "error": error_msg
            }
        
        # Generate desired rules from configuration
        desired_rules = generate_cron_expressions(config)
        
        # Get existing warmer rules
        existing_rules = self.list_warmer_rules()
        
        # Build desired rule names
        desired_rule_names = set()
        for rule_config in desired_rules:
            rule_name = f"{self.name_prefix}-warmer-{rule_config['rule_suffix']}"
            desired_rule_names.add(rule_name)
        
        # Determine which rules to delete (exist but not in desired)
        existing_rule_names = set(existing_rules.keys())
        to_delete = existing_rule_names - desired_rule_names
        
        # Delete obsolete rules
        for rule_name in to_delete:
            if self.delete_rule(rule_name):
                results["deleted"].append(rule_name)
            else:
                results["errors"].append(f"Failed to delete {rule_name}")
        
        # Create or update desired rules
        for rule_config in desired_rules:
            full_rule_name = f"{self.name_prefix}-warmer-{rule_config['rule_suffix']}"
            
            try:
                # Determine if this is a new rule or update
                is_new = full_rule_name not in existing_rule_names
                
                # Create or update rule
                rule_state = 'ENABLED' if config.get("enabled") else 'DISABLED'
                description = f"Warm Lambdas on {', '.join(rule_config['days'])}"
                
                self.events.put_rule(
                    Name=full_rule_name,
                    ScheduleExpression=rule_config["cron"],
                    State=rule_state,
                    Description=description
                )
                
                # Ensure target is configured
                if self.ensure_rule_target(full_rule_name, warmer_function_arn):
                    if is_new:
                        results["created"].append(full_rule_name)
                        logger.info(f"Created rule: {full_rule_name} - {rule_config['cron']}")
                    else:
                        results["updated"].append(full_rule_name)
                        logger.info(f"Updated rule: {full_rule_name} - {rule_config['cron']}")
                else:
                    results["errors"].append(f"Failed to configure target for {full_rule_name}")
            
            except Exception as e:
                error_msg = f"Error configuring rule {full_rule_name}: {str(e)}"
                logger.error(error_msg)
                results["errors"].append(error_msg)
                results["success"] = False
        
        return results
    
    def disable_rules(self) -> Dict[str, Any]:
        """
        Disable all warmer rules for the environment.
        
        Returns:
            Dictionary with results of disabling rules
        """
        results = {
            "success": True,
            "disabled": [],
            "errors": []
        }
        
        # Get all warmer rules
        existing_rules = self.list_warmer_rules()
        
        # Disable each rule
        for rule_name in existing_rules.keys():
            try:
                self.events.disable_rule(Name=rule_name)
                results["disabled"].append(rule_name)
                logger.info(f"Disabled rule: {rule_name}")
            except Exception as e:
                error_msg = f"Error disabling rule {rule_name}: {str(e)}"
                logger.error(error_msg)
                results["errors"].append(error_msg)
                results["success"] = False
        
        return results
    
    def list_lambda_functions(self, function_prefix: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List Lambda functions in the environment.
        
        Args:
            function_prefix: Optional prefix to filter functions (defaults to self.name_prefix)
        
        Returns:
            List of function configurations with name, memory, timeout, runtime, etc.
        """
        prefix = function_prefix or self.name_prefix
        functions = []
        
        try:
            paginator = self.lambda_client.get_paginator('list_functions')
            
            for page in paginator.paginate():
                for func in page['Functions']:
                    # Filter by prefix
                    if func['FunctionName'].startswith(prefix):
                        functions.append({
                            "name": func['FunctionName'],
                            "memory_mb": func.get('MemorySize', 0),
                            "timeout_seconds": func.get('Timeout', 0),
                            "runtime": func.get('Runtime', 'unknown'),
                            "last_modified": func.get('LastModified', ''),
                            "description": func.get('Description', '')
                        })
            
            logger.info(f"Found {len(functions)} Lambda function(s) with prefix {prefix}")
        except Exception as e:
            logger.error(f"Error listing Lambda functions: {e}")
        
        return functions
