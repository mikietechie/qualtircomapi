import * as express from "express";
import { indexController } from "../controllers/main";


export const mainRouter = express.Router({});

mainRouter.get("/", indexController);
