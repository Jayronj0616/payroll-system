// Illustrative mock-up of the Compute Entry screen. Sample figures only — not
// real employee data.
const ROWS = [
  { initials: "JD", name: "Employee A", days: "6", ot: "2", total: "₱3,825" },
  { initials: "MR", name: "Employee B", days: "5.5", ot: "0", total: "₱3,300" },
  { initials: "AL", name: "Employee C", days: "6", ot: "4", total: "₱4,050" },
  { initials: "KS", name: "Employee D", days: "4", ot: "1", total: "₱2,475" },
];
const BARS = [55, 70, 48, 82, 64, 90];

export default function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="motion-safe:animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_40px_80px_-24px_rgba(37,99,235,0.35)] [animation-delay:200ms]">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 font-mono text-[10px] text-slate-500">
            payrollpro / compute entry
          </span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-blue-700">
            Sample data
          </span>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              <span className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white">Group A</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">Group B</span>
            </div>
            <span className="text-[11px] font-medium text-slate-500">Week of Oct 26</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[1fr_44px_44px_72px] gap-2 bg-slate-50 px-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500 sm:text-[10px]">
              <span>Employee</span>
              <span className="text-center">Days</span>
              <span className="text-center">OT</span>
              <span className="text-right">Total</span>
            </div>
            {ROWS.map((r, i) => (
              <div
                key={r.name}
                className={`grid grid-cols-[1fr_44px_44px_72px] items-center gap-2 border-t border-slate-100 px-3 py-2 motion-safe:animate-fade-up ${
                  i === 0 ? "bg-emerald-50/70" : ""
                }`}
                style={{ animationDelay: `${600 + i * 120}ms` }}
              >
                <span className="flex items-center gap-2 text-xs font-medium text-slate-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[9px] font-semibold text-blue-700">
                    {r.initials}
                  </span>
                  {r.name}
                </span>
                <span className="rounded-md border border-slate-200 py-1 text-center font-mono text-[11px] text-slate-700">
                  {r.days}
                </span>
                <span className="rounded-md border border-slate-200 py-1 text-center font-mono text-[11px] text-slate-700">
                  {r.ot}
                </span>
                <span className="text-right font-mono text-xs font-semibold text-blue-700">{r.total}</span>
              </div>
            ))}
          </div>

          <div className="flex items-end justify-between gap-4 rounded-xl border border-slate-200 p-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Group total</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">₱13,650</p>
            </div>
            <div className="flex h-12 items-end gap-1">
              {BARS.map((h, i) => (
                <span
                  key={i}
                  className={`w-3 origin-bottom rounded-t motion-safe:animate-grow-up ${
                    i === BARS.length - 1 ? "bg-gradient-to-t from-blue-600 to-sky-400" : "bg-blue-100"
                  }`}
                  style={{ height: `${h}%`, animationDelay: `${900 + i * 80}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating voice-command chip */}
      <div className="absolute -left-4 -top-7 hidden motion-safe:animate-fade-up sm:block lg:-left-12 [animation-delay:1200ms]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl motion-safe:animate-float">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-14 0m7 7v3m0-3a7 7 0 01-7-7m7 7a7 7 0 007-7M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z"
              />
            </svg>
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-900">Voice entry</p>
            <p className="text-[11px] text-slate-500">&ldquo;Employee A, six days, two OT&rdquo;</p>
          </div>
        </div>
      </div>

      {/* Floating saved chip */}
      <div className="absolute -bottom-16 right-2 hidden motion-safe:animate-fade-up sm:block lg:-right-6 [animation-delay:1500ms]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl motion-safe:animate-float [animation-delay:1.2s]">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-900">Payroll saved</p>
            <p className="text-[11px] text-slate-500">4 records · ₱13,650</p>
          </div>
        </div>
      </div>
    </div>
  );
}
