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
