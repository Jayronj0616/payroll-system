const FAQS = [
  {
    q: "Is my payroll data private?",
    a: "Yes. Every account has its own isolated books — no other business can see your employees, rates or payroll history.",
  },
  {
    q: "How is overtime calculated?",
    a: "Overtime pay is the daily rate divided by 8, times the overtime hours. It's added to the days-worked pay, and any cash advance is subtracted to get the total salary.",
  },
  {
    q: "Does voice entry work in every browser?",
    a: "It works in Chrome and Edge. Allow microphone access when the browser asks, then say an employee's voice code with their days and overtime.",
  },
  {
    q: "What happens in the demo?",
    a: "You log into a shared sample account with a guided tour. Its data resets automatically every few hours, so feel free to try anything.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">FAQ</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Questions, answered
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {FAQS.map((item, i) => (
            <details
              key={item.q}
              open={i === 0}
              className="group rounded-2xl border border-slate-200 bg-white transition-shadow open:shadow-lg open:shadow-blue-600/5 open:ring-1 open:ring-blue-100"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-transform group-open:rotate-45 group-open:border-blue-200 group-open:bg-blue-50 group-open:text-blue-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              </summary>
              <p className="px-6 pb-5 text-sm leading-relaxed text-slate-500">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
