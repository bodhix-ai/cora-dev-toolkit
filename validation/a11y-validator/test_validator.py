#!/usr/bin/env python3
"""
Simple test script to verify the validator works
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from validator import A11yValidator
from reporter import Reporter

def test_validator():
    """Test the validator with a simple example"""
    print("Testing Section 508 Accessibility Validator...")
    print()
    
    # Test with packages directory
    validator = A11yValidator(verbose=True)
    
    # Get the packages path
    packages_path = Path(__file__).parent.parent.parent.parent / "packages"
    
    if packages_path.exists():
        print(f"Validating: {packages_path}")
        print()
        
        results = validator.validate_directory(str(packages_path))
        
        # Generate report
        reporter = Reporter(use_colors=True)
        report = reporter.generate_report(results, 'text')
        print(report)
        
        return results['status'] == 'passed'
    else:
        print(f"Packages directory not found: {packages_path}")
        return False

if __name__ == '__main__':
    success = test_validator()
    sys.exit(0 if success else 1)
