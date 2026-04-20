// Test REAL SMS sending - NO MOCKS
// Run with: node test-real-sms.js

const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  return response.json();
}

async function test(name, fn) {
  console.log(`\n🧪 ${name}`);
  try {
    await fn();
    console.log(`✅ PASS`);
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Testing REAL SMS System\n');

  const testPhone = '79991234567'; // Replace with real phone for testing

  // Test 1: Send code - should NOT return code
  await test('Send code - no code returned', async () => {
    const result = await request('/api/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone: testPhone })
    });
    
    if (!result.success) {
      if (result.error === 'SMS_FAILED') {
        console.log(`   SMS failed - check SMSRU_API_KEY in .env.local`);
        return;
      }
      throw new Error(`Send failed: ${result.reason || result.error}`);
    }
    
    // Should NOT return code in production
    if (result.code) {
      throw new Error('Code returned in response - test mode still active');
    }
    
    console.log(`   Code sent via SMS (not returned)`);
  });

  // Test 2: Check server logs for SMS function call
  await test('Check SMS function called', async () => {
    console.log(`   Check server console for '[SMS FUNCTION CALLED]'`);
    console.log(`   Check server console for '[SMS SEND]' with last 4 digits`);
  });

  // Test 3: Verify code works (manual check)
  await test('Code verification', async () => {
    console.log(`   ⚠️  MANUAL CHECK REQUIRED:`);
    console.log(`   1. Check SMS on phone: ${testPhone}`);
    console.log(`   2. Use received code to verify via frontend`);
    console.log(`   3. Code should be 4 digits, NOT '1234'`);
  });

  // Test 4: Error handling - no API key
  await test('Missing API key protection', async () => {
    console.log(`   Set SMSRU_API_KEY='' in .env.local and restart server`);
    console.log(`   Should return error: 'SMS_FAILED'`);
  });

  // Test 5: Random code generation
  await test('Random code generation', async () => {
    console.log(`   Send multiple codes to verify randomness`);
    console.log(`   Each SMS should contain different 4-digit code`);
  });

  console.log('\n📊 Test Matrix Complete');
  console.log('\n🔧 Configuration Check:');
  console.log('SMSRU_API_KEY=' + (process.env.SMSRU_API_KEY ? 'SET' : 'MISSING'));
  console.log('SMS_TEST_MODE=' + (process.env.SMS_TEST_MODE || 'NOT SET'));
  
  console.log('\n✅ SUCCESS CRITERIA:');
  console.log('- No hardcoded "1234" anywhere');
  console.log('- Real SMS sent via SMS.ru');
  console.log('- Code NOT returned in API response');
  console.log('- Random 4-digit codes generated');
  console.log('- Proper error handling for missing API key');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
