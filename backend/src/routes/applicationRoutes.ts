import { Router } from "express";
import {
  createApplication,
  getApplicationById,
  listApplications,
  transitionApplication,
  updateDraftApplication,
} from "../controllers/applicationController";

const applicationRoutes = Router();

applicationRoutes.post("/applications", createApplication);
applicationRoutes.get("/applications", listApplications);
applicationRoutes.get("/applications/:id", getApplicationById);
applicationRoutes.put("/applications/:id", updateDraftApplication);
applicationRoutes.post("/applications/:id/transition", transitionApplication);

export default applicationRoutes;
