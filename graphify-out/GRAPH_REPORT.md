# Graph Report - C:\Users\K4G3\Documents\Github\AbsensiOnline  (2026-06-04)

## Corpus Check
- 33 files · ~20,763 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 121 nodes · 126 edges · 27 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]

## God Nodes (most connected - your core abstractions)
1. `readAppState()` - 12 edges
2. `submitCheckIn()` - 5 edges
3. `submitCheckOut()` - 5 edges
4. `handleCheckout()` - 4 edges
5. `getShiftById()` - 4 edges
6. `deriveStatus()` - 4 edges
7. `formatTime()` - 3 edges
8. `handleCheckin()` - 3 edges
9. `useAuth()` - 3 edges
10. `generateHistory()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `getShifts()` --calls--> `readAppState()`  [INFERRED]
  C:\Users\K4G3\Documents\Github\AbsensiOnline\src\services\shifts.service.ts → C:\Users\K4G3\Documents\Github\AbsensiOnline\src\store\appStore.tsx
- `getWorkers()` --calls--> `readAppState()`  [INFERRED]
  C:\Users\K4G3\Documents\Github\AbsensiOnline\src\services\workers.service.ts → C:\Users\K4G3\Documents\Github\AbsensiOnline\src\store\appStore.tsx
- `getWorkerById()` --calls--> `readAppState()`  [INFERRED]
  C:\Users\K4G3\Documents\Github\AbsensiOnline\src\services\workers.service.ts → C:\Users\K4G3\Documents\Github\AbsensiOnline\src\store\appStore.tsx
- `getZones()` --calls--> `readAppState()`  [INFERRED]
  C:\Users\K4G3\Documents\Github\AbsensiOnline\src\services\zones.service.ts → C:\Users\K4G3\Documents\Github\AbsensiOnline\src\store\appStore.tsx
- `getZoneById()` --calls--> `readAppState()`  [INFERRED]
  C:\Users\K4G3\Documents\Github\AbsensiOnline\src\services\zones.service.ts → C:\Users\K4G3\Documents\Github\AbsensiOnline\src\store\appStore.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.19
Nodes (6): blockCheckIn(), formatTime(), handleCheckin(), handleCheckout(), requestGPS(), resolvePosition()

### Community 1 - "Community 1"
Cohesion: 0.18
Nodes (5): AuthProvider(), useAuth(), HistoryTab(), ProtectedRoute(), useAuthState()

### Community 2 - "Community 2"
Cohesion: 0.29
Nodes (10): dispatchAppAction(), notifyAttendanceUpdated(), readAppState(), attendanceToHistory(), getAttendances(), getHistory(), getTodayAttendance(), submitCheckIn() (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.25
Nodes (7): buildAttendanceFromCheckIn(), deriveStatus(), legacyToAttendance(), loadAppState(), migrateLegacyAttendances(), useAppStore(), useAppStoreActions()

### Community 4 - "Community 4"
Cohesion: 0.2
Nodes (3): getShifts(), updateShift(), handleSaveShift()

### Community 5 - "Community 5"
Cohesion: 0.2
Nodes (4): getZoneById(), getZones(), updateZone(), handleSaveZone()

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (4): getWorkerById(), getWorkers(), updateWorker(), handleSaveWorker()

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (4): getStatusLabelAsync(), generateHistory(), getShiftById(), getStatusLabel()

### Community 8 - "Community 8"
Cohesion: 0.5
Nodes (2): getMonthlyReport(), getReportSummary()

### Community 9 - "Community 9"
Cohesion: 0.5
Nodes (0): 

### Community 10 - "Community 10"
Cohesion: 0.67
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 0.67
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 12`** (2 nodes): `App()`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (2 nodes): `Dashboard.tsx`, `timeAgo()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (2 nodes): `ReportsPage.tsx`, `getKinerjaBadge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (2 nodes): `SettingsPage.tsx`, `SettingsPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `GeofenceMap.tsx`, `GeofenceMap()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `PWALayout.tsx`, `PWALayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `cn.ts`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `AdminLayout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `ProfileTab.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `Modal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `Toggle.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `env.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `readAppState()` connect `Community 2` to `Community 3`, `Community 4`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.231) - this node is a cross-community bridge._
- **Why does `submitCheckOut()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `handleCheckout()` connect `Community 0` to `Community 2`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `readAppState()` (e.g. with `getAttendances()` and `submitCheckOut()`) actually correct?**
  _`readAppState()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `submitCheckIn()` (e.g. with `handleCheckin()` and `buildAttendanceFromCheckIn()`) actually correct?**
  _`submitCheckIn()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `submitCheckOut()` (e.g. with `handleCheckout()` and `readAppState()`) actually correct?**
  _`submitCheckOut()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `getShiftById()` (e.g. with `attendanceToHistory()` and `readAppState()`) actually correct?**
  _`getShiftById()` has 3 INFERRED edges - model-reasoned connections that need verification._