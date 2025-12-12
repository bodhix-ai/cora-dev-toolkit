"""
Lambda Management Module - Common Utilities

This layer provides shared functionality for Lambda management operations:
- Schedule generation and cron expression utilities
- EventBridge rule management
- Lambda warming configuration

Usage:
    from lambda_mgmt_common import EventBridgeManager, generate_cron_expressions
    
    # Generate cron expressions from schedule
    config = {...}
    rules = generate_cron_expressions(config)
    
    # Manage EventBridge rules
    manager = EventBridgeManager(environment="dev")
    results = manager.sync_rules(config)
"""

from .eventbridge import EventBridgeManager
from .schedule import (
    local_time_to_utc,
    time_range_to_cron_hours,
    generate_cron_for_day,
    extract_hour_pattern,
    are_consecutive_days,
    group_days_by_schedule,
    generate_cron_expressions,
    validate_schedule_config,
)

__version__ = "1.0.0"

__all__ = [
    # EventBridge management
    'EventBridgeManager',
    
    # Schedule utilities
    'local_time_to_utc',
    'time_range_to_cron_hours',
    'generate_cron_for_day',
    'extract_hour_pattern',
    'are_consecutive_days',
    'group_days_by_schedule',
    'generate_cron_expressions',
    'validate_schedule_config',
]
