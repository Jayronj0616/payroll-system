"use client";

import { useState, useTransition } from "react";
import Swal from "sweetalert2";
import {
  Employee,
  PayrollGroup,
  groupColor,
  suggestedPayrollGroup,
  AUTO_SUGGEST_ACCOUNT_NAME,
} from "@/lib/employee";
import { createEmployee, updateEmployee, deactivateEmployee, activateEmployee } from "./actions";
import DemoTour from "@/components/DemoTour";

type Props = {
  employees: Employee[];
  groups: PayrollGroup[];
  /**
   * Account name for this session -- only used to decide whether to show
   * the auto-suggestion hint text. Passed down instead of imported
   * elsewhere since this is a client component.
   */
  accountName?: string;
  /** Whether this session is the shared demo account — drives the tour. */
  isDemo?: boolean;
};

type ModalState = {
  isOpen: boolean;
  editMode: boolean;
  employeeId: number | null;
  name: string;
  voiceCode: string;
  dailyRate: string;
  payrollGroupId: number | null;
};

function emptyModal(defaultGroupId: number | null): ModalState {
  return {
    isOpen: false,
    editMode: false,
    employeeId: null,
    name: "",
    voiceCode: "",
    dailyRate: "",
    payrollGroupId: defaultGroupId,
  };
}

