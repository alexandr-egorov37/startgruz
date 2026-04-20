import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('--- DB ПРОВЕРКА ---');
  
  const { count: performerCount, error: pError } = await supabase
    .from('performers')
    .select('*', { count: 'exact', head: true });
    
  if (pError) console.error('Performers count error:', pError);
  else console.log(`SELECT COUNT(*) FROM performers; => ${performerCount}`);

  const { count: orderCount, error: oError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });
    
  if (oError) console.error('Orders count error:', oError);
  else console.log(`SELECT COUNT(*) FROM orders; => ${orderCount}`);
  
  console.log('--- КОНЕЦ ПРОВЕРКИ ---');
}

check();
