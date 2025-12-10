"""
Section 508 Accessibility Validator
Main orchestrator that coordinates parsing, validation, and reporting
"""

from typing import List, Dict, Any, Optional
from pathlib import Path

# Try relative imports first (when used as a package), fall back to absolute
try:
    from .parsers.component_parser import ComponentParser
    from .validators.images_validator import ImagesValidator
    from .validators.forms_validator import FormsValidator
    from .validators.links_validator import LinksValidator
    from .validators.structure_validator import StructureValidator
    from .reporter import Reporter, create_summary
    from .rules.baseline_rules import MANUAL_TESTING_REQUIRED
except ImportError:
    from parsers.component_parser import ComponentParser
    from validators.images_validator import ImagesValidator
    from validators.forms_validator import FormsValidator
    from validators.links_validator import LinksValidator
    from validators.structure_validator import StructureValidator
    from reporter import Reporter, create_summary
    from rules.baseline_rules import MANUAL_TESTING_REQUIRED


class A11yValidator:
    """
    Main validator that orchestrates Section 508 accessibility validation.
    
    Features:
    - Scans React/TypeScript files for accessibility issues
    - Validates against ICT Testing Baseline for Web v3.1
    - Maps to WCAG 2.1 Level AA success criteria
    - Reports errors, warnings, and items requiring manual review
    """
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.parser = ComponentParser(verbose=verbose)
        
        # Initialize all validators
        self.validators = [
            ImagesValidator(),
            FormsValidator(),
            LinksValidator(),
            StructureValidator(),
        ]
    
    def validate_directory(self, directory_path: str) -> Dict[str, Any]:
        """
        Validate all React/TypeScript files in a directory.
        
        Args:
            directory_path: Path to directory to validate
            
        Returns:
            Validation results dictionary with errors, warnings, and summary
        """
        if self.verbose:
            print(f"Scanning directory: {directory_path}")
        
        # Parse all files
        parsed_files = self.parser.parse_directory(directory_path)
        
        if self.verbose:
            print(f"Parsed {len(parsed_files)} files")
        
        # Collect all issues
        all_issues = []
        total_components = 0
        
        for file_result in parsed_files:
            file_path = file_result['file_path']
            elements = file_result['elements']
            total_components += len(elements)
            
            if self.verbose:
                print(f"Validating {file_path} ({len(elements)} elements)")
            
            # Run each validator
            for validator in self.validators:
                issues = validator.validate(elements)
                
                # Add file path to each issue
                for issue in issues:
                    issue['file'] = file_path
                    all_issues.append(issue)
        
        # Separate by severity
        errors = [issue for issue in all_issues if issue['severity'] == 'error']
        warnings = [issue for issue in all_issues if issue['severity'] == 'warning']
        info = [issue for issue in all_issues if issue['severity'] == 'info']
        
        # Create summary
        summary = create_summary(all_issues, len(parsed_files), total_components)
        summary['manual_review_required'] = len(MANUAL_TESTING_REQUIRED)
        
        # Determine overall status
        status = 'passed' if len(errors) == 0 else 'failed'
        
        # Build results
        results = {
            'status': status,
            'summary': summary,
            'errors': errors,
            'warnings': warnings,
            'info': info,
            'manual_review': self._create_manual_review_items(),
        }
        
        return results
    
    def validate_file(self, file_path: str) -> Dict[str, Any]:
        """
        Validate a single React/TypeScript file.
        
        Args:
            file_path: Path to file to validate
            
        Returns:
            Validation results dictionary
        """
        if self.verbose:
            print(f"Validating file: {file_path}")
        
        # Parse file
        file_result = self.parser.parse_file(file_path)
        
        if not file_result:
            return {
                'status': 'error',
                'summary': {'files_scanned': 0, 'components_analyzed': 0, 'errors': 0, 'warnings': 0, 'info': 0},
                'errors': [{'message': f'Failed to parse file: {file_path}'}],
                'warnings': [],
                'info': [],
                'manual_review': []
            }
        
        elements = file_result['elements']
        total_components = len(elements)
        
        # Collect all issues
        all_issues = []
        
        # Run each validator
        for validator in self.validators:
            issues = validator.validate(elements)
            
            # Add file path to each issue
            for issue in issues:
                issue['file'] = file_path
                all_issues.append(issue)
        
        # Separate by severity
        errors = [issue for issue in all_issues if issue['severity'] == 'error']
        warnings = [issue for issue in all_issues if issue['severity'] == 'warning']
        info = [issue for issue in all_issues if issue['severity'] == 'info']
        
        # Create summary
        summary = create_summary(all_issues, 1, total_components)
        summary['manual_review_required'] = len(MANUAL_TESTING_REQUIRED)
        
        # Determine overall status
        status = 'passed' if len(errors) == 0 else 'failed'
        
        # Build results
        results = {
            'status': status,
            'summary': summary,
            'errors': errors,
            'warnings': warnings,
            'info': info,
            'manual_review': self._create_manual_review_items(),
        }
        
        return results
    
    def _create_manual_review_items(self) -> List[Dict[str, Any]]:
        """Create manual review items from baseline rules."""
        items = []
        
        for item in MANUAL_TESTING_REQUIRED:
            items.append({
                'baseline_test_id': f"{item['baseline_test']}-ManualReview",
                'baseline_name': item['baseline_name'],
                'wcag_sc': item['wcag_sc'],
                'note': item['reason']
            })
        
        return items


def validate_path(
    path: str,
    output_format: str = 'text',
    output_file: Optional[str] = None,
    verbose: bool = False,
    use_colors: bool = True
) -> Dict[str, Any]:
    """
    Convenience function to validate a file or directory and generate report.
    
    Args:
        path: Path to file or directory to validate
        output_format: Output format ('text', 'json', 'markdown')
        output_file: Optional file path to write report
        verbose: Enable verbose logging
        use_colors: Enable colored output
        
    Returns:
        Validation results dictionary
    """
    validator = A11yValidator(verbose=verbose)
    
    # Determine if path is file or directory
    path_obj = Path(path)
    
    if path_obj.is_file():
        results = validator.validate_file(path)
    elif path_obj.is_dir():
        results = validator.validate_directory(path)
    else:
        raise ValueError(f"Path not found: {path}")
    
    # Generate report
    reporter = Reporter(use_colors=use_colors)
    report = reporter.generate_report(results, output_format, output_file)
    
    if not output_file:
        print(report)
    
    return results


def main():
    """Entry point for direct execution."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python validator.py <path-to-validate>")
        sys.exit(1)
    
    path = sys.argv[1]
    results = validate_path(path, verbose=True)
    
    # Exit with error code if validation failed
    sys.exit(0 if results['status'] == 'passed' else 1)


if __name__ == '__main__':
    main()
