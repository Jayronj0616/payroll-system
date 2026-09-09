// Session cookie signing/verification. Written with Web Crypto (crypto.subtle)
// instead of Node's `crypto` module so the exact same code runs in
// middleware.ts (Edge runtime) and in Server Actions/Components (Node runtime)
// without needing two implementations.

export type SessionRole = "owner" | "admin" | "staff";

export type SessionPayload = {
  userId: number;
  username: string;
  role: SessionRole;
  // null for owner/superadmin sessions — a superadmin has no tenant and
  // must never be used to scope a query against employees/payrolls.
  accountId: number | null;
};

export const SESSION_COOKIE_NAME = "session";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "Missing SESSION_SECRET env var. Set it in .env.local to any long random string (see .env.example)."
    );
  }
  return secret;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Builds a signed `payload.signature` string to store in the session cookie. */
export async function createSessionCookieValue(payload: SessionPayload): Promise<string> {
  const key = await getKey();
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const signatureB64 = base64UrlEncode(new Uint8Array(signatureBytes));
  return `${payloadB64}.${signatureB64}`;
}

/**
 * Verifies the signature and returns the decoded payload, or null if the
 * cookie is missing, malformed, or has been tampered with.
 */
export async function verifySessionCookieValue(
  cookieValue: string | undefined | null
): Promise<SessionPayload | null> {
  if (!cookieValue) return null;
  const [payloadB64, signatureB64] = cookieValue.split(".");
  if (!payloadB64 || !signatureB64) return null;

  try {
    const key = await getKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signatureB64) as BufferSource,
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return null;

    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    return JSON.parse(payloadJson) as SessionPayload;
  } catch {
    return null;
  }
}
