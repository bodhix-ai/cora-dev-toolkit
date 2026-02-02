"""
KB Document Lambda - Document Upload/Download Operations

Routes - Workspace Scoped:
- GET /ws/{wsId}/kb/documents - List documents
- POST /ws/{wsId}/kb/documents - Get presigned upload URL
- GET /ws/{wsId}/kb/documents/{docId} - Get document metadata
- PUT /ws/{wsId}/kb/documents/{docId}/complete - Complete document upload
- DELETE /ws/{wsId}/kb/documents/{docId} - Delete document
- GET /ws/{wsId}/kb/documents/{docId}/download - Get presigned download URL

Routes - Chat Scoped:
- GET /chats/{chatId}/kb/documents - List documents
- POST /chats/{chatId}/kb/documents - Get presigned upload URL
- GET /chats/{chatId}/kb/documents/{docId} - Get document metadata
- PUT /chats/{chatId}/kb/documents/{docId}/complete - Complete document upload
- DELETE /chats/{chatId}/kb/documents/{docId} - Delete document

Routes - Org Admin:
- POST /admin/org/kb/{kbId}/documents - Upload to org KB
- GET /admin/org/kb/{kbId}/documents - List org KB documents
- PUT /admin/org/kb/{kbId}/documents/{docId}/complete - Complete org KB document upload
- DELETE /admin/org/kb/{kbId}/documents/{docId} - Delete from org KB

Routes - Platform Admin:
- POST /admin/sys/kb/{kbId}/documents - Upload to system KB
- GET /admin/sys/kb/{kbId}/documents - List system KB documents
- PUT /admin/sys/kb/{kbId}/documents/{docId}/complete - Complete system KB document upload
- DELETE /admin/sys/kb/{kbId}/documents/{docId} - Delete from system KB
"""

import json
import os
import traceback
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

import boto3
import org_common as common
from kb_common.permissions import can_view_kb_document, can_edit_kb_document

# Environment variables
S3_BUCKET = os.environ.get('S3_BUCKET') or os.environ.get('KB_S3_BUCKET')
SQS_QUEUE_URL = os.environ.get('SQS_QUEUE_URL') or os.environ.get('KB_PROCESSOR_QUEUE_URL')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')

# AWS clients
s3_client = boto3.client('s3', region_name=AWS_REGION)
sqs_client = boto3.client('sqs', region_name=AWS_REGION)

# Constants
MAX_FILE_SIZE = 52428800  # 50 MB
ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # DOCX
    'text/plain',
    'text/markdown',
    'application/msword',  # DOC
]
PRESIGNED_URL_EXPIRATION = 900  # 15 minutes


def lambda_handler(event, context):
    """Main Lambda handler with routing logic."""
    print(json.dumps(event, default=str))
    
    try:
        # Extract HTTP method and path
        http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod', '')
        path = event.get('requestContext', {}).get('http', {}).get('path') or event.get('path', '')
        path_params = event.get('pathParameters', {}) or {}
        
        # Handle CORS preflight
        if http_method == 'OPTIONS':
            return common.success_response({})
        
        # Extract user info from authorizer
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        
        # Convert Okta UID to Supabase UUID for database operations
        user_id = common.get_supabase_user_id_from_okta_uid(okta_uid)
        
        # Route to appropriate handler
        if '/ws/' in path and '/kb/documents' in path:
            return handle_workspace_documents(http_method, path, path_params, event, user_id)
        elif '/chats/' in path and '/kb/documents' in path:
            return handle_chat_documents(http_method, path, path_params, event, user_id)
        elif '/admin/org/kb/' in path and '/documents' in path:
            return handle_org_admin_documents(http_method, path, path_params, event, user_id)
        elif '/admin/sys/kb/' in path and '/documents' in path:
            return handle_sys_admin_documents(http_method, path, path_params, event, user_id)
        elif '/kb/documents/' in path and '/complete' in path:
            # Generic complete endpoint (not scope-specific)
            doc_id = path_params.get('docId')
            return handle_complete_upload(user_id, doc_id) if doc_id else common.bad_request_response("Missing docId")
        else:
            return common.not_found_response("Endpoint not found")
    
    except KeyError as e:
        print(f"KeyError: {str(e)}")
        return common.unauthorized_response(f"Missing user information: {str(e)}")
    except common.NotFoundError as e:
        return common.not_found_response(str(e))
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except common.UnauthorizedError as e:
        return common.unauthorized_response(str(e))
    except Exception as e:
        print(f"Unhandled error: {str(e)}")
        print(traceback.format_exc())
        return common.internal_error_response("Internal server error")


