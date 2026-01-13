"""
Module Usage Tracking Handlers for CORA Platform Management.

This module provides Lambda handlers for tracking and querying module usage:
- Track usage events
- Get usage statistics
- Get daily aggregated stats

All handlers follow the CORA API response standard.
"""

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple, List

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


# =============================================================================
# Response Helpers
# =============================================================================

def _success_response(data: Any, status_code: int = 200) -> Dict:
    """Create a standardized success response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        "body": json.dumps(data, default=str),
    }


def _error_response(
    message: str,
    status_code: int = 500,
    error_code: str = "INTERNAL_ERROR",
    details: Optional[Dict] = None,
) -> Dict:
    """Create a standardized error response."""
    body = {
        "error": error_code,
        "message": message,
    }
    if details:
        body["details"] = details
    
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        "body": json.dumps(body),
    }


def _get_path_parameter(event: Dict, param_name: str) -> Optional[str]:
    """Extract a path parameter from the event."""
    path_params = event.get("pathParameters") or {}
    return path_params.get(param_name)


def _get_query_parameter(event: Dict, param_name: str, default: Any = None) -> Any:
    """Extract a query parameter from the event."""
    query_params = event.get("queryStringParameters") or {}
    return query_params.get(param_name, default)


def _parse_body(event: Dict) -> Tuple[Optional[Dict], Optional[str]]:
    """Parse the request body from the event."""
    body = event.get("body")
    if not body:
        return None, "Request body is required"
    
    try:
        return json.loads(body), None
    except json.JSONDecodeError as e:
        return None, f"Invalid JSON in request body: {str(e)}"


def _get_user_context(event: Dict) -> Dict:
    """Extract user context from the authorizer."""
    request_context = event.get("requestContext", {})
    authorizer = request_context.get("authorizer", {})
    
    return {
        "user_id": authorizer.get("principalId"),
        "org_id": authorizer.get("org_id"),
        "is_sys_admin": authorizer.get("is_sys_admin", False),
        "is_org_admin": authorizer.get("is_org_admin", False),
    }


def _get_request_id(event: Dict) -> Optional[str]:
    """Extract request ID for correlation."""
    request_context = event.get("requestContext", {})
    return request_context.get("requestId")


# =============================================================================
# Database Operations (Supabase)
# =============================================================================

def _get_supabase_client():
    """
    Get Supabase client for database operations.
    
    Note: This is a placeholder. In actual implementation, this would use
    the project's authentication and database patterns.
    """
    try:
        from supabase import create_client, Client
        import os
        
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            logger.error("Missing Supabase configuration")
            return None
            
        return create_client(supabase_url, supabase_key)
    except ImportError:
        logger.error("Supabase client not available")
        return None


# =============================================================================
# Handler: Track Module Usage
# =============================================================================

def track_usage_handler(event: Dict, context: Any) -> Dict:
    """
    Track a module usage event.
    
    POST /platform/modules/{name}/usage
    
    Path Parameters:
        - name: Module name
    
    Body:
        {
            "event_type": "string (required) - api_call, page_view, feature_use, error, export, import",
            "event_action": "string (optional) - e.g., 'kb.document.create'",
            "event_metadata": "object (optional) - additional event data",
            "endpoint": "string (optional) - API endpoint or page route",
            "http_method": "string (optional) - GET, POST, etc.",
            "duration_ms": "integer (optional) - request duration",
            "status": "string (optional) - success, failure, partial",
            "error_code": "string (optional) - if status is failure",
            "error_message": "string (optional) - if status is failure"
        }
    
    Returns:
        201: Usage event recorded
        400: Invalid request
        404: Module not found
        500: Server error
    """
    try:
        module_name = _get_path_parameter(event, "name")
        
        if not module_name:
            return _error_response(
                "Module name is required",
                status_code=400,
                error_code="MISSING_PARAMETER"
            )
        
        # Parse request body
        body, error = _parse_body(event)
        if error:
            return _error_response(error, status_code=400, error_code="INVALID_BODY")
        
        user_context = _get_user_context(event)
        request_id = _get_request_id(event)
        
        # Validate event_type
        event_type = body.get("event_type", "api_call")
        valid_event_types = ["api_call", "page_view", "feature_use", "error", "export", "import"]
        if event_type not in valid_event_types:
            return _error_response(
                f"Invalid event_type. Must be one of: {', '.join(valid_event_types)}",
                status_code=400,
                error_code="INVALID_EVENT_TYPE"
            )
        
        logger.info(f"Tracking usage for module: {module_name}, event_type: {event_type}")
        
        # Get database client
        supabase = _get_supabase_client()
        if not supabase:
            return _error_response(
                "Database connection unavailable",
                status_code=503,
                error_code="SERVICE_UNAVAILABLE"
            )
        
        # Get module ID
        module_response = (
            supabase.table("sys_module_registry")
            .select("id")
            .eq("module_name", module_name)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
        
        if not module_response.data:
            return _error_response(
                f"Module '{module_name}' not found",
                status_code=404,
                error_code="MODULE_NOT_FOUND"
            )
        
        module_id = module_response.data["id"]
        
        # Validate status
        status = body.get("status", "success")
        if status not in ["success", "failure", "partial"]:
            status = "success"
        
        # Prepare usage data
        usage_data = {
            "module_id": module_id,
            "module_name": module_name,
            "org_id": user_context.get("org_id"),
            "user_id": user_context.get("user_id"),
            "event_type": event_type,
            "event_action": body.get("event_action"),
            "event_metadata": body.get("event_metadata", {}),
            "request_id": request_id,
            "endpoint": body.get("endpoint"),
            "http_method": body.get("http_method"),
            "duration_ms": body.get("duration_ms"),
            "status": status,
            "error_code": body.get("error_code") if status == "failure" else None,
            "error_message": body.get("error_message") if status == "failure" else None,
        }
        
        # Insert usage event
        response = (
            supabase.table("sys_module_usage")
            .insert(usage_data)
            .execute()
        )
        
        logger.info(f"Successfully tracked usage for module: {module_name}")
        return _success_response(
            {
                "message": "Usage event recorded",
                "usage_id": response.data[0]["id"] if response.data else None
            },
            status_code=201
        )
        
    except Exception as e:
        logger.error(f"Error tracking module usage: {str(e)}")
        return _error_response(
            f"Failed to track usage: {str(e)}",
            error_code="TRACK_USAGE_FAILED"
        )


# =============================================================================
# Handler: Get Module Usage Statistics
# =============================================================================

def get_usage_stats_handler(event: Dict, context: Any) -> Dict:
    """
    Get usage statistics for a module or all modules.
    
    GET /platform/modules/usage
    GET /platform/modules/{name}/usage/stats
    
    Path Parameters:
        - name: Module name (optional - if not provided, returns all modules)
    
    Query Parameters:
        - start_date: Start date for stats (YYYY-MM-DD), default: 30 days ago
        - end_date: End date for stats (YYYY-MM-DD), default: today
        - granularity: daily, weekly, monthly (default: daily)
        - event_type: Filter by event type
    
    Returns:
        200: Usage statistics
        403: Forbidden (not admin)
        404: Module not found
        500: Server error
    """
    try:
        module_name = _get_path_parameter(event, "name")
        
        user_context = _get_user_context(event)
        
        # Only org admins and sys admins can view usage stats
        if not user_context.get("is_org_admin") and not user_context.get("is_sys_admin"):
            return _error_response(
                "Only administrators can view usage statistics",
                status_code=403,
                error_code="FORBIDDEN"
            )
        
        # Parse query parameters
        today = datetime.now().date()
        default_start = (today - timedelta(days=30)).isoformat()
        
        start_date = _get_query_parameter(event, "start_date", default_start)
        end_date = _get_query_parameter(event, "end_date", today.isoformat())
        granularity = _get_query_parameter(event, "granularity", "daily")
        event_type_filter = _get_query_parameter(event, "event_type")
        
        logger.info(f"Getting usage stats: module={module_name}, start={start_date}, end={end_date}")
        
        # Get database client
        supabase = _get_supabase_client()
        if not supabase:
            return _error_response(
                "Database connection unavailable",
                status_code=503,
                error_code="SERVICE_UNAVAILABLE"
            )
        
        # Build query for daily stats
        query = supabase.table("sys_module_usage_daily").select("*")
        
        # Filter by date range
        query = query.gte("usage_date", start_date).lte("usage_date", end_date)
        
        # Filter by module if specified
        if module_name:
            # First verify module exists
            module_response = (
                supabase.table("sys_module_registry")
                .select("id, module_name, display_name")
                .eq("module_name", module_name)
                .is_("deleted_at", "null")
                .single()
                .execute()
            )
            
            if not module_response.data:
                return _error_response(
                    f"Module '{module_name}' not found",
                    status_code=404,
                    error_code="MODULE_NOT_FOUND"
                )
            
            query = query.eq("module_name", module_name)
        
        # Filter by org for non-sys admins
        if not user_context.get("is_sys_admin"):
            query = query.eq("org_id", user_context.get("org_id"))
        
        # Filter by event type if specified
        if event_type_filter:
            query = query.eq("event_type", event_type_filter)
        
        # Execute query
        response = query.order("usage_date", desc=True).execute()
        
        raw_data = response.data or []
        
        # Aggregate based on granularity
        stats = _aggregate_usage_stats(raw_data, granularity)
        
        # Calculate summary
        summary = _calculate_usage_summary(raw_data)
        
        result = {
            "period": {
                "start": start_date,
                "end": end_date,
                "granularity": granularity,
            },
            "module": module_name,
            "summary": summary,
            "data": stats,
        }
        
        logger.info(f"Successfully retrieved usage stats: {len(stats)} periods")
        return _success_response(result)
        
    except Exception as e:
        logger.error(f"Error getting usage stats: {str(e)}")
        return _error_response(
            f"Failed to get usage statistics: {str(e)}",
            error_code="GET_USAGE_STATS_FAILED"
        )


# =============================================================================
# Helper Functions
# =============================================================================

def _aggregate_usage_stats(data: List[Dict], granularity: str) -> List[Dict]:
    """
    Aggregate usage data based on granularity.
    
    Args:
        data: Raw daily usage data
        granularity: daily, weekly, or monthly
    
    Returns:
        Aggregated usage data
    """
    if not data:
        return []
    
    if granularity == "daily":
        # Group by date
        grouped = {}
        for record in data:
            date_key = record.get("usage_date")
            if date_key not in grouped:
                grouped[date_key] = {
                    "date": date_key,
                    "total_events": 0,
                    "successful_events": 0,
                    "failed_events": 0,
                    "unique_users": set(),
                    "total_duration_ms": 0,
                    "event_types": {},
                }
            
            grouped[date_key]["total_events"] += record.get("total_events", 0)
            grouped[date_key]["successful_events"] += record.get("successful_events", 0)
            grouped[date_key]["failed_events"] += record.get("failed_events", 0)
            grouped[date_key]["total_duration_ms"] += record.get("total_duration_ms", 0)
            
            # Track event types
            event_type = record.get("event_type")
            if event_type:
                if event_type not in grouped[date_key]["event_types"]:
                    grouped[date_key]["event_types"][event_type] = 0
                grouped[date_key]["event_types"][event_type] += record.get("total_events", 0)
        
        # Convert to list and calculate averages
        result = []
        for date_key, stats in sorted(grouped.items(), reverse=True):
            total = stats["total_events"]
            result.append({
                "period": date_key,
                "totalEvents": stats["total_events"],
                "successfulEvents": stats["successful_events"],
                "failedEvents": stats["failed_events"],
                "successRate": round(stats["successful_events"] / total * 100, 2) if total > 0 else 0,
                "avgDurationMs": round(stats["total_duration_ms"] / total) if total > 0 else 0,
                "eventTypes": stats["event_types"],
            })
        return result
    
    elif granularity == "weekly":
        # Group by ISO week
        grouped = {}
        for record in data:
            date_str = record.get("usage_date")
            if date_str:
                date_obj = datetime.fromisoformat(date_str)
                week_key = f"{date_obj.isocalendar()[0]}-W{date_obj.isocalendar()[1]:02d}"
                
                if week_key not in grouped:
                    grouped[week_key] = {
                        "total_events": 0,
                        "successful_events": 0,
                        "failed_events": 0,
                        "total_duration_ms": 0,
                    }
                
                grouped[week_key]["total_events"] += record.get("total_events", 0)
                grouped[week_key]["successful_events"] += record.get("successful_events", 0)
                grouped[week_key]["failed_events"] += record.get("failed_events", 0)
                grouped[week_key]["total_duration_ms"] += record.get("total_duration_ms", 0)
        
        result = []
        for week_key, stats in sorted(grouped.items(), reverse=True):
            total = stats["total_events"]
            result.append({
                "period": week_key,
                "totalEvents": stats["total_events"],
                "successfulEvents": stats["successful_events"],
                "failedEvents": stats["failed_events"],
                "successRate": round(stats["successful_events"] / total * 100, 2) if total > 0 else 0,
                "avgDurationMs": round(stats["total_duration_ms"] / total) if total > 0 else 0,
            })
        return result
    
    elif granularity == "monthly":
        # Group by year-month
        grouped = {}
        for record in data:
            date_str = record.get("usage_date")
            if date_str:
                month_key = date_str[:7]  # YYYY-MM
                
                if month_key not in grouped:
                    grouped[month_key] = {
                        "total_events": 0,
                        "successful_events": 0,
                        "failed_events": 0,
                        "total_duration_ms": 0,
                    }
                
                grouped[month_key]["total_events"] += record.get("total_events", 0)
                grouped[month_key]["successful_events"] += record.get("successful_events", 0)
                grouped[month_key]["failed_events"] += record.get("failed_events", 0)
                grouped[month_key]["total_duration_ms"] += record.get("total_duration_ms", 0)
        
        result = []
        for month_key, stats in sorted(grouped.items(), reverse=True):
            total = stats["total_events"]
            result.append({
                "period": month_key,
                "totalEvents": stats["total_events"],
                "successfulEvents": stats["successful_events"],
                "failedEvents": stats["failed_events"],
                "successRate": round(stats["successful_events"] / total * 100, 2) if total > 0 else 0,
                "avgDurationMs": round(stats["total_duration_ms"] / total) if total > 0 else 0,
            })
        return result
    
    return []


def _calculate_usage_summary(data: List[Dict]) -> Dict:
    """
    Calculate summary statistics from usage data.
    
    Args:
        data: Raw usage data
    
    Returns:
        Summary statistics
    """
    if not data:
        return {
            "totalEvents": 0,
            "successfulEvents": 0,
            "failedEvents": 0,
            "successRate": 0,
            "avgDurationMs": 0,
        }
    
    total_events = sum(r.get("total_events", 0) for r in data)
    successful_events = sum(r.get("successful_events", 0) for r in data)
    failed_events = sum(r.get("failed_events", 0) for r in data)
    total_duration = sum(r.get("total_duration_ms", 0) for r in data)
    
    return {
        "totalEvents": total_events,
        "successfulEvents": successful_events,
        "failedEvents": failed_events,
        "successRate": round(successful_events / total_events * 100, 2) if total_events > 0 else 0,
        "avgDurationMs": round(total_duration / total_events) if total_events > 0 else 0,
    }
