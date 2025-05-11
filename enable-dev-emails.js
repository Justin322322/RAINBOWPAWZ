// Script to enable email simulation for development
const fs = require('fs');
const path = require('path');

console.log('Rainbow Paws - Enable Development Email Mode');
console.log('===========================================\n');

const envPath = path.join(__dirname, '.env.local');
let envContent = '';
let hasChanges = false;

// Check if .env.local exists
if (!fs.existsSync(envPath)) {
  console.log('No .env.local file found. Creating one with email simulation enabled...');
  envContent = `# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=rainbow_paws
DB_PORT=3306

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=rainbowpaws2025@gmail.com
SMTP_PASS=app-password-here
SMTP_SECURE=false

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Email Development Settings
# Enable email simulation for development
SIMULATE_EMAIL_SUCCESS=true
`;
  hasChanges = true;
} else {
  // Read existing file
  console.log('Reading existing .env.local file...');
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('Successfully read existing .env.local file');
  } catch (err) {
    console.error('Error reading .env.local:', err.message);
    process.exit(1);
  }
  
  // Check if SIMULATE_EMAIL_SUCCESS is already set
  if (envContent.includes('SIMULATE_EMAIL_SUCCESS=true')) {
    console.log('Email simulation is already enabled.');
  } else {
    console.log('Enabling email simulation...');
    // Check if the variable exists but is commented or set to false
    const simEmailRegex = /^\s*(#\s*)?SIMULATE_EMAIL_SUCCESS\s*=.*/m;
    if (simEmailRegex.test(envContent)) {
      // Replace existing line with enabled version
      envContent = envContent.replace(simEmailRegex, 'SIMULATE_EMAIL_SUCCESS=true');
      hasChanges = true;
      console.log('Updated existing SIMULATE_EMAIL_SUCCESS variable.');
    } else {
      // Add the variable if it doesn't exist
      if (!envContent.endsWith('\n\n')) {
        envContent += envContent.endsWith('\n') ? '\n' : '\n\n';
      }
      envContent += '# Email Development Settings\n# Enable email simulation for development\nSIMULATE_EMAIL_SUCCESS=true\n';
      hasChanges = true;
      console.log('Added SIMULATE_EMAIL_SUCCESS variable.');
    }
  }
}

// Save changes if any were made
if (hasChanges) {
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('Email simulation has been enabled in .env.local');
    console.log('Changes saved successfully!');
  } catch (err) {
    console.error('Error writing to .env.local:', err.message);
    process.exit(1);
  }
} else {
  console.log('No changes needed - email simulation already enabled.');
}

console.log('\nWhat this does:');
console.log('1. Makes all emails succeed in development mode without actually sending them');
console.log('2. Prints OTP codes to the console for testing');
console.log('3. Keeps your application working while debugging email issues');

console.log('\nRestart your application for changes to take effect:');
console.log('npm run dev');

// Show current configuration
console.log('\nCurrent email configuration:');
let currentSettings = [];
if (envContent.includes('SMTP_USER=')) {
  const match = envContent.match(/SMTP_USER=([^\r\n]+)/);
  if (match && match[1]) {
    currentSettings.push(`Email: ${match[1]}`);
  }
}
if (envContent.includes('SIMULATE_EMAIL_SUCCESS=true')) {
  currentSettings.push('Simulation: ENABLED');
} else {
  currentSettings.push('Simulation: DISABLED');
}
console.log(currentSettings.join(' | '));

console.log('\nDone!'); 