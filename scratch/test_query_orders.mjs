import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = envText.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = envText.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testQuery() {
  const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        created_at,
        executors (
          id,
          name,
          phone,
          avatar
        )
      `)
      .in('status', ['accepted', 'contact_purchased', 'matched']);

  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data, null, 2));
}

testQuery();
