import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../types/domain";

const validRoles: UserRole[] = ["APPLICANT", "REVIEWER"];

export const mockAuth = (req: Request, res: Response, next: NextFunction): void => {
  const userId = req.header("x-user-id");
  const userRole = req.header("x-user-role") as UserRole | undefined;

  if (!userId || !userRole) {
    res.status(401).json({
      error: "Missing authentication headers",
      detail: "Both x-user-id and x-user-role headers are required.",
    });
    return;
  }

  if (!validRoles.includes(userRole)) {
    res.status(403).json({
      error: "Invalid role",
      detail: `Unsupported role '${userRole}'.`,
    });
    return;
  }

  req.user = {
    id: userId,
    role: userRole,
  };

  next();
};
