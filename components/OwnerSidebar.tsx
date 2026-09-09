"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

type Props = {
  username: string;
};

// One item today (Accounts), structured as a list so a future superadmin
// page (audit log, platform settings, etc.) is just another entry here.
const NAV_ITEMS = [{ href: "/accounts", label: "Accounts" }];

export default function OwnerSidebar({ username }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 min-h-screen bg-slate-900 text-slate-300 flex flex-col">
      <div className="px-5 py-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
            P
          </div>
          <span className="text-lg font-semibold text-white tracking-tight">
            Payroll<span className="text-indigo-400">Pro</span>
          </span>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-3">
          Platform Admin
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20h10M9 7a3 3 0 116 0 3 3 0 01-6 0z"
                />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-slate-800">
        <p className="text-sm text-slate-400 truncate">{username}</p>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-slate-500 hover:text-rose-400 font-medium transition-colors mt-1"
          >
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
