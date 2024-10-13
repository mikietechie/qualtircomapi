import * as http from "node:http";
import * as express from "express";
import * as cors from "cors";
import * as logger from "firebase-functions/logger";
import router from "./routes";


const app = express();
app.use(express.json({limit: "6mb"}));
app.use(cors({ origin: "*" }));
app.use(router);

if (require.main == module) {
  const server = http.createServer(app);
  const PORT = process.env.PORT || 8010;
  server.listen(PORT, () => {
    logger.info(`Live :\thttp://localhost:${PORT}`);
  });
}

export default app;
