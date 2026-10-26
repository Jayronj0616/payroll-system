// Shown instantly while a page's server data loads (every page is dynamic),
// so navigation and date filtering respond on click instead of freezing.
// Having a loading boundary also lets <Link> prefetch up to this shell.
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="mb-6 pb-4 border-b border-slate-200">
        <div className="h-7 w-56 rounded bg-slate-200" />
        <div className="h-4 w-80 rounded bg-slate-100 mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="mt-6 h-64 rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}
