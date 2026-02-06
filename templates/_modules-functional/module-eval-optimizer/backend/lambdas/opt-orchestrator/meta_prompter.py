"""
LLM Meta-Prompter for Eval Optimization

Generates domain-aware evaluation prompts using LLM.
Uses configurable AI providers and models from ai_providers/ai_models tables.
"""

import json
import logging
from typing import Any, Dict, List, Optional

import org_common as common

logger = logging.getLogger(__name__)


class MetaPrompter:
    """
    Generate domain-aware evaluation prompts using LLM.
    
    The meta-prompter uses RAG-extracted domain knowledge and a desired
    response structure to generate specialized evaluation prompts that
    reference domain-specific standards and terminology.
    """
    
    def __init__(self, model_id: Optional[str] = None):
        self.model_id = model_id
        self.default_temperature = 0.7
        self.default_max_tokens = 4000
    
    def generate_base_prompt(
        self,
        domain_knowledge,  # DomainKnowledge
        response_structure: Optional[Dict[str, Any]],
        criteria_items: List[Dict[str, Any]]
    ) -> str:
        """
        Generate a domain-aware evaluation prompt.
        
        Uses LLM to create a prompt that:
        1. References domain standards from the extracted knowledge
        2. Produces output matching the response structure
        3. Evaluates each criterion with domain-specific context
        4. Includes guidance for finding evidence/citations
        """
        # Build meta-prompt for generating the evaluation prompt
        meta_prompt = self._build_meta_prompt(
            domain_knowledge=domain_knowledge,
            response_structure=response_structure,
            criteria_items=criteria_items
        )
        
        # If we have a model configured, use LLM to generate
        if self.model_id:
            try:
                response = call_ai_for_evaluation(
                    system_prompt="You are an expert prompt engineer specializing in document evaluation prompts.",
                    user_prompt=meta_prompt,
                    model_id=self.model_id,
                    temperature=self.default_temperature,
                    max_tokens=self.default_max_tokens
                )
                return response
            except Exception as e:
                logger.error(f"Error generating prompt with LLM: {e}")
        
        # Fall back to template-based prompt generation
        return self._generate_template_prompt(
            domain_knowledge=domain_knowledge,
            response_structure=response_structure,
            criteria_items=criteria_items
        )
    
    def _build_meta_prompt(
        self,
        domain_knowledge,
        response_structure: Optional[Dict[str, Any]],
        criteria_items: List[Dict[str, Any]]
    ) -> str:
        """Build the meta-prompt for LLM prompt generation."""
        
        # Format domain knowledge
        domain_text = domain_knowledge.to_text() if domain_knowledge else "No domain knowledge available."
        
        # Format response structure
        if response_structure:
            response_text = json.dumps(response_structure, indent=2)
        else:
            response_text = """
{
    "status": "The compliance status",
    "confidence": 0-100,
    "explanation": "Detailed explanation of assessment",
    "citations": ["Relevant quotes from the document"]
}"""
        
        # Format criteria (just first few for brevity)
        criteria_text = ""
        for item in criteria_items[:5]:
            criteria_text += f"\n- {item.get('criteria_id', 'N/A')}: {item.get('requirement', '')}"
        
        if len(criteria_items) > 5:
            criteria_text += f"\n... and {len(criteria_items) - 5} more criteria"
        
        return f"""Generate a comprehensive evaluation prompt for document compliance assessment.

DOMAIN KNOWLEDGE:
{domain_text}

REQUIRED RESPONSE STRUCTURE:
{response_text}

SAMPLE CRITERIA TO EVALUATE:
{criteria_text}

Create an evaluation prompt that:
1. References specific domain standards and terminology from the knowledge provided
2. Instructs the evaluator to produce output matching the response structure exactly
3. Provides clear guidance for each type of criterion assessment
4. Includes instructions for finding and citing evidence from the document
5. Handles edge cases (missing information, partial compliance, etc.)

The prompt should be detailed enough that an AI evaluator can:
- Understand the domain context
- Apply domain-specific standards correctly
- Produce structured, consistent outputs
- Provide clear justifications with citations

Output ONLY the evaluation prompt text, no additional commentary."""
    
    def _generate_template_prompt(
        self,
        domain_knowledge,
        response_structure: Optional[Dict[str, Any]],
        criteria_items: List[Dict[str, Any]]
    ) -> str:
        """Generate a template-based prompt when LLM is not available."""
        
        domain_text = domain_knowledge.to_text() if domain_knowledge else ""
        
        # Determine response format
        if response_structure:
            response_format = json.dumps(response_structure, indent=2)
        else:
            response_format = '''{
    "status": "<status option name>",
    "confidence": <0-100>,
    "explanation": "<detailed explanation>",
    "citations": ["<quote1>", "<quote2>"]
}'''
        
        return f"""You are an expert document compliance evaluator with deep knowledge of the relevant domain.

{f"DOMAIN CONTEXT:{chr(10)}{domain_text}" if domain_text else ""}

EVALUATION INSTRUCTIONS:

1. CAREFULLY READ the document content provided
2. EVALUATE each criterion against the document
3. FIND SPECIFIC EVIDENCE in the document to support your assessment
4. PROVIDE CITATIONS by quoting relevant text

For each criterion assessment, consider:
- Does the document explicitly address this requirement?
- Is there evidence of compliance, non-compliance, or partial compliance?
- What specific text supports your assessment?
- How confident are you in this assessment?

RESPONSE FORMAT:
You MUST respond with a JSON object in this exact format:
{response_format}

IMPORTANT:
- The "status" field must match one of the provided status options exactly
- The "confidence" field should reflect how certain you are (0-100)
- The "explanation" should be concise but thorough
- Include at least 1-2 relevant citations when possible

Be thorough but objective. If information is missing or unclear, note this in your explanation."""


