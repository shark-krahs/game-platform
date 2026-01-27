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
- Добавить Postgres + миграции (Alembic)
- Реализовать бота Telegram и интеграцию платежей/внутренней валюты

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
