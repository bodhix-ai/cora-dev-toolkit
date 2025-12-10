"""
ICT Testing Baseline Rule Definitions
Maps accessibility rules to ICT Baseline for Web v3.1 and WCAG 2.1 Level AA

References:
- ICT Testing Baseline: https://ictbaseline.access-board.gov/
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
"""

from typing import List, Dict, Any

# Rule definition structure:
# {
#     "id": "Baseline.Test-RuleName",
#     "baseline_test": "X.Y",
#     "baseline_name": "Full Test Name",
#     "wcag_sc": "X.X.X",
#     "wcag_level": "A|AA|AAA",
#     "severity": "error|warning|info",
#     "rule_name": "snake_case_name",
#     "message": "Human-readable error message",
#     "suggestion": "How to fix",
#     "applies_to": ["element1", "element2"],
#     "detection": "How to detect this issue"
# }

BASELINE_RULES: List[Dict[str, Any]] = [
    # ========================================
    # Baseline 1: Keyboard Access
    # ========================================
    {
        "id": "1.A-KeyboardAccess",
        "baseline_test": "1.A",
        "baseline_name": "Keyboard Access - Functionality",
        "wcag_sc": "2.1.1",
        "wcag_level": "A",
        "severity": "error",
        "rule_name": "onclick_missing_keyboard",
        "message": "Interactive element with onClick handler missing keyboard support",
        "suggestion": "Add onKeyDown/onKeyPress handler or use semantic button/link element",
        "applies_to": ["div", "span", "p", "IconButton", "Button"],
        "detection": "Element has onClick but no onKeyDown/onKeyPress and not focusable (no tabIndex)"
    },
    {
        "id": "1.A-KeyboardAccess-TabIndex",
        "baseline_test": "1.A",
        "baseline_name": "Keyboard Access - Functionality",
        "wcag_sc": "2.1.1",
        "wcag_level": "A",
        "severity": "warning",
        "rule_name": "invalid_tabindex",
        "message": "Element has tabIndex greater than 0",
        "suggestion": "Use tabIndex={0} or tabIndex={-1}. Avoid positive tabIndex values as they disrupt natural tab order",
        "applies_to": ["*"],
        "detection": "tabIndex attribute is set to value > 0"
    },
    
    # ========================================
    # Baseline 2: Focus Visible & Order
    # ========================================
    {
        "id": "2.A-FocusVisible",
        "baseline_test": "2.A",
        "baseline_name": "Focus Visible",
        "wcag_sc": "2.4.7",
        "wcag_level": "AA",
        "severity": "error",
        "rule_name": "focus_outline_removed",
        "message": "Focus outline removed without alternative indicator",
        "suggestion": "If removing outline, provide alternative focus indicator with sufficient contrast (3:1 ratio)",
        "applies_to": ["*"],
        "detection": "CSS contains 'outline: none' or 'outline: 0' without alternative focus styles"
    },
    {
        "id": "2.B-FocusOrder",
        "baseline_test": "2.B",
        "baseline_name": "Focus Order",
        "wcag_sc": "2.4.3",
        "wcag_level": "A",
        "severity": "info",
        "rule_name": "focus_order_manual",
        "message": "Dynamic content detected - verify focus order manually",
        "suggestion": "Test focus order during runtime to ensure logical tab sequence",
        "applies_to": ["Dialog", "Modal", "Drawer"],
        "detection": "Component contains dynamic/conditional rendering"
    },
    
    # ========================================
    # Baseline 5: Name, Role, Value
    # ========================================
    {
        "id": "5.A-NameRoleValue",
        "baseline_test": "5.A",
        "baseline_name": "User Controls - Name",
        "wcag_sc": "4.1.2",
        "wcag_level": "A",
        "severity": "error",
        "rule_name": "button_missing_accessible_name",
        "message": "Button missing accessible name",
        "suggestion": "Add text content, aria-label, or aria-labelledby to button",
        "applies_to": ["button", "Button", "IconButton"],
        "detection": "Button element with no text content, aria-label, or aria-labelledby"
    },
    {
        "id": "5.B-NameRoleValue-Role",
        "baseline_test": "5.B",
        "baseline_name": "User Controls - Role",
        "wcag_sc": "4.1.2",
        "wcag_level": "A",
        "severity": "error",
        "rule_name": "invalid_aria_role",
        "message": "Invalid ARIA role attribute",
        "suggestion": "Use valid ARIA role from specification or remove role attribute",
        "applies_to": ["*"],
        "detection": "Element has role attribute with invalid value"
    },
    {
        "id": "5.C-NameRoleValue-State",
        "baseline_test": "5.C",
        "baseline_name": "User Controls - State",
        "wcag_sc": "4.1.2",
        "wcag_level": "A",
        "severity": "warning",
        "rule_name": "missing_aria_state",
        "message": "Interactive control missing state/property",
        "suggestion": "Add appropriate aria-expanded, aria-pressed, aria-selected, or aria-checked",
        "applies_to": ["button", "Button", "IconButton", "Checkbox", "Switch"],
        "detection": "Toggle button without aria-pressed, accordion without aria-expanded, etc."
    },
    
    # ========================================
    # Baseline 6: Images
    # ========================================
    {
        "id": "6.A-MeaningfulImage",
        "baseline_test": "6.A",
        "baseline_name": "Images - Meaningful Image",
        "wcag_sc": "1.1.1",
        "wcag_level": "A",
        "severity": "error",
        "rule_name": "img_missing_alt",
        "message": "Image missing alt text",
        "suggestion": "Add alt attribute describing the image purpose. Use alt=\"\" for decorative images",
        "applies_to": ["img", "Image"],
        "detection": "img element without alt attribute or with alt=\"undefined\""
    },
    {
        "id": "6.A-IconButton",
        "baseline_test": "6.A",
        "baseline_name": "Images - Meaningful Image",
        "wcag_sc": "1.1.1",
        "wcag_level": "A",
        "severity": "error",
        "rule_name": "iconbutton_missing_label",
        "message": "IconButton missing accessible label",
        "suggestion": "Add aria-label describing the button's action (e.g., aria-label=\"Close dialog\")",
        "applies_to": ["IconButton"],
        "detection": "IconButton without aria-label, aria-labelledby, or text content"
    },
    {
        "id": "6.B-DecorativeImage",
        "baseline_test": "6.B",
        "baseline_name": "Images - Decorative Image",
        "wcag_sc": "1.1.1",
        "wcag_level": "A",
        "severity": "info",
        "rule_name": "decorative_image_info",
        "message": "Image marked as decorative",
        "suggestion": "Verify this image is truly decorative (adds no information)",
        "applies_to": ["img", "Image"],
        "detection": "img with alt=\"\" or role=\"presentation\""
    },
    
    # ========================================
    # Baseline 7: Sensory Characteristics
    # ========================================
    {
        "id": "7.A-SensoryCharacteristics",
        "baseline_test": "7.A",
        "baseline_name": "Sensory Characteristics",
        "wcag_sc": "1.3.3",
        "wcag_level": "A",
        "severity": "warning",
        "rule_name": "color_only_indication",
        "message": "Hardcoded color value detected - verify not used as only visual means",
        "suggestion": "Ensure color is not the only way to convey information. Add text labels, patterns, or icons",
        "applies_to": ["*"],
        "detection": "Inline style or sx prop with hardcoded color value"
    },
    
    # ========================================
    # Baseline 8: Contrast Minimum
    # ========================================
    {
        "id": "8.A-ContrastMinimum",
        "baseline_test": "8.A",
        "baseline_name": "Contrast Minimum",
        "wcag_sc": "1.4.3",
        "wcag_level": "AA",
        "severity": "warning",
        "rule_name": "hardcoded_color_contrast",
        "message": "Hardcoded color detected - verify 4.5:1 contrast ratio manually",
        "suggestion": "Use theme colors (theme.palette.text.primary) or verify contrast with WebAIM tool",
        "applies_to": ["*"],
        "detection": "Inline color style with hex/rgb value"
    },
    
    # ========================================
    # Baseline 10: Forms
    # ========================================
    {
        "id": "10.A-FormLabel",
        "baseline_test": "10.A",
        "baseline_name": "Forms - Label in Name",
        "wcag_sc": "1.3.1",
        "wcag_level": "A",
        "severity": "error",
        "rule_name": "input_missing_label",
        "message": "Form input missing label",
        "suggestion": "Add <label> with htmlFor, or use aria-label/aria-labelledby",
        "applies_to": ["input", "Input", "TextField", "Select"],
        "detection": "Input without associated label, aria-label, or aria-labelledby"
    },
    {
        "id": "10.B-FormLabel-Placeholder",
        "baseline_test": "10.A",
        "baseline_name": "Forms - Label in Name",
        "wcag_sc": "1.3.1",
        "wcag_level": "A",
        "severity": "warning",
        "rule_name": "placeholder_not_label",
        "message": "Input has placeholder but no visible label",
        "suggestion": "Placeholder is not a substitute for label. Add visible <label> or TextField label prop",
        "applies_to": ["input", "Input", "TextField"],
        "detection": "Input with placeholder but no label element or label prop"
    },
    {
        "id": "10.C-FormValidation",
        "baseline_test": "10.C",
        "baseline_name": "Forms - Error Identification",
        "wcag_sc": "3.3.1",
        "wcag_level": "A",
        "severity": "warning",
        "rule_name": "form_error_missing_aria",
        "message": "Form validation error may not be accessible",
        "suggestion": "Use aria-invalid and aria-describedby to associate error messages with inputs",
        "applies_to": ["input", "Input", "TextField"],
        "detection": "Error prop or error state without aria-invalid or aria-describedby"
    },
    
    # ========================================
    # Baseline 11: Page Titles
    # ========================================
    {
        "id": "11.A-PageTitle",
        "baseline_test": "11.A",
        "baseline_name": "Page Titled",
        "wcag_sc": "2.4.2",
        "wcag_level": "A",
        "severity": "error",
        "rule_name": "page_missing_title",
        "message": "Page component missing <title> or document.title",
        "suggestion": "Add <title> tag in Head or set document.title describing the page purpose",
        "applies_to": ["page", "layout"],
        "detection": "Page-level component without title element or metadata"
    },
    
    # ========================================
    # Baseline 13: Content Structure
    # ========================================
    {
        "id": "13.A-HeadingLevel",
        "baseline_test": "13.A",
        "baseline_name": "Content Structure - Headings",
        "wcag_sc": "1.3.1",
        "wcag_level": "A",
        "severity": "error",
        "rule_name": "heading_skip_level",
        "message": "Heading level skipped",
        "suggestion": "Heading levels should increase by one (h1 → h2 → h3). Don't skip from h1 to h3",
        "applies_to": ["h1", "h2", "h3", "h4", "h5", "h6", "Typography"],
        "detection": "Heading hierarchy analysis shows skipped level"
    },
    {
        "id": "13.B-ListStructure",
        "baseline_test": "13.B",
        "baseline_name": "Content Structure - Lists",
        "wcag_sc": "1.3.1",
        "wcag_level": "A",
        "severity": "warning",
        "rule_name": "list_improper_structure",
        "message": "List markup may be incorrect",
        "suggestion": "Use <ul>/<ol> with <li> children. Don't use list elements for non-list content",
        "applies_to": ["ul", "ol", "li", "List", "ListItem"],
        "detection": "ul/ol with non-li children, or li outside list context"
    },
    
    # ========================================
    # Baseline 14: Links
    # ========================================
    {
        "id": "14.A-LinkPurpose",
        "baseline_test": "14.A",
        "baseline_name": "Links - Purpose",
        "wcag_sc": "2.4.4",
        "wcag_level": "A",
        "severity": "error",
        "rule_name": "link_empty_text",
        "message": "Link has no text content",
        "suggestion": "Add descriptive text, aria-label, or aria-labelledby to link",
        "applies_to": ["a", "Link"],
        "detection": "Link element with no text content, aria-label, or title"
    },
    {
        "id": "14.B-LinkPurpose-Vague",
        "baseline_test": "14.A",
        "baseline_name": "Links - Purpose",
        "wcag_sc": "2.4.4",
        "wcag_level": "A",
        "severity": "warning",
        "rule_name": "link_vague_text",
        "message": "Link text may be too vague",
        "suggestion": "Avoid generic link text like 'Click here', 'Read more', 'Learn more'",
        "applies_to": ["a", "Link"],
        "detection": "Link text matches common vague patterns"
    },
    
    # ========================================
    # Baseline 19: Frames
    # ========================================
    {
        "id": "19.A-FrameTitle",
        "baseline_test": "19.A",
        "baseline_name": "Frames - Title",
        "wcag_sc": "4.1.2",
        "wcag_level": "A",
        "severity": "error",
        "rule_name": "iframe_missing_title",
        "message": "iframe missing title attribute",
        "suggestion": "Add title attribute describing the iframe content",
        "applies_to": ["iframe"],
        "detection": "iframe without title attribute"
    },
]


