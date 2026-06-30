jest.mock("../src/utils/db", () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
}));

import request from "supertest";
import app from "../src/app";
import { pool, query } from "../src/utils/db";
import type { ApplicationStatus } from "../src/types/domain";

type MockDbRow = Record<string, unknown>;

type MockClient = {
  query: jest.Mock<Promise<{ rows: MockDbRow[] }>, [string, ...unknown[]] | [string]>;
  release: jest.Mock<void, []>;
};

const aliceId = "361a89a7-787d-4276-ba6d-fa37ed6dd466";
const bobId = "51ec1470-a403-4f5c-ac49-d523ae9ec275";

const applicantHeaders = {
  "x-user-id": aliceId,
  "x-user-role": "APPLICANT",
};

const reviewerHeaders = {
  "x-user-id": bobId,
  "x-user-role": "REVIEWER",
};

const createMockClient = (): MockClient => ({
  query: jest.fn(),
  release: jest.fn(),
});

const sampleApplication = (status: ApplicationStatus) => ({
  id: "app-123",
  title: "Seed Application",
  category: "Grants",
  description: "desc",
  amount: "100.00",
  status,
  owner_id: aliceId,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

describe("application routes integration", () => {
  const queryMock = query as jest.MockedFunction<typeof query>;
  const connectMock = pool.connect as jest.MockedFunction<typeof pool.connect>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when auth headers are missing", async () => {
    const response = await request(app).get("/api/applications");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Missing authentication headers");
  });

  it("blocks reviewer from creating applications", async () => {
    const response = await request(app)
      .post("/api/applications")
      .set(reviewerHeaders)
      .send({
        title: "Not allowed",
        category: "General",
        description: "x",
        amount: 99,
      });

    expect(response.status).toBe(403);
    expect(response.body.detail).toContain("Only applicants can create applications");
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("filters list query by applicant ownership", async () => {
    queryMock.mockResolvedValueOnce({ rows: [sampleApplication("DRAFT")] } as never);

    const response = await request(app).get("/api/applications").set(applicantHeaders);

    expect(response.status).toBe(200);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("WHERE owner_id = $1"),
      [aliceId],
    );
    expect(response.body).toHaveLength(1);
  });

  it("denies reviewer access to draft application details", async () => {
    queryMock.mockResolvedValueOnce({ rows: [sampleApplication("DRAFT")] } as never);

    const response = await request(app)
      .get("/api/applications/app-123")
      .set(reviewerHeaders);

    expect(response.status).toBe(403);
    expect(response.body.detail).toContain("Reviewers cannot access draft applications");
  });

  it("allows applicant to edit own draft", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [sampleApplication("DRAFT")] } as never)
      .mockResolvedValueOnce({
        rows: [{ ...sampleApplication("DRAFT"), title: "Updated Draft" }],
      } as never);

    const response = await request(app)
      .put("/api/applications/app-123")
      .set(applicantHeaders)
      .send({
        title: "Updated Draft",
        category: "Grants",
        description: "updated",
        amount: 321,
      });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("Updated Draft");
  });

  it("blocks applicant from editing non-draft", async () => {
    queryMock.mockResolvedValueOnce({ rows: [sampleApplication("SUBMITTED")] } as never);

    const response = await request(app)
      .put("/api/applications/app-123")
      .set(applicantHeaders)
      .send({
        title: "Nope",
        category: "Grants",
        description: "updated",
        amount: 321,
      });

    expect(response.status).toBe(403);
    expect(response.body.detail).toContain("only be edited while in DRAFT");
  });

  it("blocks reviewer from editing draft", async () => {
    const response = await request(app)
      .put("/api/applications/app-123")
      .set(reviewerHeaders)
      .send({
        title: "Nope",
        category: "Grants",
        description: "updated",
        amount: 321,
      });

    expect(response.status).toBe(403);
    expect(response.body.detail).toContain("Only applicants can edit draft");
  });

  it("rolls back transaction when transition validation fails", async () => {
    const client = createMockClient();
    connectMock.mockResolvedValueOnce(client as never);

    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [sampleApplication("SUBMITTED")] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post("/api/applications/app-123/transition")
      .set(applicantHeaders)
      .send({ action: "APPROVE" });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Transition validation failed");
    expect(client.query).toHaveBeenCalledWith("BEGIN");
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");

    const calls = client.query.mock.calls.map(([sql]) => sql);
    expect(calls[0]).toBe("BEGIN");
    expect(calls[1]).toContain("SELECT * FROM applications");
    expect(calls[1]).toContain("FOR UPDATE");
    expect(calls[2]).toBe("ROLLBACK");
    expect(calls.some((sql) => sql.includes("UPDATE applications"))).toBe(false);
    expect(calls.some((sql) => sql.includes("INSERT INTO application_audit_logs"))).toBe(false);

    expect(client.release).toHaveBeenCalled();
  });

  it("commits transaction and inserts audit log for valid transition", async () => {
    const client = createMockClient();
    connectMock.mockResolvedValueOnce(client as never);

    const updated = sampleApplication("UNDER_REVIEW");

    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [sampleApplication("SUBMITTED")] })
      .mockResolvedValueOnce({ rows: [updated] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post("/api/applications/app-123/transition")
      .set(reviewerHeaders)
      .send({ action: "START_REVIEW" });

    expect(response.status).toBe(200);
    expect(response.body.application.status).toBe("UNDER_REVIEW");
    expect(client.query).toHaveBeenCalledWith("COMMIT");
    expect(client.query).not.toHaveBeenCalledWith("ROLLBACK");

    const calls = client.query.mock.calls.map(([sql]) => sql);
    expect(calls[0]).toBe("BEGIN");
    expect(calls[1]).toContain("SELECT * FROM applications");
    expect(calls[1]).toContain("FOR UPDATE");
    expect(calls[2]).toContain("UPDATE applications");
    expect(calls[3]).toContain("INSERT INTO application_audit_logs");
    expect(calls[4]).toBe("COMMIT");

    expect(client.release).toHaveBeenCalled();
  });

  it("rolls back in-order when transition target application is missing", async () => {
    const client = createMockClient();
    connectMock.mockResolvedValueOnce(client as never);

    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post("/api/applications/missing-id/transition")
      .set(reviewerHeaders)
      .send({ action: "START_REVIEW" });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Application not found");

    const calls = client.query.mock.calls.map(([sql]) => sql);
    expect(calls[0]).toBe("BEGIN");
    expect(calls[1]).toContain("SELECT * FROM applications");
    expect(calls[1]).toContain("FOR UPDATE");
    expect(calls[2]).toBe("ROLLBACK");
    expect(calls).not.toContain("COMMIT");

    expect(client.release).toHaveBeenCalled();
  });
});
