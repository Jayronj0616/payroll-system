/**
 * Analytics events. Names only, never identifiers: no username, employee,
 * salary or payroll detail is ever attached to an event.
 *
 * login() ends in redirect(), so the browser never sees a success state to react
 * to. The action leaves a short-lived cookie naming the event instead, and
 * AnalyticsScript reports it once on the next page.
 */
export const PENDING_EVENT_COOKIE = "payrollpro_event";

export const PENDING_EVENTS = ["login_succeeded", "demo_started"] as const;

export type PendingEvent = (typeof PENDING_EVENTS)[number];
