export type UserRole = "APPLICANT" | "REVIEWER";

export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type TransitionAction =
  | "SUBMIT"
  | "START_REVIEW"
  | "APPROVE"
  | "REJECT"
  | "RETURN_FOR_CHANGES";

export interface MockUser {
  key: "alice" | "bob";
  label: string;
  id: string;
  role: UserRole;
}

export interface Application {
  id: string;
  title: string;
  category: string;
  description: string | null;
  amount: string;
  status: ApplicationStatus;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  application_id: string;
  actor_id: string;
  from_status: ApplicationStatus;
  to_status: ApplicationStatus;
  comment: string | null;
  created_at: string;
}

export interface ApplicationDetail extends Application {
  audit_logs: AuditLog[];
}