def handle_workspace_documents(method: str, path: str, path_params: Dict, event: Dict, user_id: str):
    """
    Handle workspace-scoped document operations.
    
    ADR-019c Compliant: Two-step authorization pattern
    - Step 1: Verify workspace membership
    - Step 2: Check document-level permissions (where applicable)
    """
    workspace_id = path_params.get('wsId')
    doc_id = path_params.get('docId')
    
    if not workspace_id:
        return common.bad_request_response("Missing wsId")
    
    # ========================================
    # STEP 1: VERIFY WORKSPACE MEMBERSHIP (ADR-019c)
    # ========================================
    if not common.can_access_ws_resource(user_id, workspace_id):
        return common.forbidden_response("Not a workspace member")
    
    # ========================================
    # STEP 2: CHECK DOCUMENT PERMISSIONS (ADR-019c)
    # ========================================
    if doc_id and method in ['GET', 'DELETE']:
        # For document-specific operations, verify document permissions
        if method == 'GET' and not can_view_kb_document(user_id, doc_id):
            return common.forbidden_response("Cannot access this document")
        elif method == 'DELETE' and not can_edit_kb_document(user_id, doc_id):
            return common.forbidden_response("Cannot delete this document")
    
    # Route to handlers
    if method == 'PUT' and doc_id and '/complete' in path:
        return handle_complete_upload(user_id, doc_id)
    elif method == 'GET' and doc_id and '/download' in path:
        return handle_get_download_url(user_id, workspace_id, doc_id, 'workspace')
    elif method == 'GET' and doc_id:
        return handle_get_document(user_id, doc_id, 'workspace')
    elif method == 'GET':
        return handle_list_documents(user_id, workspace_id, None, 'workspace')
    elif method == 'POST':
        return handle_get_upload_url(user_id, workspace_id, None, event, 'workspace')
    elif method == 'DELETE' and doc_id:
        return handle_delete_document(user_id, doc_id, 'workspace')
    else:
        return common.method_not_allowed_response()


def handle_chat_documents(method: str, path: str, path_params: Dict, event: Dict, user_id: str):
    """Handle chat-scoped document operations."""
    chat_id = path_params.get('chatId')
    doc_id = path_params.get('docId')
    
    if not chat_id:
        return common.bad_request_response("Missing chatId")
    
    # Verify chat access
    if not check_chat_access(user_id, chat_id):
        return common.forbidden_response("Access denied to chat")
    
    if method == 'PUT' and doc_id and '/complete' in path:
        return handle_complete_upload(user_id, doc_id)
    elif method == 'GET' and doc_id:
        return handle_get_document(user_id, doc_id, 'chat')
    elif method == 'GET':
        return handle_list_documents(user_id, None, chat_id, 'chat')
    elif method == 'POST':
        return handle_get_upload_url(user_id, None, chat_id, event, 'chat')
    elif method == 'DELETE' and doc_id:
        return handle_delete_document(user_id, doc_id, 'chat')
    else:
        return common.method_not_allowed_response()


