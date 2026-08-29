# Progress / Task Tracking — Payroll System (Next.js + Supabase)

Last reviewed: 2026-08-29

## Session handoff — read this first if picking up in a new session/account

- 2026-08-29: Production deploy was 500ing on every POST (Server Components render error, digest shown in browser, real message only visible in Vercel logs) — `SESSION_SECRET` was never added to Vercel's Environment Variables, only present in local `.env.local`. Fixed by adding `SESSION_SECRET` in Vercel (Production + Preview) using the same value already in `.env.local`, then redeploying. Confirmed working by Jay Ron.
- Still open: the plaintext-password rotation noted under "Security notes" below has NOT been done yet — do this before anything else security-related.

Jay Ron is continuing this work from a different Claude account/session. Next task, in order:

1. Jay Ron still needs to manually verify: the auth flow, the Employee Active/Inactive feature, and the new loading states (see "Build status" and the two "Done" sections below for exact checklists) — do this before building anything new on top of it.
2. Then: `/accounts` owner-only admin management page.

See `HANDOFF.md` in this same directory for how to get filesystem access to this project via the Filesystem MCP tool.

## Status snapshot

- Original single-tenant Laravel port: functionally complete.
- Multi-user auth + per-account data isolation: schema done, core app code done, admin management UI and employee active/inactive UI not built yet.
- `.env.local` has `SESSION_SECRET` set. Vercel now has the same value set for Production and Preview (added 2026-08-29) — deploy confirmed working.

## Done — original port (per README + file presence)

- [x] `employees` / `payrolls` schema ported, `(employee_id, payroll_date)` uniqueness as a real constraint
- [x] Payroll calc formula ported: `(daily_rate * days_worked) + ((daily_rate / 8) * overtime_hours)`
- [x] Payroll group auto-suggestion logic (`lib/employee.ts`)
- [x] Voice code defaults/normalization (`lib/employee.ts`)
- [x] Employees page: table + create/edit modal (React state, was Alpine.js) + delete confirm (SweetAlert2)
- [x] Payrolls page: Compute Entry / Past Records tabs, live per-group totals, voice-command parser (Web Speech API) ported to `PayrollsClient.tsx`

## Done — multi-user auth (this session)

- [x] `users` table + owner account seeded (`supabase-migration-002-multiuser.sql` — run this migration first)
- [x] `employees.user_id`, `employees.is_active`, `payrolls.user_id` added, backfilled to owner, `NOT NULL` enforced
- [x] `voice_code` uniqueness changed from global to per-user
- [x] Session cookie signing (`lib/session.ts`, Web Crypto HMAC — works in both Edge middleware and Node server actions)
- [x] `middleware.ts` — blocks every route except `/` until a valid session exists
- [x] `/` — public marketing landing page with a "Sign In" button that opens a modal (not a separate page); redirects to `/dashboard` if already logged in
- [x] Login (`app/actions/auth.ts`) — bcrypt password check, generic error message either way, sets httpOnly session cookie with no expiry (cleared on tab/browser close)
- [x] Logout — form-action button in `NavBar`
- [x] `/dashboard` — owner sees aggregated totals across all accounts; admin sees only their own; both see active/inactive employee counts, total salaries, latest payroll run
- [x] `NavBar` — Dashboard/Payroll/Employees links for everyone, Accounts link for owner only (page not built yet — see below)
- [x] `app/employees/actions.ts` + `app/employees/page.tsx` — scoped to `session.userId` (create/update/delete/list all filtered; one account can't touch another's employees even by guessing an id)
- [x] `app/payrolls/actions.ts` + `app/payrolls/page.tsx` — scoped to `session.userId` the same way

## Done — Employee Active/Inactive (this session)

