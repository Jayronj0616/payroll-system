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
  cash_advance_lea: number;
  cash_advance_bitoy: number;
};

export async function savePayrolls(payrollDate: string, entries: PayrollEntry[]) {
  const session = await requireSession();

  if (!payrollDate) {
    throw new Error("payroll_date is required.");
  }

  const supabase = getSupabaseServerClient();

  const employeeIds = entries.map((e) => e.employee_id);
  // Scoped to user_id: even if entries somehow referenced another user's
  // employee id, it simply won't be found here and gets skipped below.
  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("id, daily_rate")
    .eq("user_id", session.userId)
    .in("id", employeeIds);

  if (employeesError) {
    throw new Error(employeesError.message);
  }

  const employeeById = new Map((employees ?? []).map((e) => [e.id, e]));

  let savedCount = 0;

  for (const entryData of entries) {
    const daysWorked = Number(entryData.days_worked || 0);
    const overtimeHours = Number(entryData.overtime_hours || 0);
    const cashAdvanceLea = Number(entryData.cash_advance_lea || 0);
    const cashAdvanceBitoy = Number(entryData.cash_advance_bitoy || 0);

    if (daysWorked === 0 && overtimeHours === 0 && cashAdvanceLea === 0 && cashAdvanceBitoy === 0) {
      continue;
    }

    const employee = employeeById.get(entryData.employee_id);
    if (!employee) {
      continue;
    }

    const dailyRate = Number(employee.daily_rate);
    const { overtimePay, totalSalary } = calculatePayroll(
      dailyRate,
      daysWorked,
      overtimeHours,
      cashAdvanceLea,
      cashAdvanceBitoy
    );

    // Mirrors Payroll::updateOrCreate(['employee_id', 'payroll_date'], [...])
    const { data: existing } = await supabase
      .from("payrolls")
      .select("id")
      .eq("employee_id", employee.id)
      .eq("payroll_date", payrollDate)
      .eq("user_id", session.userId)
      .maybeSingle();

    const payload = {
      user_id: session.userId,
      employee_id: employee.id,
      payroll_date: payrollDate,
      days_worked: daysWorked,
      overtime_hours: overtimeHours,
      overtime_pay: overtimePay,
      cash_advance_lea: cashAdvanceLea,
      cash_advance_bitoy: cashAdvanceBitoy,
      total_salary: totalSalary,
    };

    if (existing) {
      const { error } = await supabase
        .from("payrolls")
        .update(payload)
        .eq("id", existing.id)
        .eq("user_id", session.userId);
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
