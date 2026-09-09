-- Migration 003: demo account + seed data for the landing-page "Try Demo" feature
-- REPLACES the original 003 — that version predates the multi-tenant
-- (account_id) pivot and was run once with an invalid password_hash
-- placeholder ('REPLACE_WITH_BCRYPT_HASH', not an actual hash) and no
-- account_id at all. Run this file to fix both problems.
--
-- Run this in Supabase SQL Editor AFTER migration 004 has already been applied
-- (this migration depends on the `accounts` table and `users.account_id` /
-- `employees.account_id` / `payrolls.account_id` columns existing).
--
-- Idempotent for the user/account rows. The employee/payroll blocks
-- delete-then-reinsert every time by design (same behavior the reset
-- cron will reuse).

-- 0. Clean up the broken row from the original migration 003, if present --
-- The original run inserted demouser1 with password_hash literally equal
-- to the placeholder string, and no account_id. It was never a working
-- login, but its old seed employees/payrolls (inserted under its user_id,
-- pre-account_id) still reference it via FK -- those must go first, or the
-- user delete below violates employees_user_id_fkey / payrolls_user_id_fkey.
delete from payrolls
where user_id = (select id from users where username = 'demouser1' and password_hash = 'REPLACE_WITH_BCRYPT_HASH');

delete from employees
where user_id = (select id from users where username = 'demouser1' and password_hash = 'REPLACE_WITH_BCRYPT_HASH');

delete from users
where username = 'demouser1'
  and password_hash = 'REPLACE_WITH_BCRYPT_HASH';

-- 1. Demo account ----------------------------------------------------------
insert into accounts (name, is_active)
select 'Demo Account', true
where not exists (select 1 from accounts where name = 'Demo Account');

-- 2. Demo user ---------------------------------------------------------
-- Username: demouser1
-- Password: demopassword1  (public demo credential, role=admin, tied to
-- the Demo Account tenant — never a superadmin/owner session, so it can
-- never see other tenants' data)
--
-- Hash below is bcryptjs.hashSync('demopassword1', 10) — matches the cost
-- factor already used elsewhere in this codebase (see app/accounts/actions.ts,
-- which uses 12; login comparison only cares that it's a valid bcrypt hash,
-- cost factor doesn't need to match across rows).
insert into users (username, password_hash, role, account_id, is_active)
select
  'demouser1',
  '$2b$10$2AFf8cE7xVQvXJHABs6eK.vjT7cAXJ/1M.Msijb4SkhgmH20gJ4aW',
  'admin',
  (select id from accounts where name = 'Demo Account'),
  true
where not exists (select 1 from users where username = 'demouser1');

-- If demouser1 already existed from a prior partial run with the correct
-- hash but missing account_id, backfill it rather than skipping.
update users
set account_id = (select id from accounts where name = 'Demo Account')
where username = 'demouser1'
  and account_id is null;

-- 3. Clear any existing demo data (safe to re-run / used by reset cron) --
delete from payrolls
where account_id = (select id from accounts where name = 'Demo Account');

delete from employees
where account_id = (select id from accounts where name = 'Demo Account');

-- 4. Seed employees --------------------------------------------------------
-- Mix of active/inactive, multiple payroll groups, distinct voice codes
-- (scoped per-account, so these never collide with real tenants' voice codes).
insert into employees (name, voice_code, daily_rate, payroll_group, is_active, user_id, account_id)
select
  t.name, t.voice_code, t.daily_rate, t.payroll_group, t.is_active,
  (select id from users where username = 'demouser1'),
  (select id from accounts where name = 'Demo Account')
from (values
  ('Employee 1', 'demo1', 550.00, 'BASE 3', true),
  ('Employee 2', 'demo2', 550.00, 'BASE 3', true),
  ('Employee 3', 'demo3', 600.00, 'BASE 4', true),
  ('Employee 4', 'demo4', 600.00, 'BASE 4', true),
  ('Employee 5', 'demo5', 650.00, 'BASE 5', true),
  ('Employee 6', 'demo6', 550.00, 'BASE 3', false),
  ('Employee 7', 'demo7', 600.00, 'BASE 4', false)
) as t(name, voice_code, daily_rate, payroll_group, is_active);

-- 5. Seed payroll history --------------------------------------------------
-- A couple of past payroll runs per active employee so "Past Records" has
-- something to show. Formula matches lib logic:
--   total_salary = (daily_rate * days_worked) + ((daily_rate / 8) * overtime_hours) - cash advances
insert into payrolls (
  employee_id, payroll_date, days_worked, overtime_hours, overtime_pay,
  cash_advance_lea, cash_advance_bitoy, total_salary, user_id, account_id
)
select
  e.id,
  d.payroll_date,
  d.days_worked,
  d.overtime_hours,
  round((e.daily_rate / 8) * d.overtime_hours, 2) as overtime_pay,
  0,
  0,
  round((e.daily_rate * d.days_worked) + ((e.daily_rate / 8) * d.overtime_hours), 2) as total_salary,
  e.user_id,
  e.account_id
from employees e
join (
  values
    ('2026-08-15'::date, 6.0, 2.0),
    ('2026-08-31'::date, 6.0, 0.0)
) as d(payroll_date, days_worked, overtime_hours) on true
where e.account_id = (select id from accounts where name = 'Demo Account')
  and e.is_active = true;
