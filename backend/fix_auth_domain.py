import os, re

files_to_fix = ["tests/conftest.py", "tests/auth_tests/test_auth.py"]

for f in files_to_fix:
    if os.path.exists(f):
        with open(f, 'r') as file:
            code = file.read()
        
        # Aggressively replace any @domain.com/dev/net with @gmail.com
        code = re.sub(r'@[a-zA-Z0-9.-]+\.(com|dev|net|org)', '@gmail.com', code)
        
        with open(f, 'w') as file:
            file.write(code)

print("Auth email domains safely updated to @gmail.com!")
