"use client";

import { useState, useTransition } from "react";
import Swal from "sweetalert2";
import { PayrollGroup, groupColor } from "@/lib/employee";
import { createPayrollGroup, renamePayrollGroup, deletePayrollGroup } from "./actions";

const GENERAL_GROUP_NAME = "General";

type Props = {
  groups: PayrollGroup[];
  employeeCountByGroupId: Record<number, number>;
};

type ModalState = {
  isOpen: boolean;
  editMode: boolean;
  groupId: number | null;
  name: string;
};

function emptyModal(): ModalState {
  return { isOpen: false, editMode: false, groupId: null, name: "" };
}

export default function PayrollGroupsClient({ groups, employeeCountByGroupId }: Props) {
  const [modal, setModal] = useState<ModalState>(emptyModal());
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setErrors([]);
    setModal({ isOpen: true, editMode: false, groupId: null, name: "" });
  }

  function openRename(group: PayrollGroup) {
    setErrors([]);
    setModal({ isOpen: true, editMode: true, groupId: group.id, name: group.name });
  }

  function closeModal() {
    setModal(emptyModal());
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result =
        modal.editMode && modal.groupId !== null
          ? await renamePayrollGroup(modal.groupId, formData)
          : await createPayrollGroup(formData);

      // If we get here (no redirect threw), there were validation errors.
      if (result?.errors?.length) {
        setErrors(result.errors);
      }
    });
  }

  function confirmDelete(group: PayrollGroup) {
    const count = employeeCountByGroupId[group.id] ?? 0;

    Swal.fire({
      title: "Delete Payroll Group?",
      html:
        count > 0
          ? `Are you sure you want to delete <span class="font-bold text-slate-900">${escapeHtml(group.name)}</span>?<br><br><span class="text-sm text-slate-500">${count} employee(s) currently in this group will be moved to General.</span>`
          : `Are you sure you want to delete <span class="font-bold text-slate-900">${escapeHtml(group.name)}</span>?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#e2e8f0",
      confirmButtonText: "Yes, delete",
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
          deletePayrollGroup(group.id).catch((err) => {
            Swal.fire({
              icon: "error",
              title: "Could not delete group",
              text: err instanceof Error ? err.message : "Something went wrong.",
              customClass: { popup: "rounded-xl border border-slate-100 shadow-xl" },
            });
          });
        });
      }
    });
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payroll Groups</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage the groups employees are organized into for payroll entry and reporting.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          <svg fill="none" className="w-5 h-5" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Group
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

      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs tracking-wider">
                <th className="px-6 py-4 font-semibold">Group</th>
                <th className="px-6 py-4 font-semibold text-right">Employees</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500 bg-slate-50/50">
                    No payroll groups yet.
                  </td>
                </tr>
              ) : (
                groups.map((group) => {
                  const color = groupColor(groups, group);
                  const isGeneral = group.name === GENERAL_GROUP_NAME;
                  const count = employeeCountByGroupId[group.id] ?? 0;

                  return (
                    <tr key={group.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${color.badgeBg} ${color.badgeText}`}
                        >
                          {group.name}
                        </span>
                        {isGeneral && (
                          <span className="ml-2 text-xs text-slate-400">Default fallback group</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-700 font-mono">{count}</td>
                      <td className="px-6 py-4 text-center space-x-3">
                        {isGeneral ? (
                          <span className="text-slate-300 cursor-not-allowed" title="General cannot be renamed or deleted">
                            Locked
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openRename(group)}
                              className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmDelete(group)}
                              className="text-rose-500 hover:text-rose-700 font-medium transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        )}
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

            <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-xl shadow-2xl sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6 border border-slate-200">
              <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  {modal.editMode ? "Rename Payroll Group" : "Add Payroll Group"}
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
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={modal.name}
                    onChange={(e) => setModal((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    autoFocus
                    className="w-full rounded-lg border-slate-300 border focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-4 py-2 text-slate-800 transition-shadow placeholder:text-slate-400"
                    placeholder="e.g. Night Shift"
                  />
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
                    <span>{modal.editMode ? "Save Changes" : "Create Group"}</span>
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
