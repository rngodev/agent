# scribble

A tiny blogging API. Express + Prisma + Postgres.

## Dev setup

```bash
docker compose up -d
cp .env.example .env
npx prisma migrate dev
npm run dev
```
