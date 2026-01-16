"""
KB Document Lambda - Document Upload/Download Operations

Routes - Workspace Scoped:
- GET /workspaces/{workspaceId}/kb/documents - List documents
- POST /workspaces/{workspaceId}/kb/documents - Get presigned upload URL
- GET /workspaces/{workspaceId}/kb/documents/{docId} - Get document metadata
- DELETE /workspaces/{workspaceId}/kb/documents/{docId} - Delete document
- GET /workspaces/{workspaceId}/kb/documents/{docId}/download - Get presigned download URL

Routes - Chat Scoped:
- GET /chats/{chatId}/kb/documents - List documents
- POST /chats/{chatId}/kb/documents - Get presigned upload URL
- GET /chats/{chatId}/kb/documents/{docId} - Get document metadata
- DELETE /chats/{chatId}/kb/documents/{docId} - Delete document

Routes - Org Admin:
- POST /admin/org/kbs/{kbId}/documents - Upload to org KB
- GET /admin/org/kbs/{kbId}/documents - List org KB documents
- DELETE /admin/org/kbs/{kbId}/documents/{docId} - Delete from org KB

Routes - Platform Admin:
- POST /admin/sys/kbs/{kbId}/documents - Upload to system KB
- GET /admin/sys/kbs/{kbId}/documents - List system KB documents
- DELETE /admin/sys/kbs/{kbId}/documents/{docId} - Delete from system KB
"""

import json
import os
import traceback
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

import boto3
import org_common as common

# Environment variables
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
S3_BUCKET = os.environ.get('KB_S3_BUCKET')
SQS_QUEUE_URL = os.environ.get('KB_PROCESSOR_QUEUE_URL')
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
    try:
        path = event.get('path', '')
        method = event.get('httpMethod', '')
        path_params = event.get('pathParameters', {})
        
        # Extract Okta UID from authorizer context
        okta_uid = common.get_okta_uid(event)
        if not okta_uid:
            return common.error_response(401, "Unauthorized: Missing user context")
        
        # Resolve to Supabase user_id
        user_id = common.resolve_user_id(okta_uid)
        if not user_id:
            return common.error_response(404, "User not found")
        
        # Route to appropriate handler
        if '/workspaces/' in path and '/kb/documents' in path:
            return handle_workspace_documents(method, path, path_params, event, user_id)
        elif '/chats/' in path and '/kb/documents' in path:
            return handle_chat_documents(method, path, path_params, event, user_id)
        elif '/admin/org/kbs/' in path and '/documents' in path:
            return handle_org_admin_documents(method, path, path_params, event, user_id)
        elif '/admin/sys/kbs/' in path and '/documents' in path:
            return handle_sys_admin_documents(method, path, path_params, event, user_id)
        else:
            return common.error_response(404, "Endpoint not found")
    
    except Exception as e:
        print(f"Unhandled error: {str(e)}")
        print(traceback.format_exc())
        return common.error_response(500, "Internal server error")


def handle_workspace_documents(method: str, path: str, path_params: Dict, event: Dict, user_id: str):
    """Handle workspace-scoped document operations."""
    workspace_id = path_params.get('workspaceId')
    doc_id = path_params.get('docId')
    
    if not workspace_id:
        return common.error_response(400, "Missing workspaceId")
    
    # Verify workspace access
    if not check_workspace_access(user_id, workspace_id):
        return common.error_response(403, "Access denied to workspace")
    
    if method == 'GET' and doc_id and '/download' in path:
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
        return common.error_response(405, "Method not allowed")


