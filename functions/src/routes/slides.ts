import * as express from "express";
import { slidesController } from "../controllers/slides";


export const slidesRouter = express.Router({});

slidesRouter.post(
  "/convert",
  slidesController,
);
