-- Migration 005: per-account payroll groups
-- Run this in Supabase SQL Editor AFTER migration 004 has been applied.
-- Idempotent for the table/insert parts; backfill UPDATEs only ever derive
-- from existing data, safe to re-run.
--
-- What this does, in order:
--   1. Creates `payroll_groups` (account_id-scoped — each admin manages
--      their own set, no shared global groups).
--   2. Adds employees.payroll_group_id (FK), leaving the old free-text
--      employees.payroll_group column in place for now as a rollback
--      safety net, same pattern as user_id in migration 004.
--   3. Creates real "BASE 3" / "MF" groups under Jay Ron's account (his
--      actual production group names), points his existing employees at
--      them via payroll_group_id based on their current text value.
--   4. Creates a "General" group under the demo account and points demo
--      employees at it.
--   5. For every OTHER existing account (should be none besides these two
--      right now, per PROGRESS.md), creates a "General" group as a
--      catch-all so no account is left without at least one group.
--
-- Deliberately NOT done in this migration:
--   - employees.payroll_group (free text) is NOT dropped. Keep it until
--     payroll_group_id is verified working end-to-end in the app.
--   - Delete-with-employees-assigned behavior for groups is not yet
--     decided — no ON DELETE behavior beyond the FK default is assumed
--     here; the app's group-delete action will need to handle this
--     explicitly once built.

-- 1. payroll_groups table --------------------------------------------------
create table if not exists payroll_groups (
  id bigint generated always as identity primary key,
  account_id bigint not null references accounts(id),
  name text not null,
  created_at timestamptz not null default now()
);

alter table payroll_groups disable row level security;

create index if not exists payroll_groups_account_id_idx on payroll_groups (account_id);

-- 2. employees.payroll_group_id --------------------------------------------
alter table employees add column if not exists payroll_group_id bigint references payroll_groups(id);

-- 3. Jay Ron's real production groups ---------------------------------------
insert into payroll_groups (account_id, name)
select a.id, g.name
from accounts a
cross join (values ('BASE 3'), ('MF')) as g(name)
where a.name = 'Jay Ron — Payroll'
  and not exists (
    select 1 from payroll_groups pg
    where pg.account_id = a.id and pg.name = g.name
  );

update employees e
set payroll_group_id = pg.id
from payroll_groups pg
join accounts a on a.id = pg.account_id
where e.account_id = a.id
  and a.name = 'Jay Ron — Payroll'
  and pg.name = e.payroll_group
  and e.payroll_group_id is null;

-- 4. Demo account's General group -------------------------------------------
insert into payroll_groups (account_id, name)
select a.id, 'General'
from accounts a
where a.name = 'Demo Account'
  and not exists (
    select 1 from payroll_groups pg
    where pg.account_id = a.id and pg.name = 'General'
  );

update employees e
set payroll_group_id = pg.id
from payroll_groups pg
join accounts a on a.id = pg.account_id
where e.account_id = a.id
  and a.name = 'Demo Account'
  and pg.name = 'General'
  and e.payroll_group_id is null;

-- 5. Catch-all: any other existing account gets a General group too --------
-- (No-op today per PROGRESS.md — only 2 tenant accounts exist — but this
-- keeps the migration correct if that's stale by the time it's run.)
insert into payroll_groups (account_id, name)
select a.id, 'General'
from accounts a
where a.name not in ('Jay Ron — Payroll', 'Demo Account')
  and not exists (
    select 1 from payroll_groups pg
    where pg.account_id = a.id and pg.name = 'General'
  );

update employees e
set payroll_group_id = pg.id
from payroll_groups pg
join accounts a on a.id = pg.account_id
where e.account_id = a.id
  and a.name not in ('Jay Ron — Payroll', 'Demo Account')
  and pg.name = 'General'
  and e.payroll_group_id is null;

-- Sanity check note: after running, every employee row should have a
-- non-null payroll_group_id. This migration does NOT enforce NOT NULL yet
-- (unlike account_id in migration 004) — do that in a follow-up once the
-- app code actually writes payroll_group_id on create/update and this has
-- been verified end-to-end, same staged approach as the account_id pivot.
