"""
Response Builder Module
Standard API Gateway response formats
"""
import json
from typing import Any, Dict


def success_response(data: Any, status_code: int = 200) -> Dict[str, Any]:
    """
    Return successful API response

    Args:
        data: Response data (will be JSON serialized)
        status_code: HTTP status code (default: 200)

    Returns:
        API Gateway response dictionary
    """
    return {
        'statusCode': status_code,
        'body': json.dumps({
            'success': True,
            'data': data
        }, default=str),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        }
    }


def error_response(status_code: int, message: str, details: Any = None) -> Dict[str, Any]:
    """
    Return error API response

    Args:
        status_code: HTTP status code
        message: Error message
        details: Optional additional error details

    Returns:
        API Gateway response dictionary
    """
    body = {
        'success': False,
        'error': message
    }

    if details:
        body['details'] = details

    return {
        'statusCode': status_code,
        'body': json.dumps(body),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        }
    }


def created_response(data: Any) -> Dict[str, Any]:
    """
    Return 201 Created response

    Args:
        data: Created resource data

    Returns:
        API Gateway response dictionary
    """
    return success_response(data, status_code=201)


def no_content_response() -> Dict[str, Any]:
    """
    Return 204 No Content response

    Returns:
        API Gateway response dictionary
    """
    return {
        'statusCode': 204,
        'body': '',
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        }
    }


def bad_request_response(message: str = "Bad request", details: Any = None) -> Dict[str, Any]:
    """
    Return 400 Bad Request response

    Args:
        message: Error message
        details: Optional error details

    Returns:
        API Gateway response dictionary
    """
    return error_response(400, message, details)


def unauthorized_response(message: str = "Unauthorized") -> Dict[str, Any]:
    """
    Return 401 Unauthorized response

    Args:
        message: Error message

    Returns:
        API Gateway response dictionary
    """
    return error_response(401, message)


def forbidden_response(message: str = "Forbidden") -> Dict[str, Any]:
    """
    Return 403 Forbidden response

    Args:
        message: Error message

    Returns:
        API Gateway response dictionary
    """
    return error_response(403, message)


def not_found_response(message: str = "Not found") -> Dict[str, Any]:
    """
    Return 404 Not Found response

    Args:
        message: Error message

    Returns:
        API Gateway response dictionary
    """
    return error_response(404, message)


def conflict_response(message: str = "Conflict") -> Dict[str, Any]:
    """
    Return 409 Conflict response

    Args:
        message: Error message

    Returns:
        API Gateway response dictionary
    """
    return error_response(409, message)


def internal_error_response(message: str = "Internal server error") -> Dict[str, Any]:
    """
    Return 500 Internal Server Error response

    Args:
        message: Error message

    Returns:
        API Gateway response dictionary
    """
    return error_response(500, message)


def method_not_allowed_response(message: str = "Method not allowed") -> Dict[str, Any]:
    """
    Return 405 Method Not Allowed response

    Args:
        message: Error message

    Returns:
        API Gateway response dictionary
    """
    return error_response(405, message)