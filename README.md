# Operation Fish for Life

A local-first meal planner for choosing weekly recipes and generating a combined shopping list.

## Run locally

```bash
npm install
npm run dev
```

The app currently stores the selected weekly plan in `localStorage`, so no server or account is required.

Recipe data is stored in IndexedDB. Use **Export backup** on the My recipes page; in Chrome, choose the repository's `src/data/recipes.json` in the save dialog to update it directly. Browsers without the File System Access API download `recipes.json` instead. Use **Import backup** to replace the current collection from a valid backup file.

## Hosted setup

The hosted deployment uses GitHub Pages for the Vite frontend and Supabase for shared data across machines. The Supabase project should use:

- A personal organization on the Free plan
- A strong, unique database password stored securely
- Data API enabled
- Automatic Data API access for new public tables enabled
- Automatic Row Level Security (RLS) for new public tables enabled

Run `supabase/schema.sql` in the Supabase SQL Editor to create the authenticated household database and its RLS policies. The app supports email/password accounts, household creation, and household invite codes so multiple accounts can share the same recipes, plans, and shopping items.

Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable/anon key before running the app. Never commit `.env.local`, database passwords, or secret/service-role keys.

The GitHub Pages workflow deploys `master` and this setup branch at `https://terrysmalone.github.io/meal-planner/`. In the repository settings, enable **Pages → Source: GitHub Actions**, then add repository variables named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Add the Pages URL to Supabase **Authentication → URL Configuration** as the site URL and an allowed redirect URL.

## Current foundation

- Sample recipe collection with structured ingredients
- Add/remove recipes from the weekly plan
- Automatic shopping-list aggregation by category
- Serving-aware ingredient scaling in the data model
- Responsive layout with print-friendly shopping list
