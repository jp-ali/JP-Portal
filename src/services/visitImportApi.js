import { request } from "./authApi.js";

export async function importMarketerVisits(marketerId, rows) {
  const path = `/visits/import/${encodeURIComponent(marketerId)}`;
  const options = { method: "POST", body: JSON.stringify({ rows }), timeoutMs: 60000 };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await request(path, options);
    } catch (error) {
      const temporaryFailure = /^(?:Visit service error \((?:500|502|503|504)\)|Cannot reach the visit service)/.test(error.message || "");
      if (!temporaryFailure) throw error;
      if (attempt === 2) throw new Error("Import service is temporarily unavailable. Please retry; visits already saved will be skipped.");
      // Import IDs are deterministic, so a request that succeeded before its
      // response was lost is safely recognized as a duplicate on retry.
      await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 1000 : 3000));
    }
  }
}
