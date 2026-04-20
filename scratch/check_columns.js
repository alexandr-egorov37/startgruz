const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phqkzwdlzyumlsdlodor.supabase.co';
const supabaseKey = 'sb_publishable_FfiY2-PDj2Xx3fYvrwNKIQ_gOB8Sdpr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.from('executors').select('*').limit(1);
  if (error) {
    console.error('ERROR:', error);
  } else if (data && data.length > 0) {
    console.log('COLUMNS:', Object.keys(data[0]));
  } else {
    console.log('No data found in executors table.');
  }
}

checkColumns();
