/**
 * keyboard.js
 * ← →  = navigate prev / next
 * A    = accept
 * R    = reject
 * Esc  = close zoom modal
 */

let _actions = { accept: null, reject: null, next: null, prev: null };

export function registerKeyboardShortcuts(actions) {
  _actions = { ..._actions, ...actions };

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (document.querySelector('.zoom-modal.open')) return;
    if (document.querySelector('.resume-modal.open')) return;

    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); _actions.next?.();   break;
      case 'ArrowLeft':  e.preventDefault(); _actions.prev?.();   break;
      case 'a': case 'A': e.preventDefault(); _actions.accept?.(); break;
      case 'r': case 'R': e.preventDefault(); _actions.reject?.(); break;
    }
  });
}
