# DESIGN.md — Keputusan Arsitektur MVP

Dokumen keputusan arsitektur untuk migrasi mock → Supabase.
MVP scope: aplikasi siap dipakai perusahaan/startup secara nyata.

---

## 1. Arsitektur Umum: Mock → Supabase

### Sebelum (Mock)

```
Component → useAppStore() → localStorage (readAppState/loadAppState)
Component → useAppStoreActions() → dispatch → reducer → localStorage persist
Service  → readAppState() + dispatchAppAction() (external dispatch)
Auth     → useAuthState() → localStorage (token + user)
```

### Sesudah (Supabase)

```
Component → useAppStore() → Supabase queries (cache di state)
Service  → supabase.from('table') → Supabase API
Auth     → supabase.auth → Supabase Auth (JWT, session management)
```

### Keputusan: Dual Access Pattern → Single Pattern

**Decision:** Konsolidasikan ke **service layer** sebagai satu-satunya jalur write.

**Rationale:**
- Dual pattern (service + direct store) = race condition risk
- Service layer sudah ada semua method-nya
- Components cukup panggil service, service handle Supabase + update store
- Store tetap dipakai sebagai local cache (read), tapi write selalu via service

**Implementation:**
- `appStore.tsx` dihapus sebagai write path
- Components hanya `useAppStore()` untuk **read** dari local cache
- Semua write via `useService()` → service method → Supabase → update local cache
- Local cache tetap di localStorage sebagai offline fallback

---

## 2. Supabase Client Setup

### File Baru: `src/config/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Supabase Client Options

```typescript
{
  auth: {
    autoRefreshToken: true,
    persistSession: true,    // default — gunakan localStorage
    detectSessionInUrl: true, // untuk OAuth redirect (opsional)
  },
  db: {
    schema: 'public',
  },
}
```

---

## 3. Auth Architecture

### Auth Flow Baru

```
Login Form (no_hp + PIN)
  → supabase.auth.signInWithOtp({ phone: no_hp })
  → User masukkan OTP
  → supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  → Session tersimpan (access_token + refresh_token)
  → Query users WHERE no_hp = input
  → Set user di AuthContext
  → Redirect
```

**Alternatif (MVP tanpa SMS cost):**

```
Login Form (no_hp + PIN)
  → Query users WHERE no_hp = input AND status = 'aktif'
  → Jika PIN = '1234' (hardcoded, dihapus di post-MVP)
  → supabase.auth.signInWithPassword({ email: `${no_hp}@absensi.local`, password: hashedPin })
  → Session tersimpan
  → Set user di AuthContext
  → Redirect
```

**Decision:** Opsi Password-based untuk MVP (gratis). Post-MVP migrasi ke Phone OTP.

**Rationale:**
- SMS cost tidak terduga untuk MVP
- Password-based sudah cukup aman dengan Supabase RLS
- PIN tetap hardcoded di backend tapi di-hash via Supabase Auth
- User tidak perlu tahu "email" mereka — cukup no_hp

### AuthContext.tsx Perubahan

```typescript
// AuthState sekarang ambil dari Supabase session
const [session, setSession] = useState<Session | null>(null);

useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
  });

  return () => subscription.unsubscribe();
}, []);
```

### Token Management

- **Tidak perlu manual** — Supabase SDK handle auto-refresh
- `localStorage` key: `sb-<project-ref>-auth-token` (otomatis oleh Supabase)
- Hapus manual keys lama: `absensi_token`, `absensi_user`

---

## 4. State Management Architecture

### Sebelum: localStorage persist

```
loadAppState() → parse JSON → initial state
persistState(state) → stringify → localStorage
```

### Sesudah: Supabase + Local Cache Hybrid

```
loadAppState() → parse JSON dari localStorage → initial state (instant)
supabase queries → update state → persistState(state)
```

**Rationale:**
- User langsung lihat data lama (cached) → lebih cepat
- Background fetch dari Supabase → update state → re-render
- Offline? Tetap bisa baca dari cache

### File Baru: `src/hooks/useSupabaseQuery.ts`

