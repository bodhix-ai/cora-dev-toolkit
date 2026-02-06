"""
RAG Pipeline for Eval Optimization

Extracts domain knowledge from context documents using existing module-kb.
NO new vector infrastructure - uses kb_docs and kb_chunks tables.
"""

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import org_common as common

logger = logging.getLogger(__name__)


@dataclass
class DomainKnowledge:
    """Structured domain knowledge extracted from context documents."""
    concepts: List[str] = field(default_factory=list)
    standards: List[str] = field(default_factory=list)
    terminology: Dict[str, str] = field(default_factory=dict)
    requirements: List[str] = field(default_factory=list)
    raw_summary: str = ""
    
    def to_text(self) -> str:
        """Convert domain knowledge to text for prompt injection."""
        parts = []
        
        if self.concepts:
            parts.append("KEY CONCEPTS:")
            for concept in self.concepts[:20]:
                parts.append(f"  • {concept}")
        
        if self.standards:
            parts.append("\nRELEVANT STANDARDS:")
            for standard in self.standards[:15]:
                parts.append(f"  • {standard}")
        
        if self.terminology:
            parts.append("\nDOMAIN TERMINOLOGY:")
            for term, definition in list(self.terminology.items())[:15]:
                parts.append(f"  • {term}: {definition}")
        
        if self.requirements:
            parts.append("\nKEY REQUIREMENTS:")
            for req in self.requirements[:20]:
                parts.append(f"  • {req}")
        
        if self.raw_summary:
            parts.append(f"\nSUMMARY:\n{self.raw_summary}")
        
        return "\n".join(parts)
    
    def has_standards(self) -> bool:
        """Check if standards were extracted."""
        return len(self.standards) > 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'concepts': self.concepts,
            'standards': self.standards,
            'terminology': self.terminology,
            'requirements': self.requirements,
            'raw_summary': self.raw_summary
        }


