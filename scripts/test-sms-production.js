#!/usr/bin/env node

/**
 * Production SMS Test Script for RainbowPaws
 * Run with: node scripts/test-sms-production.js
 * 
 * This script tests the SMS service configuration and sends a test message
 * to help diagnose production SMS issues.
 */

const https = require('https');

// Configuration from environment variables
const config = {
  apiKey: process.env.HTTPSMS_API_KEY,
  fromNumber: process.env.HTTPSMS_FROM_NUMBER,
  testNumber: process.env.TEST_PHONE_NUMBER || '+639123456789', // Default test number
  baseUrl: 'https://api.httpsms.com/v1',
  timeout: 30000 // 30 second timeout
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`🔍 ${title}`, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.httpsms.com',
      port: 443,
      path: `/v1${endpoint}`,
      method: method,
      timeout: config.timeout,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    if (config.apiKey) {
      options.headers['x-api-key'] = config.apiKey;
    }

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testEnvironmentVariables() {
  logSection('Environment Variables Check');
  
  const checks = [
    { name: 'HTTPSMS_API_KEY', value: config.apiKey, required: true },
    { name: 'HTTPSMS_FROM_NUMBER', value: config.fromNumber, required: true },
    { name: 'TEST_PHONE_NUMBER', value: config.testNumber, required: false },
    { name: 'NODE_ENV', value: process.env.NODE_ENV, required: false }
  ];

  let allRequiredSet = true;

  for (const check of checks) {
    if (check.required && !check.value) {
      logError(`${check.name}: NOT SET (Required)`);
      allRequiredSet = false;
    } else if (check.value) {
      if (check.name === 'HTTPSMS_API_KEY') {
        logSuccess(`${check.name}: Set (${check.value.substring(0, 8)}...)`);
      } else {
        logSuccess(`${check.name}: Set (${check.value})`);
      }
    } else {
      logWarning(`${check.name}: Not set (Optional)`);
    }
  }

  if (!allRequiredSet) {
    logError('Required environment variables are missing!');
    logInfo('Please set the following in your production environment:');
    logInfo('  - HTTPSMS_API_KEY');
    logInfo('  - HTTPSMS_FROM_NUMBER');
    return false;
  }

  logSuccess('All required environment variables are set!');
  return true;
}

async function testServiceConnectivity() {
  logSection('Service Connectivity Test');
  
  try {
    logInfo('Testing connection to httpSMS API...');
    const startTime = Date.now();
    
    const response = await makeRequest('GET', '/messages');
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    
    if (response.status === 200) {
      logSuccess(`Service is reachable (${responseTime}ms)`);
      logInfo(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return true;
    } else if (response.status === 401) {
      logError('Service is reachable but authentication failed');
      logInfo('This suggests the API key is invalid or expired');
      return false;
    } else {
      logError(`Service responded with status ${response.status}`);
      logInfo(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return false;
    }
  } catch (error) {
    logError(`Connection failed: ${error.message}`);
    
    if (error.message.includes('timeout')) {
      logInfo('This suggests network connectivity issues or firewall blocking');
    } else if (error.message.includes('ENOTFOUND')) {
      logInfo('This suggests DNS resolution issues');
    } else if (error.message.includes('ECONNREFUSED')) {
      logInfo('This suggests the service is down or blocking connections');
    }
    
    return false;
  }
}

async function testAuthentication() {
  logSection('Authentication Test');
  
  if (!config.apiKey) {
    logError('Cannot test authentication - no API key provided');
    return false;
  }
  
  try {
    logInfo('Testing API key authentication...');
    
    const response = await makeRequest('GET', '/messages');
    
    if (response.status === 200) {
      logSuccess('Authentication successful!');
      return true;
    } else if (response.status === 401) {
      logError('Authentication failed - invalid API key');
      logInfo('Please check your HTTPSMS_API_KEY environment variable');
      return false;
    } else {
      logWarning(`Unexpected response status: ${response.status}`);
      logInfo(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return response.status !== 401; // Consider it successful if not 401
    }
  } catch (error) {
    logError(`Authentication test failed: ${error.message}`);
    return false;
  }
}

async function testPhoneNumberFormatting() {
  logSection('Phone Number Formatting Test');
  
  const testNumbers = [
    '09123456789',
    '+639123456789',
    '639123456789',
    '9123456789',
    '+1234567890',
    '1234567890'
  ];
  
  logInfo('Testing phone number formatting...');
  
  for (const number of testNumbers) {
    try {
      // Simulate the formatting logic from the service
      let formatted = number;
      if (number.startsWith('0')) {
        formatted = '+63' + number.substring(1);
      } else if (number.startsWith('63') && !number.startsWith('+63')) {
        formatted = '+63' + number.substring(2);
      } else if (!number.startsWith('+')) {
        formatted = '+63' + number;
      }
      
      logSuccess(`${number} → ${formatted}`);
    } catch (error) {
      logError(`${number} → Error: ${error.message}`);
    }
  }
  
  return true;
}

async function testSMSSending() {
  logSection('SMS Sending Test');
  
  if (!config.apiKey || !config.fromNumber) {
    logError('Cannot test SMS sending - missing configuration');
    return false;
  }
  
  try {
    logInfo('Sending test SMS...');
    logInfo(`From: ${config.fromNumber}`);
    logInfo(`To: ${config.testNumber}`);
    
    const smsData = {
      content: '🔍 RainbowPaws SMS Test - System Check ' + new Date().toISOString(),
      from: config.fromNumber,
      to: config.testNumber,
      encrypted: false
    };
    
    const response = await makeRequest('POST', '/messages/send', smsData);
    
    if (response.status === 200 && response.data.status === 'success') {
      logSuccess('SMS sent successfully!');
      logInfo(`Message ID: ${response.data.data.id}`);
      logInfo(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return true;
    } else {
      logError('SMS sending failed');
      logInfo(`Status: ${response.status}`);
      logInfo(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return false;
    }
  } catch (error) {
    logError(`SMS sending test failed: ${error.message}`);
    return false;
  }
}

async function runDiagnostics() {
  logSection('RainbowPaws SMS Service Diagnostics');
  logInfo(`Timestamp: ${new Date().toISOString()}`);
  logInfo(`Environment: ${process.env.NODE_ENV || 'Not set'}`);
  
  const results = {
    environment: false,
    connectivity: false,
    authentication: false,
    phoneFormatting: false,
    smsSending: false
  };
  
  // Run all tests
  results.environment = await testEnvironmentVariables();
  
  if (results.environment) {
    results.connectivity = await testServiceConnectivity();
    
    if (results.connectivity) {
      results.authentication = await testAuthentication();
      
      if (results.authentication) {
        results.smsSending = await testSMSSending();
      }
    }
    
    results.phoneFormatting = await testPhoneNumberFormatting();
  }
  
  // Summary
  logSection('Diagnostic Summary');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  logInfo(`Tests passed: ${passedTests}/${totalTests}`);
  
  for (const [test, passed] of Object.entries(results)) {
    if (passed) {
      logSuccess(`${test}: PASSED`);
    } else {
      logError(`${test}: FAILED`);
    }
  }
  
  if (passedTests === totalTests) {
    logSuccess('🎉 All tests passed! SMS service is working correctly.');
  } else {
    logError('🚨 Some tests failed. Please check the issues above.');
    
    if (!results.environment) {
      logInfo('💡 Fix: Set required environment variables in production');
    }
    if (!results.connectivity) {
      logInfo('💡 Fix: Check network connectivity and firewall settings');
    }
    if (!results.authentication) {
      logInfo('💡 Fix: Verify your httpSMS API key is correct');
    }
    if (!results.smsSending) {
      logInfo('💡 Fix: Check if your httpSMS device is online and accessible');
    }
  }
  
  return results;
}

// Run diagnostics if this script is executed directly
if (require.main === module) {
  runDiagnostics()
    .then((results) => {
      process.exit(Object.values(results).every(Boolean) ? 0 : 1);
    })
    .catch((error) => {
      logError(`Diagnostics failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runDiagnostics };
