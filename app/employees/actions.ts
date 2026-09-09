"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireSession } from "@/lib/auth";
import {
  PayrollGroup,
  normalizeVoiceCode,
  suggestedPayrollGroup,
} from "@/lib/employee";

export type EmployeeFormState = {
  errors: string[];
};

function validate(
  name: string,
  dailyRateRaw: string,
  payrollGroupId: number | null,
  voiceCode: string | null
): string[] {
  const errors: string[] = [];

  if (!name || name.trim() === "") {
    errors.push("The name field is required.");
  } else if (name.length > 255) {
    errors.push("The name field must not be greater than 255 characters.");
  }

  const dailyRate = parseFloat(dailyRateRaw);
  if (dailyRateRaw === "" || dailyRateRaw === null || isNaN(dailyRate)) {
    errors.push("The daily rate field is required.");
  } else if (dailyRate < 0) {
    errors.push("The daily rate field must be at least 0.");
  }

  if (payrollGroupId === null) {
    errors.push("The selected payroll group is invalid.");
  }

  if (voiceCode) {
    if (voiceCode.length > 50) {
      errors.push("The voice code field must not be greater than 50 characters.");
    }
    if (!/^[A-Z0-9 ]+$/.test(voiceCode)) {
      errors.push("The voice code field format is invalid.");
    }
  }

  return errors;
}

/**
 * Resolves the payroll_group_id to use for a create/update: explicit
 * form selection wins, otherwise falls back to name-based auto-suggestion
 * (account-gated, see lib/employee.ts), otherwise falls back to the
 * account's General group. Needs the account's own groups + account name
 * fetched first since lib/employee.ts has no DB access of its own.
 */
async function resolvePayrollGroupId(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  accountId: number,
  payrollGroupIdInput: string,
  employeeName: string
): Promise<number | null> {
  if (payrollGroupIdInput) {
    const parsed = parseInt(payrollGroupIdInput, 10);
    return isNaN(parsed) ? null : parsed;
  }

  const [{ data: account }, { data: groups }] = await Promise.all([
    supabase.from("accounts").select("name").eq("id", accountId).single(),
    supabase.from("payroll_groups").select("*").eq("account_id", accountId),
  ]);

  const accountGroups = (groups ?? []) as PayrollGroup[];
  const suggested = suggestedPayrollGroup(employeeName, account?.name ?? "", accountGroups);
  if (suggested) return suggested.id;

  const general = accountGroups.find((g) => g.name === "General");
  return general?.id ?? null;
}

export async function createEmployee(formData: FormData): Promise<EmployeeFormState> {
  const session = await requireSession();
  if (session.accountId === null) {
    redirect("/accounts");
  }

  const name = String(formData.get("name") ?? "");
  const dailyRateRaw = String(formData.get("daily_rate") ?? "");
  const payrollGroupIdInput = String(formData.get("payroll_group_id") ?? "");
  const voiceCode = normalizeVoiceCode(String(formData.get("voice_code") ?? ""));

  const supabase = getSupabaseServerClient();
  const payrollGroupId = await resolvePayrollGroupId(
    supabase,
    session.accountId,
    payrollGroupIdInput,
    name
  );

  const errors = validate(name, dailyRateRaw, payrollGroupId, voiceCode);

  if (errors.length === 0 && voiceCode) {
    // Voice codes only need to be unique within one account's own employee
    // list — each account's voice-entry flow only ever runs against its
    // own employees.
    const { data: existing } = await supabase
      .from("employees")
      .select("id")
      .eq("account_id", session.accountId)
      .eq("voice_code", voiceCode)
      .maybeSingle();
    if (existing) {
      errors.push("The voice code has already been taken.");
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  const { error } = await supabase.from("employees").insert({
    user_id: session.userId,
    account_id: session.accountId,
    name: name.trim(),
    daily_rate: parseFloat(dailyRateRaw),
    payroll_group_id: payrollGroupId,
    voice_code: voiceCode,
  });

  if (error) {
    return { errors: [error.message] };
  }

  revalidatePath("/employees");
  redirect("/employees?success=Employee created successfully.");
}

export async function updateEmployee(
  employeeId: number,
  formData: FormData
): Promise<EmployeeFormState> {
  const session = await requireSession();
  if (session.accountId === null) {
    redirect("/accounts");
  }

  const name = String(formData.get("name") ?? "");
  const dailyRateRaw = String(formData.get("daily_rate") ?? "");
  const payrollGroupIdInput = String(formData.get("payroll_group_id") ?? "");
  const voiceCode = normalizeVoiceCode(String(formData.get("voice_code") ?? ""));

  const supabase = getSupabaseServerClient();
  const payrollGroupId = await resolvePayrollGroupId(
    supabase,
    session.accountId,
    payrollGroupIdInput,
    name
  );

  const errors = validate(name, dailyRateRaw, payrollGroupId, voiceCode);

  if (errors.length === 0 && voiceCode) {
    const { data: existing } = await supabase
      .from("employees")
      .select("id")
      .eq("account_id", session.accountId)
      .eq("voice_code", voiceCode)
      .neq("id", employeeId)
      .maybeSingle();
    if (existing) {
      errors.push("The voice code has already been taken.");
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  // Scoped to account_id so one tenant can never update another tenant's
  // employee, even by guessing/crafting an employee id.
  const { error } = await supabase
    .from("employees")
    .update({
      name: name.trim(),
      daily_rate: parseFloat(dailyRateRaw),
      payroll_group_id: payrollGroupId,
      voice_code: voiceCode,
    })
    .eq("id", employeeId)
    .eq("account_id", session.accountId);

  if (error) {
    return { errors: [error.message] };
  }

  revalidatePath("/employees");
  redirect("/employees?success=Employee updated successfully.");
}

export async function deactivateEmployee(employeeId: number) {
  const session = await requireSession();
  if (session.accountId === null) {
    redirect("/accounts");
  }

  const supabase = getSupabaseServerClient();
  // Scoped to account_id so one tenant can never deactivate another
  // tenant's employee, even by guessing/crafting an employee id.
  const { error } = await supabase
    .from("employees")
    .update({ is_active: false })
    .eq("id", employeeId)
    .eq("account_id", session.accountId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/employees");
  revalidatePath("/payrolls");
  redirect("/employees?success=Employee deactivated successfully.");
}

export async function activateEmployee(employeeId: number) {
  const session = await requireSession();
  if (session.accountId === null) {
    redirect("/accounts");
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("employees")
    .update({ is_active: true })
    .eq("id", employeeId)
    .eq("account_id", session.accountId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/employees");
  revalidatePath("/payrolls");
  redirect("/employees?success=Employee activated successfully.");
}
