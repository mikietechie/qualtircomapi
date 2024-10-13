import * as express from "express";
import * as logger from "firebase-functions/logger";
import {
  getGptOutput,
  getInputFromRequest,
  getPDFOutput,
  getTextPagesFromPDF,
  IOutout,
} from "../services/slides";

export const slidesController = async (
  req: express.Request,
  res: express.Response
) => {
  /**
   * NOTE: We could have done better error handling and fowarding.
   * however time is limited.
   */
  try {
    const payload = await getInputFromRequest(req);
    const pages = await getTextPagesFromPDF(payload);
    let data: IOutout;
    try {
      data = await getGptOutput(payload.title, pages);
    } catch (error) {
      data = await getPDFOutput(payload.title, pages);
    }
    res.json(data).status(200).end();
  } catch (error) {
    res.json({
      error: "An error occured, please try again, or something else.",
    }).status(400);
    logger.error(error);
  }
};
