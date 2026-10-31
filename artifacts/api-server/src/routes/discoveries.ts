import {
  AnalyzeDiscoveryBody,
  AnalyzeDiscoveryResponse,
  DeleteDiscoveryParams,
  GetDiscoveryParams,
  GetDiscoveryResponse,
  GetDiscoverySummaryResponse,
  ListDiscoveriesResponse,
} from "@workspace/api-zod";
import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import {
  deleteDiscovery,
  getDiscovery,
  listDiscoveries,
} from "../lib/discovery-storage";
import {
  analyzeAndSaveDiscovery,
  InvalidDiscoveryInputError,
} from "../lib/discovery-service";
import { GrokAnalysisError } from "../lib/grok-analysis";

const router: IRouter = Router();

function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authorization = req.get("authorization") ?? "";
  const match = /^Bearer ([a-f0-9]{64})$/.exec(authorization);
  if (!match) {
    res.status(401).json({ error: "A valid private browser token is required." });
    return;
  }

  res.locals.ownerToken = match[1];
  next();
}

function toListItem(
  result: Awaited<ReturnType<typeof listDiscoveries>>[number],
) {
  return {
    id: result.id,
    assessmentId: result.assessmentId,
    assessmentTitleAr: result.assessmentTitleAr,
    assessmentTitleEn: result.assessmentTitleEn,
    group: result.group,
    language: result.language,
    summary: result.summary,
    createdAt: result.createdAt,
  };
}

router.use(requireOwner);

router.get("/discoveries/summary", async (_req, res): Promise<void> => {
  const results = await listDiscoveries(res.locals.ownerToken as string);
  res.json(
    GetDiscoverySummaryResponse.parse({
      totalResults: results.length,
      completedAssessmentCount: new Set(
        results.map((result) => result.assessmentId),
      ).size,
      latestCreatedAt: results[0]?.createdAt ?? null,
      recentResults: results.slice(0, 5).map(toListItem),
    }),
  );
});

router.get("/discoveries", async (_req, res): Promise<void> => {
  const results = await listDiscoveries(res.locals.ownerToken as string);
  res.json(ListDiscoveriesResponse.parse(results.map(toListItem)));
});

router.post("/discoveries/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeDiscoveryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Complete every question before requesting your report.",
    });
    return;
  }

  try {
    const result = await analyzeAndSaveDiscovery(
      res.locals.ownerToken as string,
      parsed.data,
    );
    res
      .status(201)
      .json(AnalyzeDiscoveryResponse.parse(result));
  } catch (error) {
    if (error instanceof InvalidDiscoveryInputError) {
      res.status(400).json({
        error:
          parsed.data.language === "ar"
            ? "تحقق من الإجابات وأكمل كل الأسئلة قبل إرسالها."
            : "Check your answers and complete every question before submitting.",
      });
      return;
    }

    if (error instanceof GrokAnalysisError) {
      req.log.error({ err: error }, "Grok report generation failed");
      const message =
        parsed.data.language === "ar"
          ? "تعذر إعداد التقرير الآن. إجاباتك ما زالت محفوظة كمسودة في هذا المتصفح؛ حاول مرة أخرى."
          : "The report could not be prepared right now. Your answers remain saved as a draft in this browser; please try again.";
      res.status(502).json({ error: message });
      return;
    }

    throw error;
  }
});

router.get("/discoveries/:id", async (req, res): Promise<void> => {
  const params = GetDiscoveryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid report ID." });
    return;
  }

  const result = await getDiscovery(
    res.locals.ownerToken as string,
    params.data.id,
  );
  if (!result) {
    res.status(404).json({ error: "Report not found." });
    return;
  }

  res.json(GetDiscoveryResponse.parse(result));
});

router.delete("/discoveries/:id", async (req, res): Promise<void> => {
  const params = DeleteDiscoveryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid report ID." });
    return;
  }

  const deleted = await deleteDiscovery(
    res.locals.ownerToken as string,
    params.data.id,
  );
  if (!deleted) {
    res.status(404).json({ error: "Report not found." });
    return;
  }

  res.sendStatus(204);
});

export default router;
