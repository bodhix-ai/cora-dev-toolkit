"""
Eval Processor Lambda - Async Evaluation Processing

Triggered by SQS messages from eval-results Lambda.
Processes one evaluation at a time with progress tracking.

Message Format (from SQS):
{
    "eval_id": "uuid",
    "org_id": "uuid",
    "ws_id": "uuid",
    "doc_ids": ["uuid1", "uuid2"],
    "criteria_set_id": "uuid",
    "action": "evaluate"
}

Processing Pipeline:
1. Document summaries (0-10% progress)
2. Criteria evaluation with RAG (10-90% progress)
3. Evaluation summary (90-100% progress)
"""

import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

# Add the layer to path
import sys
sys.path.insert(0, '/opt/python')

import org_common as common
import requests

# Configure logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logger = logging.getLogger()
logger.setLevel(LOG_LEVEL)

# AI Provider configuration
AI_PROVIDER_ENDPOINT = os.getenv("AI_PROVIDER_ENDPOINT", "")
MODULE_KB_ENDPOINT = os.getenv("MODULE_KB_ENDPOINT", "")

# Progress milestones
PROGRESS_DOC_SUMMARY_START = 0
PROGRESS_DOC_SUMMARY_END = 10
PROGRESS_CRITERIA_START = 10
PROGRESS_CRITERIA_END = 90
PROGRESS_EVAL_SUMMARY_START = 90
PROGRESS_EVAL_SUMMARY_END = 100

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 2


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main Lambda handler for SQS-triggered evaluation processing."""
    
    logger.info(f"Eval Processor event: {json.dumps(event, default=str)}")
    
    # Process SQS records
    results = []
    
    for record in event.get('Records', []):
        try:
            # Parse SQS message
            body = json.loads(record.get('body', '{}'))
            
            eval_id = body.get('eval_id')
            org_id = body.get('org_id')
            ws_id = body.get('ws_id')
            doc_ids = body.get('doc_ids', [])
            criteria_set_id = body.get('criteria_set_id')
            action = body.get('action', 'evaluate')
            
            if not all([eval_id, org_id, ws_id, criteria_set_id]):
                logger.error(f"Missing required fields in message: {body}")
                results.append({
                    'messageId': record.get('messageId'),
                    'status': 'failed',
                    'error': 'Missing required fields'
                })
                continue
            
            # Validate UUIDs
            eval_id = common.validate_uuid(eval_id, 'eval_id')
            org_id = common.validate_uuid(org_id, 'org_id')
            ws_id = common.validate_uuid(ws_id, 'ws_id')
            criteria_set_id = common.validate_uuid(criteria_set_id, 'criteria_set_id')
            
            if action == 'evaluate':
                result = process_evaluation(
                    eval_id=eval_id,
                    org_id=org_id,
                    ws_id=ws_id,
                    doc_ids=doc_ids,
                    criteria_set_id=criteria_set_id
                )
                results.append({
                    'messageId': record.get('messageId'),
                    'eval_id': eval_id,
                    'status': 'success' if result else 'failed'
                })
            else:
                logger.warning(f"Unknown action: {action}")
                results.append({
                    'messageId': record.get('messageId'),
                    'status': 'skipped',
                    'reason': f'Unknown action: {action}'
                })
                
        except common.ValidationError as e:
            logger.error(f"Validation error: {e}")
            results.append({
                'messageId': record.get('messageId'),
                'status': 'failed',
                'error': str(e)
            })
        except Exception as e:
            logger.exception(f"Error processing record: {e}")
            results.append({
                'messageId': record.get('messageId'),
                'status': 'failed',
                'error': str(e)
            })
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'processed': len(results),
            'results': results
        })
    }


# =============================================================================
# MAIN PROCESSING PIPELINE
# =============================================================================

def process_evaluation(
    eval_id: str,
    org_id: str,
    ws_id: str,
    doc_ids: List[str],
    criteria_set_id: str
) -> bool:
    """
    Process a complete evaluation.
    
    Pipeline:
    1. Update status to 'processing'
    2. Generate document summaries
    3. Evaluate each criteria item
    4. Generate evaluation summary
    5. Update status to 'completed'
    """
    try:
        # Get evaluation record
        evaluation = common.find_one('eval_doc_summaries', {'id': eval_id})
        if not evaluation:
            logger.error(f"Evaluation not found: {eval_id}")
            return False
        
        # Update status to processing
        update_evaluation_status(eval_id, 'processing', 0)
        
        # Get config for this org
        config = get_resolved_config(org_id)
        
        # Get prompt configurations
        prompts = get_resolved_prompts(org_id)
        
        # Get status options
        status_options = get_resolved_status_options(org_id, config.get('categorical_mode', 'detailed'))
        
        # Get criteria set and items
        criteria_set = common.find_one('eval_criteria_sets', {'id': criteria_set_id})
        if not criteria_set:
            raise ProcessingError(f"Criteria set not found: {criteria_set_id}")
        
        criteria_items = common.find_many(
            'eval_criteria_items',
            {'criteria_set_id': criteria_set_id, 'is_active': True},
            order='order_index.asc'
        )
        
        if not criteria_items:
            raise ProcessingError("No active criteria items found")
        
        # =================================================================
        # PHASE 1: Document Summaries (0-10%)
        # =================================================================
        logger.info(f"Phase 1: Generating document summaries for eval {eval_id}")
        
        doc_summaries = []
        combined_doc_content = ""
        
        for idx, doc_id in enumerate(doc_ids):
            # Calculate progress within phase 1
            phase_progress = (idx / len(doc_ids)) * (PROGRESS_DOC_SUMMARY_END - PROGRESS_DOC_SUMMARY_START)
            update_evaluation_status(eval_id, 'processing', int(PROGRESS_DOC_SUMMARY_START + phase_progress))
            
            # Get document content from module-kb
            doc_content = get_document_content(ws_id, doc_id)
            if doc_content:
                combined_doc_content += f"\n\n--- Document {idx + 1} ---\n{doc_content}"
                
                # Generate individual doc summary
                doc_summary_prompt = prompts.get('doc_summary', {})
                summary = generate_ai_response(
                    prompt_config=doc_summary_prompt,
                    context=doc_content[:50000],  # Limit context size
                    variables={'document_content': doc_content[:50000]}
                )
                
                doc_summaries.append({
                    'doc_id': doc_id,
                    'summary': summary,
                    'order_index': idx,
                    'is_primary': idx == 0
                })
                
                # Save individual doc summary
                save_doc_set_summary(eval_id, doc_id, summary, idx, idx == 0)
        
        # Generate combined document summary if multiple docs
        combined_summary = None
        if len(doc_summaries) > 1:
            all_summaries = "\n\n".join([f"Document {i+1}: {ds['summary']}" for i, ds in enumerate(doc_summaries)])
            combined_summary = generate_ai_response(
                prompt_config=prompts.get('doc_summary', {}),
                context=all_summaries,
                variables={
                    'document_content': all_summaries,
                    'num_documents': len(doc_summaries)
                }
            )
        else:
            combined_summary = doc_summaries[0]['summary'] if doc_summaries else None
        
        # Save combined doc summary
        common.update_one(
            'eval_doc_summaries',
            {'id': eval_id},
            {'doc_summary': combined_summary}
        )
        
        update_evaluation_status(eval_id, 'processing', PROGRESS_DOC_SUMMARY_END)
        
        # =================================================================
        # PHASE 2: Criteria Evaluation (10-90%)
        # =================================================================
        logger.info(f"Phase 2: Evaluating {len(criteria_items)} criteria items for eval {eval_id}")
        
        criteria_results = []
        total_score = 0
        max_score = 0
        
        for idx, criteria_item in enumerate(criteria_items):
            # Calculate progress within phase 2
            phase_progress = (idx / len(criteria_items)) * (PROGRESS_CRITERIA_END - PROGRESS_CRITERIA_START)
            update_evaluation_status(eval_id, 'processing', int(PROGRESS_CRITERIA_START + phase_progress))
            
            # Evaluate single criteria item
            result = evaluate_criteria_item(
                eval_id=eval_id,
                criteria_item=criteria_item,
                ws_id=ws_id,
                doc_ids=doc_ids,
                prompts=prompts,
                status_options=status_options,
                combined_doc_content=combined_doc_content
            )
            
            criteria_results.append(result)
            
            # Calculate score contribution
            if result.get('ai_status_id'):
                status = next(
                    (s for s in status_options if s['id'] == result['ai_status_id']),
                    None
                )
                if status and status.get('score_value') is not None:
                    weight = float(criteria_item.get('weight', 1.0))
                    total_score += status['score_value'] * weight
                    max_score += 100 * weight  # Assuming max score is 100
        
        update_evaluation_status(eval_id, 'processing', PROGRESS_CRITERIA_END)
        
        # =================================================================
        # PHASE 3: Evaluation Summary (90-100%)
        # =================================================================
        logger.info(f"Phase 3: Generating evaluation summary for eval {eval_id}")
        
        update_evaluation_status(eval_id, 'processing', PROGRESS_EVAL_SUMMARY_START)
        
        # Calculate compliance score
        compliance_score = (total_score / max_score * 100) if max_score > 0 else 0
        
        # Build summary context
        results_summary = build_results_summary(criteria_items, criteria_results, status_options)
        
        # Generate evaluation summary
        eval_summary_prompt = prompts.get('eval_summary', {})
        eval_summary = generate_ai_response(
            prompt_config=eval_summary_prompt,
            context=results_summary,
            variables={
                'doc_summary': combined_summary,
                'criteria_results': results_summary,
                'compliance_score': f"{compliance_score:.1f}%",
                'total_criteria': len(criteria_items),
                'doc_type': criteria_set.get('name', 'Document')
            }
        )
        
        # =================================================================
        # FINAL: Update Evaluation Status
        # =================================================================
        common.update_one(
            'eval_doc_summaries',
            {'id': eval_id},
            {
                'status': 'completed',
                'progress': 100,
                'eval_summary': eval_summary,
                'compliance_score': round(compliance_score, 2),
                'completed_at': datetime.now(timezone.utc).isoformat()
            }
        )
        
        logger.info(f"Evaluation {eval_id} completed successfully. Score: {compliance_score:.1f}%")
        return True
        
    except ProcessingError as e:
        logger.error(f"Processing error for eval {eval_id}: {e}")
        mark_evaluation_failed(eval_id, str(e))
        return False
    except Exception as e:
        logger.exception(f"Unexpected error for eval {eval_id}: {e}")
        mark_evaluation_failed(eval_id, f"Internal error: {str(e)}")
        return False


# =============================================================================
# CONFIGURATION RESOLUTION
# =============================================================================

def get_resolved_config(org_id: str) -> Dict[str, Any]:
    """Get evaluation config with org overrides merged with sys defaults."""
    # Get sys config
    sys_config = common.find_one('eval_cfg_sys', {})
    
    # Get org config
    org_config = common.find_one('eval_cfg_org', {'org_id': org_id})
    
    # Merge (org overrides sys where not null)
    return {
        'categorical_mode': (
            org_config.get('categorical_mode') if org_config and org_config.get('categorical_mode')
            else sys_config.get('categorical_mode', 'detailed') if sys_config else 'detailed'
        ),
        'show_numerical_score': (
            org_config.get('show_numerical_score') if org_config and org_config.get('show_numerical_score') is not None
            else sys_config.get('show_numerical_score', True) if sys_config else True
        ),
        'ai_config_delegated': org_config.get('ai_config_delegated', False) if org_config else False
    }


def get_resolved_prompts(org_id: str) -> Dict[str, Dict[str, Any]]:
    """Get prompt configurations with org overrides."""
    # Get sys prompts
    sys_prompts = common.find_many('eval_cfg_sys_prompts', {})
    
    # Get org prompts (if delegated)
    org_config = common.find_one('eval_cfg_org', {'org_id': org_id})
    org_prompts = []
    if org_config and org_config.get('ai_config_delegated'):
        org_prompts = common.find_many('eval_cfg_org_prompts', {'org_id': org_id})
    
    org_prompt_map = {p['prompt_type']: p for p in org_prompts}
    
    # Merge prompts
    result = {}
    for sys_prompt in sys_prompts:
        prompt_type = sys_prompt['prompt_type']
        org_prompt = org_prompt_map.get(prompt_type)
        
        result[prompt_type] = {
            'ai_provider_id': (org_prompt.get('ai_provider_id') if org_prompt else None) or sys_prompt.get('ai_provider_id'),
            'ai_model_id': (org_prompt.get('ai_model_id') if org_prompt else None) or sys_prompt.get('ai_model_id'),
            'system_prompt': (org_prompt.get('system_prompt') if org_prompt else None) or sys_prompt.get('system_prompt'),
            'user_prompt_template': (org_prompt.get('user_prompt_template') if org_prompt else None) or sys_prompt.get('user_prompt_template'),
            'temperature': float((org_prompt.get('temperature') if org_prompt else None) or sys_prompt.get('temperature', 0.3)),
            'max_tokens': int((org_prompt.get('max_tokens') if org_prompt else None) or sys_prompt.get('max_tokens', 2000))
        }
    
    # Provide defaults if no prompts configured
    if 'doc_summary' not in result:
        result['doc_summary'] = get_default_prompt_config('doc_summary')
    if 'evaluation' not in result:
        result['evaluation'] = get_default_prompt_config('evaluation')
    if 'eval_summary' not in result:
        result['eval_summary'] = get_default_prompt_config('eval_summary')
    
    return result


def get_default_prompt_config(prompt_type: str) -> Dict[str, Any]:
    """Get default prompt configuration for a prompt type."""
    defaults = {
        'doc_summary': {
            'system_prompt': 'You are an expert document analyst. Provide clear, comprehensive summaries.',
            'user_prompt_template': 'Summarize the following document:\n\n{document_content}',
            'temperature': 0.3,
            'max_tokens': 2000
        },
        'evaluation': {
            'system_prompt': 'You are a compliance evaluation expert. Evaluate documents against specific criteria and provide detailed assessments.',
            'user_prompt_template': '''Evaluate the following document against the given criteria.

CRITERIA:
ID: {criteria_id}
Requirement: {requirement}
Description: {description}

DOCUMENT CONTEXT:
{context}

AVAILABLE STATUS OPTIONS:
{status_options}

Respond with a JSON object containing:
- "status": The status option name that best matches
- "confidence": Your confidence level (0-100)
- "explanation": Detailed explanation of your assessment
- "citations": Array of relevant quotes from the document''',
            'temperature': 0.2,
            'max_tokens': 1500
        },
        'eval_summary': {
            'system_prompt': 'You are an expert at summarizing compliance evaluation results.',
            'user_prompt_template': '''Based on the evaluation results below, provide an executive summary.

DOCUMENT SUMMARY:
{doc_summary}

COMPLIANCE SCORE: {compliance_score}

CRITERIA RESULTS:
{criteria_results}

Provide a concise summary highlighting:
1. Overall compliance status
2. Key findings
3. Areas of concern
4. Recommendations''',
            'temperature': 0.3,
            'max_tokens': 1500
        }
    }
    return defaults.get(prompt_type, {})


def get_resolved_status_options(org_id: str, mode: str) -> List[Dict[str, Any]]:
    """Get active status options for evaluation."""
    # Check for org-level status options first
    org_options = common.find_many(
        'eval_org_status_options',
        {'org_id': org_id, 'mode': mode, 'is_active': True},
        order='order_index.asc'
    )
    
    if org_options:
        return org_options
    
    # Also check 'both' mode
    org_options_both = common.find_many(
        'eval_org_status_options',
        {'org_id': org_id, 'mode': 'both', 'is_active': True},
        order='order_index.asc'
    )
    
    if org_options or org_options_both:
        return org_options + org_options_both
    
    # Fall back to system status options
    sys_options = common.find_many(
        'eval_sys_status_options',
        {'mode': mode},
        order='order_index.asc'
    )
    
    sys_options_both = common.find_many(
        'eval_sys_status_options',
        {'mode': 'both'},
        order='order_index.asc'
    )
    
    return sys_options + sys_options_both


# =============================================================================
# DOCUMENT PROCESSING
# =============================================================================

def get_document_content(ws_id: str, doc_id: str) -> Optional[str]:
    """
    Get document content from module-kb.
    
    This calls the module-kb API to retrieve document text.
    """
    try:
        # First try to get from kb_docs table directly
        # Note: ws_id parameter is for context but not used in query since doc_id is already scoped
        doc = common.find_one('kb_docs', {'id': doc_id})
        
        if doc:
            # If we have extracted text, return it
            if doc.get('extracted_text'):
                return doc['extracted_text']
            
            # Otherwise try to get content from chunks
            chunks = common.find_many(
                'kb_chunks',
                {'document_id': doc_id},
                order='chunk_index.asc',
                limit=500  # Limit chunks to avoid memory issues
            )
            
            if chunks:
                return '\n\n'.join([c.get('content', '') for c in chunks if c.get('content')])
        
        logger.warning(f"Document not found or no content: {doc_id}")
        return None
        
    except Exception as e:
        logger.error(f"Error getting document content: {e}")
        return None


def save_doc_set_summary(
    eval_id: str,
    doc_id: str,
    summary: str,
    order_index: int,
    is_primary: bool
) -> None:
    """Save document set entry with summary."""
    try:
        # Check if entry exists
        existing = common.find_one(
            'eval_doc_sets',
            {'eval_summary_id': eval_id, 'kb_doc_id': doc_id}
        )
        
        if existing:
            common.update_one(
                'eval_doc_sets',
                {'id': existing['id']},
                {'doc_summary': summary}
            )
        else:
            common.insert_one(
                'eval_doc_sets',
                {
                    'eval_summary_id': eval_id,
                    'kb_doc_id': doc_id,
                    'doc_summary': summary,
                    'order_index': order_index,
                    'is_primary': is_primary
                }
            )
    except Exception as e:
        logger.error(f"Error saving doc set summary: {e}")


# =============================================================================
# CRITERIA EVALUATION
# =============================================================================

def evaluate_criteria_item(
    eval_id: str,
    criteria_item: Dict[str, Any],
    ws_id: str,
    doc_ids: List[str],
    prompts: Dict[str, Dict[str, Any]],
    status_options: List[Dict[str, Any]],
    combined_doc_content: str
) -> Dict[str, Any]:
    """
    Evaluate a single criteria item against documents.
    
    Uses RAG to find relevant context, then AI to evaluate.
    """
    criteria_item_id = criteria_item['id']
    criteria_id = criteria_item.get('criteria_id', 'N/A')
    requirement = criteria_item.get('requirement', '')
    description = criteria_item.get('description', '')
    
    try:
        # Build RAG query
        rag_query = f"{requirement} {description}"
        
        # Get relevant context via RAG search
        context = get_rag_context(ws_id, doc_ids, rag_query)
        
        if not context:
            # Fall back to using combined doc content
            context = combined_doc_content[:30000]  # Limit size
        
        # Format status options for prompt
        status_options_text = format_status_options(status_options)
        
        # Get evaluation prompt config
        eval_prompt = prompts.get('evaluation', get_default_prompt_config('evaluation'))
        
        # Generate evaluation
        response = generate_ai_response(
            prompt_config=eval_prompt,
            context=context,
            variables={
                'criteria_id': criteria_id,
                'requirement': requirement,
                'description': description or 'N/A',
                'context': context,
                'status_options': status_options_text
            }
        )
        
        # Parse AI response
        parsed = parse_evaluation_response(response, status_options)
        
        # Get score_value from selected status option
        ai_score_value = None
        status_id = parsed.get('status_id')
        if status_id:
            status_option = next((s for s in status_options if s['id'] == status_id), None)
            if status_option and status_option.get('score_value') is not None:
                ai_score_value = float(status_option['score_value'])
        
        # Save result
        result = save_criteria_result(
            eval_id=eval_id,
            criteria_item_id=criteria_item_id,
            ai_result=parsed.get('explanation', response),
            ai_status_id=status_id,
            ai_score_value=ai_score_value,
            ai_confidence=parsed.get('confidence'),
            ai_citations=parsed.get('citations', [])
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error evaluating criteria {criteria_id}: {e}")
        
        # Save error result
        return save_criteria_result(
            eval_id=eval_id,
            criteria_item_id=criteria_item_id,
            ai_result=f"Error during evaluation: {str(e)}",
            ai_status_id=None,
            ai_score_value=None,
            ai_confidence=0,
            ai_citations=[]
        )


def get_rag_context(
    ws_id: str,
    doc_ids: List[str],
    query: str,
    limit: int = 10
) -> Optional[str]:
    """
    Get relevant context from documents using RAG search.
    
    Calls module-kb's vector search to find relevant chunks.
    """
    try:
        # Search each document for relevant chunks
        all_chunks = []
        
        for doc_id in doc_ids:
            # Get chunks that are semantically similar to query
            # For now, use simple text search; in production, use vector search
            chunks = common.find_many(
                'kb_chunks',
                {'document_id': doc_id},
                order='chunk_index.asc',
                limit=50
            )
            
            # Simple keyword matching for relevance (replace with vector search in production)
            query_words = set(query.lower().split())
            for chunk in chunks:
                content = chunk.get('content', '')
                chunk_words = set(content.lower().split())
                overlap = len(query_words.intersection(chunk_words))
                
                if overlap > 0:
                    all_chunks.append({
                        'content': content,
                        'relevance': overlap,
                        'doc_id': doc_id,
                        'chunk_index': chunk.get('chunk_index', 0)
                    })
        
        # Sort by relevance and take top chunks
        all_chunks.sort(key=lambda x: x['relevance'], reverse=True)
        top_chunks = all_chunks[:limit]
        
        if top_chunks:
            context_parts = []
            for chunk in top_chunks:
                context_parts.append(f"[Chunk from Document {chunk['doc_id'][:8]}...]\n{chunk['content']}")
            return '\n\n---\n\n'.join(context_parts)
        
        return None
        
    except Exception as e:
        logger.error(f"Error getting RAG context: {e}")
        return None


def format_status_options(status_options: List[Dict[str, Any]]) -> str:
    """Format status options for inclusion in prompt."""
    if not status_options:
        return "- Compliant (score: 100)\n- Non-Compliant (score: 0)\n- Partially Compliant (score: 50)"
    
    lines = []
    for opt in status_options:
        score = opt.get('score_value', 'N/A')
        lines.append(f"- {opt['name']} (score: {score})")
    
    formatted = '\n'.join(lines)
    
    # DEBUG: Log formatted status options
    logger.info(f"[DEBUG] Formatted status options for AI:\n{formatted}")
    logger.info(f"[DEBUG] Status option IDs: {[{'name': opt['name'], 'id': opt['id'][:8]} for opt in status_options]}")
    
    return formatted


def parse_evaluation_response(
    response: str,
    status_options: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Parse AI evaluation response into structured data."""
    # DEBUG: Log raw AI response
    logger.info(f"[DEBUG] ===== PARSING AI RESPONSE =====")
    logger.info(f"[DEBUG] Raw AI response (first 1000 chars):\n{response[:1000]}")
    logger.info(f"[DEBUG] Available status options: {[opt['name'] for opt in status_options]}")
    
    result = {
        'status_id': None,
        'confidence': None,
        'explanation': response,
        'citations': []
    }
    
    # Try to parse as JSON
    try:
        # Find JSON in response
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            json_str = response[json_start:json_end]
            logger.info(f"[DEBUG] Extracted JSON string:\n{json_str}")
            
            parsed = json.loads(json_str)
            logger.info(f"[DEBUG] Parsed JSON: {parsed}")
            
            # Extract status
            status_name = parsed.get('status', '')
            logger.info(f"[DEBUG] AI returned status name: '{status_name}'")
            
            status_name_lower = status_name.lower()
            
            # First pass: Try exact match
            for opt in status_options:
                if opt['name'].lower() == status_name_lower:
                    result['status_id'] = opt['id']
                    logger.info(f"[DEBUG] ✅ Exact matched status '{status_name}' to option '{opt['name']}' (ID: {opt['id'][:8]})")
                    break
            
            # Second pass: Try fuzzy match only if exact match not found
            if not result['status_id']:
                for opt in status_options:
                    if status_name_lower in opt['name'].lower():
                        result['status_id'] = opt['id']
                        logger.info(f"[DEBUG] ✅ Fuzzy matched status '{status_name}' to option '{opt['name']}' (ID: {opt['id'][:8]})")
                        break
            
            if not result['status_id']:
                logger.warning(f"[DEBUG] ❌ Could not match status '{status_name}' to any option")
            
            # Extract confidence
            if 'confidence' in parsed:
                conf = int(parsed['confidence'])
                result['confidence'] = max(0, min(100, conf))
                logger.info(f"[DEBUG] Confidence: {result['confidence']}%")
            
            # Extract explanation
            if 'explanation' in parsed:
                result['explanation'] = parsed['explanation']
                logger.info(f"[DEBUG] Explanation length: {len(result['explanation'])} chars")
            
            # Extract citations
            if 'citations' in parsed and isinstance(parsed['citations'], list):
                result['citations'] = parsed['citations'][:10]  # Limit to 10 citations
                logger.info(f"[DEBUG] Citations: {len(result['citations'])} found")
                
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"[DEBUG] Could not parse response as JSON: {e}")
        
        # Try to extract status from text
        response_lower = response.lower()
        logger.info(f"[DEBUG] Trying text-based status extraction...")
        
        for opt in status_options:
            if opt['name'].lower() in response_lower:
                result['status_id'] = opt['id']
                logger.info(f"[DEBUG] ✅ Found status '{opt['name']}' in text (ID: {opt['id'][:8]})")
                break
        
        if not result['status_id']:
            logger.warning(f"[DEBUG] ❌ Could not find any status option in text")
    
    logger.info(f"[DEBUG] Final parsed result: status_id={result['status_id'][:8] if result['status_id'] else None}, confidence={result['confidence']}")
    logger.info(f"[DEBUG] ===== END PARSING =====")
    
    return result


