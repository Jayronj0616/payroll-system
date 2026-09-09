// Originally ported 1:1 from app/Models/Employee.php (Laravel).
// As of the per-account Payroll Groups migration (2026-09-08), payroll
// groups are no longer a fixed 2-value enum shared globally — each account
// manages its own set of groups (payroll_groups table, account_id-scoped).
// Keep the payroll math and voice_code normalization logic byte-for-byte
// equivalent to the original PHP source; the group-related logic below is
// new and specific to the multi-tenant pivot, not a direct port.

/** A payroll group as it actually exists in the DB — account-scoped, not a fixed string. */
export type PayrollGroup = {
  id: number;
  account_id: number;
  name: string;
  created_at?: string;
};

/**
 * The one account where payroll groups carry real pay-structure meaning
 * beyond a label — BASE 3 vs MF affects how certain employees are treated,
 * and specific people (see MF_EMPLOYEE_NAMES below) must land in MF
 * automatically because they're the same people every time, not a general
 * naming convention other tenants should inherit.
 *
 * Gating on the account's name (not a hardcoded id) because that's what's
 * already known/stable in this codebase — see supabase/migrations/005-payroll-groups.sql's
 * backfill, which creates BASE 3 / MF specifically for this account name.
 * If this account is ever renamed in the accounts table, this constant
 * must be updated to match, or the auto-suggestion below silently stops
 * firing for it.
 */
export const AUTO_SUGGEST_ACCOUNT_NAME = "Jay Ron — Payroll";

export const MF_EMPLOYEE_NAMES = ["PULONG", "TATA ROMY", "ARIEL", "WILSON"];

export const DEFAULT_VOICE_CODES: Record<string, string> = {
  ARIEL: "MANGO",
  PULONG: "TIGER",
  "TATA ROMY": "COBRA",
  WILSON: "PANDA",
  ENAN: "ROCKET",
  BUDDY: "FALCON",
  MICHAEL: "BAMBOO",
  JHEPOY: "OCEAN",
  TENTEN: "THUNDER",
  NEG: "COMET",
  SHERYL: "RIVER",
  DENNIS: "FOREST",
  LOUIE: "CANYON",
  TITOY: "ORCHID",
};

/**
 * Mirrors Str::of($name)->upper()->squish()->value()
 * squish = trim + collapse internal whitespace to single spaces.
 */
