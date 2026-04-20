import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = envText.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = envText.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testInQuery() {
  const ids = [
    '494dca6d-0b66-44a1-9284-ab50614466af',
    '16c9110c-651d-40a3-99aa-053093d18cdf'
  ];
  
  const { data, error } = await supabase.from('presence').select('*').in('user_id', ids);
  console.log('Result:', data);
  if (error) console.error('Error:', error);
}

testInQuery();
