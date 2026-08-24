/**
 * Best-effort deterrence + traceability only — NOT real screenshot
 * prevention. No website, in any framework, can intercept PrintScreen,
 * Cmd+Shift+3/4/5, a phone's screenshot gesture, or a second camera pointed
 * at the screen — none of those ever reach the browser as an event. This
 * plugin blocks the in-browser vectors (selection, copy, right-click,
 * print, devtools shortcuts) and nothing more. Say so plainly in your UI if
 * you surface this as a feature — see the mockup's "About copy protection"
 * menu item for the wording that was reviewed with the client.
 */
import { defineNuxtPlugin } from '#imports';

export default defineNuxtPlugin(() => {
  if (import.meta.server) return;

  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('selectstart', e => {
    // allow selection inside the pullout's article body — same exception as the mockup
    if ((e.target as HTMLElement)?.closest?.('.select-text')) return;
    e.preventDefault();
  });
  document.addEventListener('dragstart', e => e.preventDefault());
  document.addEventListener('copy', e => e.preventDefault());
  document.addEventListener('cut', e => e.preventDefault());

  document.addEventListener('keydown', (e) => {
    const k = e.key?.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    const blockedWithMod = ['c', 'x', 's', 'p', 'u'];
    const isDevtoolsCombo = (mod && e.shiftKey && ['i', 'j', 'c'].includes(k)) || k === 'f12';
    if ((mod && blockedWithMod.includes(k)) || isDevtoolsCombo) {
      e.preventDefault();
    }
  });

  window.addEventListener('beforeprint', () => {
    document.body.style.display = 'none';
    setTimeout(() => { document.body.style.display = ''; }, 0);
  });
});
