/**
 * triage.js
 * Timeline-based triage engine with filter mode.
 *
 * States: pending | decide_later | accepted | rejected
 * currentDir: source | accepted | rejected
 *
 * Filter mode:
 *   - Only one filter active at a time
 *   - filteredTimeline rebuilt on navigation, not on action
 *   - Stale photo stays visible until user navigates away
 */

import { readImageFiles, moveFileByName } from './fileSystem.js';
import { getPhotoUrl, revokePhotoUrl, clearCache } from './photoLoader.js';
import {
  updatePhoto, updateProgress, updateStateBadge,
  showOverlay, flashStage,
  showDoneScreen, updateCounts, updateNavButtons,
  showDecideLaterButton, setActivePill, showEmptyFilter,
} from './ui.js';

let s = {
  timeline:         [],
  currentIndex:     0,
  dirHandles:       { source: null, accepted: null, rejected: null },
  stats:            { accepted: 0, rejected: 0, decide_later: 0, pending: 0 },
  busy:             false,

  // Filter
  activeFilter:     null,   // null | 'accepted' | 'rejected' | 'decide_later' | 'pending'
  filteredTimeline: [],     // rebuilt on each navigation when filter active
  filteredIndex:    0,      // pointer within filteredTimeline
};

function dir(which) { return s.dirHandles[which]; }

// ── Build timeline ─────────────────────────────────────

function buildTimeline(sourceFiles, acceptedFiles, rejectedFiles) {
  const map = new Map();
  for (const f of sourceFiles)  map.set(f.name, { name: f.name, state: 'pending',   currentDir: 'source'   });
  for (const f of acceptedFiles) map.set(f.name, { name: f.name, state: 'accepted',  currentDir: 'accepted'  });
  for (const f of rejectedFiles) map.set(f.name, { name: f.name, state: 'rejected',  currentDir: 'rejected'  });

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );
}

function firstPendingIndex(timeline) {
  const idx = timeline.findIndex(e => e.state === 'pending');
  return idx === -1 ? 0 : idx;
}

function recalcStats(timeline) {
  return {
    accepted:     timeline.filter(e => e.state === 'accepted').length,
    rejected:     timeline.filter(e => e.state === 'rejected').length,
    decide_later: timeline.filter(e => e.state === 'decide_later').length,
    pending:      timeline.filter(e => e.state === 'pending').length,
  };
}

// ── Filter helpers ─────────────────────────────────────

function buildFiltered() {
  if (!s.activeFilter) return [];
  return s.timeline.filter(e => e.state === s.activeFilter);
}

/**
 * After rebuilding filteredTimeline, find best filteredIndex:
 * Try to keep the same entry if it still belongs, else go to index 0.
 */
function syncFilteredIndex(previousName) {
  const idx = s.filteredTimeline.findIndex(e => e.name === previousName);
  s.filteredIndex = idx !== -1 ? idx : 0;
}

export function setFilter(filterState) {
  // Toggle off if same filter clicked again
  if (s.activeFilter === filterState) {
    s.activeFilter = null;
    s.filteredTimeline = [];
    s.filteredIndex = 0;
    setActivePill(null);
    // Re-render current full timeline photo
    renderCurrent();
    return;
  }

  s.activeFilter = filterState;
  s.filteredTimeline = buildFiltered();
  s.filteredIndex = 0;
  setActivePill(filterState);

  if (s.filteredTimeline.length === 0) {
    showEmptyFilter(filterState);
    updateNavButtons(0, 0);
    return;
  }

  // Sync full timeline currentIndex to match filteredTimeline[0]
  s.currentIndex = s.timeline.indexOf(s.filteredTimeline[0]);
  renderCurrent();
}

export function getActiveFilter() { return s.activeFilter; }

// ── Resume info ────────────────────────────────────────

