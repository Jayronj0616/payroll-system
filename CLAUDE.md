# CLAUDE.md — Claude Code project instructions

Read `HANDOFF.md` first (access notes, working agreement with Jay Ron, session continuity notes), then `PROGRESS.md` for current status. Both apply here too.

## Model-tiering policy (autonomous, no manual /model switching)

The primary model for this session is whatever Jay Ron has set (via `/model` or default) — that does not change mid-session, and this policy does not ask him to switch it manually. What it controls is **delegation**: before doing a sub-task yourself, decide if it should be handed to a subagent (`Agent` tool) with a cheaper or more capable model override, instead of always burning the primary model's tokens on everything.

Classify the task/sub-task first, then act:

**Tier 1 — Trivial/mechanical → delegate to a `haiku` subagent**
Examples: renaming a variable across files, formatting/lint fixes, updating a doc or comment, generating boilerplate CRUD scaffolding that mirrors an existing pattern exactly, simple one-line bug fixes where the cause is already obvious and confirmed, running/summarizing a straightforward search.
Use `Agent({ subagent_type: "general-purpose", model: "haiku", ... })` (or `Explore` for pure search) with a self-contained prompt.

**Tier 2 — Standard dev work → handle directly at the primary model**
Examples: typical feature work in `app/employees/` or `app/payrolls/`, normal bug fixes that need actual investigation, writing/updating tests, small refactors. This is the default — don't over-delegate here just to save tokens; delegation has its own overhead (a fresh subagent re-derives context).

**Tier 3 — High-stakes/complex → escalate to `opus`**
Always this tier, regardless of how simple it looks on the surface, because mistakes here are costly or hard to detect:
- Anything touching payroll calculation logic or money math
- Auth/session/`account_id` vs `user_id` scoping (the multi-tenant pivot in progress — see PROGRESS.md)
- Database migrations, especially ones touching existing rows or adding constraints
- RLS/security-relevant changes
- Any bug whose root cause isn't obvious after initial investigation

If the primary session model is already Opus, just do the work directly. If it's set lower, spawn an `Agent` with `model: "opus"` for that specific piece rather than pushing through on a weaker model — flag to Jay Ron that you did this and why.

**Don't over-engineer the classification.** If a task doesn't clearly fit Tier 1 or Tier 3, it's Tier 2 — just do it yourself. The goal is cutting obviously-wasteful token spend (Opus-tier reasoning on a mechanical rename), not adding ceremony to every request.

## Communication style (minimize token usage — decided 2026-09-09)

Jay Ron is actively managing his usage/billing and wants chat replies kept lean:

- Do not paste full file contents, diffs, or code blocks into chat replies as a way of "showing the work" — the file edits themselves are the record; he can open the file if he wants to see it.
- After finishing a task or phase, give a short plain-language summary of what changed and why, in sentences — not a section-by-section technical breakdown, not a bulleted file list, not restating code.
- If his question has a yes/no answer, lead with "Yes" or "No" and stop there unless more is actually needed. Be precise and direct — don't pad with extra context he didn't ask for.
- This applies to normal chat replies. Still put real detail in project docs (`PROGRESS.md`, migration files, code comments) — those exist precisely to hold the detail so chat doesn't have to.

## Tool usage discipline (token efficiency — added 2026-09-09)

A file read isn't a one-time cost — it gets replayed in every subsequent turn of the session, so a lazy full-file read is paid over and over, not just once.

- When reading a file larger than ~200 lines, always pass `offset`/`limit` to Read instead of slurping the whole thing — usually only the ~30 lines around the relevant function/symbol are needed. Only widen the range if the symbol you're looking for turns out not to be in it.
- With Grep: don't pull full content on a repo-wide search by default. First narrow with `output_mode: "files_with_matches"` (or `"count"`) to see where matches are, then read content with a `head_limit` set (and/or scoped to a specific file/path) instead of letting an unbounded search return thousands of matched lines.
