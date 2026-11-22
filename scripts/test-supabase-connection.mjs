import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mqcyqziprzfxkszhhncy.supabase.co';
const supabaseKey = 'sb_publishable_BmHUEQ5ctpONXMtmph9-XA_z4pv60vX';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Testing connection to live Supabase...');
try {
  const { data, error } = await supabase.from('categories').select('*').limit(1);
  if (error) {
    console.log('Supabase replied with error/notice:', error.message, error.code);
  } else {
    console.log('Successfully connected! Categories count:', data?.length);
  }
} catch (err) {
  console.error('Connection exception:', err);
}
