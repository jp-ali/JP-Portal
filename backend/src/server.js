import { app } from "./app.js";
import { startNewsScheduler } from "./services/newsScheduler.js";

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || !process.env.ADMIN_PASSWORD_HASH) {
  throw new Error("Set SESSION_SECRET and ADMIN_PASSWORD_HASH in backend/.env before starting the API");
}

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`School visit API listening on port ${port}`);
  startNewsScheduler();
});
