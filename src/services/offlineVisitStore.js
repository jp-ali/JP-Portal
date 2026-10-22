const DATABASE = "jp-portal-offline-visits";
const STORE = "drafts";

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error("Offline storage is unavailable in this browser.")); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open offline storage."));
  });
}

async function run(mode, action) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      let result;
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error || new Error("Could not save the offline visit."));
      transaction.onerror = () => reject(transaction.error || new Error("Offline storage failed."));
      transaction.oncomplete = () => resolve(result);
    });
  } finally { database.close(); }
}

export const listOfflineVisits = async () => (await run("readonly", (store) => store.getAll())).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
export const saveOfflineVisit = async (draft) => {
  const id = `offline-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  const record = { ...draft, id, savedAt: new Date().toISOString() };
  await run("readwrite", (store) => store.put(record));
  return record;
};
export const removeOfflineVisit = (id) => run("readwrite", (store) => store.delete(id));