def save_criteria_result(
    eval_id: str,
    criteria_item_id: str,
    ai_result: str,
    ai_status_id: Optional[str],
    ai_score_value: Optional[float],
    ai_confidence: Optional[int],
    ai_citations: List[Any]
) -> Dict[str, Any]:
    """Save criteria evaluation result to database."""
    try:
        # Check for existing result
        existing = common.find_one(
            'eval_criteria_results',
            {'eval_summary_id': eval_id, 'criteria_item_id': criteria_item_id}
        )
        
        data = {
            'ai_result': ai_result,
            'ai_status_id': ai_status_id,
            'ai_score_value': ai_score_value,
            'ai_confidence': ai_confidence,
            'ai_citations': json.dumps(ai_citations) if ai_citations else '[]',
            'processed_at': datetime.now(timezone.utc).isoformat()
        }
        
        if existing:
            result = common.update_one('eval_criteria_results', {'id': existing['id']}, data)
        else:
            data['eval_summary_id'] = eval_id
            data['criteria_item_id'] = criteria_item_id
            result = common.insert_one('eval_criteria_results', data)
        
        return result
        
    except Exception as e:
        logger.error(f"Error saving criteria result: {e}")
        return {
            'eval_summary_id': eval_id,
            'criteria_item_id': criteria_item_id,
            'ai_result': ai_result,
            'ai_status_id': ai_status_id,
            'ai_score_value': ai_score_value,
            'ai_confidence': ai_confidence,
            'ai_citations': ai_citations
        }


