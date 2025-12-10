"""
Links Validator - ICT Baseline 14
Validates link accessibility (purpose, text content)
"""

from typing import List, Dict, Any
import re

# Try relative imports first, fall back to absolute
try:
    from ..rules.baseline_rules import get_rules_by_baseline
except ImportError:
    from rules.baseline_rules import get_rules_by_baseline


class LinksValidator:
    """Validates link accessibility per ICT Baseline 14."""
    
    def __init__(self):
        self.rules = {rule['rule_name']: rule for rule in get_rules_by_baseline('14.A')}
        
        # Common vague link text patterns
        self.vague_patterns = [
            r'^click\s+here$',
            r'^read\s+more$',
            r'^learn\s+more$',
            r'^more$',
            r'^here$',
            r'^link$',
            r'^continue$',
            r'^next$',
            r'^previous$',
            r'^back$',
        ]
    
    def validate(self, elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Validate all link elements.
        
        Args:
            elements: List of parsed JSX elements
            
        Returns:
            List of validation errors/warnings
        """
        issues = []
        
        for element in elements:
            if element['type'] in ['a', 'Link']:
                issues.extend(self._validate_link(element))
        
        return issues
    
    def _validate_link(self, element: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Validate a single link element."""
        issues = []
        
        # Get accessible name from various sources
        accessible_name = self._get_accessible_name(element)
        
        # Rule 14.A: Link has no text content
        if not accessible_name:
            rule = self.rules['link_empty_text']
            issues.append(self._create_issue(element, rule))
        
        # Rule 14.B: Link text may be too vague
        elif self._is_vague_text(accessible_name):
            rule = self.rules['link_vague_text']
            issues.append(self._create_issue(element, rule))
        
        return issues
    
    def _get_accessible_name(self, element: Dict[str, Any]) -> str:
        """Get the accessible name of a link from various sources."""
        # Check aria-label
        if 'aria-label' in element['attributes']:
            return element['attributes']['aria-label']
        
        # Check aria-labelledby (we can't resolve this without context)
        if 'aria-labelledby' in element['attributes']:
            return '<aria-labelledby>'  # Indicates it has a label reference
        
        # Check title attribute
        if 'title' in element['attributes']:
            return element['attributes']['title']
        
        # Check text content
        content = element.get('content', '').strip()
        if content:
            return content
        
        return ''
    
    def _is_vague_text(self, text: str) -> bool:
        """Check if link text matches common vague patterns."""
        text_lower = text.lower().strip()
        
        for pattern in self.vague_patterns:
            if re.match(pattern, text_lower, re.IGNORECASE):
                return True
        
        return False
    
    def _create_issue(self, element: Dict[str, Any], rule: Dict[str, Any]) -> Dict[str, Any]:
        """Create a validation issue from element and rule."""
        return {
            'baseline_test_id': rule['id'],
            'baseline_test': rule['baseline_test'],
            'baseline_name': rule['baseline_name'],
            'wcag_sc': rule['wcag_sc'],
            'wcag_level': rule['wcag_level'],
            'severity': rule['severity'],
            'rule_name': rule['rule_name'],
            'message': rule['message'],
            'suggestion': rule['suggestion'],
            'element_type': element['type'],
            'line': element['line'],
            'column': element['column'],
            'code_snippet': element['code_snippet'],
            'attributes': element['attributes']
        }
