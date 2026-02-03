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

## Настройка почты (SMTP)

Добавьте в `.env` (можно в корне проекта или в `backend/.env`):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_USE_TLS=true
SMTP_USE_SSL=false
SMTP_TIMEOUT_SECONDS=30
SMTP_DEBUG=false
SMTP_FORCE_IPV4=false
MAIL_FROM_NAME=Game Platform
MAIL_FROM_ADDRESS=your@gmail.com
FRONTEND_BASE_URL=http://localhost:5173
EMAIL_VERIFICATION_EXPIRE_MINUTES=60
EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS=60
PASSWORD_RESET_EXPIRE_MINUTES=30
EMAIL_CHANGE_EXPIRE_MINUTES=60
```

Для Gmail рекомендуется использовать App Password (а не основной пароль).

Если 587/TLS не работает, попробуйте:

```
SMTP_PORT=465
SMTP_USE_TLS=false
SMTP_USE_SSL=true
```

Для диагностики можно включить:

```
SMTP_DEBUG=true
SMTP_FORCE_IPV4=true
```
