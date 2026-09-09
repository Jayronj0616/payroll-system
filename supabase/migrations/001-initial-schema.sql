-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query)
-- Ported 1:1 from the Laravel migrations in payroll_system/database/migrations

create table if not exists employees (
  id bigint generated always as identity primary key,
  name text not null,
  voice_code text unique,
  daily_rate numeric(10, 2) not null,
  payroll_group text not null default 'BASE 3',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payrolls (
  id bigint generated always as identity primary key,
  employee_id bigint not null references employees(id) on delete cascade,
  payroll_date date not null,
  days_worked numeric(5, 2) not null,
  overtime_hours numeric(5, 2) not null,
  overtime_pay numeric(10, 2) not null,
  cash_advance_lea numeric(10, 2) not null default 0,
  cash_advance_bitoy numeric(10, 2) not null default 0,
  total_salary numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, payroll_date)
);

create index if not exists payrolls_payroll_date_idx on payrolls (payroll_date);

-- This app has no auth (per project decision) and is accessed only via a
-- private Vercel URL, so RLS is left disabled and all reads/writes go
-- through the Supabase service role key on the server. Do not expose the
-- service role key to the browser.
alter table employees disable row level security;
alter table payrolls disable row level security;