```typescript
// Generic hook: fetch dari Supabase, cache di state
export function useSupabaseQuery<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetcher()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, deps);

  return { data, loading, error };
}
```

---

## 5. Error Handling Pattern

### Sebelum: Silent failure

```typescript
// Service methods return empty array on error
export async function getWorkers(): Promise<User[]> {
  return readAppState().workers; // never fails, never throws
}
```

### Sesudah: Structured error handling

```typescript
// Service methods return ServiceResult<T>
export async function getWorkers(): Promise<ServiceResult<User[]>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .neq('role', 'super_admin');

    if (error) {
      return { success: false, error: error.message, code: error.code };
    }

    return { success: true, data: data as User[] };
  } catch (e) {
    return { success: false, error: 'Network error', code: 'NETWORK_ERROR' };
  }
}
```

### Global Error Boundary

**File Baru:** `src/components/ErrorBoundary.tsx`

```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

**Error Fallback UI:**
- Tampilkan pesan error yang user-friendly
- Tombol "Coba lagi" → reload page
- Tombol "Hubungi admin" → display error code

### Per-Component Error Handling

```typescript
// Pattern untuk semua async operations
const handleAction = async () => {
  setLoading(true);
  setError(null);

  const result = await someService();
  if (!result.success) {
    setError(result.error);
    setLoading(false);
    return;
  }

  // success path
  setData(result.data);
  setLoading(false);
};
```

---

## 6. Offline Sync Queue

### Decision: Simple localStorage queue (MVP)

**Rationale:**
- Full offline sync (CRUD all tables) terlalu kompleks untuk MVP
- Yang paling penting: **check-in/out saat offline**
- Queue hanya untuk attendance actions (checkin/checkout)

### Implementation

**File Baru:** `src/utils/offlineQueue.ts`

```typescript
interface QueueItem {
  id: string;
  type: 'checkin' | 'checkout';
  payload: any;
  timestamp: string;
  synced: boolean;
}

const QUEUE_KEY = 'absensi_offline_queue';

export function getPendingQueue(): QueueItem[] {
  const raw = localStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addToQueue(item: Omit<QueueItem, 'id' | 'synced'>) {
  const queue = getPendingQueue();
  queue.push({ ...item, id: crypto.randomUUID(), synced: false });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function markSynced(id: string) {
  const queue = getPendingQueue().map(item =>
    item.id === id ? { ...item, synced: true } : item
  );
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter(i => !i.synced)));
}

export function flushQueue() {
  const pending = getPendingQueue().filter(i => !i.synced);
  return Promise.all(pending.map(async (item) => {
    try {
      if (item.type === 'checkin') {
        await submitCheckIn(item.payload);
      } else {
        await submitCheckOut(item.payload.attendanceId, item.payload);
      }
      markSynced(item.id);
    } catch {
      // biarkan di queue untuk retry
    }
  }));
}
```

### Flush Trigger

```typescript
// Di HomeTab.tsx atau App level
useEffect(() => {
  const handleOnline = () => {
    if (navigator.onLine) {
      flushQueue();
    }
  };
  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}, []);
