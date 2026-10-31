import { Router, type IRouter } from "express";
import {
  GetAssessmentParams,
  GetAssessmentResponse,
  ListAssessmentsResponse,
} from "@workspace/api-zod";
import { assessmentCatalog } from "../data/assessment-catalog";

const router: IRouter = Router();

router.get("/assessments", (_req, res): void => {
  const summaries = assessmentCatalog.map(
    ({ questions: _questions, ...summary }) => summary,
  );
  res.json(ListAssessmentsResponse.parse(summaries));
});

router.get("/assessments/:assessmentId", (req, res): void => {
  const params = GetAssessmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid assessment." });
    return;
  }

  const assessment = assessmentCatalog.find(
    (candidate) => candidate.id === params.data.assessmentId,
  );
  if (!assessment) {
    res.status(404).json({ error: "Assessment not found." });
    return;
  }

  res.json(GetAssessmentResponse.parse(assessment));
});

export default router;
