import { parentPort } from "node:worker_threads";
import bcrypt from "bcryptjs";

parentPort.on("message", ({ password, hash }) => {
  try {
    parentPort.postMessage({ matches: bcrypt.compareSync(password, hash) });
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
});
