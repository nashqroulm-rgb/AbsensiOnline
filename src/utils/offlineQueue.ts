import { submitCheckIn, submitCheckOut } from '../services/attendance.service';

export interface QueueItem {
  id: string;
  type: 'checkin' | 'checkout';
  payload: Record<string, unknown>;
  timestamp: string;
  synced: boolean;
}

const QUEUE_KEY = 'absensi_offline_queue';

export function getPendingQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToQueue(item: Omit<QueueItem, 'id' | 'synced'>): void {
  const queue = getPendingQueue();
  queue.push({ ...item, id: crypto.randomUUID(), synced: false });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function markSynced(id: string): void {
  const queue = getPendingQueue()
    .map(item => (item.id === id ? { ...item, synced: true } : item))
    .filter(i => !i.synced);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function flushQueue(): Promise<number> {
  const pending = getPendingQueue().filter(i => !i.synced);
  let flushed = 0;

  for (const item of pending) {
    try {
      if (item.type === 'checkin') {
        const result = await submitCheckIn(item.payload as unknown as Parameters<typeof submitCheckIn>[0]);
        if (result.success) {
          markSynced(item.id);
          flushed++;
        }
      } else {
        const p = item.payload as { attendanceId: string; lat: number; lng: number; timestamp: string };
        const result = await submitCheckOut(p.attendanceId, {
          lat: p.lat,
          lng: p.lng,
          timestamp: p.timestamp,
        });
        if (result.success) {
          markSynced(item.id);
          flushed++;
        }
      }
    } catch {
      // biarkan di queue untuk retry berikutnya
    }
  }

  return flushed;
}
