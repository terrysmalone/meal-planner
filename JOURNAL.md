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
