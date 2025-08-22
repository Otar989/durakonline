import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Глобальный кэш (устойчив к hot-reload в dev)
declare global { // eslint-disable-line no-unused-vars
	// eslint-disable-next-line no-var
	var __supabase__: SupabaseClient | undefined;
}

function initClient(): SupabaseClient | null {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !anon) return null;
	return createClient(url, anon, {
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true,
			storageKey: 'durak_supabase',
		},
	});
}

/**
 * Возвращает singleton Supabase клиента (только в браузере). На сервере (SSR/edge) вернёт null,
 * чтобы случайно не тянуть сервис-ключ сюда. Для server-side действий используем отдельный клиент с service role.
 */
export function getSupabase(): SupabaseClient | null {
	if (typeof window === 'undefined') return null; // безопасность для SSR
	if (!globalThis.__supabase__) {
		globalThis.__supabase__ = initClient() || undefined;
	}
	return globalThis.__supabase__ || null;
}

/** Принудительно пересоздать клиент (например после смены домена / clear session) */
export function resetSupabase(): void {
	if (typeof window === 'undefined') return;
	globalThis.__supabase__ = initClient() || undefined;
}
