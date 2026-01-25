"""Module Toggle Validator - Checks module toggle compliance following module classification standards."""

import re
from pathlib import Path
from typing import List, Dict, Any


class ModuleToggleValidator:
    """Validates modules follow core/functional classification and toggle patterns."""

    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        self.modules_checked = 0
        self.admin_cards_checked = 0
        
    def validate(self) -> Dict[str, Any]:
        """Run validation and return results."""
        # Validate module registry schema files
        self._validate_module_registry_schemas()
        
        # Validate admin cards use useModuleEnabled for functional modules
        self._validate_admin_cards()
        
        # Validate Sidebar uses ModuleGate for functional modules
        self._validate_sidebar_integration()
        
        return {
            "passed": len(self.errors) == 0,
            "errors": self.errors,
            "warnings": self.warnings,
            "summary": {
                "modules_checked": self.modules_checked,
                "admin_cards_checked": self.admin_cards_checked,
                "errors": len(self.errors),
                "warnings": len(self.warnings),
            }
        }
    
    def _validate_module_registry_schemas(self):
        """Validate module registry schema files have correct module_type values."""
        # Core modules that must be marked as 'core'
        core_modules = [
            "module-access",
            "module-ai", 
            "module-ws",
            "module-kb",
            "module-mgmt"
        ]
        
        # Functional modules that must be marked as 'functional'
        functional_modules = [
            "module-chat",  # Hybrid: core for schema, functional for runtime
            "module-eval",
            "module-voice"
        ]
        
        # Find all sys_module_registry schema files
        schema_files = []
        
        # Look in module-mgmt (main registry)
        mgmt_schema = self.project_path / "_modules-core" / "module-mgmt" / "db" / "schema" / "002-sys-module-registry.sql"
        if mgmt_schema.exists():
            schema_files.append(mgmt_schema)
        
        # Check each core module for its own registry entry
        for module_name in core_modules:
            module_schema = self.project_path / "_modules-core" / module_name / "db" / "schema" / "002-sys-module-registry.sql"
            if module_schema.exists():
                schema_files.append(module_schema)
        
        # Check each functional module for its own registry entry
        for module_name in functional_modules:
            module_schema = self.project_path / "_modules-functional" / module_name / "db" / "schema" / "002-sys-module-registry.sql"
            if module_schema.exists():
                schema_files.append(module_schema)
        
        # Validate each schema file
        for schema_file in schema_files:
            self._validate_schema_file(schema_file, core_modules, functional_modules)
    
    def _validate_schema_file(self, schema_path: Path, core_modules: List[str], functional_modules: List[str]):
        """Validate a single schema file's module_type values."""
        try:
            content = schema_path.read_text()
            rel_path = str(schema_path.relative_to(self.project_path))
            
            # Find all INSERT statements for sys_module_registry
            insert_pattern = r"INSERT INTO sys_module_registry\s*\([^)]+\)\s*VALUES\s*\(([^)]+)\)"
            matches = re.finditer(insert_pattern, content, re.IGNORECASE | re.DOTALL)
            
            for match in matches:
                values = match.group(1)
                self.modules_checked += 1
                
                # Extract module_name and module_type from the INSERT
                # Pattern: 'module-name', ..., 'module_type', ...
                module_name_match = re.search(r"'(module-[^']+)'", values)
                module_type_match = re.search(r"'(core|functional)'", values)
                
                if not module_name_match:
                    continue
                    
                module_name = module_name_match.group(1)
                module_type = module_type_match.group(1) if module_type_match else None
                
                # Validate core modules have 'core' type
                if module_name in core_modules:
                    if module_type != 'core':
                        self.errors.append({
                            "file": rel_path,
                            "module": module_name,
                            "message": f"Core module '{module_name}' must have module_type = 'core', found '{module_type}'",
                            "rule": "module-toggle/core-module-type"
                        })
                
                # Validate functional modules have 'functional' type
                if module_name in functional_modules:
                    if module_type != 'functional':
                        self.errors.append({
                            "file": rel_path,
                            "module": module_name,
                            "message": f"Functional module '{module_name}' must have module_type = 'functional', found '{module_type}'",
                            "rule": "module-toggle/functional-module-type"
                        })
                
        except Exception as e:
            self.errors.append({
                "file": str(schema_path),
                "message": f"Error reading schema file: {str(e)}"
            })
    
    def _validate_admin_cards(self):
        """Validate admin card pages use useModuleEnabled for functional modules."""
        # Find admin dashboard pages
        admin_pages = []
        
        # Project stack template admin pages
        sys_admin_page = self.project_path / "_project-stack-template" / "apps" / "web" / "app" / "admin" / "sys" / "SystemAdminClientPage.tsx"
        org_admin_page = self.project_path / "_project-stack-template" / "apps" / "web" / "app" / "admin" / "org" / "OrgAdminClientPage.tsx"
        
        if sys_admin_page.exists():
            admin_pages.append(sys_admin_page)
        if org_admin_page.exists():
            admin_pages.append(org_admin_page)
        
        for page_path in admin_pages:
            self._validate_admin_card_page(page_path)
    
    def _validate_admin_card_page(self, page_path: Path):
        """Validate a single admin card page."""
        try:
            content = page_path.read_text()
            rel_path = str(page_path.relative_to(self.project_path))
            self.admin_cards_checked += 1
            
            # Check for useModuleEnabled import
            has_use_module_enabled_import = bool(
                re.search(r"import\s+\{[^}]*useModuleEnabled[^}]*\}\s+from\s+['\"]@[^'\"]+/module-mgmt['\"]", content)
            )
            
            # Check for functional module admin cards
            functional_module_cards = {
                "ChatAdminCard": "module-chat",
                "EvalAdminCard": "module-eval", 
                "VoiceAdminCard": "module-voice"
            }
            
            for card_name, module_name in functional_module_cards.items():
                # Check if this card is rendered
                if f"<{card_name}" in content:
                    # Check if it's conditionally rendered with useModuleEnabled
                    pattern = rf"const\s+\w+\s*=\s*useModuleEnabled\(['\"]?{module_name}['\"]?\)"
                    has_enabled_check = bool(re.search(pattern, content))
                    
                    # Check if card is wrapped in conditional
                    conditional_pattern = rf"\{{\w+Enabled\s*&&\s*<{card_name}"
                    has_conditional_render = bool(re.search(conditional_pattern, content))
                    
                    if not has_use_module_enabled_import:
                        self.errors.append({
                            "file": rel_path,
                            "card": card_name,
                            "message": f"Admin page renders {card_name} but doesn't import useModuleEnabled",
                            "rule": "module-toggle/admin-card-import"
                        })
                    
                    if not has_enabled_check:
                        self.errors.append({
                            "file": rel_path,
                            "card": card_name,
                            "message": f"Admin page doesn't check if {module_name} is enabled before rendering {card_name}",
                            "rule": "module-toggle/admin-card-check"
                        })
                    
                    if not has_conditional_render:
                        self.errors.append({
                            "file": rel_path,
                            "card": card_name,
                            "message": f"{card_name} is not conditionally rendered based on module enabled state",
                            "rule": "module-toggle/admin-card-conditional"
                        })
            
            # Check that core module cards are NOT conditionally rendered
            core_module_cards = [
                "AccessAdminCard",
                "AIAdminCard",
                "KBAdminCard",
                "MgmtAdminCard",
                "WSAdminCard"
            ]
            
            for card_name in core_module_cards:
                if f"<{card_name}" in content:
                    # Check if it's incorrectly wrapped in conditional
                    conditional_pattern = rf"\{{\w+\s*&&\s*<{card_name}"
                    has_conditional = bool(re.search(conditional_pattern, content))
                    
                    if has_conditional:
                        self.warnings.append({
                            "file": rel_path,
                            "card": card_name,
                            "message": f"Core module card {card_name} should not be conditionally rendered - core modules are always enabled",
                            "rule": "module-toggle/core-card-always-visible"
                        })
        
        except Exception as e:
            self.errors.append({
                "file": str(page_path),
                "message": f"Error reading admin card page: {str(e)}"
            })
    
    def _validate_sidebar_integration(self):
        """Validate Sidebar component uses ModuleGate for functional modules."""
        sidebar_path = self.project_path / "_project-stack-template" / "apps" / "web" / "components" / "Sidebar.tsx"
        
        if not sidebar_path.exists():
            return
        
        try:
            content = sidebar_path.read_text()
            rel_path = str(sidebar_path.relative_to(self.project_path))
            
            # Check for ModuleGate import
            has_module_gate_import = bool(
                re.search(r"import\s+\{[^}]*ModuleGate[^}]*\}\s+from\s+['\"]@[^'\"]+/module-mgmt['\"]", content)
            )
            
            if not has_module_gate_import:
                self.errors.append({
                    "file": rel_path,
                    "message": "Sidebar component doesn't import ModuleGate from module-mgmt",
                    "rule": "module-toggle/sidebar-modulegate-import"
                })
            
            # Check for ModuleGate usage
            has_module_gate_usage = bool(re.search(r"<ModuleGate", content))
            
            if not has_module_gate_usage:
                self.warnings.append({
                    "file": rel_path,
                    "message": "Sidebar component doesn't use ModuleGate for functional module navigation items",
                    "rule": "module-toggle/sidebar-modulegate-usage"
                })
            
            # Check for getModuleFromRoute helper function
            has_module_mapping = bool(
                re.search(r"const getModuleFromRoute", content) or
                re.search(r"routeToModule", content)
            )
            
            if not has_module_mapping and has_module_gate_usage:
                self.warnings.append({
                    "file": rel_path,
                    "message": "Sidebar uses ModuleGate but doesn't have route-to-module mapping helper",
                    "rule": "module-toggle/sidebar-route-mapping"
                })
        
        except Exception as e:
            self.errors.append({
                "file": str(sidebar_path),
                "message": f"Error reading Sidebar component: {str(e)}"
            })