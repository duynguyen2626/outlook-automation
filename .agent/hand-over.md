# Hand-Over: Email Organization & Scanning Issues

## Current State
We have implemented a **"Scan - Review - Move" workflow** to replace the old "Quick Scan".
- **UI**: `BulkOrganizer` component allows selecting Source Folder (Inbox, Archive, Sent) and Year (2025).
- **Backend**: 
  - `actions/scan.ts`: Contains `scanBatch` (fetches emails + checks rules) and `moveBatch` (moves emails).
  - `lib/rule-engine.ts`: Logic to check if an email matches a rule (Sender + Keywords).
  - `auth.ts`: NextAuth with Azure AD provider.

## Critical Issues (Blockers)

### 1. JWT Error (`IDX14100`)
**Error:** `IDX14100: JWT is not well formed, there are no dots (.)...`
**Context:** This error appears when the application tries to usage the Access Token from the session.
**Suspected Causes:**
- **Token Truncation:** Azure AD tokens are very large. They might be exceeding the browser's cookie size limit (4KB), causing `next-auth` to split them. If reassembly fails or configuration is wrong, the token is truncated/malformed.
- **Opaque Tokens:** Azure AD Access Tokens for Graph API are sometimes opaque (not valid JWTs for the client to parse), but `next-auth` or a library might be trying to parse them as JWTs.
- **NextAuth Config:** The `jwt` callback in `auth.ts` simply passes `account.access_token` to `token.accessToken`. 

**Recommendation for Next Agent:**
- **Investigate Cookie Size:** Check if `next-auth` session cookies are being chunked correctly. might need to increase chunk size or switch to a database session strategy (Supabase Adapter) to avoid large cookies.
- **Validate Token Format:** Debug what `session.accessToken` actually looks like in the server action using `console.log`.

### 2. Rule Matching Failures
**Issue:** Emails that *appear* to match the rule (e.g., subject contains "Hoàn tiền") are being logged as `[No Match]` or failing the keyword check (`[Fail Keyword]`).
**Observations:**
- We added debug logs to `lib/rule-engine.ts` and `actions/scan.ts`.
- Logs showed "Vietcombank - Hoàn Tiền" rule failing even when subject contained "Hoàn tiền".
- **Suspected Causes:** 
  - Unicode Normalization: We used `.normalize('NFC')` but there might still be subtle char differences.
  - Hidden Characters: Zero-width spaces or non-breaking spaces in the subject.
  - Rule Definition: The rule in Supabase might have extra whitespace or requires *multiple* keywords (AND logic) where one is missing.

**Recommendation:**
- **Simplify Rules:** Create a simpler rule with just *one* keyword and no sender constraint to test.
- **Hex Dump Subject:** Log the subject string as hex to see hidden characters.
- **Fuzzy Matching:** Consider using a fuzzy matching library instead of strict `.includes()`.

## Alternative Directions
The user mentioned "không lòng vòng mãi việc filter mail".
- **Search-Based Approach:** Instead of fetching *all* emails and filtering in code (which is slow and error-prone), use Microsoft Graph API's `$search` or `$filter` parameter directly.
  - Example: `client.api(...).search('"subject:Hoàn tiền" AND "from:vietcombank"').get()`
  - This offloads the heavy lifting to Microsoft's server.
  - **Pros:** Much faster, handles pagination better, cleaner code.
  - **Cons:** Search syntax can be tricky, might have delay in indexing.

## Summary of Changes in this Session
- Created `BulkOrganizer` UI.
- Implemented `scanBatch` and `moveBatch` actions.
- Added `ensureFolder` logic to create nested folders on the fly.
- added `checkbox` and `table` components via shadcn.
