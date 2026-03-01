/**
 * app.js — entry point.
 */

import { pickFolder } from './fileSystem.js';
import { clearCache } from './photoLoader.js';
import {
  getResumeInfo, initSession, startFresh,
  acceptPhoto, rejectPhoto, decideLaterPhoto,
  navigateNext, navigatePrev,
  quitSession, setFilter,
} from './triage.js';
import { registerKeyboardShortcuts } from './keyboard.js';
import {
  showScreen, markFolderSelected, setStartEnabled,
  showResumeModal,
} from './ui.js';

// ── Folder handles ─────────────────────────────────────
const folders = { source: null, accepted: null, rejected: null };

// ── Setup: folder pickers ──────────────────────────────
document.querySelectorAll('.btn-folder').forEach(btn => {
  btn.addEventListener('click', async () => {
    const target = btn.dataset.target;
    const handle = await pickFolder();
    if (!handle) return;
    folders[target] = handle;
    markFolderSelected(target, handle.name);
    checkStartReady();
  });
});

function checkStartReady() {
  setStartEnabled(!!(folders.source && folders.accepted && folders.rejected));
}

// ── Start ──────────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', async () => {
  const info = await getResumeInfo(folders.source, folders.accepted, folders.rejected);

  if (info.sourceCount === 0 && info.acceptedCount === 0 && info.rejectedCount === 0) {
    alert('No supported images found in any folder.\nSupported: JPG, PNG, WEBP, GIF');
    return;
  }

  showScreen('triage');

  if (info.needsPrompt) {
    showResumeModal({
      acceptedCount: info.acceptedCount,
      rejectedCount: info.rejectedCount,
      onResume: async () => {
        await initSession(
          info.sourceFiles, info.acceptedFiles, info.rejectedFiles,
          folders.source, folders.accepted, folders.rejected
        );
      },
      onFresh: async () => {
        await startFresh(
          info.sourceFiles, info.acceptedFiles, info.rejectedFiles,
          folders.source, folders.accepted, folders.rejected
        );
      },
    });
  } else {
    await initSession(
      info.sourceFiles, [], [],
      folders.source, folders.accepted, folders.rejected
    );
  }
});

// ── Action buttons ─────────────────────────────────────
document.getElementById('btn-accept').addEventListener('click',       () => acceptPhoto());
document.getElementById('btn-reject').addEventListener('click',       () => rejectPhoto());
document.getElementById('btn-decide-later').addEventListener('click', () => decideLaterPhoto());
document.getElementById('btn-next').addEventListener('click',         () => navigateNext());
document.getElementById('btn-prev').addEventListener('click',         () => navigatePrev());

// ── Keyboard ───────────────────────────────────────────
registerKeyboardShortcuts({
  accept: acceptPhoto,
  reject: rejectPhoto,
  next:   navigateNext,
  prev:   navigatePrev,
});

// ── Filter pills ───────────────────────────────────────
document.getElementById('pill-accepted').addEventListener('click',     () => setFilter('accepted'));
document.getElementById('pill-rejected').addEventListener('click',     () => setFilter('rejected'));
document.getElementById('pill-decide-later').addEventListener('click', () => setFilter('decide_later'));
document.getElementById('pill-pending').addEventListener('click',      () => setFilter('pending'));

// ── Quit ───────────────────────────────────────────────
document.getElementById('btn-quit').addEventListener('click', () => {
  if (confirm('Quit this session? Progress so far is saved.')) {
    quitSession();
  }
});

// ── Restart ────────────────────────────────────────────
document.getElementById('btn-restart').addEventListener('click', () => {
  clearCache();
  resetSession();
  showScreen('setup');
});

function resetSession() {
  folders.source = folders.accepted = folders.rejected = null;
  ['source', 'accepted', 'rejected'].forEach(t => {
    document.getElementById(`card-${t}`).classList.remove('selected');
    const nameEl = document.getElementById(`name-${t}`);
    nameEl.textContent = 'No folder selected';
    nameEl.classList.remove('visible');
  });
  setStartEnabled(false);
}

// ── Zoom modal ─────────────────────────────────────────
const zoomModal  = document.getElementById('zoom-modal');
const zoomImg    = document.getElementById('zoom-img');
const photoImg   = document.getElementById('photo-img');
const photoFrame = document.getElementById('photo-frame');

function openZoom()  { zoomImg.src = photoImg.src; zoomModal.classList.add('open'); }
function closeZoom() { zoomModal.classList.remove('open'); zoomImg.src = ''; }

photoFrame.addEventListener('click', openZoom);
document.getElementById('zoom-close').addEventListener('click', closeZoom);
zoomModal.addEventListener('click', e => { if (e.target === zoomModal) closeZoom(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && zoomModal.classList.contains('open')) closeZoom();
});

// ── Service Worker ─────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
