# TG Game Bot — Project Skeleton

Короткое описание: веб-приложение для совместных игр (2–4 игрока), бэкенд на FastAPI, фронтенд на React (Vite), интеграция с Telegram для внутренних покупок ("звёзды").

Quick start (PowerShell):

1) Backend

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r backend\requirements.txt; uvicorn app.main:app --reload --reload-dir backend/app --port 8000
```

2) Frontend

```powershell
cd frontend; npm install; npm run dev
```

Дальнейшие шаги:
- Реализовать игровые комнаты и протокол для WebSocket
- Добавить миграции (Alembic)
- Реализовать бота Telegram и интеграцию платежей/внутренней валюты

## Postgres (Docker)

База и контейнер создаются через `backend/docker-compose.yml` с именем контейнера `game-platform-db`.

1) Запустите Postgres:

```sh
cd backend
docker compose up -d
```

2) Укажите параметры подключения к БД в `.env` (можно в корне проекта или в `backend/.env`):

```
DB_HOST=localhost            # или IP/hostname сервера с Postgres
DB_PORT=5432
DB_NAME=game_platform
DB_USER=db_owner
DB_PASSWORD=your_strong_password
DB_ENGINE=postgres
```

Во время первого старта контейнер Postgres создаст базу `DB_NAME` и суперпользователя `DB_USER`
с паролем `DB_PASSWORD` (это стандартное поведение официального Docker-образа Postgres).

## Postgres (Neon / удалённо)

Можно подключаться к удалённому Postgres (например, Neon) через `DB_URL`.
Если в connection string есть `sslmode=require`, бэкенд автоматически включит SSL для `asyncpg`.

Пример:

```env
DB_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
```

## SQLite (локально)

Если нужна локальная БД без Postgres, включите SQLite:

```env
DB_ENGINE=sqlite
```

В этом режиме используется файл `./game-platform.db` в папке `backend/`.
Если у вас задан `DB_URL`, он будет проигнорирован при `DB_ENGINE=sqlite`.

## Восстановление доступа

Проект использует recovery-коды как единственный механизм восстановления доступа.

1) После входа сгенерируйте recovery-коды в профиле.
2) Сохраните коды в безопасном месте — они показываются только один раз.
3) Потеря recovery-кодов = потеря аккаунта. Других способов восстановления нет.
4) Для восстановления используйте `/auth/recovery/verify` и `/auth/recovery/reset-password`.
5) После генерации подтвердите сохранение: `/me/security/recovery/confirm-viewed`.

### Account recovery

How it works:
- Generate a new batch of recovery codes in your profile.
- Codes are shown once and expire from the one-time display after 10 minutes.
- Confirm that you saved them via `/me/security/recovery/confirm-viewed`.
- If you lose the codes, the account cannot be recovered.

### HTTP endpoints (recovery)

| Method | Endpoint | Example |
| --- | --- | --- |
| POST | `/api/auth/recovery/verify` | `{"username":"alice","code":"ABCDE-FGHIJ"}` |
| POST | `/api/auth/recovery/reset-password` | `{"reset_token":"<token>","new_password":"NewPass123"}` |
| POST | `/api/auth/recovery/confirm-setup` | `{"setup_token":"<token>"}` |
| POST | `/api/me/security/recovery/regenerate` | `{"password":"current-password"}` |
| GET | `/api/me/security/recovery/status` | `{}` |
| GET | `/api/me/security/recovery/codes` | `{}` |
| POST | `/api/me/security/recovery/confirm-viewed` | `{}` |