export async function getResumeInfo(sourceDirHandle, acceptedDirHandle, rejectedDirHandle) {
  const [sourceFiles, acceptedFiles, rejectedFiles] = await Promise.all([
    readImageFiles(sourceDirHandle),
    readImageFiles(acceptedDirHandle),
    readImageFiles(rejectedDirHandle),
  ]);
  return {
    sourceCount:   sourceFiles.length,
    acceptedCount: acceptedFiles.length,
    rejectedCount: rejectedFiles.length,
    needsPrompt:   acceptedFiles.length > 0 || rejectedFiles.length > 0,
    sourceFiles, acceptedFiles, rejectedFiles,
  };
}

// ── Init ───────────────────────────────────────────────

export async function startFresh(sourceFiles, acceptedFiles, rejectedFiles,
                                  sourceDirHandle, acceptedDirHandle, rejectedDirHandle) {
  for (const f of acceptedFiles) await moveFileByName(f.name, acceptedDirHandle, sourceDirHandle);
  for (const f of rejectedFiles) await moveFileByName(f.name, rejectedDirHandle, sourceDirHandle);
  const allSource = await readImageFiles(sourceDirHandle);
  await initSession(allSource, [], [], sourceDirHandle, acceptedDirHandle, rejectedDirHandle);
}

export async function initSession(sourceFiles, acceptedFiles, rejectedFiles,
                                   sourceDirHandle, acceptedDirHandle, rejectedDirHandle) {
  clearCache();
  const timeline = buildTimeline(sourceFiles, acceptedFiles, rejectedFiles);

  s = {
    timeline,
    currentIndex:     firstPendingIndex(timeline),
    dirHandles:       { source: sourceDirHandle, accepted: acceptedDirHandle, rejected: rejectedDirHandle },
    stats:            recalcStats(timeline),
    busy:             false,
    activeFilter:     null,
    filteredTimeline: [],
    filteredIndex:    0,
  };

  updateCounts(s.stats);
  setActivePill(null);
  await renderCurrent();
}

// ── Render ─────────────────────────────────────────────

async function renderCurrent() {
  const entry = currentEntry();
  if (!entry) return;

  const url = await getPhotoUrl(entry.name, dir(entry.currentDir));
  updatePhoto(url, entry.name);
  updateStateBadge(entry.state);
  updateNavButtons(currentPointer(), currentTotal());
  showDecideLaterButton(entry.state === 'accepted' || entry.state === 'rejected');
  updateProgressForMode();

  preloadAt(currentPointer() + 1);
  preloadAt(currentPointer() + 2);
  preloadAt(currentPointer() - 1);
}

function currentEntry() {
  if (s.activeFilter) return s.filteredTimeline[s.filteredIndex] ?? null;
  return s.timeline[s.currentIndex] ?? null;
}

function currentPointer() {
  return s.activeFilter ? s.filteredIndex : s.currentIndex;
}

function currentTotal() {
  return s.activeFilter ? s.filteredTimeline.length : s.timeline.length;
}

function updateProgressForMode() {
  const ptr   = currentPointer();
  const total = currentTotal();
  const pct   = total > 0 ? ((ptr + 1) / total) * 100 : 0;
  updateProgress(ptr, total);
}

function preloadAt(idx) {
  const list = s.activeFilter ? s.filteredTimeline : s.timeline;
  if (idx < 0 || idx >= list.length) return;
  const e = list[idx];
  getPhotoUrl(e.name, dir(e.currentDir)).catch(() => {});
}

// ── Navigation ─────────────────────────────────────────

