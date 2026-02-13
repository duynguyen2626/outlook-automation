# Changes Log - Session 2026-02-13

## Features Implemented
1.  **Bulk Organizer UI (`components/dashboard/bulk-organizer.tsx`)**
    - Replaced `QuickScan` with a more robust table-based interface.
    - Added "Scan Matches" button to fetch emails page-by-page.
    - Added Checkboxes to select specific emails to move.
    - Added Filter by Year (2025, 2024, etc.) and Folder (Inbox, Archive).

2.  **Server Actions (`actions/scan.ts`)**
    - `scanBatch`: Fetches emails from Graph API, filters by date (locally to be safe), and checks against Supabase rules.
    - `moveBatch`: Moves selected email IDs to a target folder (creating the folder if it doesn't exist).

3.  **Rule Logic (`lib/rule-engine.ts`)**
    - Refactored `checkRule` to normalize strings (NFC) and handle case-insensitivity.
    - Added debug logging to identify why rules fail.

4.  **UI Components**
    - Installed `checkbox` and `table` from shadcn/ui.
    - Updated `app/dashboard/page.tsx` to use `BulkOrganizer`.

## Configuration
- Updated `next.config.ts` (implied) or server config to allow server actions (default in Next.js 14+).

## Known Issues
- **JWT Malformed:** Users seeing `IDX14100` error, likely due to token size or format issues with Azure AD.
- **Rule Matching:** Strict string matching is failing on seemingly correct subjects.
