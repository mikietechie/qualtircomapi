import * as express from "express";


export const indexController = (
  req: express.Request,
  res: express.Response
) => {
  res.status(200).send("<h1>Live you shouldn't be here.</h1>");
};
