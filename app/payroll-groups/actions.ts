"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireSession } from "@/lib/auth";

export type PayrollGroupFormState = {
  errors: string[];
};

const GENERAL_GROUP_NAME = "General";

function validateName(name: string): string[] {
  const errors: string[] = [];

  if (!name || name.trim() === "") {
    errors.push("The group name field is required.");
  } else if (name.length > 100) {
    errors.push("The group name field must not be greater than 100 characters.");
  }

  return errors;
}

export async function createPayrollGroup(formData: FormData): Promise<PayrollGroupFormState> {
  const session = await requireSession();
  if (session.accountId === null) {
    redirect("/accounts");
  }

  const name = String(formData.get("name") ?? "").trim();
  const errors = validateName(name);

  if (errors.length === 0) {
    const supabase = getSupabaseServerClient();
    const { data: existing } = await supabase
      .from("payroll_groups")
      .select("id")
      .eq("account_id", session.accountId)
      .eq("name", name)
      .maybeSingle();
    if (existing) {
      errors.push("A payroll group with this name already exists.");
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("payroll_groups").insert({
    account_id: session.accountId,
    name,
  });

  if (error) {
    return { errors: [error.message] };
  }

  revalidatePath("/payroll-groups");
  revalidatePath("/employees");
  revalidatePath("/payrolls");
  redirect("/payroll-groups?success=Payroll group created successfully.");
}

export async function renamePayrollGroup(
  groupId: number,
  formData: FormData
): Promise<PayrollGroupFormState> {
  const session = await requireSession();
  if (session.accountId === null) {
    redirect("/accounts");
  }

  const supabase = getSupabaseServerClient();

  // Scoped to account_id so one tenant can never touch another tenant's
  // group, even by guessing/crafting a group id.
  const { data: group, error: groupError } = await supabase
    .from("payroll_groups")
    .select("id, name")
    .eq("id", groupId)
    .eq("account_id", session.accountId)
    .maybeSingle();

  if (groupError) {
    return { errors: [groupError.message] };
  }
  if (!group) {
    return { errors: ["Payroll group not found."] };
  }
  if (group.name === GENERAL_GROUP_NAME) {
    return { errors: ["The General group cannot be renamed."] };
  }

  const name = String(formData.get("name") ?? "").trim();
  const errors = validateName(name);

  if (errors.length === 0) {
    const { data: existing } = await supabase
      .from("payroll_groups")
      .select("id")
      .eq("account_id", session.accountId)
      .eq("name", name)
      .neq("id", groupId)
      .maybeSingle();
    if (existing) {
      errors.push("A payroll group with this name already exists.");
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  const { error } = await supabase
    .from("payroll_groups")
    .update({ name })
    .eq("id", groupId)
    .eq("account_id", session.accountId);

  if (error) {
    return { errors: [error.message] };
  }

  revalidatePath("/payroll-groups");
  revalidatePath("/employees");
  revalidatePath("/payrolls");
  redirect("/payroll-groups?success=Payroll group renamed successfully.");
}

export async function deletePayrollGroup(groupId: number) {
  const session = await requireSession();
  if (session.accountId === null) {
    redirect("/accounts");
  }

  const supabase = getSupabaseServerClient();

  const { data: group, error: groupError } = await supabase
    .from("payroll_groups")
    .select("id, name")
    .eq("id", groupId)
    .eq("account_id", session.accountId)
    .maybeSingle();

  if (groupError) {
    throw new Error(groupError.message);
  }
  if (!group) {
    throw new Error("Payroll group not found.");
  }
  if (group.name === GENERAL_GROUP_NAME) {
    throw new Error("The General group cannot be deleted.");
  }

  const { data: generalGroup, error: generalError } = await supabase
    .from("payroll_groups")
    .select("id")
    .eq("account_id", session.accountId)
    .eq("name", GENERAL_GROUP_NAME)
    .maybeSingle();

  if (generalError) {
    throw new Error(generalError.message);
  }
  if (!generalGroup) {
    // Shouldn't happen -- every account gets a General group the moment
    // it's created (see app/accounts/actions.ts createAccount) -- but
    // don't silently orphan employees if it's somehow missing.
    throw new Error("This account has no General group to reassign employees to.");
  }

  // Reassign any employees in the deleted group to General before
  // removing the group itself, so no employee is left pointing at a
  // payroll_group_id that no longer exists.
  const { error: reassignError } = await supabase
    .from("employees")
    .update({ payroll_group_id: generalGroup.id })
    .eq("account_id", session.accountId)
    .eq("payroll_group_id", groupId);

  if (reassignError) {
    throw new Error(reassignError.message);
  }

  const { error: deleteError } = await supabase
    .from("payroll_groups")
    .delete()
    .eq("id", groupId)
    .eq("account_id", session.accountId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/payroll-groups");
  revalidatePath("/employees");
  revalidatePath("/payrolls");
  redirect("/payroll-groups?success=Payroll group deleted. Employees moved to General.");
}