# =============================================================================
# AI INTEGRATION
# =============================================================================

def generate_ai_response(
    prompt_config: Dict[str, Any],
    context: str,
    variables: Dict[str, Any]
) -> str:
    """
    Generate AI response using configured provider and model.
    
    This is a placeholder that will integrate with module-ai.
    In production, this calls the AI provider API.
    """
    system_prompt = prompt_config.get('system_prompt', '')
    user_prompt_template = prompt_config.get('user_prompt_template', '')
    temperature = prompt_config.get('temperature', 0.3)
    max_tokens = prompt_config.get('max_tokens', 2000)
    
    # Fill in template variables
    user_prompt = user_prompt_template
    for key, value in variables.items():
        user_prompt = user_prompt.replace(f'{{{key}}}', str(value))
    
    # DEBUG: Log the complete prompt being sent to AI
    logger.info(f"[DEBUG] ===== AI PROMPT =====")
    logger.info(f"[DEBUG] System Prompt:\n{system_prompt}")
    logger.info(f"[DEBUG] User Prompt (first 2000 chars):\n{user_prompt[:2000]}")
    if len(user_prompt) > 2000:
        logger.info(f"[DEBUG] ... (truncated, total length: {len(user_prompt)} chars)")
    logger.info(f"[DEBUG] Temperature: {temperature}, Max Tokens: {max_tokens}")
    logger.info(f"[DEBUG] =====================")
    
    # Check if we have AI provider configured
    ai_provider_id = prompt_config.get('ai_provider_id')
    ai_model_id = prompt_config.get('ai_model_id')
    
    if ai_provider_id and ai_model_id:
        # Try to call AI provider
        try:
            response = call_ai_provider(
                provider_id=ai_provider_id,
                model_id=ai_model_id,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )
            if response:
                # DEBUG: Log AI response
                logger.info(f"[DEBUG] ===== AI RESPONSE =====")
                logger.info(f"[DEBUG] Response (first 2000 chars):\n{response[:2000]}")
                if len(response) > 2000:
                    logger.info(f"[DEBUG] ... (truncated, total length: {len(response)} chars)")
                logger.info(f"[DEBUG] =====================")
                return response
        except Exception as e:
            logger.error(f"Error calling AI provider: {e}")
    
    # Fallback: Generate placeholder response
    logger.warning("AI provider not configured or failed, using placeholder response")
    return f"[AI Response Placeholder]\n\nThis evaluation requires AI provider configuration.\n\nPrompt: {user_prompt[:500]}..."