def call_ai_for_evaluation(
    system_prompt: str,
    user_prompt: str,
    model_id: str,
    temperature: float = 0.3,
    max_tokens: int = 2000
) -> str:
    """
    Call AI provider for evaluation.
    
    Uses the same pattern as module-eval's call_ai_provider function.
    """
    if not model_id:
        logger.warning("No model_id provided for AI call")
        return ""
    
    try:
        # Get model configuration
        model = common.find_one('ai_models', {'id': model_id})
        if not model:
            logger.error(f"AI model not found: {model_id}")
            return ""
        
        provider_id = model.get('provider_id')
        provider = common.find_one('ai_providers', {'id': provider_id})
        if not provider:
            logger.error(f"AI provider not found: {provider_id}")
            return ""
        
        # Get model vendor for API format selection
        model_vendor = model.get('model_vendor', 'anthropic')
        provider_type = provider.get('provider_type', '').lower()
        
        # Handle validation category (inference profiles, etc.)
        validation_category = model.get('validation_category')
        actual_model_id = model.get('model_id')
        
        if validation_category == 'requires_inference_profile':
            region = _get_inference_profile_region(model_vendor)
            actual_model_id = f"{region}.{actual_model_id}"
            logger.info(f"Using inference profile: {actual_model_id}")
        
        # Route to appropriate provider
        if provider_type == 'openai':
            return _call_openai(
                api_key=provider.get('api_key'),
                model_name=model.get('model_name'),
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )
        elif provider_type == 'anthropic':
            return _call_anthropic(
                api_key=provider.get('api_key'),
                model_name=model.get('model_name'),
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )
        elif provider_type in ['bedrock', 'aws_bedrock']:
            return _call_bedrock(
                model_id=actual_model_id,
                model_vendor=model_vendor,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )
        else:
            logger.error(f"Unsupported provider type: {provider_type}")
            return ""
    
    except Exception as e:
        logger.exception(f"Error calling AI provider: {e}")
        return ""


def _get_inference_profile_region(model_vendor: str) -> str:
    """Get region prefix for inference profiles."""
    vendor_regions = {
        'anthropic': 'us',
        'amazon': 'us',
        'meta': 'us',
        'mistral': 'eu',
        'cohere': 'us',
    }
    return vendor_regions.get(model_vendor, 'us')


def _call_openai(
    api_key: str,
    model_name: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int
) -> str:
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
        
        return response.choices[0].message.content or ""
        
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        return ""


def _call_anthropic(
    api_key: str,
    model_name: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int
) -> str:
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
        
        return response.content[0].text if response.content else ""
        
    except Exception as e:
        logger.error(f"Anthropic API error: {e}")
        return ""


def _call_bedrock(
    model_id: str,
    model_vendor: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int
) -> str:
    """Call AWS Bedrock API with vendor-specific formatting."""
    try:
        import boto3
        
        client = boto3.client('bedrock-runtime')
        
        # Build request body based on vendor
        if model_vendor == 'anthropic':
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": temperature
            })
        elif model_vendor == 'amazon' and 'nova' in model_id.lower():
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
        else:
            # Generic format
            body = json.dumps({
                "prompt": f"{system_prompt}\n\n{user_prompt}",
                "max_tokens": max_tokens,
                "temperature": temperature
            })
        
        response = client.invoke_model(
            modelId=model_id,
            body=body,
            contentType='application/json',
            accept='application/json'
        )
        
        result = json.loads(response['body'].read())
        
        # Parse response based on vendor
        if model_vendor == 'anthropic':
            return result.get('content', [{}])[0].get('text', '')
        elif model_vendor == 'amazon' and 'nova' in model_id.lower():
            return result.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', '')
        else:
            return result.get('text', result.get('completion', ''))
        
    except Exception as e:
        logger.error(f"Bedrock API error for {model_vendor}/{model_id}: {e}")
        return ""