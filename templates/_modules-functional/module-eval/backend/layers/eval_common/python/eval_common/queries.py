"""
Evaluation module shared query functions.

This module provides shared query functions that wrap org_common.rpc() calls
to avoid Supabase REST API issues (like JSONB 406 errors).
"""

import json
import logging
from typing import Any, Dict, List

# Import from org_common
import org_common as common

logger = logging.getLogger(__name__)


def get_criteria_results(eval_summary_id: str) -> List[Dict[str, Any]]:
    """
    Get criteria results for an evaluation using RPC to avoid JSONB 406 error.
    
    This function calls the PostgreSQL get_eval_criteria_results() RPC function
    instead of using common.find_many(), which avoids the Supabase REST API
    406 error when fetching JSONB columns with select=*.
    
    Args:
        eval_summary_id: UUID of the evaluation summary
    
    Returns:
        List of criteria result records with ai_result parsed from TEXT to dict
        
    Example:
        >>> results = get_criteria_results(eval_id)
        >>> for result in results:
        ...     print(result['ai_result'])  # dict with score, confidence, etc.
    """
    try:
        # Call PostgreSQL RPC function (returns ai_result as TEXT to avoid 406)
        results = common.rpc(
            'get_eval_criteria_results',
            {'p_eval_summary_id': eval_summary_id}
        )
        
        if not results:
            logger.info(f"No criteria results found for eval {eval_summary_id}")
            return []
        
        # Parse ai_result from TEXT back to dict
        parsed_results = []
        for result in results:
            parsed = dict(result)  # Copy the record
            
            # Parse ai_result from TEXT to dict (if present and not None)
            if parsed.get('ai_result'):
                try:
                    # Check if it's already a dict (shouldn't happen, but defensive)
                    if isinstance(parsed['ai_result'], dict):
                        pass  # Already parsed
                    else:
                        # Parse JSON string to dict
                        parsed['ai_result'] = json.loads(parsed['ai_result'])
                except (json.JSONDecodeError, TypeError) as e:
                    logger.warning(
                        f"Failed to parse ai_result for result {parsed.get('id')}: {e}. "
                        f"Keeping as string."
                    )
                    # Keep as string if parse fails (legacy format)
            
            parsed_results.append(parsed)
        
        logger.info(f"Fetched {len(parsed_results)} criteria results for eval {eval_summary_id}")
        return parsed_results
        
    except Exception as e:
        logger.error(f"Error fetching criteria results via RPC: {e}")
        raise