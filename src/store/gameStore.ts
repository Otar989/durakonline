// Legacy zustand store удалён. Файл оставлен как заглушка, чтобы не падали старые импорты.
// Удалите целиком `src/store/` после проверки отсутствия импортов.
export function useGameStore(): never {
  throw new Error('Legacy zustand store removed. Use new UI/local state hooks instead.');
}