class RAGPipeline:
    """
    RAG Pipeline for extracting domain knowledge.
    Uses existing module-kb infrastructure (NO new vector DB).
    """
    
    def __init__(self):
        self.max_content_length = 50000  # Max chars per document
        self.max_chunks_per_doc = 100
    
    def extract_domain_knowledge(
        self,
        ws_id: str,
        context_doc_ids: List[str],
        model_id: Optional[str] = None
    ) -> DomainKnowledge:
        """
        Extract domain knowledge from context documents.
        
        Uses module-kb's existing document storage and chunking.
        Optionally uses LLM to summarize and extract key concepts.
        """
        if not context_doc_ids:
            logger.warning("No context documents provided")
            return DomainKnowledge()
        
        # Gather document content
        all_content = []
        
        for doc_id in context_doc_ids:
            content = self._get_document_content(doc_id)
            if content:
                all_content.append(content)
        
        if not all_content:
            logger.warning("No content extracted from context documents")
            return DomainKnowledge()
        
        # Combine content
        combined_content = "\n\n---\n\n".join(all_content)
        
        # If we have an LLM model, use it to extract structured knowledge
        if model_id:
            return self._extract_with_llm(combined_content, model_id)
        
        # Otherwise, use simple heuristic extraction
        return self._extract_heuristic(combined_content)
    
    def get_relevant_context(
        self,
        ws_id: str,
        query: str,
        doc_ids: List[str],
        limit: int = 10
    ) -> str:
        """
        Get relevant context for a query using RAG search.
        Uses simple keyword matching (can be upgraded to vector search).
        """
        if not doc_ids:
            return ""
        
        all_chunks = []
        
        for doc_id in doc_ids:
            chunks = self._get_document_chunks(doc_id)
            
            # Score chunks by relevance (simple keyword overlap)
            query_words = set(query.lower().split())
            
            for chunk in chunks:
                content = chunk.get('content', '')
                chunk_words = set(content.lower().split())
                overlap = len(query_words.intersection(chunk_words))
                
                if overlap > 0:
                    all_chunks.append({
                        'content': content,
                        'relevance': overlap,
                        'doc_id': doc_id
                    })
        
        # Sort by relevance and take top chunks
        all_chunks.sort(key=lambda x: x['relevance'], reverse=True)
        top_chunks = all_chunks[:limit]
        
        if top_chunks:
            return '\n\n---\n\n'.join([c['content'] for c in top_chunks])
        
        return ""
    
    def _get_document_content(self, doc_id: str) -> Optional[str]:
        """Get document content from KB."""
        try:
            doc = common.find_one('kb_docs', {'id': doc_id})
            
            if doc:
                # Try extracted text first
                if doc.get('extracted_text'):
                    return doc['extracted_text'][:self.max_content_length]
                
                # Fall back to chunks
                chunks = self._get_document_chunks(doc_id)
                if chunks:
                    content = '\n\n'.join([c.get('content', '') for c in chunks if c.get('content')])
                    return content[:self.max_content_length]
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting document content for {doc_id}: {e}")
            return None
    
    def _get_document_chunks(self, doc_id: str) -> List[Dict[str, Any]]:
        """Get document chunks from KB."""
        try:
            chunks = common.find_many(
                'kb_chunks',
                {'document_id': doc_id},
                order='chunk_index.asc',
                limit=self.max_chunks_per_doc
            )
            return chunks
        except Exception as e:
            logger.error(f"Error getting chunks for {doc_id}: {e}")
            return []
    
    def _extract_with_llm(self, content: str, model_id: str) -> DomainKnowledge:
        """Use LLM to extract structured domain knowledge."""
        from meta_prompter import call_ai_for_evaluation
        
        extraction_prompt = """Analyze this document and extract domain knowledge in JSON format:

DOCUMENT:
{content}

Extract:
1. Key concepts (list of strings)
2. Standards/regulations mentioned (list of strings)
3. Domain terminology with definitions (object)
4. Key requirements (list of strings)
5. Brief summary (string)

Respond with JSON:
{{
    "concepts": ["concept1", "concept2", ...],
    "standards": ["standard1", "standard2", ...],
    "terminology": {{"term": "definition", ...}},
    "requirements": ["requirement1", ...],
    "summary": "Brief summary..."
}}"""
        
        try:
            response = call_ai_for_evaluation(
                system_prompt="You are an expert at analyzing documents and extracting structured domain knowledge.",
                user_prompt=extraction_prompt.format(content=content[:30000]),
                model_id=model_id,
                temperature=0.3,
                max_tokens=4000
            )
            
            # Parse JSON response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                parsed = json.loads(response[json_start:json_end])
                
                return DomainKnowledge(
                    concepts=parsed.get('concepts', []),
                    standards=parsed.get('standards', []),
                    terminology=parsed.get('terminology', {}),
                    requirements=parsed.get('requirements', []),
                    raw_summary=parsed.get('summary', '')
                )
        
        except Exception as e:
            logger.error(f"Error extracting with LLM: {e}")
        
        # Fall back to heuristic extraction
        return self._extract_heuristic(content)
    
    def _extract_heuristic(self, content: str) -> DomainKnowledge:
        """
        Simple heuristic extraction without LLM.
        Useful when LLM is not configured.
        """
        knowledge = DomainKnowledge()
        
        content_lower = content.lower()
        
        # Extract standards (common patterns)
        standards_patterns = [
            'NIST', 'CJIS', 'FedRAMP', 'HIPAA', 'SOC 2', 'ISO 27001',
            'PCI DSS', 'GDPR', 'CCPA', 'FISMA', 'CMMC', 'SOX',
            'Section 508', 'WCAG', 'ADA'
        ]
        
        for pattern in standards_patterns:
            if pattern.lower() in content_lower:
                knowledge.standards.append(pattern)
        
        # Extract sentences that look like requirements
        sentences = content.replace('\n', ' ').split('.')
        requirement_keywords = ['must', 'shall', 'required', 'mandatory', 'should']
        
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 20 and len(sentence) < 500:
                sentence_lower = sentence.lower()
                if any(kw in sentence_lower for kw in requirement_keywords):
                    knowledge.requirements.append(sentence)
                    if len(knowledge.requirements) >= 20:
                        break
        
        # Generate simple summary (first 500 chars)
        knowledge.raw_summary = content[:500].strip() + "..."
        
        return knowledge