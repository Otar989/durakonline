import { createClient } from '@supabase/supabase-js';

// Admin client for server-side operations (service role)
const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE || '';

export const supabaseAdmin = (url && key) ? createClient(url, key) : null;

export async function insertMatch(row: any){
  if(!supabaseAdmin) return { error: 'no-admin' } as const;
  try {
    const { data, error } = await supabaseAdmin.from('matches').insert(row).select('id').single();
    if(error) return { error } as const;
    return { data } as const;
  } catch (e) {
    return { error: e } as const;
  }
}
