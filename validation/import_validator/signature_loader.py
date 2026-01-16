"""
Signature Loader
Loads actual function signatures from org_common module
"""
import ast
import os
from typing import Dict, Any, List, Optional
from pathlib import Path


class SignatureLoader:
    """Load and parse function signatures from org_common module"""
    
    def __init__(self, org_common_path: str):
        """
        Initialize signature loader
        
        Args:
            org_common_path: Path to org_common module directory
        """
        self.org_common_path = Path(org_common_path)
        self.signatures = {}
        
    def load_all_signatures(self) -> Dict[str, Any]:
        """
        Load all function signatures from org_common module
        
        Returns:
            Dictionary mapping function names to their signatures
        """
        # Load signatures from each module file
        module_files = {
            'common': self.org_common_path / '__init__.py',  # Auth utility functions
            'auth': self.org_common_path / 'auth.py',  # Authorization wrappers
            'db': self.org_common_path / 'db.py',
            'validators': self.org_common_path / 'validators.py',
            'errors': self.org_common_path / 'errors.py',
            'responses': self.org_common_path / 'responses.py',
            'supabase_client': self.org_common_path / 'supabase_client.py',
            'jwt_utils': self.org_common_path / 'jwt_utils.py',
        }
        
        for module_name, file_path in module_files.items():
            if file_path.exists():
                self._load_signatures_from_file(file_path, module_name)
        
        return self.signatures
    
    def _load_signatures_from_file(self, file_path: Path, module_name: str):
        """
        Load function signatures from a single Python file
        
        Args:
            file_path: Path to Python file
            module_name: Module name (e.g., 'db', 'validators')
        """
        try:
            with open(file_path, 'r') as f:
                source = f.read()
            
            tree = ast.parse(source)
            
            # Extract function definitions and class definitions
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    # Skip private functions
                    if node.name.startswith('_'):
                        continue
                    
                    signature = self._parse_function_signature(node, file_path)
                    
                    # Store with full qualified name
                    qualified_name = f"org_common.{node.name}"
                    self.signatures[qualified_name] = signature
                    
                    # Also store with module prefix for reference
                    module_qualified = f"org_common.{module_name}.{node.name}"
                    self.signatures[module_qualified] = signature
                
                elif isinstance(node, ast.ClassDef):
                    # Extract error classes (they act like functions when instantiated)
                    if node.name.endswith('Error') or node.name in ['ValidationError', 'NotFoundError', 'ForbiddenError']:
                        # For error classes, extract __init__ signature if present
                        signature = self._parse_class_signature(node, file_path)
                        
                        # Store with full qualified name
                        qualified_name = f"org_common.{node.name}"
                        self.signatures[qualified_name] = signature
                        
                        # Also store with module prefix for reference
                        module_qualified = f"org_common.{module_name}.{node.name}"
                        self.signatures[module_qualified] = signature
                    
        except Exception as e:
            print(f"Warning: Failed to parse {file_path}: {str(e)}")
    
    def _parse_function_signature(self, node: ast.FunctionDef, file_path: Path) -> Dict[str, Any]:
        """
        Parse function signature from AST node
        
        Args:
            node: AST FunctionDef node
            file_path: Source file path
            
        Returns:
            Signature information dictionary
        """
        args = node.args
        
        # Extract parameter names
        all_params = []
        required_params = []
        optional_params = {}
        
        # Positional arguments
        for i, arg in enumerate(args.args):
            param_name = arg.arg
            all_params.append(param_name)
            
            # Check if it has a default value
            defaults_offset = len(args.args) - len(args.defaults)
            if i >= defaults_offset:
                default_index = i - defaults_offset
                default_value = self._get_default_value(args.defaults[default_index])
                optional_params[param_name] = default_value
            else:
                # Skip 'self' or 'cls' for methods
                if param_name not in ('self', 'cls'):
                    required_params.append(param_name)
        
        # Keyword-only arguments
        for i, arg in enumerate(args.kwonlyargs):
            param_name = arg.arg
            all_params.append(param_name)
            
            if i < len(args.kw_defaults):
                default = args.kw_defaults[i]
                if default is not None:
                    optional_params[param_name] = self._get_default_value(default)
                else:
                    required_params.append(param_name)
            else:
                required_params.append(param_name)
        
        # Get docstring for additional context
        docstring = ast.get_docstring(node)
        
        return {
            'function': node.name,
            'parameters': all_params,
            'required': required_params,
            'optional': optional_params,
            'file': file_path.name,
            'line': node.lineno,
            'docstring': docstring or '',
            'deprecated': self._get_deprecated_params(node.name)
        }
    
    def _parse_class_signature(self, node: ast.ClassDef, file_path: Path) -> Dict[str, Any]:
        """
        Parse class signature from AST node (for error classes)
        
        Args:
            node: AST ClassDef node
            file_path: Source file path
            
        Returns:
            Signature information dictionary
        """
        # Look for __init__ method
        init_node = None
        for item in node.body:
            if isinstance(item, ast.FunctionDef) and item.name == '__init__':
                init_node = item
                break
        
        if init_node:
            # Parse __init__ signature
            args = init_node.args
            
            # Extract parameter names (skip 'self')
            all_params = []
            required_params = []
            optional_params = {}
            
            for i, arg in enumerate(args.args):
                if arg.arg == 'self':
                    continue
                
                param_name = arg.arg
                all_params.append(param_name)
                
                # Check if it has a default value
                defaults_offset = len(args.args) - len(args.defaults)
                if i >= defaults_offset:
                    default_index = i - defaults_offset
                    default_value = self._get_default_value(args.defaults[default_index])
                    optional_params[param_name] = default_value
                else:
                    if param_name != 'self':
                        required_params.append(param_name)
            
            docstring = ast.get_docstring(node)
            
            return {
                'function': node.name,
                'parameters': all_params,
                'required': required_params,
                'optional': optional_params,
                'file': file_path.name,
                'line': node.lineno,
                'docstring': docstring or '',
                'deprecated': [],
                'is_class': True
            }
        else:
            # No __init__ method, assume it takes a single message parameter
            return {
                'function': node.name,
                'parameters': ['message'],
                'required': [],
                'optional': {'message': '""'},
                'file': file_path.name,
                'line': node.lineno,
                'docstring': ast.get_docstring(node) or '',
                'deprecated': [],
                'is_class': True
            }
    
    def _get_default_value(self, node: ast.AST) -> Any:
        """
        Extract default value from AST node
        
        Args:
            node: AST node representing default value
            
        Returns:
            Default value (or string representation)
        """
        if isinstance(node, ast.Constant):
            return node.value
        elif isinstance(node, ast.Num):
            return node.n
        elif isinstance(node, ast.Str):
            return node.s
        elif isinstance(node, ast.NameConstant):
            return node.value
        elif isinstance(node, ast.Name):
            return node.id
        else:
            return ast.unparse(node) if hasattr(ast, 'unparse') else '<default>'
    
    def _get_deprecated_params(self, function_name: str) -> List[str]:
        """
        Get list of deprecated parameters for a function
        
        Args:
            function_name: Function name
            
        Returns:
            List of deprecated parameter names
        """
        # Known deprecated parameters
        deprecated_map = {
            'find_many': ['order_by'],  # Should use 'order'
            'execute_query': ['order_by'],  # Should use 'order'
        }
        
        return deprecated_map.get(function_name, [])
    
    def get_signature(self, function_name: str) -> Optional[Dict[str, Any]]:
        """
        Get signature for a specific function
        
        Args:
            function_name: Fully qualified function name (e.g., 'org_common.find_one')
            
        Returns:
            Signature dictionary or None if not found
        """
        return self.signatures.get(function_name)
    
    def format_signature(self, function_name: str) -> str:
        """
        Format function signature as a readable string
        
        Args:
            function_name: Function name
            
        Returns:
            Formatted signature string
        """
        sig = self.get_signature(function_name)
        if not sig:
            return f"{function_name}(...)"
        
        parts = []
        
        # Add required parameters
        for param in sig['required']:
            parts.append(param)
        
        # Add optional parameters with defaults
        for param, default in sig['optional'].items():
            if isinstance(default, str):
                parts.append(f"{param}='{default}'")
            elif default is None:
                parts.append(f"{param}=None")
            else:
                parts.append(f"{param}={default}")
        
        return f"{sig['function']}({', '.join(parts)})"