def handle_chat_documents(method: str, path: str, path_params: Dict, event: Dict, user_id: str):
    """Handle chat-scoped document operations."""
    chat_id = path_params.get('chatId')
    doc_id = path_params.get('docId')
    
    if not chat_id:
        return common.error_response(400, "Missing chatId")
    
    # Verify chat access
    if not check_chat_access(user_id, chat_id):
        return common.error_response(403, "Access denied to chat")
    
    if method == 'GET' and doc_id:
        return handle_get_document(user_id, doc_id, 'chat')
    elif method == 'GET':
        return handle_list_documents(user_id, None, chat_id, 'chat')
    elif method == 'POST':
        return handle_get_upload_url(user_id, None, chat_id, event, 'chat')
    elif method == 'DELETE' and doc_id:
        return handle_delete_document(user_id, doc_id, 'chat')
    else:
        return common.error_response(405, "Method not allowed")


def handle_org_admin_documents(method: str, path: str, path_params: Dict, event: Dict, user_id: str):
    """Handle org admin document operations."""
    kb_id = path_params.get('kbId')
    doc_id = path_params.get('docId')
    
    if not kb_id:
        return common.error_response(400, "Missing kbId")
    
    # Verify org admin access to KB
    if not check_org_admin_kb_access(user_id, kb_id):
        return common.error_response(403, "Access denied to org KB")
    
    if method == 'GET':
        return handle_list_documents_by_kb(user_id, kb_id)
    elif method == 'POST':
        return handle_admin_upload_url(user_id, kb_id, event)
    elif method == 'DELETE' and doc_id:
        return handle_delete_document(user_id, doc_id, 'org')
    else:
        return common.error_response(405, "Method not allowed")


def handle_sys_admin_documents(method: str, path: str, path_params: Dict, event: Dict, user_id: str):
    """Handle platform admin document operations."""
    kb_id = path_params.get('kbId')
    doc_id = path_params.get('docId')
    
    if not kb_id:
        return common.error_response(400, "Missing kbId")
    
    # Verify platform admin access
    if not check_platform_admin_access(user_id):
        return common.error_response(403, "Access denied: platform admin required")
    
    if method == 'GET':
        return handle_list_documents_by_kb(user_id, kb_id)
    elif method == 'POST':
        return handle_admin_upload_url(user_id, kb_id, event)
    elif method == 'DELETE' and doc_id:
        return handle_delete_document(user_id, doc_id, 'sys')
    else:
        return common.error_response(405, "Method not allowed")


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
            return common.error_response(403, "Access denied to KB")
        
        # Query documents
        with common.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, kb_id, filename, s3_key, s3_bucket, file_size, 
                           mime_type, status, error_message, chunk_count, 
                           metadata, created_at, created_by
                    FROM kb_docs
                    WHERE kb_id = %s AND is_deleted = false
                    ORDER BY created_at DESC
                """, (kb_id,))
                
                docs = cur.fetchall()
                
                return common.success_response({
                    "documents": [format_document_record(doc) for doc in docs]
                })
    
    except Exception as e:
        print(f"Error listing documents: {str(e)}")
        return common.error_response(500, "Failed to list documents")


def handle_list_documents_by_kb(user_id: str, kb_id: str):
    """List documents for a specific KB (admin endpoint)."""
    try:
        with common.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, kb_id, filename, s3_key, s3_bucket, file_size, 
                           mime_type, status, error_message, chunk_count, 
                           metadata, created_at, created_by
                    FROM kb_docs
                    WHERE kb_id = %s AND is_deleted = false
                    ORDER BY created_at DESC
                """, (kb_id,))
                
                docs = cur.fetchall()
                
                return common.success_response({
                    "documents": [format_document_record(doc) for doc in docs]
                })
    
    except Exception as e:
        print(f"Error listing KB documents: {str(e)}")
        return common.error_response(500, "Failed to list documents")


