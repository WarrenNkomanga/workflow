import type { Request, Response } from "express";
import { pool, query } from "../utils/db";
import {
  TransitionValidationError,
  validateTransition,
} from "../utils/stateMachine";
import type {
  ApplicationStatus,
  TransitionAction,
  UserRole,
} from "../types/domain";

type ApplicationRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  amount: string;
  status: ApplicationStatus;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

type AuditLogRow = {
  id: string;
  application_id: string;
  actor_id: string;
  from_status: ApplicationStatus;
  to_status: ApplicationStatus;
  comment: string | null;
  created_at: string;
};

const assertApplicant = (role: UserRole): void => {
  if (role !== "APPLICANT") {
    throw new TransitionValidationError("Only applicants can create applications.", 403);
  }
};

const canViewApplication = (role: UserRole, ownerId: string, viewerId: string): boolean => {
  if (role === "APPLICANT") {
    return ownerId === viewerId;
  }

  return true;
};

const canReviewerSeeStatus = (role: UserRole, status: ApplicationStatus): boolean => {
  if (role !== "REVIEWER") {
    return true;
  }

  return status !== "DRAFT";
};

export const createApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        error: "Unauthenticated request",
        detail: "Authentication context is required before accessing this endpoint.",
      });
      return;
    }

    assertApplicant(user.role);

    const { title, category, description, amount } = req.body as {
      title?: string;
      category?: string;
      description?: string;
      amount?: number;
    };

    if (!title || !category || typeof amount !== "number" || amount <= 0) {
      res.status(400).json({
        error: "Invalid payload",
        detail: "title, category and a positive numeric amount are required.",
      });
      return;
    }

    const result = await query<ApplicationRow>(
      `INSERT INTO applications (title, category, description, amount, status, owner_id)
       VALUES ($1, $2, $3, $4, 'DRAFT', $5)
       RETURNING *`,
      [title.trim(), category.trim(), description?.trim() || null, amount, user.id],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof TransitionValidationError) {
      res.status(error.statusCode).json({
        error: "Authorization error",
        detail: error.message,
      });
      return;
    }

    res.status(500).json({
      error: "Failed to create application",
      detail: "An unexpected error occurred while creating the application.",
    });
  }
};

export const listApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        error: "Unauthenticated request",
        detail: "Authentication context is required before accessing this endpoint.",
      });
      return;
    }

    if (user.role === "APPLICANT") {
      const result = await query<ApplicationRow>(
        `SELECT * FROM applications
         WHERE owner_id = $1
         ORDER BY created_at DESC`,
        [user.id],
      );
      res.json(result.rows);
      return;
    }

    const result = await query<ApplicationRow>(
      `SELECT * FROM applications
       WHERE status <> 'DRAFT'
       ORDER BY created_at DESC`,
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({
      error: "Failed to fetch applications",
      detail: "An unexpected error occurred while retrieving applications.",
    });
  }
};

export const getApplicationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        error: "Unauthenticated request",
        detail: "Authentication context is required before accessing this endpoint.",
      });
      return;
    }

    const { id } = req.params;
    const appResult = await query<ApplicationRow>(
      "SELECT * FROM applications WHERE id = $1",
      [id],
    );

    const application = appResult.rows[0];
    if (!application) {
      res.status(404).json({
        error: "Application not found",
        detail: "No application exists for the provided id.",
      });
      return;
    }

    if (!canViewApplication(user.role, application.owner_id, user.id)) {
      res.status(403).json({
        error: "Forbidden",
        detail: "Applicants can only view their own applications.",
      });
      return;
    }

    if (!canReviewerSeeStatus(user.role, application.status)) {
      res.status(403).json({
        error: "Forbidden",
        detail: "Reviewers cannot access draft applications.",
      });
      return;
    }

    const logsResult = await query<AuditLogRow>(
      `SELECT * FROM application_audit_logs
       WHERE application_id = $1
       ORDER BY created_at ASC`,
      [id],
    );

    res.json({
      ...application,
      audit_logs: logsResult.rows,
    });
  } catch {
    res.status(500).json({
      error: "Failed to fetch application details",
      detail: "An unexpected error occurred while retrieving application details.",
    });
  }
};

