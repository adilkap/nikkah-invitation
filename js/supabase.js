// Shared Supabase browser client.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function configured() {
  return !SUPABASE_URL.includes('YOUR-PROJECT') &&
         !SUPABASE_ANON_KEY.includes('YOUR-ANON');
}
