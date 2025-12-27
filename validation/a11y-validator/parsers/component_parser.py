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
        
        # Directories to exclude from scanning
        excluded_dirs = {
            'node_modules',
            '.next',
            'dist',
            'build',
            '.git',
            '__pycache__',
            'coverage',
            '.turbo',
            '.pnpm',
        }
        
        results = []
        for file_path in directory.rglob('*'):
            # Skip if any parent directory is in excluded list
            if any(excluded in file_path.parts for excluded in excluded_dirs):
                continue
            
            # Only process actual files, not directories
            if not file_path.is_file():
                continue
                
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
        
        # Pattern to find JSX opening tags
        tag_start_pattern = r'<(\w+)\b'
        
        i = 0
        while i < len(lines):
            line = lines[i]
            line_num = i + 1
            
            # Find all tag starts in this line
            for match in re.finditer(tag_start_pattern, line):
                # Skip closing tags
                if match.start() > 0 and line[match.start()-1:match.start()+1] == '</':
                    continue
                
                element_name = match.group(1)
                start_line = line_num
                start_col = match.start() + 1
                
                # Extract complete tag (may span multiple lines)
                tag_info = self.extract_complete_tag(lines, i, match.start())
                
                if tag_info:
                    element = {
                        'type': element_name,
                        'line': start_line,
                        'column': start_col,
                        'attributes': self.parse_attributes(tag_info['attributes_str']),
                        'self_closing': tag_info['self_closing'],
                        'content': tag_info['content'],
                        'code_snippet': line.strip()
                    }
                    elements.append(element)
            
            i += 1
        
        return elements
    
    def extract_complete_tag(self, lines: List[str], start_line_idx: int, start_pos: int) -> Optional[Dict[str, Any]]:
        """
        Extract complete JSX tag including attributes that may span multiple lines.
        
        Args:
            lines: List of all lines in file
            start_line_idx: Index of line where tag starts (0-based)
            start_pos: Position in line where tag starts
            
        Returns:
            Dictionary with attributes_str, self_closing, and content
        """
        # Build complete tag string by reading lines until we find > or />
        tag_str = lines[start_line_idx][start_pos:]
        current_line = start_line_idx
        
        # Keep reading lines until we find the closing > or />
        max_lines_to_read = 20  # Safety limit to avoid infinite loops
        lines_read = 0
        
        while current_line < len(lines) and lines_read < max_lines_to_read:
            # Check if this line contains the closing > or /> (outside of braces)
            # We need to avoid matching > inside expressions like onChange={(e) => ...}
            brace_depth = 0
            i = 0
            closing_pos = -1
            is_self_closing = False
            
            while i < len(tag_str):
                if tag_str[i] == '{':
                    brace_depth += 1
                elif tag_str[i] == '}':
                    brace_depth -= 1
                elif brace_depth == 0:  # Only check for > when outside braces
                    if i < len(tag_str) - 1 and tag_str[i:i+2] == '/>':
                        closing_pos = i + 2
                        is_self_closing = True
                        break
                    elif tag_str[i] == '>':
                        closing_pos = i + 1
                        break
                i += 1
            
            if closing_pos > 0:
                tag_str = tag_str[:closing_pos]
                break
            
            # Continue to next line
            current_line += 1
            lines_read += 1
            if current_line < len(lines):
                tag_str += ' ' + lines[current_line].strip()
        
        # Parse the complete tag
        # Since we've already found the correct closing > or /> by counting braces,
        # we know tag_str contains the complete tag. Extract the element name and
        # everything between the name and the final > or />
        
        # Match tag name
        tag_name_match = re.match(r'<(\w+)', tag_str)
        if not tag_name_match:
            return None
        
        element_name = tag_name_match.group(1)
        
        # Extract attributes: everything between tag name and final > or />
        # Check if self-closing
        if tag_str.rstrip().endswith('/>'):
            # Self-closing tag
            attributes_str = tag_str[len(element_name) + 1:-2].strip()
            self_closing_final = True
        elif tag_str.rstrip().endswith('>'):
            # Regular opening tag
            attributes_str = tag_str[len(element_name) + 1:-1].strip()
            self_closing_final = False
        else:
            # Shouldn't happen, but handle it
            attributes_str = tag_str[len(element_name) + 1:].strip()
            self_closing_final = False
        
        # Use is_self_closing from the loop if it was set, otherwise use what we just determined
        try:
            self_closing = is_self_closing if 'is_self_closing' in locals() else self_closing_final
        except:
            self_closing = self_closing_final
        
        # For non-self-closing tags, try to extract content (same line only)
        content = ''
        if not self_closing and '>' in tag_str:
            after_opening = tag_str.split('>', 1)[1] if '>' in tag_str else ''
            # Remove any nested JSX
            content = re.sub(r'<[^>]+>', '', after_opening).strip()
        
        return {
            'attributes_str': attributes_str,
            'self_closing': self_closing,
            'content': content
        }
    
    def parse_attributes(self, attributes_str: str) -> Dict[str, str]:
        """
        Parse JSX attributes from attribute string.
        
        Args:
            attributes_str: String containing JSX attributes
            
        Returns:
            Dictionary of attribute name -> value pairs
        """
        attributes = {}
        
        # Clean up whitespace/newlines for easier parsing
        cleaned_str = ' '.join(attributes_str.split())
        
        # Pattern for JSX attributes (improved to handle complex expressions):
        # - name="value" (string literal)
        # - name={value} (expression - now handles nested braces better)
        # - name='value' (single quote string)
        # - name (boolean true)
        
        i = 0
        while i < len(cleaned_str):
            # Skip whitespace
            while i < len(cleaned_str) and cleaned_str[i].isspace():
                i += 1
            
            if i >= len(cleaned_str):
                break
            
            # Match attribute name
            attr_name_match = re.match(r'(\w+(?:-\w+)*)', cleaned_str[i:])
            if not attr_name_match:
                i += 1
                continue
            
            attr_name = attr_name_match.group(1)
            i += len(attr_name)
            
            # Skip whitespace
            while i < len(cleaned_str) and cleaned_str[i].isspace():
                i += 1
            
            # Check for = sign
            if i < len(cleaned_str) and cleaned_str[i] == '=':
                i += 1
                
                # Skip whitespace
                while i < len(cleaned_str) and cleaned_str[i].isspace():
                    i += 1
                
                if i >= len(cleaned_str):
                    attributes[attr_name] = 'true'
                    break
                
                # Parse value based on quote/brace
                if cleaned_str[i] == '"':
                    # Double-quoted string
                    i += 1
                    start = i
                    while i < len(cleaned_str) and cleaned_str[i] != '"':
                        if cleaned_str[i] == '\\':
                            i += 2  # Skip escaped character
                        else:
                            i += 1
                    attr_value = cleaned_str[start:i]
                    i += 1  # Skip closing quote
                    
                elif cleaned_str[i] == "'":
                    # Single-quoted string
                    i += 1
                    start = i
                    while i < len(cleaned_str) and cleaned_str[i] != "'":
                        if cleaned_str[i] == '\\':
                            i += 2  # Skip escaped character
                        else:
                            i += 1
                    attr_value = cleaned_str[start:i]
                    i += 1  # Skip closing quote
                    
                elif cleaned_str[i] == '{':
                    # Expression - count braces to find matching closing brace
                    brace_count = 1
                    i += 1
                    start = i
                    while i < len(cleaned_str) and brace_count > 0:
                        if cleaned_str[i] == '{':
                            brace_count += 1
                        elif cleaned_str[i] == '}':
                            brace_count -= 1
                        i += 1
                    attr_value = cleaned_str[start:i-1]  # Exclude closing brace
                    
                else:
                    # Unquoted value (shouldn't happen in JSX, but handle it)
                    start = i
                    while i < len(cleaned_str) and not cleaned_str[i].isspace():
                        i += 1
                    attr_value = cleaned_str[start:i]
            else:
                # Boolean attribute (no value)
                attr_value = 'true'
            
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