def handle_get_document(user_id: str, doc_id: str, scope: str):
    """Get document metadata."""
    try:
        with common.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT d.id, d.kb_id, d.filename, d.s3_key, d.s3_bucket, 
                           d.file_size, d.mime_type, d.status, d.error_message, 
                           d.chunk_count, d.metadata, d.created_at, d.created_by
                    FROM kb_docs d
                    WHERE d.id = %s AND d.is_deleted = false
                """, (doc_id,))
                
                doc = cur.fetchone()
                
                if not doc:
                    return common.error_response(404, "Document not found")
                
                # Verify user can access this document's KB
                if not verify_kb_access(user_id, doc[1]):  # doc[1] is kb_id
                    return common.error_response(403, "Access denied")
                
                return common.success_response({
                    "document": format_document_record(doc)
                })
    
    except Exception as e:
        print(f"Error getting document: {str(e)}")
        return common.error_response(500, "Failed to get document")


def handle_get_upload_url(user_id: str, workspace_id: Optional[str], chat_id: Optional[str], 
                          event: Dict, scope: str):
    """Generate presigned URL for document upload."""
    try:
        body = common.parse_body(event)
        
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
            return common.error_response(500, "Failed to get or create KB")
        
        # Verify upload permission
        if not verify_upload_permission(user_id, kb_id):
            return common.error_response(403, "Upload permission denied")
        
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
        
        # Create document record in pending state
        with common.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO kb_docs 
                    (id, kb_id, filename, s3_key, s3_bucket, file_size, mime_type, 
                     status, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending', %s)
                    RETURNING id
                """, (doc_id, kb_id, filename, s3_key, S3_BUCKET, file_size, mime_type, user_id))
                
                conn.commit()
        
        return common.success_response({
            "uploadUrl": presigned_url,
            "documentId": doc_id,
            "expiresIn": PRESIGNED_URL_EXPIRATION,
            "s3Key": s3_key,
            "message": "Upload document to the presigned URL, then call complete endpoint"
        })
    
    except Exception as e:
        print(f"Error generating upload URL: {str(e)}")
        print(traceback.format_exc())
        return common.error_response(500, "Failed to generate upload URL")


def handle_admin_upload_url(user_id: str, kb_id: str, event: Dict):
    """Generate presigned URL for admin document upload."""
    try:
        body = common.parse_body(event)
        
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
            return common.error_response(404, "KB not found")
        
        # Verify upload permission
        if not verify_upload_permission(user_id, kb_id):
            return common.error_response(403, "Upload permission denied")
        
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
        
        # Create document record
        with common.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO kb_docs 
                    (id, kb_id, filename, s3_key, s3_bucket, file_size, mime_type, 
                     status, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending', %s)
                    RETURNING id
                """, (doc_id, kb_id, filename, s3_key, S3_BUCKET, file_size, mime_type, user_id))
                
                conn.commit()
        
        # Publish SQS message for processing
        publish_processing_message(doc_id, kb_id, s3_key)
        
        return common.success_response({
            "uploadUrl": presigned_url,
            "documentId": doc_id,
            "expiresIn": PRESIGNED_URL_EXPIRATION,
            "s3Key": s3_key,
            "message": "Upload document to presigned URL - processing will begin automatically"
        })
    
    except Exception as e:
        print(f"Error generating admin upload URL: {str(e)}")
        return common.error_response(500, "Failed to generate upload URL")


def handle_get_download_url(user_id: str, workspace_id: str, doc_id: str, scope: str):
    """Generate presigned URL for document download."""
    try:
        with common.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT kb_id, s3_key, s3_bucket, filename
                    FROM kb_docs
                    WHERE id = %s AND is_deleted = false
                """, (doc_id,))
                
                doc = cur.fetchone()
                
                if not doc:
                    return common.error_response(404, "Document not found")
                
                kb_id, s3_key, s3_bucket, filename = doc
                
                # Verify access
                if not verify_kb_access(user_id, kb_id):
                    return common.error_response(403, "Access denied")
                
                # Generate presigned URL
                download_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': s3_bucket,
                        'Key': s3_key,
                        'ResponseContentDisposition': f'attachment; filename="{filename}"'
                    },
                    ExpiresIn=PRESIGNED_URL_EXPIRATION
                )
                
                return common.success_response({
                    "downloadUrl": download_url,
                    "filename": filename,
                    "expiresIn": PRESIGNED_URL_EXPIRATION
                })
    
    except Exception as e:
        print(f"Error generating download URL: {str(e)}")
        return common.error_response(500, "Failed to generate download URL")


