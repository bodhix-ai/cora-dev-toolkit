"""
Test Phase 1 org_common enhancements

Verifies that the new methods (count, update_many, rpc) are properly exported
and available from the org_common module.
"""
import sys
from pathlib import Path

# Add org_common to path
org_common_path = Path(__file__).parent.parent / 'python'
sys.path.insert(0, str(org_common_path))

def test_imports():
    """Test that all Phase 1 methods can be imported"""
    print("Testing Phase 1 imports...")
    
    try:
        import org_common
        
        # Test that new methods exist
        assert hasattr(org_common, 'count'), "count() method not found"
        assert hasattr(org_common, 'update_many'), "update_many() method not found"
        assert hasattr(org_common, 'rpc'), "rpc() method not found"
        
        # Test that old methods still exist
        assert hasattr(org_common, 'find_one'), "find_one() method not found"
        assert hasattr(org_common, 'find_many'), "find_many() method not found"
        assert hasattr(org_common, 'insert_one'), "insert_one() method not found"
        assert hasattr(org_common, 'update_one'), "update_one() method not found"
        assert hasattr(org_common, 'delete_one'), "delete_one() method not found"
        assert hasattr(org_common, 'delete_many'), "delete_many() method not found"
        
        # Test that methods are callable
        assert callable(org_common.count), "count() is not callable"
        assert callable(org_common.update_many), "update_many() is not callable"
        assert callable(org_common.rpc), "rpc() is not callable"
        
        print("✅ All Phase 1 methods imported successfully")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except AssertionError as e:
        print(f"❌ Assertion error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_method_signatures():
    """Test that methods have correct signatures"""
    print("\nTesting method signatures...")
    
    try:
        import org_common
        import inspect
        
        # Test count() signature
        count_sig = inspect.signature(org_common.count)
        count_params = list(count_sig.parameters.keys())
        assert 'table' in count_params, "count() missing 'table' parameter"
        assert 'filters' in count_params, "count() missing 'filters' parameter"
        assert 'user_jwt' in count_params, "count() missing 'user_jwt' parameter"
        
        # Test update_many() signature
        update_many_sig = inspect.signature(org_common.update_many)
        update_many_params = list(update_many_sig.parameters.keys())
        assert 'table' in update_many_params, "update_many() missing 'table' parameter"
        assert 'filters' in update_many_params, "update_many() missing 'filters' parameter"
        assert 'data' in update_many_params, "update_many() missing 'data' parameter"
        assert 'user_jwt' in update_many_params, "update_many() missing 'user_jwt' parameter"
        
        # Test rpc() signature
        rpc_sig = inspect.signature(org_common.rpc)
        rpc_params = list(rpc_sig.parameters.keys())
        assert 'function_name' in rpc_params, "rpc() missing 'function_name' parameter"
        assert 'params' in rpc_params, "rpc() missing 'params' parameter"
        assert 'user_jwt' in rpc_params, "rpc() missing 'user_jwt' parameter"
        
        print("✅ All method signatures are correct")
        return True
        
    except AssertionError as e:
        print(f"❌ Signature assertion error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_exports():
    """Test that methods are in __all__"""
    print("\nTesting __all__ exports...")
    
    try:
        import org_common
        
        assert 'count' in org_common.__all__, "count not in __all__"
        assert 'update_many' in org_common.__all__, "update_many not in __all__"
        assert 'rpc' in org_common.__all__, "rpc not in __all__"
        
        print("✅ All new methods are properly exported in __all__")
        return True
        
    except AssertionError as e:
        print(f"❌ Export assertion error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("Phase 1 org_common Enhancement Tests")
    print("=" * 60)
    
    results = []
    results.append(test_imports())
    results.append(test_method_signatures())
    results.append(test_exports())
    
    print("\n" + "=" * 60)
    if all(results):
        print("✅ ALL TESTS PASSED - Phase 1 Complete!")
        print("=" * 60)
        return 0
    else:
        print("❌ SOME TESTS FAILED - Please review errors above")
        print("=" * 60)
        return 1


if __name__ == '__main__':
    exit(main())
