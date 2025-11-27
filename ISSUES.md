# Codebase Review & Bug Fixes Log

This document details the findings and corrections from a comprehensive review of the entire codebase.

## 1. Critical: Fixed Firestore Hook Race Conditions

*   **Issue:** The custom `useCollection` and `useDoc` hooks were the primary source of the recurring `FirebaseError: Missing or insufficient permissions` on an `undefined` path. They were attempting to subscribe to Firestore before their query/document references were fully initialized (e.g., waiting for a user ID). This created a critical race condition.
*   **Fix (`src/firebase/firestore/use-collection.tsx` & `src/firebase/firestore/use-doc.tsx`):**
    *   The `isLoading` state in both hooks now correctly defaults to `true`.
    *   The `useEffect` logic was made more robust. It now immediately checks if the query/doc reference exists. If it's `null` or `undefined`, the hook sets `isLoading` to `false` and exits, preventing any attempt to call Firestore with an invalid path. The listener is only attached when a valid reference is provided.
    *   This change permanently resolves the race condition.

## 2. Critical: Stabilized Firebase Query Memoization

*   **Issue:** The `useMemoFirebase` hook was incorrectly implemented. It was not correctly marking the objects it memoized, which prevented the safeguard checks in `useCollection` and `useDoc` from working as intended.
*   **Fix (`src/firebase/provider.tsx`):** The `useMemoFirebase` hook has been corrected to properly tag the memoized objects. This ensures that developers are correctly warned or stopped if they pass an unstable query object to the data hooks, preventing potential infinite loops.

## 3. Auth: Corrected Onboarding Redirect Logic

*   **Issue:** The `useUserAuthState` hook (`src/firebase/auth/use-user.tsx`) had a subtle race condition in its redirection logic for the `/onboarding` page. This could cause redirect loops or prevent redirection altogether under certain timing conditions.
*   **Fix:** The `useEffect` dependencies and logic within the hook were refined to more reliably handle the user's `hasCompletedOnboarding` status, ensuring new users are always correctly sent to the onboarding page and existing users are correctly sent away from it.

## 4. UI: Fixed Popover Style Inconsistency

*   **Issue:** On the Symptom Tracker page (`src/app/symptom-tracker/page.tsx`), the calendar that appears in a popover was not styled with the `glassmorphism` effect, making it visually inconsistent with other pop-up elements like dialogs.
*   **Fix:** Added the `glassmorphism` CSS class to the `PopoverContent` component in the `symptom-tracker/page.tsx` file to match the rest of the application's design.
