const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phqkzwdlzyumlsdlodor.supabase.co';
const supabaseKey = 'sb_publishable_FfiY2-PDj2Xx3fYvrwNKIQ_gOB8Sdpr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAvatarUrl() {
  const { data, error } = await supabase.from('executors').select('avatar_url').limit(1);
  if (error) {
    console.log('avatar_url check: FAIL - ' + error.message);
  } else {
    console.log('avatar_url check: PASS');
  }
}

checkAvatarUrl();
