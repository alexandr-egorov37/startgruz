const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phqkzwdlzyumlsdlodor.supabase.co';
const supabaseKey = 'sb_publishable_FfiY2-PDj2Xx3fYvrwNKIQ_gOB8Sdpr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFinalQuery() {
  console.log('--- VERIFYING FINAL QUERY WITH ALIAS ---');
  
  const testUserId = 'be896fc2-e114-4f7d-b8e2-1a63c65af116';

  const { data, error } = await supabase
    .from('executor_orders')
    .select(`
      id,
      status,
      created_at,
      order_id,
      orders!inner (
        user_id
      ),
      executors!inner (
        id,
        name,
        phone,
        avatar_url:avatar
      )
    `)
    .eq('orders.user_id', testUserId)
    .eq('status', 'accepted')
    .limit(1);

  console.log('PASS/FAIL:', error ? 'FAIL' : 'PASS');
  if (error) {
    console.log('RAW ERROR:', JSON.stringify(error, null, 2));
  } else {
    // Check if avatar_url is present in the nested executors object
    const hasAvatarUrl = data[0]?.executors?.hasOwnProperty('avatar_url');
    console.log('avatar_url key present:', hasAvatarUrl ? 'YES' : 'NO');
    console.log('Value:', data[0]?.executors?.avatar_url);
    console.log('RAW DATA:', JSON.stringify(data, null, 2));
  }
}

verifyFinalQuery();
