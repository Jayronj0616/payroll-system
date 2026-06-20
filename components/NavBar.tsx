"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();
  const isPayrolls = pathname?.startsWith("/payrolls");
  const isEmployees = pathname?.startsWith("/employees");

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
            P
          </div>
          <Link
            href="/payrolls"
            className="text-xl font-semibold text-slate-900 tracking-tight"
          >
            Payroll<span className="text-indigo-600">Pro</span>
          </Link>
        </div>
        <div className="flex items-center space-x-6">
          <Link
            href="/payrolls"
            className={`transition-colors ${
              isPayrolls ? "text-indigo-600 font-medium" : "text-slate-500 hover:text-indigo-600"
            }`}
          >
            Payroll
          </Link>
          <Link
            href="/employees"
            className={`transition-colors ${
              isEmployees ? "text-indigo-600 font-medium" : "text-slate-500 hover:text-indigo-600"
            }`}
          >
            Employees
          </Link>
        </div>
      </div>
    </nav>
  );
}
