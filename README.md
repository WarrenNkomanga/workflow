# Submission & Approval Workflow App

This project implements Assignment B with a strict backend-enforced workflow, role-based access control, and an audit trail.

## Live Deployment

- Frontend URL (Netlify): `https://workflow-warren.netlify.app`
- Backend URL (Render): `https://workflow-klij.onrender.com`
- Health endpoint: `https://workflow-klij.onrender.com/health`

Reviewer access does not require signup. Use the role switch in the UI:

- Alice (Applicant)
- Bob (Reviewer)

## Stack

- Backend: Node.js, TypeScript, Express, pg, Jest
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Database: PostgreSQL


## Project Structure

- `backend/` API, workflow logic, tests, SQL init script
- `frontend/` React UI for applicant and reviewer flows
- `docker-compose.yml` Postgres + backend orchestration

## Workflow Rules Enforced Server-Side

- Only applicants can create applications.
- Only the owner can edit and submit while status is `DRAFT`.
- Only reviewers can transition from `SUBMITTED` / `UNDER_REVIEW`.
- `REJECT` and `RETURN_FOR_CHANGES` require comment.
- Every transition writes an `application_audit_logs` record.

## Run With Docker (DB + Backend)

From repository root:

```bash
docker compose up --build
```

Backend API becomes available at `http://localhost:5000`.

## Hosted Deployment Steps

1. Create a hosted PostgreSQL database (Neon or equivalent).
2. Run the schema and seed script against the hosted database:

```bash
psql -U <user> -d <database> -h <host> -f backend/sql/001_init.sql
```

3. Deploy backend from `backend/` to Render.
4. Deploy frontend from `frontend/` to Netlify.
5. Set the frontend API base URL env var to the deployed backend URL.
6. Verify the full workflow with both roles.

## Environment Variables

Backend:

- `DATABASE_URL`: Postgres connection string.
- `PORT`: Runtime port provided by host.
- `FRONTEND_ORIGIN`: Deployed frontend origin for CORS.

Frontend:

- `VITE_API_BASE_URL`: Deployed backend base URL (for example `https://your-backend.onrender.com/api`).

## Run Frontend Locally

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on Vite default port (`http://localhost:5173`).

## Local Non-Docker Setup

1. Ensure PostgreSQL is running with:
   - user: `postgres`
   - password: `supersecretpassword`
   - database: `workflow_assessment`
2. Apply schema/seed script:

```bash
psql -U postgres -d workflow_assessment -f backend/sql/001_init.sql
```

3. Run backend:

```bash
cd backend
npm install
npm run dev
```

The backend expects:

- `DATABASE_URL` (if not using local default)
- `PORT` (optional locally)
- `FRONTEND_ORIGIN` (optional locally)

4. Run frontend:

```bash
cd frontend
npm install
npm run dev
```

## Seeded Users

- `alice_applicant` (APPLICANT)
- `bob_reviewer` (REVIEWER)

Frontend role switch injects seeded UUID headers:

- Alice: `a80a1c7f-cb4d-4e87-84eb-4997d4456b3f`
- Bob: `ecb36047-6061-4d85-a5bc-e11d54e08add`

These are passed as mock headers by the frontend role switch:

- `x-user-id`
- `x-user-role`

## Testing

Backend tests:

```bash
cd backend
npm test
```

Includes:

- State-machine unit tests (legal + illegal transitions)
- API integration tests for auth boundaries and transaction safety
- 403 assertions for unauthorized actions

## Assessment Mapping

| Requirement Area | Implemented In |
| --- | --- |
| Workflow state machine + illegal transition blocking | `backend/src/utils/stateMachine.ts`, `backend/src/controllers/applicationController.ts` |
| Server-side authorization on mutations | `backend/src/utils/auth.ts`, `backend/src/controllers/applicationController.ts` |
| Applicant create/edit draft/submit + list | `frontend/src/components/ApplicantDashboard.tsx`, `backend/src/routes/applicationRoutes.ts` |
| Reviewer queue/detail/actions + required comment on reject/return | `frontend/src/components/ReviewerDashboard.tsx`, `backend/src/utils/stateMachine.ts` |
| Audit trail persisted and shown on detail page | `backend/src/controllers/applicationController.ts`, `frontend/src/components/ReviewerDashboard.tsx` |
| Unit + API authorization tests | `backend/tests/stateMachine.test.ts`, `backend/tests/applicationRoutes.integration.test.ts` |
| Reproducible DB schema/seed | `backend/sql/001_init.sql` |
| Run orchestration | `docker-compose.yml`, `backend/Dockerfile` |

## Trade-offs / Next Improvements

- Mock header auth is used for assignment speed; next step is JWT/session auth.
- Reviewer queue filter is client-side; server-side filtering/pagination can be added.
- Frontend tests were not added yet; backend coverage is prioritized for workflow correctness.

## AI Usage

AI tools used:

- GitHub Copilot Chat (GPT-5.3-Codex)

How AI was used:

- Scaffolding project structure and endpoint/controller boilerplate
- Drafting and refining state-machine and integration tests
- Refactoring for clearer error handling and README improvements

What was verified manually:

- Workflow and authorization logic in backend controllers
- Transition and authorization tests passing via `npm test`
- Backend and frontend compilation via `npm run build`
- Runtime behavior of applicant and reviewer flows
