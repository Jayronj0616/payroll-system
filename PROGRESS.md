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

- [x] `users` table + owner account seeded (`supabase/migrations/002-multiuser.sql` — run this migration first)
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

- [ ] **Owner-only Accounts management page** — superseded by the multi-tenant pivot below. Do not build the old version of this; see the new spec under "In progress — Multi-tenant pivot."

## In progress — Multi-tenant pivot (SaaS) — started 2026-09-08

Goal: move from per-`user_id` data isolation to per-`account_id` (tenant) isolation, so unrelated businesses can share the platform without seeing each other's data, and a superadmin role can manage tenant admin accounts without ever seeing tenant payroll data. This invalidates the old "owner sees aggregated totals across all accounts" model — do not build anything on that model going forward.

Decisions locked in with Jay Ron (2026-09-08 session):
- [x] Roles: `owner` (superadmin — platform operator only) / `admin` (tenant owner — runs their own payroll). **`staff` descoped 2026-09-09** — each tenant account is single-user (just the admin) by design, so a third role adds nothing. `'staff'` stays allowed in the DB check constraint (`users_role_check`, migration 004) for schema flexibility, but no UI, actions, or app logic should ever create or handle a `staff` user. Do not build this.
- [ ] Superadmin scope is narrow: create admin accounts, edit admin credentials (username/password reset), deactivate/reactivate admin accounts. No employees/payrolls access, no tenant data visibility at all — not even read-only.
- [ ] Billing/payments: explicitly out of scope for this pivot. Isolation only, no billing.
- [ ] Login structure: two separate logins for Jay Ron himself, not one login with two roles. A superadmin session must never be able to see tenant data, including his own — special-casing "superadmin but only for their own account" was considered and rejected as more bug-prone than a flat "superadmin = zero tenant queries" rule.
  - `jayronj0616` — existing user row, password hash untouched, becomes `admin` of a real tenant account (his actual business). All employees/payrolls currently under his `user_id` get backfilled to this account's `account_id` — this is the production data that must not be lost.
  - `jayron616` — brand new user row, role `owner`, `account_id = null`. Password was typed in plaintext in chat (`Loki0717!`) — Jay Ron decided 2026-09-09 not to rotate it, keeping it as-is. Never paste a real plaintext password in chat again regardless; generate the bcrypt hash locally and paste only the hash (see how migration 003 handles the demo password for the pattern to follow).
  - Confirmed as of this session: no other `admin` users exist in production besides `jayronj0616` — this is a 2-tenant backfill (jayronj0616's new account + the existing demo account from migration 003), not an N-tenant one.
- [ ] `user_id` columns on `employees`/`payrolls` are kept (not dropped) in this migration as a rollback safety net. Drop them in a later cleanup migration only after `account_id` scoping is verified working end-to-end.

### Plan / build checklist

- [ ] **Migration 004 — accounts + account_id backfill**
  - [ ] New `accounts` table: `id`, `name`, `is_active`, `created_at`.
  - [ ] One account row for jayronj0616's tenant, one for the demo account.
  - [ ] `users.account_id` added (nullable — null for `owner` rows). Role check constraint widened to `('owner','admin','staff')` now even though `staff` isn't built yet, to avoid touching the constraint again later.
  - [ ] Insert new `jayron616` row: `role = 'owner'`, `account_id = null`. Password hashed from `Loki0717!` — hash it locally, do not paste the plaintext into any file or chat again.
  - [ ] Update existing `jayronj0616` row: set `account_id` to his new tenant account's id. Role stays `admin`, password hash untouched.
  - [ ] `employees.account_id` / `payrolls.account_id` added (nullable at first), backfilled via join through existing `user_id → users.account_id`, then enforced `NOT NULL` once backfilled. `user_id` columns stay in place, not dropped.
- [x] **App code changes** — completed and verified 2026-09-08 (`npm run build` clean, no type errors, all routes compiling: `/`, `/dashboard`, `/employees`, `/payrolls`, `/accounts`).
  - [x] `lib/session.ts` — `SessionPayload` has `accountId: number | null` alongside `userId`; role type is `"owner" | "admin" | "staff"`.
  - [x] `components/NavBar.tsx` — role prop type widened to include `"staff"` (caught during implementation, wasn't on original checklist).
  - [x] `app/actions/auth.ts` — session cookie carries `accountId` from the `users` row on login.
  - [x] `app/dashboard/page.tsx` — `isOwner` aggregation branch removed; `accountId === null` sessions redirect to `/accounts`; tenant sessions scoped to `account_id`.
  - [x] `app/employees/actions.ts`, `app/employees/page.tsx`, `app/payrolls/actions.ts`, `app/payrolls/page.tsx` — all queries scoped to `account_id`; superadmin sessions (`accountId = null`) redirect away.
  - [x] New `/accounts` page (`app/accounts/page.tsx`, `AccountsClient.tsx`, `actions.ts`) — superadmin-only, list/create/edit-credentials/deactivate/reactivate admin accounts, no tenant data access. Combined-form account creation (account name + first admin user in one step, per decision locked in this session).
  - [x] `middleware.ts` — confirmed no change needed, role-agnostic (only checks cookie validity).
- [ ] **Manual verification (not yet done)**
  - [ ] jayronj0616 can log in, sees only his own (pre-existing) employees/payrolls under the new `account_id` scoping — nothing lost, nothing from the demo account leaks in.
  - [ ] jayron616 can log in, sees zero payroll/employee data, can only manage admin accounts.
  - [x] Data-level check done 2026-09-09 via direct read-only Supabase query (not through the UI): `jayronj0616`→account 1 (19 employees, 85 payrolls), `demouser1`→account 2 (7 employees, 10 payrolls), 0 rows with null `account_id` in either table, `jayron616` role=owner/account_id=null as expected. No cross-account leakage possible at the data layer. UI/session click-through still not done — do that next, should just be a formality given this.
  - [x] Demo account (migration 003) confirmed isolated under its own `account_id` (2) per the same query — separate from `jayronj0616`'s account (1), correct employee/payroll counts.
  - [x] Investigated a report that `jayronj0616` was showing as `role='owner'` — direct DB query 2026-09-09 shows he's already `role='admin'`, correctly configured. Cause of the discrepancy unclear (stale page? manual fix in Supabase table editor before this check?). `006-fix-tenant-admin-role.sql` is a no-op against current data — kept in the migrations folder as a defensive safeguard only, no need to run it.
- [x] Rotate `jayron616`'s password — decided against 2026-09-09, Jay Ron is keeping it as-is. Not doing this.

## Not started — Payroll Groups become per-account (admin-managed) — started 2026-09-08

Goal: `payroll_group` is currently a hardcoded 2-value enum (`BASE 3` / `MF`) baked into `lib/employee.ts` and shared globally across the entire app — not a per-tenant concept at all. Move it to a real `payroll_groups` table scoped by `account_id`, so each admin manages their own set of groups instead of everyone sharing one global fixed pair. Triggered by noticing the demo seed data was assigning employees into `BASE 3`/`MF` — Jay Ron's own real production group names — which shouldn't leak into demo data or apply to other tenants at all.

Decisions locked in with Jay Ron (2026-09-08 session):
- [x] New accounts get a `General` payroll group auto-created the moment the account itself is created (in `createAccount`, same step as creating the account row + first admin user) — not lazily created later.
- [x] New employees with no group explicitly picked default to `General`.
- [x] Jay Ron's existing production data: migration auto-creates real `BASE 3` and `MF` rows under his `account_id`; his existing employees get pointed at those rows (their actual group assignments are not touched/reassigned).
- [x] Auto-suggestion by employee name (`MF_EMPLOYEE_NAMES`: PULONG, TATA ROMY, ARIEL, WILSON → MF group) stays exactly as-is, but is gated to fire **only** for Jay Ron's specific `account_id`. Every other account (including demo) gets no name-based auto-suggestion at all — new employees there just default to `General` regardless of name.
- [x] Admin-facing group management (create/rename) lives on its own new page with its own nav item — "Payroll Groups" — not folded into the Employees page.
- [x] Group delete behavior (decided 2026-09-09 with Jay Ron): if employees are still assigned to the deleted group, they're auto-reassigned to `General` rather than blocking the delete.
- [x] `General` group is locked (decided 2026-09-09 with Jay Ron): it can never be renamed or deleted — enforced both server-side (`renamePayrollGroup`/`deletePayrollGroup` reject it explicitly) and in the UI (Rename/Delete buttons replaced with a "Locked" label for it).
- [ ] Not yet decided: whether the old free-text `employees.payroll_group` column gets dropped after the FK-based `payroll_group_id` is backfilled and verified, or kept as a rollback safety net like `user_id` was in the account_id pivot — same pattern, decide at migration-write time.

### Plan / build checklist

- [x] **New migration — payroll_groups table + backfill** — `supabase/migrations/005-payroll-groups.sql` written and run 2026-09-08, no error reported. Creates `payroll_groups` (account_id-scoped), adds `employees.payroll_group_id` (FK, old free-text `payroll_group` column kept as rollback safety net, not dropped), creates real `BASE 3`/`MF` rows under Jay Ron's account with his existing employees backfilled to them, creates `General` for the demo account with its employees backfilled, plus a catch-all `General` for any other account. `payroll_group_id` is NOT YET enforced NOT NULL — deferred until app code actually writes it on create/update and that's verified working, same staged approach as the account_id pivot.
- [x] **`app/accounts/actions.ts`** — `createAccount` now also inserts the new account's `General` payroll_groups row, in the same sequence as account + first admin user, with rollback (deletes user + account) if the group insert fails.
- [x] **New `/payroll-groups` page + actions** — done 2026-09-09. `app/payroll-groups/actions.ts`: `createPayrollGroup`, `renamePayrollGroup`, `deletePayrollGroup`, all admin-only (`accountId === null` redirect guard) and account-scoped. Delete auto-reassigns any employees in that group to `General` before removing the row; both rename and delete reject the `General` group explicitly server-side. `page.tsx` fetches groups + a per-group employee count, passes to `PayrollGroupsClient.tsx` (list table, Add/Rename modal, SweetAlert2 delete confirm showing the employee count that will move to General; `General` row shows a "Locked" label instead of Rename/Delete).
- [x] **`components/NavBar.tsx`** — done 2026-09-09. "Payroll Groups" link added for `admin`/`staff` roles (`role !== "owner"`), mirroring how Accounts is owner-only.
- [x] **`lib/employee.ts` rework** — done 2026-09-08. Fixed 2-value enum (`GROUP_BASE_3`, `GROUP_MF`, `PAYROLL_GROUPS`) removed entirely. `PayrollGroup` is now `{ id, account_id, name, created_at? }`. Added `GROUP_COLOR_PALETTE` (6 colors) + `groupColor()` (cycles via modulo, keyed by a group's position in its account's sorted group list) + `sortGroups()` (sorts by `created_at` ascending, replacing the old hardcoded array order). `suggestedPayrollGroup(name, accountName, accountGroups)` signature changed — now requires the account name and its groups passed in, returns `PayrollGroup | null` instead of a guaranteed string; only returns a match when `accountName === AUTO_SUGGEST_ACCOUNT_NAME` (`"Jay Ron — Payroll"`, the one account where BASE 3/MF carry real pay-structure meaning for specific people — not a general convention). Every other account gets `null` and falls back to General. `employeeGroupSortOrder` and `sortEmployees` now take the account's sorted groups array as a parameter instead of using a fixed lookup.
- [x] **`app/employees/actions.ts`, `app/employees/page.tsx`, `EmployeesClient.tsx`** — done 2026-09-08. `actions.ts`: `validate()` and both create/update actions now work against `payroll_group_id` (number) instead of the free-text `payroll_group` string; new `resolvePayrollGroupId()` helper handles explicit form selection > name-based auto-suggestion (account-gated) > General fallback, in that priority order. `page.tsx`: fetches the account's groups + account name alongside employees, passes both to the client component. `EmployeesClient.tsx`: group `<select>` is now a dynamic dropdown built from the account's real groups (shows a disabled placeholder if somehow empty); table badge color uses `groupColor()` instead of hardcoded amber/sky; the MF auto-suggestion hint text only renders when `accountName === AUTO_SUGGEST_ACCOUNT_NAME`.
- [x] **Downstream call sites**
  - [x] `app/payrolls/actions.ts`, `app/payrolls/page.tsx`, `PayrollsClient.tsx` — done 2026-09-09. Both Compute Entry and History tabs now iterate the account's real `groups` array via `groupColor()`/`group.id` instead of the removed `PAYROLL_GROUPS`/`GROUP_MF`/`employeeGroups` constants. `npm run build` confirmed clean (compiles, lints, and type-checks with no errors) — the app is no longer in the broken intermediate state.
  - [x] **Voice-command parser in `PayrollsClient.tsx`** — inspected 2026-09-08: does NOT reference group names/constants at all, matches purely on voice code or employee name via `RowState.voiceCode`/`.name`. Confirmed safe — no changes needed to the parsing logic itself, only to how rows are grouped/colored for display.
- [ ] **Manual verification (not yet done — `/payroll-groups` and the NavBar link are build-verified only, not yet clicked through: create/rename/delete flows, the General-locked UI, and the employee-reassignment-on-delete behavior all need a real run-through)**

## Paused — Landing page demo ("Try Demo") — was in progress, now blocked on the pivot above

Everything below was implemented against the old per-`user_id` model. Do not resume this until the multi-tenant pivot is done — the demo account's data model needs the same `account_id` migration as everything else, and the tour/banner work should be re-verified against the new scoping afterward, not before.

## Done — Landing page demo ("Try Demo") — built 2026-09-09

App code side is complete: banner, tour, and reset cron all built and build-verified. `intro.js` used directly (not the `intro.js-react` wrapper — dropped for React 18/App Router compatibility risk; same underlying library, just wired by hand via a `useEffect` in `components/DemoTour.tsx` instead of a class-based wrapper). Real gap found and fixed along the way: `middleware.ts` was blocking every route except `/` behind the session cookie, which would have silently redirected Vercel's cron caller to the login page before the route's own `CRON_SECRET` check ever ran — added an `/api/cron/` bypass. Verified locally: `npm run build` clean, `/api/cron/reset-demo` returns 401 with no/wrong `Authorization` header and 200 with the real one, and an actual reset run correctly recreated 7 employees + 10 payrolls under the demo account. Not yet verified: the tour's actual on-screen behavior in a real browser (cross-page continuity via `sessionStorage`, step positioning) — logic was built and reasoned through carefully but not click-tested live.

### What's left
- [x] Manual browser check of the tour — done 2026-09-09. Found and fixed a real bug: the tour never actually started (React 18 StrictMode dev double-invokes the effect; a ref-based "already started" guard let the first invocation claim the start and then get cancelled by its own cleanup, so the real second invocation saw the guard already tripped and did nothing — no error, just silently never rendered). Fixed in `components/DemoTour.tsx` by switching to a per-effect-invocation `cancelled` closure instead of a persistent ref. Full walkthrough verified after the fix: banner shows, all 3 pages' tours fire, tooltips positioned correctly (no overlap), cross-page continuity via `sessionStorage` works, ends cleanly with no leftover DOM/state.
- [ ] Set `CRON_SECRET` in Vercel's Environment Variables (Production) before relying on the schedule — it's only in `.env.local` for now. `vercel.json` already has the every-6-hours cron entry pointing at `/api/cron/reset-demo`.

## Archived — original "Try Demo" plan (superseded by the Done section above) — started 2026-09-08

Goal: a "Try Demo" button on the landing page that logs a visitor straight into a shared, seeded demo account and runs an intro.js-driven tour across Dashboard → Employees → Payrolls, including the voice-entry feature. Tour only *shows* the Add Employee / Compute Entry UI — does not walk through actually submitting anything. Demo data resets on a schedule via cron since the demo account is shared across all visitors (accepted tradeoff — visitors can edit/delete seed data between resets).

Decisions locked in with Jay Ron:
- [ ] Demo auth: reuse the existing `login()` server action with hardcoded demo credentials (no parallel auth path) — role `admin`, not `owner`, so it can't see cross-account data.
- [ ] Shared single demo account (not per-session), reset via scheduled job — Option A, chosen over per-session accounts or a read-only tour.
- [ ] Tour library: intro.js (`intro.js-react`), driven by a `?tour=1` query param on `/dashboard`, persisted across route changes via `sessionStorage` since intro.js has no built-in cross-route continuity in App Router.
- [ ] Reset cron interval: every 6 hours.
- [ ] Cron endpoint auth: `CRON_SECRET` env var, checked against the `Authorization` header in the route handler (this is also what Vercel's scheduled cron sends automatically when the env var is set) — unauthenticated hits to the route must get a 401, not a reset.
- [ ] Seed data: dummy placeholder names ("Employee 1", "Employee 2", etc.) — not realistic names.

All open questions resolved — ready to build.

### Plan / build checklist

- [x] **Demo user + seed data** — `supabase/migrations/003-demo-seed.sql` rewritten 2026-09-08 to fix two bugs from the original version: (1) password_hash was left as the literal placeholder string `REPLACE_WITH_BCRYPT_HASH`, never a real hash, so login always failed; (2) it predated the account_id pivot, so demouser1/employees/payrolls had no account_id at all. Rewritten to create a real "Demo Account" row, wire demouser1 + all seed employees/payrolls to it via account_id, and clean up the old broken rows (payrolls → employees → user, in FK-safe order) before reseeding. Demo user `demouser1` (role admin), 7 employees (Employee 1-7, mixed active/inactive, voice codes demo1-7), 2 payroll runs per active employee. Delete-then-insert pattern for employees/payrolls, reusable by the reset cron.
  - [x] Real bcrypt hash generated for `demopassword1` and included directly in the migration file (no more placeholder).
  - [ ] Jay Ron to run the corrected migration in Supabase SQL Editor (depends on migration 004 already being applied) and confirm demouser1 login works.
  - [ ] Note: seed employee `payroll_group` values currently hardcode `BASE 3`/`MF` — this will need to change to `General` once the Payroll Groups feature below lands, since demo employees shouldn't reference Jay Ron's real production group names.
- [ ] **Landing page button**
  - [ ] Add "Try Demo" button next to "Sign In" on `app/page.tsx`.
  - [ ] Wire it to submit the existing `login` action with demo credentials held server-side (not visible/typed by the visitor).
  - [ ] On success, land on `/dashboard?tour=1` (same query-param pattern as the existing `?login=1`).
- [ ] **Demo mode indicator**
  - [ ] Persistent "Demo Mode" banner shown while `?tour=1` / demo session is active.
- [ ] **intro.js tour**
  - [ ] Install `intro.js` + `intro.js-react`.
  - [ ] Dashboard step(s): explain the summary cards.
  - [ ] Employees step(s): point at the table and the Add Employee button, explain without opening the modal.
  - [ ] Payrolls step(s): Compute Entry tab — point at voice-entry button, explain it; Past Records tab — explain history view.
  - [ ] Cross-page step continuity via `sessionStorage` (dashboard → employees → payrolls).
- [ ] **Reset job**
  - [ ] `/api/cron/reset-demo` route: deletes all `employees`/`payrolls` rows for the demo `user_id`, re-inserts the fixed seed set.
  - [ ] Protect route with `CRON_SECRET` header/token check.
  - [ ] `vercel.json` cron entry to hit the route on a schedule.
- [ ] **Manual verification (not yet done)**
  - [ ] "Try Demo" logs in and lands on dashboard with tour auto-starting.
  - [ ] Tour correctly walks all three pages without breaking on navigation.
  - [ ] Demo account data isolated from real accounts (no leakage either direction).
  - [ ] Reset cron actually restores seed data on schedule.



## Done — Single Cash Advance field (all accounts) — 2026-09-09

`cash_advance_lea` / `cash_advance_bitoy` retired app-wide in favor of one `cash_advance` field — the Lea/Bitoy split was specific to Jay Ron's original business, not a general concept. `lib/employee.ts` (`calculatePayroll`, `Payroll` type), `app/payrolls/actions.ts`, `app/payrolls/PayrollsClient.tsx` (compute entry, confirm modal, history), and the demo reset route all updated; `npm run build` clean. Old columns kept in the DB as a rollback safety net, not dropped.
- [ ] **Jay Ron: run `supabase/migrations/007-single-cash-advance.sql`** in the Supabase SQL Editor — adds `cash_advance` and backfills it from the two old columns. Not yet run.

## Needs verification / open items (carried over, unchanged by this session)

- [ ] Voice commands: confirm still working in Chrome/Edge on the deployed Vercel URL (Web Speech API needs HTTPS/secure context)
- [ ] Success toast flow (`?success=` query param + strip-after-fire) — confirm no edge cases (e.g. back button re-showing toast)
- [ ] Employee form validation errors rendered in-modal via Server Action — confirm all validation messages match the original Laravel messages
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never referenced from client components — still true, unchanged this session

## Security notes — read before deploying

- `jayronj0616`'s password was typed in plaintext during a chat session (2026-08-29). Decided 2026-09-09: Jay Ron is keeping it as-is, not rotating. Same call made for `jayron616`'s password above.
- `SESSION_SECRET` is now set in both `.env.local` and Vercel (Production + Preview) — resolved 2026-08-29.
- `SESSION_SECRET` should never be reused across projects and never committed — `.env.local` is already gitignored, confirmed.

## How to update this file

Append/check off items as work happens. Keep the "Needs verification" and "Not yet assessed" sections honest — don't mark something done without actually checking it.
