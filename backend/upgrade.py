import re
import os

files = [
    "tests/transactions_tests/test_transactions_mvp.py",
    "tests/transactions_tests/test_transactions_polish.py"
]

for path in files:
    if not os.path.exists(path): continue
    with open(path, 'r') as f:
        code = f.read()
    
    # Safely inject the required query parameters into the summary endpoint requests
    code = code.replace(
        'client.get("/transactions/summary")', 
        'client.get("/transactions/summary", params={"month": 5, "year": 2025})'
    )
    
    with open(path, 'w') as f:
        f.write(code)

print("Summary parameters successfully injected!")