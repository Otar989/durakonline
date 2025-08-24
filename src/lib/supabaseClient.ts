// (legacy) раньше тут был клиент Supabase. Сейчас библиотека удалена.

// Глобальный кэш (устойчив к hot-reload в dev)
declare global { // eslint-disable-line no-unused-vars
}


/**
 * Возвращает singleton Supabase клиента (только в браузере). На сервере (SSR/edge) вернёт null,
 * чтобы случайно не тянуть сервис-ключ сюда. Для server-side действий используем отдельный клиент с service role.
 */

/** Принудительно пересоздать клиент (например после смены домена / clear session) */
// Supabase удалён из проекта. Оставлена заглушка на случай старых импортов.
export function getSupabase(): null { return null; }
export function resetSupabase(): void { /* noop */ }
