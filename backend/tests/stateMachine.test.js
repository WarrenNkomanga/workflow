"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stateMachine_1 = require("../src/utils/stateMachine");
describe("validateTransition", () => {
    it("allows applicant to submit draft", () => {
        expect((0, stateMachine_1.validateTransition)("DRAFT", "SUBMIT", "APPLICANT")).toBe("SUBMITTED");
    });
    it("blocks applicant from reviewer-only actions", () => {
        expect(() => (0, stateMachine_1.validateTransition)("SUBMITTED", "APPROVE", "APPLICANT")).toThrow(stateMachine_1.TransitionValidationError);
    });
    it("requires comment for reject", () => {
        expect(() => (0, stateMachine_1.validateTransition)("UNDER_REVIEW", "REJECT", "REVIEWER")).toThrow("requires a non-empty comment");
    });
    it("allows reviewer to start review", () => {
        expect((0, stateMachine_1.validateTransition)("SUBMITTED", "START_REVIEW", "REVIEWER")).toBe("UNDER_REVIEW");
    });
    it("rejects invalid transition from approved", () => {
        expect(() => (0, stateMachine_1.validateTransition)("APPROVED", "RETURN_FOR_CHANGES", "REVIEWER", "Fix this")).toThrow("is not valid");
    });
});
