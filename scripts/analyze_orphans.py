
import re

log_file = "/var/folders/0r/gf7m1h317vd7mhhqx2d449hc0000gn/T/cline/large-output-1770325822476-vij0uzq.log"

try:
    with open(log_file, "r") as f:
        content = f.read()
    
    # Look for the Detailed Error List section or individual warnings
    # The output format for verbose mode should contain details
    # But since we piped to grep earlier, we might not have captured everything nicely
    # Let's search for "orphaned_route" which is the category code
    
    # Pattern to extract the route from the message
    # Usually: "Orphaned route (no frontend usage found): {route}"
    # But in standardized format it might be "orphaned_route"
    
    # Let's try to find lines with "orphaned_route" and extract the route
    orphaned_routes = []
    
    # Split by lines
    lines = content.splitlines()
    
    # First, look for explicit route listings if they exist
    for i, line in enumerate(lines):
        if "orphaned_route" in line:
            # Look at previous lines for context if needed, or extract from current line
            # In the new format, it might be listed under warnings
            # Let's try to extract from the validation log lines if present
            pass
            
    # Let's look for "Checking for orphaned routes..." and subsequent lines
    # Or look for docstring routes that were found but not matched
    
    # Actually, let's just parse the Lambda routes from the log that were extracted
    # and look for typical patterns we want to exclude
    
    routes = []
    for line in lines:
        if "Found docstring route:" in line:
            match = re.search(r"Found docstring route: (.*)", line)
            if match:
                routes.append(match.group(1))
    
    # Filter potential candidates for whitelisting
    candidates = []
    for route in routes:
        if route.startswith("GET /admin/") or \
           route.startswith("POST /admin/") or \
           route.startswith("PUT /admin/") or \
           route.startswith("DELETE /admin/") or \
           route.startswith("PATCH /admin/"):
            candidates.append(route)
        elif "/webhooks/" in route:
            candidates.append(route)
        elif "/internal/" in route:
            candidates.append(route)
            
    print(f"Found {len(routes)} total routes extracted from docstrings")
    print(f"Potential admin candidates: {len(candidates)}")
    
    # Print top candidates
    for c in sorted(list(set(candidates)))[:50]:
        print(c)
        
except Exception as e:
    print(f"Error: {e}")
