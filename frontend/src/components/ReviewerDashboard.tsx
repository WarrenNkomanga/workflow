import { useMemo, useState } from "react";
import {
  getApplicationDetail,
  transitionApplication,
} from "../api";
import type {
  Application,
  ApplicationDetail,
  MockUser,
  TransitionAction,
} from "../types";
import StatusBadge from "./StatusBadge";

interface ReviewerDashboardProps {
  user: MockUser;
  applications: Application[];
  loading: boolean;
  onDataChanged: () => Promise<void>;
  onError: (message: string) => void;
}

const actionLabels: Record<TransitionAction, string> = {
  SUBMIT: "Submit",
  START_REVIEW: "Start Review",
  APPROVE: "Approve",
  REJECT: "Reject",
  RETURN_FOR_CHANGES: "Return for Changes",
};

const allowedActionsByStatus: Partial<Record<Application["status"], TransitionAction[]>> = {
  SUBMITTED: ["START_REVIEW", "APPROVE", "REJECT", "RETURN_FOR_CHANGES"],
  UNDER_REVIEW: ["APPROVE", "REJECT", "RETURN_FOR_CHANGES"],
};

export default function ReviewerDashboard({
  user,
  applications,
  loading,
  onDataChanged,
  onError,
}: ReviewerDashboardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [comment, setComment] = useState("");
  const [submittingAction, setSubmittingAction] = useState<TransitionAction | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | Application["status"]>("ALL");

  const filteredApplications = useMemo(() => {
    if (statusFilter === "ALL") {
      return applications;
    }

    return applications.filter((item) => item.status === statusFilter);
  }, [applications, statusFilter]);

  const selectedFromList = useMemo(
    () => applications.find((item) => item.id === selectedId) ?? null,
    [applications, selectedId],
  );

  const loadDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const data = await getApplicationDetail(user, id);
      setSelectedId(id);
      setDetail(data);
      setComment("");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to load details");
    } finally {
      setLoadingDetail(false);
    }
  };

  const runTransition = async (action: TransitionAction) => {
    if (!selectedId) {
      return;
    }

    const requiresComment = action === "REJECT" || action === "RETURN_FOR_CHANGES";
    if (requiresComment && comment.trim().length === 0) {
      onError("A comment is required for Reject and Return for Changes.");
      return;
    }

    try {
      setSubmittingAction(action);
      await transitionApplication(
        user,
        selectedId,
        action,
        requiresComment ? comment.trim() : undefined,
      );
      await onDataChanged();
      const refreshed = await getApplicationDetail(user, selectedId);
      setDetail(refreshed);
      setComment("");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Transition failed");
    } finally {
      setSubmittingAction(null);
    }
  };

  const actions = detail ? allowedActionsByStatus[detail.status] ?? [] : [];

  return (
    <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl text-slate-900">Review Queue</h2>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Status
            <select
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "ALL" | Application["status"])
              }
            >
              <option value="ALL">All</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
        </div>
        <div className="space-y-2">
          {filteredApplications.map((app) => (
            <button
              key={app.id}
              type="button"
              className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                selectedId === app.id
                  ? "border-sky-500 bg-sky-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              onClick={() => void loadDetail(app.id)}
              disabled={loading || loadingDetail || submittingAction !== null}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{app.title}</p>
                <StatusBadge status={app.status} />
              </div>
              <p className="mt-1 text-xs text-slate-600">${Number(app.amount).toFixed(2)} · {app.category}</p>
            </button>
          ))}
          {filteredApplications.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No submissions in queue.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-serif text-xl text-slate-900">Application Details</h2>
        {!selectedFromList && !detail && (
          <p className="text-sm text-slate-500">Select an application to inspect and process.</p>
        )}

        {(loadingDetail || (selectedId && !detail)) && (
          <p className="text-sm text-slate-500">Loading details...</p>
        )}

        {detail && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p>
                <span className="font-semibold">Title:</span> {detail.title}
              </p>
              <p>
                <span className="font-semibold">Category:</span> {detail.category}
              </p>
              <p>
                <span className="font-semibold">Amount:</span> ${Number(detail.amount).toFixed(2)}
              </p>
              <p>
                <span className="font-semibold">Description:</span> {detail.description || "-"}
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">Audit Timeline</h3>
              <ul className="space-y-2 text-sm">
                {detail.audit_logs.map((log) => (
                  <li key={log.id} className="rounded-lg border border-slate-200 p-2">
                    <p className="font-semibold text-slate-800">
                      {log.from_status} -&gt; {log.to_status}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(log.created_at).toLocaleString()} · Actor {log.actor_id.slice(0, 8)}...
                    </p>
                    {log.comment && <p className="mt-1 text-slate-700">{log.comment}</p>}
                  </li>
                ))}
                {detail.audit_logs.length === 0 && (
                  <li className="text-xs text-slate-500">No audit entries yet.</li>
                )}
              </ul>
            </div>

            {actions.length > 0 && (
              <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                <h4 className="text-sm font-semibold text-amber-900">Available Actions</h4>
                <textarea
                  rows={3}
                  className="w-full rounded-md border border-amber-300 px-2 py-2 text-sm"
                  placeholder="Required for Reject/Return for Changes"
                  value={comment}
                  disabled={submittingAction !== null}
                  onChange={(event) => setComment(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {actions.map((action) => {
                    const requiresComment =
                      action === "REJECT" || action === "RETURN_FOR_CHANGES";
                    const disabled =
                      submittingAction !== null ||
                      (requiresComment && comment.trim().length === 0);

                    return (
                      <button
                        key={action}
                        type="button"
                        className="rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={disabled}
                        onClick={() => void runTransition(action)}
                      >
                        {submittingAction === action ? "Working..." : actionLabels[action]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
