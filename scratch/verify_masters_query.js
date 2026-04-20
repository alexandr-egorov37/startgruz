const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phqkzwdlzyumlsdlodor.supabase.co';
const supabaseKey = 'sb_publishable_FfiY2-PDj2Xx3fYvrwNKIQ_gOB8Sdpr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMastersQuery() {
  console.log('--- EXECUTING MASTERS LIST QUERY ---');
  
  // Simulating a real user ID from your previous logs
  const testUserId = 'be896fc2-e114-4f7d-b8e2-1a63c65af116';

  const { data, error } = await supabase
    .from('executor_orders')
    .select(`
      id,
      status,
      created_at,
      orders!inner (
        user_id
      ),
      executors!inner (
        id,
        name,
        phone,
        avatar
      )
    `)
    .eq('orders.user_id', testUserId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });

  console.log('PASS/FAIL:', error ? 'FAIL' : 'PASS');
  if (error) {
    console.log('RAW ERROR:', JSON.stringify(error, null, 2));
  } else {
    console.log('RAW DATA:', JSON.stringify(data, null, 2));
  }
}

verifyMastersQuery();
