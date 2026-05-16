# 22MIS1147

Full stack campus notification platform.

## Structure

- `logging_middleware` — shared logging package used across frontend and backend
- `notification_app_be` — Express + TypeScript backend, runs on port 8000
- `notification_app_fe` — Next.js frontend with Material UI, runs on port 3000

## Running locally

**Backend**
```bash
cd notification_app_be
npm install
npm run build
npm run start
```

**Frontend**
```bash
cd notification_app_fe
npm install
npm run dev
```
