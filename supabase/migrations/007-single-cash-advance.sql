-- Migration 007: consolidate cash_advance_lea + cash_advance_bitoy into a
-- single cash_advance column, for every account (not just Jay Ron's) — the
-- two-person split ("Lea"/"Bitoy") was specific to his original business
-- and never made sense as a general concept for other tenants.
--
-- cash_advance_lea / cash_advance_bitoy are kept in place (not dropped),
-- same rollback-safety-net pattern used for user_id (migration 004) and
-- the free-text payroll_group column (migration 005). App code no longer
-- reads or writes them after this migration.
--
-- Idempotent — safe to re-run.

alter table payrolls add column if not exists cash_advance numeric(10, 2) not null default 0;

update payrolls
set cash_advance = coalesce(cash_advance_lea, 0) + coalesce(cash_advance_bitoy, 0);
