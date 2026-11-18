# 2026-11-17

## 15:04 UTC

Created `.github/copilot-instructions.md` with the project workflow for maintaining this diary, and created `JOURNAL.md` as its human-readable record.

## 15:13 UTC

Renamed the app from “Pantry & Plate” to “Operation Fish for Life” in the page title, README heading, brand header, and footer. The production build passed.

## 15:15 UTC

Reformatted this journal into a diary with daily headings and a timestamped entry for each change. Updated `.github/copilot-instructions.md` to document the format.

## 15:16 UTC

Removed the standalone diary title so every level-one heading is a day, matching the requested journal structure.

## 15:17 UTC

Replaced the hero message with the two-sentence fish proverb, preserving the existing normal and italic/color heading styles.

## 15:18 UTC

Reduced the responsive hero heading size so the fish proverb takes up less space while retaining its existing styling.

## 15:25 UTC

Added an IndexedDB recipe database with the existing recipes plus the pictured Peri Peri Halloumi recipe as seed data. Added a recipe-card image import form using browser OCR, editable review fields, ingredient parsing, and recipe saving. Added `tesseract.js` and the recipe form styles; the weekly plan remains in local storage.

## 15:28 UTC

Removed the four original sample recipes, leaving only the Peri Peri Fried Rice recipe as starter data. Existing IndexedDB users are cleaned up automatically, along with stale weekly-plan references.

## 15:30 UTC

Added full-recipe viewing and deletion controls to the My recipes page. Recipe details now show ingredients and metadata, while deletion removes the recipe from IndexedDB and the weekly plan.

## 15:31 UTC

Fixed recipe-card event binding so the full-recipe view and delete controls also work from the weekly plan section.

## 15:33 UTC

Hardened recipe-card image import after the browser became unresponsive: selecting an image no longer starts OCR automatically, OCR is explicitly started with a Read card button, and images are resized before processing to reduce browser memory and CPU usage.

## 15:37 UTC

Fixed the recipe import modal closing when its file input was clicked. Backdrop handlers now close only when the backdrop or an explicit close button is the event target, allowing image selection and form interaction to remain open.

## 15:38 UTC

Improved recipe-card OCR by upscaling images, applying grayscale and contrast enhancement, enabling automatic rotation, and configuring Tesseract for multi-column text with preserved spacing.

## 15:39 UTC

Adjusted the Tesseract page-segmentation setting to use its typed automatic-layout enum after the initial build caught a type mismatch.

## 15:41 UTC

Added the One Tray Loaded Chicken & Fries Fajita Tray Bake recipe with its card details and ingredients. Bumped the IndexedDB schema so existing installations receive it automatically.

## 15:46 UTC

Added the Chorizo, Tomato & Tenderstem Spaghetti recipe from the supplied card, including its 2-person ingredient quantities and 10-minute-meal tag. Bumped the IndexedDB schema so existing installations receive it automatically.

## 15:47 UTC

Changed the weekly-plan heading from a hardcoded date range to a dynamic range for the next Monday through Sunday.

## 15:49 UTC

Added recipe editing with prefilled fields, edit actions on recipe cards and recipe details, and IndexedDB updates that preserve existing recipe IDs and weekly-plan references.

## 15:54 UTC

Added `src/data/recipes.json` as a versioned recipe backup, an Export backup action for the live IndexedDB collection, and README instructions for copying the exported file back into the repository.

## 15:55 UTC

Added Replace from backup importing for `recipes.json`. The importer validates the file, replaces the IndexedDB collection, and removes weekly-plan references to recipes absent from the backup.

## 15:58 UTC

Updated Export backup to use Chrome’s File System Access API when available, allowing the user to select and overwrite `src/data/recipes.json` directly. Download fallback remains for unsupported browsers.

## 16:02 UTC

Moved recipe backup import and export actions into the account avatar dropdown and left the My recipes header with only the New recipe action.

## 16:04 UTC

Fixed account dropdown interaction by placing the header and menu above page content and making the avatar/search controls explicit non-submit buttons.

## 16:07 UTC

Made the account control explicit by adding a dropdown chevron and menu semantics to the TM button.

## 16:08 UTC

Removed the account dropdown chevron at the user’s request while keeping the TM button behavior unchanged.

## 16:09 UTC

Made the account dropdown persistent in the shared site header and changed it to toggle in place, ensuring backup import and export remain accessible from every page view.

## 16:10 UTC

Fixed the shared account and backup event listeners being nested under the My recipes New recipe setup, which prevented them from registering on Weekly plan.

## 16:20 UTC

Removed the broken global search button from the site header in preparation for targeted search controls.

## 16:22 UTC

Removed the recipe-card file picker, OCR workflow, image preprocessing, and Tesseract dependency. New recipes are now entered manually through the recipe form.

## 16:28 UTC

Added live My recipes search filtering across names, descriptions, tags, ingredients, units, and categories, with a responsive search field and no-results state.

## 16:29 UTC