def load_org_common_signatures(base_path: str = None) -> Dict[str, Any]:
    """
    Convenience function to load org_common signatures
    
    Args:
        base_path: Base path to project directory. If None, auto-detect.
        
    Returns:
        Dictionary of function signatures
    """
    if base_path is None:
        # Auto-detect path relative to this script
        script_dir = Path(__file__).parent
        base_path = script_dir.parent.parent.parent  # Go up to project root
    
    base_path = Path(base_path)
    
    # Try CORA naming convention first (module-access)
    org_common_path = base_path / 'packages' / 'module-access' / 'backend' / 'layers' / 'org-common' / 'python' / 'org_common'
    
    # Fall back to legacy naming (org-module) for backwards compatibility
    if not org_common_path.exists():
        org_common_path = base_path / 'packages' / 'org-module' / 'backend' / 'layers' / 'org-common' / 'python' / 'org_common'
    
    # Fall back to cora-dev-toolkit template location (when validating templates)
    if not org_common_path.exists():
        # If base_path is inside templates/, look for org_common at toolkit root
        toolkit_root = base_path
        while toolkit_root != toolkit_root.parent:
            if toolkit_root.name == 'templates' or (toolkit_root / 'templates').exists():
                # Found toolkit root or templates dir
                if toolkit_root.name == 'templates':
                    toolkit_root = toolkit_root.parent
                toolkit_path = toolkit_root / 'templates' / '_modules-core' / 'module-access' / 'backend' / 'layers' / 'org-common' / 'python' / 'org_common'
                if toolkit_path.exists():
                    org_common_path = toolkit_path
                    break
            toolkit_root = toolkit_root.parent
    
    if not org_common_path.exists():
        raise FileNotFoundError(
            f"org_common module not found. Searched:\n"
            f"  - {base_path / 'packages' / 'module-access' / 'backend' / 'layers' / 'org-common' / 'python' / 'org_common'}\n"
            f"  - {base_path / 'packages' / 'org-module' / 'backend' / 'layers' / 'org-common' / 'python' / 'org_common'}\n"
            f"  - {base_path / 'templates' / '_modules-core' / 'module-access' / 'backend' / 'layers' / 'org-common' / 'python' / 'org_common'}"
        )
    
    loader = SignatureLoader(str(org_common_path))
    return loader.load_all_signatures()


if __name__ == '__main__':
    # Test signature loading
    signatures = load_org_common_signatures()
    
    print(f"\nLoaded {len(signatures)} function signatures from org_common:\n")
    
    for name, sig in sorted(signatures.items()):
        if 'org_common.db.' not in name and 'org_common.validators.' not in name:
            # Print the main module functions
            loader = SignatureLoader('')
            loader.signatures = {name: sig}
            print(f"  {loader.format_signature(name)}")
            if sig['deprecated']:
                print(f"    ⚠️  Deprecated params: {', '.join(sig['deprecated'])}")
