import { submitCheckIn, submitCheckOut } from '../services/attendance.service';

export interface QueueItem {
  id: string;
  type: 'checkin' | 'checkout';
  payload: Record<string, unknown>;
  timestamp: string;
  synced: boolean;
  /** FIXPLAN audit: jumlah percobaan gagal — buang setelah MAX_ATTEMPTS */
  attempts?: number;
}

const QUEUE_KEY = 'absensi_offline_queue';
const MAX_ATTEMPTS = 3;

export function getPendingQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueueItem[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function addToQueue(item: Omit<QueueItem, 'id' | 'synced'>): void {
  const queue = getPendingQueue();
  queue.push({ ...item, id: crypto.randomUUID(), synced: false });
  saveQueue(queue);
}

function markSynced(id: string): void {
  saveQueue(
    getPendingQueue()
      .map(item => (item.id === id ? { ...item, synced: true } : item))
      .filter(i => !i.synced),
  );
}

/** Error yang tidak akan berhasil dengan retry — buang itemnya. */
function isPermanentError(errorMsg: string): boolean {
  // 23505 = unique violation (check-in sudah ada; crash sebelum markSynced)
  // selain itu: pesan trigger guard migrasi 013
  return (
    errorMsg.includes('23505') ||
    errorMsg.includes('sudah check-in') ||
    errorMsg.includes('masa depan') ||
    errorMsg.includes('terlalu lama') ||
    errorMsg.includes('bukan hari kerja') ||
    errorMsg.includes('dinonaktifkan')
  );
}

export async function flushQueue(): Promise<number> {
  const pending = getPendingQueue().filter(i => !i.synced);
  let flushed = 0;

  for (const item of pending) {
    try {
      if (item.type === 'checkin') {
        const result = await submitCheckIn(item.payload as unknown as Parameters<typeof submitCheckIn>[0]);
        if (!result.success) throw new Error(result.error);
      } else {
        const p = item.payload as { attendanceId: string; lat: number; lng: number; timestamp: string };
        const result = await submitCheckOut(p.attendanceId, { lat: p.lat, lng: p.lng, timestamp: p.timestamp });
        if (!result.success) throw new Error(result.error);
      }
      markSynced(item.id);
      flushed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (isPermanentError(msg)) {
        markSynced(item.id); // buang — tidak mungkin sukses
        continue;
      }
      // FIXPLAN: retry terbatas — cegah item racun mengulang selamanya
      const attempts = (item.attempts ?? 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        markSynced(item.id);
        continue;
      }
      saveQueue(getPendingQueue().map(i => (i.id === item.id ? { ...i, attempts } : i)));
    }
  }

  return flushed;
}
