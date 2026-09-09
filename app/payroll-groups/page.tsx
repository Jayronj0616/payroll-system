import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireSession } from "@/lib/auth";
import { PayrollGroup, sortGroups } from "@/lib/employee";
import PayrollGroupsClient from "./PayrollGroupsClient";
import SuccessToast from "@/components/SuccessToast";

export const dynamic = "force-dynamic";

export default async function PayrollGroupsPage() {
  const session = await requireSession();
  if (session.accountId === null) {
    redirect("/accounts");
  }

  const supabase = getSupabaseServerClient();

  const [{ data: groupsData, error: groupsError }, { data: employeesData, error: employeesError }] =
    await Promise.all([
      supabase.from("payroll_groups").select("*").eq("account_id", session.accountId),
      supabase.from("employees").select("id, payroll_group_id").eq("account_id", session.accountId),
    ]);

  if (groupsError) {
    throw new Error(groupsError.message);
  }
  if (employeesError) {
    throw new Error(employeesError.message);
  }

  const groups = sortGroups((groupsData ?? []) as PayrollGroup[]);

  const employeeCountByGroupId: Record<number, number> = {};
  for (const employee of employeesData ?? []) {
    if (employee.payroll_group_id === null) continue;
    employeeCountByGroupId[employee.payroll_group_id] =
      (employeeCountByGroupId[employee.payroll_group_id] ?? 0) + 1;
  }

  return (
    <>
      <Suspense fallback={null}>
        <SuccessToast />
      </Suspense>
      <PayrollGroupsClient groups={groups} employeeCountByGroupId={employeeCountByGroupId} />
    </>
  );
}
