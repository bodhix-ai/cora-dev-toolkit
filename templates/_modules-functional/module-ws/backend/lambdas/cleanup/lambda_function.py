"""
Workspace Module - Cleanup Handler

This Lambda function is triggered by EventBridge on a schedule (e.g., daily)
to permanently delete soft-deleted workspaces that have exceeded their
retention period.

Schedule: Daily at 2:00 AM UTC (configurable via EventBridge rule)

This handler:
1. Calls the cleanup_expired_workspaces() RPC function
2. Logs the results for audit purposes
3. Returns a summary of deleted workspaces
"""

import json
import logging
import os
from typing import Any, Dict

import org_common as common

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))


def lambda_handler(event: Dict[str, Any], context: object) -> Dict[str, Any]:
    """
    Scheduled cleanup handler for expired workspaces.
    
    This function is triggered by EventBridge and permanently deletes
    workspaces that have been soft-deleted and exceeded their retention period.
    
    Args:
        event: EventBridge scheduled event
        context: Lambda context
    
    Returns:
        Cleanup summary with deleted workspace count and IDs
    """
    logger.info("Starting workspace cleanup job")
    logger.info(f"Event: {json.dumps(event)}")
    
    try:
        # Call the cleanup RPC function
        result = common.rpc(
            function_name='cleanup_expired_workspaces',
            params={}
        )
        
        deleted_count = result.get('deleted_count', 0) if result else 0
        workspace_ids = result.get('workspace_ids', []) if result else []
        
        # Log results for audit
        if deleted_count > 0:
            logger.info(f"Cleanup complete: Permanently deleted {deleted_count} expired workspace(s)")
            logger.info(f"Deleted workspace IDs: {workspace_ids}")
        else:
            logger.info("Cleanup complete: No expired workspaces to delete")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Workspace cleanup completed successfully',
                'deletedCount': deleted_count,
                'workspaceIds': workspace_ids
            })
        }
    
    except Exception as e:
        logger.exception(f'Error during workspace cleanup: {str(e)}')
        
        # Return error but don't raise - we want the Lambda to complete
        # so EventBridge doesn't retry excessively
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Workspace cleanup failed',
                'error': str(e)
            })
        }
