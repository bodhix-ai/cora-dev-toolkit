"""
Component Parser for React/TypeScript Files
Extracts JSX elements and their attributes for accessibility validation
"""

import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple


class ComponentParser:
    """Parses React/TSX files to extract JSX elements and attributes."""
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.supported_extensions = {'.tsx', '.jsx', '.ts', '.js'}
    
    def parse_directory(self, directory_path: str) -> List[Dict[str, Any]]:
        """
        Parse all supported files in a directory recursively.
        
        Args:
            directory_path: Path to directory to scan
            
        Returns:
            List of parsed file results
        """
        directory = Path(directory_path)
        if not directory.exists():
            raise ValueError(f"Directory not found: {directory_path}")
        
        results = []
        for file_path in directory.rglob('*'):
            if file_path.suffix in self.supported_extensions:
                if self.verbose:
                    print(f"Parsing: {file_path}")
                result = self.parse_file(str(file_path))
                if result:
                    results.append(result)
        
        return results
    
    def parse_file(self, file_path: str) -> Optional[Dict[str, Any]]:
        """
        Parse a single React/TSX file.
        
        Args:
            file_path: Path to file to parse
            
        Returns:
            Dictionary containing parsed elements and metadata
        """
        path = Path(file_path)
        if not path.exists():
            return None
        
        if path.suffix not in self.supported_extensions:
            return None
        
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return None
        
        elements = self.extract_jsx_elements(content)
        
        return {
            'file_path': str(path),
            'elements': elements,
            'line_count': len(content.splitlines()),
        }
    
    def extract_jsx_elements(self, content: str) -> List[Dict[str, Any]]:
        """
        Extract JSX elements from file content.
        
        Args:
            content: File content as string
            
        Returns:
            List of extracted elements with attributes
        """
        elements = []
        lines = content.splitlines()
        
        # Patterns for different JSX element types
        # Self-closing tags: <img src="..." alt="..." />
        self_closing_pattern = r'<(\w+)([^>]*)/>'
        # Opening tags: <button aria-label="...">
        opening_tag_pattern = r'<(\w+)([^/>]*?)(?:>|$)'
        
        for line_num, line in enumerate(lines, start=1):
            # Find self-closing elements
            for match in re.finditer(self_closing_pattern, line):
                element_name = match.group(1)
                attributes_str = match.group(2)
                
                element = {
                    'type': element_name,
                    'line': line_num,
                    'column': match.start() + 1,
                    'attributes': self.parse_attributes(attributes_str),
                    'self_closing': True,
                    'content': '',
                    'code_snippet': line.strip()
                }
                elements.append(element)
            
            # Find opening tags (for elements with content)
            for match in re.finditer(opening_tag_pattern, line):
                element_name = match.group(1)
                attributes_str = match.group(2)
                
                # Skip if this is a closing tag
                if line[match.start():match.start()+2] == '</':
                    continue
                
                # Extract content between opening and closing tags (same line only for now)
                content = self.extract_element_content(line, match.end())
                
                element = {
                    'type': element_name,
                    'line': line_num,
                    'column': match.start() + 1,
                    'attributes': self.parse_attributes(attributes_str),
                    'self_closing': False,
                    'content': content,
                    'code_snippet': line.strip()
                }
                elements.append(element)
        
        return elements
    
    def parse_attributes(self, attributes_str: str) -> Dict[str, str]:
        """
        Parse JSX attributes from attribute string.
        
        Args:
            attributes_str: String containing JSX attributes
            
        Returns:
            Dictionary of attribute name -> value pairs
        """
        attributes = {}
        
        # Pattern for JSX attributes:
        # - name="value" (string literal)
        # - name={value} (expression)
        # - name (boolean true)
        attr_pattern = r'(\w+)(?:=(?:"([^"]*)"|{([^}]*)}|\'([^\']*)\'))?'
        
        for match in re.finditer(attr_pattern, attributes_str):
            attr_name = match.group(1)
            
            # Get the value from whichever group matched
            attr_value = (
                match.group(2) or  # "value"
                match.group(3) or  # {value}
                match.group(4) or  # 'value'
                'true'             # Boolean attribute
            )
            
            attributes[attr_name] = attr_value
        
        return attributes
    
    def extract_element_content(self, line: str, start_pos: int) -> str:
        """
        Extract text content between opening and closing tags (same line only).
        
        Args:
            line: Line containing the element
            start_pos: Position after opening tag
            
        Returns:
            Text content of element
        """
        # Find the closing tag
        closing_tag_match = re.search(r'</', line[start_pos:])
        
        if closing_tag_match:
            content = line[start_pos:start_pos + closing_tag_match.start()]
            # Remove any nested JSX
            content = re.sub(r'<[^>]+>', '', content)
            return content.strip()
        
        return ''
    
    def get_element_by_type(self, elements: List[Dict[str, Any]], element_type: str) -> List[Dict[str, Any]]:
        """Filter elements by type."""
        return [el for el in elements if el['type'] == element_type]
    
    def get_elements_with_attribute(self, elements: List[Dict[str, Any]], attr_name: str) -> List[Dict[str, Any]]:
        """Filter elements that have a specific attribute."""
        return [el for el in elements if attr_name in el['attributes']]
    
    def has_attribute(self, element: Dict[str, Any], attr_name: str) -> bool:
        """Check if element has a specific attribute."""
        return attr_name in element['attributes']
    
    def get_attribute_value(self, element: Dict[str, Any], attr_name: str) -> Optional[str]:
        """Get value of a specific attribute."""
        return element['attributes'].get(attr_name)
    
    def extract_headings(self, elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract heading elements and determine hierarchy.
        
        Handles:
        - HTML headings: <h1>, <h2>, etc.
        - MUI Typography: <Typography variant="h1">
        """
        headings = []
        
        for element in elements:
            heading_level = None
            
            # HTML headings
            if element['type'] in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                heading_level = int(element['type'][1])
            
            # MUI Typography with variant
            elif element['type'] == 'Typography':
                variant = self.get_attribute_value(element, 'variant')
                if variant and variant.startswith('h') and len(variant) == 2:
                    try:
                        heading_level = int(variant[1])
                    except ValueError:
                        pass
            
            # ARIA role="heading" with aria-level
            elif self.get_attribute_value(element, 'role') == 'heading':
                aria_level = self.get_attribute_value(element, 'aria-level')
                if aria_level:
                    try:
                        heading_level = int(aria_level)
                    except ValueError:
                        pass
            
            if heading_level is not None:
                headings.append({
                    **element,
                    'heading_level': heading_level
                })
        
        # Sort by line number
        headings.sort(key=lambda h: h['line'])
        
        return headings
    
    def check_heading_hierarchy(self, headings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Check if heading hierarchy is correct (no skipped levels).
        
        Returns:
            List of hierarchy violations
        """
        violations = []
        
        if not headings:
            return violations
        
        for i in range(1, len(headings)):
            prev_level = headings[i-1]['heading_level']
            curr_level = headings[i]['heading_level']
            
            # Check if level was skipped (e.g., h1 -> h3)
            if curr_level > prev_level + 1:
                violations.append({
                    'previous': headings[i-1],
                    'current': headings[i],
                    'skipped_levels': curr_level - prev_level - 1
                })
        
        return violations
    
    def extract_interactive_elements(self, elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract elements with event handlers (onClick, etc.).
        
        Returns:
            List of interactive elements
        """
        interactive = []
        
        event_handlers = ['onClick', 'onKeyDown', 'onKeyPress', 'onKeyUp', 'onChange', 'onSubmit']
        
        for element in elements:
            has_event_handler = any(handler in element['attributes'] for handler in event_handlers)
            
            if has_event_handler:
                interactive.append(element)
        
        return interactive
    
    def extract_form_controls(self, elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract form control elements.
        
        Returns:
            List of form controls
        """
        form_control_types = [
            'input', 'Input', 'TextField', 'Select', 'Checkbox', 
            'Radio', 'Switch', 'textarea', 'select', 'button'
        ]
        
        return [el for el in elements if el['type'] in form_control_types]


def extract_inline_styles(element: Dict[str, Any]) -> Dict[str, str]:
    """
    Extract inline styles from element.
    
    Handles:
    - style prop
    - sx prop (MUI)
    """
    styles = {}
    
    # Check for style attribute
    style_value = element['attributes'].get('style')
    if style_value:
        # Parse inline styles (simplified)
        style_pairs = re.findall(r'(\w+):\s*([^,}]+)', style_value)
        for prop, value in style_pairs:
            styles[prop.strip()] = value.strip()
    
    # Check for sx attribute (MUI)
    sx_value = element['attributes'].get('sx')
    if sx_value:
        # Parse sx prop (simplified)
        sx_pairs = re.findall(r'(\w+):\s*([^,}]+)', sx_value)
        for prop, value in sx_pairs:
            styles[prop.strip()] = value.strip()
    
    return styles


def has_color_value(styles: Dict[str, str]) -> bool:
    """Check if styles contain hardcoded color values."""
    color_pattern = r'#[0-9a-fA-F]{3,6}|rgb\(|rgba\('
    
    for prop, value in styles.items():
        if prop in ['color', 'backgroundColor', 'background', 'borderColor']:
            if re.search(color_pattern, value):
                return True
    
    return False
