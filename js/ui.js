/**
 * ui.js — all DOM manipulation.
 */

const screens = {
  setup:  document.getElementById('screen-setup'),
  triage: document.getElementById('screen-triage'),
  done:   document.getElementById('screen-done'),
};

const photoImg           = document.getElementById('photo-img');
const photoFrame         = document.getElementById('photo-frame');
const photoFilename      = document.getElementById('photo-filename');
const progressFill       = document.getElementById('progress-fill');
const progressText       = document.getElementById('progress-text');
const overlayReject      = document.getElementById('overlay-reject');
const overlayAccept      = document.getElementById('overlay-accept');
const photoStage         = document.getElementById('photo-stage');
const stateBadge         = document.getElementById('state-badge');
const btnPrev            = document.getElementById('btn-prev');
const btnNext            = document.getElementById('btn-next');
const btnDecideLater     = document.getElementById('btn-decide-later');
const emptyFilterMsg     = document.getElementById('empty-filter-msg');
const emptyFilterLabel   = document.getElementById('empty-filter-label');

// Topbar pills
const pills = {
  accepted:     document.getElementById('pill-accepted'),
  rejected:     document.getElementById('pill-rejected'),
  decide_later: document.getElementById('pill-decide-later'),
  pending:      document.getElementById('pill-pending'),
};

const pillNums = {
  accepted:     document.getElementById('count-accepted'),
  rejected:     document.getElementById('count-rejected'),
  decide_later: document.getElementById('count-decide-later'),
  pending:      document.getElementById('count-pending'),
};

// Done screen
const doneAutoStats      = document.getElementById('done-auto-stats');
const doneManualStats    = document.getElementById('done-manual-stats');
const statAccepted       = document.getElementById('stat-accepted');
const statRejected       = document.getElementById('stat-rejected');
const statAcceptedManual = document.getElementById('stat-accepted-manual');
const statRejectedManual = document.getElementById('stat-rejected-manual');
const statRemaining      = document.getElementById('stat-remaining');

// ── Screen switching ───────────────────────────────────
export function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle('active', key === name);
  });
}

// ── Photo display ──────────────────────────────────────
export function updatePhoto(url, filename) {
  emptyFilterMsg.classList.remove('visible');
  photoFrame.style.display = '';
  photoImg.src = url;
  photoFilename.textContent = filename;
}

// ── Empty filter state ─────────────────────────────────
const FILTER_LABELS = {
  accepted:     'accepted',
  rejected:     'rejected',
  decide_later: 'decide later',
  pending:      'pending',
};

export function showEmptyFilter(filterState) {
  photoFrame.style.display = 'none';
  emptyFilterLabel.textContent = FILTER_LABELS[filterState] || filterState;
  emptyFilterMsg.classList.add('visible');
  photoFilename.textContent = '';
  stateBadge.className = 'state-badge badge-pending';
  stateBadge.textContent = '';
  btnDecideLater.classList.add('hidden');
}

// ── State badge ────────────────────────────────────────
const BADGE_CONFIG = {
  pending:      { label: 'Pending',      cls: 'badge-pending'      },
  decide_later: { label: 'Decide Later', cls: 'badge-decide-later' },
  accepted:     { label: 'Accepted',     cls: 'badge-accepted'     },
  rejected:     { label: 'Rejected',     cls: 'badge-rejected'     },
};

export function updateStateBadge(state) {
  const cfg = BADGE_CONFIG[state] || BADGE_CONFIG.pending;
  stateBadge.textContent = cfg.label;
  stateBadge.className = `state-badge ${cfg.cls}`;
}

// ── Decide Later button ────────────────────────────────
export function showDecideLaterButton(visible) {
  btnDecideLater.classList.toggle('hidden', !visible);
}

// ── Progress ───────────────────────────────────────────
export function updateProgress(currentIndex, total) {
  const position = currentIndex + 1;
  const pct = total > 0 ? (position / total) * 100 : 0;
  progressFill.style.width = `${pct}%`;
  progressText.textContent = total > 0 ? `${position} / ${total}` : '— / —';
}

// ── Nav buttons ────────────────────────────────────────
export function updateNavButtons(currentIndex, total) {
  btnPrev.disabled = currentIndex <= 0;
  btnNext.disabled = total === 0 || currentIndex >= total - 1;
}

// ── Live counts ────────────────────────────────────────
export function updateCounts(stats) {
  pillNums.accepted.textContent     = stats.accepted;
  pillNums.rejected.textContent     = stats.rejected;
  pillNums.decide_later.textContent = stats.decide_later;
  pillNums.pending.textContent      = stats.pending;
}

// ── Filter pill active state ───────────────────────────
export function setActivePill(activeFilter) {
  Object.entries(pills).forEach(([key, el]) => {
    el.classList.toggle('pill-active', key === activeFilter);
  });
}

// ── Visual feedback ────────────────────────────────────
let overlayTimer = null;

export function showOverlay(side) {
  const el    = side === 'left' ? overlayReject : overlayAccept;
  const other = side === 'left' ? overlayAccept : overlayReject;
  clearTimeout(overlayTimer);
  other.classList.remove('show');
  el.classList.add('show');
  overlayTimer = setTimeout(() => el.classList.remove('show'), 400);
}

export function flashStage(type) {
  photoStage.classList.remove('flash-accept', 'flash-reject', 'flash-skip');
  void photoStage.offsetWidth;
  photoStage.classList.add(`flash-${type}`);
}

// ── Done screen ────────────────────────────────────────
export function showDoneScreen(stats, reason) {
  if (reason === 'auto') {
    doneAutoStats.style.display   = 'flex';
    doneManualStats.style.display = 'none';
    statAccepted.textContent = stats.accepted;
    statRejected.textContent = stats.rejected;
  } else {
    doneAutoStats.style.display   = 'none';
    doneManualStats.style.display = 'flex';
    statAcceptedManual.textContent = stats.accepted;
    statRejectedManual.textContent = stats.rejected;
    statRemaining.textContent      = stats.decide_later + stats.pending;
  }
  showScreen('done');
}

// ── Resume modal ───────────────────────────────────────
export function showResumeModal({ acceptedCount, rejectedCount, onResume, onFresh }) {
  const modal = document.getElementById('resume-modal');
  document.getElementById('resume-accepted-count').textContent = acceptedCount;
  document.getElementById('resume-rejected-count').textContent = rejectedCount;
  modal.classList.add('open');

  document.getElementById('btn-resume').onclick = () => {
    modal.classList.remove('open');
    onResume();
  };
  document.getElementById('btn-start-fresh').onclick = () => {
    modal.classList.remove('open');
    onFresh();
  };
}

// ── Folder card UI ─────────────────────────────────────
export function markFolderSelected(target, folderName) {
  const card   = document.getElementById(`card-${target}`);
  const nameEl = document.getElementById(`name-${target}`);
  card.classList.add('selected');
  nameEl.textContent = folderName;
  nameEl.classList.add('visible');
}

export function setStartEnabled(enabled) {
  document.getElementById('btn-start').disabled = !enabled;
}
