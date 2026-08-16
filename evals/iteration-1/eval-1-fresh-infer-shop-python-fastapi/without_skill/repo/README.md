# shop

A tiny storefront API. FastAPI + SQLAlchemy + Postgres.

## Dev setup

```bash
docker compose up -d
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload
```
