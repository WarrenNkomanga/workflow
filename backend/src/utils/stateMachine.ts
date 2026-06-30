import type {
  ApplicationStatus,
  TransitionAction,
  UserRole,
} from "../types/domain";

export class TransitionValidationError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "TransitionValidationError";
    this.statusCode = statusCode;
  }
}

const actionRequiresComment: TransitionAction[] = [
  "REJECT",
  "RETURN_FOR_CHANGES",
];

const transitionMatrix: Record<
  ApplicationStatus,
  Partial<Record<TransitionAction, ApplicationStatus>>
> = {
  DRAFT: {
    SUBMIT: "SUBMITTED",
  },
  SUBMITTED: {
    START_REVIEW: "UNDER_REVIEW",
    APPROVE: "APPROVED",
    REJECT: "REJECTED",
    RETURN_FOR_CHANGES: "DRAFT",
  },
  UNDER_REVIEW: {
    APPROVE: "APPROVED",
    REJECT: "REJECTED",
    RETURN_FOR_CHANGES: "DRAFT",
  },
  APPROVED: {},
  REJECTED: {},
};

const allowedRoleActions: Record<UserRole, TransitionAction[]> = {
  APPLICANT: ["SUBMIT"],
  REVIEWER: ["START_REVIEW", "APPROVE", "REJECT", "RETURN_FOR_CHANGES"],
};

export const validateTransition = (
  currentStatus: ApplicationStatus,
  action: TransitionAction,
  userRole: UserRole,
  comment?: string,
): ApplicationStatus => {
  if (!allowedRoleActions[userRole].includes(action)) {
    throw new TransitionValidationError(
      `${userRole} cannot perform action ${action}.`,
      403,
    );
  }

  const nextStatus = transitionMatrix[currentStatus][action];
  if (!nextStatus) {
    throw new TransitionValidationError(
      `Action ${action} is not valid when status is ${currentStatus}.`,
      400,
    );
  }

  if (
    actionRequiresComment.includes(action) &&
    (!comment || comment.trim().length === 0)
  ) {
    throw new TransitionValidationError(
      `Action ${action} requires a non-empty comment.`,
      400,
    );
  }

  return nextStatus;
};
