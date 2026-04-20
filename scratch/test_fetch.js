const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkPolicies() {
  const { data, error } = await supabase.rpc('get_policies'); // This might not exist
  if (error) {
    // If RPC fails, try information_schema
    const { data: policies, error: polError } = await supabase
      .from('pg_policies') // This is a system table, might need special access
      .select('*')
      .eq('tablename', 'executors');
    
    if (polError) {
      console.log('Could not fetch policies via pg_policies');
    } else {
      console.log('Policies:', policies);
    }
  } else {
    console.log('Policies:', data);
  }
}

// Actually, let's just try to fetch ONE executor by ID using the same service role if possible?
// No, I don't have the service role key.

async function testFetch() {
    // Let's try to fetch any executor and see its ID
    const { data } = await supabase.from('executors').select('id, name').limit(1);
    if (data && data.length > 0) {
        const id = data[0].id;
        console.log('Testing fetch for ID:', id);
        const { data: exec, error } = await supabase.from('executors').select('*').eq('id', id).single();
        console.log('Result:', exec ? 'Success' : 'Fail');
        if (error) console.log('Error:', error);
    } else {
        console.log('No executors found to test.');
    }
}
testFetch();
