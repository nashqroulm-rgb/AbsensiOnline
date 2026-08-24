# Graph Report - C:\Users\K4G3\Documents\Github\AbsensiOnline  (2026-08-24)

## Corpus Check
- 48 files · ~52,812 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 272 nodes · 394 edges · 38 communities detected
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]

## God Nodes (most connected - your core abstractions)
1. `StrategyHandler` - 14 edges
2. `PrecacheController` - 13 edges
3. `Router` - 11 edges
4. `update()` - 8 edges
5. `normalizeHandler()` - 7 edges
6. `getFriendlyURL()` - 7 edges
7. `set()` - 7 edges
8. `Strategy` - 6 edges
9. `PrecacheStrategy` - 6 edges
10. `loadData()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `updateAppSettings()` --calls--> `update()`  [INFERRED]
  C:\Users\K4G3\Documents\Github\AbsensiOnline\src\services\settings.service.ts → C:\Users\K4G3\Documents\Github\AbsensiOnline\src\components\pwa\HomeTab.tsx
- `loadData()` --calls--> `getWorkers()`  [INFERRED]
  C:\Users\K4G3\Documents\Github\AbsensiOnline\src\components\admin\WorkersPage.tsx → C:\Users\K4G3\Documents\Github\AbsensiOnline\src\services\workers.service.ts
- `loadData()` --calls--> `getZones()`  [INFERRED]
  C:\Users\K4G3\Documents\Github\AbsensiOnline\src\components\admin\WorkersPage.tsx → C:\Users\K4G3\Documents\Github\AbsensiOnline\src\services\zones.service.ts
- `loadData()` --calls--> `getShifts()`  [INFERRED]
  C:\Users\K4G3\Documents\Github\AbsensiOnline\src\components\admin\WorkersPage.tsx → C:\Users\K4G3\Documents\Github\AbsensiOnline\src\services\shifts.service.ts
- `getMonthlyReport()` --calls--> `set()`  [INFERRED]
  C:\Users\K4G3\Documents\Github\AbsensiOnline\src\services\reports.service.ts → C:\Users\K4G3\Documents\Github\AbsensiOnline\src\components\admin\ZonesPage.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (25): addRoute(), cacheMatchIgnoreParams(), cacheWillUpdate(), canConstructResponseFromBodyStream(), copyResponse(), createHandlerBoundToURL(), Deferred, executeQuotaErrorCallbacks() (+17 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (5): getFriendlyURL(), PrecacheStrategy, Strategy, StrategyHandler, toRequest()

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (13): getAttendances(), getHistory(), getStatusLabel(), getStatusLabelAsync(), load(), load(), load(), getMonthlyReport() (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (6): createCacheKey(), isInstance(), PrecacheController, RegExpRoute, waitUntil(), set()

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (13): createAttachment(), deleteFromCloudinary(), extractCloudinaryPublicId(), getAttachmentsByAttendance(), incrementLampiranCount(), rejectAndDeleteAttachment(), updateAttachmentVerification(), handleDeleteAttachment() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (12): submitCheckIn(), submitCheckOut(), blockCheckIn(), formatTime(), handleCheckin(), handleCheckout(), requestGPS(), resolvePosition() (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (7): getOrCreateDefaultRouter(), hasMethod(), isOneOf(), isType(), normalizeHandler(), Route, Router

### Community 7 - "Community 7"
Cohesion: 0.23
Nodes (12): callAdminUser(), createWorker(), deleteWorker(), getWorkers(), resetWorkerPin(), updateWorker(), validatePin(), validateWorker() (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.23
Nodes (6): createShift(), deleteShift(), updateShift(), validateShift(), handleDelete(), handleSaveShift()

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (5): AuthProvider(), useAuth(), HistoryTab(), ProtectedRoute(), useAuthState()

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (6): createZone(), deleteZone(), updateZone(), validateZone(), handleDelete(), handleSaveZone()

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (3): getAppSettings(), updateAppSettings(), loadSettings()

### Community 12 - "Community 12"
Cohesion: 0.5
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 0.5
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (2): require(), singleRequire()

### Community 15 - "Community 15"
Cohesion: 0.67
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

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 16`** (2 nodes): `App()`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `Login.tsx`, `handleSubmit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `Dashboard.tsx`, `timeAgo()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `SettingsPage.tsx`, `SettingsPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `GeofenceMap.tsx`, `GeofenceMap()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `PWALayout.tsx`, `PWALayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `ConfirmDialog.tsx`, `ConfirmDialog()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `Toast.tsx`, `useToast()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `useSupabaseQuery.ts`, `useSupabaseQuery()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `cn.ts`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `registerSW.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `AdminLayout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `Modal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `Toggle.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `supabase.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `update()` connect `Community 4` to `Community 5`, `Community 7`, `Community 8`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Why does `set()` connect `Community 3` to `Community 10`, `Community 2`, `Community 6`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `deleteFromCloudinary()` connect `Community 4` to `Community 1`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `update()` (e.g. with `updateAttachmentVerification()` and `incrementLampiranCount()`) actually correct?**
  _`update()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._