// Script to help set up the environment variables for Rainbow Paws
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Rainbow Paws Environment Setup\n');

// Default values
const defaults = {
  DB_HOST: 'localhost',
  DB_USER: 'root',
  DB_PASSWORD: '',
  DB_NAME: 'rainbow_paws',
  DB_PORT: '3306',
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_USER: '',
  SMTP_PASS: '',
  SMTP_SECURE: 'false',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000'
};

// Check if .env.local already exists
const envPath = path.join(__dirname, '.env.local');
let existingEnv = {};

if (fs.existsSync(envPath)) {
  console.log('Found existing .env.local file. Loading current values...\n');
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const parts = line.split('=');
        if (parts.length === 2) {
          const key = parts[0].trim();
          const value = parts[1].trim();
          existingEnv[key] = value;
        }
      }
    });
    
    // Use existing values as defaults if available
    Object.keys(existingEnv).forEach(key => {
      if (defaults[key] !== undefined) {
        defaults[key] = existingEnv[key];
      }
    });
    
    console.log('Current values loaded as defaults.\n');
  } catch (error) {
    console.error('Error reading existing .env.local file:', error.message);
  }
}

// Prompts for environment variables
const questions = [
  {
    name: 'DB_HOST',
    message: 'Database Host',
    default: defaults.DB_HOST
  },
  {
    name: 'DB_USER',
    message: 'Database User',
    default: defaults.DB_USER
  },
  {
    name: 'DB_PASSWORD',
    message: 'Database Password (leave empty for none)',
    default: defaults.DB_PASSWORD
  },
  {
    name: 'DB_NAME',
    message: 'Database Name',
    default: defaults.DB_NAME
  },
  {
    name: 'DB_PORT',
    message: 'Database Port',
    default: defaults.DB_PORT
  },
  {
    name: 'SMTP_HOST',
    message: 'SMTP Host (for sending emails)',
    default: defaults.SMTP_HOST
  },
  {
    name: 'SMTP_PORT',
    message: 'SMTP Port',
    default: defaults.SMTP_PORT
  },
  {
    name: 'SMTP_USER',
    message: 'SMTP Username (email address)',
    default: defaults.SMTP_USER
  },
  {
    name: 'SMTP_PASS',
    message: 'SMTP Password (app password for Gmail)',
    default: defaults.SMTP_PASS
  },
  {
    name: 'SMTP_SECURE',
    message: 'SMTP Secure (true for port 465, false for other ports)',
    default: defaults.SMTP_SECURE
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    message: 'Public App URL (used for email links)',
    default: defaults.NEXT_PUBLIC_APP_URL
  }
];

const answers = {};

// Ask questions sequentially
function askQuestion(index) {
  if (index >= questions.length) {
    generateEnvFile();
    return;
  }

  const question = questions[index];
  
  rl.question(`${question.message} (${question.default}): `, (answer) => {
    answers[question.name] = answer.trim() || question.default;
    askQuestion(index + 1);
  });
}

function generateEnvFile() {
  let envContent = '# Database Configuration\n';
  envContent += `DB_HOST=${answers.DB_HOST}\n`;
  envContent += `DB_USER=${answers.DB_USER}\n`;
  envContent += `DB_PASSWORD=${answers.DB_PASSWORD}\n`;
  envContent += `DB_NAME=${answers.DB_NAME}\n`;
  envContent += `DB_PORT=${answers.DB_PORT}\n\n`;
  
  envContent += '# SMTP Configuration\n';
  envContent += `SMTP_HOST=${answers.SMTP_HOST}\n`;
  envContent += `SMTP_PORT=${answers.SMTP_PORT}\n`;
  envContent += `SMTP_USER=${answers.SMTP_USER}\n`;
  envContent += `SMTP_PASS=${answers.SMTP_PASS}\n`;
  envContent += `SMTP_SECURE=${answers.SMTP_SECURE}\n\n`;
  
  envContent += '# Application Settings\n';
  envContent += `NEXT_PUBLIC_APP_URL=${answers.NEXT_PUBLIC_APP_URL}\n`;
  envContent += '# Set NODE_ENV to production in production environments\n';
  envContent += 'NODE_ENV=development\n\n';
  
  envContent += '# Uncomment to disable actual sending of emails during development\n';
  envContent += '# DISABLE_EMAILS=true\n\n';
  
  envContent += '# Uncomment to simulate email success in development\n';
  envContent += '# SIMULATE_EMAIL_SUCCESS=true\n';
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n.env.local file created successfully!');
    console.log(`File saved to: ${envPath}`);
    console.log('\nNext steps:');
    console.log('1. If you\'re using Gmail, make sure to create an app password');
    console.log('   (Google Account > Security > App passwords)');
    console.log('2. Run "node check-env.js" to verify your configuration');
    console.log('3. Restart your application for changes to take effect');
  } catch (error) {
    console.error('Error writing .env.local file:', error.message);
  }
  
  rl.close();
}

// Start asking questions
console.log('Please provide the following information (press Enter to use default):\n');
askQuestion(0); 