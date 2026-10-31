import { Router, type IRouter } from "express";
import assessmentsRouter from "./assessments";
import discoveriesRouter from "./discoveries";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(assessmentsRouter);
router.use(discoveriesRouter);

export default router;
