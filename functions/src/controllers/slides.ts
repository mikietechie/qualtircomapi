import * as express from "express";
import * as logger from "firebase-functions/logger";
import {
  getGptOutput,
  getInputFromRequest,
  getTextPagesFromPDF,
} from "../services/slides";

export const slidesController = async (
  req: express.Request,
  res: express.Response
) => {
  res.json({body: req.body}).end();
  return;
  /**
   * NOTE: We could have done better error handling and fowarding.
   * however time is limited.
   */
  try {
    const payload = await getInputFromRequest(req);
    res.json({
      "meta": {
        "title": "Bitcoin Summary",
        "headline": "Bitcoin Summary",
      },
      "slides": [
        {
          "pageNumber": 1,
          "title": "Bitcoin: A Peer-to-Peer E",
          "content": "Bitcoin: A Peer-to-Peer Electronic ...",
        },
        {
          "pageNumber": 2,
          "title": "2.",
          "content": "2.   Transactions We define an electronic ...",
        },
        {
          "pageNumber": 3,
          "title": "4.",
          "content": "4.   Proof-of-Work To ...",
        },
        {
          "pageNumber": 4,
          "title": "New transaction broadcast",
          "content": "New transaction broadcasts do not neces....",
        },
      ],
    }).status(200).end();
    return;
    const pages = await getTextPagesFromPDF(payload);
    const data = await getGptOutput(payload.title, pages);
    res.json(data).status(200).end();
  } catch (error) {
    res.json({
      error: "An error occured, please try again, or something else.",
    }).status(400);
    logger.error(error);
  }
};
