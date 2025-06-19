#!/bin/bash

# Memory Leak Detection Script for RainbowPaws
# Specifically designed to detect Issue #3: Event Listener Memory Leaks

echo "🔍 RainbowPaws Memory Leak Detection - Event Listeners"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_ISSUES=0
CRITICAL_ISSUES=0
WARNINGS=0

echo "Scanning for event listener memory leaks..."

# Check for addEventListener without removeEventListener
echo -e "\n${BLUE}🔍 Checking for unmanaged addEventListener calls...${NC}"

# Find addEventListener patterns
UNMANAGED_LISTENERS=$(grep -r "addEventListener" src/ --include="*.tsx" --include="*.ts" | \
  while IFS= read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    line_num=$(echo "$line" | cut -d: -f2)
    content=$(echo "$line" | cut -d: -f3-)
    
    # Check if there's a corresponding removeEventListener in the same file
    if grep -q "removeEventListener" "$file"; then
      continue
    else
      echo "$line"
    fi
  done)

if [ -n "$UNMANAGED_LISTENERS" ]; then
  echo -e "${RED}❌ Found potentially unmanaged event listeners:${NC}"
  echo "$UNMANAGED_LISTENERS"
  CRITICAL_ISSUES=$((CRITICAL_ISSUES + $(echo "$UNMANAGED_LISTENERS" | wc -l)))
else
  echo -e "${GREEN}✅ No obviously unmanaged event listeners found${NC}"
fi

# Check for specific memory leak patterns in MapComponent
echo -e "\n${BLUE}🗺️ Checking MapComponent.tsx for memory leaks...${NC}"

MAP_COMPONENT="src/components/map/MapComponent.tsx"
if [ -f "$MAP_COMPONENT" ]; then
  # Check if buttonEventListenersRef is used for cleanup
  if grep -q "buttonEventListenersRef" "$MAP_COMPONENT" && grep -q "removeEventListener" "$MAP_COMPONENT"; then
    echo -e "${GREEN}✅ MapComponent: Proper event listener cleanup detected${NC}"
  else
    echo -e "${RED}❌ MapComponent: Missing proper event listener cleanup${NC}"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
  fi
  
  # Check for cloned elements with addEventListener (old pattern)
  if grep -q "cloneNode.*addEventListener" "$MAP_COMPONENT"; then
    echo -e "${RED}❌ MapComponent: Found cloned elements with unmanaged event listeners${NC}"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
  else
    echo -e "${GREEN}✅ MapComponent: No cloned element memory leaks found${NC}"
  fi
else
  echo -e "${YELLOW}⚠️ MapComponent.tsx not found${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

# Check navbar components for proper cleanup
echo -e "\n${BLUE}📱 Checking Navigation components...${NC}"

NAVBARS=(
  "src/components/navigation/FurParentNavbar.tsx"
  "src/components/navigation/CremationNavbar.tsx" 
  "src/components/navigation/AdminNavbar.tsx"
)

for navbar in "${NAVBARS[@]}"; do
  if [ -f "$navbar" ]; then
    navbar_name=$(basename "$navbar" .tsx)
    
    # Check if addEventListener and removeEventListener are balanced
    add_count=$(grep -c "addEventListener" "$navbar" 2>/dev/null || echo "0")
    remove_count=$(grep -c "removeEventListener" "$navbar" 2>/dev/null || echo "0")
    
    if [ "$add_count" -eq "$remove_count" ] && [ "$add_count" -gt 0 ]; then
      echo -e "${GREEN}✅ $navbar_name: Event listeners properly managed ($add_count add / $remove_count remove)${NC}"
    elif [ "$add_count" -gt "$remove_count" ]; then
      echo -e "${RED}❌ $navbar_name: Potential memory leak ($add_count add / $remove_count remove)${NC}"
      CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
    elif [ "$add_count" -eq 0 ]; then
      echo -e "${GREEN}✅ $navbar_name: No event listeners detected${NC}"
    else
      echo -e "${YELLOW}⚠️ $navbar_name: Unusual pattern detected${NC}"
      WARNINGS=$((WARNINGS + 1))
    fi
  else
    echo -e "${YELLOW}⚠️ $navbar not found${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
done

# Check NotificationBell component
echo -e "\n${BLUE}🔔 Checking NotificationBell component...${NC}"

NOTIFICATION_BELL="src/components/ui/NotificationBell.tsx"
if [ -f "$NOTIFICATION_BELL" ]; then
  # Check for proper useEffect cleanup
  if grep -A 10 "useEffect.*\[\]" "$NOTIFICATION_BELL" | grep -q "return.*removeEventListener"; then
    echo -e "${GREEN}✅ NotificationBell: Proper cleanup in useEffect detected${NC}"
  elif grep -q "removeEventListener" "$NOTIFICATION_BELL"; then
    echo -e "${GREEN}✅ NotificationBell: Event listener cleanup detected${NC}"
  else
    echo -e "${RED}❌ NotificationBell: No event listener cleanup found${NC}"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
  fi
