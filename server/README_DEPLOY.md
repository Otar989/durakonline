# Развёртывание socket-сервера

## Railway / Render / Koyeb / Fly.io
1. Создайте новый сервис Node.
2. Репозиторий: подключите GitHub, выберите проект.
3. Build command: `npm install`
4. Start command: `node server/socket-server.mjs`
5. Переменные окружения (необязательно):
   - `NODE_ENV=production`
6. Порт: платформа передаст через `PORT` (мы его уже читаем).
7. После деплоя у вас будет URL вида `https://durak-socket.up.railway.app`.

## Vercel (только фронтенд)
Во фронте установите переменную окружения:
- `NEXT_PUBLIC_SOCKET_URL=https://durak-socket.up.railway.app`
Сделайте повторный деплой фронта.

### Добавление Supabase на Vercel
1. Создайте проект в Supabase, получите `Project URL` и `anon public key`.
2. В Settings → API возьмите `anon` и (для сервера) `service_role` (не кладём service key в браузер!).
3. На вкладке Vercel Project → Settings → Environment Variables добавьте:
   - `NEXT_PUBLIC_SUPABASE_URL` = https://<project-ref>.supabase.co
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (anon key)
4. В Socket-сервисе (Railway/Render) добавьте:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_SAVE_GAME_URL` (если будете использовать edge function сохранения игры)
5. Пересоберите и протестируйте: открытие сайта должно создать анонимную сессию (см. Network → auth/v1). WebSocket должен посылать auth.token в handshake.

## Проверка
```
GET https://durak-socket.up.railway.app/health  -> ok
WebSocket: wss://durak-socket.up.railway.app/socket.io/?EIO=4&transport=websocket
```

## Локально в прод-режиме
```
PORT=4001 node server/socket-server.mjs
```

## Безопасность (минимум)
- Сейчас origin:* — можно сузить: `cors: { origin: ['https://your-vercel-domain.vercel.app'] }`
- Опционально: добавить rate limit на события action.

## Следующие улучшения
- Dockerfile для единого образа.
- JWT аутентификация игроков.
- Масштабирование через Redis adapter для socket.io.
