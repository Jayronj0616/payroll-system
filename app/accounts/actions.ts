"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireSession } from "@/lib/auth";

export type AccountFormState = {
  errors: string[];
};

/**
 * Every action in this file is superadmin-only. A session with a non-null
 * accountId is a tenant session — it must never read or write the accounts
 * table, and is redirected to the app it actually belongs in.
 */
async function requireSuperadmin() {
  const session = await requireSession();
  if (session.accountId !== null) {
    redirect("/dashboard");
  }
  return session;
}

function validateNewAccount(
  accountName: string,
  username: string,
  password: string
): string[] {
  const errors: string[] = [];

  if (!accountName || accountName.trim() === "") {
    errors.push("The account name field is required.");
  } else if (accountName.length > 255) {
    errors.push("The account name field must not be greater than 255 characters.");
  }

  if (!username || username.trim() === "") {
    errors.push("The username field is required.");
  } else if (username.length > 255) {
    errors.push("The username field must not be greater than 255 characters.");
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push("The username field may only contain letters, numbers, and underscores.");
  }

  if (!password || password.length < 8) {
    errors.push("The password field must be at least 8 characters.");
  }

  return errors;
}

export async function createAccount(formData: FormData): Promise<AccountFormState> {
  await requireSuperadmin();

  const accountName = String(formData.get("account_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const errors = validateNewAccount(accountName, username, password);

  if (errors.length === 0) {
    const supabase = getSupabaseServerClient();
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existingUser) {
      errors.push("The username has already been taken.");
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  const supabase = getSupabaseServerClient();

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .insert({ name: accountName })
    .select("id")
    .single();

  if (accountError || !account) {
    return { errors: [accountError?.message ?? "Failed to create account."] };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { error: userError } = await supabase.from("users").insert({
    username,
    password_hash: passwordHash,
    role: "admin",
    account_id: account.id,
    is_active: true,
  });

  if (userError) {
    // Roll back the orphaned account row rather than leaving a tenant
    // with no admin able to log into it.
    await supabase.from("accounts").delete().eq("id", account.id);
    return { errors: [userError.message] };
  }

  // Every account needs at least one payroll group to exist before an
  // admin can add employees -- new employees default to General when no
  // group is explicitly picked (see lib/employee.ts).
  const { error: groupError } = await supabase.from("payroll_groups").insert({
    account_id: account.id,
    name: "General",
  });

  if (groupError) {
    // Roll back both the user and the account rather than leaving a
    // tenant that can log in but can't add employees.
    await supabase.from("users").delete().eq("account_id", account.id);
    await supabase.from("accounts").delete().eq("id", account.id);
    return { errors: [groupError.message] };
  }

  revalidatePath("/accounts");
  redirect("/accounts?success=Account created successfully.");
}

export async function deactivateAccount(accountId: number) {
  await requireSuperadmin();

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("accounts")
    .update({ is_active: false })
    .eq("id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/accounts");
  redirect("/accounts?success=Account deactivated successfully.");
}

export async function activateAccount(accountId: number) {
  await requireSuperadmin();

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("accounts")
    .update({ is_active: true })
    .eq("id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/accounts");
  redirect("/accounts?success=Account activated successfully.");
}

export type UpdateCredentialsState = {
  errors: string[];
};

export async function updateAdminCredentials(
  userId: number,
  formData: FormData
): Promise<UpdateCredentialsState> {
  await requireSuperadmin();

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const errors: string[] = [];

  if (!username || username.trim() === "") {
    errors.push("The username field is required.");
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push("The username field may only contain letters, numbers, and underscores.");
  }

  // Password is optional on edit — blank means "leave unchanged".
  if (password && password.length < 8) {
    errors.push("The password field must be at least 8 characters.");
  }

  if (errors.length === 0) {
    const supabase = getSupabaseServerClient();
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .neq("id", userId)
      .maybeSingle();
    if (existingUser) {
      errors.push("The username has already been taken.");
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  const supabase = getSupabaseServerClient();

  const updatePayload: { username: string; password_hash?: string } = { username };
  if (password) {
    updatePayload.password_hash = await bcrypt.hash(password, 12);
  }

  const { error } = await supabase.from("users").update(updatePayload).eq("id", userId);

  if (error) {
    return { errors: [error.message] };
  }

  revalidatePath("/accounts");
  redirect("/accounts?success=Admin credentials updated successfully.");
}
