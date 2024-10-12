import { Router } from "express";
import { mainRouter } from "./main";
import { slidesRouter } from "./slides";


const router = Router({});

router.get("/", mainRouter);
router.use("/api/v1/slides", slidesRouter);
// router.use("/api/v1/ideas", ideaController);

export default router;