def call_ai_provider(
    provider_id: str,
    model_id: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int
) -> Optional[str]:
    """
    Call AI provider API to generate response.
    
    Integrates with module-ai for provider management.
    Automatically handles models requiring inference profiles.
    """
    # Get provider and model from database
    provider = common.find_one('ai_providers', {'id': provider_id})
    if not provider:
        logger.error(f"AI provider not found: {provider_id}")
        return None

    model = common.find_one('ai_models', {'id': model_id})
    if not model:
        logger.error(f"AI model not found: {model_id}")
        return None

    # ===== VALIDATION CATEGORY HANDLING =====
    validation_category = model.get('validation_category')
    
    if validation_category == 'requires_inference_profile':
        base_model_id = model.get('model_id')
        model_vendor = model.get('model_vendor', 'unknown')
        
        # Get appropriate region for this vendor
        region = get_inference_profile_region(model_vendor)
        
        # Build inference profile model ID by adding region prefix
        inference_profile_id = f"{region}.{base_model_id}"
        
        logger.info(f"Model {base_model_id} requires inference profile, using: {inference_profile_id}")
        
        # Update the model object to use the inference profile ID
        # This will be passed to Bedrock API which expects the prefixed format
        model['model_id'] = inference_profile_id
    
    # Future validation categories can be added here:
    # elif validation_category == 'requires_marketplace_subscription':
    #     # Handle marketplace subscription requirement
    #     pass
    
    # ===== END VALIDATION CATEGORY HANDLING =====

    # Get model_vendor for API format selection
    model_vendor = model.get('model_vendor', 'anthropic')
    
    # Route to appropriate provider
    provider_type = provider.get('provider_type', '').lower()
    
    try:
        if provider_type == 'openai':
            response = call_openai(
                api_key=provider.get('api_key'),
                model_name=model.get('model_name'),
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )
        elif provider_type == 'anthropic':
            response = call_anthropic(
                api_key=provider.get('api_key'),
                model_name=model.get('model_name'),
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )
        elif provider_type in ['bedrock', 'aws_bedrock']:
            response = call_bedrock(
                model_id=model.get('model_id'),  # Now possibly substituted
                model_vendor=model_vendor,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )
        else:
            logger.error(f"Unsupported provider type: {provider_type}")
            return None
        
        return response
        
    except Exception as e:
        # Log the error for ops team
        try:
            common.log_ai_error(
                provider_id=provider_id,
                model_id=model_id,
                request_source='eval-processor',
                operation_type='text_generation',
                error=e,
                model_id_attempted=model.get('model_id'),
                validation_category=validation_category,
                request_params={
                    'temperature': temperature,
                    'max_tokens': max_tokens
                }
            )
        except Exception as log_err:
            logger.error(f"Failed to log error: {log_err}")
        
        logger.error(f"AI API error: {e}")
        return None


