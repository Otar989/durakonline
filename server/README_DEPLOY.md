# Развёртывание socket-сервера

## Railway / Render / Koyeb / Fly.io
1. Создайте новый сервис Node.
2. Репозиторий: подключите GitHub, выберите проект.
3. Build command: `npm install`
4. Start command: `node server/index.ts`
5. Переменные окружения (необязательно):
   - `NODE_ENV=production`
6. Порт: платформа передаст через `PORT` (мы его уже читаем).
7. После деплоя у вас будет URL вида `https://durak-socket.up.railway.app`.

## Vercel (только фронтенд)
Во фронте установите переменную окружения:
- `NEXT_PUBLIC_SOCKET_URL=https://durak-socket.up.railway.app`
Сделайте повторный деплой фронта.

### Supabase
1. Создайте проект в Supabase.
2. Переменные окружения:
   - `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE` добавьте в настройки вашего сервиса (например, Railway).
   - Локально создайте `.env` файл в корне проекта и добавьте туда `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE`.
3. Включите RLS (Row Level Security) для таблиц, к которым нужен доступ только у анонимных пользователей.
4. Настройте политики доступа (Policies) в Supabase, чтобы разрешить доступ к нужным таблицам.

## Проверка
```
GET https://durak-socket.up.railway.app/health  -> ok
WebSocket: wss://durak-socket.up.railway.app/socket.io/?EIO=4&transport=websocket
```

## Локально в прод-режиме
```
PORT=4001 node server/index.ts
```

## Безопасность (минимум)
- Сейчас origin:* — можно сузить: `cors: { origin: ['https://your-vercel-domain.vercel.app'] }`
- Опционально: добавить rate limit на события action.

## Следующие улучшения
- Dockerfile для единого образа.
- JWT аутентификация игроков.
- Масштабирование через Redis adapter для socket.io.

# Deploy (Server)

ENV:
- PORT: 4001
- CORS_ORIGIN: https://your-domain.com
- SUPABASE_URL, SUPABASE_SERVICE_ROLE

Run:
- `node server/index.ts`

Render/Fly: configure Docker or Node build. For Render, set `Start Command` to `node server/index.ts`.
