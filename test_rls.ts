import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testJoinQuery() {
  console.log('--- EXECUTING OPTIMIZED JOIN QUERY ---');
  
  const { data, error } = await supabase
    .from('executor_orders')
    .select(`
      *,
      orders!inner (
        user_id
      )
    `)
    .limit(1);

  console.log('PASS/FAIL:', error ? 'FAIL' : 'PASS');
  console.log('RAW OUTPUT:', JSON.stringify({ data, error }, null, 2));
}

testJoinQuery();
