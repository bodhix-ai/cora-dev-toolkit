"""
Forms Validator - ICT Baseline 10
Validates form accessibility (labels, error messages)
"""

from typing import List, Dict, Any

# Try relative imports first, fall back to absolute
try:
    from ..rules.baseline_rules import get_rules_by_baseline
except ImportError:
    from rules.baseline_rules import get_rules_by_baseline


class FormsValidator:
    """Validates form control accessibility per ICT Baseline 10."""
    
    def __init__(self):
        self.rules = {rule['rule_name']: rule for rule in get_rules_by_baseline('10.A') + get_rules_by_baseline('10.C')}
    
    def validate(self, elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Validate all form control elements.
        
        Args:
            elements: List of parsed JSX elements
            
        Returns:
            List of validation errors/warnings
        """
        issues = []
        
        form_control_types = [
            'input', 'Input', 'TextField', 'Select', 
            'Checkbox', 'Radio', 'Switch', 'textarea', 'select'
        ]
        
        for element in elements:
            if element['type'] in form_control_types:
                issues.extend(self._validate_form_control(element))
        
        return issues
    
    def _validate_form_control(self, element: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Validate a single form control element."""
        issues = []
        
        # Check for label
        has_label = self._has_label(element)
        
        # Rule 10.A: Form input missing label
        if not has_label:
            rule = self.rules['input_missing_label']
            issues.append(self._create_issue(element, rule))
        
        # Rule 10.B: Placeholder is not a substitute for label
        has_placeholder = 'placeholder' in element['attributes']
        has_visible_label = self._has_visible_label(element)
        
        if has_placeholder and not has_visible_label:
            rule = self.rules['placeholder_not_label']
            issues.append(self._create_issue(element, rule))
        
        # Rule 10.C: Form validation errors
        has_error = self._has_error_state(element)
        has_error_aria = self._has_error_aria(element)
        
        if has_error and not has_error_aria:
            rule = self.rules['form_error_missing_aria']
            issues.append(self._create_issue(element, rule))
        
        return issues
    
    def _has_label(self, element: Dict[str, Any]) -> bool:
        """Check if element has an accessible label."""
        # Check for aria-label
        if 'aria-label' in element['attributes']:
            return True
        
        # Check for aria-labelledby
        if 'aria-labelledby' in element['attributes']:
            return True
        
        # Check for label prop (MUI TextField)
        if 'label' in element['attributes']:
            return True
        
        # Check for id (could be associated with a <label> element)
        # Note: This requires context analysis of surrounding elements
        # For now, we'll flag as missing unless explicit ARIA or label prop
        
        return False
    
    def _has_visible_label(self, element: Dict[str, Any]) -> bool:
        """Check if element has a visible label (not just aria-label)."""
        # MUI TextField label prop provides visible label
        if 'label' in element['attributes']:
            return True
        
        # Note: Detecting <label> elements requires context analysis
        # For now, consider aria-label as not visible
        
        return False
    
    def _has_error_state(self, element: Dict[str, Any]) -> bool:
        """Check if element has error state."""
        # Check for error prop (common in MUI components)
        if 'error' in element['attributes']:
            return True
        
        # Check for aria-invalid
        if element['attributes'].get('aria-invalid') == 'true':
            return True
        
        return False
    
    def _has_error_aria(self, element: Dict[str, Any]) -> bool:
        """Check if error message is accessible."""
        # Check for aria-invalid
        has_aria_invalid = element['attributes'].get('aria-invalid') == 'true'
        
        # Check for aria-describedby (links to error message)
        has_aria_describedby = 'aria-describedby' in element['attributes']
        
        return has_aria_invalid and has_aria_describedby
    
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
