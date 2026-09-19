"use client";

import { useState } from "react";
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating menu button -- mobile only. Fixed/off-flow so it can't
          disturb the flex row in app/layout.tsx. */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        className="fixed top-3 left-3 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white shadow-lg md:hidden"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Backdrop -- mobile only */}
      <div
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 min-h-screen bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                P
              </div>
              <span className="text-lg font-semibold text-white tracking-tight">
                Payroll<span className="text-indigo-400">Pro</span>
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
              className="text-slate-400 hover:text-white md:hidden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
                onClick={() => setIsOpen(false)}
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
    </>
  );
}
