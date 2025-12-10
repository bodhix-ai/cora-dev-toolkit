"""
Images Validator - ICT Baseline 6
Validates image accessibility (alt text, meaningful vs decorative)
"""

from typing import List, Dict, Any

# Try relative imports first, fall back to absolute
try:
    from ..rules.baseline_rules import get_rules_by_baseline
except ImportError:
    from rules.baseline_rules import get_rules_by_baseline


class ImagesValidator:
    """Validates image accessibility per ICT Baseline 6."""
    
    def __init__(self):
        self.rules = {rule['rule_name']: rule for rule in get_rules_by_baseline('6.A') + get_rules_by_baseline('6.B')}
    
    def validate(self, elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Validate all image elements in the provided list.
        
        Args:
            elements: List of parsed JSX elements
            
        Returns:
            List of validation errors/warnings
        """
        issues = []
        
        for element in elements:
            # Validate <img> and <Image> elements
            if element['type'] in ['img', 'Image']:
                issues.extend(self._validate_image_element(element))
            
            # Validate IconButton elements
            elif element['type'] == 'IconButton':
                issues.extend(self._validate_icon_button(element))
        
        return issues
    
    def _validate_image_element(self, element: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Validate a single image element."""
        issues = []
        
        alt = element['attributes'].get('alt')
        role = element['attributes'].get('role')
        aria_label = element['attributes'].get('aria-label')
        
        # Rule 6.A: Image missing alt text
        if alt is None or alt == 'undefined':
            rule = self.rules['img_missing_alt']
            issues.append(self._create_issue(element, rule))
        
        # Rule 6.B: Decorative image info
        elif alt == '' or role == 'presentation':
            rule = self.rules['decorative_image_info']
            issues.append(self._create_issue(element, rule))
        
        return issues
    
    def _validate_icon_button(self, element: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Validate IconButton element."""
        issues = []
        
        aria_label = element['attributes'].get('aria-label')
        aria_labelledby = element['attributes'].get('aria-labelledby')
        content = element.get('content', '').strip()
        
        # Rule 6.A: IconButton missing accessible label
        if not aria_label and not aria_labelledby and not content:
            rule = self.rules['iconbutton_missing_label']
            issues.append(self._create_issue(element, rule))
        
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
            'attributes': element['attributes']
        }
