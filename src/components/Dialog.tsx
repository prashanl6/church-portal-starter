'use client';
// On-page replacements for window.alert / window.confirm. Browser pop-ups are blocked in some
// phone in-app browsers (and then confirm() silently returns false), so the site never uses them.
//   if (!(await ask('Remove this notice?'))) return;
//   tell('Saved.');
import { useEffect, useRef, useState } from 'react';

type Req = { message: string; confirm: boolean; resolve: (ok: boolean) => void };
let show: ((r: Req) => void) | null = null;

export function ask(message: string): Promise<boolean> {
  return new Promise((resolve) => (show ? show({ message, confirm: true, resolve }) : resolve(false)));
}

export function tell(message: string): Promise<void> {
  return new Promise((resolve) => (show ? show({ message, confirm: false, resolve: () => resolve() }) : resolve()));
}

/** Mounted once in the root layout. */
export function DialogHost() {
  const [queue, setQueue] = useState<Req[]>([]);
  const okRef = useRef<HTMLButtonElement>(null);
  const current = queue[0];

  useEffect(() => {
    show = (r) => setQueue((q) => [...q, r]);
    return () => {
      show = null;
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!current) return null;

  function close(ok: boolean) {
    current.resolve(ok);
    setQueue((q) => q.slice(1));
  }

  return (
    <div className="dialog-backdrop" onClick={() => close(false)}>
      <div
        className="dialog-card"
        role={current.confirm ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-describedby="dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="dialog-message" className="dialog-message">
          {current.message}
        </p>
        <div className="dialog-actions">
          {current.confirm && (
            <button type="button" className="btn-secondary" onClick={() => close(false)}>
              Cancel
            </button>
          )}
          <button type="button" className="btn" ref={okRef} onClick={() => close(true)}>
            {current.confirm ? 'Yes, continue' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
