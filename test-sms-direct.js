// Direct test of SMS function
// Run with: node test-sms-direct.js

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { sendSMS, generateCode } = require('./lib/sms.ts');

async function testSMS() {
  console.log('🚀 Testing SMS Function Directly\n');
  
  console.log('Environment check:');
  console.log('SMSRU_API_KEY:', process.env.SMSRU_API_KEY ? 'SET' : 'MISSING');
  console.log('SMS_TEST_MODE:', process.env.SMS_TEST_MODE || 'NOT SET');
  
  try {
    const code = generateCode();
    console.log('\nGenerated code:', code);
    
    const phone = '79991234567';
    console.log('Sending SMS to:', phone);
    
    const result = await sendSMS(phone, code);
    console.log('SMS Result:', result);
    console.log('✅ SUCCESS - Real SMS sent!');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    
    if (error.message === 'SMS API KEY NOT SET') {
      console.log('💡 Set SMSRU_API_KEY in .env.local');
    }
    
    if (error.message === 'SMS FAILED') {
      console.log('💡 Check SMS.ru API key and balance');
    }
  }
}

testSMS();
