"use client";

import { useEffect } from "react";
import { OpenPanelComponent, useOpenPanel } from "@openpanel/nextjs";

import {
  PENDING_EVENTS,
  PENDING_EVENT_COOKIE,
  type PendingEvent,
} from "@/lib/analytics/events";

const CLIENT_ID = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;

// Runs in the browser before any event is sent. Everything except the landing
// page view and the sign-in events is dropped, so the signed-in app (payrolls,
// employees, accounts, the platform admin console) is never tracked even though
// the script stays loaded across client-side navigation.
const EVENT_FILTER = `(event) => {
  if (event.type !== "track") return false;
  var name = event.payload.name;
  if (name === "screen_view") {
    try {
      return new URL(event.payload.properties.__path).pathname === "/";
    } catch (e) {
      return false;
    }
  }
  return name === "login_succeeded" || name === "demo_started";
}`;

/** Reports the event a server action queued in a cookie, then clears it. */
function PendingEventReporter() {
  const { track } = useOpenPanel();

  useEffect(() => {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${PENDING_EVENT_COOKIE}=([^;]*)`),
    );
    if (!match) return;
    document.cookie = `${PENDING_EVENT_COOKIE}=; path=/; max-age=0`;
    const name = match[1] as PendingEvent;
    if (PENDING_EVENTS.includes(name)) track(name);
  }, [track]);

  return null;
}

/** Inert until NEXT_PUBLIC_OPENPANEL_CLIENT_ID is set; that variable is the only gate. */
export default function AnalyticsScript() {
  if (!CLIENT_ID) return null;

  return (
    <>
      <OpenPanelComponent
        clientId={CLIENT_ID}
        apiUrl="/api/op"
        scriptUrl="/api/op/op1.js"
        trackScreenViews
        filter={EVENT_FILTER}
      />
      <PendingEventReporter />
    </>
  );
}