export function squishUpper(value: string | null | undefined): string {
  return (value ?? "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Auto-suggests a payroll group for a new employee based on their name,
 * but ONLY for the one account where this matching is meaningful (see
 * AUTO_SUGGEST_ACCOUNT_NAME above). Every other account gets no match —
 * callers should fall back to that account's General group when this
 * returns null.
 *
 * Needs the account's own groups passed in (not fetched here — this file
 * has no DB access) so it can return the actual MF group row, not just a
 * name.
 */
export function suggestedPayrollGroup(
  name: string | null | undefined,
  accountName: string,
  accountGroups: PayrollGroup[]
): PayrollGroup | null {
  if (accountName !== AUTO_SUGGEST_ACCOUNT_NAME) {
    return null;
  }

  const normalizedName = squishUpper(name);
  if (!MF_EMPLOYEE_NAMES.includes(normalizedName)) {
    return null;
  }

  return accountGroups.find((g) => g.name === "MF") ?? null;
}

/** Ported from Employee::normalizeVoiceCode */
export function normalizeVoiceCode(voiceCode: string | null | undefined): string | null {
  const normalized = (voiceCode ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  return normalized !== "" ? normalized : null;
}

/** Ported from Employee::defaultVoiceCodeFor */
export function defaultVoiceCodeFor(name: string | null | undefined): string | null {
  const normalizedName = squishUpper(name);
  return DEFAULT_VOICE_CODES[normalizedName] ?? null;
}

export type Employee = {
  id: number;
  name: string;
  voice_code: string | null;
  daily_rate: number;
  payroll_group_id: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Payroll = {
  id: number;
  employee_id: number;
  payroll_date: string; // YYYY-MM-DD
  days_worked: number;
  overtime_hours: number;
  overtime_pay: number;
  cash_advance: number;
  total_salary: number;
  created_at?: string;
  updated_at?: string;
};

/**
 * Fixed color palette for group styling in the UI. Groups are assigned a
 * color by their position in the account's group list (sorted by
 * created_at ascending — see sortGroups below), cycling via modulo once an
 * account has more groups than colors. Replaces the old hardcoded
 * sky=BASE 3 / amber=MF mapping, which only worked for a fixed 2-group
 * world.
 */
export const GROUP_COLOR_PALETTE = [
  { name: "sky", badgeBg: "bg-sky-100", badgeText: "text-sky-700", border: "border-sky-200", headerFrom: "from-sky-50", headerBorder: "border-sky-100", solidText: "text-sky-700", solidTextDark: "text-sky-900" },
  { name: "amber", badgeBg: "bg-amber-100", badgeText: "text-amber-700", border: "border-amber-200", headerFrom: "from-amber-50", headerBorder: "border-amber-100", solidText: "text-amber-700", solidTextDark: "text-amber-900" },
  { name: "violet", badgeBg: "bg-violet-100", badgeText: "text-violet-700", border: "border-violet-200", headerFrom: "from-violet-50", headerBorder: "border-violet-100", solidText: "text-violet-700", solidTextDark: "text-violet-900" },
  { name: "emerald", badgeBg: "bg-emerald-100", badgeText: "text-emerald-700", border: "border-emerald-200", headerFrom: "from-emerald-50", headerBorder: "border-emerald-100", solidText: "text-emerald-700", solidTextDark: "text-emerald-900" },
  { name: "rose", badgeBg: "bg-rose-100", badgeText: "text-rose-700", border: "border-rose-200", headerFrom: "from-rose-50", headerBorder: "border-rose-100", solidText: "text-rose-700", solidTextDark: "text-rose-900" },
  { name: "cyan", badgeBg: "bg-cyan-100", badgeText: "text-cyan-700", border: "border-cyan-200", headerFrom: "from-cyan-50", headerBorder: "border-cyan-100", solidText: "text-cyan-700", solidTextDark: "text-cyan-900" },
] as const;

export type GroupColor = (typeof GROUP_COLOR_PALETTE)[number];

/**
 * Groups sorted by created_at ascending — this is the canonical ordering
 * used everywhere (employee/payroll listing, color assignment). Replaces
 * the old hardcoded [BASE 3, MF] array order.
 */
export function sortGroups(groups: PayrollGroup[]): PayrollGroup[] {
  return [...groups].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (aTime !== bTime) return aTime - bTime;
    return a.id - b.id;
  });
}

/**
 * Color for a group, keyed by its position in the account's sorted group
 * list. Pass the full sorted groups array (from sortGroups) and the group
 * in question — cycles through GROUP_COLOR_PALETTE via modulo once an
 * account has more groups than the palette has entries.
 */
export function groupColor(sortedGroups: PayrollGroup[], group: PayrollGroup | null | undefined): GroupColor {
  if (!group) return GROUP_COLOR_PALETTE[0];
  const idx = sortedGroups.findIndex((g) => g.id === group.id);
  if (idx === -1) return GROUP_COLOR_PALETTE[0];
  return GROUP_COLOR_PALETTE[idx % GROUP_COLOR_PALETTE.length];
}

/**
 * Sort order used everywhere employees/payrolls are listed within an
 * account: by the group's position in the account's sorted group list,
 * then alphabetical by employee name. Replaces the old fixed
 * [BASE 3, MF] index lookup.
 */
export function employeeGroupSortOrder(sortedGroups: PayrollGroup[], groupId: number | null | undefined): number {
  if (groupId === null || groupId === undefined) return 99;
  const idx = sortedGroups.findIndex((g) => g.id === groupId);
  return idx === -1 ? 99 : idx;
}

export function sortEmployees<T extends { name: string; payroll_group_id: number | null }>(
  employees: T[],
  sortedGroups: PayrollGroup[]
): T[] {
  return [...employees].sort((a, b) => {
    const groupDiff =
      employeeGroupSortOrder(sortedGroups, a.payroll_group_id) -
      employeeGroupSortOrder(sortedGroups, b.payroll_group_id);
    if (groupDiff !== 0) return groupDiff;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Payroll calculation — ported 1:1 from PayrollController::store.
 *   base_salary   = daily_rate * days_worked
 *   overtime_rate = daily_rate / 8
 *   overtime_pay  = overtime_rate * overtime_hours
 *   total_salary  = base_salary + overtime_pay
 */
export function calculatePayroll(
  dailyRate: number,
  daysWorked: number,
  overtimeHours: number,
  cashAdvance: number = 0
) {
  const baseSalary = dailyRate * daysWorked;
  const overtimeRate = dailyRate / 8;
  const overtimePay = overtimeRate * overtimeHours;
  const totalSalary = baseSalary + overtimePay - cashAdvance;

  return { overtimePay, totalSalary };
}
