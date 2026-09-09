"use client";

import { useState, useTransition } from "react";
import Swal from "sweetalert2";
import {
  createAccount,
  deactivateAccount,
  activateAccount,
  updateAdminCredentials,
} from "./actions";

export type AccountRow = {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  admin: { id: number; username: string } | null;
};

type Props = {
  accounts: AccountRow[];
};

type CreateModalState = {
  isOpen: boolean;
  accountName: string;
  username: string;
  password: string;
};

const EMPTY_CREATE_MODAL: CreateModalState = {
  isOpen: false,
  accountName: "",
  username: "",
  password: "",
};

type EditModalState = {
  isOpen: boolean;
  userId: number | null;
  accountName: string;
  username: string;
  password: string;
};

const EMPTY_EDIT_MODAL: EditModalState = {
  isOpen: false,
  userId: null,
  accountName: "",
  username: "",
  password: "",
};

export default function AccountsClient({ accounts }: Props) {
  const [createModal, setCreateModal] = useState<CreateModalState>(EMPTY_CREATE_MODAL);
  const [editModal, setEditModal] = useState<EditModalState>(EMPTY_EDIT_MODAL);
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setErrors([]);
    setCreateModal({ ...EMPTY_CREATE_MODAL, isOpen: true });
  }

  function closeCreate() {
    setCreateModal(EMPTY_CREATE_MODAL);
  }

  function openEdit(account: AccountRow) {
    if (!account.admin) return;
    setErrors([]);
    setEditModal({
      isOpen: true,
      userId: account.admin.id,
      accountName: account.name,
      username: account.admin.username,
      password: "",
    });
  }

  function closeEdit() {
    setEditModal(EMPTY_EDIT_MODAL);
  }

  function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createAccount(formData);
      if (result?.errors?.length) {
        setErrors(result.errors);
      }
    });
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editModal.userId === null) return;
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateAdminCredentials(editModal.userId as number, formData);
      if (result?.errors?.length) {
        setErrors(result.errors);
      }
    });
  }

  function confirmToggleStatus(account: AccountRow) {
    const isDeactivating = account.isActive;

    Swal.fire({
      title: isDeactivating ? "Deactivate Account?" : "Activate Account?",
      html: isDeactivating
        ? `Are you sure you want to deactivate <span class="font-bold text-slate-900">${escapeHtml(account.name)}</span>?<br><br><span class="text-sm text-slate-500">Their admin will no longer be able to log in. Data is kept and the account can be reactivated anytime.</span>`
        : `Are you sure you want to reactivate <span class="font-bold text-slate-900">${escapeHtml(account.name)}</span>?<br><br><span class="text-sm text-slate-500">Their admin will be able to log in again.</span>`,
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
            deactivateAccount(account.id);
          } else {
            activateAccount(account.id);
          }
        });
      }
    });
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage tenant accounts and their admin credentials. No employee or payroll data is
            shown here.
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
          Add Account
        </button>
      </div>

      {errors.length > 0 && !createModal.isOpen && !editModal.isOpen && (
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
                <th className="px-6 py-4 font-semibold">Account</th>
                <th className="px-6 py-4 font-semibold">Admin Username</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 bg-slate-50/50">
                    <p className="text-lg">No accounts yet.</p>
                    <button
                      type="button"
                      onClick={openCreate}
                      className="text-indigo-600 mt-2 hover:underline font-medium"
                    >
                      Add the first one
                    </button>
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{account.name}</td>
                    <td className="px-6 py-4 text-slate-700">
                      {account.admin ? (
                        account.admin.username
                      ) : (
                        <span className="text-sm text-slate-400">No admin user</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          account.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {account.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center space-x-3">
                      <button
                        type="button"
                        onClick={() => openEdit(account)}
                        disabled={!account.admin}
                        className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors disabled:opacity-40 disabled:hover:text-indigo-500 disabled:cursor-not-allowed"
                      >
                        Edit Credentials
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmToggleStatus(account)}
                        className={
                          account.isActive
                            ? "text-rose-500 hover:text-rose-700 font-medium transition-colors"
                            : "text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                        }
                      >
                        {account.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createModal.isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-slate-900/50 backdrop-blur-sm"
              aria-hidden="true"
              onClick={closeCreate}
            />
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>

            <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-xl shadow-2xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border border-slate-200">
              <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Add New Account</h3>
                <button
                  type="button"
                  onClick={closeCreate}
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

              <form onSubmit={handleCreateSubmit}>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="account_name" className="block text-sm font-semibold text-slate-700 mb-2">
                      Account Name
                    </label>
                    <input
                      type="text"
                      name="account_name"
                      id="account_name"
                      value={createModal.accountName}
                      onChange={(e) =>
                        setCreateModal((prev) => ({ ...prev, accountName: e.target.value }))
                      }
                      required
                      className="w-full rounded-lg border-slate-300 border focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-4 py-2 text-slate-800 transition-shadow placeholder:text-slate-400"
                      placeholder="e.g. Acme Trucking"
                    />
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-2">
                      Admin Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      id="username"
                      value={createModal.username}
                      onChange={(e) =>
                        setCreateModal((prev) => ({ ...prev, username: e.target.value }))
                      }
                      required
                      className="w-full rounded-lg border-slate-300 border focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-4 py-2 text-slate-800 transition-shadow placeholder:text-slate-400"
                      placeholder="e.g. acmeadmin"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                      Admin Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      id="password"
                      value={createModal.password}
                      onChange={(e) =>
                        setCreateModal((prev) => ({ ...prev, password: e.target.value }))
                      }
                      required
                      minLength={8}
                      className="w-full rounded-lg border-slate-300 border focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-4 py-2 text-slate-800 transition-shadow placeholder:text-slate-400"
                      placeholder="At least 8 characters"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeCreate}
                    className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-slate-300 focus:ring-offset-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 flex items-center gap-2 disabled:opacity-60"
                  >
                    <span>Create Account</span>
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

      {editModal.isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-slate-900/50 backdrop-blur-sm"
              aria-hidden="true"
              onClick={closeEdit}
            />
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>

            <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-xl shadow-2xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border border-slate-200">
              <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Edit Credentials — {editModal.accountName}
                </h3>
                <button
                  type="button"
                  onClick={closeEdit}
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

              <form onSubmit={handleEditSubmit}>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="edit_username" className="block text-sm font-semibold text-slate-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      id="edit_username"
                      value={editModal.username}
                      onChange={(e) => setEditModal((prev) => ({ ...prev, username: e.target.value }))}
                      required
                      className="w-full rounded-lg border-slate-300 border focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-4 py-2 text-slate-800 transition-shadow"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit_password" className="block text-sm font-semibold text-slate-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      id="edit_password"
                      value={editModal.password}
                      onChange={(e) => setEditModal((prev) => ({ ...prev, password: e.target.value }))}
                      minLength={8}
                      className="w-full rounded-lg border-slate-300 border focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-4 py-2 text-slate-800 transition-shadow placeholder:text-slate-400"
                      placeholder="Leave blank to keep current password"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Leave blank to keep the current password unchanged.
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-slate-300 focus:ring-offset-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 flex items-center gap-2 disabled:opacity-60"
                  >
                    <span>Save Changes</span>
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
