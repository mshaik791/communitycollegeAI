## Monorepo: web (Next.js) + api (Express)

This repo is a pnpm workspace with:

- **apps/web**: Next.js 14+ (App Router, TypeScript)
- **apps/api**: Node.js + Express (TypeScript, dotenv)

### Prerequisites

- Node.js (v18+ recommended)
- `pnpm` installed globally

### Install dependencies

```bash
pnpm install
```

### Environment variables

- **Web (`apps/web`)**
  - Copy `.env.example` to `.env.local` and adjust as needed:
  - `NEXT_PUBLIC_API_URL=http://localhost:4000`

- **API (`apps/api`)**
  - Copy `.env.example` to `.env` and adjust as needed:
  - `PORT=4000`

### Running in development

From the repo root:

```bash
pnpm dev
```

This runs both apps concurrently:

- **Web**: `http://localhost:3000`
- **API**: `http://localhost:4000`

You can also run them individually:

```bash
pnpm --filter web dev     # Next.js app
pnpm --filter api dev     # Express API
```

### Linting & formatting

- `pnpm lint` runs ESLint in each workspace.
- Prettier configs are provided in both apps.

### Database & Prisma

From `apps/api`:

```bash
cd apps/api
pnpm prisma:migrate      # create/update SQLite schema
pnpm prisma:generate     # generate Prisma client
pnpm seed                # optional: seed 20 demo sessions with barriers
```

This uses the SQLite file configured in `.env` (`DATABASE_URL="file:./prisma/dev.db"`).

### Demo features

- **Student Portal** (`/portal`): pick a demo student and click **Withdraw from classes** to start an interview session.
- **Intercept** (`/intercept`): shows Tavus placeholder, live risk meter, detected barriers, and student chat.
  - Dev-only **Demo Controls** under the Tavus box can simulate risk levels and barriers.
  - **Mark as Retained** updates analytics and dashboards for storytelling.
- **Staff Dashboard** (`/staff`): shows live session queue, risk badges, callbacks, chat inbox, and auto-reply demo mode.
- **Analytics** (`/analytics`): Retention Command Center with live-updating KPIs, charts, and a recent sessions drill-down modal.


