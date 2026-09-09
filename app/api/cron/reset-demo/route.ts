import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEMO_USERNAME, DEMO_ACCOUNT_NAME } from "@/lib/demo";

export const dynamic = "force-dynamic";

// Same 7 employees migration 003 seeds, kept in sync with it by hand since
// this is a small, rarely-changed fixture — not worth sharing a module
// between an API route and a one-off SQL file.
const SEED_EMPLOYEES = [
  { name: "Employee 1", voice_code: "demo1", daily_rate: 550.0, is_active: true },
  { name: "Employee 2", voice_code: "demo2", daily_rate: 550.0, is_active: true },
  { name: "Employee 3", voice_code: "demo3", daily_rate: 600.0, is_active: true },
  { name: "Employee 4", voice_code: "demo4", daily_rate: 600.0, is_active: true },
  { name: "Employee 5", voice_code: "demo5", daily_rate: 650.0, is_active: true },
  { name: "Employee 6", voice_code: "demo6", daily_rate: 550.0, is_active: false },
  { name: "Employee 7", voice_code: "demo7", daily_rate: 600.0, is_active: false },
];

const SEED_PAYROLL_RUNS = [
  { payroll_date: "2026-08-15", days_worked: 6.0, overtime_hours: 2.0 },
  { payroll_date: "2026-08-31", days_worked: 6.0, overtime_hours: 0.0 },
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("name", DEMO_ACCOUNT_NAME)
    .maybeSingle();
  if (accountError) {
    return NextResponse.json({ error: accountError.message }, { status: 500 });
  }
  if (!account) {
    return NextResponse.json({ error: "Demo account not found — has migration 003 been run?" }, { status: 500 });
  }

  const { data: demoUser, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("username", DEMO_USERNAME)
    .maybeSingle();
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }
  if (!demoUser) {
    return NextResponse.json({ error: "Demo user not found — has migration 003 been run?" }, { status: 500 });
  }

  const { data: generalGroup, error: groupError } = await supabase
    .from("payroll_groups")
    .select("id")
    .eq("account_id", account.id)
    .eq("name", "General")
    .maybeSingle();
  if (groupError) {
    return NextResponse.json({ error: groupError.message }, { status: 500 });
  }
  if (!generalGroup) {
    return NextResponse.json(
      { error: "Demo account has no 'General' payroll group — has migration 005 been run?" },
      { status: 500 }
    );
  }

  // Delete-then-insert, same pattern migration 003 uses (payrolls before
  // employees, to satisfy the FK).
  const { error: deletePayrollsError } = await supabase
    .from("payrolls")
    .delete()
    .eq("account_id", account.id);
  if (deletePayrollsError) {
    return NextResponse.json({ error: deletePayrollsError.message }, { status: 500 });
  }

  const { error: deleteEmployeesError } = await supabase
    .from("employees")
    .delete()
    .eq("account_id", account.id);
  if (deleteEmployeesError) {
    return NextResponse.json({ error: deleteEmployeesError.message }, { status: 500 });
  }

  const { data: insertedEmployees, error: insertEmployeesError } = await supabase
    .from("employees")
    .insert(
      SEED_EMPLOYEES.map((e) => ({
        name: e.name,
        voice_code: e.voice_code,
        daily_rate: e.daily_rate,
        is_active: e.is_active,
        payroll_group_id: generalGroup.id,
        user_id: demoUser.id,
        account_id: account.id,
      }))
    )
    .select("id, daily_rate, is_active");
  if (insertEmployeesError) {
    return NextResponse.json({ error: insertEmployeesError.message }, { status: 500 });
  }

  const activeEmployees = (insertedEmployees ?? []).filter((e) => e.is_active);
  const payrollRows = activeEmployees.flatMap((employee) =>
    SEED_PAYROLL_RUNS.map((run) => {
      const overtimePay = round2((employee.daily_rate / 8) * run.overtime_hours);
      const totalSalary = round2(employee.daily_rate * run.days_worked + overtimePay);
      return {
        employee_id: employee.id,
        payroll_date: run.payroll_date,
        days_worked: run.days_worked,
        overtime_hours: run.overtime_hours,
        overtime_pay: overtimePay,
        cash_advance: 0,
        total_salary: totalSalary,
        user_id: demoUser.id,
        account_id: account.id,
      };
    })
  );

  const { error: insertPayrollsError } = await supabase.from("payrolls").insert(payrollRows);
  if (insertPayrollsError) {
    return NextResponse.json({ error: insertPayrollsError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    employeesReset: insertedEmployees?.length ?? 0,
    payrollsReset: payrollRows.length,
  });
}
