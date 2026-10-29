import { app } from "./app.js";
import { startNewsScheduler } from "./services/newsScheduler.js";
import { postgresPool } from "./config/postgres.js";

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || !process.env.ADMIN_PASSWORD_HASH) {
  throw new Error("Set SESSION_SECRET and ADMIN_PASSWORD_HASH in backend/.env before starting the API");
}

const port = Number(process.env.PORT || 3001);
await postgresPool().query("SELECT 1 FROM portal_documents LIMIT 1");
app.listen(port, () => {
  console.log(`School visit API listening on port ${port}`);
  startNewsScheduler();
});
