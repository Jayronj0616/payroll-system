# Conventions

**What this file is for:** the agents in `.claude/agents/` know how to plan, verify and audit, but
nothing about *your* project. This is where you tell them.

---

## What this project is

A 1:1 port of a Laravel payroll system to Next.js 14 (App Router) + Supabase Postgres, deployed on
Vercel. No auth library — a custom signed session cookie. Multi-tenant SaaS: an `owner` (platform
superadmin, zero tenant data access) manages `admin` accounts, each `admin` runs payroll for their own
business under strict `account_id` isolation. Used by Jay Ron's real business plus a public, shared
"Try Demo" account that resets on a schedule.

**Stack:** Next.js 14.2.15 (App Router, Server Actions), React 18, TypeScript, Supabase Postgres
(service-role key, server-side only — RLS is disabled everywhere), Tailwind CSS, bcryptjs, SweetAlert2,
Web Speech API (voice payroll entry), intro.js (demo tour).

---

## Commands

| Purpose | Command |
| --- | --- |
| Full check (the closing gate) | `npm run build` |
| Fast check (runs every turn) | `npx tsc --noEmit` |
| Tests, one file | — no test suite exists in this project |
| Run the app locally | `npm run dev` |

`npm run lint` looks like it should work and does not: ESLint was never configured here, so `next lint`
opens an interactive "How would you like to configure ESLint?" wizard and hangs/fails when run
non-interactively. Do not use it as a check. This is also why `verify`/`verifyFast` in
`harness.config.json` are `npm run build` / `npx tsc --noEmit` rather than lint or test commands.

---

## Where things live

| Layer | Path | Owns |
| --- | --- | --- |
| Feature pages + Server Actions | `app/employees/`, `app/payrolls/`, `app/payroll-groups/`, `app/accounts/` | Each has `page.tsx` (server, data fetch + session guard), `actions.ts` (Server Actions), `*Client.tsx` (client component, UI + form state) |
| Shared domain logic | `lib/employee.ts` | Payroll calc (`calculatePayroll`), `Employee`/`Payroll`/`PayrollGroup` types, group color/sort logic |
| Auth + session | `app/actions/auth.ts`, `lib/session.ts` | Login/logout, signed session cookie (Web Crypto HMAC — works in both Edge middleware and Node) |
| Supabase access | `lib/supabase-server.ts` | Server-side client, service-role key |
| Route protection | `middleware.ts` | Session-cookie gate on every route except `/` and `/api/cron/*` |
| DB schema + migrations | `supabase/migrations/` | Numbered `.sql` files, run by hand via Supabase SQL Editor, no CLI |
| Demo feature | `lib/demo.ts`, `components/DemoBanner.tsx`, `components/DemoTour.tsx`, `app/api/cron/reset-demo/` | Shared demo account, its banner/tour, and the reset job |

**Read this first:** `lib/employee.ts`. It's the payroll calc, the shared types, and the pattern every
account-scoped feature follows — functions take the account's own groups/data as a parameter instead of
assuming a global fixed set, which is the whole point of the multi-tenant pivot.

---

## Traps

- **No test suite exists.** `verify` is `npm run build`, not a test run — "tests pass" is never a valid
  claim in this repo, "build succeeds with no type errors" is the real bar.
- **`npm run lint` is broken**, not just slow — see Commands above. Don't add it as a check anywhere.
- **RLS is disabled on every Supabase table.** Tenant isolation (`account_id`) is enforced entirely in
  application code — every query in a page/action must filter `.eq("account_id", session.accountId)`.
  A missing filter is a silent cross-tenant data leak, not an error you'll see.
- **`session.role` is read in exactly one place**, `components/NavBar.tsx`, purely to decide which nav
  links render. Every real access guard checks `session.accountId === null` instead. Don't assume role
  is enforced anywhere it isn't explicitly checked.
- **Migrations have no runner or tracking table.** They're plain `.sql` files in
  `supabase/migrations/`, applied by hand in numeric order via the Supabase SQL Editor. Write new ones
  idempotently (`if not exists`, `on conflict do nothing`) since there's no record of what's already run.
