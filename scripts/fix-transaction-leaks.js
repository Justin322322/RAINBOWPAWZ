#!/usr/bin/env node

/**
 * Script to identify and help fix database connection leaks in API routes
 * that use manual transaction management.
 * 
 * This script scans for problematic patterns and suggests fixes.
 */

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '../src/app/api');

// Files that have been identified as having transaction issues
const PROBLEMATIC_FILES = [
  'src/app/api/users/[id]/restrict/route.ts',
  'src/app/api/users/[id]/role/route.ts', 
  'src/app/api/packages/[id]/route.ts',
  'src/app/api/packages/route.ts',
  'src/app/api/auth/register/route.ts',
  'src/app/api/cart-bookings/route.ts',
  'src/app/api/cremation/bookings/route.ts',
  'src/app/api/cremation/availability/batch/route.ts',
  'src/app/api/cremation/availability/timeslot/route.ts',
  'src/app/api/cremation/availability/route.ts',
  'src/app/api/admin/profile/route.ts',
  'src/app/api/admin/create/route.ts'
];

function analyzeFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  
  const issues = [];
  let hasStartTransaction = false;
  let hasCommit = false;
  let hasRollback = false;
  let hasQueryImport = false;
  let hasWithTransactionImport = false;
  
  // Check for problematic patterns
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    if (line.includes("import { query }") || line.includes("from '@/lib/db'")) {
      hasQueryImport = true;
      
      if (line.includes('withTransaction')) {
        hasWithTransactionImport = true;
      }
    }
    
    if (line.includes('START TRANSACTION') || line.includes('BEGIN')) {
      hasStartTransaction = true;
      issues.push({
        line: lineNum,
        type: 'TRANSACTION_START',
        content: line.trim(),
        severity: 'HIGH'
      });
    }
    
    if (line.includes('COMMIT')) {
      hasCommit = true;
      issues.push({
        line: lineNum,
        type: 'COMMIT',
        content: line.trim(),
        severity: 'HIGH'
      });
    }
    
    if (line.includes('ROLLBACK')) {
      hasRollback = true;
      issues.push({
        line: lineNum,
        type: 'ROLLBACK',
        content: line.trim(),
        severity: 'HIGH'
      });
    }
  });
  
  // Determine if this file has transaction issues
  const hasTransactionIssues = hasStartTransaction || hasCommit || hasRollback;
  
  if (hasTransactionIssues) {
    console.log(`\n🚨 CRITICAL ISSUE FOUND: ${filePath}`);
    console.log('   This file uses manual transaction management with separate query() calls!');
    console.log('   This causes connection leaks because each query() gets a different connection.');
    
    console.log('\n   📍 Issues found:');
    issues.forEach(issue => {
      console.log(`      Line ${issue.line}: ${issue.type} - ${issue.content}`);
    });
    
    if (!hasWithTransactionImport) {
      console.log('\n   🔧 RECOMMENDED FIX:');
      console.log('      1. Update import: import { query, withTransaction } from "@/lib/db"');
      console.log('      2. Replace manual transaction with withTransaction() pattern');
      console.log('      3. Remove START TRANSACTION, COMMIT, ROLLBACK calls');
      console.log('\n   📝 Example:');
      console.log('      // OLD (BROKEN):');
      console.log('      await query("START TRANSACTION");');
      console.log('      await query("INSERT...");');
      console.log('      await query("UPDATE...");');
      console.log('      await query("COMMIT");');
      console.log('');
      console.log('      // NEW (FIXED):');
      console.log('      await withTransaction(async (transaction) => {');
      console.log('        await transaction.query("INSERT...");');
      console.log('        await transaction.query("UPDATE...");');
      console.log('        return result;');
      console.log('      });');
    } else {
      console.log('\n   ✅ Good: File already imports withTransaction');
      console.log('      Still needs manual conversion of transaction calls');
    }
    
    return true; // Has issues
  }
  
  return false; // No issues
}

function main() {
  console.log('🔍 DATABASE CONNECTION LEAK SCANNER');
  console.log('=====================================');
  console.log('Scanning for manual transaction management that causes connection leaks...\n');
  
  let totalIssues = 0;
  let filesScanned = 0;
  
  // Scan known problematic files
  console.log('📂 SCANNING KNOWN PROBLEMATIC FILES:');
  PROBLEMATIC_FILES.forEach(filePath => {
    filesScanned++;
    if (analyzeFile(filePath)) {
      totalIssues++;
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`📊 SCAN SUMMARY:`);
  console.log(`   Files scanned: ${filesScanned}`);
  console.log(`   Files with transaction issues: ${totalIssues}`);
  
  if (totalIssues > 0) {
    console.log('\n🚨 CRITICAL: Connection leaks found!');
    console.log('   These files need immediate attention to prevent:');
    console.log('   • Database connection pool exhaustion');
    console.log('   • Transaction consistency issues');
    console.log('   • Application performance degradation');
    console.log('   • Potential data corruption');
    
    console.log('\n🔧 IMMEDIATE ACTIONS REQUIRED:');
    console.log('   1. Update src/lib/db.ts with new transaction management (✅ DONE)');
    console.log('   2. Fix API routes to use withTransaction() pattern');
    console.log('   3. Test database operations under load');
    console.log('   4. Monitor /api/db-health endpoint for connection pool status');
    
    console.log('\n📖 REFERENCE:');
    console.log('   • Transaction management: src/lib/db.ts');
    console.log('   • Fixed example: src/app/api/users/[id]/restrict/route.ts');
    console.log('   • Health monitoring: /api/db-health');
  } else {
    console.log('\n✅ No transaction-related connection leaks found!');
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('   1. Fix remaining files with transaction issues');
  console.log('   2. Monitor database health: GET /api/db-health');
  console.log('   3. Run load testing to verify fixes');
  console.log('   4. Update documentation with best practices');
}

if (require.main === module) {
  main();
} 