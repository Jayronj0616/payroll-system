-- Migration 008: dashboard totals computed in SQL
-- Run this in Supabase SQL Editor BEFORE deploying the matching dashboard
-- change. Idempotent (create or replace), touches no existing rows.
--
-- The dashboard used to download every employee and payroll row for the
-- account and sum them in JavaScript. This returns the five numbers it
-- shows as a single row instead.
--
-- Scoped by p_account_id exactly like the old queries. Only the service
-- role may call it (all reads in this app go through the service role key
-- on the server), so it is not reachable with the anon/authenticated keys.

create or replace function dashboard_stats(p_account_id bigint)
returns table (
  active_employees bigint,
  inactive_employees bigint,
  total_salaries numeric,
  latest_payroll_date date,
  latest_payroll_total numeric
)
language sql
stable
as $$
  with latest as (
    select max(payroll_date) as d
    from payrolls
    where account_id = p_account_id
  )
  select
    (select count(*) from employees where account_id = p_account_id and is_active),
    (select count(*) from employees where account_id = p_account_id and not is_active),
    (select coalesce(sum(total_salary), 0) from payrolls where account_id = p_account_id),
    (select d from latest),
    (select coalesce(sum(total_salary), 0)
       from payrolls
       where account_id = p_account_id and payroll_date = (select d from latest));
$$;

revoke execute on function dashboard_stats(bigint) from public, anon, authenticated;
grant execute on function dashboard_stats(bigint) to service_role;

-- Backs the max(payroll_date) / sum(total_salary) lookups above and the
-- payrolls page's per-account, per-date queries.
create index if not exists payrolls_account_id_payroll_date_idx on payrolls (account_id, payroll_date);
