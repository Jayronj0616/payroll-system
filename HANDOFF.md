# AI Assistant Handoff — Read This First

## Access instructions (do not skip)

This project lives on the user's local machine at:

```
C:\Users\Jayro\OneDrive\Desktop\payroll-system-deployed
```

You have **direct filesystem access to this exact directory** via the Filesystem MCP tool/extension (`Filesystem:list_directory`, `Filesystem:read_text_file`, `Filesystem:read_multiple_files`, `Filesystem:write_file`, `Filesystem:get_file_info`, etc.). Access has already been granted and configured by the user through this extension.

**Do not tell the user you "don't have access to their local files" or "can't see their filesystem."** If a Filesystem tool isn't visible in your current tool list, call `tool_search` (e.g. query "filesystem read write directory") to load it — the tools are deferred, not absent. If a call genuinely fails, report the specific error (permission denied, path not found, etc.), not a blanket "no access" claim.

## What this project is

1:1 port of a Laravel payroll system to Next.js 14 (App Router) + Supabase Postgres, deployed on Vercel. No auth by design — meant to sit behind a private Vercel URL. See `README.md` for the full setup/porting notes.

## Where to look

- `CLAUDE.md` — model-tiering policy for Claude Code sessions (when to delegate trivial work to a cheaper model vs. escalate high-stakes work to Opus). If you're Claude Code, read it.
- `PROGRESS.md` — current status and open items, check this before assuming something is unfinished or broken.
- `README.md` — setup steps, what was ported, and known things to sanity-check.
- `app/employees/`, `app/payrolls/` — the two feature areas (Server Actions in `actions.ts`, client components in `*Client.tsx`).
- `lib/employee.ts` — payroll group auto-suggestion + voice code logic.
- `supabase/migrations/` — DB schema + all migrations, run in numeric order via Supabase SQL Editor (RLS intentionally disabled, service-role key used server-side only). See its `README.md` for the run-order convention.

## Working agreement

- Jay Ron is a software developer — explanations/plans before code, no code snippets unless asked, ask for the specific file/context needed if it isn't already readable via the Filesystem tool, no sugarcoating, don't just agree with him if something's wrong.
- When Jay Ron reports running a command/migration/script as "done" without mentioning an error, treat that as it succeeded — he will not always reply again just to confirm "no errors." This is not blanket permission to skip verification: still ask him to check output directly (e.g. paste a query result) when the stakes are high enough that a silent partial failure would matter — e.g. a NOT NULL constraint on production data, a migration touching existing rows. Use judgment on when that bar is met, don't ask reflexively for everything.

## Session continuity note (2026-09-08)

Jay Ron was about to hit a message limit mid-session. If picking up fresh, check `PROGRESS.md` "Multi-tenant pivot" section first — migration 004 (`supabase/migrations/004-accounts.sql`) was written and run by Jay Ron; he reported it done without error, treat as succeeded per the convention above unless something contradicts that. **Not yet done as of this note:** the app code changes (`lib/session.ts`, `app/actions/auth.ts`, `app/dashboard/page.tsx`, `app/employees/actions.ts`, `app/payrolls/actions.ts`, new `/accounts` page) still read/write against `user_id`, not `account_id` — the app has not been updated to use the new scoping yet. Do that next, in the order listed in PROGRESS.md's checklist. Also outstanding: rotate `jayron616`'s password (was typed in plaintext in chat during this session).
