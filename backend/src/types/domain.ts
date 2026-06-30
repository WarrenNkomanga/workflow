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

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}