export default function EmployeesClient({ employees, groups, accountName, isDemo }: Props) {
  const generalGroup = groups.find((g) => g.name === "General") ?? groups[0] ?? null;
  const [modal, setModal] = useState<ModalState>(() => emptyModal(generalGroup?.id ?? null));
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [statusTab, setStatusTab] = useState<"active" | "inactive">("active");

  const groupById = new Map(groups.map((g) => [g.id, g]));

  const visibleEmployees = employees.filter((e) =>
    statusTab === "active" ? e.is_active : !e.is_active
  );
  const activeCount = employees.filter((e) => e.is_active).length;
  const inactiveCount = employees.length - activeCount;

  function openCreate() {
    setErrors([]);
    setModal({ ...emptyModal(generalGroup?.id ?? null), isOpen: true });
  }

  function openEdit(employee: Employee) {
    setErrors([]);
    setModal({
      isOpen: true,
      editMode: true,
      employeeId: employee.id,
      name: employee.name,
      voiceCode: employee.voice_code ?? "",
      dailyRate: String(employee.daily_rate),
      payrollGroupId: employee.payroll_group_id ?? generalGroup?.id ?? null,
    });
  }

  function closeModal() {
    setModal(emptyModal(generalGroup?.id ?? null));
  }

  function handleNameChange(value: string) {
    setModal((prev) => {
      if (prev.editMode) {
        return { ...prev, name: value };
      }
      const suggested = accountName
        ? suggestedPayrollGroup(value, accountName, groups)
        : null;
      return {
        ...prev,
        name: value,
        payrollGroupId: suggested?.id ?? generalGroup?.id ?? prev.payrollGroupId,
      };
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result =
        modal.editMode && modal.employeeId !== null
          ? await updateEmployee(modal.employeeId, formData)
          : await createEmployee(formData);

      // If we get here (no redirect threw), there were validation errors.
      if (result?.errors?.length) {
        setErrors(result.errors);
      }
    });
  }

  function confirmToggleStatus(employee: Employee) {
    const isDeactivating = employee.is_active;

    Swal.fire({
      title: isDeactivating ? "Deactivate Employee?" : "Activate Employee?",
      html: isDeactivating
        ? `Are you sure you want to deactivate <span class="font-bold text-slate-900">${escapeHtml(employee.name)}</span>?<br><br><span class="text-sm text-slate-500">They will be hidden from Compute Entry and the active list, but their payroll history is kept and they can be reactivated anytime.</span>`
        : `Are you sure you want to reactivate <span class="font-bold text-slate-900">${escapeHtml(employee.name)}</span>?<br><br><span class="text-sm text-slate-500">They will reappear in Compute Entry and the active list.</span>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: isDeactivating ? "#ef4444" : "#4f46e5",
      cancelButtonColor: "#e2e8f0",
      confirmButtonText: isDeactivating ? "Yes, deactivate" : "Yes, activate",
      cancelButtonText: '<span class="text-slate-700">Cancel</span>',
      customClass: {
        popup: "rounded-xl border border-slate-100 shadow-xl",
        title: "text-lg font-bold text-slate-800",
        confirmButton: "font-semibold rounded-lg shadow-sm px-5 py-2.5",
        cancelButton: "font-semibold rounded-lg px-5 py-2.5",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        startTransition(() => {
          if (isDeactivating) {
            deactivateEmployee(employee.id);
          } else {
            activateEmployee(employee.id);
          }
        });
      }
    });
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain employee rates and assign each person to a payroll group.
          </p>
        </div>

        <button
          id="tour-add-employee-btn"
          type="button"
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          <svg fill="none" className="w-5 h-5" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Employee
        </button>
      </div>

      {errors.length > 0 && !modal.isOpen && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg mb-6">
          <ul className="list-disc list-inside text-sm">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex p-1 space-x-1 bg-slate-100/80 rounded-xl border border-slate-200 w-fit mb-4">
        <button
          type="button"
          onClick={() => setStatusTab("active")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all outline-none ${
            statusTab === "active"
              ? "bg-white shadow text-indigo-700"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setStatusTab("inactive")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all outline-none ${
            statusTab === "inactive"
              ? "bg-white shadow text-indigo-700"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Inactive ({inactiveCount})
        </button>
      </div>

      <div
        id="tour-employees-table"
        className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs tracking-wider">
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Voice Code</th>
                <th className="px-6 py-4 font-semibold">Group</th>
                <th className="px-6 py-4 font-semibold text-right">Daily Rate</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 bg-slate-50/50">
                    <div className="flex flex-col items-center">
                      <svg
                        className="w-12 h-12 text-slate-300 mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      <p className="text-lg">
                        {statusTab === "active" ? "No active employees found." : "No inactive employees."}
                      </p>
                      {statusTab === "active" && (
                        <button
                          type="button"
                          onClick={openCreate}
                          className="text-indigo-600 mt-2 hover:underline font-medium"
                        >
                          Add the first one
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                visibleEmployees.map((employee) => {
                  const group = groupById.get(employee.payroll_group_id) ?? null;
                  const color = groupColor(groups, group);
                  return (
                    <tr key={employee.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{employee.name}</td>
                      <td className="px-6 py-4">
                        {employee.voice_code ? (
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-rose-100 text-rose-700">
                            {employee.voice_code}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">No voice code</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${color.badgeBg} ${color.badgeText}`}
                        >
                          {group?.name ?? "Unassigned"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-700 font-mono">
                        {employee.daily_rate.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center space-x-3">
                        <button
                          type="button"
                          onClick={() => openEdit(employee)}
                          className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmToggleStatus(employee)}
                          className={
                            employee.is_active
                              ? "text-rose-500 hover:text-rose-700 font-medium transition-colors"
                              : "text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                          }
                        >
                          {employee.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-slate-900/50 backdrop-blur-sm"
              aria-hidden="true"
              onClick={closeModal}
            />
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>

            <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-xl shadow-2xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border border-slate-200">
              <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  {modal.editMode ? "Edit Employee Record" : "Add New Employee"}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-lg transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {errors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg mb-4">
                  <ul className="list-disc list-inside text-sm">
                    {errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                      Employee Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={modal.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      className="w-full rounded-lg border-slate-300 border focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-4 py-2 text-slate-800 transition-shadow placeholder:text-slate-400"
                      placeholder="e.g. ARIEL"
                    />
                  </div>

                  <div>
                    <label htmlFor="voice_code" className="block text-sm font-semibold text-slate-700 mb-2">
                      Voice Code
                    </label>
                    <input
                      type="text"
                      name="voice_code"
                      id="voice_code"
                      value={modal.voiceCode}
                      onChange={(e) => setModal((prev) => ({ ...prev, voiceCode: e.target.value }))}
                      className="w-full rounded-lg border-slate-300 border focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-4 py-2 text-slate-800 transition-shadow placeholder:text-slate-400 uppercase"
                      placeholder="e.g. MANGO"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Optional. Use one short unique word that is easy to say, like MANGO or TIGER.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="payroll_group_id" className="block text-sm font-semibold text-slate-700 mb-2">
                      Payroll Group
                    </label>
                    <select
                      name="payroll_group_id"
                      id="payroll_group_id"
                      value={modal.payrollGroupId ?? ""}
                      onChange={(e) =>
                        setModal((prev) => ({ ...prev, payrollGroupId: parseInt(e.target.value, 10) }))
                      }
                      required
                      className="w-full rounded-lg border-slate-300 border focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-4 py-2 text-slate-800 transition-shadow"
                    >
                      {groups.length === 0 && (
                        <option value="" disabled>
                          No groups yet -- add one in Payroll Groups first
                        </option>
                      )}
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                    {accountName === AUTO_SUGGEST_ACCOUNT_NAME && (
                      <p className="text-xs text-slate-500 mt-2">
                        PULONG, TATA ROMY, ARIEL, and WILSON will default to MF when creating a new employee.
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="daily_rate" className="block text-sm font-semibold text-slate-700 mb-2">
                      Daily Rate
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-medium">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        name="daily_rate"
                        id="daily_rate"
                        value={modal.dailyRate}
                        onChange={(e) => setModal((prev) => ({ ...prev, dailyRate: e.target.value }))}
                        required
                        className="w-full rounded-lg border-slate-300 border font-mono block pl-8 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-4 py-2 text-slate-800 transition-shadow placeholder:text-slate-400 font-medium"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-slate-300 focus:ring-offset-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 flex items-center gap-2 disabled:opacity-60"
                  >
                    <span>{modal.editMode ? "Save Changes" : "Create Employee"}</span>
                    <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isDemo && (
        <DemoTour
          page="employees"
          nextPath="/payrolls"
          nextStage="payrolls"
          steps={[
            {
              element: "#tour-add-employee-btn",
              intro: "Add a new employee here.",
              position: "left",
            },
            {
              element: "#tour-employees-table",
              intro: "Active/Inactive tabs — deactivating keeps their payroll history.",
              position: "top",
            },
          ]}
        />
      )}
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
