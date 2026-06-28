# IdentityOS

An AI-powered identity vault for students. Upload documents, extract skills, projects, certifications, internships, and achievements, then explore them through dashboards, a knowledge graph, timeline, natural-language search, and a career copilot.

## Links

- **Live site**: https://identity-os-student.lovable.app
- **Preview**: https://id-preview--1bdb7cc8-bbfc-4154-a0b6-30c87232d1a5.lovable.app
- **Project**: https://lovable.dev/projects/1bdb7cc8-bbfc-4154-a0b6-30c87232d1a5

## Features

- **Dashboard** — Overview of documents, detected skills, certifications, projects, internships, and achievements with AI categorization and document activity.
- **Upload** — Drag-and-drop document uploads; automatic extraction of identity entities and AI categorization.
- **Knowledge Graph** — Interactive 2D force-directed graph of skills, projects, certifications, internships, and achievements with zoom, pan, search, and relationship labels.
- **Timeline** — Chronological, year-grouped view of certifications, projects, internships, achievements, and academic milestones.
- **AI Search** — Conversational natural-language search across all documents and records with source previews.
- **Career Copilot** — Target role analysis with strengths, missing skills, recommended certifications, projects, and a visual roadmap.
- **Demo Mode** — One-click "Load Demo Student" to populate the app with sample data for judges or first-time users.

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start/) v1 + React 19
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Backend**: Supabase (Lovable Cloud) — auth, database, storage
- **AI**: Lovable AI Gateway (Gemini models)
- **Graphs**: `react-force-graph-2d`
- **Charts**: `recharts`

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js
- Supabase project configured via `.env` with:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_PROJECT_ID`

### Install

```bash
bun install
```

### Run development server

```bash
bun run dev
```

Open the app at `http://localhost:8080` (or the port shown in the terminal).

### Build for production

```bash
bun run build
```

### Lint & format

```bash
bun run lint
bun run format
```

## Project Structure

```
src/
  components/        # shadcn/ui components + app shell
  hooks/             # Custom React hooks
  integrations/      # Supabase client and auth helpers
  lib/               # Server functions (search, copilot, demo, extract, relationships)
  routes/            # TanStack Start file-based routes
  styles.css         # Tailwind v4 + design tokens
  router.tsx         # Router configuration
  server.ts          # SSR entry
  start.ts           # Start instance configuration
```

Key routes:

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/dashboard` | Personal dashboard |
| `/upload` | Document upload |
| `/graph` | Interactive knowledge graph |
| `/timeline` | Digital journey timeline |
| `/search` | AI-powered conversational search |
| `/copilot` | Career copilot roadmap |
| `/profile` | User profile |

## Demo Mode

For judges or quick evaluation, click **"Load Demo Student"** on the dashboard. This seeds a complete sample profile (skills, certifications, projects, internship, achievements, and documents) and rebuilds relationships automatically.

## Deployment

This project is configured for edge deployment via TanStack Start's Nitro build. Deploy through the Lovable Cloud workflow or run `bun run build` locally and deploy the generated output.

## Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start development server |
| `build` | Production build |
| `build:dev` | Development build |
| `preview` | Preview production build |
| `lint` | Run ESLint |
| `format` | Run Prettier |

## License

Public — built for student identity management.
