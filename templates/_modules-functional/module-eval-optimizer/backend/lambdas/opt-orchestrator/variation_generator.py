"""
Variation Generator for Eval Optimization

Creates multiple prompt variations for A/B testing.
Variations include different strategies: evidence-focused, standard-focused, risk-focused, etc.
"""

import logging
from dataclasses import dataclass
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


@dataclass
class PromptVariation:
    """A single prompt variation for testing."""
    name: str
    strategy: str
    system_prompt: str
    user_prompt_prefix: str
    temperature: float
    max_tokens: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'name': self.name,
            'strategy': self.strategy,
            'system_prompt': self.system_prompt[:500] + '...' if len(self.system_prompt) > 500 else self.system_prompt,
            'user_prompt_prefix': self.user_prompt_prefix,
            'temperature': self.temperature,
            'max_tokens': self.max_tokens
        }


class VariationGenerator:
    """
    Generate prompt variations for optimization testing.
    
    Creates 5-12 variations based on thoroughness setting, each with
    different strategies and parameter configurations.
    """
    
    # Variation strategies with their configurations
    VARIATION_STRATEGIES = {
        'evidence_focused': {
            'description': 'Emphasizes finding and citing evidence',
            'temperature_mod': 0.0,
            'max_tokens_mod': 0,
            'prompt_prefix': 'Focus on finding specific evidence and direct quotes from the document. Prioritize citations over interpretation.'
        },
        'standard_focused': {
            'description': 'Emphasizes compliance with standards',
            'temperature_mod': -0.1,
            'max_tokens_mod': 0,
            'prompt_prefix': 'Strictly evaluate against the defined standards and requirements. Be precise about compliance terminology.'
        },
        'risk_focused': {
            'description': 'Emphasizes identifying risks and gaps',
            'temperature_mod': 0.1,
            'max_tokens_mod': 200,
            'prompt_prefix': 'Pay particular attention to risks, gaps, and compliance issues. Highlight potential problems.'
        },
        'conservative': {
            'description': 'Lower temperature, stricter interpretation',
            'temperature_mod': -0.15,
            'max_tokens_mod': 0,
            'prompt_prefix': 'Apply strict interpretation of requirements. When in doubt, lean toward non-compliant.'
        },
        'balanced': {
            'description': 'Balanced approach',
            'temperature_mod': 0.0,
            'max_tokens_mod': 0,
            'prompt_prefix': ''
        },
        'comprehensive': {
            'description': 'More detailed analysis',
            'temperature_mod': 0.05,
            'max_tokens_mod': 500,
            'prompt_prefix': 'Provide comprehensive analysis with detailed explanations. Consider multiple aspects of each requirement.'
        },
        'lenient': {
            'description': 'More lenient interpretation',
            'temperature_mod': 0.1,
            'max_tokens_mod': 0,
            'prompt_prefix': 'Consider reasonable interpretations and partial compliance. Give credit for good-faith efforts.'
        },
        'technical': {
            'description': 'Technical/detailed focus',
            'temperature_mod': -0.05,
            'max_tokens_mod': 300,
            'prompt_prefix': 'Focus on technical accuracy and specific implementation details. Be precise about technical requirements.'
        },
        'practical': {
            'description': 'Practical/operational focus',
            'temperature_mod': 0.05,
            'max_tokens_mod': 200,
            'prompt_prefix': 'Evaluate from a practical, operational perspective. Consider real-world implementation.'
        },
        'high_confidence': {
            'description': 'Optimized for high-confidence assessments',
            'temperature_mod': -0.1,
            'max_tokens_mod': 100,
            'prompt_prefix': 'Only mark as compliant when clearly supported by evidence. Express uncertainty when evidence is ambiguous.'
        },
        'citation_heavy': {
            'description': 'Emphasizes multiple citations',
            'temperature_mod': 0.0,
            'max_tokens_mod': 400,
            'prompt_prefix': 'Provide multiple citations for each assessment. Quote relevant text verbatim when possible.'
        },
        'summary_focused': {
            'description': 'Concise summary-style responses',
            'temperature_mod': 0.0,
            'max_tokens_mod': -200,
            'prompt_prefix': 'Be concise and direct in assessments. Focus on key findings without excessive detail.'
        }
    }
    
    # Thoroughness levels determine how many variations to generate
    THOROUGHNESS_COUNTS = {
        'fast': 5,
        'balanced': 7,
        'thorough': 12
    }
    
    # Priority order for selecting strategies at each thoroughness level
    STRATEGY_PRIORITY = [
        'balanced',           # Always included
        'evidence_focused',   # High priority
        'standard_focused',   # High priority
        'conservative',       # Medium priority
        'risk_focused',       # Medium priority
        'comprehensive',      # Medium priority
        'lenient',            # Lower priority
        'technical',          # Lower priority
        'practical',          # Lower priority
        'high_confidence',    # Lower priority
        'citation_heavy',     # Lower priority
        'summary_focused'     # Lower priority
    ]
    
    def __init__(self):
        self.base_temperature = 0.3
        self.base_max_tokens = 2000
    
    def generate_variations(
        self,
        base_prompt: str,
        thoroughness: str = 'balanced',
        base_temperature: float = None,
        base_max_tokens: int = None
    ) -> List[PromptVariation]:
        """
        Generate prompt variations based on thoroughness setting.
        
        Args:
            base_prompt: The base system prompt generated by meta-prompter
            thoroughness: 'fast' (5), 'balanced' (7), or 'thorough' (12)
            base_temperature: Override default temperature
            base_max_tokens: Override default max tokens
            
        Returns:
            List of PromptVariation objects
        """
        num_variations = self.THOROUGHNESS_COUNTS.get(thoroughness, 7)
        
        if base_temperature is not None:
            self.base_temperature = base_temperature
        if base_max_tokens is not None:
            self.base_max_tokens = base_max_tokens
        
        variations = []
        strategies_to_use = self.STRATEGY_PRIORITY[:num_variations]
        
        for i, strategy_name in enumerate(strategies_to_use):
            strategy = self.VARIATION_STRATEGIES.get(strategy_name, self.VARIATION_STRATEGIES['balanced'])
            
            # Calculate modified parameters
            temperature = max(0.0, min(1.0, self.base_temperature + strategy.get('temperature_mod', 0)))
            max_tokens = max(500, self.base_max_tokens + strategy.get('max_tokens_mod', 0))
            
            variation = PromptVariation(
                name=f"v{i+1}_{strategy_name}",
                strategy=strategy_name,
                system_prompt=base_prompt,
                user_prompt_prefix=strategy.get('prompt_prefix', ''),
                temperature=round(temperature, 2),
                max_tokens=max_tokens
            )
            
            variations.append(variation)
            logger.debug(f"Generated variation: {variation.name} (temp={variation.temperature}, tokens={variation.max_tokens})")
        
        logger.info(f"Generated {len(variations)} variations for thoroughness '{thoroughness}'")
        return variations
    
    def get_strategy_description(self, strategy_name: str) -> str:
        """Get description for a strategy."""
        strategy = self.VARIATION_STRATEGIES.get(strategy_name)
        return strategy.get('description', 'Unknown strategy') if strategy else 'Unknown strategy'
    
    def list_available_strategies(self) -> List[Dict[str, str]]:
        """List all available variation strategies."""
        return [
            {
                'name': name,
                'description': config.get('description', ''),
                'temperature_mod': config.get('temperature_mod', 0),
                'max_tokens_mod': config.get('max_tokens_mod', 0)
            }
            for name, config in self.VARIATION_STRATEGIES.items()
        ]