-- Migration 006: fix jayronj0616's role after the account_id pivot
--
-- Migration 002 seeded jayronj0616 with role = 'owner', back when 'owner'
-- meant "the single admin of the single-tenant app" (a model retired by
-- the multi-tenant pivot in migration 004). Under the current three-role
-- model, 'owner' means superadmin-only and must always have account_id =
-- null. Migration 004 correctly set jayronj0616.account_id but never
-- updated his role to match, leaving an inconsistent row: role='owner'
-- with a real account_id.
--
-- No data-access impact — every page guard checks session.accountId, not
-- role (confirmed by grep across the app). The only visible effect is
-- components/NavBar.tsx, which reads role to decide which nav links to
-- show: jayronj0616 was missing the "Payroll Groups" link and saw a
-- useless "Accounts" link that just bounces back to /dashboard.
--
-- Verified 2026-09-09 via direct DB query: jayronj0616 is already role='admin'
-- in production. This migration is currently a no-op there. Kept as a
-- defensive safeguard in case the role ever drifts back to 'owner' — not
-- required to run.
--
-- Idempotent — safe to re-run.
update users
set role = 'admin'
where username = 'jayronj0616'
  and account_id is not null
  and role = 'owner';