def call_openai(
    api_key: str,
    model_name: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int
) -> Optional[str]:
    """Call OpenAI API."""
    try:
        import openai
        
        client = openai.OpenAI(api_key=api_key)
        
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        return None


def call_anthropic(
    api_key: str,
    model_name: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int
) -> Optional[str]:
    """Call Anthropic API."""
    try:
        import anthropic
        
        client = anthropic.Anthropic(api_key=api_key)
        
        response = client.messages.create(
            model=model_name,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ],
            temperature=temperature
        )
        
        return response.content[0].text
        
    except Exception as e:
        logger.error(f"Anthropic API error: {e}")
        return None


def call_bedrock(
    model_id: str,
    model_vendor: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int
) -> Optional[str]:
    """
    Call AWS Bedrock API with vendor-specific formatting.
    
    Uses model_vendor column to determine API format:
    - anthropic: Claude Messages API format
    - amazon: Nova/Titan format (detected by model_id)
    - meta, mistral, cohere, etc.: Vendor-specific formats as needed
    """
    try:
        import boto3
        
        client = boto3.client('bedrock-runtime')
        
        # Determine API format based on model vendor
        if model_vendor == 'anthropic':
            # Anthropic Claude format (Messages API)
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": temperature
            })
            response_parser = 'anthropic'
            
        elif model_vendor == 'amazon':
            # Amazon models - distinguish between Nova and Titan by model_id
            if 'nova' in model_id.lower():
                # Amazon Nova format
                body = json.dumps({
                    "messages": [{
                        "role": "user",
                        "content": [{"text": user_prompt}]
                    }],
                    "system": [{"text": system_prompt}],
                    "inferenceConfig": {
                        "max_new_tokens": max_tokens,
                        "temperature": temperature
                    }
                })
                response_parser = 'nova'
            elif 'titan' in model_id.lower():
                # Amazon Titan format
                combined_prompt = f"{system_prompt}\n\n{user_prompt}"
                body = json.dumps({
                    "inputText": combined_prompt,
                    "textGenerationConfig": {
                        "maxTokenCount": max_tokens,
                        "temperature": temperature
                    }
                })
                response_parser = 'titan'
            else:
                raise ValueError(f"Unknown Amazon model type: {model_id}")
                
        elif model_vendor in ['meta', 'mistral', 'cohere']:
            # Meta Llama, Mistral, Cohere use similar format to Claude
            # (This is a simplified assumption - adjust as needed per vendor)
            body = json.dumps({
                "prompt": f"{system_prompt}\n\n{user_prompt}",
                "max_gen_len": max_tokens,
                "temperature": temperature
            })
            response_parser = 'meta'  # Generic parser
            
        else:
            # Unknown vendor - try generic format
            logger.warning(f"Unknown vendor '{model_vendor}' for model {model_id}, using generic format")
            body = json.dumps({
                "prompt": f"{system_prompt}\n\n{user_prompt}",
                "max_tokens": max_tokens,
                "temperature": temperature
            })
            response_parser = 'generic'
        
        # Invoke the model
        response = client.invoke_model(
            modelId=model_id,
            body=body,
            contentType='application/json',
            accept='application/json'
        )
        
        result = json.loads(response['body'].read())
        
        # Parse response based on vendor
        if response_parser == 'anthropic':
            return result.get('content', [{}])[0].get('text', '')
        elif response_parser == 'nova':
            return result.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', '')
        elif response_parser == 'titan':
            return result.get('results', [{}])[0].get('outputText', '')
        elif response_parser == 'meta':
            # Meta/Mistral/Cohere typically return generation in 'generation' field
            return result.get('generation', result.get('text', ''))
        elif response_parser == 'generic':
            # Try common response fields
            return result.get('text', result.get('completion', result.get('output', '')))
        
        return None
        
    except Exception as e:
        logger.error(f"Bedrock API error for vendor '{model_vendor}', model '{model_id}': {e}")
        return None


