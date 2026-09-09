-- Migration 004: multi-tenant accounts + account_id scoping
-- Run this in Supabase SQL Editor AFTER migrations 002 and 003 have already
-- been applied. Idempotent (safe to re-run) for the schema/insert parts;
-- the backfill UPDATE statements are also safe to re-run since they only
-- ever set account_id from a deterministic join, never randomly.
--
-- What this does, in order:
--   1. Creates the `accounts` table (one row per tenant business).
--   2. Widens the users.role check constraint to allow a future `staff` role.
--   3. Adds users.account_id (nullable — null means "no tenant", i.e. owner).
--   4. Creates one account for jayronj0616's existing tenant data, and one
--      for the existing demo account (migration 003), and links each user
--      to their account.
--   5. Inserts the new superadmin user `jayron616` (role owner, account_id
--      null, zero tenant data access by construction — no query in the app
--      should ever join tenant tables against an owner's account_id).
--   6. Adds employees.account_id / payrolls.account_id, backfills them from
--      the existing user_id -> users.account_id relationship (this is the
--      "don't lose data" step — every existing row already has a user_id,
--      so this is a pure derivation, nothing is guessed), then enforces
--      NOT NULL once backfilled.
--
-- Deliberately NOT done in this migration:
--   - employees.user_id / payrolls.user_id are NOT dropped. Keep them as a
--     rollback safety net until account_id scoping is verified working in
--     production. Drop them in a later cleanup migration (005+).
--   - No RLS changes — same as the rest of this app, scoping is enforced in
--     application code against the service-role client, not in Postgres.

-- 1. Accounts table -------------------------------------------------------
create table if not exists accounts (
  id bigint generated always as identity primary key,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table accounts disable row level security;

-- 2. Widen role constraint to allow the not-yet-built `staff` role --------
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check
  check (role in ('owner', 'admin', 'staff'));

-- 3. users.account_id ------------------------------------------------------
-- Nullable on purpose: owner/superadmin rows have no account_id, ever.
alter table users add column if not exists account_id bigint references accounts(id);

-- 4a. Create jayronj0616's tenant account and link it ----------------------
insert into accounts (name)
select 'Jay Ron — Payroll'
where not exists (
  select 1 from accounts where name = 'Jay Ron — Payroll'
);

update users
set account_id = (select id from accounts where name = 'Jay Ron — Payroll')
where username = 'jayronj0616'
  and account_id is null;

-- 4b. Create the demo tenant account and link the demo user ----------------
insert into accounts (name)
select 'Demo Account'
where not exists (
  select 1 from accounts where name = 'Demo Account'
);

update users
set account_id = (select id from accounts where name = 'Demo Account')
where username = 'demouser1'
  and account_id is null;

-- 5. New superadmin user: jayron616 -----------------------------------------
-- role = owner, account_id = null (no tenant data access by construction).
-- Password hash below corresponds to the password given during setup.
-- That password was typed in plaintext in chat — rotate it after this
-- migration is verified working: generate a fresh bcrypt hash and update
-- this row's password_hash directly in Supabase, then discard this file's
-- copy of the old hash (or at minimum note it's rotated).
insert into users (username, password_hash, role, account_id)
values (
  'jayron616',
  '$2b$12$zy1v6NoA6OSb0.MNr3icSek3PRYvGWWH0yiFr.2ywPGOQrEVbM4eS',
  'owner',
  null
)
on conflict (username) do nothing;

-- 6. employees.account_id / payrolls.account_id -----------------------------
alter table employees add column if not exists account_id bigint references accounts(id);
alter table payrolls add column if not exists account_id bigint references accounts(id);

-- Backfill from the existing user_id -> users.account_id relationship.
-- This only ever derives account_id from data that already exists on each
-- row (its user_id) joined against the just-set users.account_id above —
-- no row's tenant assignment is guessed.
update employees e
set account_id = u.account_id
from users u
where e.user_id = u.id
  and e.account_id is null
  and u.account_id is not null;

update payrolls p
set account_id = u.account_id
from users u
where p.user_id = u.id
  and p.account_id is null
  and u.account_id is not null;

-- Enforce going forward. If either of these fails, it means some
-- employees/payrolls row has a user_id pointing at a user with no
-- account_id (e.g. the owner row somehow got tenant data attached) —
-- investigate and fix that row manually before re-running, do not weaken
-- this constraint to work around it.
alter table employees alter column account_id set not null;
alter table payrolls alter column account_id set not null;

create index if not exists employees_account_id_idx on employees (account_id);
create index if not exists payrolls_account_id_idx on payrolls (account_id);
create index if not exists users_account_id_idx on users (account_id);

-- Note on voice_code: currently scoped unique per user_id (migration 002).
-- Once app code moves to account_id scoping, voice_code collisions should
-- be prevented per-account instead. Not changed in this migration since the
-- app still reads/writes against user_id — revisit when actions.ts moves to
-- account_id (see PROGRESS.md checklist), at which point replace the
-- per-user unique index with a per-account one and drop the old one.
