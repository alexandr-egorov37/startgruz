const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phqkzwdlzyumlsdlodor.supabase.co';
const supabaseKey = 'sb_publishable_FfiY2-PDj2Xx3fYvrwNKIQ_gOB8Sdpr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testJoinQuery() {
  console.log('--- EXECUTING OPTIMIZED JOIN QUERY ---');
  
  // The 'proper logic' requested by user:
  // SELECT eo.*, o.client_id FROM executor_orders eo JOIN orders o ON o.id = eo.order_id WHERE o.client_id = auth.uid();
  
  const { data, error } = await supabase
    .from('executor_orders')
    .select(`
      *,
      orders!inner (
        user_id
      )
    `)
    .limit(3);

  console.log('PASS/FAIL:', error ? 'FAIL' : 'PASS');
  if (error) {
    console.log('RAW ERROR:', JSON.stringify(error, null, 2));
  } else {
    console.log('RAW DATA:', JSON.stringify(data, null, 2));
  }
}

testJoinQuery();