- [x] Hard delete removed entirely. `deleteEmployee` replaced by `deactivateEmployee` / `activateEmployee` (`app/employees/actions.ts`), both scoped by `user_id`, both write `is_active` and revalidate `/employees` + `/payrolls`.
- [x] `Employee` type (`lib/employee.ts`) now includes `is_active: boolean`.
- [x] Employees page (`EmployeesClient.tsx`) has Active/Inactive tabs with counts; row action button toggles Deactivate/Activate with direction-aware confirm dialog (deactivate warns it hides from Compute Entry but keeps payroll history; activate has no warning).
- [x] Compute Entry (`app/payrolls/page.tsx`) now only lists active employees. History (Past Records) still resolves names/rates for inactive employees via a separate unfiltered `allEmployees` list passed down to `PayrollsClient`, so old payroll records for a deactivated employee don't go blank.

## Done — Dashboard UI + loading states (this session)

- [x] `/dashboard` cards redesigned: icon badge per card (color-coded by category — emerald active, slate inactive, indigo salaries, amber latest run, violet admin accounts), split "Latest payroll run" into a clear date + separate amount instead of one cramped line, added a header divider and icons on the bottom action buttons. Purely visual, no data/query changes.
- [x] `app/loading.tsx` added — root-level Next.js loading UI (centered spinner), automatically shown during route navigation/server data fetching for every page under `app/` (dashboard, employees, payrolls). No per-route loading files needed unless a specific page later wants different loading UI.
- [x] Login button (`components/LoginModal.tsx`) now shows a spinning icon alongside the existing "Signing in..." text/disabled state while the login Server Action is in flight.
- [ ] Not yet manually confirmed by Jay Ron: login spinner renders correctly, and the app-wide spinner is visible during navigation (may be too fast to see locally against Supabase — more noticeable on deployed Vercel latency).

## Build status

- [x] `npm run build` passes clean (fixed a TS strictness error in `lib/session.ts` — `crypto.subtle.verify`'s `BufferSource` param vs a newer `@types` `Uint8Array` generic; cast only, no runtime behavior change)
- [x] `npm run build` re-run after Active/Inactive changes — compiles clean, no type errors
- [x] Production deploy confirmed reachable and functional by Jay Ron (2026-08-29) after adding `SESSION_SECRET` to Vercel — this was previously causing every POST to 500 with "Missing SESSION_SECRET env var"
- [ ] Manual verification not yet confirmed by Jay Ron: landing page loads at `/`, login works end-to-end, `/dashboard` shows correct data, employee create/edit works, payroll voice-entry still works, logout redirects and re-blocks protected routes, pre-existing employees/payrolls still visible after the multi-user backfill
- [ ] Manual verification not yet confirmed for Active/Inactive: deactivate an employee → disappears from Active tab and Compute Entry, appears in Inactive tab; reactivate → reappears in both; an employee with existing payroll history still shows correct name/rate in Past Records after being deactivated

## Not built yet

- [ ] **Owner-only Accounts management page** (`/accounts` — linked from NavBar but returns 404 right now). Needs: list admins, create admin (username + password, hashed server-side), deactivate/reactivate.

## Needs verification / open items (carried over, unchanged by this session)

- [ ] Voice commands: confirm still working in Chrome/Edge on the deployed Vercel URL (Web Speech API needs HTTPS/secure context)
- [ ] Success toast flow (`?success=` query param + strip-after-fire) — confirm no edge cases (e.g. back button re-showing toast)
- [ ] Employee form validation errors rendered in-modal via Server Action — confirm all validation messages match the original Laravel messages
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never referenced from client components — still true, unchanged this session

## Security notes — read before deploying

- The owner's actual password was typed in plaintext during this chat session. **Rotate it** before relying on this in production — generate a new bcrypt hash and update `users.password_hash` for the `jayronj0616` row directly in Supabase. Not done as of 2026-08-29.
- `SESSION_SECRET` is now set in both `.env.local` and Vercel (Production + Preview) — resolved 2026-08-29.
- `SESSION_SECRET` should never be reused across projects and never committed — `.env.local` is already gitignored, confirmed.

## How to update this file

Append/check off items as work happens. Keep the "Needs verification" and "Not yet assessed" sections honest — don't mark something done without actually checking it.
