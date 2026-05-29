# Zhanai Store

This is a flower shop website.

Tech stack:

* Next.js 16
* TypeScript
* Tailwind CSS
* App Router
* Vercel
* Google Sheets API
* Telegram Bot API

Data source:

* Google Sheets is the primary database.
* No PostgreSQL.
* No Prisma.
* No Supabase.
* No Firebase.

Sheets structure:

* Flowers
* Bouquets
* Settings

Rules:

* Use Server Components by default.
* Keep the architecture simple.
* Read catalog data from Google Sheets.
* Do not introduce a database unless explicitly requested.
* Use TypeScript types.
* Use reusable UI components.

Current goal:
Build a flower shop catalog that displays bouquets from Google Sheets.
