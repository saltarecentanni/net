#!/usr/bin/env python3
"""
TIESSE Matrix Network - Comprehensive Validation Script
Validates:
1. No more color strings in JavaScript files
2. All CSS display rules are correct
3. All HTML elements are properly defined
4. All JavaScript modules are syntactically correct
"""

import os
import re
import sys
from pathlib import Path

class Colors:
    OK = '\033[92m'
    FAIL = '\033[91m'
    WARN = '\033[93m'
    INFO = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_result(status, message):
    """Print a colored result message"""
    if status == 'pass':
        print(f"{Colors.OK}✓ PASS{Colors.END}: {message}")
    elif status == 'fail':
        print(f"{Colors.FAIL}✗ FAIL{Colors.END}: {message}")
    elif status == 'warn':
        print(f"{Colors.WARN}⚠ WARN{Colors.END}: {message}")
    elif status == 'info':
        print(f"{Colors.INFO}ℹ INFO{Colors.END}: {message}")

def check_color_strings(directory):
    """Check for problematic color string patterns in JavaScript files"""
    print(f"\n{Colors.BOLD}1. Checking for Color String Issues{Colors.END}\n")
    
    issues = []
    js_files = list(Path(directory).glob('js/*.js'))
    
    # Pattern to find color strings like 'DashboardColors.xxx' or 'AppColors.xxx'
    pattern = r"['\"](?:Dashboard|App|Feature|Device|UI|FloorPlan)Colors\.[a-zA-Z0-9]+['\"]"
    
    for js_file in js_files:
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
                
            matches = re.finditer(pattern, content)
            for match in matches:
                # Find line number
                line_num = content[:match.start()].count('\n') + 1
                issues.append({
                    'file': js_file.name,
                    'line': line_num,
                    'text': match.group(0),
                    'context': lines[line_num - 1].strip() if line_num <= len(lines) else ''
                })
        except Exception as e:
            print_result('fail', f"Error reading {js_file.name}: {str(e)}")
    
    if issues:
        print_result('fail', f"Found {len(issues)} problematic color string(s)")
        for issue in issues[:10]:  # Show first 10
            print(f"  {issue['file']}:{issue['line']}")
            print(f"    Found: {issue['text']}")
            print(f"    Line: {issue['context'][:80]}")
        if len(issues) > 10:
            print(f"  ... and {len(issues) - 10} more")
        return False
    else:
        print_result('pass', "No problematic color strings found in JavaScript files")
        return True

