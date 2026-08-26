-- Migration 002: multi-user accounts + per-user data scoping + employee active/inactive
-- Run this in Supabase SQL Editor AFTER the original supabase-schema.sql has already
-- been applied. Idempotent (safe to re-run).

-- 1. Users table -------------------------------------------------------
create table if not exists users (
  id bigint generated always as identity primary key,
  username text not null unique,
  password_hash text not null,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No RLS, same as the rest of this app — all access goes through the
-- Supabase service role key on the server, scoping is enforced in app code.
alter table users disable row level security;

-- 2. Seed the owner account --------------------------------------------
-- Username: jayronj0616
-- Password hash below corresponds to the password given during setup.
-- CHANGE THIS PASSWORD after first login (update password_hash with a
-- freshly generated bcrypt hash — never store the plaintext anywhere).
insert into users (username, password_hash, role)
values (
  'jayronj0616',
  '$2b$12$2Ai24yEePePtw6CuIgHtWOWDXmL7Mcz0YPg4SCVuOjNZ.CC2zHcQG',
  'owner'
)
on conflict (username) do nothing;

-- 3. Scope employees + payrolls to a user --------------------------------
alter table employees add column if not exists user_id bigint references users(id);
alter table employees add column if not exists is_active boolean not null default true;

alter table payrolls add column if not exists user_id bigint references users(id);

-- 4. Backfill existing rows to the owner account -------------------------
-- Anything created before multi-user existed belongs to the owner.
update employees
set user_id = (select id from users where username = 'jayronj0616')
where user_id is null;

update payrolls
set user_id = (select id from users where username = 'jayronj0616')
where user_id is null;

-- 5. Enforce going forward -----------------------------------------------
alter table employees alter column user_id set not null;
alter table payrolls alter column user_id set not null;

create index if not exists employees_user_id_idx on employees (user_id);
create index if not exists employees_is_active_idx on employees (is_active);
create index if not exists payrolls_user_id_idx on payrolls (user_id);

-- Note: voice_code was globally unique before. With multiple users each
-- managing their own employee list, voice codes may now collide across
-- users (each user's Web Speech voice-entry only ever runs against their
-- own list, so this is safe). Drop the old global-unique constraint and
-- replace it with one scoped per user.
alter table employees drop constraint if exists employees_voice_code_key;
create unique index if not exists employees_user_id_voice_code_idx
  on employees (user_id, voice_code)
  where voice_code is not null;
