import { useLayoutEffect, useRef } from 'react';

// One stack coordinates all modal surfaces, including a privacy dialog opened
// over a project form. Only its top entry can handle keys or redirect focus.
const dialogs = [];
let bodyOverflow = '';
const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function controlsIn(panel) {
  return [...panel.querySelectorAll(focusableSelector)].filter((element) => (
    element.tabIndex >= 0 && !element.closest('[hidden], [inert], [aria-hidden="true"]') && element.getClientRects().length > 0
  ));
}

function focusFirst(panel) {
  const controls = controlsIn(panel);
  const preferred = panel.querySelector('[autofocus]');
  const target = controls.includes(preferred) ? preferred : controls[0] || panel;
  target.focus({ preventScroll: true });
}

export function useDialog(open, onClose) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return undefined;

    const previousDialog = dialogs[dialogs.length - 1];
    const active = document.activeElement;
    const entry = {
      panel,
      returnFocus: active instanceof HTMLElement && active !== document.body ? active : previousDialog?.returnFocus,
      fallbackFocus: previousDialog?.returnFocus,
    };
    if (dialogs.length === 0) {
      bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    dialogs.push(entry);
    const isTop = () => dialogs[dialogs.length - 1] === entry;

    const onKeyDown = (event) => {
      if (!isTop()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = controlsIn(panel);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
      } else if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement) || document.activeElement === panel)) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    const onFocusIn = (event) => {
      if (isTop() && !panel.contains(event.target)) focusFirst(panel);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    focusFirst(panel);

    return () => {
      const wasTop = isTop();
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      const index = dialogs.indexOf(entry);
      if (index !== -1) dialogs.splice(index, 1);
      if (dialogs.length === 0) document.body.style.overflow = bodyOverflow;
      if (!wasTop) return;
      const nextDialog = dialogs[dialogs.length - 1];
      const target = [entry.returnFocus, entry.fallbackFocus].find((element) => element?.isConnected && (!nextDialog || nextDialog.panel.contains(element)));
      if (target) target.focus({ preventScroll: true });
      else if (nextDialog) focusFirst(nextDialog.panel);
    };
  }, [open]);

  return panelRef;
}
