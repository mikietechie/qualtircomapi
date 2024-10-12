import { Router } from "express";
import { indexController } from "../controllers/main";
import { slidesController } from "../controllers/slides";


const router = Router({});

router.get("/", indexController);
router.use("/api/v1/slides", slidesController);
// router.use("/api/v1/ideas", ideaController);

export default router;
