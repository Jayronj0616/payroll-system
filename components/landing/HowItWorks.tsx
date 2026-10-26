const STEPS = [
  {
    title: "Add your employees",
    desc: "Enter each person with their daily rate and payroll group. Add a voice code if you'll use voice entry.",
  },
  {
    title: "Enter the week",
    desc: "Type or say days worked, overtime and cash advances. Totals update as you go.",
  },
  {
    title: "Save and review",
    desc: "Check the summary, save, and find every run later under Past Records.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-slate-200 bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">How it works</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Payroll in three steps
          </h2>
        </div>

        <div className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-6">
          <div className="absolute left-[16%] right-[16%] top-8 hidden border-t-2 border-dashed border-blue-200 md:block" />
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative text-center">
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl font-bold text-blue-600 shadow-lg shadow-blue-600/5">
                {i + 1}
              </div>
              <h3 className="mt-6 text-lg font-semibold text-slate-900">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
