# Project Structure: foodlens-ai

## Root Directory
- `public/` - Static assets (icons, images)
- `src/` - Application source code
  - `components/` - Shared UI components (shadcn/ui)
  - `hooks/` - Custom React hooks
  - `lib/` - Utility functions and clients (e.g., Supabase)
  - `pages/` - Main application views
  - `types/` - TypeScript definitions
- `supabase/` - Database migrations and configurations
  - `migrations/` - SQL migration files

## Configuration Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build tool configuration
- `tailwind.config.ts` - Tailwind CSS styling
- `postcss.config.js` - CSS processing
- `components.json` - shadcn/ui configuration
- `index.html` - Entry point
- `.env` - Environment variable template
- `.gitignore` - Git ignore rules
- `bun.lockb` / `package-lock.json` - Lockfiles

## Future Improvements
- **Security Hardening**: Implement stricter Row Level Security (RLS) policies in Supabase.
- **CI/CD Pipeline**: Automate deployment to the VPS using GitHub Actions.
- **Testing Coverage**: Add unit tests for hooks and integration tests for Supabase interactions using Vitest.
- **Monitoring**: Integrate error tracking (e.g., Sentry) and performance monitoring.
- **State Management**: Evaluate if local state needs migration to a global store like TanStack Store or Zustand as complexity grows.
