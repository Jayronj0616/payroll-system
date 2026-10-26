import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import DemoTour from "@/components/DemoTour";
import { DEMO_USERNAME } from "@/lib/demo";

export const dynamic = "force-dynamic";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    // Middleware already guards this route — this is just a type-safe
    // fallback, not the primary defense.
    redirect("/");
  }

  // Owner/superadmin sessions have no account_id and no tenant data —
  // by construction they never query employees/payrolls. Send them
  // straight to account management instead.
  if (session.accountId === null) {
    redirect("/accounts");
  }

  const supabase = getSupabaseServerClient();

  // Migration 008: all five numbers are computed in SQL, one row back.
  const { data: statsRows, error: statsError } = await supabase.rpc("dashboard_stats", {
    p_account_id: session.accountId,
  });
  if (statsError) throw new Error(statsError.message);

  const stats = statsRows?.[0];
  const activeEmployees = Number(stats?.active_employees ?? 0);
  const inactiveEmployees = Number(stats?.inactive_employees ?? 0);
  const totalSalaries = Number(stats?.total_salaries ?? 0);
  const latestPayrollDate: string | null = stats?.latest_payroll_date ?? null;
  const latestPayrollTotal = Number(stats?.latest_payroll_total ?? 0);

  const latestPayrollDateLabel = latestPayrollDate
    ? new Date(latestPayrollDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : null;

  type CardTheme = {
    border: string;
    iconBg: string;
    iconColor: string;
    valueColor: string;
  };

  const THEME: Record<string, CardTheme> = {
    emerald: {
      border: "border-emerald-200",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-700",
    },
    slate: {
      border: "border-slate-200",
      iconBg: "bg-slate-100",
      iconColor: "text-slate-500",
      valueColor: "text-slate-700",
    },
    blue: {
      border: "border-blue-200",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      valueColor: "text-blue-700",
    },
    amber: {
      border: "border-amber-200",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      valueColor: "text-amber-700",
    },
  };

  const ICONS: Record<string, JSX.Element> = {
    users: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20h10M9 7a3 3 0 116 0 3 3 0 01-6 0z"
      />
    ),
    userOff: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3M9 7a3 3 0 116 0 3 3 0 01-6 0zM2 20h10v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1z"
      />
    ),
    wallet: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h16a1 1 0 001-1V6a1 1 0 00-1-1H4a1 1 0 00-1 1v12a1 1 0 001 1z"
      />
    ),
    calendar: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z"
      />
    ),
  };

  const cards: Array<{
    label: string;
    value: string;
    sub?: string;
    theme: keyof typeof THEME;
    icon: keyof typeof ICONS;
  }> = [
    { label: "Active employees", value: String(activeEmployees), theme: "emerald", icon: "users" },
    { label: "Inactive employees", value: String(inactiveEmployees), theme: "slate", icon: "userOff" },
    {
      label: "Total salaries paid (all-time)",
      value: `₱${formatCurrency(totalSalaries)}`,
      theme: "blue",
      icon: "wallet",
    },
    {
      label: "Latest payroll run",
      value: latestPayrollDateLabel ?? "No payroll runs yet",
      sub: latestPayrollDateLabel ? `₱${formatCurrency(latestPayrollTotal)}` : undefined,
      theme: "amber",
      icon: "calendar",
    },
  ];

  return (
    <div>
      <div className="mb-6 pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          {`Welcome back, ${session.username}`}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Totals for your own employees and payroll runs.
        </p>
      </div>

      <div id="tour-dashboard-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const theme = THEME[card.theme];
          return (
            <div
              key={card.label}
              className={`bg-white shadow-sm border rounded-xl p-5 flex items-start gap-4 ${theme.border}`}
            >
              <div
                className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${theme.iconBg} ${theme.iconColor}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {ICONS[card.icon]}
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  {card.label}
                </p>
                <p className={`text-2xl font-bold ${theme.valueColor}`}>{card.value}</p>
                {card.sub && <p className="text-sm font-medium text-slate-500 mt-0.5">{card.sub}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div id="tour-dashboard-actions" className="mt-8 flex gap-3">
        <a
          href="/payrolls"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          Go to Payroll
        </a>
        <a
          href="/employees"
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20h10M9 7a3 3 0 116 0 3 3 0 01-6 0z"
            />
          </svg>
          Manage Employees
        </a>
      </div>

      {session.username === DEMO_USERNAME && (
        <DemoTour
          page="dashboard"
          nextPath="/employees"
          nextStage="employees"
          steps={[
            {
              element: "#tour-dashboard-cards",
              intro: "Your employee counts, salaries, and latest payroll run at a glance.",
              position: "bottom",
            },
            {
              element: "#tour-dashboard-actions",
              intro: "Jump into Payroll or Employees from here.",
              position: "top",
            },
          ]}
        />
      )}
    </div>
  );
}
