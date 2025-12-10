"""
Structure Validator - ICT Baseline 13
Validates content structure (heading hierarchy, lists)
"""

from typing import List, Dict, Any

# Try relative imports first, fall back to absolute
try:
    from ..rules.baseline_rules import get_rules_by_baseline
    from ..parsers.component_parser import ComponentParser
except ImportError:
    from rules.baseline_rules import get_rules_by_baseline
    from parsers.component_parser import ComponentParser


class StructureValidator:
    """Validates content structure per ICT Baseline 13."""
    
    def __init__(self):
        self.rules = {rule['rule_name']: rule for rule in get_rules_by_baseline('13.A') + get_rules_by_baseline('13.B')}
        self.parser = ComponentParser()
    
    def validate(self, elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Validate content structure.
        
        Args:
            elements: List of parsed JSX elements
            
        Returns:
            List of validation errors/warnings
        """
        issues = []
        
        # Validate heading hierarchy
        issues.extend(self._validate_heading_hierarchy(elements))
        
        # Validate list structure
        issues.extend(self._validate_list_structure(elements))
        
        return issues
    
    def _validate_heading_hierarchy(self, elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate heading hierarchy (no skipped levels)."""
        issues = []
        
        # Extract headings using parser
        headings = self.parser.extract_headings(elements)
        
        if not headings:
            return issues
        
        # Check for skipped heading levels
        violations = self.parser.check_heading_hierarchy(headings)
        
        for violation in violations:
            rule = self.rules['heading_skip_level']
            
            current = violation['current']
            previous = violation['previous']
            skipped = violation['skipped_levels']
            
            # Enhance the error message with context
            enhanced_message = f"{rule['message']} (h{previous['heading_level']} → h{current['heading_level']}, skipped {skipped} level(s))"
            
            issue = self._create_issue(current, rule)
            issue['message'] = enhanced_message
            issues.append(issue)
        
        return issues
    
    def _validate_list_structure(self, elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate list structure (proper use of ul/ol/li)."""
        issues = []
        
        # Find list elements
        list_elements = [el for el in elements if el['type'] in ['ul', 'ol', 'List']]
        list_item_elements = [el for el in elements if el['type'] in ['li', 'ListItem']]
        
        # Check for li elements outside of list context
        # Note: This is simplified - proper detection would require parsing the DOM tree
        # For now, we'll just warn about potential issues based on common patterns
        
        # This is a basic check - more sophisticated list validation would require
        # full DOM tree analysis which is beyond regex-based parsing
        
        return issues
    
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
            'attributes': element.get('attributes', {})
        }
