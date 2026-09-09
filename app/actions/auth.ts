"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { createSessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/session";

export type LoginState = {
  error: string | null;
};

export async function login(formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const supabase = getSupabaseServerClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("id, username, password_hash, role, is_active, account_id")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    return { error: "Something went wrong. Please try again." };
  }

  // Deliberately generic message either way — don't reveal whether the
  // username exists, whether it's deactivated, or whether the password
  // was wrong.
  if (!user || !user.is_active) {
    return { error: "Invalid username or password." };
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return { error: "Invalid username or password." };
  }

  const cookieValue = await createSessionCookieValue({
    userId: user.id,
    username: user.username,
    role: user.role as "owner" | "admin" | "staff",
    accountId: user.account_id,
  });

  cookies().set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // No maxAge/expires set on purpose: this makes it a browser *session*
    // cookie, cleared automatically when the tab/browser closes.
  });

  // The "Try Demo" button submits this same action with a hidden
  // tour=1 field so the demo visitor lands on the tour instead of a
  // plain dashboard. Real logins never send this field.
  const startTour = formData.get("tour") === "1";
  redirect(startTour ? "/dashboard?tour=1" : "/dashboard");
}

export async function logout() {
  cookies().set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  redirect("/");
}
