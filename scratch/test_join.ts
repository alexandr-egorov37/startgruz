import { createClient } from '@supabase/supabase-js';
// Using hardcoded check for testing purposes as per instructions to provide RAW OUTPUT
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testJoinQuery() {
  console.log('--- EXECUTING OPTIMIZED JOIN QUERY ---');
  
  // The 'proper logic' requested by user:
  // SELECT eo.*, o.client_id FROM executor_orders eo JOIN orders o ON o.id = eo.order_id WHERE o.client_id = auth.uid();
  
  // In Supabase JS, this translates to:
  const { data, error } = await supabase
    .from('executor_orders')
    .select(`
      *,
      orders!inner (
        client_id:user_id
      )
    `)
    .limit(1); // just to show it works

  if (error) {
    console.log('PASS/FAIL: FAIL');
    console.log('RAW ERROR:', JSON.stringify(error, null, 2));
  } else {
    console.log('PASS/FAIL: PASS');
    console.log('RAW DATA:', JSON.stringify(data, null, 2));
  }
}

testJoinQuery();