export const updateDraftApplication = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        error: "Unauthenticated request",
        detail: "Authentication context is required before accessing this endpoint.",
      });
      return;
    }

    if (user.role !== "APPLICANT") {
      res.status(403).json({
        error: "Forbidden",
        detail: "Only applicants can edit draft applications.",
      });
      return;
    }

    const { id } = req.params;
    const { title, category, description, amount } = req.body as {
      title?: string;
      category?: string;
      description?: string;
      amount?: number;
    };

    if (!title || !category || typeof amount !== "number" || amount <= 0) {
      res.status(400).json({
        error: "Invalid payload",
        detail: "title, category and a positive numeric amount are required.",
      });
      return;
    }

    const currentResult = await query<ApplicationRow>(
      "SELECT * FROM applications WHERE id = $1",
      [id],
    );

    const current = currentResult.rows[0];
    if (!current) {
      res.status(404).json({
        error: "Application not found",
        detail: "No application exists for the provided id.",
      });
      return;
    }

    if (current.owner_id !== user.id) {
      res.status(403).json({
        error: "Forbidden",
        detail: "Applicants can only edit their own applications.",
      });
      return;
    }

    if (current.status !== "DRAFT") {
      res.status(403).json({
        error: "Forbidden",
        detail: "Applications can only be edited while in DRAFT status.",
      });
      return;
    }

    const result = await query<ApplicationRow>(
      `UPDATE applications
       SET title = $1,
           category = $2,
           description = $3,
           amount = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [title.trim(), category.trim(), description?.trim() || null, amount, id],
    );

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({
      error: "Failed to update draft application",
      detail: "An unexpected error occurred while updating the draft application.",
    });
  }
};

export const transitionApplication = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const client = await pool.connect();

  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        error: "Unauthenticated request",
        detail: "Authentication context is required before accessing this endpoint.",
      });
      return;
    }

    const { id } = req.params;
    const { action, comment } = req.body as {
      action?: TransitionAction;
      comment?: string;
    };

    if (!action) {
      res.status(400).json({
        error: "Invalid payload",
        detail: "Transition action is required.",
      });
      return;
    }

    await client.query("BEGIN");

    const appResult = await client.query<ApplicationRow>(
      "SELECT * FROM applications WHERE id = $1 FOR UPDATE",
      [id],
    );

    const application = appResult.rows[0];
    if (!application) {
      await client.query("ROLLBACK");
      res.status(404).json({
        error: "Application not found",
        detail: "No application exists for the provided id.",
      });
      return;
    }

    if (user.role === "APPLICANT" && application.owner_id !== user.id) {
      await client.query("ROLLBACK");
      res.status(403).json({
        error: "Forbidden",
        detail: "Applicants can only transition their own applications.",
      });
      return;
    }

    if (!canReviewerSeeStatus(user.role, application.status)) {
      await client.query("ROLLBACK");
      res.status(403).json({
        error: "Forbidden",
        detail: "Reviewers cannot transition draft applications.",
      });
      return;
    }

    const nextStatus = validateTransition(
      application.status,
      action,
      user.role,
      comment,
    );

    const updateResult = await client.query<ApplicationRow>(
      `UPDATE applications
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [nextStatus, id],
    );

    await client.query(
      `INSERT INTO application_audit_logs (
         application_id,
         actor_id,
         from_status,
         to_status,
         comment
       ) VALUES ($1, $2, $3, $4, $5)`,
      [
        id,
        user.id,
        application.status,
        nextStatus,
        comment?.trim() || null,
      ],
    );

    await client.query("COMMIT");

    res.json({
      message: "Transition completed",
      application: updateResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error instanceof TransitionValidationError) {
      const status = error.statusCode === 403 ? 403 : 400;
      res.status(status).json({
        error: "Transition validation failed",
        detail: error.message,
      });
      return;
    }

    res.status(500).json({
      error: "Failed to transition application",
      detail: "An unexpected error occurred while transitioning application status.",
    });
  } finally {
    client.release();
  }
};
