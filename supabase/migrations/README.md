# Supabase migrations

Run these against the Supabase project in **numeric order**, via the Supabase dashboard → SQL Editor. There is no Supabase CLI / migration runner wired up in this project — these are plain `.sql` files applied by hand.

| File | What it does |
|---|---|
| `001-initial-schema.sql` | Base `employees` / `payrolls` tables (original single-tenant port). |
| `002-multiuser.sql` | Adds `users` table, `user_id` scoping on `employees`/`payrolls`. |
| `003-demo-seed.sql` | Seeds the shared "Try Demo" account/data. Safe to re-run (delete-then-insert pattern) — also the template for the demo reset cron. |
| `004-accounts.sql` | Multi-tenant pivot: adds `accounts` table + `account_id` scoping (kept `user_id` columns as a rollback safety net — not dropped). |
| `005-payroll-groups.sql` | Adds `payroll_groups` table (per-`account_id`), `employees.payroll_group_id` FK, backfills existing free-text `payroll_group` values. |
| `006-fix-tenant-admin-role.sql` | Defensive no-op: written for a suspected `jayronj0616` role bug, but a direct DB check (2026-09-09) showed his role was already correct (`'admin'`). Not required to run — kept in case the role ever drifts. |
| `007-single-cash-advance.sql` | Adds `payrolls.cash_advance`, backfilled as `cash_advance_lea + cash_advance_bitoy`, for every account. Old two-field split is retired app-side but kept in the DB as a rollback safety net. |

New migrations: add the next number (`006-...sql`), update this table, and note it in `PROGRESS.md`.
