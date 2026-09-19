"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

type Props = {
  username: string;
  role: "owner" | "admin" | "staff";
};

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/payrolls", label: "Payroll" },
  { href: "/employees", label: "Employees" },
  { href: "/payroll-groups", label: "Payroll Groups" },
];

export default function NavBar({ username, role }: Props) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === href : !!pathname?.startsWith(href);
  }

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

        {/* NavBar only ever renders for tenant sessions now — owner gets
            OwnerSidebar instead (see app/layout.tsx) — so these links are
            safe to show unconditionally for admin/staff. */}
        <div className="hidden md:flex items-center space-x-6">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(isActive(item.href))}>
              {item.label}
            </Link>
          ))}

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

        <button
          onClick={() => setIsOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={isOpen}
          className="md:hidden text-slate-500 hover:text-slate-900"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden border-t border-slate-200 px-4 py-3 space-y-3">
          <div className="flex flex-col gap-3">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={linkClass(isActive(item.href))}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-sm text-slate-500">{username}</span>
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
      )}
    </nav>
  );
}
