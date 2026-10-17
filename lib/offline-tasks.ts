import type { Tag, Task, TaskInput, UserProfile } from "@/lib/supabase";

const DATABASE_NAME = "tsukurist-offline";
const DATABASE_VERSION = 1;
const SNAPSHOTS_STORE = "snapshots";
const CHANGES_STORE = "changes";

export type OfflineSnapshot = {
  userId: string;
  tasks: Task[];
  tags: Tag[];
  profile: UserProfile | null;
  savedAt: string;
};

export type OfflineTaskChange = {
  userId: string;
  taskId: string;
  action: "create" | "update" | "delete";
  values?: TaskInput;
  tagIds?: string[];
  createdAt: string;
};

type StoredChange = OfflineTaskChange & { key: string };

export function applyOfflineChanges(tasks: Task[], changes: OfflineTaskChange[]): Task[] {
  const result = new Map(tasks.map(task => [task.id, task]));
  for (const change of changes) {
    if (change.action === "delete") {
      result.delete(change.taskId);
      continue;
    }
    if (!change.values) continue;

    const existing = result.get(change.taskId);
    const values = change.values;
    result.set(change.taskId, {
      id: change.taskId,
      user_id: change.userId,
      title: values.title,
      assignee_name: values.assignee_name,
      contact: values.contact ?? undefined,
      ordered_at: values.ordered_at ?? undefined,
      deadline: values.deadline ?? undefined,
      price: values.price ?? undefined,
      currency: values.currency,
      status: values.status,
      submission_date: values.submission_date ?? undefined,
      notes: values.notes ?? undefined,
      created_at: existing?.created_at ?? change.createdAt,
      updated_at: change.createdAt,
      images: existing?.images ?? [],
      tag_ids: change.tagIds ?? existing?.tag_ids ?? [],
    });
  }
  return Array.from(result.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SNAPSHOTS_STORE)) {
        database.createObjectStore(SNAPSHOTS_STORE, { keyPath: "userId" });
      }
      if (!database.objectStoreNames.contains(CHANGES_STORE)) {
        database.createObjectStore(CHANGES_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("ローカルデータを開けませんでした"));
    request.onblocked = () => reject(new Error("別のタブを閉じてから再度お試しください"));
  });
}

function changeKey(userId: string, taskId: string) {
  return `${userId}:${taskId}`;
}

export async function readOfflineSnapshot(userId: string): Promise<OfflineSnapshot | null> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(SNAPSHOTS_STORE, "readonly")
        .objectStore(SNAPSHOTS_STORE).get(userId);
      request.onsuccess = () => resolve((request.result as OfflineSnapshot | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("ローカルデータを読み込めませんでした"));
    });
  } finally {
    database.close();
  }
}

export async function saveOfflineSnapshot(snapshot: OfflineSnapshot): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(SNAPSHOTS_STORE, "readwrite");
      transaction.objectStore(SNAPSHOTS_STORE).put(snapshot);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("ローカルデータを保存できませんでした"));
      transaction.onabort = () => reject(transaction.error ?? new Error("ローカルデータの保存を中止しました"));
    });
  } finally {
    database.close();
  }
}

export async function saveOfflineChange(
  snapshot: OfflineSnapshot,
  change: OfflineTaskChange,
): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([SNAPSHOTS_STORE, CHANGES_STORE], "readwrite");
      const changes = transaction.objectStore(CHANGES_STORE);
      const key = changeKey(change.userId, change.taskId);
      const request = changes.get(key);
      request.onsuccess = () => {
        const previous = request.result as StoredChange | undefined;
        if (change.action === "delete" && previous?.action === "create") {
          changes.delete(key);
        } else {
          changes.put({
            ...change,
            action: previous?.action === "create" && change.action === "update" ? "create" : change.action,
            key,
          } satisfies StoredChange);
        }
        transaction.objectStore(SNAPSHOTS_STORE).put(snapshot);
      };
      request.onerror = () => transaction.abort();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("オフライン変更を保存できませんでした"));
      transaction.onabort = () => reject(transaction.error ?? new Error("オフライン変更の保存を中止しました"));
    });
  } finally {
    database.close();
  }
}

export async function listOfflineChanges(userId: string): Promise<OfflineTaskChange[]> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(CHANGES_STORE, "readonly")
        .objectStore(CHANGES_STORE).getAll();
      request.onsuccess = () => {
        const changes = (request.result as StoredChange[]).filter(change => change.userId === userId);
        changes.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        resolve(changes);
      };
      request.onerror = () => reject(request.error ?? new Error("同期待ちの変更を読み込めませんでした"));
    });
  } finally {
    database.close();
  }
}

export async function acknowledgeOfflineChange(
  userId: string,
  taskId: string,
  syncedChangeTime: string,
): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(CHANGES_STORE, "readwrite");
      const store = transaction.objectStore(CHANGES_STORE);
      const key = changeKey(userId, taskId);
      const request = store.get(key);
      request.onsuccess = () => {
        const queued = request.result as StoredChange | undefined;
        if (queued?.createdAt === syncedChangeTime) store.delete(key);
      };
      request.onerror = () => transaction.abort();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("同期状態を更新できませんでした"));
      transaction.onabort = () => reject(transaction.error ?? new Error("同期状態の更新を中止しました"));
    });
  } finally {
    database.close();
  }
}

export async function clearOfflineUserData(userId: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([SNAPSHOTS_STORE, CHANGES_STORE], "readwrite");
      transaction.objectStore(SNAPSHOTS_STORE).delete(userId);
      const changes = transaction.objectStore(CHANGES_STORE);
      const request = changes.getAll();
      request.onsuccess = () => {
        (request.result as StoredChange[])
          .filter(change => change.userId === userId)
          .forEach(change => changes.delete(change.key));
      };
      request.onerror = () => transaction.abort();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("オフラインデータを削除できませんでした"));
      transaction.onabort = () => reject(transaction.error ?? new Error("オフラインデータの削除を中止しました"));
    });
  } finally {
    database.close();
  }
}

export function isNetworkUnavailable(error?: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (error instanceof TypeError) return true;

  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "";
  return /failed to fetch|network|load failed|connection|offline|fetch failed/i.test(message);
}
