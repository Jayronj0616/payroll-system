import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireSession } from "@/lib/auth";
import { Employee, sortEmployees } from "@/lib/employee";
import EmployeesClient from "./EmployeesClient";
import SuccessToast from "@/components/SuccessToast";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const session = await requireSession();

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("user_id", session.userId);

  if (error) {
    throw new Error(error.message);
  }

  const employees = sortEmployees((data ?? []) as Employee[]);

  return (
    <>
      <Suspense fallback={null}>
        <SuccessToast />
      </Suspense>
      <EmployeesClient employees={employees} />
    </>
  );
}
