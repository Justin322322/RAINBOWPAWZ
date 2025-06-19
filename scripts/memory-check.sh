#!/bin/bash

# 🧠 RainbowPaws Memory Leak Detection Script
# This script checks for potential memory leaks in React components

echo "🧠 RainbowPaws Memory Leak Detection"
echo "===================================="

# Initialize counters
memory_issues=0
potential_issues=0

# Function to report issues
report_memory_issue() {
    echo "❌ $1"
    ((memory_issues++))
}

report_potential_issue() {
    echo "⚠️  $1"
    ((potential_issues++))
}

report_success() {
    echo "✅ $1"
}

# Check 1: addEventListener without removeEventListener
echo "👂 Checking event listeners..."
echo "--------------------------------"

files_with_listeners=$(grep -r "addEventListener" src/ --include="*.ts" --include="*.tsx" -l)
listener_issues=0

for file in $files_with_listeners; do
    if ! grep -q "removeEventListener" "$file"; then
        report_memory_issue "Event listener without cleanup: $file"
        ((listener_issues++))
    fi
done

if [ "$listener_issues" -eq 0 ]; then
    report_success "All event listeners have proper cleanup"
fi

# Check 2: setTimeout/setInterval without cleanup
echo ""
echo "⏰ Checking timers and intervals..."
echo "-----------------------------------"

files_with_timers=$(grep -r "setTimeout\|setInterval" src/ --include="*.ts" --include="*.tsx" -l)
timer_issues=0

for file in $files_with_timers; do
    has_settimeout=$(grep -q "setTimeout" "$file" && echo "yes" || echo "no")
    has_setinterval=$(grep -q "setInterval" "$file" && echo "yes" || echo "no")
    has_cleartimeout=$(grep -q "clearTimeout" "$file" && echo "yes" || echo "no")
    has_clearinterval=$(grep -q "clearInterval" "$file" && echo "yes" || echo "no")
    
    if [ "$has_settimeout" = "yes" ] && [ "$has_cleartimeout" = "no" ]; then
        report_memory_issue "setTimeout without clearTimeout: $file"
        ((timer_issues++))
    fi
    
    if [ "$has_setinterval" = "yes" ] && [ "$has_clearinterval" = "no" ]; then
        report_memory_issue "setInterval without clearInterval: $file"
        ((timer_issues++))
    fi
done

if [ "$timer_issues" -eq 0 ]; then
    report_success "All timers have proper cleanup"
fi

# Check 3: useEffect without cleanup function
echo ""
echo "🔄 Checking useEffect cleanup..."
echo "--------------------------------"

effect_issues=0
files_with_effects=$(grep -r "useEffect" src/ --include="*.ts" --include="*.tsx" -l)

for file in $files_with_effects; do
    # Count useEffect calls
    effect_count=$(grep -c "useEffect" "$file")
    
    # Count cleanup functions (return statements in useEffect)
    cleanup_count=$(grep -A 10 "useEffect" "$file" | grep -c "return () =>")
    
    # This is a heuristic check - not perfect but gives an indication
    if [ "$effect_count" -gt "$cleanup_count" ] && [ "$effect_count" -gt 1 ]; then
        report_potential_issue "Potential missing cleanup in useEffect: $file ($effect_count effects, $cleanup_count cleanups)"
        ((effect_issues++))
    fi
done

if [ "$effect_issues" -eq 0 ]; then
    report_success "useEffect cleanup appears proper"
fi

# Check 4: AbortController usage
echo ""
echo "🛑 Checking AbortController usage..."
echo "------------------------------------"

abort_files=$(grep -r "AbortController" src/ --include="*.ts" --include="*.tsx" -l)
abort_issues=0

for file in $abort_files; do
    if ! grep -q "abort()" "$file"; then
        report_potential_issue "AbortController created but abort() not called: $file"
        ((abort_issues++))
    fi
done

if [ "$abort_issues" -eq 0 ] && [ -n "$abort_files" ]; then
    report_success "AbortController usage appears correct"
elif [ -z "$abort_files" ]; then
    echo "ℹ️  No AbortController usage found"
fi

# Check 5: Subscription patterns without unsubscribe
echo ""
echo "📡 Checking subscription patterns..."
echo "------------------------------------"

subscription_issues=0
files_with_subscriptions=$(grep -r "subscribe\|on(" src/ --include="*.ts" --include="*.tsx" -l)

for file in $files_with_subscriptions; do
    if ! grep -q "unsubscribe\|off(\|removeListener" "$file"; then
        report_potential_issue "Subscription without unsubscribe: $file"
        ((subscription_issues++))
    fi
done

if [ "$subscription_issues" -eq 0 ] && [ -n "$files_with_subscriptions" ]; then
    report_success "Subscription cleanup appears proper"
elif [ -z "$files_with_subscriptions" ]; then
    echo "ℹ️  No subscription patterns found"
fi

