# Project Structure: foodlens-ai

## Root Directory
- `public/` - Static assets (icons, images)
- `src/` - Application source code
  - `components/` - Shared UI components (shadcn/ui)
  - `hooks/` - Custom React hooks this sucks.fuck the world
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
