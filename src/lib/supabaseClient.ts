import { createClient } from '@supabase/supabase-js';

// Универсальный клиент Supabase (используется на клиенте и на сервере Next)
// Требуются переменные окружения:
// NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  // Не бросаем исключение в рантайме, но помечаем консолью для дев-среды
  if (typeof window !== 'undefined') {
    console.warn('Supabase env is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }
}

export const supabase = createClient(supabaseUrl || 'http://localhost:54321', supabaseKey || 'anon-key');

export default supabase;