# =============================================================================
# SUMMARY GENERATION
# =============================================================================

def build_results_summary(
    criteria_items: List[Dict[str, Any]],
    criteria_results: List[Dict[str, Any]],
    status_options: List[Dict[str, Any]]
) -> str:
    """Build a text summary of all criteria results."""
    status_map = {s['id']: s for s in status_options}
    item_map = {i['id']: i for i in criteria_items}
    
    lines = []
    
    for result in criteria_results:
        item_id = result.get('criteria_item_id')
        item = item_map.get(item_id, {})
        
        criteria_id = item.get('criteria_id', 'N/A')
        requirement = item.get('requirement', 'Unknown')
        
        status_id = result.get('ai_status_id')
        status = status_map.get(status_id, {})
        status_name = status.get('name', 'Unknown')
        
        confidence = result.get('ai_confidence', 'N/A')
        explanation = result.get('ai_result', 'No explanation')[:300]
        
        lines.append(f"""
Criteria: {criteria_id}
Requirement: {requirement}
Status: {status_name}
Confidence: {confidence}%
Assessment: {explanation}
---""")
    
    return '\n'.join(lines)


# =============================================================================
# STATUS MANAGEMENT
# =============================================================================

def update_evaluation_status(eval_id: str, status: str, progress: int) -> None:
    """Update evaluation status and progress."""
    try:
        update_data = {
            'status': status,
            'progress': progress
        }
        
        if status == 'processing' and progress == 0:
            update_data['started_at'] = datetime.now(timezone.utc).isoformat()
        
        common.update_one('eval_doc_summaries', {'id': eval_id}, update_data)
        
    except Exception as e:
        logger.error(f"Error updating evaluation status: {e}")


