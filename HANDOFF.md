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

- `PROGRESS.md` — current status and open items, check this before assuming something is unfinished or broken.
- `README.md` — setup steps, what was ported, and known things to sanity-check.
- `app/employees/`, `app/payrolls/` — the two feature areas (Server Actions in `actions.ts`, client components in `*Client.tsx`).
- `lib/employee.ts` — payroll group auto-suggestion + voice code logic.
- `supabase-schema.sql` — DB schema (RLS intentionally disabled, service-role key used server-side only).

## Working agreement

- Jay Ron is a software developer — explanations/plans before code, no code snippets unless asked, ask for the specific file/context needed if it isn't already readable via the Filesystem tool, no sugarcoating, don't just agree with him if something's wrong.
