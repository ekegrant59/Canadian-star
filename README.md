# The Next Great Canadian Country Star Competition

Official competition website: public marketing site, artist application intake,
email-verified fan voting, judge scoring portal, and admin dashboard.

Five live shows at The Venue in Peterborough, Ontario, January 9 to February 6, 2027.

- Build plan: [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)

## Stack

Next.js 16 (App Router) - TypeScript strict - Tailwind v4 - PostgreSQL 17 -
Drizzle ORM - Better Auth - Cloudinary - Deployed with Coolify.

## Getting started

Requires Node 22+ and Docker.

```bash
cp .env.example .env          # then fill in the secrets below
docker compose up -d          # Postgres on :5433
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Generate the two required secrets:

```bash
openssl rand -base64 32       # BETTER_AUTH_SECRET
openssl rand -base64 32       # IP_HASH_PEPPER
```

`IP_HASH_PEPPER` must be set once and kept. Changing it invalidates existing
IP-based fraud correlation.

### Ports

Postgres binds to **5433** on the host, not 5432, because a native Postgres
install is common on developer machines and silently shadows the container.
If port 3000 is busy, run `PORT=3100 npm run dev`.

## Commands

```bash
npm run dev              # dev server
npm run build            # production build (standalone output)
npm run typecheck        # tsc --noEmit  <- run before calling any task done
npm run lint             # ESLint
npm run test             # Vitest
npm run db:generate      # generate a migration from schema changes
npm run db:migrate       # apply migrations
npm run db:studio        # Drizzle Studio
npm run db:seed          # seed dev data
docker compose up -d     # local Postgres (media is Cloudinary, no container)
```

## Phase 1 status

Complete. See the implementation plan for what each phase covers.

| Area                                                 | State                                        |
| ---------------------------------------------------- | -------------------------------------------- |
| Next 16 + TypeScript strict, exact version pins      | Done                                         |
| Docker Compose parity (Postgres)                     | Done                                         |
| Dockerfile, standalone output, non-root user         | Done                                         |
| 24-table Drizzle schema + migrations                 | Done                                         |
| Vote uniqueness enforced by partial unique index     | Done, verified                               |
| Append-only audit log and consent records            | Done, verified                               |
| Better Auth, OTP signup, password login, role guards | Wired, Brevo delivery required in production |
| Security headers, nonce CSP, CVE-2025-29927 defence  | Done, verified                               |
| Design tokens from the client comps                  | Done                                         |
| Component inventory at `/dev/components`             | Done, 404s in production                     |
| Email normalization + 15 unit tests                  | Done, passing                                |

Not yet done, by design: Coolify deployment (needs VPS access), font files
(not yet supplied), and everything in Phases 2 to 6.

## Things that will bite you

- **`/dev/components`** is the visual reference for every UI primitive. It 404s
  in production.
- **Never `select()` a whole row for a public query.** Use the explicit column
  sets in `src/server/queries/columns.ts`. Artist records hold contact details
  and internal review notes.
- **Authorize before validating** in Server Actions, and scope every mutation by
  owner in the `where` clause. A Server Action is a public HTTP endpoint.
- **`src/proxy.ts` is not a security boundary.** It sets headers and does UX
  redirects. Real authorization is `requireRole()` at the data access point.
- **Only `confirmed` judges, sponsors, and prizes render publicly.** This is a
  legal requirement from §8 and §9, enforced in the query layer.
- **The tip jar ships disabled.** §7 says it should not be implemented until the
  ethical implications are defined. The scoring math must stay correct with it off.
