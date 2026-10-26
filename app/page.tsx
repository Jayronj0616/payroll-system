import LoginModal from "@/components/LoginModal";
import TryDemoButton from "@/components/TryDemoButton";
import Brand from "@/components/landing/Brand";
import ProductPreview from "@/components/landing/ProductPreview";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Faq from "@/components/landing/Faq";

export const dynamic = "force-dynamic";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

const POINTS = ["Overtime computed for you", "Hands-free voice entry", "Private books per account"];

const primaryCta =
  "group flex h-12 items-center gap-2 rounded-full bg-blue-600 px-7 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 disabled:opacity-60";
const secondaryCta =
  "h-12 rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-800 transition hover:bg-slate-50";

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: { login?: string };
}) {
  // "/" always renders the landing page, even for a browser with a valid
  // session cookie from an earlier visit — it's the entry point people
  // land on from an outside link (e.g. the portfolio), and auto-redirecting
  // straight to /dashboard skipped it silently, along with the demo tour
  // that only fires from a fresh "Try Demo" click on this page.
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top">
            <Brand />
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LoginModal
              autoOpen={searchParams.login === "1"}
              label="Sign in"
              buttonClassName="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            />
            <div className="hidden sm:block">
              <TryDemoButton
                label="Try demo"
                className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              />
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="top" className="relative isolate">
          {/* Soft glows as static radial gradients (painted once, no blur filter) */}
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage: [
                "radial-gradient(28rem 28rem at 82% 4%, rgb(14 165 233 / 0.16), transparent 70%)",
                "radial-gradient(26rem 26rem at 2% 45%, rgb(37 99 235 / 0.12), transparent 70%)",
                "radial-gradient(circle, rgb(15 23 42 / 0.07) 1px, transparent 1px)",
              ].join(", "),
              backgroundSize: "auto, auto, 22px 22px",
              maskImage: "linear-gradient(to bottom, black 70%, transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent)",
            }}
          />
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 pb-24 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-32 lg:pt-20">
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm motion-safe:animate-fade-up">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                Built for small teams and businesses
              </span>
              <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight motion-safe:animate-fade-up sm:text-6xl lg:text-[3.6rem] xl:text-[4rem] [animation-delay:100ms]">
                Payroll, without
                <br />
                <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">
                  the spreadsheet.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-500 motion-safe:animate-fade-up sm:text-lg lg:mx-0 [animation-delay:200ms]">
                Track employees, compute salaries with overtime and cash advances, and enter the week&apos;s hours
                hands-free with your voice — all in one place.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3 motion-safe:animate-fade-up lg:justify-start [animation-delay:300ms]">
                <TryDemoButton label="Try the live demo" className={primaryCta} />
                <LoginModal label="Sign in" buttonClassName={secondaryCta} />
              </div>
              <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500 motion-safe:animate-fade-up lg:justify-start [animation-delay:400ms]">
                {POINTS.map((p) => (
                  <li key={p} className="flex items-center gap-1.5">
                    <CheckIcon />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <ProductPreview />
          </div>
        </section>

        <Features />
        <HowItWorks />
        <Faq />

        <section className="px-4 pb-24 sm:px-6">
          <div
            className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-blue-600 px-6 py-16 text-center text-white shadow-2xl shadow-blue-600/30 sm:px-12 sm:py-20"
            style={{
              backgroundImage:
                "radial-gradient(36rem 18rem at 50% 0%, rgb(56 189 248 / 0.45), transparent 70%), radial-gradient(circle, rgb(255 255 255 / 0.12) 1px, transparent 1px)",
              backgroundSize: "auto, 20px 20px",
            }}
          >
            <h2 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Run your next payroll
              <br />
              <span className="text-blue-100">in minutes.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-blue-100/90">
              Click through a full sample account with a guided tour — no sign-up, nothing to install.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <TryDemoButton
                label="Try the live demo"
                className="flex h-12 items-center gap-2 rounded-full bg-white px-7 font-semibold text-blue-700 shadow-lg shadow-black/10 transition hover:bg-blue-50 disabled:opacity-60"
              />
              <LoginModal
                label="Sign in"
                buttonClassName="h-12 rounded-full px-7 font-semibold text-white transition hover:bg-white/10"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Brand size="sm" />
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} PayrollPro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