Preserved the existing mobile footer spacing while finalizing the responsive search layout.

## 16:30 UTC

Changed Weekly plan to show only recipes selected for the week. Added an empty state directing users to My recipes when no meals are chosen; the shopping list was already selection-based.

## 16:33 UTC

Increased current recipe ingredient quantities by 50% while keeping serving labels unchanged. Updated the repository backup and added an IndexedDB migration to apply the larger portions to existing recipes.

## 16:34 UTC

Adjusted database initialization to insert each missing starter recipe individually, preventing the portion migration from omitting a recipe on a fresh install.

## 16:35 UTC

Added an explicit IndexedDB store guard in the portion migration after the type-check identified the upgrade transaction as potentially unavailable.

## 16:39 UTC

Added the Cheesy Mexican-Style Rice With Crème Fraîche recipe from the supplied card with ingredient quantities increased by 50%. Added it to the repository backup and IndexedDB schema migration.

## 16:42 UTC

Added the Saucy Onion Gravy Beef Meatballs & Crushed Potatoes recipe from the supplied card with ingredient quantities increased by 50%. Added it to the repository backup and IndexedDB schema migration.

## 16:40 UTC

Added the Hoisin Chicken & Rice recipe from the supplied card with ingredient quantities increased by 50%. Added it to the repository backup and IndexedDB schema migration.

## 16:42 UTC

Added the Chicken & Butternut Squash Korma With Rice And Naan recipe from the supplied card with ingredient quantities increased by 50%. Added it to the repository backup and IndexedDB schema migration.

## 16:45 UTC

Added the Saag Aloo With Peas And Pitta recipe from the supplied card with ingredient quantities increased by 50%. Added it to the repository backup and IndexedDB schema migration.

## 16:46 UTC

Added the Beef & Mushroom Bolognese With Wholewheat Tortiglioni recipe from the supplied card with ingredient quantities increased by 50%. Added it to the repository backup and IndexedDB schema migration.

## 16:47 UTC

Added the Battered Basa With Salt & Vinegar Chips And Mushy Peas recipe from the supplied card with ingredient quantities increased by 50%. Added it to the repository backup and IndexedDB schema migration.

## 16:48 UTC

Added the Herby Chicken With Creamy Leek Sauce And Buttery Mash recipe from the supplied card with ingredient quantities increased by 50%. Added it to the repository backup and IndexedDB schema migration.

## 16:49 UTC

Added the Cheesy Black Bean Enchiladas recipe from the supplied card with ingredient quantities increased by 50%. Added it to the repository backup and IndexedDB schema migration.

## 16:50 UTC

Added the Truffle Cacio E Pepe Sauce With Spinach & Ricotta Ravioli recipe from the supplied card with ingredient quantities increased by 50%. Added it to the repository backup and IndexedDB schema migration.

## 16:53 UTC

Fixed shopping-list ingredient grouping so the ingredient name and measurement unit are treated as a composite key. Distinct units such as `can` and `cans` now remain separate shopping-list entries, while casing and surrounding whitespace are normalized.

## 16:55 UTC

Alphabetised ingredients within each shopping-list category.

## 16:57 UTC

Added shopping-list validation for ingredients that share a name but use different measurement units. The weekly plan now lists the conflicting units and affected recipes with edit links, and adding or editing a recipe prompts before saving a new unit mismatch so it can be corrected.

## 17:01 UTC

Rounded all fractional quantities for unitless ingredients up to whole numbers, including onions, potatoes, garlic, leeks, lemons, carrots, and chillies. Measured quantities were left unchanged, and an IndexedDB migration updates existing recipes.

## 17:03 UTC

Added a concise print layout for the shopping list. Printing now hides app navigation, recipe cards, warnings, explanatory text, and checkbox controls while presenting the shopping list full-page by category.

## 17:04 UTC

Compressed the shopping-list print layout further with landscape A4 output, three columns, smaller text, and tighter spacing to reduce page count.

## 17:05 UTC

Changed the compact shopping-list print layout to portrait A4 with two columns, smaller typography, tighter margins, and truncated long ingredient names where necessary.

## 17:06 UTC

Added a print-only brief list of the selected meals above the concise shopping list for reference.

## 17:06 UTC

Removed the “STEP 2” and “Shopping list” heading from printed output while retaining the heading in the normal app view.

# 2026-11-18

## 10:49 UTC

Added a persisted One-off items section to the shopping list. Users can add items such as milk, bread, and ready meals, remove them individually, and include them in the concise print layout.

## 10:55 UTC

Replaced the embedded one-off shopping section with a dedicated Shopping items tab. Manually added items are now retained in a reusable catalog, can be selected or unselected for the current list, and remain available for reselection later.

## 10:57 UTC

Added the current shopping list alongside the reusable-items manager on the Shopping items tab.

## 10:59 UTC

Added persistent sections for manual shopping items. Existing sections can be selected when adding an item, new sections can be created and reused, and selected manual items now appear under their section alongside recipe ingredients in the shopping list and printout.

