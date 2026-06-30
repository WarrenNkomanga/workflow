import { useMemo, useState } from "react";
import {
  createApplication,
  transitionApplication,
  updateDraftApplication,
} from "../api";
import type { Application, MockUser } from "../types";
import StatusBadge from "./StatusBadge";

interface ApplicantDashboardProps {
  user: MockUser;
  applications: Application[];
  loading: boolean;
  onDataChanged: () => Promise<void>;
  onError: (message: string) => void;
}

export default function ApplicantDashboard({
  user,
  applications,
  loading,
  onDataChanged,
  onError,
}: ApplicantDashboardProps) {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const isCreateDisabled = useMemo(() => {
    const parsed = Number(amount);
    return title.trim().length === 0 || Number.isNaN(parsed) || parsed <= 0;
  }, [amount, title]);

  const resetForm = () => {
    setTitle("");
    setCategory("");
    setDescription("");
    setAmount("");
    setEditingId(null);
  };

  const openForCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openForEdit = (application: Application) => {
    setEditingId(application.id);
    setTitle(application.title);
    setCategory(application.category);
    setDescription(application.description ?? "");
    setAmount(String(Number(application.amount)));
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        category: category.trim() || "General",
        description: description.trim(),
        amount: Number(amount),
      };

      if (editingId) {
        await updateDraftApplication(user, editingId, payload);
      } else {
        await createApplication(user, payload);
      }

      setCreateOpen(false);
      resetForm();
      await onDataChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to create application");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      setSaving(true);
      await transitionApplication(user, id, "SUBMIT");
      await onDataChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to submit application");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-slate-900">My Submitted Applications</h2>
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          onClick={openForCreate}
          disabled={loading || isSaving}
        >
          Create New Application
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Title</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Category</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Amount</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.map((app) => (
              <tr key={app.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{app.title}</td>
                <td className="px-4 py-3 text-slate-700">{app.category}</td>
                <td className="px-4 py-3 text-slate-700">${Number(app.amount).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={app.status} />
                </td>
                <td className="px-4 py-3">
                  {app.status === "DRAFT" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-slate-500 px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => openForEdit(app)}
                        disabled={isSaving || loading}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-sky-500 px-2 py-1 text-xs font-semibold text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => void handleSubmit(app.id)}
                        disabled={isSaving || loading}
                      >
                        Submit
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">No action</span>
                  )}
                </td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                  No applications yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-slate-950/30 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <h3 className="font-serif text-xl text-slate-900">
              {editingId ? "Edit Draft Application" : "Create Application"}
            </h3>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Title"
                value={title}
                disabled={isSaving}
                onChange={(event) => setTitle(event.target.value)}
              />
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Category"
                value={category}
                disabled={isSaving}
                onChange={(event) => setCategory(event.target.value)}
              />
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={4}
                placeholder="Description"
                value={description}
                disabled={isSaving}
                onChange={(event) => setDescription(event.target.value)}
              />
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={amount}
                disabled={isSaving}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onClick={() => setCreateOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isCreateDisabled || isSaving}
                onClick={() => void handleCreate()}
              >
                {isSaving ? "Saving..." : editingId ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