def handle_org_admin_documents(method: str, path: str, path_params: Dict, event: Dict, user_id: str):
    """
    Handle org admin document operations.
    
    ADR-019 Compliant: Centralized router auth pattern
    - Extract org context from event
    - Check org admin access ONCE at router level
    """
    kb_id = path_params.get('kbId')
    doc_id = path_params.get('docId')
    
    if not kb_id:
        return common.bad_request_response("Missing kbId")
    
    # ========================================
    # CENTRALIZED ORG CONTEXT EXTRACTION (ADR-019)
    # ========================================
    org_id = common.get_org_context_from_event(event)
    if not org_id:
        return common.bad_request_response('Organization context required. Pass orgId in query params or request body.')
    
    # ========================================
    # CENTRALIZED AUTH CHECK (ADR-019)
    # ========================================
    if not common.check_org_admin(user_id, org_id):
        return common.forbidden_response('Organization admin access required')
    
    # Verify KB belongs to this org
    kb = common.find_one(table='kb_bases', filters={'id': kb_id, 'is_deleted': False})
    if not kb or kb.get('org_id') != org_id:
        return common.forbidden_response("KB does not belong to this organization")
    
    if method == 'GET':
        return handle_list_documents_by_kb(user_id, kb_id)
    elif method == 'POST':
        return handle_admin_upload_url(user_id, kb_id, event)
    elif method == 'DELETE' and doc_id:
        return handle_delete_document(user_id, doc_id, 'org')
    else:
        return common.method_not_allowed_response()


def handle_sys_admin_documents(method: str, path: str, path_params: Dict, event: Dict, user_id: str):
    """Handle platform admin document operations."""
    kb_id = path_params.get('kbId')
    doc_id = path_params.get('docId')
    
    if not kb_id:
        return common.bad_request_response("Missing kbId")
    
    # Verify platform admin access
    if not check_sys_admin_access(user_id):
        return common.forbidden_response("Access denied: platform admin required")
    
    if method == 'GET':
        return handle_list_documents_by_kb(user_id, kb_id)
    elif method == 'POST':
        return handle_admin_upload_url(user_id, kb_id, event)
    elif method == 'DELETE' and doc_id:
        return handle_delete_document(user_id, doc_id, 'sys')
    else:
        return common.method_not_allowed_response()


# ============================================================================
# Document Handlers
# ============================================================================

def handle_list_documents(user_id: str, workspace_id: Optional[str], chat_id: Optional[str], scope: str):
    """List documents for workspace or chat KB."""
    try:
        # Get KB ID for workspace/chat
        kb_id = get_kb_id_for_scope(workspace_id, chat_id, scope)
        if not kb_id:
            return common.success_response({"documents": []})
        
        # Verify user can access this KB
        if not verify_kb_access(user_id, kb_id):
            return common.forbidden_response("Access denied to KB")
        
        # Query documents using org_common
        docs = common.find_many(
            table='kb_docs',
            filters={'kb_id': kb_id, 'is_deleted': False},
            order='created_at.desc'
        )
        
        return common.success_response({
            "documents": [format_document_record(doc) for doc in docs]
        })
    
    except Exception as e:
        print(f"Error listing documents: {str(e)}")
        return common.internal_error_response("Failed to list documents")


def handle_list_documents_by_kb(user_id: str, kb_id: str):
    """List documents for a specific KB (admin endpoint)."""
    try:
        docs = common.find_many(
            table='kb_docs',
            filters={'kb_id': kb_id, 'is_deleted': False},
            order='created_at.desc'
        )
        
        return common.success_response({
            "documents": [format_document_record(doc) for doc in docs]
        })
    
    except Exception as e:
        print(f"Error listing KB documents: {str(e)}")
        return common.internal_error_response("Failed to list documents")


def handle_get_document(user_id: str, doc_id: str, scope: str):
    """Get document metadata."""
    try:
        doc = common.find_one(
            table='kb_docs',
            filters={'id': doc_id, 'is_deleted': False}
        )
        
        if not doc:
            return common.not_found_response("Document not found")
        
        # Verify user can access this document's KB
        if not verify_kb_access(user_id, doc['kb_id']):
            return common.forbidden_response("Access denied")
        
        return common.success_response({
            "document": format_document_record(doc)
        })
    
    except Exception as e:
        print(f"Error getting document: {str(e)}")
        return common.internal_error_response("Failed to get document")


