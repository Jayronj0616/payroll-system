import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireSession } from "@/lib/auth";
import { Employee, PayrollGroup, sortEmployees, sortGroups } from "@/lib/employee";
import EmployeesClient from "./EmployeesClient";
import SuccessToast from "@/components/SuccessToast";
import { Suspense } from "react";
import { DEMO_USERNAME } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const session = await requireSession();
  if (session.accountId === null) {
    redirect("/accounts");
  }

  const supabase = getSupabaseServerClient();

  const [
    { data: employeesData, error: employeesError },
    { data: groupsData, error: groupsError },
    { data: accountData, error: accountError },
  ] = await Promise.all([
    supabase.from("employees").select("*").eq("account_id", session.accountId),
    supabase.from("payroll_groups").select("*").eq("account_id", session.accountId),
    supabase.from("accounts").select("name").eq("id", session.accountId).single(),
  ]);

  if (employeesError) {
    throw new Error(employeesError.message);
  }
  if (groupsError) {
    throw new Error(groupsError.message);
  }
  if (accountError) {
    throw new Error(accountError.message);
  }

  const groups = sortGroups((groupsData ?? []) as PayrollGroup[]);
  const employees = sortEmployees((employeesData ?? []) as Employee[], groups);

  return (
    <>
      <Suspense fallback={null}>
        <SuccessToast />
      </Suspense>
      <EmployeesClient
        employees={employees}
        groups={groups}
        accountName={accountData?.name}
        isDemo={session.username === DEMO_USERNAME}
      />
    </>
  );
}
