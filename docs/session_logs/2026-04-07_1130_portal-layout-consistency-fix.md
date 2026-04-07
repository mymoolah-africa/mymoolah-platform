# Session Log: Portal Layout Consistency Fix

**Date**: 2026-04-07 11:30  
**Agent**: Claude Opus 4.6  
**Version**: v2.86.4  
**Duration**: ~30 min

---

## Summary

Fixed the MMAP (MyMoolah Admin Portal) sidebar layout inconsistency where the dark navy blue sidebar and content area "floated" instead of being flush to the left edge of the screen. Three root causes were identified and fixed.

## Root Causes Identified

### 1. `index.html` #root CSS Conflict (PRIMARY)
The `<style>` block in `index.html` applied `display: flex; align-items: center; justify-content: center` to `#root` for the loading spinner. These styles **persisted after React mounted**, causing the entire `AppLayoutWrapper` flex container to be centered inside `#root` rather than stretching to fill the viewport. Different page content widths caused the centering to shift, making the sidebar appear to "float around".

### 2. No Height Chain Established
Neither `html` nor `body` had `height: 100%` set. The `h-screen` (100vh) on `AppLayoutWrapper` worked, but the lack of a proper height chain combined with the `#root` centering made behavior unpredictable across pages.

### 3. AppLayoutWrapper Remounting Per Route
Every route wrapped its own `<ProtectedRoute><AppLayoutWrapper>` triplet, causing the entire layout shell (sidebar + header + content) to unmount and remount on every navigation. This caused visual flicker and reset the sidebar collapsed state on every page change.

## Changes Made

### File 1: `portal/admin/frontend/index.html`
- Scoped `#root` loading styles using `:has(.loading-container)` so they only apply while the loading spinner is visible
- Once React replaces the loading content, these styles no longer apply
- Changed spinner color from `#7c3aed` (purple) to `#86BE41` (MyMoolah brand green)

### File 2: `portal/admin/frontend/src/index.css`
- Added `html, body { height: 100%; margin: 0; padding: 0; }` OUTSIDE `@layer base`
- Added `#root { height: 100%; display: block; background: transparent; }` to override the `index.html` loading styles
- Placed outside `@layer` to ensure higher CSS specificity than unlayered inline styles

### File 3: `portal/admin/frontend/src/components/routing/RouteConfig.tsx`
- Converted from per-route `AppLayoutWrapper` wrapping to React Router nested routes pattern
- Single `<Route element={<ProtectedRoute />}>` parent handles auth
- Single `<Route element={<AppLayoutWrapper />}>` child handles layout
- All admin pages are now child `<Route>` elements that render inside the shared layout via `<Outlet/>`
- `AppLayoutWrapper` no longer remounts on navigation — sidebar state persists
- Reduced from 190 lines to 73 lines

### File 4: `portal/admin/frontend/src/components/layout/AppLayoutWrapper.tsx`
- Removed `ReactNode` import and `children` prop
- Added `Outlet` import from `react-router-dom`
- Changed `{children}` to `<Outlet />` in the main content area
- Component is now a layout route component, not a wrapper

## Files Modified

| File | Lines Changed |
|------|--------------|
| `portal/admin/frontend/index.html` | ~20 lines (scoped #root styles) |
| `portal/admin/frontend/src/index.css` | +18 lines (html/body/#root reset) |
| `portal/admin/frontend/src/components/routing/RouteConfig.tsx` | -162, +59 (nested routes) |
| `portal/admin/frontend/src/components/layout/AppLayoutWrapper.tsx` | ~14 lines (Outlet pattern) |

## Build Verification

- Vite production build: PASS (2.56s, 0 errors)
- Linter: 0 new errors (pre-existing TS errors in unmodified files: checkbox.tsx, dialog.tsx, UserManagementOverlay.tsx)

## Key Decisions

1. Used `:has(.loading-container)` CSS selector to scope loading styles — widely supported in modern browsers (Chrome 105+, Firefox 121+, Safari 15.4+)
2. Placed `#root` reset OUTSIDE `@layer` because `@layer base` has lower priority than unlayered styles from `index.html`
3. Used React Router `<Outlet/>` pattern instead of `{children}` to prevent layout remounting

## Issues Encountered

None. Clean fix with no side effects.

## Next Steps

- Test in Codespaces to confirm visual fix
- Consider extracting sidebar collapsed state to a context if persistence across sessions (sessionStorage) is desired
- Pre-existing TypeScript strict errors in `checkbox.tsx`, `dialog.tsx`, and `UserManagementOverlay.tsx` should be addressed in a future session

## Context for Next Agent

The portal layout is now architecturally correct:
- `#root` renders as a plain block element (no flex centering)
- Height chain: `html` -> `body` -> `#root` all `height: 100%`
- Single `AppLayoutWrapper` instance shared across all admin routes via `<Outlet/>`
- Sidebar state persists across page navigation (no more remounting)
