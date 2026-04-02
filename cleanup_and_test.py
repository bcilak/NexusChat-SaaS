#!/usr/bin/env python
import os
import shutil
import sys
import subprocess

os.chdir(r'C:\Users\Baris\Desktop\Dosyalar\Newbot')

print("=" * 60)
print("CLEANUP AND TEST OPERATIONS")
print("=" * 60)

# 1. Remove __pycache__ directories
print("\n[1/4] Removing __pycache__ directories...")
count = 0
for root, dirs, files in os.walk('.'):
    if '__pycache__' in dirs:
        try:
            pycache_path = os.path.join(root, '__pycache__')
            shutil.rmtree(pycache_path)
            print(f"  ✓ Removed: {pycache_path}")
            count += 1
        except Exception as e:
            print(f"  ✗ Error: {e}")

if count == 0:
    print("  (No __pycache__ directories found)")
else:
    print(f"  Total removed: {count}")

# 2. Remove .pytest_cache
print("\n[2/4] Removing .pytest_cache...")
if os.path.exists('.pytest_cache'):
    try:
        shutil.rmtree('.pytest_cache')
        print("  ✓ Removed: .pytest_cache")
    except Exception as e:
        print(f"  ✗ Error: {e}")
else:
    print("  (Not found)")

# 3. Test slowapi import
print("\n[3/4] Testing slowapi import...")
try:
    import slowapi
    print("  ✓ slowapi import: OK")
except ImportError as e:
    print(f"  ✗ slowapi import: FAILED")
    print(f"     Error: {e}")
    sys.exit(1)

# 4. Run pytest
print("\n[4/4] Running pytest tests/test_security.py...")
result = subprocess.run(
    [sys.executable, "-m", "pytest", "tests/test_security.py", "-v"],
    capture_output=False
)

print("\n" + "=" * 60)
print("OPERATIONS COMPLETED")
print("=" * 60)

sys.exit(result.returncode)
