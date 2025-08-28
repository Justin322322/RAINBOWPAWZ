#!/usr/bin/env node

/**
 * Test script for httpSMS integration
 * Run with: node scripts/test-httpsms.js
 */

const https = require('https');

// Configuration - update these values
const config = {
  apiKey: process.env.HTTPSMS_API_KEY || 'your_api_key_here',
  fromNumber: process.env.HTTPSMS_FROM_NUMBER || '+18005550199',
  toNumber: process.env.TEST_PHONE_NUMBER || '+639123456789', // Update with your test number
  baseUrl: 'https://api.httpsms.com/v1'
};

function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.httpsms.com',
      port: 443,
      path: `/v1${endpoint}`,
      method: method,
      headers: {
        'x-api-key': config.apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

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
            data: parsed
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testHttpSMS() {
  console.log('🔍 Testing httpSMS Integration...\n');
  
  // Test 1: Check service status
  console.log('1️⃣ Testing service status...');
  try {
    const statusResponse = await makeRequest('GET', '/messages');
    console.log(`   Status: ${statusResponse.status}`);
    if (statusResponse.status === 200) {
      console.log('   ✅ Service is operational');
    } else {
      console.log('   ❌ Service check failed');
      console.log('   Response:', statusResponse.data);
    }
  } catch (error) {
    console.log('   ❌ Service check error:', error.message);
  }
  
  console.log('');
  
  // Test 2: Send test SMS
  console.log('2️⃣ Testing SMS sending...');
  try {
    const smsData = {
      content: 'Hello from httpSMS test! 🐾',
      from: config.fromNumber,
      to: config.toNumber,
      encrypted: false
    };
    
    console.log(`   From: ${smsData.from}`);
    console.log(`   To: ${smsData.to}`);
    console.log(`   Message: ${smsData.content}`);
    
    const smsResponse = await makeRequest('POST', '/messages/send', smsData);
    console.log(`   Status: ${smsResponse.status}`);
    
    if (smsResponse.status === 200 && smsResponse.data.status === 'success') {
      console.log('   ✅ SMS sent successfully!');
      console.log(`   Message ID: ${smsResponse.data.data.id}`);
    } else {
      console.log('   ❌ SMS sending failed');
      console.log('   Response:', smsResponse.data);
    }
  } catch (error) {
    console.log('   ❌ SMS sending error:', error.message);
  }
  
  console.log('');
  
  // Test 3: Configuration check
  console.log('3️⃣ Configuration check...');
  console.log(`   API Key: ${config.apiKey ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   From Number: ${config.fromNumber ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Test Number: ${config.toNumber ? '✅ Configured' : '❌ Not configured'}`);
  
  if (!config.apiKey || config.apiKey === 'your_api_key_here') {
    console.log('\n⚠️  Please set HTTPSMS_API_KEY environment variable');
  }
  
  if (!config.fromNumber || config.fromNumber === '+18005550199') {
    console.log('\n⚠️  Please set HTTPSMS_FROM_NUMBER environment variable');
  }
  
  if (!config.toNumber || config.toNumber === '+639123456789') {
    console.log('\n⚠️  Please set TEST_PHONE_NUMBER environment variable');
  }
  
  console.log('\n🎯 Test completed!');
}

// Run the test
if (require.main === module) {
  testHttpSMS().catch(console.error);
}

module.exports = { testHttpSMS };