def handle_get_upload_url(user_id: str, workspace_id: Optional[str], chat_id: Optional[str], 
                          event: Dict, scope: str):
    """Generate presigned URL for document upload."""
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Validate request
        validation_error = validate_upload_request(body)
        if validation_error:
            return validation_error
        
        filename = body.get('filename')
        file_size = body.get('fileSize')
        mime_type = body.get('mimeType')
        
        # Get or create KB for workspace/chat
        kb_id = get_or_create_kb(user_id, workspace_id, chat_id, scope)
        if not kb_id:
            return common.internal_error_response("Failed to get or create KB")
        
        # Verify upload permission
        if not verify_upload_permission(user_id, kb_id):
            return common.forbidden_response("Upload permission denied")
        
        # Get KB to extract org_id for the document record
        kb = get_kb_by_id(kb_id)
        if not kb:
            return common.internal_error_response("KB not found")
        org_id = kb.get('org_id')
        
        # Generate document ID and S3 key
        doc_id = str(uuid.uuid4())
        s3_key = generate_s3_key(kb_id, doc_id, filename, workspace_id, chat_id)
        
        # Generate presigned URL
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': S3_BUCKET,
                'Key': s3_key,
                'ContentType': mime_type,
            },
            ExpiresIn=PRESIGNED_URL_EXPIRATION
        )
        
        # Create document record in pending state (include org_id for CORA compliance)
        common.insert_one(
            table='kb_docs',
            data={
                'id': doc_id,
                'kb_id': kb_id,
                'org_id': org_id,  # Required for kb-processor multi-tenancy
                'filename': filename,
                's3_key': s3_key,
                's3_bucket': S3_BUCKET,
                'file_size': file_size,
                'mime_type': mime_type,
                'status': 'pending',
                'created_by': user_id
            }
        )
        
        # Don't publish SQS message yet - wait for frontend to confirm upload
        # Frontend will call PUT /documents/{docId}/complete after uploading to S3
        
        return common.success_response({
            "uploadUrl": presigned_url,
            "documentId": doc_id,
            "expiresIn": PRESIGNED_URL_EXPIRATION,
            "s3Key": s3_key,
            "message": "Upload document to presigned URL, then call PUT /documents/{docId}/complete"
        })
    
    except Exception as e:
        print(f"Error generating upload URL: {str(e)}")
        print(traceback.format_exc())
        return common.internal_error_response("Failed to generate upload URL")


def handle_admin_upload_url(user_id: str, kb_id: str, event: Dict):
    """Generate presigned URL for admin document upload."""
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Validate request
        validation_error = validate_upload_request(body)
        if validation_error:
            return validation_error
        
        filename = body.get('filename')
        file_size = body.get('fileSize')
        mime_type = body.get('mimeType')
        
        # Verify KB exists
        kb = get_kb_by_id(kb_id)
        if not kb:
            return common.not_found_response("KB not found")
        
        # Verify upload permission
        if not verify_upload_permission(user_id, kb_id):
            return common.forbidden_response("Upload permission denied")
        
        # Generate document ID and S3 key
        doc_id = str(uuid.uuid4())
        s3_key = generate_s3_key_for_kb(kb, doc_id, filename)
        
        # Generate presigned URL
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': S3_BUCKET,
                'Key': s3_key,
                'ContentType': mime_type,
            },
            ExpiresIn=PRESIGNED_URL_EXPIRATION
        )
        
        # Create document record (include org_id for CORA compliance)
        common.insert_one(
            table='kb_docs',
            data={
                'id': doc_id,
                'kb_id': kb_id,
                'org_id': kb.get('org_id'),  # Required for kb-processor multi-tenancy
                'filename': filename,
                's3_key': s3_key,
                's3_bucket': S3_BUCKET,
                'file_size': file_size,
                'mime_type': mime_type,
                'status': 'pending',
                'created_by': user_id
            }
        )
        
        # Don't publish SQS message yet - wait for frontend to confirm upload
        
        return common.success_response({
            "uploadUrl": presigned_url,
            "documentId": doc_id,
            "expiresIn": PRESIGNED_URL_EXPIRATION,
            "s3Key": s3_key,
            "message": "Upload document to presigned URL, then call PUT /kb/documents/{docId}/complete"
        })
    
    except Exception as e:
        print(f"Error generating admin upload URL: {str(e)}")
        return common.internal_error_response("Failed to generate upload URL")


