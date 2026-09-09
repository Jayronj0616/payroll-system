"use client";

import { useTransition } from "react";
import { login } from "@/app/actions/auth";
import { DEMO_USERNAME, DEMO_PASSWORD } from "@/lib/demo";

// Demo credentials are intentionally not typed by the visitor — they're
// baked into this form's hidden fields and submitted straight through
// the real login() action (no parallel auth path, per the plan).
// NOTE: these values do render into the page's HTML (view-source would
// show them). That's an accepted tradeoff for a shared, seed-data-only
// demo account that resets on a schedule — not for anything sensitive.

export default function TryDemoButton() {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await login(formData);
      // login() redirects on success, so getting a result back means it
      // failed — that would only happen if the demo account got
      // deactivated or the seed migration hasn't been run yet.
      if (result?.error) {
        // eslint-disable-next-line no-console
        console.error("Demo login failed:", result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="inline-block">
      <input type="hidden" name="username" value={DEMO_USERNAME} />
      <input type="hidden" name="password" value={DEMO_PASSWORD} />
      <input type="hidden" name="tour" value="1" />
      <button
        type="submit"
        disabled={isPending}
        className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-2.5 px-5 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
      >
        {isPending && (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}
        {isPending ? "Loading demo..." : "Try Demo"}
      </button>
    </form>
  );
}
