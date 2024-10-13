import * as http from "node:http";
import * as express from "express";
import * as cors from "cors";
import * as logger from "firebase-functions/logger";
import router from "./routes";


const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.raw());
app.use(cors({ origin: "*" }));
app.use(router);

if (require.main == module) {
  const server = http.createServer(app);
  const PORT = process.env.PORT || 8010;
  server.listen(PORT, () => {
    logger.info(`Server listening at http://localhost:${PORT}`);
  });
}

export default app;
