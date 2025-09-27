/**
 * Validation script to check if all environment variables and configurations are correct
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const requiredEnvVars = [
  'DATABASE_URL',
  'SYNCLABS_API_KEY',
  'SYNCLABS_API_BASE',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN', 
  'TWILIO_WHATSAPP_FROM'
];

console.log('🔧 Personaliz MVP - Environment Validation\n');

let hasErrors = false;

// Check environment variables
console.log('📋 Checking environment variables...');
for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  if (!value) {
    console.log(`❌ Missing: ${envVar}`);
    hasErrors = true;
  } else if (value.includes('your_') || value.includes('****')) {
    console.log(`⚠️  Placeholder value: ${envVar}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${envVar}: ${value.substring(0, 10)}...`);
  }
}

// Test database connection
console.log('\n📊 Testing database connection...');
try {
  const { neon } = require('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);
  
  sql`SELECT 1 as test`.then(() => {
    console.log('✅ Database connection successful');
  }).catch((error) => {
    console.log('❌ Database connection failed:', error.message);
    hasErrors = true;
  });
} catch (error) {
  console.log('❌ Database setup error:', error.message);
  hasErrors = true;
}

// Validate phone number format
console.log('\n📞 Checking Twilio WhatsApp format...');
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
if (whatsappFrom && whatsappFrom.startsWith('whatsapp:+')) {
  console.log('✅ WhatsApp number format is correct');
} else {
  console.log('⚠️  WhatsApp number should be in format: whatsapp:+1234567890');
}

// Check SyncLabs endpoint
console.log('\n🎥 Checking SyncLabs API endpoint...');
const syncLabsBase = process.env.SYNCLABS_API_BASE;
if (syncLabsBase && syncLabsBase.includes('synclabs')) {
  console.log('✅ SyncLabs endpoint looks correct');
} else {
  console.log('⚠️  SyncLabs endpoint may be incorrect');
}

console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Configuration has issues. Please check your .env.local file.');
  console.log('📖 Refer to .env.local.example for the correct format.');
} else {
  console.log('✅ Configuration looks good! You can start the development server.');
}
console.log('='.repeat(50));

// Additional recommendations
console.log('\n💡 Recommendations:');
console.log('• Use ngrok for webhook testing: ngrok http 3000');
console.log('• Configure Twilio webhook URL: https://your-ngrok-url.ngrok.io/api/webhook/twilio');
console.log('• Test with a real phone number that has WhatsApp installed');
console.log('• Check SyncLabs documentation for available actor IDs');

process.exit(hasErrors ? 1 : 0);