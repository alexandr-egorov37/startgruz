import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runAudit() {
  console.log('--- AUDIT: CHATS & EXECUTOR_ORDERS ---');
  
  // 1. Check Chat columns
  const { data: chatCols, error: chatErr } = await supabase.rpc('get_table_columns', { table_name: 'chats' });
  // If rpc doesn't exist, we try a query
  console.log('Chats Columns:', chatCols || 'RPC get_table_columns failed or missing');

  // 2. Sample data
  const { data: chats } = await supabase.from('chats').select('*').limit(5);
  console.log('Chats Sample:', chats);

  const { data: messages } = await supabase.from('messages').select('*').limit(5);
  console.log('Messages Sample:', messages);

  const { data: eo } = await supabase.from('executor_orders').select('*').limit(5);
  console.log('Executor Orders Sample:', eo);

  // 3. Link check
  const { data: linkCheck } = await supabase
    .from('executor_orders')
    .select('id, status')
    .eq('status', 'contact_purchased');
  
  console.log('Contact Purchased Orders count:', linkCheck?.length);
  
  // Try joining (if possible via JS)
  // Actually, let's just use raw SQL via an RPC if available, or multiple queries.
}

runAudit();
