"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

type Props = {
  username: string;
  role: "owner" | "admin";
};

export default function NavBar({ username, role }: Props) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const isPayrolls = pathname?.startsWith("/payrolls");
  const isEmployees = pathname?.startsWith("/employees");
  const isAccounts = pathname?.startsWith("/accounts");

  function linkClass(active: boolean) {
    return `transition-colors ${
      active ? "text-indigo-600 font-medium" : "text-slate-500 hover:text-indigo-600"
    }`;
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
            P
          </div>
          <Link href="/dashboard" className="text-xl font-semibold text-slate-900 tracking-tight">
            Payroll<span className="text-indigo-600">Pro</span>
          </Link>
        </div>

        <div className="flex items-center space-x-6">
          <Link href="/dashboard" className={linkClass(isDashboard)}>
            Dashboard
          </Link>
          <Link href="/payrolls" className={linkClass(!!isPayrolls)}>
            Payroll
          </Link>
          <Link href="/employees" className={linkClass(!!isEmployees)}>
            Employees
          </Link>
          {role === "owner" && (
            <Link href="/accounts" className={linkClass(!!isAccounts)}>
              Accounts
            </Link>
          )}

          <div className="h-6 w-px bg-slate-200" />

          <span className="text-sm text-slate-500 hidden sm:inline">{username}</span>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-slate-500 hover:text-rose-600 font-medium transition-colors"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