def handle_get_download_url(user_id: str, workspace_id: str, doc_id: str, scope: str):
    """Generate presigned URL for document download."""
    try:
        doc = common.find_one(
            table='kb_docs',
            filters={'id': doc_id, 'is_deleted': False}
        )
        
        if not doc:
            return common.not_found_response("Document not found")
        
        # Verify access
        if not verify_kb_access(user_id, doc['kb_id']):
            return common.forbidden_response("Access denied")
        
        # Generate presigned URL
        download_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': doc['s3_bucket'],
                'Key': doc['s3_key'],
                'ResponseContentDisposition': f'attachment; filename="{doc["filename"]}"'
            },
            ExpiresIn=PRESIGNED_URL_EXPIRATION
        )
        
        return common.success_response({
            "downloadUrl": download_url,
            "filename": doc['filename'],
            "expiresIn": PRESIGNED_URL_EXPIRATION
        })
    
    except Exception as e:
        print(f"Error generating download URL: {str(e)}")
        return common.internal_error_response("Failed to generate download URL")


def handle_complete_upload(user_id: str, doc_id: str):
    """Called by frontend after S3 upload completes."""
    try:
        # Get document
        doc = common.find_one(
            table='kb_docs',
            filters={'id': doc_id, 'is_deleted': False}
        )
        
        if not doc:
            return common.not_found_response("Document not found")
        
        # Verify user has permission
        if not verify_upload_permission(user_id, doc['kb_id']):
            return common.forbidden_response("Upload permission denied")
        
        # Verify file exists in S3
        try:
            s3_client.head_object(
                Bucket=doc['s3_bucket'],
                Key=doc['s3_key']
            )
        except s3_client.exceptions.NoSuchKey:
            return common.bad_request_response("File not found in S3 - upload may have failed")
        except Exception as e:
            print(f"Error checking S3 file: {str(e)}")
            return common.bad_request_response("Could not verify file upload")
        
        # Update status to 'uploaded'
        common.update_one(
            table='kb_docs',
            filters={'id': doc_id},
            data={'status': 'uploaded'}
        )
        
        # NOW publish SQS message to trigger processing
        publish_processing_message(doc_id, doc['kb_id'], doc['s3_key'])
        
        return common.success_response({
            "message": "Upload confirmed, processing started",
            "documentId": doc_id,
            "status": "uploaded"
        })
    
    except Exception as e:
        print(f"Error completing upload: {str(e)}")
        print(traceback.format_exc())
        return common.internal_error_response("Failed to complete upload")


def handle_delete_document(user_id: str, doc_id: str, scope: str):
    """Soft delete document."""
    try:
        # Get document info
        doc = common.find_one(
            table='kb_docs',
            filters={'id': doc_id, 'is_deleted': False}
        )
        
        if not doc:
            return common.not_found_response("Document not found")
        
        kb_id = doc['kb_id']
        
        # Verify delete permission
        if not verify_upload_permission(user_id, kb_id):
            return common.forbidden_response("Delete permission denied")
        
        # Soft delete document (with deleted_at timestamp!)
        from datetime import datetime
        common.update_one(
            table='kb_docs',
            filters={'id': doc_id},
            data={
                'is_deleted': True,
                'deleted_at': datetime.utcnow().isoformat(),
                'deleted_by': user_id
            }
        )
        
        # Delete associated chunks
        common.delete_many(
            table='kb_chunks',
            filters={'document_id': doc_id}
        )
        
        return common.success_response({
            "message": "Document deleted successfully",
            "documentId": doc_id
        })
    
    except Exception as e:
        print(f"Error deleting document: {str(e)}")
        return common.internal_error_response("Failed to delete document")


# ============================================================================
# Helper Functions
# ============================================================================

def format_document_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """Transform DB record to camelCase API response."""
    # Handle created_at - may be datetime or string from DB
    created_at = record.get('created_at')
    if created_at:
        if hasattr(created_at, 'isoformat'):
            created_at = created_at.isoformat()
        # else it's already a string, use as-is
    
    return {
        "id": str(record.get('id', '')),
        "kbId": str(record.get('kb_id', '')),
        "filename": record.get('filename'),
        "s3Key": record.get('s3_key'),
        "s3Bucket": record.get('s3_bucket'),
        "fileSize": record.get('file_size'),
        "mimeType": record.get('mime_type'),
        "status": record.get('status'),
        "errorMessage": record.get('error_message'),
        "chunkCount": record.get('chunk_count') or 0,
        "metadata": record.get('metadata') or {},
        "createdAt": created_at,
        "createdBy": str(record.get('created_by')) if record.get('created_by') else None
    }