```

---

## 7. File/Folder Structure Changes

### Struktur Baru

```
src/
├── config/
│   ├── env.ts              # Dihapus atau update
│   ├── supabase.ts         # BARU: Supabase client init
│   └── cloudinary.ts       # BARU: Cloudinary config (cloud name, preset)
├── context/
│   └── AuthContext.tsx      # UPDATE: Supabase Auth
├── hooks/
│   ├── useAuth.ts          # UPDATE: Supabase Auth
│   └── useSupabaseQuery.ts # BARU: generic fetch hook
├── services/
│   ├── attendance.service.ts  # UPDATE: Supabase queries
│   ├── workers.service.ts     # UPDATE: Supabase queries
│   ├── shifts.service.ts      # UPDATE: Supabase queries
│   ├── zones.service.ts       # UPDATE: Supabase queries
│   └── reports.service.ts     # UPDATE: Supabase queries + RPC
├── store/
│   └── appStore.tsx           # UPDATE: remove write actions, keep read cache
├── utils/
│   ├── cn.ts                 # EXISTING
│   └── offlineQueue.ts       # BARU: offline sync queue
├── components/
│   ├── ErrorBoundary.tsx      # BARU: global error boundary
│   ├── Login.tsx              # UPDATE: remove demo credentials
│   ├── admin/
│   │   ├── Dashboard.tsx      # UPDATE: dynamic data
│   │   ├── WorkersPage.tsx    # UPDATE: service calls + validation
│   │   ├── ShiftsPage.tsx     # UPDATE: service calls + validation
│   │   ├── ZonesPage.tsx      # UPDATE: service calls + validation
│   │   ├── AttendancePage.tsx # UPDATE: service calls
│   │   └── ReportsPage.tsx    # UPDATE: dynamic data
│   └── pwa/
│       ├── HomeTab.tsx        # UPDATE: Supabase + offline queue
│       ├── HistoryTab.tsx     # UPDATE: Supabase queries
│       └── ProfileTab.tsx     # UPDATE: dynamic stats
├── data/
│   └── mockData.ts            # Dihapus atau keep sebagai seed data reference
└── types/
    └── index.ts               # UPDATE: ID type → string (UUID)
```

### File yang dihapus (MVP)

- `src/config/env.ts` — `apiBaseUrl` tidak dipakai, ganti supabase.ts
- `src/data/mockData.ts` — tidak dipakai setelah migration (tapi simpan sebagai referensi seed data)

### File yang ditambah

- `src/config/supabase.ts`
- `src/config/cloudinary.ts`
- `src/hooks/useSupabaseQuery.ts`
- `src/utils/offlineQueue.ts`
- `src/components/ErrorBoundary.tsx`

---

## 8. Dependency Changes

### Ditambah

```bash
npm install @supabase/supabase-js browser-image-compression
```

- `@supabase/supabase-js` — Supabase client (auth, database, realtime)
- `browser-image-compression` — kompresi foto di browser sebelum upload Cloudinary

### Dihapus (MVP)

```bash
# Belum dihapus, tapi tidak dipakai — evaluasi post-MVP
npm uninstall leaflet @types/leaflet
```

### Tetap

Semua dependency lain tetap.

---

## 9. Build & Deploy Configuration

### Vercel (Frontend)

```json
// vercel.json (opsional)
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### Environment Variables di Vercel

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_CLOUDINARY_CLOUD_NAME=xxx
VITE_CLOUDINARY_UPLOAD_PRESET=xxx
VITE_APP_NAME=AbsensiOnline
```

### Supabase (Backend)

1. Buat project di supabase.com
2. Run SQL migrations (schema dari SPEC.md)
3. Enable RLS
4. Create user accounts via SQL seed
5. Deploy Edge Functions (jika perlu reports RPC)

### Cloudinary (File Upload)

1. Buat account di cloudinary.com
2. Catat **Cloud Name** dari dashboard
3. Buat **Upload Preset** (Settings → Upload → Add upload preset):
   - Signing mode: **Unsigned**
   - Folder: `absensi` (opsional, bisa di-set per request)
4. Catat nama preset → masukkan ke `VITE_CLOUDINARY_UPLOAD_PRESET`

---

## 10. Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth method | Password-based (email mapped) | Gratis untuk MVP, upgrade ke OTP post-MVP |
| State pattern | Service-only write, store for read cache | Eliminasi race condition |
| Offline sync | localStorage queue for check-in/out | MVP scope, flush saat online |
| Error handling | ServiceResult<T> + ErrorBoundary | Structured, tidak silent failure |
| Database IDs | UUID (Supabase default) | Standard, compatible dengan auth.uid() |
| Reports | SQL RPC functions | Efisien untuk aggregation |
| Realtime | Supabase Realtime on attendances | Dashboard auto-update |
| Hardcoded data | Replace with live queries | Real data dari database |
| Demo credentials | Remove from Login UI | Production ready |
| File uploads | Cloudinary unsigned upload + browser-image-compression | Gratis, kompresi otomatis, CDN global |
