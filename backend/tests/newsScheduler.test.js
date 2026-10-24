import assert from "node:assert/strict";
import test from "node:test";
import { initialScheduleRun, localScheduleToIso, nextMonSatRun, runDueNewsSchedules } from "../src/services/newsScheduler.js";

test("scheduled news converts Pakistan local time to UTC", () => {
  assert.equal(localScheduleToIso("2026-10-24", "06:00"), "2026-10-24T01:00:00.000Z");
  assert.equal(initialScheduleRun({ repeat: "once", date: "2026-10-24", time: "06:00" },
    new Date("2026-10-24T00:59:00Z")), "2026-10-24T01:00:00.000Z");
  assert.throws(() => initialScheduleRun({ repeat: "once", date: "2026-10-24", time: "06:00" },
    new Date("2026-10-24T01:01:00Z")), /future/);
});

test("Monday to Saturday schedule skips Sunday and rolls to the next day", () => {
  assert.equal(nextMonSatRun("2026-10-24", "06:00", new Date("2026-10-24T01:01:00Z")),
    "2026-10-26T01:00:00.000Z");
  assert.equal(nextMonSatRun("2026-10-25", "06:00", new Date("2026-10-24T00:00:00Z")),
    "2026-10-26T01:00:00.000Z");
  assert.equal(nextMonSatRun("2026-10-26", "06:00", new Date("2026-10-26T00:59:00Z")),
    "2026-10-26T01:00:00.000Z");
});

test("due scheduled news is saved once and a repeating schedule advances", async () => {
  const records = {
    newsSchedules: new Map([["schedule1", {
      message: "Morning update", recipientIds: [], repeat: "mon-sat", startDate: "2026-10-24",
      time: "06:00", nextRunAt: "2026-10-24T01:00:00.000Z", status: "active", createdBy: "admin@test.com", sentCount: 0
    }]]),
    marketers: new Map([["marketer1", { name: "Ali", email: "ali@test.com" }]]),
    news: new Map()
  };
  const db = {
    collection(name) {
      const entries = records[name];
      const ref = (id) => ({
        id,
        async get() { return { id, ref: this, exists: entries.has(id), data: () => entries.get(id) }; },
        async set(value) { entries.set(id, value); },
        async create(value) { if (entries.has(id)) throw new Error("Already exists"); entries.set(id, value); },
        async update(value) { entries.set(id, { ...entries.get(id), ...value }); }
      });
      return {
        doc: (id) => ref(id),
        async get() { return { docs: [...entries].map(([id, value]) => ({ id, ref: ref(id), data: () => value })) }; },
        where(field, operator, limit) {
          assert.equal(operator, "<=");
          return { limit: (count) => ({ get: async () => ({ docs: [...entries]
            .filter(([, value]) => typeof value[field] === "string" && value[field] <= limit)
            .slice(0, count).map(([id, value]) => ({ id, ref: ref(id), data: () => value })) }) }) };
        }
      };
    },
    runTransaction: (callback) => callback({ get: (ref) => ref.get(), update: (ref, value) => ref.update(value) })
  };
  let pushes = 0;
  const push = async () => { pushes++; return { configured: true, delivered: 1, subscribed: 1 }; };
  const now = new Date("2026-10-24T01:00:10Z");
  assert.equal(await runDueNewsSchedules(db, now, push), 1);
  assert.equal(records.news.size, 1);
  assert.deepEqual([...records.news.values()][0].recipientIds, ["marketer1"]);
  assert.equal(records.newsSchedules.get("schedule1").nextRunAt, "2026-10-26T01:00:00.000Z");
  assert.equal(await runDueNewsSchedules(db, now, push), 0);
  assert.equal(pushes, 1);
});
