import { Suspense } from "react";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  Employee,
  Payroll,
  PAYROLL_GROUPS,
  GROUP_BASE_3,
  sortEmployees,
  employeeGroupSortOrder,
} from "@/lib/employee";
import PayrollsClient from "./PayrollsClient";
import SuccessToast from "@/components/SuccessToast";

export const dynamic = "force-dynamic";

type SearchParams = {
  payroll_date?: string;
  tab?: string;
};

export default async function PayrollsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = getSupabaseServerClient();

  const { data: employeesData, error: employeesError } = await supabase
    .from("employees")
    .select("*");
  if (employeesError) throw new Error(employeesError.message);

  const employees = sortEmployees((employeesData ?? []) as Employee[]);
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  // Mirrors Payroll::query()->max('payroll_date')
  const { data: latestRow } = await supabase
    .from("payrolls")
    .select("payroll_date")
    .order("payroll_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const latestPayrollDate = latestRow?.payroll_date ?? null;

  const selectedPayrollDate = searchParams.payroll_date || latestPayrollDate;

  let payrolls: Payroll[] = [];
  if (selectedPayrollDate) {
    const { data: payrollsData, error: payrollsError } = await supabase
      .from("payrolls")
      .select("*")
      .eq("payroll_date", selectedPayrollDate)
      .order("created_at", { ascending: false });
    if (payrollsError) throw new Error(payrollsError.message);
    payrolls = (payrollsData ?? []) as Payroll[];
  } else {
    const { data: payrollsData, error: payrollsError } = await supabase
      .from("payrolls")
      .select("*")
      .order("payroll_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (payrollsError) throw new Error(payrollsError.message);
    payrolls = (payrollsData ?? []) as Payroll[];
  }

  // Mirrors the ->sortBy(sprintf('%02d|%s|%010d', group, name, id)) in PayrollController
  const sortedPayrolls = [...payrolls].sort((a, b) => {
    const empA = employeeById.get(a.employee_id);
    const empB = employeeById.get(b.employee_id);
    const groupDiff =
      employeeGroupSortOrder(empA?.payroll_group ?? GROUP_BASE_3) -
      employeeGroupSortOrder(empB?.payroll_group ?? GROUP_BASE_3);
    if (groupDiff !== 0) return groupDiff;
    const nameDiff = (empA?.name ?? "").toLowerCase().localeCompare((empB?.name ?? "").toLowerCase());
    if (nameDiff !== 0) return nameDiff;
    return a.id - b.id;
  });

  const payrollsByGroup = Object.fromEntries(
    PAYROLL_GROUPS.map((group) => {
      const records = sortedPayrolls.filter(
        (p) => (employeeById.get(p.employee_id)?.payroll_group ?? GROUP_BASE_3) === group
      );
      return [
        group,
        {
          records,
          count: records.length,
          overtime_pay: records.reduce((sum, p) => sum + Number(p.overtime_pay), 0),
          total_salary: records.reduce((sum, p) => sum + Number(p.total_salary), 0),
        },
      ];
    })
  );

  const historySummary = {
    record_count: sortedPayrolls.length,
    overtime_pay: sortedPayrolls.reduce((sum, p) => sum + Number(p.overtime_pay), 0),
    total_salary: sortedPayrolls.reduce((sum, p) => sum + Number(p.total_salary), 0),
    group_totals: Object.fromEntries(
      PAYROLL_GROUPS.map((group) => [group, payrollsByGroup[group].total_salary])
    ),
  };

  const entryPayrollDate = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Suspense fallback={null}>
        <SuccessToast />
      </Suspense>
      <PayrollsClient
        employees={employees}
        employeeGroups={PAYROLL_GROUPS as unknown as string[]}
        payrollsByGroup={payrollsByGroup as any}
        selectedPayrollDate={selectedPayrollDate}
        entryPayrollDate={entryPayrollDate}
        historySummary={historySummary}
        initialTab={searchParams.tab === "history" ? "history" : "compute"}
      />
    </>
  );
}