def handle_delete_document(user_id: str, doc_id: str, scope: str):
    """Soft delete document."""
    try:
        with common.get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get document info
                cur.execute("""
                    SELECT kb_id FROM kb_docs
                    WHERE id = %s AND is_deleted = false
                """, (doc_id,))
                
                doc = cur.fetchone()
                
                if not doc:
                    return common.error_response(404, "Document not found")
                
                kb_id = doc[0]
                
                # Verify delete permission
                if not verify_upload_permission(user_id, kb_id):
                    return common.error_response(403, "Delete permission denied")
                
                # Soft delete document
                cur.execute("""
                    UPDATE kb_docs
                    SET is_deleted = true,
                        deleted_at = NOW(),
                        deleted_by = %s,
                        updated_at = NOW()
                    WHERE id = %s
                """, (user_id, doc_id))
                
                # Soft delete associated chunks
                cur.execute("""
                    DELETE FROM kb_chunks
                    WHERE document_id = %s
                """, (doc_id,))
                
                conn.commit()
                
                return common.success_response({
                    "message": "Document deleted successfully",
                    "documentId": doc_id
                })
    
    except Exception as e:
        print(f"Error deleting document: {str(e)}")
        return common.error_response(500, "Failed to delete document")


# ============================================================================
# Helper Functions
# ============================================================================

def format_document_record(record: tuple) -> Dict[str, Any]:
    """Transform DB record to camelCase API response."""
    return {
        "id": str(record[0]),
        "kbId": str(record[1]),
        "filename": record[2],
        "s3Key": record[3],
        "s3Bucket": record[4],
        "fileSize": record[5],
        "mimeType": record[6],
        "status": record[7],
        "errorMessage": record[8],
        "chunkCount": record[9] or 0,
        "metadata": record[10] or {},
        "createdAt": record[11].isoformat() if record[11] else None,
        "createdBy": str(record[12]) if record[12] else None
    }


def validate_upload_request(body: Dict) -> Optional[Dict]:
    """Validate upload request body."""
    if not body:
        return common.error_response(400, "Request body required")
    
    filename = body.get('filename')
    file_size = body.get('fileSize')
    mime_type = body.get('mimeType')
    
    if not filename:
        return common.error_response(400, "filename is required")
    
    if not file_size:
        return common.error_response(400, "fileSize is required")
    
    if not mime_type:
        return common.error_response(400, "mimeType is required")
    
    if file_size > MAX_FILE_SIZE:
        return common.error_response(400, f"File size exceeds maximum of {MAX_FILE_SIZE} bytes (50 MB)")
    
    if mime_type not in ALLOWED_MIME_TYPES:
        return common.error_response(400, f"MIME type not allowed. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}")
    
    return None


