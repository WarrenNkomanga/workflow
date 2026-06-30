import {
  TransitionValidationError,
  validateTransition,
} from "../src/utils/stateMachine";

describe("validateTransition", () => {
  it("allows applicant to submit draft", () => {
    expect(validateTransition("DRAFT", "SUBMIT", "APPLICANT")).toBe("SUBMITTED");
  });

  it("blocks applicant from reviewer-only actions", () => {
    expect(() =>
      validateTransition("SUBMITTED", "APPROVE", "APPLICANT"),
    ).toThrow(TransitionValidationError);
  });

  it("requires comment for reject", () => {
    expect(() =>
      validateTransition("UNDER_REVIEW", "REJECT", "REVIEWER"),
    ).toThrow("requires a non-empty comment");
  });

  it("allows reviewer to start review", () => {
    expect(
      validateTransition("SUBMITTED", "START_REVIEW", "REVIEWER"),
    ).toBe("UNDER_REVIEW");
  });

  it("rejects invalid transition from approved", () => {
    expect(() =>
      validateTransition("APPROVED", "RETURN_FOR_CHANGES", "REVIEWER", "Fix this"),
    ).toThrow("is not valid");
  });
});
