import * as express from "express";
import {slidesController} from "../controllers/slides";


// eslint-disable-next-line new-cap
export const slidesRouter = express.Router({});

slidesRouter.post("/convert", slidesController);
