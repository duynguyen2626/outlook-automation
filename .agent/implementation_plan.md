# Implementation Plan: Outlook Automation Rule Manager Upgrade

This plan outlines the steps to transform the current rule management system into a premium, fully functional, and high-performance module.

## Phase 1: Core Functionality & Backend Integration
**Goal:** Replace placeholders with real logic to manage rules in Supabase.

1. **Server Actions Implementation**:
   - Create `src/actions/rules.ts` to handle CRUD (Create, Read, Update, Delete) operations.
   - Implement `createRuleAction`, `updateRuleAction`, `deleteRuleAction`, and `toggleRuleStatusAction`.
2. **Type Safety Alignment**:
   - Sync `src/types.ts` with the database schema for `clean_mail_rules`.
   - Ensure the UI components use these types strictly.
3. **Form Logic Integration**:
   - Update `CreateRuleButton` to use `useFormStatus` and call real actions.
   - Add validation (Zod) for rule names, patterns, and folder paths.

**Testing Phase 1:**
- Open the Rules page.
- Create a new rule and verify it appears in the list.
- Toggle the "Active" status and refresh to see if it persists.
- Delete a rule and verify it's gone from the database.

## Phase 2: UI/UX Redesign (Aesthetics & Component Polishing)
**Goal:** Apply the "Money Flow 3" premium design language (Phase 75).

1. **Themed Sidebar & Layout**:
   - Refine `app/dashboard/layout.tsx` for a more professional navigation experience.
   - Add glassmorphism effects to cards and sidebars.
2. **Premium Rule Cards**:
   - Redesign `RuleCard` with:
     - Better hover effects and transitions.
     - Context-aware badges (e.g., specific colors for different categories).
     - Clearer hierarchy for sender patterns and keywords.
3. **Optimized Dialogs**:
   - Update `CreateRuleButton` modal with a multi-step form or better-organized sections.
   - Add icons (Lucide) for better visual recognition.

**Testing Phase 2:**
- Visual check: Ensure high-contrast badges, rounded-none icons for bank logos (if applicable), and consistent spacing.
- Interaction check: Verify smooth transitions when opening/closing modals.

## Phase 3: Advanced Features & Smart Logic
**Goal:** Add functional value for the user.

1. **Edit Rule Functionality**:
   - Implement the "Edit" modal using the same form logic as "Create".
   - Ensure the form pre-fills with existing data.
2. **Rule Debugger Improvements**:
   - Make the `RuleDebugger` more interactive.
   - Add a "Test Rule" button that scans the current Inbox (Read-only) to show matches.
3. **Smart Folder Suggestions**:
   - Fetch existing Outlook folders (from `list-folders.ts`) to provide a dropdown selection instead of a raw text input.

**Testing Phase 3:**
- Edit a rule and verify changes are saved.
- Use the Debugger to verify a rule matches expected emails.
- Click the Folder input and see the list of actual Outlook folders.

## Phase 4: Final Polish & Performance
**Goal:** Ensure the app is production-ready.

1. **Skeletons & Loading States**:
   - Add `loading.tsx` and skeleton components for the Rules grid.
2. **Error Boundaries & Toasts**:
   - Improve error handling with user-friendly messages via `sonner`.
3. **Final Build & Linting**:
   - Run `npm run build` to ensure no regression or type errors.

**Testing Phase 4:**
- Throttle network in DevTools to verify loading states.
- Force an error to verify error toasts appear.
- Successful production-ready build.
