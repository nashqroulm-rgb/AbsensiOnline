# Getting Started

<cite>
**Referenced Files in This Document**
- [package.json](file://package.json)
- [vite.config.ts](file://vite.config.ts)
- [src/main.tsx](file://src/main.tsx)
- [src/App.tsx](file://src/App.tsx)
- [src/config/supabase.ts](file://src/config/supabase.ts)
- [src/utils/cloudinary.ts](file://src/utils/cloudinary.ts)
- [supabase/config.toml](file://supabase/config.toml)
- [supabase/migrations/001_initial.sql](file://supabase/migrations/001_initial.sql)
- [supabase/migrations/002_seed_auth.sql](file://supabase/migrations/002_seed_auth.sql)
- [Cloudinary.md](file://Cloudinary.md)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Development Setup](#development-setup)
5. [Environment Variables](#environment-variables)
6. [Running the Development Server](#running-the-development-server)
7. [Building for Production](#building-for-production)
8. [Previewing the Production Build](#previewing-the-production-build)
9. [Supabase Setup and Database Initialization](#supabase-setup-and-database-initialization)
10. [Cloudinary Integration](#cloudinary-integration)
11. [First Run and Seed Data](#first-run-and-seed-data)
12. [Initial User Accounts](#initial-user-accounts)
13. [Verification Steps](#verification-steps)
14. [Common Setup Issues and Troubleshooting](#common-setup-issues-and-troubleshooting)
15. [Conclusion](#conclusion)

## Introduction
This guide helps you set up AbsensiOnline locally for development. It covers prerequisites, environment setup, running the development server, building for production, integrating Supabase and Cloudinary, seeding initial data, and verifying functionality.

## Prerequisites
- Operating system: Windows, macOS, or Linux
- Node.js: Version matching the project’s TypeScript and Vite configuration (see Dependencies section)
- Package manager: npm or yarn
- Git for cloning the repository
- Text editor or IDE configured for TypeScript and React

Why these matter:
- Node.js version compatibility ensures Vite, TypeScript, and related tooling work as expected.
- npm or yarn is required to install dependencies defined in package.json.
- Git is needed to clone the repository.

**Section sources**
- [package.json:13-39](file://package.json#L13-L39)

## Installation
Follow these steps to prepare your local environment:

1. Clone the repository
   - Use your preferred Git client or command line to clone the repository to your machine.

2. Open the project directory
   - Navigate into the cloned repository folder.

3. Install dependencies
   - Run your package manager to install dependencies defined in package.json:
     - npm: npm ci
     - yarn: yarn install
   - This installs both runtime and development dependencies.

4. Verify installation
   - Confirm that node_modules exists and that no dependency errors appear during install.

**Section sources**
- [package.json:13-39](file://package.json#L13-L39)

## Development Setup
After installing dependencies, configure your development environment:

- Use your IDE to open the project root.
- Ensure TypeScript and ESLint integrations are enabled if available.
- Keep the terminal ready for running scripts from package.json.

## Environment Variables
Create a .env file at the project root with the following variables:

- VITE_SUPABASE_URL: Supabase project URL
- VITE_SUPABASE_ANON_KEY: Supabase project anonymous key
- VITE_CLOUDINARY_CLOUD_NAME: Cloudinary cloud name
- VITE_CLOUDINARY_UPLOAD_PRESET: Cloudinary upload preset

Notes:
- These variables are consumed at runtime by the frontend.
- The Cloudinary integration checks for these variables and returns a descriptive error if missing.

**Section sources**
- [src/config/supabase.ts:3-6](file://src/config/supabase.ts#L3-L6)
- [src/utils/cloudinary.ts:16-21](file://src/utils/cloudinary.ts#L16-L21)

## Running the Development Server
Start the Vite development server:

- Command: npm run dev or yarn dev
- Vite serves the app and enables hot module replacement.
- The SPA routing is configured to serve index.html for deep links.

Expected behavior:
- The app opens automatically in your browser.
- Changes to source files reflect without manual reload.

**Section sources**
- [package.json:6-12](file://package.json#L6-L12)
- [vite.config.ts:13-47](file://vite.config.ts#L13-L47)

## Building for Production
Build the application for production deployment:

- Command: npm run build or yarn build
- Vite compiles TypeScript, React, Tailwind CSS, and assets into optimized static files under dist/.
- The build includes PWA-related configurations.

**Section sources**
- [package.json:6-12](file://package.json#L6-L12)
- [vite.config.ts:16-33](file://vite.config.ts#L16-L33)

## Previewing the Production Build
Preview the production build locally:

- Command: npm run preview or yarn preview
- Vite serves the built files on a local port for testing.

**Section sources**
- [package.json:6-12](file://package.json#L6-L12)
- [vite.config.ts:39-46](file://vite.config.ts#L39-L46)

## Supabase Setup and Database Initialization
AbsensiOnline uses Supabase for authentication and Postgres data. Follow these steps:

1. Start Supabase locally
   - Use the Supabase CLI to start the local stack.
   - The local configuration defines ports for API, DB, Studio, Inbucket, Auth, Storage, and Functions.

2. Initialize the database
   - Migrations are provided under supabase/migrations/.
   - Apply the initial schema and policies.
   - Seed data is included in the initial migration and a dedicated auth seed.

3. Configure Supabase client
   - Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.
   - The Supabase client reads these variables at runtime.

4. Access Supabase Studio
   - Studio is available locally on the configured port.
   - Use it to inspect tables, policies, and data.

Key migration highlights:
- Initial schema creates zones, shifts, users, attendances, and attachments tables with constraints and indexes.
- Row Level Security (RLS) policies restrict data access per role.
- Seed data includes zones, shifts, and users for immediate testing.

**Section sources**
- [supabase/config.toml:1-43](file://supabase/config.toml#L1-L43)
- [supabase/migrations/001_initial.sql:11-303](file://supabase/migrations/001_initial.sql#L11-L303)
- [supabase/migrations/002_seed_auth.sql:1-29](file://supabase/migrations/002_seed_auth.sql#L1-L29)
- [src/config/supabase.ts:3-6](file://src/config/supabase.ts#L3-L6)

## Cloudinary Integration
Configure Cloudinary for media uploads:

1. Obtain credentials
   - Cloud name, API key, and API secret from your Cloudinary console.

2. Set environment variables
   - Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file.

3. Use the upload utility
   - The upload utility constructs the Cloudinary endpoint and sends multipart form data.
   - Progress callbacks and error handling are integrated.

4. Follow the onboarding guide
   - Refer to the Cloudinary onboarding prompt for step-by-step setup.

**Section sources**
- [src/utils/cloudinary.ts:11-62](file://src/utils/cloudinary.ts#L11-L62)
- [Cloudinary.md:1-85](file://Cloudinary.md#L1-L85)

## First Run and Seed Data
Complete initial setup:

1. Start Supabase locally and apply migrations.
2. Launch the development server.
3. Seed data is included:
   - Zones, shifts, and users are inserted via the initial migration.
   - Additional auth users are seeded in the auth migration.

**Section sources**
- [supabase/migrations/001_initial.sql:268-303](file://supabase/migrations/001_initial.sql#L268-L303)
- [supabase/migrations/002_seed_auth.sql:1-29](file://supabase/migrations/002_seed_auth.sql#L1-L29)

## Initial User Accounts
Two pre-created users are available for testing:

- Admin user
  - Email: 080000000001@absensi.local
  - Role: admin
  - PIN: 1234

- Worker user
  - Phone: 081234567890
  - Role: worker
  - PIN: 1234

Notes:
- The auth seed inserts these users with hashed passwords.
- Use the PIN to log in via the login page.

**Section sources**
- [supabase/migrations/002_seed_auth.sql:5-27](file://supabase/migrations/002_seed_auth.sql#L5-L27)
- [supabase/migrations/001_initial.sql:288-302](file://supabase/migrations/001_initial.sql#L288-L302)

## Verification Steps
Confirm the system works:

1. Start Supabase locally and the development server.
2. Log in using one of the initial accounts.
3. Navigate to:
   - Admin dashboard (admin routes)
   - PWA home/history/profile tabs (worker routes)
4. Verify:
   - Authentication state persists
   - Navigation works across protected routes
   - Supabase data loads (zones, shifts, users)
   - Cloudinary upload utility responds appropriately when credentials are configured

**Section sources**
- [src/App.tsx:20-57](file://src/App.tsx#L20-L57)
- [src/context/AuthContext.tsx:18-36](file://src/context/AuthContext.tsx#L18-L36)

## Common Setup Issues and Troubleshooting
- Missing environment variables
  - Symptom: Supabase client fails to initialize or Cloudinary upload returns a configuration error.
  - Fix: Add VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_CLOUDINARY_CLOUD_NAME, and VITE_CLOUDINARY_UPLOAD_PRESET to .env.

- Supabase not running
  - Symptom: Network errors when fetching data or signing in.
  - Fix: Start the Supabase local stack and ensure ports are free.

- Migration errors
  - Symptom: Conflicts or missing tables after applying migrations.
  - Fix: Reapply migrations and confirm the initial migration ran successfully.

- Cloudinary upload failures
  - Symptom: Upload errors or connection timeouts.
  - Fix: Verify credentials and network connectivity; check Cloudinary console for upload preset configuration.

- PWA caching issues
  - Symptom: Outdated assets after updates.
  - Fix: Clear browser cache or disable cache during development; rebuild the app.

- Vite preview not serving deep links
  - Symptom: 404 on refresh for admin or app routes.
  - Fix: Use the preview command; the SPA configuration ensures index.html is served for deep links.

**Section sources**
- [src/config/supabase.ts:3-6](file://src/config/supabase.ts#L3-L6)
- [src/utils/cloudinary.ts:19-21](file://src/utils/cloudinary.ts#L19-L21)
- [vite.config.ts:13-47](file://vite.config.ts#L13-L47)

## Conclusion
You now have a complete local setup for AbsensiOnline. With Supabase and Cloudinary configured, the development server running, and seed data in place, you can explore admin and worker features, test authentication, and begin contributing to the project.