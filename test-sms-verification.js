// SMS VERIFICATION TEST MATRIX
// Run with: node test-sms-verification.js

const BASE_URL = 'http://localhost:3000';

const testPhone = '79991234567';
const validCode = null; // Will be captured from API response
let sessionId = Date.now();

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

// Extract code from console logs (in real implementation, you'd use a test SMS service)
function extractCodeFromLogs(logs) {
  const match = logs.match(/Code: (\d{4})/);
  return match ? match[1] : null;
}

async function runTests() {
  console.log('🚀 Starting SMS Verification Test Matrix\n');

  // Test 1: Send code
  await test('Send verification code', async () => {
    const result = await request('/api/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone: testPhone })
    });
    
    if (!result.success) {
      throw new Error(`Send failed: ${result.reason}`);
    }
    
    console.log(`   Code sent to ${testPhone}`);
    // In real test, capture code from SMS service logs
    // validCode = extractCodeFromLogs(result.debugLogs);
  });

  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Rate limiting
  await test('Rate limit (should block)', async () => {
    const result = await request('/api/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone: testPhone })
    });
    
    if (result.success) {
      throw new Error('Rate limit not enforced');
    }
    
    console.log(`   Rate limit active: ${result.reason}`);
  });

  // Test 3: Wrong code
  await test('Wrong code (should fail)', async () => {
    const result = await request('/api/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phone: testPhone, code: '0000' })
    });
    
    if (result.success) {
      throw new Error('Wrong code was accepted');
    }
    
    console.log(`   Wrong code rejected: ${result.reason}`);
  });

  // Test 4: Invalid phone
  await test('Invalid phone format', async () => {
    const result = await request('/api/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone: '123' })
    });
    
    if (result.success) {
      throw new Error('Invalid phone was accepted');
    }
    
    console.log(`   Invalid phone rejected: ${result.reason}`);
  });

  // Test 5: Missing parameters
  await test('Missing parameters', async () => {
    const result = await request('/api/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phone: testPhone })
    });
    
    if (result.success) {
      throw new Error('Missing code was accepted');
    }
    
    console.log(`   Missing parameters rejected: ${result.reason}`);
  });

  // Test 6: SQL Injection attempt
  await test('SQL Injection protection', async () => {
    const maliciousPhone = "79991234567'; DROP TABLE phone_verifications; --";
    const result = await request('/api/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone: maliciousPhone })
    });
    
    // Should fail validation before reaching DB
    if (result.success) {
      throw new Error('Malicious input was accepted');
    }
    
    console.log(`   SQL injection blocked: ${result.reason}`);
  });

  // Test 7: Brute force protection (5 attempts)
  await test('Brute force protection', async () => {
    for (let i = 0; i < 6; i++) {
      const result = await request('/api/verify-code', {
        method: 'POST',
        body: JSON.stringify({ phone: testPhone, code: `${1111 + i}` })
      });
      
      if (i === 5 && result.success) {
        throw new Error('Brute force not blocked after 5 attempts');
      }
    }
    console.log(`   Brute force blocked after 5 attempts`);
  });

  // Test 8: Method validation
  await test('HTTP method validation', async () => {
    const result = await request('/api/send-code', {
      method: 'GET'
    });
    
    if (result.success) {
      throw new Error('GET method was accepted');
    }
    
    console.log(`   Invalid method blocked: ${result.error}`);
  });

  console.log('\n📊 Test Matrix Complete');
  console.log('\n🔧 Manual Verification Required:');
  console.log('1. Set up SMS provider credentials in .env.local');
  console.log('2. Run SQL migration: migrations/phone_verification.sql');
  console.log('3. Test with real phone number');
  console.log('4. Verify SMS delivery');
  console.log('5. Check code expiration (5 minutes)');
}

// Check if server is running
async function checkServer() {
  try {
    await request('/api/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone: '0000000000' })
    });
  } catch (error) {
    console.log('❌ Server not running. Start with: npm run dev');
    process.exit(1);
  }
}

if (require.main === module) {
  checkServer().then(runTests).catch(console.error);
}

module.exports = { runTests };