def get_rules_by_baseline(baseline_id: str) -> List[Dict[str, Any]]:
    """Get all rules for a specific baseline test."""
    return [rule for rule in BASELINE_RULES if rule["baseline_test"] == baseline_id]


def get_rules_by_severity(severity: str) -> List[Dict[str, Any]]:
    """Get all rules of a specific severity level."""
    return [rule for rule in BASELINE_RULES if rule["severity"] == severity]


def get_rule_by_name(rule_name: str) -> Dict[str, Any]:
    """Get a specific rule by its name."""
    for rule in BASELINE_RULES:
        if rule["rule_name"] == rule_name:
            return rule
    return None


def get_all_baseline_tests() -> List[str]:
    """Get unique list of all baseline test IDs."""
    return sorted(list(set(rule["baseline_test"] for rule in BASELINE_RULES)))


# Manual testing requirements for baseline tests not automatable
MANUAL_TESTING_REQUIRED = [
    {
        "baseline_test": "2.B",
        "baseline_name": "Focus Order",
        "wcag_sc": "2.4.3",
        "reason": "Focus order must be tested during runtime with keyboard navigation"
    },
    {
        "baseline_test": "8.A",
        "baseline_name": "Contrast Minimum",
        "wcag_sc": "1.4.3",
        "reason": "Precise contrast ratio calculation requires color analysis tools"
    },
    {
        "baseline_test": "16.A",
        "baseline_name": "Audio-Only",
        "wcag_sc": "1.2.1",
        "reason": "Audio transcripts must be reviewed manually"
    },
    {
        "baseline_test": "17.A",
        "baseline_name": "Media Player Controls",
        "wcag_sc": "1.4.2",
        "reason": "Video/audio player accessibility requires runtime testing"
    },
    {
        "baseline_test": "21.A",
        "baseline_name": "Timed Events",
        "wcag_sc": "2.2.1",
        "reason": "Time limits and auto-refresh behavior requires runtime testing"
    },
    {
        "baseline_test": "22.A",
        "baseline_name": "Resize Text",
        "wcag_sc": "1.4.4",
        "reason": "Text resize testing requires browser zoom functionality"
    },
]
