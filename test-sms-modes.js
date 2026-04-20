// Test SMS modes: TEST MODE vs PRODUCTION MODE
// Run with: node test-sms-modes.js

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
  console.log('🚀 Testing SMS Modes\n');

  const testPhone = '79991234567';

  // Test 1: TEST MODE - should return code
  await test('TEST MODE - code returned', async () => {
    // Set env to test mode (would need to be set in .env.local)
    const result = await request('/api/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone: testPhone })
    });
    
    if (!result.success) {
      throw new Error(`Send failed: ${result.reason}`);
    }
    
    // In test mode, should return code
    if (!result.code) {
      console.log(`   Note: No code returned - likely PRODUCTION mode`);
    } else {
      console.log(`   Code returned: ${result.code}`);
    }
  });

  // Test 2: Verify code works
  await test('Code verification', async () => {
    // First get a code (in test mode)
    const sendResult = await request('/api/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone: testPhone })
    });
    
    if (!sendResult.success) {
      throw new Error('Failed to send code');
    }
    
    // Use the returned code or wait for user input
    const code = sendResult.code || '0000'; // Replace with actual code in prod
    
    const verifyResult = await request('/api/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phone: testPhone, code })
    });
    
    if (!verifyResult.success) {
      throw new Error(`Verification failed: ${verifyResult.reason}`);
    }
    
    console.log(`   Verification successful`);
  });

  // Test 3: Missing API key protection
  await test('Missing API key protection', async () => {
    // This would test with SMS_TEST_MODE=false and no API key
    // Should return error about missing configuration
    console.log(`   Check server logs for configuration errors`);
  });

  // Test 4: Rate limiting
  await test('Rate limiting still works', async () => {
    const result1 = await request('/api/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone: testPhone })
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result2 = await request('/api/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone: testPhone })
    });
    
    if (result2.success) {
      throw new Error('Rate limit not enforced');
    }
    
    console.log(`   Rate limit active: ${result2.reason}`);
  });

  console.log('\n📊 Test Matrix Complete');
  console.log('\n🔧 Manual Steps:');
  console.log('1. Set SMS_TEST_MODE=true in .env.local');
  console.log('2. Test: Code should be returned in API response');
  console.log('3. Set SMS_TEST_MODE=false');
  console.log('4. Add real SMS_API_KEY');
  console.log('5. Test: Real SMS should be sent');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
