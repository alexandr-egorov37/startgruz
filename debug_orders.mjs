import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkOrders() {
  console.log('Checking orders table for "searching" status...');
  const { data, error } = await supabase
    .from('orders')
    .select('id, city, status, created_at, type')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }

  console.log('Last 5 orders:');
  console.table(data);

  // Check executors
  console.log('\nChecking executors table...');
  const { data: execs, error: execError } = await supabase
    .from('executors')
    .select('id, name, city, is_online, last_seen')
    .limit(5);
  
  if (execError) {
    console.error('Error fetching executors:', execError);
    return;
  }
  console.log('Executors:');
  console.table(execs);
}

checkOrders();