- **Several unused-looking columns are deliberate rollback safety nets, not dead code:**
  `employees.user_id` / `payrolls.user_id` (pre-`account_id` scoping), `employees.payroll_group`
  (free-text, pre-FK `payroll_group_id`), `payrolls.cash_advance_lea` / `cash_advance_bitoy`
  (pre-single-`cash_advance`). None are read by current app code. Don't drop them without checking
  `PROGRESS.md` and the relevant migration file's comments first.
- **The demo account is reset every 6 hours** by `/api/cron/reset-demo`, authenticated by a
  `CRON_SECRET` header, not a session cookie. `middleware.ts` has an explicit `/api/cron/` bypass for
  this reason — removing it would silently redirect Vercel's cron caller to the login page.
- **The `staff` role exists only in the DB check constraint**, kept for schema flexibility. It must
  never appear in UI or app logic — each tenant account is single-user (the admin only) by design.

---

## Reporting rules

- **A deferral is not a gap.** Work that was consciously postponed must not be reported as a defect, a
  finding, or a hand-off item — by a person or by an agent. From inside any single module a deliberate
  absence looks exactly like an oversight, so it will be re-raised on every audit until it is written
  down. Deferrals in this project:
  - The `staff` role is intentionally not built (descoped 2026-09-09) — its absence is not a gap.
  - The rollback-safety-net columns listed under Traps are intentionally kept and unused — not
    cleanup debt.
  - Rotating `jayronj0616`'s and `jayron616`'s passwords (both were typed in plaintext in past chat
    sessions) was explicitly decided against by Jay Ron on 2026-09-09 — do not re-flag this.
- **A claim that ages carries the date it was measured.** Any count, or any "every / all / none"
  statement, written into something durable — a doc, a status field, a user-visible string — says when it
  was measured: `measured NULL on 25 of 25 rows on 2026-08-06`. Not to prove the measurement happened,
  but because writing a date for a measurement you did not take is a deliberate act rather than an
  accident of momentum. It also makes the claim checkable later; `NULL on all rows` reads as eternally
  true.
- **Red is not automatically yours.** A failing typecheck, lint or test in code this turn did not touch
  is evidence about the tree, not a defect to fix. Where more than one session or person has uncommitted
  work in the same checkout, it is usually theirs — and "fixing" it overwrites work in progress that
  looks, from inside a single session, exactly like a mistake. Establish provenance first, and never by
  stashing: `git show HEAD:<path> | diff - <path>` compares against the committed version and changes
  nothing. `git stash && <check> && git stash pop` is refused by `guard-destructive` for that reason —
  a `pop` that conflicts buries whatever was uncommitted.
- **A priority label is not permission to start.** "Critical" or "P1" in a spec or a ticket says what
  matters, not what is next, and not what has already been decided against. Check `PROGRESS.md` before
  planning from a label — it records what's actually been decided.

---

<!-- ────────────────────────────────────────────────────────────────────────────────────────────────
     OPTIONAL — add a heading below only when you have something real to put under it. Each one earns
     its place on a bigger or older codebase and is noise on a small one.

       Data flow                  The path a request takes, as one line, then the rules it implies —
                                  the ONE sanctioned way to reach the network, and what to never do.

       Registering something new  The cross-cutting checklist that fails SILENTLY when missed. Usually
                                  not an error, just a screen that never loads. Plans forget this.

       Code conventions           ONLY what an agent would get wrong. Anything your linter enforces
                                  does not belong here — the linter is the enforcement.

       Dead code to ignore        Template leftovers and abandoned experiments. An agent that does not
                                  know these are dead will read them as precedent and copy them.

       Decisions that override    Where a later decision beats the spec, and which wins. An agent
       the spec                   reading only the spec implements work that was cancelled.

       Git                        Branch naming, commit format, ticket prefix. Note that `git log -20`
                                  is the real convention; record only what is easy to get wrong.
     ──────────────────────────────────────────────────────────────────────────────────────────────── -->

<!-- Keep this file tracked in git and keep it SHORT. Everything here is read on most planning tasks,
     so it competes with the code for the same attention. If a section outgrows a screen, it wants to
     be a doc that this file points at. -->
