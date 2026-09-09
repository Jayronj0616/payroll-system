import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireSession } from "@/lib/auth";
import {
  Employee,
  Payroll,
  PayrollGroup,
  sortEmployees,
  sortGroups,
  employeeGroupSortOrder,
} from "@/lib/employee";
import PayrollsClient from "./PayrollsClient";
import SuccessToast from "@/components/SuccessToast";
import { DEMO_USERNAME } from "@/lib/demo";

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
  const session = await requireSession();
  if (session.accountId === null) {
    redirect("/accounts");
  }
  const supabase = getSupabaseServerClient();

  const [{ data: employeesData, error: employeesError }, { data: groupsData, error: groupsError }] =
    await Promise.all([
      supabase.from("employees").select("*").eq("account_id", session.accountId),
      supabase.from("payroll_groups").select("*").eq("account_id", session.accountId),
    ]);
  if (employeesError) throw new Error(employeesError.message);
  if (groupsError) throw new Error(groupsError.message);

  const groups = sortGroups((groupsData ?? []) as PayrollGroup[]);

  // allEmployees includes inactive employees — needed so payroll history
  // (Past Records) can still resolve names/rates for anyone deactivated
  // after their payroll record was saved. Compute Entry only ever gets
  // the active subset below.
  const allEmployees = sortEmployees((employeesData ?? []) as Employee[], groups);
  const employees = allEmployees.filter((e) => e.is_active);
  const employeeById = new Map(allEmployees.map((e) => [e.id, e]));

  // Mirrors Payroll::query()->max('payroll_date'), scoped to this account.
  const { data: latestRow } = await supabase
    .from("payrolls")
    .select("payroll_date")
    .eq("account_id", session.accountId)
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
      .eq("account_id", session.accountId)
      .eq("payroll_date", selectedPayrollDate)
      .order("created_at", { ascending: false });
    if (payrollsError) throw new Error(payrollsError.message);
    payrolls = (payrollsData ?? []) as Payroll[];
  } else {
    const { data: payrollsData, error: payrollsError } = await supabase
      .from("payrolls")
      .select("*")
      .eq("account_id", session.accountId)
      .order("payroll_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (payrollsError) throw new Error(payrollsError.message);
    payrolls = (payrollsData ?? []) as Payroll[];
  }

  // Mirrors the ->sortBy(sprintf('%02d|%s|%010d', group, name, id)) in PayrollController,
  // now keyed by each group's position in the account's sorted group list
  // instead of a fixed 2-value lookup.
  const sortedPayrolls = [...payrolls].sort((a, b) => {
    const empA = employeeById.get(a.employee_id);
    const empB = employeeById.get(b.employee_id);
    const groupDiff =
      employeeGroupSortOrder(groups, empA?.payroll_group_id) -
      employeeGroupSortOrder(groups, empB?.payroll_group_id);
    if (groupDiff !== 0) return groupDiff;
    const nameDiff = (empA?.name ?? "").toLowerCase().localeCompare((empB?.name ?? "").toLowerCase());
    if (nameDiff !== 0) return nameDiff;
    return a.id - b.id;
  });

  const payrollsByGroup = Object.fromEntries(
    groups.map((group) => {
      const records = sortedPayrolls.filter(
        (p) => employeeById.get(p.employee_id)?.payroll_group_id === group.id
      );
      return [
        group.id,
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
      groups.map((group) => [group.id, payrollsByGroup[group.id].total_salary])
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
        allEmployees={allEmployees}
        groups={groups}
        payrollsByGroup={payrollsByGroup as any}
        selectedPayrollDate={selectedPayrollDate}
        entryPayrollDate={entryPayrollDate}
        historySummary={historySummary}
        initialTab={searchParams.tab === "history" ? "history" : "compute"}
        isDemo={session.username === DEMO_USERNAME}
      />
    </>
  );
}