def mark_evaluation_failed(eval_id: str, error_message: str) -> None:
    """Mark evaluation as failed with error message."""
    try:
        common.update_one(
            'eval_doc_summaries',
            {'id': eval_id},
            {
                'status': 'failed',
                'error_message': error_message[:2000],  # Limit error message length
                'completed_at': datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error marking evaluation as failed: {e}")


# =============================================================================
# EXCEPTIONS
# =============================================================================

def get_inference_profile_region(model_vendor: str, org_id: Optional[str] = None) -> str:
    """
    Get the appropriate region prefix for inference profiles based on vendor.
    
    Args:
        model_vendor: The model vendor (anthropic, amazon, meta, mistral, etc.)
        org_id: Optional organization ID for org-specific preferences (future)
    
    Returns:
        Region prefix (us, eu, ap, ca, global)
    """
    # TODO: Check org-level preferences from database if org_id provided
    # For now, use vendor-based defaults
    
    vendor_region_defaults = {
        'anthropic': 'us',      # Anthropic models typically in US
        'amazon': 'us',         # Amazon Nova/Titan in US
        'meta': 'us',           # Meta Llama in US
        'mistral': 'eu',        # Mistral AI based in Europe
        'cohere': 'us',         # Cohere in US
        'stability': 'us',      # Stability AI in US
        'ai21': 'us',           # AI21 Labs in US
        'google': 'us',         # Google models in US
        'nvidia': 'us',         # NVIDIA in US
        'deepseek': 'us',       # DeepSeek in US
        'twelvelabs': 'us',     # TwelveLabs in US
        'openai': 'us',         # OpenAI in US
        'qwen': 'us',           # Qwen in US
        'minimax': 'us',        # MiniMax in US
    }
    
    region = vendor_region_defaults.get(model_vendor, 'us')  # Default to US
    logger.debug(f"Selected region '{region}' for vendor '{model_vendor}'")
    return region


# =============================================================================
# EXCEPTIONS
# =============================================================================

class ProcessingError(Exception):
    """Custom exception for evaluation processing errors."""
    pass