def validate_upload_request(body: Dict) -> Optional[Dict]:
    """Validate upload request body."""
    if not body:
        return common.bad_request_response("Request body required")
    
    filename = body.get('filename')
    file_size = body.get('fileSize')
    mime_type = body.get('mimeType')
    
    if not filename:
        return common.bad_request_response("filename is required")
    
    if not file_size:
        return common.bad_request_response("fileSize is required")
    
    if not mime_type:
        return common.bad_request_response("mimeType is required")
    
    if file_size > MAX_FILE_SIZE:
        return common.bad_request_response(f"File size exceeds maximum of {MAX_FILE_SIZE} bytes (50 MB)")
    
    if mime_type not in ALLOWED_MIME_TYPES:
        return common.bad_request_response(f"MIME type not allowed. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}")
    
    return None


def get_kb_id_for_scope(workspace_id: Optional[str], chat_id: Optional[str], scope: str) -> Optional[str]:
    """Get KB ID for workspace or chat scope."""
    try:
        if scope == 'workspace':
            kb = common.find_one(
                table='kb_bases',
                filters={'ws_id': workspace_id, 'scope': 'workspace', 'is_deleted': False}
            )
        elif scope == 'chat':
            kb = common.find_one(
                table='kb_bases',
                filters={'chat_session_id': chat_id, 'scope': 'chat', 'is_deleted': False}
            )
        else:
            return None
        
        return str(kb['id']) if kb else None
    
    except Exception as e:
        print(f"Error getting KB ID: {str(e)}")
        return None


def get_or_create_kb(user_id: str, workspace_id: Optional[str], chat_id: Optional[str], 
                     scope: str) -> Optional[str]:
    """Get existing KB or create new one for workspace/chat."""
    try:
        # Try to get existing KB
        kb_id = get_kb_id_for_scope(workspace_id, chat_id, scope)
        if kb_id:
            return kb_id
        
        # Create new KB
        if scope == 'workspace':
            # Get workspace and org details
            workspace = common.find_one(
                table='workspaces',
                filters={'id': workspace_id}
            )
            if not workspace:
                return None
            
            name = f"{workspace.get('name', 'Workspace')} Knowledge Base"
            org_id = workspace['org_id']
            
            kb = common.insert_one(
                table='kb_bases',
                data={
                    'name': name,
                    'description': 'Auto-created workspace knowledge base',
                    'scope': 'workspace',
                    'org_id': org_id,
                    'ws_id': workspace_id,
                    'created_by': user_id
                }
            )
        
        elif scope == 'chat':
            # Get chat and org details
            chat = common.find_one(
                table='chat_sessions',
                filters={'id': chat_id}
            )
            if not chat:
                return None
            
            # Get workspace for org_id
            workspace = common.find_one(
                table='workspaces',
                filters={'id': chat.get('workspace_id')}
            )
            if not workspace:
                return None
            
            name = f"{chat.get('title', 'Chat')} Knowledge Base"
            org_id = workspace['org_id']
            
            kb = common.insert_one(
                table='kb_bases',
                data={
                    'name': name,
                    'description': 'Auto-created chat knowledge base',
                    'scope': 'chat',
                    'org_id': org_id,
                    'chat_session_id': chat_id,
                    'created_by': user_id
                }
            )
        
        else:
            return None
        
        return str(kb['id']) if kb else None
    
    except Exception as e:
        print(f"Error creating KB: {str(e)}")
        return None


def get_kb_by_id(kb_id: str) -> Optional[Dict]:
    """Get KB by ID."""
    try:
        kb = common.find_one(
            table='kb_bases',
            filters={'id': kb_id, 'is_deleted': False}
        )
        return kb
    except Exception as e:
        print(f"Error getting KB: {str(e)}")
        return None


