// Tiny IndexedDB wrapper to persist generated videos across navigation and
// browser sessions (until the user clears them / clears site data).

const DB_NAME = "vg-store";
const STORE = "videos";
const VERSION = 1;

export interface StoredVideo {
  id: string;
  blob: Blob;
  themeLabel: string;
  aspectLabel: string;
  musicLabel: string;
  duration: number;
  elapsedMs: number;
  createdAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVideo(v: StoredVideo): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(v);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getAllVideos(): Promise<StoredVideo[]> {
  const db = await openDB();
  const items = await new Promise<StoredVideo[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as StoredVideo[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function deleteVideo(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function clearVideos(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function estimateUsage(): Promise<string> {
  try {
    if (navigator.storage?.estimate) {
      const { usage } = await navigator.storage.estimate();
      if (usage != null) {
        const mb = usage / (1024 * 1024);
        return mb > 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(0)} MB`;
      }
    }
  } catch { /* */ }
  return "";
}