## 11:01 UTC

Added permanent Delete controls for saved manual shopping items. Deleting an item removes it from the reusable catalog and the current shopping list.

## 11:03 UTC

Extended manual shopping items with optional quantity and unit fields, while preserving existing saved items. Quantities and units now appear consistently in the reusable catalog, shopping list, and printout.

## 14:49 UTC

Updated manual shopping item creation so adding an existing item updates its quantity and unit instead of creating another item. For example, adding Milk with quantity 2 now changes the existing Milk entry to 2.

## 14:52 UTC

Moved reusable shopping items and custom shopping sections into IndexedDB alongside the recipe database, with a migration that preserves existing localStorage data.

## 15:05 UTC

Mirrored reusable shopping items and custom sections into localStorage as well as IndexedDB, and extended recipe backup import/export to include the shopping catalog, sections, and selected manual items.

## 15:36 UTC

Documented the planned free hosted setup in `README.md`, including the Supabase organization, database password, Data API, automatic table access, and automatic RLS choices. Noted that GitHub Pages deployment will be documented when added. No application behavior changed. Validation: `git diff --check`.

## 15:38 UTC

Installed the Supabase JavaScript client and added environment-based Supabase configuration. Added `.env.example`, a local ignored `.env.local` containing the supplied project credentials, and the reusable `src/supabase.ts` client module. Updated `package.json` and `package-lock.json`. Validation: `npm run build` and `git diff --check`.

## 15:44 UTC

Added authenticated Supabase household sharing. Created `supabase/schema.sql` with household membership, recipe/shopping tables, RPC helpers, and RLS policies; added email/password authentication, household creation/joining, sign-out UI, remote synchronization, and offline IndexedDB fallback. Updated the README with setup steps and corrected the dependency manifest. Validation: `npm run build` and `git diff --check`.

## 16:23 UTC

Added GitHub Pages deployment configuration with a repository-path-aware Vite build, a GitHub Actions workflow for Pages, and documentation for the required repository variables and Supabase redirect URL. Added a dedicated Pages build script after verifying npm argument forwarding. Validation: `npm run build`, `npm run build:github-pages`, and `git diff --check`.

## 16:31 UTC

Made the repository public to enable free GitHub Pages hosting, configured the Pages environment for the deployment branch, and verified the live app at `https://terrysmalone.github.io/meal-planner/`. The deployment workflow completed successfully.

## 16:45 UTC

Corrected the documented and configured release branch from `main` to the repository's actual default branch, `master`, and removed the obsolete `main` Pages policy. Validation: `npm run build`, `npm run build:github-pages`, and `git diff --check`.

## 16:47 UTC

Added a subtle green gradient, border, and rounded container to the home-page hero section as a visual deployment test on `master`. Validation: `npm run build`, `npm run build:github-pages`, and `git diff --check`.

## 16:52 UTC

Added Monday-based previous/next week navigation and per-household weekly plan persistence. Weekly recipe selections and serving counts now load from and save to the new Supabase `weekly_plans` table, with local storage retained as an offline fallback. Updated the README. Validation: `npm run build`, `npm run build:github-pages`, and `git diff --check`.

## 16:54 UTC

Added a clearly labelled “Next week's menu” button beside the weekly navigation arrows while retaining the arrow navigation. Validation: `npm run build`, `npm run build:github-pages`, and `git diff --check`.

## 16:58 UTC

Moved the “Next week's menu” button from the week summary to sit beside the previous/next week controls. Validation: `npm run build`, `npm run build:github-pages`, and `git diff --check`.

## 17:00 UTC

Changed the default planning week to the week after the current Monday-starting week. The “Next week's menu” button now always returns to that default week, while the arrows continue to move one week at a time. Validation: `npm run build`, `npm run build:github-pages`, and `git diff --check`.

## 17:06 UTC

Made reusable shopping-item selections week-specific. Each weekly plan now stores its selected shopping item IDs alongside recipe selections, with local storage and Supabase persistence and compatibility for older recipe-only plan records. Updated the README. Validation: `npm run build`, `npm run build:github-pages`, and `git diff --check`.

## 17:10 UTC

Hardened sign-in initialization against malformed or legacy array-shaped local and Supabase data, including weekly plans, shopping selections, and household relationship results. Validation: `npm run build`, `npm run build:github-pages`, and `git diff --check`.

## 17:14 UTC

Extended backup export/import to include every saved weekly plan, including per-week recipes, servings, and selected shopping-item IDs. Older recipe/shopping backups remain importable, and updated the README. Validation: `npm run build`, `npm run build:github-pages`, and `git diff --check`.

## 17:02 UTC

Updated `.github/copilot-instructions.md` to require local verification before any commit or push and to prohibit automatic commits or pushes unless explicitly requested. These changes remain uncommitted and unpushed.

## 17:03 UTC

Added a repository instruction to remind the user to rerun `supabase/schema.sql` in the Supabase SQL Editor whenever the schema changes. Changes remain uncommitted and unpushed.
