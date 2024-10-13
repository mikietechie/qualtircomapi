import * as express from "express";
import * as multer from "multer";
import { slidesController } from "../controllers/slides";

const multerUpload = multer({ storage: multer.memoryStorage() });


// eslint-disable-next-line new-cap
export const slidesRouter = express.Router({});

slidesRouter.post(
  "/convert",
  multerUpload.single("document"),
  slidesController,
);
