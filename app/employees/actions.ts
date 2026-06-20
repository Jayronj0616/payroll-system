"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  PAYROLL_GROUPS,
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
  payrollGroup: string,
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

  if (!PAYROLL_GROUPS.includes(payrollGroup as PayrollGroup)) {
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

export async function createEmployee(formData: FormData): Promise<EmployeeFormState> {
  const name = String(formData.get("name") ?? "");
  const dailyRateRaw = String(formData.get("daily_rate") ?? "");
  const payrollGroupInput = String(formData.get("payroll_group") ?? "");
  const voiceCode = normalizeVoiceCode(String(formData.get("voice_code") ?? ""));

  const payrollGroup = payrollGroupInput || suggestedPayrollGroup(name);

  const errors = validate(name, dailyRateRaw, payrollGroup, voiceCode);

  if (errors.length === 0 && voiceCode) {
    const supabase = getSupabaseServerClient();
    const { data: existing } = await supabase
      .from("employees")
      .select("id")
      .eq("voice_code", voiceCode)
      .maybeSingle();
    if (existing) {
      errors.push("The voice code has already been taken.");
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("employees").insert({
    name: name.trim(),
    daily_rate: parseFloat(dailyRateRaw),
    payroll_group: payrollGroup,
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
  const name = String(formData.get("name") ?? "");
  const dailyRateRaw = String(formData.get("daily_rate") ?? "");
  const payrollGroupInput = String(formData.get("payroll_group") ?? "");
  const voiceCode = normalizeVoiceCode(String(formData.get("voice_code") ?? ""));

  const payrollGroup = payrollGroupInput || suggestedPayrollGroup(name);

  const errors = validate(name, dailyRateRaw, payrollGroup, voiceCode);

  if (errors.length === 0 && voiceCode) {
    const supabase = getSupabaseServerClient();
    const { data: existing } = await supabase
      .from("employees")
      .select("id")
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

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("employees")
    .update({
      name: name.trim(),
      daily_rate: parseFloat(dailyRateRaw),
      payroll_group: payrollGroup,
      voice_code: voiceCode,
    })
    .eq("id", employeeId);

  if (error) {
    return { errors: [error.message] };
  }

  revalidatePath("/employees");
  redirect("/employees?success=Employee updated successfully.");
}

export async function deleteEmployee(employeeId: number) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("employees").delete().eq("id", employeeId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/employees");
  redirect("/employees?success=Employee deleted successfully.");
}