def get_kb_id_for_scope(workspace_id: Optional[str], chat_id: Optional[str], scope: str) -> Optional[str]:
    """Get KB ID for workspace or chat scope."""
    try:
        with common.get_db_connection() as conn:
            with conn.cursor() as cur:
                if scope == 'workspace':
                    cur.execute("""
                        SELECT id FROM kb_bases
                        WHERE workspace_id = %s AND scope = 'workspace' AND is_deleted = false
                    """, (workspace_id,))
                elif scope == 'chat':
                    cur.execute("""
                        SELECT id FROM kb_bases
                        WHERE chat_session_id = %s AND scope = 'chat' AND is_deleted = false
                    """, (chat_id,))
                else:
                    return None
                
                result = cur.fetchone()
                return str(result[0]) if result else None
    
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
        with common.get_db_connection() as conn:
            with conn.cursor() as cur:
                if scope == 'workspace':
                    # Get workspace and org details
                    cur.execute("""
                        SELECT w.name, w.org_id
                        FROM workspaces w
                        WHERE w.id = %s
                    """, (workspace_id,))
                    ws = cur.fetchone()
                    if not ws:
                        return None
                    
                    name = f"{ws[0]} Knowledge Base"
                    org_id = ws[1]
                    
                    cur.execute("""
                        INSERT INTO kb_bases 
                        (name, description, scope, org_id, workspace_id, created_by)
                        VALUES (%s, %s, 'workspace', %s, %s, %s)
                        RETURNING id
                    """, (name, "Auto-created workspace knowledge base", org_id, workspace_id, user_id))
                
                elif scope == 'chat':
                    # Get chat and org details
                    cur.execute("""
                        SELECT cs.title, w.org_id
                        FROM chat_sessions cs
                        JOIN workspaces w ON w.id = cs.workspace_id
                        WHERE cs.id = %s
                    """, (chat_id,))
                    chat = cur.fetchone()
                    if not chat:
                        return None
                    
                    name = f"{chat[0]} Knowledge Base"
                    org_id = chat[1]
                    
                    cur.execute("""
                        INSERT INTO kb_bases 
                        (name, description, scope, org_id, chat_session_id, created_by)
                        VALUES (%s, %s, 'chat', %s, %s, %s)
                        RETURNING id
                    """, (name, "Auto-created chat knowledge base", org_id, chat_id, user_id))
                
                else:
                    return None
                
                result = cur.fetchone()
                conn.commit()
                
                return str(result[0]) if result else None
    
    except Exception as e:
        print(f"Error creating KB: {str(e)}")
        return None


def get_kb_by_id(kb_id: str) -> Optional[Dict]:
    """Get KB by ID."""
    try:
        with common.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, name, scope, org_id, workspace_id, chat_session_id
                    FROM kb_bases
                    WHERE id = %s AND is_deleted = false
                """, (kb_id,))
                
                result = cur.fetchone()
                if not result:
                    return None
                
                return {
                    "id": str(result[0]),
                    "name": result[1],
                    "scope": result[2],
                    "org_id": str(result[3]) if result[3] else None,
                    "workspace_id": str(result[4]) if result[4] else None,
                    "chat_session_id": str(result[5]) if result[5] else None
                }
    
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
    
    org_id = kb.get('org_id')
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
        with common.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT can_access_kb(%s, %s)", (user_id, kb_id))
                result = cur.fetchone()
                return result[0] if result else False
    except Exception as e:
        print(f"Error verifying KB access: {str(e)}")
        return False


def verify_upload_permission(user_id: str, kb_id: str) -> bool:
    """Verify user can upload to KB using RPC function."""
    try:
        with common.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT can_upload_to_kb(%s, %s)", (user_id, kb_id))
                result = cur.fetchone()
                return result[0] if result else False
    except Exception as e:
        print(f"Error verifying upload permission: {str(e)}")
        return False


def check_workspace_access(user_id: str, workspace_id: str) -> bool:
    """Check if user is workspace member."""
    return common.validate_workspace_member(user_id, workspace_id)


def check_chat_access(user_id: str, chat_id: str) -> bool:
    """Check if user is chat participant."""
    try:
        with common.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 1 FROM chat_participants
                    WHERE chat_session_id = %s AND user_id = %s
                """, (chat_id, user_id))
                return cur.fetchone() is not None
    except Exception as e:
        print(f"Error checking chat access: {str(e)}")
        return False


def check_org_admin_kb_access(user_id: str, kb_id: str) -> bool:
    """Check if user is org admin for KB's org."""
    try:
        with common.get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 1 FROM kb_bases kb
                    JOIN org_members om ON om.org_id = kb.org_id
                    WHERE kb.id = %s 
                    AND om.user_id = %s
                    AND om.org_role IN ('org_owner', 'org_admin')
                    AND kb.is_deleted = false
                """, (kb_id, user_id))
                return cur.fetchone() is not None
    except Exception as e:
        print(f"Error checking org admin access: {str(e)}")
        return False


def check_platform_admin_access(user_id: str) -> bool:
    """Check if user is platform admin."""
    return common.validate_platform_admin(user_id)
