import type { ApplicationStatus } from "../types";

const badgeStyle: Record<ApplicationStatus, string> = {
  DRAFT: "bg-slate-200 text-slate-700",
  SUBMITTED: "bg-sky-100 text-sky-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
};

export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-bold tracking-wide ${badgeStyle[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
