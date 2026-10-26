type Feature = { title: string; desc: string; icon: string };

// Heroicons outline paths.
const ICONS = {
  users:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  mic: "M19 11a7 7 0 01-14 0m7 7v3m0-3a7 7 0 01-7-7m7 7a7 7 0 007-7M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z",
  groups:
    "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  history: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  shield:
    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  calculator:
    "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
};

const FEATURES: Feature[] = [
  {
    icon: ICONS.mic,
    title: "Voice-command entry",
    desc: "Say an employee's voice code with their days and overtime — the row fills itself in.",
  },
  {
    icon: ICONS.groups,
    title: "Payroll groups",
    desc: "Organize staff into groups with their own totals, so each crew's payroll stays separate.",
  },
  {
    icon: ICONS.history,
    title: "Past records",
    desc: "Pick any saved payroll date to see every record and group total from that run.",
  },
  {
    icon: ICONS.users,
    title: "Employee management",
    desc: "Rates, groups and status in one list. Deactivate people without losing their history.",
  },
  {
    icon: ICONS.shield,
    title: "Private accounts",
    desc: "Every business gets its own isolated books. No one else sees your people or pay.",
  },
];

function Icon({ d }: { d: string }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 ring-1 ring-blue-100">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
      </svg>
    </span>
  );
}

const card =
  "h-full rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-600/5";

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Features</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Everything payroll day needs
          </h2>
          <p className="mt-4 text-slate-500">
            Built around how small teams actually get paid — daily rates, overtime and the occasional cash
            advance.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          <div className={`${card} flex flex-col md:col-span-2 md:row-span-2`}>
            <Icon d={ICONS.calculator} />
            <h3 className="mt-5 text-xl font-semibold text-slate-900">Salaries computed for you</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              Enter days worked, overtime hours and any cash advance. Overtime pay and each person&apos;s total are
              worked out as you type, with running totals per group.
            </p>
            <div className="mt-8 flex-1 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-5 font-mono text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Daily rate × days</span>
                <span>₱600 × 6 = ₱3,600</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>+ Overtime (rate ÷ 8 × hrs)</span>
                <span>₱75 × 2 = ₱150</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>− Cash advance</span>
                <span>₱500</span>
              </div>
              <div className="flex items-end justify-between border-t border-slate-200 pt-3 font-sans">
                <span className="text-xs text-slate-500">Total salary</span>
                <span className="text-3xl font-bold text-blue-600">₱3,250</span>
              </div>
            </div>
          </div>

          {FEATURES.map((f) => (
            <div key={f.title} className={card}>
              <Icon d={f.icon} />
              <h3 className="mt-5 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
