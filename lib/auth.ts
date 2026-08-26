import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SessionPayload, verifySessionCookieValue } from "./session";

/**
 * Reads and verifies the session cookie in a Server Component/Action.
 * Returns null if there's no session or it failed verification — callers
 * are responsible for redirecting when a session is required (middleware
 * already blocks unauthenticated requests to protected routes, this is
 * for reading *who* is logged in once you know someone is).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieValue = cookies().get(SESSION_COOKIE_NAME)?.value;
  return verifySessionCookieValue(cookieValue);
}

/** Throws if called somewhere middleware didn't already guarantee a session exists. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("requireSession() called with no active session — this route should be behind middleware.");
  }
  return session;
}
