"""
Error Classes Module
Custom exceptions for org-module
"""


class OrgModuleError(Exception):
    """Base exception for org-module"""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ValidationError(OrgModuleError):
    """Raised when input validation fails"""
    def __init__(self, message: str):
        super().__init__(message, status_code=400)


class NotFoundError(OrgModuleError):
    """Raised when a resource is not found"""
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)


class UnauthorizedError(OrgModuleError):
    """Raised when user is not authenticated"""
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=401)


class ForbiddenError(OrgModuleError):
    """Raised when user is authenticated but not authorized"""
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, status_code=403)


class ConflictError(OrgModuleError):
    """Raised when there is a conflict (e.g., duplicate record)"""
    def __init__(self, message: str = "Conflict"):
        super().__init__(message, status_code=409)


class InternalError(OrgModuleError):
    """Raised when an internal error occurs"""
    def __init__(self, message: str = "Internal server error"):
        super().__init__(message, status_code=500)
