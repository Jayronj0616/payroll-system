// Ported 1:1 from app/Models/Employee.php (Laravel).
// Keep this file's logic byte-for-byte equivalent to the PHP source —
// it drives payroll_group auto-suggestion and voice_code normalization
// in both the Employees page and the Payrolls voice command parser.

export const GROUP_BASE_3 = "BASE 3";
export const GROUP_MF = "MF";

export const PAYROLL_GROUPS = [GROUP_BASE_3, GROUP_MF] as const;

export type PayrollGroup = (typeof PAYROLL_GROUPS)[number];

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

/** Ported from Employee::suggestedPayrollGroup */
export function suggestedPayrollGroup(name: string | null | undefined): PayrollGroup {
  const normalizedName = squishUpper(name);
  return MF_EMPLOYEE_NAMES.includes(normalizedName) ? GROUP_MF : GROUP_BASE_3;
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
  payroll_group: PayrollGroup;
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
  total_salary: number;
  created_at?: string;
  updated_at?: string;
};

/**
 * Sort order used everywhere employees/payrolls are listed:
 * BASE 3 first, then MF, then anything else, each alphabetical by name.
 * Mirrors the orderByRaw CASE statement in EmployeeController/PayrollController.
 */
export function employeeGroupSortOrder(group: string | null | undefined): number {
  const idx = PAYROLL_GROUPS.indexOf((group ?? GROUP_BASE_3) as PayrollGroup);
  return idx === -1 ? 99 : idx;
}

export function sortEmployees<T extends { name: string; payroll_group: string | null }>(
  employees: T[]
): T[] {
  return [...employees].sort((a, b) => {
    const groupDiff = employeeGroupSortOrder(a.payroll_group) - employeeGroupSortOrder(b.payroll_group);
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
export function calculatePayroll(dailyRate: number, daysWorked: number, overtimeHours: number) {
  const baseSalary = dailyRate * daysWorked;
  const overtimeRate = dailyRate / 8;
  const overtimePay = overtimeRate * overtimeHours;
  const totalSalary = baseSalary + overtimePay;

  return { overtimePay, totalSalary };
}
