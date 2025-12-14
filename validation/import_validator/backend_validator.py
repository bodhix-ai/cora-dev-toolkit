"""
Backend Validator
Validates Python Lambda function imports against actual module signatures
"""
import ast
from typing import Dict, Any, List, Optional, Set
from pathlib import Path


class ImportCall:
    """Represents a function call found in a Lambda file"""
    
    def __init__(self, file_path: str, line: int, module: str, function: str, 
                 args: List[str], kwargs: Dict[str, Any], raw_call: str):
        self.file_path = file_path
        self.line = line
        self.module = module
        self.function = function
        self.args = args
        self.kwargs = kwargs
        self.raw_call = raw_call
    
    def __repr__(self):
        return f"<ImportCall {self.module}.{self.function} at {self.file_path}:{self.line}>"


class BackendValidator:
    """Validate Python Lambda function imports"""
    
    def __init__(self, signatures: Dict[str, Any]):
        """
        Initialize validator
        
        Args:
            signatures: Dictionary of function signatures from SignatureLoader
        """
        self.signatures = signatures
        self.errors = []
        self.warnings = []
        
    def validate_file(self, file_path: str) -> Dict[str, Any]:
        """
        Validate a single Python file
        
        Args:
            file_path: Path to Python file
            
        Returns:
            Validation results dictionary
        """
        try:
            with open(file_path, 'r') as f:
                source = f.read()
            
            tree = ast.parse(source)
            
            # Extract imports
            imports = self._extract_imports(tree)
            
            # Extract function calls
            calls = self._extract_calls(tree, imports, file_path)
            
            # Validate each call
            for call in calls:
                self._validate_call(call)
            
            return {
                'file': file_path,
                'imports': imports,
                'calls': len(calls),
                'errors': [e for e in self.errors if e['file'] == file_path],
                'warnings': [w for w in self.warnings if w['file'] == file_path]
            }
            
        except SyntaxError as e:
            self.errors.append({
                'severity': 'error',
                'file': file_path,
                'line': e.lineno,
                'issue': f'Syntax error: {str(e)}',
                'suggestion': 'Fix Python syntax errors before validation'
            })
            return {
                'file': file_path,
                'imports': {},
                'calls': 0,
                'errors': [e for e in self.errors if e['file'] == file_path],
                'warnings': []
            }
        except Exception as e:
            self.errors.append({
                'severity': 'error',
                'file': file_path,
                'line': 0,
                'issue': f'Failed to parse file: {str(e)}',
                'suggestion': 'Check file format and encoding'
            })
            return {
                'file': file_path,
                'imports': {},
                'calls': 0,
                'errors': [e for e in self.errors if e['file'] == file_path],
                'warnings': []
            }
    
    def _extract_imports(self, tree: ast.AST) -> Dict[str, str]:
        """
        Extract import statements from AST
        
        Args:
            tree: AST tree
            
        Returns:
            Dictionary mapping aliases to module names
        """
        imports = {}
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    module_name = alias.name
                    alias_name = alias.asname if alias.asname else alias.name
                    
                    if 'org_common' in module_name:
                        imports[alias_name] = module_name
            
            elif isinstance(node, ast.ImportFrom):
                if node.module and 'org_common' in node.module:
                    for alias in node.names:
                        func_name = alias.name
                        alias_name = alias.asname if alias.asname else alias.name
                        imports[alias_name] = f"{node.module}.{func_name}"
        
        return imports
    
    def _extract_calls(self, tree: ast.AST, imports: Dict[str, str], 
                      file_path: str) -> List[ImportCall]:
        """
        Extract function calls from AST
        
        Args:
            tree: AST tree
            imports: Dictionary of imports
            file_path: Source file path
            
        Returns:
            List of ImportCall objects
        """
        calls = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                # Check if this is a call to an imported function
                call_info = self._parse_call(node, imports, file_path)
                if call_info:
                    calls.append(call_info)
        
        return calls
    
    def _parse_call(self, node: ast.Call, imports: Dict[str, str], 
                   file_path: str) -> Optional[ImportCall]:
        """
        Parse a function call node
        
        Args:
            node: AST Call node
            imports: Dictionary of imports
            file_path: Source file path
            
        Returns:
            ImportCall object or None
        """
        # Handle attribute calls (e.g., common.find_one())
        if isinstance(node.func, ast.Attribute):
            if isinstance(node.func.value, ast.Name):
                alias = node.func.value.id
                function = node.func.attr
                
                if alias in imports:
                    module = imports[alias]
                    
                    # Extract arguments
                    args = []
                    for arg in node.args:
                        args.append(self._ast_to_string(arg))
                    
                    # Extract keyword arguments
                    kwargs = {}
                    for keyword in node.keywords:
                        kwargs[keyword.arg] = self._ast_to_string(keyword.value)
                    
                    # Build raw call string
                    raw_call = self._build_call_string(alias, function, args, kwargs)
                    
                    return ImportCall(
                        file_path=file_path,
                        line=node.lineno,
                        module=module,
                        function=function,
                        args=args,
                        kwargs=kwargs,
                        raw_call=raw_call
                    )
        
        # Handle direct calls (e.g., find_one() after 'from org_common import find_one')
        elif isinstance(node.func, ast.Name):
            func_name = node.func.id
            
            if func_name in imports:
                module = imports[func_name]
                
                # Extract arguments
                args = []
                for arg in node.args:
                    args.append(self._ast_to_string(arg))
                
                # Extract keyword arguments
                kwargs = {}
                for keyword in node.keywords:
                    kwargs[keyword.arg] = self._ast_to_string(keyword.value)
                
                # Build raw call string
                raw_call = self._build_call_string('', func_name, args, kwargs)
                
                return ImportCall(
                    file_path=file_path,
                    line=node.lineno,
                    module=module,
                    function=func_name,
                    args=args,
                    kwargs=kwargs,
                    raw_call=raw_call
                )
        
        return None
    
    def _ast_to_string(self, node: ast.AST) -> str:
        """
        Convert AST node to string representation
        
        Args:
            node: AST node
            
        Returns:
            String representation
        """
        if hasattr(ast, 'unparse'):
            return ast.unparse(node)
        elif isinstance(node, ast.Constant):
            return repr(node.value)
        elif isinstance(node, ast.Name):
            return node.id
        else:
            return '<expr>'
    
    def _build_call_string(self, alias: str, function: str, args: List[str], 
                          kwargs: Dict[str, Any]) -> str:
        """
        Build a readable function call string
        
        Args:
            alias: Module alias
            function: Function name
            args: Positional arguments
            kwargs: Keyword arguments
            
        Returns:
            Formatted call string
        """
        parts = []
        parts.extend(args)
        
        for key, value in kwargs.items():
            parts.append(f"{key}={value}")
        
        if alias:
            return f"{alias}.{function}({', '.join(parts)})"
        else:
            return f"{function}({', '.join(parts)})"
    
    def _validate_call(self, call: ImportCall):
        """
        Validate a function call against known signatures
        
        Args:
            call: ImportCall object
        """
        # Build qualified function name
        qualified_name = f"org_common.{call.function}"
        
        # Get signature
        signature = self.signatures.get(qualified_name)
        
        if not signature:
            # Function not found in signatures
            self.errors.append({
                'severity': 'error',
                'file': call.file_path,
                'line': call.line,
                'function': qualified_name,
                'issue': f"Unknown function '{call.function}'",
                'suggestion': f"The function '{call.function}' is not found in org_common module. Check the function name or import path.",
                'your_call': call.raw_call
            })
            return
        
        # Check for unknown keyword arguments
        all_params = set(signature['parameters'])
        used_kwargs = set(call.kwargs.keys())
        unknown_kwargs = used_kwargs - all_params
        
        if unknown_kwargs:
            for param in unknown_kwargs:
                # Check if it's a deprecated parameter
                if param in signature['deprecated']:
                    self.errors.append({
                        'severity': 'error',
                        'file': call.file_path,
                        'line': call.line,
                        'function': qualified_name,
                        'issue': f"Deprecated parameter '{param}'",
                        'suggestion': self._get_deprecation_suggestion(call.function, param),
                        'actual_signature': self._format_signature(signature),
                        'your_call': call.raw_call
                    })
                else:
                    self.errors.append({
                        'severity': 'error',
                        'file': call.file_path,
                        'line': call.line,
                        'function': qualified_name,
                        'issue': f"Unknown parameter '{param}'",
                        'suggestion': self._get_parameter_suggestion(signature, param),
                        'actual_signature': self._format_signature(signature),
                        'your_call': call.raw_call
                    })
        
        # Check for missing required parameters
        required_params = set(signature['required'])
        # Count positional args (they satisfy required params in order)
        provided_positional = len(call.args)
        provided_kwargs = used_kwargs
        
        # Assume positional args satisfy first N required params
        satisfied_positional = set(list(required_params)[:provided_positional])
        satisfied_kwargs = required_params & provided_kwargs
        satisfied = satisfied_positional | satisfied_kwargs
        
        missing = required_params - satisfied
        
        if missing:
            self.errors.append({
                'severity': 'error',
                'file': call.file_path,
                'line': call.line,
                'function': qualified_name,
                'issue': f"Missing required parameter(s): {', '.join(missing)}",
                'suggestion': f"The function requires these parameters: {', '.join(signature['required'])}",
                'actual_signature': self._format_signature(signature),
                'your_call': call.raw_call
            })
    
    def _format_signature(self, signature: Dict[str, Any]) -> str:
        """
        Format signature as readable string
        
        Args:
            signature: Signature dictionary
            
        Returns:
            Formatted signature
        """
        parts = []
        
        # Add required parameters
        for param in signature['required']:
            parts.append(param)
        
        # Add optional parameters
        for param, default in signature['optional'].items():
            if isinstance(default, str):
                parts.append(f"{param}='{default}'")
            elif default is None:
                parts.append(f"{param}=None")
            else:
                parts.append(f"{param}={default}")
        
        return f"{signature['function']}({', '.join(parts)})"
    
    def _get_deprecation_suggestion(self, function: str, param: str) -> str:
        """
        Get suggestion for deprecated parameter
        
        Args:
            function: Function name
            param: Parameter name
            
        Returns:
            Suggestion string
        """
        deprecation_map = {
            ('find_many', 'order_by'): "Use 'order' parameter instead of 'order_by'. Example: order='created_at.desc'",
            ('execute_query', 'order_by'): "Use 'order' parameter instead of 'order_by'. Example: order='created_at.desc'"
        }
        
        return deprecation_map.get((function, param), f"Parameter '{param}' is deprecated. Check documentation for replacement.")
    
    def _get_parameter_suggestion(self, signature: Dict[str, Any], param: str) -> str:
        """
        Get suggestion for unknown parameter
        
        Args:
            signature: Function signature
            param: Parameter name
            
        Returns:
            Suggestion string
        """
        # Check for similar parameter names (typos)
        all_params = signature['parameters']
        
        from difflib import get_close_matches
        matches = get_close_matches(param, all_params, n=1, cutoff=0.6)
        
        if matches:
            return f"Did you mean '{matches[0]}'? Valid parameters are: {', '.join(all_params)}"
        else:
            return f"Valid parameters are: {', '.join(all_params)}"
    
    def get_results(self) -> Dict[str, Any]:
        """
        Get validation results
        
        Returns:
            Dictionary with errors and warnings
        """
        return {
            'errors': self.errors,
            'warnings': self.warnings,
            'total_errors': len(self.errors),
            'total_warnings': len(self.warnings)
        }


def validate_lambda_directory(directory: str, signatures: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate all Python files in a directory
    
    Args:
        directory: Directory path
        signatures: Function signatures dictionary
        
    Returns:
        Validation results
    """
    validator = BackendValidator(signatures)
    
    # Find all Python files
    path = Path(directory)
    python_files = list(path.rglob('*.py'))
    
    results = []
    for file_path in python_files:
        # Skip __pycache__ and other build artifacts
        if '__pycache__' in str(file_path) or '.build' in str(file_path):
            continue
        
        result = validator.validate_file(str(file_path))
        results.append(result)
    
    return {
        'files': results,
        'summary': validator.get_results()
    }
