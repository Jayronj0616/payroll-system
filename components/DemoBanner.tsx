// Persistent indicator that the current session is the shared demo account,
// not a real tenant. Server component — driven purely by the session, not
// the transient ?tour=1 param, so it stays visible for the whole visit
// even after the tour finishes or the visitor navigates away and back.
export default function DemoBanner() {
  return (
    <div className="bg-amber-400 text-amber-950 text-sm font-medium text-center py-2 px-4">
      Demo Mode — you&apos;re exploring a shared demo account. Data resets automatically every few
      hours.
    </div>
  );
}
