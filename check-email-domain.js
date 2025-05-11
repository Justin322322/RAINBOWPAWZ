// Script to check if an email domain is valid and can receive emails
require('dotenv').config({ path: '.env.local' });
const dns = require('dns');
const { promisify } = require('util');

// Promisify DNS functions
const resolveMx = promisify(dns.resolveMx);
const resolve4 = promisify(dns.resolve4);

async function checkEmailDomain(email) {
  console.log(`Checking email domain for: ${email}`);
  
  // Extract domain from email
  const domain = email.split('@')[1];
  if (!domain) {
    console.error('Invalid email format');
    return false;
  }
  
  console.log(`Domain: ${domain}`);
  
  try {
    // Check if domain has MX records (mail exchange servers)
    console.log('Checking MX records...');
    const mxRecords = await resolveMx(domain);
    
    if (mxRecords && mxRecords.length > 0) {
      console.log('MX records found:');
      mxRecords.forEach(record => {
        console.log(`- Priority: ${record.priority}, Exchange: ${record.exchange}`);
      });
      
      // Check if the mail servers are reachable
      console.log('\nChecking if mail servers are reachable...');
      for (const record of mxRecords) {
        try {
          const addresses = await resolve4(record.exchange);
          console.log(`${record.exchange} is reachable at: ${addresses.join(', ')}`);
        } catch (error) {
          console.error(`Could not resolve ${record.exchange}: ${error.message}`);
        }
      }
      
      return true;
    } else {
      console.log('No MX records found. Domain may not be configured to receive emails.');
      
      // Check if domain resolves to an IP address
      try {
        const addresses = await resolve4(domain);
        console.log(`Domain resolves to: ${addresses.join(', ')}`);
        console.log('Domain has A records but no MX records. May not be properly configured for email.');
        return false;
      } catch (error) {
        console.error(`Domain does not resolve: ${error.message}`);
        return false;
      }
    }
  } catch (error) {
    console.error(`Error checking domain: ${error.message}`);
    return false;
  }
}

// Email addresses to check
const emailsToCheck = [
  'justinmarlosibonga@mail.com',
  'rainbowpaws2025@gmail.com',
  'test@example.com',
  'nonexistent@nonexistentdomain123456.com'
];

// Check each email
async function checkEmails() {
  for (const email of emailsToCheck) {
    console.log('\n' + '='.repeat(50));
    const isValid = await checkEmailDomain(email);
    console.log(`${email} is ${isValid ? 'valid' : 'potentially invalid'}`);
    console.log('='.repeat(50) + '\n');
  }
}

// Run the checks
checkEmails().catch(console.error);
