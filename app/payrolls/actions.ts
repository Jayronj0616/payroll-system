"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireSession } from "@/lib/auth";
import { calculatePayroll } from "@/lib/employee";

export type PayrollEntry = {
  employee_id: number;
  days_worked: number;
  overtime_hours: number;
  cash_advance: number;
};

export async function savePayrolls(payrollDate: string, entries: PayrollEntry[]) {
  const session = await requireSession();
  if (session.accountId === null) {
    redirect("/accounts");
  }

  if (!payrollDate) {
    throw new Error("payroll_date is required.");
  }

  const supabase = getSupabaseServerClient();

  const employeeIds = entries.map((e) => e.employee_id);
  // Scoped to account_id: even if entries somehow referenced another
  // tenant's employee id, it simply won't be found here and gets skipped
  // below.
  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("id, daily_rate")
    .eq("account_id", session.accountId)
    .in("id", employeeIds);

  if (employeesError) {
    throw new Error(employeesError.message);
  }

  const employeeById = new Map((employees ?? []).map((e) => [e.id, e]));

  let savedCount = 0;

  for (const entryData of entries) {
    const daysWorked = Number(entryData.days_worked || 0);
    const overtimeHours = Number(entryData.overtime_hours || 0);
    const cashAdvance = Number(entryData.cash_advance || 0);

    if (daysWorked === 0 && overtimeHours === 0 && cashAdvance === 0) {
      continue;
    }

    const employee = employeeById.get(entryData.employee_id);
    if (!employee) {
      continue;
    }

    const dailyRate = Number(employee.daily_rate);
    const { overtimePay, totalSalary } = calculatePayroll(dailyRate, daysWorked, overtimeHours, cashAdvance);

    // Mirrors Payroll::updateOrCreate(['employee_id', 'payroll_date'], [...])
    const { data: existing } = await supabase
      .from("payrolls")
      .select("id")
      .eq("employee_id", employee.id)
      .eq("payroll_date", payrollDate)
      .eq("account_id", session.accountId)
      .maybeSingle();

    const payload = {
      user_id: session.userId,
      account_id: session.accountId,
      employee_id: employee.id,
      payroll_date: payrollDate,
      days_worked: daysWorked,
      overtime_hours: overtimeHours,
      overtime_pay: overtimePay,
      cash_advance: cashAdvance,
      total_salary: totalSalary,
    };

    if (existing) {
      const { error } = await supabase
        .from("payrolls")
        .update(payload)
        .eq("id", existing.id)
        .eq("account_id", session.accountId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("payrolls").insert(payload);
      if (error) throw new Error(error.message);
    }

    savedCount++;
  }

  revalidatePath("/payrolls");

  const formattedDate = new Date(payrollDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

  if (savedCount > 0) {
    redirect(
      `/payrolls?tab=history&payroll_date=${payrollDate}&success=${encodeURIComponent(
        `${savedCount} payroll record(s) saved for ${formattedDate}.`
      )}`
    );
  }

  redirect(
    `/payrolls?tab=compute&payroll_date=${payrollDate}&success=${encodeURIComponent(
      "No payroll records were saved because all inputs were 0."
    )}`
  );
}
