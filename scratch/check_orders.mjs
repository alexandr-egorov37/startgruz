import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = envText.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = envText.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkOrders() {
  const { data: executor_orders } = await supabase.from('executor_orders').select(`
    id, status, order_id,
    orders ( id, user_id, phone )
  `);
  console.log('EXECUTOR ORDERS:', JSON.stringify(executor_orders, null, 2));
}

checkOrders();
