import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";

const workerLimit = Math.min(4, Math.max(1, availableParallelism() - 1));
const slots = [];
const pending = [];

function retire(slot, error) {
  const index = slots.indexOf(slot);
  if (index === -1) return;
  slots.splice(index, 1);
  if (slot.job) slot.job.reject(error);
  slot.job = null;
  dispatch();
}

function createSlot() {
  const worker = new Worker(new URL("./passwordWorker.js", import.meta.url));
  const slot = { worker, job: null };
  slots.push(slot);
  worker.unref();
  worker.on("message", ({ matches, error }) => {
    const job = slot.job;
    slot.job = null;
    worker.unref();
    if (job) {
      if (error) job.reject(new Error(error));
      else job.resolve(Boolean(matches));
    }
    dispatch();
  });
  worker.on("error", (error) => retire(slot, error));
  worker.on("exit", (code) => retire(slot, new Error(`Password worker exited (${code})`)));
  return slot;
}

function dispatch() {
  while (pending.length) {
    const slot = slots.find((item) => !item.job) || (slots.length < workerLimit ? createSlot() : null);
    if (!slot) return;
    const job = pending.shift();
    slot.job = job;
    slot.worker.ref();
    try {
      slot.worker.postMessage({ password: job.password, hash: job.hash });
    } catch (error) {
      retire(slot, error);
    }
  }
}

export function verifyPassword(password, hash) {
  return new Promise((resolve, reject) => {
    pending.push({ password, hash, resolve, reject });
    dispatch();
  });
}
