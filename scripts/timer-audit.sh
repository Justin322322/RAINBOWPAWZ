#!/bin/bash

# Timer Memory Leak Audit Script
# Scans for setTimeout/setInterval usage that may cause memory leaks

echo "🔍 Timer Memory Leak Audit - Issue #4"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
total_timers=0
potential_leaks=0
safe_timers=0

echo -e "${BLUE}Scanning for setTimeout/setInterval usage...${NC}\n"

# Function to check a file for timer leaks
check_file() {
    local file="$1"
    local file_issues=0
    
    # Skip node_modules and .git directories
    if [[ "$file" == *"node_modules"* ]] || [[ "$file" == *".git"* ]]; then
        return 0
    fi
    
    # Find setTimeout/setInterval usage
    local timer_lines=$(grep -n "setTimeout\|setInterval" "$file" 2>/dev/null)
    
    if [ -n "$timer_lines" ]; then
        echo -e "${YELLOW}📁 Checking: $file${NC}"
        
        while IFS= read -r line; do
            local line_num=$(echo "$line" | cut -d':' -f1)
            local content=$(echo "$line" | cut -d':' -f2-)
            
            ((total_timers++))
            
            # Check if this timer has proper cleanup
            local has_cleanup=false
            local cleanup_pattern=""
            
            # Look for clearTimeout/clearInterval in the same file
            if echo "$content" | grep -q "setTimeout"; then
                if grep -q "clearTimeout" "$file"; then
                    # Check if it's in a useEffect return function
                    local context=$(sed -n "$((line_num-5)),$((line_num+10))p" "$file")
                    if echo "$context" | grep -q "return.*clearTimeout\|clearTimeout.*}" || 
                       echo "$context" | grep -q "useEffect.*return\|cleanup\|unmount"; then
                        has_cleanup=true
                        cleanup_pattern="clearTimeout"
                    fi
                fi
            elif echo "$content" | grep -q "setInterval"; then
                if grep -q "clearInterval" "$file"; then
                    local context=$(sed -n "$((line_num-5)),$((line_num+10))p" "$file")
                    if echo "$context" | grep -q "return.*clearInterval\|clearInterval.*}" || 
                       echo "$context" | grep -q "useEffect.*return\|cleanup\|unmount"; then
                        has_cleanup=true
                        cleanup_pattern="clearInterval"
                    fi
                fi
            fi
            
            # Report findings
            if [ "$has_cleanup" = true ]; then
                echo -e "  ${GREEN}✅ Line $line_num: Safe timer with $cleanup_pattern${NC}"
                ((safe_timers++))
            else
                echo -e "  ${RED}❌ Line $line_num: POTENTIAL LEAK - No cleanup found${NC}"
                echo -e "     ${content}"
                ((potential_leaks++))
                ((file_issues++))
            fi
            
        done <<< "$timer_lines"
        
        if [ $file_issues -gt 0 ]; then
            echo -e "  ${RED}⚠️  $file_issues potential memory leaks in this file${NC}"
        fi
        echo ""
    fi
}

# Scan all TypeScript and JavaScript files
echo "Scanning src/ directory..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) | while read -r file; do
    check_file "$file"
done

echo -e "${BLUE}=== TIMER AUDIT SUMMARY ===${NC}"
echo -e "Total timers found: ${YELLOW}$total_timers${NC}"
echo -e "Safe timers (with cleanup): ${GREEN}$safe_timers${NC}"
echo -e "Potential memory leaks: ${RED}$potential_leaks${NC}"

if [ $potential_leaks -gt 0 ]; then
    echo -e "\n${RED}⚠️  MEMORY LEAK RISK: $potential_leaks timers without proper cleanup${NC}"
    echo -e "🔧 Fix Pattern:"
    echo -e "   ${YELLOW}useEffect(() => {${NC}"
    echo -e "   ${YELLOW}     const timer = setTimeout(() => { /* logic */ }, delay);${NC}"
    echo -e "   ${YELLOW}     return () => clearTimeout(timer);${NC}"
    echo -e "   ${YELLOW}   }, [dependencies]);${NC}"
    exit 1
else
    echo -e "\n${GREEN}✅ All timers have proper cleanup! No memory leaks detected.${NC}"
    exit 0
fi 