export async function navigateNext() {
  if (s.busy) return;

  if (s.activeFilter) {
    // Rebuild filtered list on navigation (picks up state changes)
    const currentName = s.filteredTimeline[s.filteredIndex]?.name;
    markCurrentIfPending();
    s.filteredTimeline = buildFiltered();

    if (s.filteredTimeline.length === 0) {
      showEmptyFilter(s.activeFilter);
      updateNavButtons(0, 0);
      return;
    }

    // Find next index after current in rebuilt list
    const currentIdxInNew = s.filteredTimeline.findIndex(e => e.name === currentName);
    if (currentIdxInNew === -1 || currentIdxInNew >= s.filteredTimeline.length - 1) {
      // Current no longer in filter or was last — go to last item
      s.filteredIndex = Math.max(0, s.filteredTimeline.length - 1);
    } else {
      s.filteredIndex = currentIdxInNew + 1;
    }

    s.currentIndex = s.timeline.indexOf(s.filteredTimeline[s.filteredIndex]);
    await renderCurrent();
    return;
  }

  // Normal mode
  markCurrentIfPending();
  if (s.currentIndex >= s.timeline.length - 1) return;
  s.currentIndex++;
  await renderCurrent();
}

export async function navigatePrev() {
  if (s.busy) return;

  if (s.activeFilter) {
    if (s.filteredIndex <= 0) return;
    markCurrentIfPending();
    s.filteredTimeline = buildFiltered();

    // Stay near same position
    s.filteredIndex = Math.max(0, Math.min(s.filteredIndex - 1, s.filteredTimeline.length - 1));
    s.currentIndex = s.timeline.indexOf(s.filteredTimeline[s.filteredIndex]);
    await renderCurrent();
    return;
  }

  // Normal mode
  if (s.currentIndex === 0) return;
  markCurrentIfPending();
  s.currentIndex--;
  await renderCurrent();
}

function markCurrentIfPending() {
  const entry = currentEntry();
  if (!entry || entry.state !== 'pending') return;
  entry.state = 'decide_later';
  s.stats.pending      = Math.max(0, s.stats.pending - 1);
  s.stats.decide_later++;
  updateCounts(s.stats);
}

// ── Actions ────────────────────────────────────────────

export async function acceptPhoto()      { await act('accepted'); }
export async function rejectPhoto()      { await act('rejected'); }
export async function decideLaterPhoto() { await act('decide_later'); }

async function act(newState) {
  if (s.busy) return;
  s.busy = true;

  const entry = currentEntry();
  if (!entry) { s.busy = false; return; }

  const oldState = entry.state;
  if (oldState === newState) { s.busy = false; return; }

  // Update stats
  s.stats[oldState] = Math.max(0, s.stats[oldState] - 1);
  s.stats[newState]++;

  // Move file
  await relocateFile(entry, newState);
  entry.state = newState;

  updateCounts(s.stats);
  updateStateBadge(newState);
  showDecideLaterButton(newState === 'accepted' || newState === 'rejected');

  // Visual feedback
  if (newState === 'accepted')      { showOverlay('right'); flashStage('accept'); }
  else if (newState === 'rejected') { showOverlay('left');  flashStage('reject'); }
  else                               { flashStage('skip'); }

  s.busy = false;

  // decide_later = stay on current photo
  if (newState === 'decide_later') {
    await renderCurrent();
    return;
  }

  // Check auto-complete (source empty) — only in non-filter mode
  if (!s.activeFilter && sourceIsEmpty()) {
    showDoneScreen(s.stats, 'auto');
    return;
  }

  // In filter mode: photo stays visible until user navigates (Option B)
  // Just re-render to update badge — don't advance
  if (s.activeFilter) {
    await renderCurrent();
    return;
  }

  // Normal mode: auto-advance
  if (s.currentIndex < s.timeline.length - 1) {
    s.currentIndex++;
    await renderCurrent();
  }
}

function sourceIsEmpty() {
  return s.timeline.every(e => e.currentDir !== 'source');
}

async function relocateFile(entry, newState) {
  const destDirName = newState === 'accepted'    ? 'accepted'
                    : newState === 'rejected'     ? 'rejected'
                    : 'source';
  if (entry.currentDir === destDirName) return;
  await moveFileByName(entry.name, dir(entry.currentDir), dir(destDirName));
  revokePhotoUrl(entry.name);
  entry.currentDir = destDirName;
}

export function quitSession() {
  showDoneScreen(s.stats, 'manual');
}

export function getStats() { return { ...s.stats }; }
