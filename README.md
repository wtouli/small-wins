# Small Wins — Next.js MVP

Busy-parent & beginner-friendly calorie tracker with:
- Quick-add favorites and photo-estimate (simulated)
- Mocked barcode scanner UI + /api/barcode
- Health stubs for Apple/Google Fit + /api/health
- Lightweight backend schema (SQL + REST routes)

## Getting Started
1) `npm i`
2) `npm run dev`
3) Open http://localhost:3000

### API Stubs
- `POST /api/barcode` body: `{ upc: "012345678905" }` → returns nutrition for common UPCs (mocked).
- `GET /api/health` → returns `{ steps, exerciseCalories }` (mocked unless `MOCK_HEALTH=false` and you wire providers).
- `POST /api/entries` → accepts `{ name, calories, protein, meal }` and stores in memory (ephemeral).

### Database (lightweight)
See `schema.sql` (SQLite/Postgres compatible) and `schema.prisma` (optional). In-memory store used by default.

### Environment
- `MOCK_HEALTH=true` to use random health data.

### Notes
- This MVP avoids external UI kits to keep setup light.
- For camera barcode scanning, see `components/BarcodeDialog.tsx` (uses manual UPC entry + camera placeholder).
