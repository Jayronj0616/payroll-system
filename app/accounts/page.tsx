import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireSession } from "@/lib/auth";
import AccountsClient, { AccountRow } from "./AccountsClient";
import SuccessToast from "@/components/SuccessToast";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const session = await requireSession();

  // Superadmin-only page. Any tenant session (accountId set) belongs in
  // the regular app, not here — it must never see other tenants' rows.
  if (session.accountId !== null) {
    redirect("/dashboard");
  }

  const supabase = getSupabaseServerClient();

  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("id, name, is_active, created_at")
    .order("created_at", { ascending: false });

  if (accountsError) {
    throw new Error(accountsError.message);
  }

  // Superadmin scope is explicitly "no tenant data" — but the admin
  // *username* for each account is account-management metadata (who to
  // log in as / reset credentials for), not payroll/employee data, so
  // it's fine to read here.
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, username, account_id")
    .eq("role", "admin")
    .not("account_id", "is", null);

  if (usersError) {
    throw new Error(usersError.message);
  }

  const adminByAccountId = new Map(
    (users ?? []).map((u) => [u.account_id as number, { id: u.id, username: u.username }])
  );

  const rows: AccountRow[] = (accounts ?? []).map((account) => ({
    id: account.id,
    name: account.name,
    isActive: account.is_active,
    createdAt: account.created_at,
    admin: adminByAccountId.get(account.id) ?? null,
  }));

  return (
    <>
      <Suspense fallback={null}>
        <SuccessToast />
      </Suspense>
      <AccountsClient accounts={rows} />
    </>
  );
}
