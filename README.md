# Operation Fish for Life

A local-first meal planner for choosing weekly recipes and generating a combined shopping list.

## Run locally

```bash
npm install
npm run dev
```

The app currently stores the selected weekly plan in `localStorage`, so no server or account is required.

Recipe data is stored in IndexedDB. Use **Export backup** on the My recipes page; in Chrome, choose the repository's `src/data/recipes.json` in the save dialog to update it directly. Browsers without the File System Access API download `recipes.json` instead. Use **Import backup** to replace the current collection from a valid backup file.

## Current foundation

- Sample recipe collection with structured ingredients
- Add/remove recipes from the weekly plan
- Automatic shopping-list aggregation by category
- Serving-aware ingredient scaling in the data model
- Responsive layout with print-friendly shopping list

The next natural step is adding recipe creation/editing and a persistent SQLite data layer. The UI logic is intentionally separated around recipe and ingredient types so the storage implementation can be replaced without changing the shopping-list behavior.
