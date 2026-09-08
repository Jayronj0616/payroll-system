-- Migration 003: demo account + seed data for the landing-page "Try Demo" feature
-- Run this in Supabase SQL Editor AFTER migration 002 has already been applied.
-- Idempotent (safe to re-run) EXCEPT for the payroll insert block, which
-- deletes and re-inserts every time by design (same behavior the reset
-- cron will use).

-- 1. Demo user -----------------------------------------------------------
-- Username: demouser1
-- Password: demopassword1  (demo-only account, low privilege, role=admin
-- so it never sees cross-account owner data)
--
-- Generate the bcrypt hash for the password above before running this file:
--   node -e "console.log(require('bcryptjs').hashSync('demopassword1', 10))"
-- Paste the result in place of REPLACE_WITH_BCRYPT_HASH below.
insert into users (username, password_hash, role)
values (
  'demouser1',
  'REPLACE_WITH_BCRYPT_HASH',
  'admin'
)
on conflict (username) do nothing;

-- 2. Clear any existing demo data (safe to re-run / used by reset cron) --
delete from payrolls
where user_id = (select id from users where username = 'demouser1');

delete from employees
where user_id = (select id from users where username = 'demouser1');

-- 3. Seed employees --------------------------------------------------------
-- Mix of active/inactive, multiple payroll groups, distinct voice codes
-- (scoped per-user per migration 002, so these never collide with real
-- accounts' voice codes).
insert into employees (name, voice_code, daily_rate, payroll_group, is_active, user_id)
select * from (values
  ('Employee 1', 'demo1', 550.00, 'BASE 3', true, (select id from users where username = 'demouser1')),
  ('Employee 2', 'demo2', 550.00, 'BASE 3', true, (select id from users where username = 'demouser1')),
  ('Employee 3', 'demo3', 600.00, 'BASE 4', true, (select id from users where username = 'demouser1')),
  ('Employee 4', 'demo4', 600.00, 'BASE 4', true, (select id from users where username = 'demouser1')),
  ('Employee 5', 'demo5', 650.00, 'BASE 5', true, (select id from users where username = 'demouser1')),
  ('Employee 6', 'demo6', 550.00, 'BASE 3', false, (select id from users where username = 'demouser1')),
  ('Employee 7', 'demo7', 600.00, 'BASE 4', false, (select id from users where username = 'demouser1'))
) as t(name, voice_code, daily_rate, payroll_group, is_active, user_id);

-- 4. Seed payroll history --------------------------------------------------
-- A couple of past payroll runs per active employee so "Past Records" has
-- something to show. Formula matches lib logic:
--   total_salary = (daily_rate * days_worked) + ((daily_rate / 8) * overtime_hours) - cash advances
insert into payrolls (
  employee_id, payroll_date, days_worked, overtime_hours, overtime_pay,
  cash_advance_lea, cash_advance_bitoy, total_salary, user_id
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
  e.user_id
from employees e
join (
  values
    ('2026-08-15'::date, 6.0, 2.0),
    ('2026-08-31'::date, 6.0, 0.0)
) as d(payroll_date, days_worked, overtime_hours) on true
where e.user_id = (select id from users where username = 'demouser1')
  and e.is_active = true;