# Check 6: DOM element references
echo ""
echo "🏗️  Checking DOM element references..."
echo "--------------------------------------"

ref_issues=0
files_with_refs=$(grep -r "useRef\|createRef" src/ --include="*.ts" --include="*.tsx" -l)

for file in $files_with_refs; do
    # Check if refs are being cleared in cleanup
    if grep -q "useRef.*HTMLElement\|createRef.*HTMLElement" "$file"; then
        if ! grep -A 10 "return () =>" "$file" | grep -q "\.current = null" > /dev/null 2>&1; then
            report_potential_issue "DOM ref might not be cleared on cleanup: $file"
            ((ref_issues++))
        fi
    fi
done

if [ "$ref_issues" -eq 0 ] && [ -n "$files_with_refs" ]; then
    report_success "DOM reference cleanup appears proper"
fi

# Check 7: Intersection Observer
echo ""
echo "👁️  Checking Intersection Observer usage..."
echo "-------------------------------------------"

observer_files=$(grep -r "IntersectionObserver" src/ --include="*.ts" --include="*.tsx" -l)
observer_issues=0

for file in $observer_files; do
    if ! grep -q "disconnect()\|unobserve()" "$file"; then
        report_memory_issue "IntersectionObserver without disconnect: $file"
        ((observer_issues++))
    fi
done

if [ "$observer_issues" -eq 0 ] && [ -n "$observer_files" ]; then
    report_success "IntersectionObserver cleanup appears proper"
elif [ -z "$observer_files" ]; then
    echo "ℹ️  No IntersectionObserver usage found"
fi

# Check 8: WebSocket connections
echo ""
echo "🔌 Checking WebSocket connections..."
echo "------------------------------------"

websocket_files=$(grep -r "WebSocket\|Socket\.io" src/ --include="*.ts" --include="*.tsx" -l)
websocket_issues=0

for file in $websocket_files; do
    if ! grep -q "close()\|disconnect()" "$file"; then
        report_memory_issue "WebSocket without close: $file"
        ((websocket_issues++))
    fi
done

if [ "$websocket_issues" -eq 0 ] && [ -n "$websocket_files" ]; then
    report_success "WebSocket cleanup appears proper"
elif [ -z "$websocket_files" ]; then
    echo "ℹ️  No WebSocket usage found"
fi

# Detailed Analysis: Show specific problematic patterns
echo ""
echo "🔍 Detailed Pattern Analysis"
echo "============================="

# Find specific setTimeout patterns that might be problematic
echo "⏱️  Potentially problematic setTimeout patterns:"
grep -r "setTimeout" src/ --include="*.ts" --include="*.tsx" -n | while IFS= read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    line_num=$(echo "$line" | cut -d: -f2)
    content=$(echo "$line" | cut -d: -f3-)
    
    # Check if this setTimeout is in a useEffect
    context=$(sed -n "$((line_num-5)),$((line_num+5))p" "$file" 2>/dev/null)
    if echo "$context" | grep -q "useEffect" && ! echo "$context" | grep -q "clearTimeout"; then
        echo "   ⚠️  $file:$line_num - setTimeout in useEffect without cleanup"
    fi
done

# Find setInterval patterns
echo ""
echo "🔄 Potentially problematic setInterval patterns:"
grep -r "setInterval" src/ --include="*.ts" --include="*.tsx" -n | while IFS= read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    line_num=$(echo "$line" | cut -d: -f2)
    content=$(echo "$line" | cut -d: -f3-)
    
    # Check if this setInterval is in a useEffect
    context=$(sed -n "$((line_num-5)),$((line_num+5))p" "$file" 2>/dev/null)
    if echo "$context" | grep -q "useEffect" && ! echo "$context" | grep -q "clearInterval"; then
        echo "   ⚠️  $file:$line_num - setInterval in useEffect without cleanup"
    fi
done

# Summary
echo ""
echo "=================================="
echo "🏁 Memory Leak Detection Summary"
echo "=================================="
echo "Critical Issues: $memory_issues"
echo "Potential Issues: $potential_issues"
echo "Total Concerns: $((memory_issues + potential_issues))"

if [ "$memory_issues" -eq 0 ] && [ "$potential_issues" -eq 0 ]; then
    echo "✅ No memory leak issues detected!"
elif [ "$memory_issues" -eq 0 ]; then
    echo "⚠️  Only potential issues found - review recommended"
else
    echo "❌ Critical memory leak issues need immediate attention!"
fi

echo ""
echo "💡 Recommendations:"
echo "- Always cleanup event listeners in useEffect return function"
echo "- Clear timeouts and intervals in component cleanup"
echo "- Disconnect observers and close connections"
echo "- Set refs to null in cleanup when appropriate"
echo "- Use AbortController for fetch requests"

# Exit with error code if critical issues found
if [ "$memory_issues" -gt 0 ]; then
    exit 1
else
    exit 0
fi 