def generate_s3_key(kb_id: str, doc_id: str, filename: str, 
                   workspace_id: Optional[str], chat_id: Optional[str]) -> str:
    """Generate S3 key for document."""
    # Get org_id from KB
    kb = get_kb_by_id(kb_id)
    if not kb:
        raise ValueError("KB not found")
    
    org_id = kb.get('org_id', 'system')
    ws_id = workspace_id or kb.get('workspace_id') or 'global'
    
    return f"{org_id}/{ws_id}/{kb_id}/{doc_id}/{filename}"


def generate_s3_key_for_kb(kb: Dict, doc_id: str, filename: str) -> str:
    """Generate S3 key for KB (admin upload)."""
    org_id = kb.get('org_id', 'system')
    ws_id = kb.get('workspace_id', 'global')
    kb_id = kb.get('id')
    
    return f"{org_id}/{ws_id}/{kb_id}/{doc_id}/{filename}"


def publish_processing_message(doc_id: str, kb_id: str, s3_key: str):
    """Publish SQS message to trigger document processing."""
    try:
        if not SQS_QUEUE_URL:
            print("SQS_QUEUE_URL not configured, skipping message publish")
            return
        
        message = {
            "documentId": doc_id,
            "kbId": kb_id,
            "s3Bucket": S3_BUCKET,
            "s3Key": s3_key,
            "action": "index"
        }
        
        sqs_client.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps(message)
        )
        
        print(f"Published processing message for document {doc_id}")
    
    except Exception as e:
        print(f"Error publishing SQS message: {str(e)}")
        # Don't fail the request if SQS publish fails
        # Document is in pending state and can be reprocessed


def verify_kb_access(user_id: str, kb_id: str) -> bool:
    """Verify user can access KB using RPC function."""
    try:
        result = common.rpc('can_access_kb', {'p_user_id': user_id, 'p_kb_id': kb_id})
        return result if isinstance(result, bool) else False
    except Exception as e:
        print(f"Error verifying KB access: {str(e)}")
        return False


def verify_upload_permission(user_id: str, kb_id: str) -> bool:
    """Verify user can upload to KB using RPC function."""
    try:
        result = common.rpc('can_upload_to_kb', {'p_user_id': user_id, 'p_kb_id': kb_id})
        return result if isinstance(result, bool) else False
    except Exception as e:
        print(f"Error verifying upload permission: {str(e)}")
        return False


def check_chat_access(user_id: str, chat_id: str) -> bool:
    """Check if user has access to chat (owner, workspace member, or shared)."""
    try:
        # Get chat session
        chat = common.find_one(
            table='chat_sessions',
            filters={'id': chat_id, 'is_deleted': False}
        )
        
        if not chat:
            return False
        
        # Check if user is the owner
        if chat.get('created_by') == user_id:
            return True
        
        # Check if chat is shared with workspace and user is workspace member
        if chat.get('is_shared_with_workspace') and chat.get('workspace_id'):
            membership = common.find_one(
                table='ws_members',
                filters={'ws_id': chat['workspace_id'], 'user_id': user_id}
            )
            if membership:
                return True
        
        # Check if user has explicit share access
        share = common.find_one(
            table='chat_shares',
            filters={'session_id': chat_id, 'shared_with_user_id': user_id}
        )
        
        return share is not None
    
    except Exception as e:
        print(f"Error checking chat access: {str(e)}")
        return False


def check_org_admin_kb_access(user_id: str, kb_id: str) -> bool:
    """Check if user is org admin for KB's org."""
    try:
        # Get KB to find org_id
        kb = common.find_one(
            table='kb_bases',
            filters={'id': kb_id, 'is_deleted': False}
        )
        
        if not kb or not kb.get('org_id'):
            return False
        
        # Check org membership
        membership = common.find_one(
            table='org_members',
            filters={
                'org_id': kb['org_id'],
                'user_id': user_id,
                'org_role': ['org_owner', 'org_admin']
            }
        )
        
        return membership is not None
    except Exception as e:
        print(f"Error checking org admin access: {str(e)}")
        return False


def check_sys_admin_access(user_id: str) -> bool:
    """Check if user is platform admin."""
    try:
        return common.is_sys_admin(user_id)
    except Exception as e:
        print(f"Error checking platform admin access: {str(e)}")
        return False
