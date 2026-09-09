"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type TourStep = {
  element: string;
  intro: string;
  position?: "top" | "bottom" | "left" | "right";
};

type TourPage = "dashboard" | "employees" | "payrolls";

const STAGE_KEY = "demoTourStage";

type Props = {
  page: TourPage;
  steps: TourStep[];
  /** Path to navigate to once this page's tour finishes. Omit on the last page. */
  nextPath?: string;
  /** sessionStorage stage value the next page checks for. Required with nextPath. */
  nextStage?: TourPage;
};

/**
 * Drives one page's leg of the cross-route demo tour. Each page renders its
 * own instance with its own steps; continuity across navigation is tracked
 * via sessionStorage (App Router has no built-in way to keep a client
 * library's state alive across a route change) rather than any shared
 * client-side tour state.
 */
export default function DemoTour({ page, steps, nextPath, nextStage }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (steps.length === 0) return;

    let shouldStart = false;
    try {
      if (page === "dashboard" && searchParams.get("tour") === "1") {
        shouldStart = true;
        sessionStorage.setItem(STAGE_KEY, "dashboard");
      } else if (sessionStorage.getItem(STAGE_KEY) === page) {
        shouldStart = true;
      }
    } catch {
      // sessionStorage unavailable (private browsing etc.) — skip the tour
      // entirely rather than risk throwing on every demo page load.
      return;
    }

    if (!shouldStart) return;

    // Per-invocation cancellation flag, not a ref — React 18 StrictMode
    // double-invokes this effect in dev (mount, cleanup, mount again). A
    // ref-based "already started" guard would let the *first* invocation
    // claim the start and then get cancelled by its own cleanup, while the
    // second (real) invocation sees the guard already tripped and never
    // runs — net result, the tour silently never starts. A closure-local
    // flag lets each invocation own its own cancellation correctly: the
    // spurious first one gets cancelled before its import resolves, the
    // second one runs clean. In production there's only one invocation, so
    // this behaves exactly the same as the simpler version would have.
    let cancelled = false;
    let finished = false;

    import("intro.js").then(({ default: introJs }) => {
      if (cancelled) return;

      introJs()
        .setOptions({
          steps,
          showBullets: false,
          showProgress: true,
          exitOnOverlayClick: true,
          nextLabel: nextPath ? "Next →" : "Got it",
          doneLabel: nextPath ? "Next →" : "Got it",
        })
        .oncomplete(() => {
          finished = true;
          try {
            if (nextPath && nextStage) {
              sessionStorage.setItem(STAGE_KEY, nextStage);
            } else {
              sessionStorage.removeItem(STAGE_KEY);
            }
          } catch {
            // ignore — worst case the tour just doesn't continue to the next page
          }
          if (nextPath) router.push(nextPath);
        })
        .onexit(() => {
          // Fires on both normal completion and an early exit (X / Esc /
          // overlay click) — only treat it as "user quit" if oncomplete
          // hasn't already run, so we don't clear the stage we just set.
          if (finished) return;
          try {
            sessionStorage.removeItem(STAGE_KEY);
          } catch {
            // ignore
          }
        })
        .start();
    });

    return () => {
      cancelled = true;
    };
    // Intentionally run once per page mount — re-running on every
    // searchParams/router identity change would restart the tour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
