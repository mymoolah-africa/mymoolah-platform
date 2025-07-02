# MyMoolah Wallet Frontend

A modern, scalable, mobile-first digital wallet web app for Africa, built with React, Vite, TypeScript, and Tailwind CSS.

## Project Overview

- **Purpose:** Provide a sleek, intuitive, and data-efficient wallet experience for African users.
- **Platform:** Responsive web app (PWA-ready), with future plans for Android/iOS SDKs.
- **Branding:** Matches [mymoolah.africa](https://www.mymoolah.africa) and uses official logos and color schemes.
- **Data Efficiency:** Optimized for low data usage and fast performance, especially on mobile.

## Tech Stack

- [React](https://react.dev/) + [Vite](https://vitejs.dev/) (TypeScript)
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [React Query](https://tanstack.com/query/latest) for API state (recommended)
- [Axios](https://axios-http.com/) for HTTP requests
- [Jest](https://jestjs.io/) & [React Testing Library](https://testing-library.com/) for testing

## Type Safety & Linting

- **TypeScript:** All components and business logic are fully typed for safety and maintainability.
- **Shared Interfaces:** The `Transaction` interface is used across transaction-related components for consistency and type safety.
- **Linting:** The project uses ESLint with TypeScript rules. Run `npm run lint` to check for issues.
- **Build:** The project builds cleanly with `npm run build` (no errors or warnings).

## Build & Test

- `npm run lint` — Check for code and type issues
- `npm run build` — Build the project for production
- `npm test` — Run tests (if implemented)

## Troubleshooting

- **TypeScript errors:** Ensure all interfaces are up to date and utility functions have type declarations (see `src/components/utils.d.ts`).
- **Lint errors:** Remove unused imports and avoid using `any`—prefer `unknown` or specific types.
- **Directory issues:** Always run commands from the `mymoolah-wallet-frontend` directory.

## Status

- ✅ All code is type-safe and passes lint/build checks as of July 2024.
- 🚀 Ready for further development and deployment.

## Folder Structure
