"""
Component Route Metadata Parser

Parses @routes docstrings from admin component files to detect which routes
are called by components. This helps reduce false positive "orphaned route" errors.

Standard format (from docs/standards/01_std_front_ADMIN-COMPONENTS.md):
/**
 * @component ComponentName
 * @description Brief description
 * 
 * @routes
 * - METHOD /path - Description
 * - METHOD /path/{param} - Description
 */
"""

import re
import logging
from typing import Dict, List, Set, Optional
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class ComponentRoute:
    """Represents a route documented in a component's @routes metadata."""
    component_name: str
    component_file: str
    method: str
    path: str
    description: str


class ComponentParser:
    """Parses admin component files for @routes metadata."""
    
    def __init__(self):
        """Initialize component parser."""
        self.component_routes: List[ComponentRoute] = []
        self.components_with_metadata: Set[str] = set()
    
    def parse_component_file(self, file_path: str) -> List[ComponentRoute]:
        """
        Parse a component file to extract @routes metadata.
        
        Args:
            file_path: Path to the component file (.tsx or .ts)
            
        Returns:
            List of ComponentRoute objects
        """
        routes = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find @component and @routes docstring
            # Pattern: /**\n * @component ComponentName\n * @routes\n * - METHOD /path - Description\n */
            docstring_pattern = r'/\*\*\s*\n(?:.*?\n)*?\s*\*\s*@component\s+(\w+)(?:.*?\n)*?\s*\*\s*@routes\s*\n((?:\s*\*\s*-\s+\w+\s+/[^\n]+\n)+)'
            
            match = re.search(docstring_pattern, content, re.MULTILINE)
            
            if match:
                component_name = match.group(1)
                routes_section = match.group(2)
                
                # Parse individual route lines
                # Pattern: - METHOD /path - Description
                route_pattern = r'-\s+(\w+)\s+(/[^\s-]+)\s*-\s*(.+?)(?:\n|$)'
                
                for route_match in re.finditer(route_pattern, routes_section):
                    method = route_match.group(1).upper()
                    path = route_match.group(2).strip()
                    description = route_match.group(3).strip()
                    
                    route = ComponentRoute(
                        component_name=component_name,
                        component_file=file_path,
                        method=method,
                        path=path,
                        description=description
                    )
                    routes.append(route)
                    logger.debug(f"Found route in {component_name}: {method} {path}")
                
                if routes:
                    self.components_with_metadata.add(component_name)
                    logger.info(f"Parsed {len(routes)} routes from component {component_name}")
                else:
                    logger.warning(f"Component {component_name} has @routes tag but no routes documented")
            
        except Exception as e:
            logger.error(f"Failed to parse component file {file_path}: {e}")
        
        return routes
    
    def parse_directory(self, directory: str, pattern: str = "**/components/admin/*.tsx") -> List[ComponentRoute]:
        """
        Parse all admin component files in a directory.
        
        Scans multiple locations:
        - Module admin components: **/components/admin/*.tsx
        - App-shell admin components: **/app/admin/**/*.tsx
        
        Args:
            directory: Directory path
            pattern: Glob pattern for component files (default for module components)
            
        Returns:
            List of all ComponentRoute objects found
        """
        all_routes = []
        path = Path(directory)
        
        # Patterns to scan for admin components with @routes metadata
        patterns = [
            "**/components/admin/*.tsx",  # Module admin components
            "**/components/admin/*.ts",   # Module admin components (TS)
            "**/app/admin/**/*.tsx",      # App-shell admin components (ClientPage, etc.)
            "**/app/admin/**/*.ts",       # App-shell admin components (TS)
        ]
        
        # Find all admin component files across all patterns
        for glob_pattern in patterns:
            for file_path in path.glob(glob_pattern):
                if file_path.is_file():
                    routes = self.parse_component_file(str(file_path))
                    all_routes.extend(routes)
        
        logger.info(f"Parsed directory {directory}: found {len(all_routes)} component routes in {len(self.components_with_metadata)} components")
        
        # Accumulate routes in instance (multiple calls should add, not replace)
        self.component_routes.extend(all_routes)
        
        return all_routes
    
    def get_routes_by_component(self, component_name: str) -> List[ComponentRoute]:
        """Get all routes for a specific component."""
        return [r for r in self.component_routes if r.component_name == component_name]
    
    def get_route_key(self, method: str, path: str) -> str:
        """Generate a route key for lookups (method + normalized path)."""
        # Normalize path parameters {param} format
        normalized_path = self.normalize_path(path)
        return f"{method.upper()} {normalized_path}"
    
    def normalize_path(self, path: str) -> str:
        """
        Normalize path for comparison.
        
        Converts different parameter formats to standard {param} format:
            /admin/org/chat/config -> /admin/org/chat/config
            /admin/org/ai/{providerId} -> /admin/org/ai/{param}
        """
        # Ensure path starts with /
        if not path.startswith('/'):
            path = f"/{path}"

        # Normalize all path parameter names to generic {param}
        # This allows matching paths with different param names:
        # /ws/{id}/members matches /ws/{workspaceId}/members
        path = re.sub(r'\{[^}]+\}', '{param}', path)
        
        return path
    
    def get_component_routes_index(self) -> Dict[str, List[ComponentRoute]]:
        """Build index of component routes by method + path."""
        index = {}
        for route in self.component_routes:
            key = self.get_route_key(route.method, route.path)
            if key not in index:
                index[key] = []
            index[key].append(route)
        return index
    
    def has_component_metadata(self, component_name: str) -> bool:
        """Check if a component has @routes metadata."""
        return component_name in self.components_with_metadata