else
  echo -e "${YELLOW}⚠️ NotificationBell.tsx not found${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

# Check for window/document level listeners
echo -e "\n${BLUE}🌐 Checking for global event listeners...${NC}"

GLOBAL_LISTENERS=$(grep -r "window\.addEventListener\|document\.addEventListener" src/ --include="*.tsx" --include="*.ts" | grep -v "removeEventListener")

if [ -n "$GLOBAL_LISTENERS" ]; then
  echo -e "${YELLOW}⚠️ Found global event listeners (verify cleanup):${NC}"
  echo "$GLOBAL_LISTENERS" | head -10
  if [ $(echo "$GLOBAL_LISTENERS" | wc -l) -gt 10 ]; then
    echo "... and $(($(echo "$GLOBAL_LISTENERS" | wc -l) - 10)) more"
  fi
  WARNINGS=$((WARNINGS + $(echo "$GLOBAL_LISTENERS" | wc -l)))
else
  echo -e "${GREEN}✅ No unmanaged global event listeners found${NC}"
fi

# Check for React useEffect cleanup patterns
echo -e "\n${BLUE}⚛️ Checking React useEffect cleanup patterns...${NC}"

MISSING_CLEANUP=$(grep -r "useEffect.*addEventListener" src/ --include="*.tsx" --include="*.ts" | \
  while IFS= read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    
    # Check if this useEffect has a cleanup function
    if ! grep -A 20 "useEffect.*addEventListener" "$file" | grep -q "return.*=>.*removeEventListener"; then
      echo "$line"
    fi
  done)

if [ -n "$MISSING_CLEANUP" ]; then
  echo -e "${RED}❌ Found useEffect with addEventListener but no cleanup:${NC}"
  echo "$MISSING_CLEANUP"
  CRITICAL_ISSUES=$((CRITICAL_ISSUES + $(echo "$MISSING_CLEANUP" | wc -l)))
else
  echo -e "${GREEN}✅ All useEffect with addEventListener have proper cleanup${NC}"
fi

# Calculate total issues
TOTAL_ISSUES=$((CRITICAL_ISSUES + WARNINGS))

# Summary
echo -e "\n${BLUE}=================================================="
echo -e "📊 MEMORY LEAK DETECTION SUMMARY"
echo -e "==================================================${NC}"

if [ $CRITICAL_ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}🎉 EXCELLENT! No event listener memory leaks detected!${NC}"
  echo -e "${GREEN}✅ All components properly manage event listeners${NC}"
  echo -e "${GREEN}✅ Ready for production deployment${NC}"
elif [ $CRITICAL_ISSUES -eq 0 ]; then
  echo -e "${YELLOW}⚠️ GOOD: No critical memory leaks, but some warnings found${NC}"
  echo -e "${YELLOW}📋 $WARNINGS warning(s) need review${NC}"
  echo -e "${GREEN}✅ Safe for production with monitoring${NC}"
else
  echo -e "${RED}🚨 CRITICAL: Memory leaks detected!${NC}"
  echo -e "${RED}❌ $CRITICAL_ISSUES critical issue(s) MUST be fixed${NC}"
  echo -e "${YELLOW}⚠️ $WARNINGS warning(s) should be reviewed${NC}"
  echo -e "${RED}🚫 NOT ready for production${NC}"
fi

echo ""
echo -e "${BLUE}Issue Breakdown:${NC}"
echo -e "Critical Issues: ${RED}$CRITICAL_ISSUES${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo -e "Total Issues: $TOTAL_ISSUES"

echo ""
echo -e "${BLUE}Next Steps:${NC}"
if [ $CRITICAL_ISSUES -gt 0 ]; then
  echo "1. Fix critical event listener memory leaks"
  echo "2. Implement proper cleanup in useEffect hooks"
  echo "3. Add removeEventListener for all addEventListener calls"
  echo "4. Re-run this script to verify fixes"
fi

if [ $WARNINGS -gt 0 ]; then
  echo "1. Review warning items for potential improvements"
  echo "2. Consider implementing event listener monitoring"
  echo "3. Add integration tests for memory leak prevention"
fi

if [ $TOTAL_ISSUES -eq 0 ]; then
  echo "1. Continue monitoring for new memory leaks"
  echo "2. Add this script to CI/CD pipeline"
  echo "3. Proceed with Issue #4: Timer/Interval Memory Leaks"
fi

echo ""
echo -e "${BLUE}Memory Leak Prevention Tips:${NC}"
echo "• Always pair addEventListener with removeEventListener"
echo "• Use useEffect cleanup functions for React components"
echo "• Track event listeners in refs for complex components"
echo "• Test component unmounting in development"
echo "• Use React Developer Tools Profiler for memory monitoring"

# Exit with appropriate code
if [ $CRITICAL_ISSUES -gt 0 ]; then
  exit 1
else
  exit 0
fi 