def check_css_rules(css_file):
    """Check if CSS display rules are properly defined"""
    print(f"\n{Colors.BOLD}2. Checking CSS Display Rules{Colors.END}\n")
    
    try:
        with open(css_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for .tab-content { display: none; }
        if re.search(r'\.tab-content\s*{\s*display:\s*none', content):
            print_result('pass', ".tab-content { display: none; } rule found")
            tab_none = True
        else:
            print_result('fail', ".tab-content { display: none; } rule NOT found")
            tab_none = False
        
        # Check for .tab-content.active { display: block; }
        if re.search(r'\.tab-content\.active\s*{\s*display:\s*block', content):
            print_result('pass', ".tab-content.active { display: block; } rule found")
            tab_active = True
        else:
            print_result('fail', ".tab-content.active { display: block; } rule NOT found")
            tab_active = False
        
        return tab_none and tab_active
    except Exception as e:
        print_result('fail', f"Error reading CSS file: {str(e)}")
        return False

def check_html_structure(html_file):
    """Check if all required HTML elements are present"""
    print(f"\n{Colors.BOLD}3. Checking HTML Structure{Colors.END}\n")
    
    required_elements = {
        'tab-dashboard': 'Dashboard tab button',
        'tab-devices': 'Devices tab button',
        'tab-active': 'Active tab button',
        'tab-matrix': 'Matrix tab button',
        'tab-floorplan': 'FloorPlan tab button',
        'content-dashboard': 'Dashboard content div',
        'content-devices': 'Devices content div',
        'content-active': 'Active content div',
        'content-matrix': 'Matrix content div',
        'content-floorplan': 'FloorPlan content div',
        'devicesListContainer': 'Devices list container',
        'connectionsListContainer': 'Connections list container',
        'chartByType': 'Chart by type',
        'chartByStatus': 'Chart by status',
        'chartByRoom': 'Chart by room'
    }
    
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        missing = []
        found = []
        
        for element_id, description in required_elements.items():
            if f'id="{element_id}"' in content or f"id='{element_id}'" in content:
                found.append(element_id)
            else:
                missing.append((element_id, description))
        
        print_result('pass', f"Found {len(found)}/{len(required_elements)} required elements")
        
        if missing:
            print_result('warn', f"Missing {len(missing)} elements:")
            for elem_id, description in missing:
                print(f"  - {elem_id} ({description})")
            return False
        else:
            print_result('pass', "All required HTML elements are present")
            return True
    except Exception as e:
        print_result('fail', f"Error reading HTML file: {str(e)}")
        return False

def check_js_syntax(directory):
    """Check JavaScript syntax (basic check for balanced braces)"""
    print(f"\n{Colors.BOLD}4. Checking JavaScript Syntax{Colors.END}\n")
    
    js_files = list(Path(directory).glob('js/*.js'))
    all_good = True
    
    for js_file in js_files:
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Simple brace matching
            open_braces = content.count('{') - content.count('}')
            open_brackets = content.count('[') - content.count(']')
            open_parens = content.count('(') - content.count(')')
            
            if open_braces == 0 and open_brackets == 0 and open_parens == 0:
                print_result('pass', f"{js_file.name}: Braces balanced")
            else:
                print_result('fail', f"{js_file.name}: Imbalanced ({open_braces} {{}}, {open_brackets} [], {open_parens} ())")
                all_good = False
        except Exception as e:
            print_result('fail', f"Error checking {js_file.name}: {str(e)}")
            all_good = False
    
    return all_good

def check_modules(js_file):
    """Check if all required modules are defined"""
    print(f"\n{Colors.BOLD}5. Checking Module Definitions{Colors.END}\n")
    
    required_modules = {
        'AppColors': 'js/app.js',
        'DashboardColors': 'js/dashboard.js',
        'Dashboard': 'js/dashboard.js',
        'FloorPlan': 'js/floorplan.js',
        'MI': 'js/icons.js',
        'appState': 'js/app.js',
        'switchTab': 'js/app.js'
    }
    
    found = {}
    
    for module, expected_file in required_modules.items():
        expected_path = Path(js_file).parent / expected_file
        if expected_path.exists():
            try:
                with open(expected_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Look for module definition
                patterns = [
                    rf'var {module}\s*=',
                    rf'const {module}\s*=',
                    rf'function {module}\s*\(',
                ]
                
                found_module = any(re.search(p, content) for p in patterns)
                
                if found_module:
                    print_result('pass', f"{module} is defined in {expected_file}")
                else:
                    print_result('warn', f"{module} may not be properly defined in {expected_file}")
            except Exception as e:
                print_result('fail', f"Error checking {expected_file}: {str(e)}")
        else:
            print_result('fail', f"Expected file not found: {expected_file}")

def main():
    matrix_dir = Path(__file__).parent
    
    print(f"\n{Colors.BOLD}{Colors.INFO}TIESSE Matrix Network - Validation Report{Colors.END}")
    print(f"Checking directory: {matrix_dir}\n")
    print("=" * 70)
    
    results = {}
    
    # Run checks
    results['color_strings'] = check_color_strings(str(matrix_dir))
    results['css_rules'] = check_css_rules(str(matrix_dir / 'css' / 'styles.css'))
    results['html_structure'] = check_html_structure(str(matrix_dir / 'index.html'))
    results['js_syntax'] = check_js_syntax(str(matrix_dir))
    check_modules(str(matrix_dir / 'js' / 'app.js'))
    
    # Summary
    print(f"\n{'=' * 70}")
    print(f"\n{Colors.BOLD}Summary:{Colors.END}")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for check, result in results.items():
        status = 'pass' if result else 'fail'
        check_name = check.replace('_', ' ').title()
        print_result(status, f"{check_name}: {'PASS' if result else 'FAIL'}")
    
    print(f"\nTotal: {Colors.OK}{passed}/{total}{Colors.END} checks passed")
    
    if passed == total:
        print(f"\n{Colors.OK}{Colors.BOLD}ALL CHECKS PASSED! ✓{Colors.END}")
        return 0
    else:
        print(f"\n{Colors.FAIL}{Colors.BOLD}Some checks failed. Please review above.{Colors.END}")
        return 1

if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print(f"\n\n{Colors.WARN}Validation cancelled by user.{Colors.END}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.FAIL}Unexpected error: {str(e)}{Colors.END}")
        sys.exit(1)
