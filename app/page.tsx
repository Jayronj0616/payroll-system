import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "@/lib/session";
import LoginModal from "@/components/LoginModal";

export const dynamic = "force-dynamic";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: { login?: string };
}) {
  // Already signed in? The landing page is for visitors, not for a
  // logged-in user parked at "/" — send them straight to their dashboard.
  const cookieValue = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionCookieValue(cookieValue);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <nav className="container mx-auto px-4 py-6 flex items-center justify-between max-w-6xl">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
            P
          </div>
          <span className="text-xl font-semibold tracking-tight">
            Payroll<span className="text-indigo-400">Pro</span>
          </span>
        </div>
        <LoginModal autoOpen={searchParams.login === "1"} />
      </nav>

      <main className="container mx-auto px-4 max-w-6xl">
        <section className="py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Payroll, without the spreadsheet chaos
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10">
            Track employees, run payroll, and even enter records hands-free with
            voice commands — all in one place. Each account keeps its own
            employees and payroll history, private and separate.
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-6 pb-24">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-2">Employee management</h3>
            <p className="text-slate-300 text-sm">
              Keep rates, payroll groups, and status up to date — activate or
              deactivate people without losing their history.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-2">Voice-command entry</h3>
            <p className="text-slate-300 text-sm">
              Call out a voice code and the day's hours — payroll entry
              without touching a keyboard.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-2">Your own dashboard</h3>
            <p className="text-slate-300 text-sm">
              Every account sees its own totals, salaries, and history —
              private by default.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
