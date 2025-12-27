import json
import os
import re

files = {
    'schema': '/tmp/test7-schema-errors.json',
    'api_tracer': '/tmp/test7-api-errors.json',
    'portability': '/tmp/test7-portability-errors.json'
}

def extract_json(content):
    """Extract JSON object from string that might contain logs."""
    try:
        # Try to find the start of the JSON object
        # It usually starts with { and has "status" or "summary" key early on
        candidates = [m.start() for m in re.finditer(r'^\s*\{', content, re.MULTILINE)]
        
        if not candidates:
            # Fallback to simple search
            start = content.find('{')
            if start != -1:
                candidates = [start]
        
        end = content.rfind('}')
        
        if end != -1:
            for start in candidates:
                if start < end:
                    try:
                        json_str = content[start:end+1]
                        return json.loads(json_str)
                    except json.JSONDecodeError:
                        continue
    except Exception as e:
        print(f"DEBUG: JSON extraction error: {e}")
        pass
    return None

output = []

output.append("# Test7 Detailed Validation Errors\n")
output.append("**Generated:** December 27, 2025, 7:55 AM EST\n")
output.append("**Purpose:** Detailed error catalog for efficient issue resolution in future AI sessions\n")
output.append("**Companion to:** [validation-summary-test7.md](./validation-summary-test7.md)\n\n")
output.append("---\n\n")

# Schema Errors
output.append("## 📊 Schema Validator Errors\n\n")
try:
    with open(files['schema'], 'r') as f:
        content = f.read()
        print(f"DEBUG: Schema content length: {len(content)}")
        schema_data = extract_json(content)
        
        if schema_data:
            error_count = schema_data.get('summary', {}).get('error_count', 0)
            output.append(f"**Total Errors:** {error_count}\n\n")
            
            if 'errors' in schema_data and schema_data['errors']:
                # Group errors by file
                errors_by_file = {}
                for error in schema_data['errors']:
                    file = error.get('file', 'unknown')
                    if file not in errors_by_file:
                        errors_by_file[file] = []
                    errors_by_file[file].append(error)
                
                for file, errors in sorted(errors_by_file.items()):
                    filename = file.split('/')[-1] if '/' in file else file
                    output.append(f"### {filename} ({len(errors)} errors)\n\n")
                    output.append(f"**File:** `{file}`\n\n")
                    
                    for idx, error in enumerate(errors, 1):
                        output.append(f"#### Error {idx}\n")
                        output.append(f"- **Line:** {error.get('line', 'N/A')}\n")
                        output.append(f"- **Severity:** {error.get('severity', 'error')}\n")
                        output.append(f"- **Table:** {error.get('table', 'N/A')}\n")
                        output.append(f"- **Column:** {error.get('column', 'N/A')}\n")
                        output.append(f"- **Issue:** {error.get('issue', 'N/A')}\n")
                        output.append(f"- **Suggestion:** {error.get('suggestion', 'N/A')}\n\n")
            else:
                output.append("✅ No schema errors found.\n\n")
        else:
             output.append("Could not parse schema validator output.\n\n")

except Exception as e:
    output.append(f"Error reading schema validator: {e}\n\n")

# API Tracer Errors
output.append("---\n\n")
output.append("## 🔗 API Tracer Errors\n\n")
try:
    with open(files['api_tracer'], 'r') as f:
        content = f.read()
        api_data = extract_json(content)
        
        if api_data:
            error_count = api_data.get('summary', {}).get('errors', 0)
            output.append(f"**Total Errors:** {error_count}\n\n")
            
            if 'errors' in api_data and api_data['errors']:
                for idx, error in enumerate(api_data['errors'], 1):
                    output.append(f"### Error {idx}: {error.get('mismatch_type', 'Unknown')}\n")
                    output.append(f"- **Severity:** {error.get('severity', 'error')}\n")
                    output.append(f"- **Type:** {error.get('mismatch_type', 'N/A')}\n")
                    output.append(f"- **Endpoint:** `{error.get('endpoint', 'N/A')}`\n")
                    output.append(f"- **Method:** {error.get('method', 'N/A')}\n")
                    output.append(f"- **Frontend File:** `{error.get('frontend_file', 'N/A')}:{error.get('frontend_line', 'N/A')}`\n")
                    output.append(f"- **Details:** {error.get('details', 'N/A')}\n")
                    output.append(f"- **Issue:** {error.get('issue', 'N/A')}\n")
                    output.append(f"- **Suggestion:** {error.get('suggestion', 'Check route configuration')}\n\n")
            else:
                output.append("✅ No API tracer errors found.\n\n")
        else:
            output.append("Could not parse API tracer output.\n\n")

except Exception as e:
    output.append(f"Error reading API tracer: {e}\n\n")

# Portability Errors
output.append("---\n\n")
output.append("## 🌐 Portability Validator Errors\n\n")
try:
    with open(files['portability'], 'r') as f:
        content = f.read()
        port_data = extract_json(content)
        
        if port_data:
            if 'errors' in port_data:
                errors = port_data['errors']
                output.append(f"**Total Errors:** {len(errors)}\n\n")
                
                # Group by file
                errors_by_file = {}
                for error in errors:
                    file = error.get('file', 'unknown')
                    if file not in errors_by_file:
                        errors_by_file[file] = []
                    errors_by_file[file].append(error)
                
                for file, file_errors in sorted(errors_by_file.items()):
                    filename = file.split('/')[-1] if '/' in file else file
                    output.append(f"### {filename} ({len(file_errors)} errors)\n\n")
                    output.append(f"**File:** `{file}`\n\n")
                    
                    for idx, error in enumerate(file_errors, 1):
                        output.append(f"#### Error {idx}\n")
                        output.append(f"- **Line:** {error.get('line', 'N/A')}\n")
                        output.append(f"- **Severity:** {error.get('severity', 'error')}\n")
                        output.append(f"- **Type:** {error.get('type', 'N/A')}\n")
                        output.append(f"- **Issue:** {error.get('issue', 'N/A')}\n")
                        output.append(f"- **Hardcoded Value:** `{error.get('matched_value', 'N/A')}`\n")
                        output.append(f"- **Suggestion:** {error.get('suggestion', 'N/A')}\n\n")
            else:
                 output.append("✅ No portability errors found.\n\n")
        else:
             output.append("Could not parse portability validator output.\n\n")

except Exception as e:
    output.append(f"Error reading portability validator: {e}\n\n")

# Write output
with open('docs/validation-errors-test7-detailed.md', 'w') as f:
    f.write(''.join(output))

print("✅ Created docs/validation-errors-test7-detailed.md")
